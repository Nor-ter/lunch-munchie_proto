import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import { decideGroup } from "../../server/engine/group";
import {
  isHardRestriction,
  normalizeDiet,
  type DietTag,
} from "../../shared/const";
import { categoryMatchesIntent, type Intent } from "../../shared/intent";
import { isValidCoordinate, isWithinRadius } from "../../shared/geo";
import { buildSlate, scoreCandidateBreakdown } from "../../server/engine/scorer";
import type { Candidate, RecContext, SlateType } from "../../shared/engine";
import { isAdminEmail } from "./adminAccess";
import { assessLearningReadiness, coverage } from "./algorithmInsights";

export interface EnvBindings {
  DB: any;
  PHOTOS_R2: any;
  /** Optional development-only public media origin. Never set in production. */
  MEDIA_ORIGIN?: string;
  USER_DO: any;
  SESSION_DO: any;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  AUTH_SESSION_SECRET: string;
  /** Comma-separated Google account emails allowed to access /admin. */
  ADMIN_EMAILS?: string;
}

async function fetchConfiguredMedia(origin: string | undefined, key: string) {
  if (!origin) return null;
  let base: URL;
  try {
    base = new URL(origin);
  } catch {
    return null;
  }
  if (base.protocol !== "https:") return null;
  const encodedPath = key.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(new URL(`/photos/${encodedPath}`, base));
  return response.ok ? response : null;
}

const app = new Hono<{ Bindings: EnvBindings }>();

type GoogleSession = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  exp: number;
};
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const toBase64Url = (value: Uint8Array | string) => {
  const raw = typeof value === "string" ? value : String.fromCharCode(...value);
  return btoa(raw)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
};
const fromBase64Url = (value: string) =>
  decoder.decode(
    Uint8Array.from(
      atob(
        value.replaceAll("-", "+").replaceAll("_", "/") +
          "==".slice((value.length + 3) % 4),
      ),
      (char) => char.charCodeAt(0),
    ),
  );
async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, encoder.encode(value)),
    ),
  );
}
async function readSession(
  request: Request,
  secret: string,
): Promise<GoogleSession | null> {
  const token = request.headers
    .get("cookie")
    ?.match(/(?:^|; )lm_session=([^;]+)/)?.[1];
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || signature !== (await sign(payload, secret)))
    return null;
  try {
    const session = JSON.parse(fromBase64Url(payload)) as GoogleSession;
    return session.exp > Date.now() && session.sub ? session : null;
  } catch {
    return null;
  }
}
// OAuth subject는 권한 확인용 내부 키일 뿐 화면에 보여주지 않는다. 최초 로그인 때만
// 공개 사용자 행을 만들며, 이후 사용자가 앱에서 바꾼 이름은 덮어쓰지 않는다.
async function userColumnNames(db: any) {
  const { results } = await db
    .prepare("PRAGMA table_info(users)")
    .all<{ name: string }>();
  return new Set(results.map((column) => column.name));
}
async function ensurePublicUser(db: any, session: GoogleSession) {
  const columns = await userColumnNames(db);
  if (columns.has("username") && columns.has("profile_image_url")) {
    await db
      .prepare(
        "INSERT INTO users (id, username, profile_image_url, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING",
      )
      .bind(
        session.sub,
        session.name?.trim().slice(0, 80) || "Lunchie 사용자",
        session.picture?.slice(0, 2_000) || null,
        Date.now(),
      )
      .run();
    return true;
  }
  // A developer can still authenticate against a pre-D1 local database. The
  // canonical public-profile fields are unavailable until that local database
  // is reset/migrated, but login itself must not end in a 500.
  if (columns.has("email")) {
    await db
      .prepare(
        "INSERT INTO users (id, email) VALUES (?, ?) ON CONFLICT(id) DO NOTHING",
      )
      .bind(session.sub, session.email ?? null)
      .run();
  } else {
    await db
      .prepare("INSERT INTO users (id) VALUES (?) ON CONFLICT(id) DO NOTHING")
      .bind(session.sub)
      .run();
  }
  return false;
}
// `Secure` is required on the public HTTPS service, but browsers (notably
// Safari) do not reliably retain Secure cookies on plain http://localhost.
// Keep local OAuth functional without weakening deployed sessions.
const requestIsSecure = (request: Request) =>
  new URL(request.url).protocol === "https:";
const cookie = (name: string, value: string, maxAge?: number, secure = true) =>
  `${name}=${value}; Path=/; HttpOnly;${secure ? " Secure;" : ""} SameSite=Lax${maxAge !== undefined ? `; Max-Age=${maxAge}` : ""}`;
const cookieValue = (request: Request, name: string) =>
  request.headers
    .get("cookie")
    ?.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1] ?? null;

app.get("/api/auth/google/start", (c) => {
  const next = c.req.query("next")?.startsWith("/")
    ? c.req.query("next")!
    : "/";
  const state = crypto.randomUUID();
  const callback = new URL("/api/auth/google/callback", c.req.url).toString();
  const google = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  google.search = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: callback,
    response_type: "code",
    scope: "openid email profile",
    state: `${state}.${toBase64Url(next)}`,
    prompt: "select_account",
  }).toString();
  c.header(
    "Set-Cookie",
    cookie("lm_oauth_state", state, 600, requestIsSecure(c.req.raw)),
  );
  return c.redirect(google.toString());
});

app.get("/api/auth/google/callback", async (c) => {
  const [state, encodedNext] = (c.req.query("state") ?? "").split(".");
  const expected = c.req
    .header("cookie")
    ?.match(/(?:^|; )lm_oauth_state=([^;]+)/)?.[1];
  const code = c.req.query("code");
  const next = encodedNext ? fromBase64Url(encodedNext) : "/";
  if (!code || !state || state !== expected || !next.startsWith("/"))
    return c.redirect("/auth/login?error=oauth_state");
  const callback = new URL("/api/auth/google/callback", c.req.url).toString();
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: callback,
      grant_type: "authorization_code",
    }),
  });
  const token = await tokenResponse.json<{ access_token?: string }>();
  if (!tokenResponse.ok || !token.access_token)
    return c.redirect("/auth/login?error=oauth_exchange");
  const profileResponse = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    { headers: { Authorization: `Bearer ${token.access_token}` } },
  );
  const profile = await profileResponse.json<{
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
  }>();
  if (!profileResponse.ok || !profile.sub)
    return c.redirect("/auth/login?error=oauth_profile");
  // 로그인 전에 만들어 둔 익명 런치 여정은 이 계정의 최초 기록으로 승계한다.
  const guestId = cookieValue(c.req.raw, "lm_guest_id");
  if (guestId)
    await c.env.DB.prepare(
      "UPDATE rec_events SET user_id = ? WHERE user_id = ?",
    )
      .bind(profile.sub, `guest:${guestId}`)
      .run();
  await ensurePublicUser(c.env.DB, {
    ...profile,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  const payload = toBase64Url(
    encoder.encode(
      JSON.stringify({ ...profile, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }),
    ),
  );
  c.header(
    "Set-Cookie",
    cookie(
      "lm_session",
      `${payload}.${await sign(payload, c.env.AUTH_SESSION_SECRET)}`,
      7 * 24 * 60 * 60,
      requestIsSecure(c.req.raw),
    ),
  );
  return c.redirect(next);
});

app.get("/api/auth/session", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  const hasPublicProfile = session
    ? await ensurePublicUser(c.env.DB, session)
    : false;
  // The session identifies the Google account, while the D1 profile owns
  // user-editable display data such as a custom avatar.  Returning both keeps
  // a refresh from replacing a user-selected photo with Google's old picture.
  const profile =
    session && hasPublicProfile
      ? await c.env.DB.prepare(
          "SELECT id, username, profile_image_url, bio, location FROM users WHERE id = ?",
        )
          .bind(session.sub)
          .first<any>()
      : null;
  return c.json({ user: session, profile });
});
app.post("/api/auth/logout", (c) => {
  c.header(
    "Set-Cookie",
    cookie("lm_session", "", 0, requestIsSecure(c.req.raw)),
  );
  c.res.headers.append(
    "Set-Cookie",
    cookie("lm_guest_id", "", 0, requestIsSecure(c.req.raw)),
  );
  return c.json({ ok: true });
});

const json = <T>(value: string | null | undefined, fallback: T): T => {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};
const isoDate = (value: unknown) => {
  const numeric = typeof value === "number" ? value : Number(value);
  const date = Number.isFinite(numeric)
    ? new Date(numeric)
    : new Date(String(value ?? ""));
  return Number.isFinite(date.getTime())
    ? date.toISOString()
    : new Date(0).toISOString();
};

const EVENT_TYPES = new Set([
  "ONBOARDING_COMPLETED",
  "SESSION_CREATED",
  "IMPRESSION",
  "SWIPE",
  "WINNER",
  "NAVIGATE",
  "VISIT",
  "REORDER",
  "COURSE_SAVE",
  "COURSE_EDIT",
  "FEED_LIKE",
  "FEED_DISLIKE",
  "COURSE_OPEN",
  "REROLL",
  "SURVEY",
  "ABANDON",
  "NO_CONSENSUS",
]);
const MAX_MUNCHIE_FEED_PHOTOS = 6;
const nullableText = (value: unknown, max = 200) =>
  typeof value === "string" ? value.trim().slice(0, max) || null : null;
const nullableNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

// Cloudflare 배포의 정식 행동 수집 경로. 클라이언트가 보낸 user_id는 신뢰하지 않고,
// Google 세션 또는 익명 쿠키로 행위자를 정한다. 따라서 Jimin 같은 화면 기본값이
// 분석 데이터에 섞이거나 다른 사용자를 가장할 수 없다.
app.post("/api/events", async (c) => {
  const payload = await c.req.json<{ events?: unknown }>().catch(() => null);
  const requested = Array.isArray(payload?.events) ? payload!.events : [];
  if (!requested.length || requested.length > 50)
    return c.json({ error: "events must contain 1-50 items" }, 400);

  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  const existingGuestId = cookieValue(c.req.raw, "lm_guest_id");
  const guestId = existingGuestId ?? crypto.randomUUID();
  const userId = session?.sub ?? `guest:${guestId}`;
  const now = Date.now();
  const statements: any[] = [];

  for (const raw of requested) {
    if (!raw || typeof raw !== "object")
      return c.json({ error: "invalid event" }, 400);
    const event = raw as Record<string, unknown>;
    const eventType = nullableText(event.event_type, 40);
    if (!eventType || !EVENT_TYPES.has(eventType))
      return c.json({ error: "invalid event_type" }, 400);
    const context =
      event.context && typeof event.context === "object"
        ? JSON.stringify(event.context)
        : null;
    if (context && context.length > 4_096)
      return c.json({ error: "context too large" }, 400);
    const idempotencyKey =
      nullableText(event.idempotency_key, 160) ?? crypto.randomUUID();
    statements.push(
      c.env.DB.prepare(
        "INSERT OR IGNORE INTO rec_events (id, event_type, slate_id, slate_type, user_id, course_id, session_id, group_id, restaurant_id, round, position, action, propensity, score, model_version, variant, dwell_ms, context_json, idempotency_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ).bind(
        crypto.randomUUID(),
        eventType,
        nullableText(event.slate_id),
        nullableText(event.slate_type, 30),
        userId,
        nullableText(event.course_id),
        nullableText(event.session_id),
        nullableText(event.group_id),
        nullableText(event.restaurant_id),
        nullableNumber(event.round),
        nullableNumber(event.position),
        nullableText(event.action, 30),
        nullableNumber(event.propensity),
        nullableNumber(event.score),
        nullableText(event.model_version, 100),
        nullableText(event.variant, 100),
        nullableNumber(event.dwell_ms),
        context,
        idempotencyKey,
        now,
      ),
    );
  }
  const result = await c.env.DB.batch(statements);
  if (!session && !existingGuestId)
    c.header(
      "Set-Cookie",
      cookie(
        "lm_guest_id",
        guestId,
        30 * 24 * 60 * 60,
        requestIsSecure(c.req.raw),
      ),
    );
  const inserted = result.reduce(
    (sum: number, item: any) => sum + Number(item.meta?.changes ?? 0),
    0,
  );
  return c.json({ ok: true, received: requested.length, inserted });
});

// 원본 사용자·세션·식당 식별자는 절대 반환하지 않는 관리자 집계 API.
app.get("/api/admin/metrics", async (c) => {
  const admin = await requireAdminSession(c);
  if (admin instanceof Response) return admin;
  const requestedDays = Number(c.req.query("days") ?? 30);
  const days = Number.isFinite(requestedDays)
    ? Math.max(1, Math.min(365, Math.floor(requestedDays)))
    : 30;
  const start = Date.now() - (days - 1) * 86_400_000;
  const count = (row: { count?: number | string } | null | undefined) => Number(row?.count ?? 0);
  const [registered, newRegistered, activeActors, activeSignedIn, activeGuests, eventResult, trendResult, personaResult, modelResult, impressionCoverage, persistedSlates, servedImpressions, attributableSwipes, categoryResult, contributionResult, catalogueSummary, photoAssetSummary, menuSummary, catalogueCategories, dietarySupport, sourceDistribution, restaurantSamples] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM users").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE created_at >= ?").bind(start).first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(DISTINCT user_id) AS count FROM rec_events WHERE created_at >= ? AND user_id IS NOT NULL").bind(start).first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(DISTINCT user_id) AS count FROM rec_events WHERE created_at >= ? AND user_id IS NOT NULL AND user_id NOT LIKE 'guest:%'").bind(start).first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(DISTINCT user_id) AS count FROM rec_events WHERE created_at >= ? AND user_id LIKE 'guest:%'").bind(start).first<{ count: number }>(),
    c.env.DB.prepare("SELECT event_type, action, COUNT(*) AS count FROM rec_events WHERE created_at >= ? GROUP BY event_type, action").bind(start).all<{ event_type: string; action: string | null; count: number }>(),
    c.env.DB.prepare("SELECT date(created_at / 1000, 'unixepoch') AS day, COUNT(DISTINCT user_id) AS active_actors, SUM(CASE WHEN event_type = 'SESSION_CREATED' THEN 1 ELSE 0 END) AS sessions, SUM(CASE WHEN event_type = 'WINNER' THEN 1 ELSE 0 END) AS decisions FROM rec_events WHERE created_at >= ? GROUP BY day ORDER BY day ASC").bind(start).all<{ day: string; active_actors: number; sessions: number; decisions: number }>(),
    c.env.DB.prepare("SELECT r.category AS category, COUNT(DISTINCT e.user_id) AS selectors, COUNT(*) AS decisions FROM rec_events e JOIN restaurants r ON r.id = e.restaurant_id WHERE e.created_at >= ? AND e.event_type = 'WINNER' GROUP BY r.category ORDER BY decisions DESC LIMIT 6").bind(start).all<{ category: string; selectors: number; decisions: number }>(),
    c.env.DB.prepare("SELECT COALESCE(model_version, '미지정') AS version, SUM(CASE WHEN event_type = 'IMPRESSION' THEN 1 ELSE 0 END) AS impressions, SUM(CASE WHEN event_type = 'SWIPE' THEN 1 ELSE 0 END) AS swipes, SUM(CASE WHEN event_type = 'SWIPE' AND action = 'LIKE' THEN 1 ELSE 0 END) AS likes FROM rec_events WHERE created_at >= ? GROUP BY COALESCE(model_version, '미지정') ORDER BY impressions DESC, swipes DESC LIMIT 6").bind(start).all<{ version: string; impressions: number; swipes: number; likes: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS impressions, SUM(CASE WHEN propensity IS NOT NULL AND propensity > 0 AND propensity <= 1 THEN 1 ELSE 0 END) AS propensity_logged, SUM(CASE WHEN score IS NOT NULL THEN 1 ELSE 0 END) AS score_logged, SUM(CASE WHEN model_version IS NOT NULL AND model_version != '' THEN 1 ELSE 0 END) AS model_logged, SUM(CASE WHEN context_json IS NOT NULL AND context_json != '' THEN 1 ELSE 0 END) AS context_logged FROM rec_events WHERE created_at >= ? AND event_type = 'IMPRESSION' AND COALESCE(slate_type, '') != 'COURSE_FEED'").bind(start).first<{ impressions: number; propensity_logged: number; score_logged: number; model_logged: number; context_logged: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM recommendation_slates WHERE created_at >= ?").bind(start).first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM rec_events e INNER JOIN recommendation_slates s ON s.id = e.slate_id WHERE e.created_at >= ? AND e.event_type = 'IMPRESSION'").bind(start).first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM rec_events e INNER JOIN recommendation_slates s ON s.id = e.slate_id WHERE e.created_at >= ? AND e.event_type = 'SWIPE'").bind(start).first<{ count: number }>(),
    c.env.DB.prepare("SELECT r.category AS category, SUM(CASE WHEN e.event_type = 'IMPRESSION' THEN 1 ELSE 0 END) AS impressions, SUM(CASE WHEN e.event_type = 'SWIPE' AND e.action = 'LIKE' THEN 1 ELSE 0 END) AS likes, SUM(CASE WHEN e.event_type = 'SWIPE' AND e.action = 'NOPE' THEN 1 ELSE 0 END) AS nopes, SUM(CASE WHEN e.event_type = 'WINNER' THEN 1 ELSE 0 END) AS decisions FROM rec_events e JOIN restaurants r ON r.id = e.restaurant_id WHERE e.created_at >= ? AND e.event_type IN ('IMPRESSION', 'SWIPE', 'WINNER') GROUP BY r.category ORDER BY impressions DESC, decisions DESC LIMIT 8").bind(start).all<{ category: string; impressions: number; likes: number; nopes: number; decisions: number }>(),
    c.env.DB.prepare("SELECT AVG(CAST(json_extract(item.value, '$.components.reputation') AS REAL)) AS reputation, AVG(CAST(json_extract(item.value, '$.components.context') AS REAL)) AS context, AVG(CAST(json_extract(item.value, '$.components.taste') AS REAL)) AS taste, AVG(CAST(json_extract(item.value, '$.components.exposureFatigue') AS REAL)) AS exposure_fatigue, AVG(CAST(json_extract(item.value, '$.components.satiation') AS REAL)) AS satiation, AVG(CAST(json_extract(item.value, '$.components.journeyChain') AS REAL)) AS journey_chain, COUNT(*) AS count FROM recommendation_slates s, json_each(s.items_json) AS item WHERE s.created_at >= ? AND json_type(item.value, '$.components') = 'object'").bind(start).first<{ reputation: number | null; context: number | null; taste: number | null; exposure_fatigue: number | null; satiation: number | null; journey_chain: number | null; count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS restaurants, SUM(CASE WHEN address IS NOT NULL AND trim(address) != '' THEN 1 ELSE 0 END) AS with_address, SUM(CASE WHEN latitude != 0 OR longitude != 0 THEN 1 ELSE 0 END) AS with_coordinates, SUM(CASE WHEN short_description IS NOT NULL AND trim(short_description) != '' THEN 1 ELSE 0 END) AS with_description, SUM(CASE WHEN json_valid(photos) AND json_array_length(photos) > 0 THEN 1 ELSE 0 END) AS with_photo_reference, SUM(CASE WHEN json_valid(photos) THEN json_array_length(photos) ELSE 0 END) AS photo_references, SUM(CASE WHEN json_valid(menus) AND json_array_length(menus) > 0 THEN 1 ELSE 0 END) AS with_menu_reference, SUM(CASE WHEN json_valid(menus) THEN json_array_length(menus) ELSE 0 END) AS menu_references FROM restaurants").first<{ restaurants: number; with_address: number; with_coordinates: number; with_description: number; with_photo_reference: number; photo_references: number; with_menu_reference: number; menu_references: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS photo_assets, COUNT(DISTINCT restaurant_id) AS restaurants_with_photo_assets FROM restaurant_photos").first<{ photo_assets: number; restaurants_with_photo_assets: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS menu_items, COUNT(DISTINCT restaurant_id) AS restaurants_with_menus FROM restaurant_menu_items").first<{ menu_items: number; restaurants_with_menus: number }>(),
    c.env.DB.prepare("SELECT COALESCE(NULLIF(trim(category), ''), '기타') AS category, COUNT(*) AS count FROM restaurants GROUP BY COALESCE(NULLIF(trim(category), ''), '기타') ORDER BY count DESC, category ASC LIMIT 12").all<{ category: string; count: number }>(),
    c.env.DB.prepare("SELECT trim(diet.value) AS label, COUNT(DISTINCT r.id) AS count FROM restaurants r, json_each(CASE WHEN json_valid(r.dietary_options) THEN r.dietary_options ELSE '[]' END) AS diet WHERE trim(diet.value) != '' GROUP BY trim(diet.value) ORDER BY count DESC, label ASC LIMIT 12").all<{ label: string; count: number }>(),
    c.env.DB.prepare("SELECT COALESCE(NULLIF(trim(source), ''), '미지정') AS source, COUNT(*) AS count FROM restaurants GROUP BY COALESCE(NULLIF(trim(source), ''), '미지정') ORDER BY count DESC, source ASC LIMIT 8").all<{ source: string; count: number }>(),
    c.env.DB.prepare("SELECT r.name, COALESCE(NULLIF(trim(r.category), ''), '기타') AS category, CASE WHEN json_valid(r.photos) THEN json_array_length(r.photos) ELSE 0 END AS photo_count, CASE WHEN COALESCE(m.menu_count, 0) > 0 THEN m.menu_count WHEN json_valid(r.menus) THEN json_array_length(r.menus) ELSE 0 END AS menu_count FROM restaurants r LEFT JOIN (SELECT restaurant_id, COUNT(*) AS menu_count FROM restaurant_menu_items GROUP BY restaurant_id) m ON m.restaurant_id = r.id ORDER BY r.review_count DESC, r.rating DESC, r.name ASC LIMIT 10").all<{ name: string; category: string; photo_count: number; menu_count: number }>(),
  ]);
  const events = new Map<string, number>();
  for (const row of eventResult.results) events.set(`${row.event_type}:${row.action ?? ''}`, Number(row.count));
  const eventCount = (type: string, action?: string) => action === undefined
    ? Array.from(events.entries()).filter(([key]) => key.startsWith(`${type}:`)).reduce((sum, [, value]) => sum + value, 0)
    : events.get(`${type}:${action}`) ?? 0;
  const impressions = eventCount("IMPRESSION");
  const swipes = eventCount("SWIPE");
  const likes = eventCount("SWIPE", "LIKE");
  const nopes = eventCount("SWIPE", "NOPE");
  const decisions = eventCount("WINNER");
  const sessions = eventCount("SESSION_CREATED");
  const rerolls = eventCount("REROLL");
  const trendByDay = new Map(trendResult.results.map((row) => [row.day, row]));
  const trend = Array.from({ length: days }, (_, index) => {
    const day = new Date(start + index * 86_400_000).toISOString().slice(0, 10);
    const row = trendByDay.get(day);
    return { day, activeActors: Number(row?.active_actors ?? 0), sessions: Number(row?.sessions ?? 0), decisions: Number(row?.decisions ?? 0) };
  });
  const impressionTotal = Number(impressionCoverage?.impressions ?? 0);
  const instrumentation = {
    persistedSlates: count(persistedSlates),
    servedImpressions: count(servedImpressions),
    attributableSwipes: count(attributableSwipes),
    propensityCoverage: coverage(Number(impressionCoverage?.propensity_logged ?? 0), impressionTotal),
    scoreCoverage: coverage(Number(impressionCoverage?.score_logged ?? 0), impressionTotal),
    modelVersionCoverage: coverage(Number(impressionCoverage?.model_logged ?? 0), impressionTotal),
    contextCoverage: coverage(Number(impressionCoverage?.context_logged ?? 0), impressionTotal),
  };
  const learning = assessLearningReadiness({ ...instrumentation, decisions });
  const observedResponseRate = likes + nopes ? likes / (likes + nopes) : null;
  return c.json({
    days,
    users: { registered: count(registered), newRegistered: count(newRegistered), activeActors: count(activeActors), activeSignedIn: count(activeSignedIn), activeGuests: count(activeGuests) },
    funnel: { impressions, swipes, likes, nopes, decisions, navigations: eventCount("NAVIGATE"), rerolls, abandons: eventCount("ABANDON") },
    quality: {
      swipeLikeRate: likes + nopes ? likes / (likes + nopes) : null,
      sessionDecisionRate: sessions ? decisions / sessions : null,
      rerollRate: sessions ? rerolls / sessions : null,
      // These fields are meaningful on IMPRESSION, not on a later swipe.
      propensityCoverage: instrumentation.propensityCoverage,
      scoreCoverage: instrumentation.scoreCoverage,
    },
    trend,
    personas: personaResult.results.map((row) => ({ category: row.category || '기타', selectors: Number(row.selectors), decisions: Number(row.decisions) })),
    models: modelResult.results.map((row) => ({ version: row.version, impressions: Number(row.impressions), swipes: Number(row.swipes), likes: Number(row.likes), likeRate: Number(row.swipes) ? Number(row.likes) / Number(row.swipes) : null })),
    instrumentation,
    learning,
    categoryPerformance: categoryResult.results.map((row) => {
      const likes = Number(row.likes);
      const nopes = Number(row.nopes);
      return {
        category: row.category || "기타",
        impressions: Number(row.impressions),
        likes,
        nopes,
        decisions: Number(row.decisions),
        likeRate: likes + nopes ? likes / (likes + nopes) : null,
        responseLift: likes + nopes && observedResponseRate !== null
          ? likes / (likes + nopes) - observedResponseRate
          : null,
      };
    }),
    policyContributions: contributionResult?.count ? [
      { factor: "평판", contribution: Number(contributionResult.reputation ?? 0) },
      { factor: "맥락 적합", contribution: Number(contributionResult.context ?? 0) },
      { factor: "개인 취향", contribution: Number(contributionResult.taste ?? 0) },
      { factor: "최근 노출", contribution: Number(contributionResult.exposure_fatigue ?? 0) },
      { factor: "재소비", contribution: Number(contributionResult.satiation ?? 0) },
      { factor: "여정 연쇄", contribution: Number(contributionResult.journey_chain ?? 0) },
    ] : [],
    contributionSampleSize: Number(contributionResult?.count ?? 0),
    catalogue: {
      restaurants: Number(catalogueSummary?.restaurants ?? 0),
      photoReferences: Number(catalogueSummary?.photo_references ?? 0),
      restaurantsWithPhotoReferences: Number(catalogueSummary?.with_photo_reference ?? 0),
      photoAssets: count(photoAssetSummary),
      restaurantsWithPhotoAssets: Number(photoAssetSummary?.restaurants_with_photo_assets ?? 0),
      menuItems: Number(catalogueSummary?.menu_references ?? 0),
      restaurantsWithMenus: Number(catalogueSummary?.with_menu_reference ?? 0),
      normalisedMenuItems: count(menuSummary),
      restaurantsWithNormalisedMenus: Number(menuSummary?.restaurants_with_menus ?? 0),
      completeness: {
        address: Number(catalogueSummary?.with_address ?? 0),
        coordinates: Number(catalogueSummary?.with_coordinates ?? 0),
        description: Number(catalogueSummary?.with_description ?? 0),
        photoReference: Number(catalogueSummary?.with_photo_reference ?? 0),
        menu: Number(catalogueSummary?.with_menu_reference ?? 0),
      },
      categories: catalogueCategories.results.map((row) => ({ category: row.category, count: Number(row.count) })),
      dietarySupport: dietarySupport.results.map((row) => ({ label: row.label, count: Number(row.count) })),
      sources: sourceDistribution.results.map((row) => ({ source: row.source, count: Number(row.count) })),
      samples: restaurantSamples.results.map((row) => ({ name: row.name, category: row.category, photoCount: Number(row.photo_count), menuCount: Number(row.menu_count) })),
    },
    updatedAt: new Date().toISOString(),
  });
});

// The old public endpoint was an accidental information disclosure. Keep no
// backwards-compatible public aggregate route; only /api/admin/metrics exists.
app.get("/api/metrics", (c) => c.json({ error: "운영 지표는 관리자 대시보드에서만 볼 수 있습니다." }, 410));

// Posts store stable R2 object keys behind `/photos/*`, not environment-specific
// URLs. Local development can opt into a read-only media origin so it never has
// to copy the entire production catalogue into a local R2 emulator.
app.get("/photos/*", async (c) => {
  const key = c.req.path.replace(/^\/photos\//, "");
  if (!key || key.includes("..")) return c.text("Not Found", 404);
  const remoteObject = await fetchConfiguredMedia(c.env.MEDIA_ORIGIN, key);
  if (remoteObject) {
    const headers = new Headers(remoteObject.headers);
    headers.set("Cache-Control", "public, max-age=604800, immutable");
    return new Response(remoteObject.body, { headers });
  }
  // uploadPhotosR2.ts stores every local asset beneath the `photos/` prefix.
  const object = await c.env.PHOTOS_R2.get(`photos/${key}`);
  if (!object) return c.text("Not Found", 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=604800, immutable");
  return new Response(object.body, { headers });
});

// Munchie 게시물용 사용자 사진은 R2에 보관하고 공개 경로만 코스 레코드에 넣는다.
// data URL 자체를 D1에 저장하지 않아 다른 기기에서도 같은 이미지를 볼 수 있다.
app.post("/api/uploads", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session)
    return c.json(
      { error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" },
      401,
    );
  const body = await c.req.json<{ dataUrl?: string }>().catch(() => ({}));
  const match = body.dataUrl?.match(
    /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/,
  );
  if (!match)
    return c.json(
      { error: "JPEG, PNG, WebP 이미지만 업로드할 수 있습니다." },
      400,
    );
  const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
  if (!bytes.length || bytes.length > 4 * 1024 * 1024)
    return c.json({ error: "이미지는 4MB 이하여야 합니다." }, 400);
  const extension = match[1] === "jpeg" ? "jpg" : match[1];
  const key = `uploads/${session.sub}/${crypto.randomUUID()}.${extension}`;
  await c.env.PHOTOS_R2.put(`photos/${key}`, bytes, {
    httpMetadata: { contentType: `image/${match[1]}` },
  });
  return c.json({ url: `/photos/${key}` }, 201);
});

// A profile avatar is an explicit reference to an image the current account
// uploaded. Do not accept arbitrary URLs here: otherwise a user could make a
// different user's private upload appear as their own profile photo.
app.patch("/api/profile", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session)
    return c.json(
      { error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" },
      401,
    );
  if (!(await ensurePublicUser(c.env.DB, session)))
    return c.json(
      { error: "로컬 사용자 스키마를 갱신한 뒤 프로필을 수정할 수 있습니다." },
      409,
    );
  const body = await c.req.json<{ avatarUrl?: unknown; username?: unknown }>().catch(() => ({}));
  const hasAvatarUrl = "avatarUrl" in body;
  const hasUsername = "username" in body;
  if (!hasAvatarUrl && !hasUsername)
    return c.json({ error: "변경할 프로필 정보가 없습니다." }, 400);

  if (hasAvatarUrl) {
    const avatarUrl = body.avatarUrl;
    if (
      avatarUrl !== null &&
      (typeof avatarUrl !== "string" ||
        !avatarUrl.startsWith(`/photos/uploads/${session.sub}/`) ||
        avatarUrl.length > 2_000)
    ) {
      return c.json(
        { error: "내가 업로드한 프로필 사진만 사용할 수 있습니다." },
        400,
      );
    }
    await c.env.DB.prepare("UPDATE users SET profile_image_url = ? WHERE id = ?")
      .bind(avatarUrl, session.sub)
      .run();
  }

  if (hasUsername) {
    if (typeof body.username !== "string")
      return c.json({ error: "이름을 입력해 주세요." }, 400);
    const username = body.username.trim();
    if (!username || username.length > 80)
      return c.json({ error: "이름은 1~80자로 입력해 주세요." }, 400);
    await c.env.DB.prepare("UPDATE users SET username = ? WHERE id = ?")
      .bind(username, session.sub)
      .run();
  }
  const profile = await c.env.DB.prepare(
    "SELECT id, username, profile_image_url, bio, location FROM users WHERE id = ?",
  )
    .bind(session.sub)
    .first<any>();
  return c.json({ profile });
});

// 헬스 체크
app.get("/api/health", async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM restaurants",
    ).all();
    return c.json({
      status: "ok",
      engine: "cloudflare-pages-functions-d1",
      hono: true,
      db_count: results[0].cnt,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return c.json({ status: "error", error: e.message }, 500);
  }
});

// Public profile data comes from the same D1 identity store that owns a post.
// D1 is the only public-profile source of truth.
app.get("/api/users/:id", async (c) => {
  const id = c.req.param("id");
  if (!id || id.length > 256)
    return c.json({ error: "사용자 정보가 올바르지 않습니다." }, 400);
  const user = await c.env.DB.prepare(
    "SELECT id, username, profile_image_url, bio, location, created_at FROM users WHERE id = ?",
  )
    .bind(id)
    .first<any>();
  if (!user) return c.json({ error: "사용자를 찾을 수 없습니다." }, 404);
  const count = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM courses WHERE author_id = ? AND is_public = 1",
  )
    .bind(id)
    .first<{ count: number }>();
  return c.json({
    id: user.id,
    username: user.username,
    profile_image_url: user.profile_image_url,
    bio: user.bio,
    location: user.location,
    created_at: user.created_at,
    public_post_count: Number(count?.count ?? 0),
  });
});

async function requireGoogleSession(c: { req: { raw: Request }; env: EnvBindings }) {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session) return null;
  await ensurePublicUser(c.env.DB, session);
  return session;
}

async function requireAdminSession(c: { req: { raw: Request }; env: EnvBindings; json: (value: unknown, status?: number) => Response }) {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session) return c.json({ error: "관리자 로그인이 필요합니다." }, 401);
  if (!isAdminEmail(session.email, c.env.ADMIN_EMAILS))
    return c.json({ error: "관리자 권한이 없습니다." }, 403);
  return session;
}

app.get("/api/users/:id/follows", async (c) => {
  const id = c.req.param("id");
  const [followers, following] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM user_follows WHERE following_id = ?").bind(id).first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM user_follows WHERE follower_id = ?").bind(id).first<{ count: number }>(),
  ]);
  return c.json({ followers: Number(followers?.count ?? 0), following: Number(following?.count ?? 0) });
});

app.get("/api/users/:id/follow", async (c) => {
  const session = await requireGoogleSession(c);
  if (!session) return c.json({ error: "로그인이 필요합니다." }, 401);
  const row = await c.env.DB.prepare(
    "SELECT 1 AS following FROM user_follows WHERE follower_id = ? AND following_id = ?",
  ).bind(session.sub, c.req.param("id")).first<{ following: number }>();
  return c.json({ following: Boolean(row?.following) });
});

app.post("/api/users/:id/follow", async (c) => {
  const session = await requireGoogleSession(c);
  const followingId = c.req.param("id");
  if (!session) return c.json({ error: "로그인이 필요합니다." }, 401);
  if (!followingId || followingId === session.sub) return c.json({ error: "자기 자신은 팔로우할 수 없습니다." }, 400);
  const target = await c.env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(followingId).first();
  if (!target) return c.json({ error: "사용자를 찾을 수 없습니다." }, 404);
  await c.env.DB.prepare(
    "INSERT INTO user_follows (follower_id, following_id, created_at) VALUES (?, ?, ?) ON CONFLICT(follower_id, following_id) DO NOTHING",
  ).bind(session.sub, followingId, Date.now()).run();
  return c.json({ following: true });
});

app.delete("/api/users/:id/follow", async (c) => {
  const session = await requireGoogleSession(c);
  if (!session) return c.json({ error: "로그인이 필요합니다." }, 401);
  await c.env.DB.prepare("DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?")
    .bind(session.sub, c.req.param("id")).run();
  return c.json({ following: false });
});

async function listFollows(c: any, list: "followers" | "following") {
  const id = c.req.param("id");
  const query = list === "followers"
    ? "SELECT u.id, u.username, u.profile_image_url, u.bio, u.location, u.created_at FROM user_follows f JOIN users u ON u.id = f.follower_id WHERE f.following_id = ? ORDER BY f.created_at DESC"
    : "SELECT u.id, u.username, u.profile_image_url, u.bio, u.location, u.created_at FROM user_follows f JOIN users u ON u.id = f.following_id WHERE f.follower_id = ? ORDER BY f.created_at DESC";
  const { results } = await c.env.DB.prepare(query).bind(id).all();
  return c.json(results);
}
app.get("/api/users/:id/followers", (c) => listFollows(c, "followers"));
app.get("/api/users/:id/following", (c) => listFollows(c, "following"));

// REST API — /api/recommend (D1 Query Binding)
app.post("/api/recommend", async (c) => {
  try {
    const body = await c.req.json();
    // Recommendation ownership must be derived on the server.  A client-side
    // profile ID is display state and cannot be allowed to poison another
    // person's exposure/taste evidence.
    const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
    const existingGuestId = cookieValue(c.req.raw, "lm_guest_id");
    const guestId = existingGuestId ?? crypto.randomUUID();
    const userId = session?.sub ?? `guest:${guestId}`;
    const k = Math.min(20, Math.max(1, Number(body.k) || 7));
    const ctx = body.context || {};
    const slateType: SlateType =
      body.slate_type === "FINAL" || body.slate_type === "NEXT_STOP" || body.slate_type === "COURSE_FEED"
        ? body.slate_type
        : "PRELIM";
    const requestSessionId = nullableText(body.session_id, 120);
    const candidateIds = Array.isArray(body.candidate_ids)
      ? [...new Set(body.candidate_ids.map(String))].slice(0, 200)
      : [];

    let query = `SELECT * FROM restaurants WHERE 1=1`;
    const params: any[] = [];

    // Lunchie가 이미 세션 조건으로 만든 후보 풀을 반드시 존중한다.
    // 이 조건을 무시하면 모든 세션이 DB의 고정 상위 7개로 수렴한다.
    if (candidateIds.length) {
      query += ` AND id IN (${candidateIds.map(() => "?").join(",")})`;
      params.push(...candidateIds);
    }

    // 1. Dietary Hard Filter (JSON_CONTAINS equivalent logic for SQLite)
    const diets = Array.isArray(ctx.dietary)
      ? ctx.dietary
      : Array.isArray(ctx.diet)
        ? ctx.diet
        : [];
    if (diets.length > 0) {
      // D1 doesn't have JSON_CONTAINS natively, we use LIKE for simple arrays
      for (const diet of diets) {
        query += ` AND dietary_options LIKE ?`;
        params.push(`%${diet}%`);
      }
    }

    // 2. Budget (Price Range)
    if (typeof ctx.budget === "number") {
      if (ctx.budget === 1) {
        query += ` AND price_level = 1`;
      } else if (ctx.budget === 2) {
        query += ` AND price_level <= 2`;
      } else if (ctx.budget === 3) {
        query += ` AND price_level <= 3`;
      }
    }

    // 3. Taste (Categories) mapping
    if (ctx.categories && ctx.categories.length > 0) {
      query += ` AND category IN (${ctx.categories.map(() => "?").join(",")})`;
      params.push(...ctx.categories);
    }

    // Quality fields are a deterministic tie-breaker only. The final slate is
    // drawn without replacement below, so a catalogue with zero ratings does
    // not permanently pin users to alphabetically first restaurants.
    query += ` ORDER BY rating DESC, review_count DESC, name ASC LIMIT 200`;

    const { results: rawResults } = await c.env.DB.prepare(query)
      .bind(...params)
      .all();
    const selectedIntent: Intent | null =
      ctx.intent === "meal" || ctx.intent === "cafe" || ctx.intent === "dessert"
        ? ctx.intent
        : null;
    // Do not approximate cafe/dessert with a shared SQL list. The canonical
    // classifier is also used by shared Lunchie sessions, so every serving
    // path has one hard-category contract.
    const results = (rawResults as any[]).filter((restaurant) =>
      categoryMatchesIntent(restaurant.category, selectedIntent),
    );

    let exposureMap: Record<string, { count?: number; updatedAt?: number }> =
      {};
    try {
      const id = c.env.USER_DO.idFromName(userId);
      const state = await c.env.USER_DO.get(id).fetch(
        "https://user-state/state",
      );
      const stateData = await state.json<{
        exposureMap?: Record<string, { count?: number; updatedAt?: number }>;
      }>();
      exposureMap = stateData.exposureMap ?? {};
    } catch {
      /* A recommendation still works if short-lived exposure state is unavailable. */
    }

    const recommendationContext: RecContext = {
      ...(ctx as RecContext),
      diet: Array.isArray(ctx.dietary) ? ctx.dietary : Array.isArray(ctx.diet) ? ctx.diet : undefined,
    };
    const now = Date.now();
    const exposurePenalty = (restaurantId: string) => {
      const exposure = exposureMap[restaurantId];
      if (!exposure?.count || !exposure.updatedAt) return 0;
      const elapsed = Math.max(0, now - exposure.updatedAt);
      const decayed = exposure.count * Math.pow(0.5, elapsed / 86_400_000);
      return Math.min(0.9, decayed / 4);
    };
    const scoredSlate = buildSlate(results as Candidate[], recommendationContext, {
      k,
      // Stage 0 is a context/reputation policy with controlled exploration.
      // Do not label it as personalised learning before a durable taste model exists.
      eps: 0.12,
      exposurePenalty,
    });
    const byId = new Map((results as any[]).map((restaurant) => [restaurant.id, restaurant]));
    const finalResults = scoredSlate
      .map((item) => ({ restaurant: byId.get(item.id), ...item }))
      .filter((item): item is { restaurant: any; id: string; score: number; propensity: number; rank: number } => Boolean(item.restaurant));
    // An intentionally small slate is preferable to silently substituting
    // cafes/drinks for a user's explicit meal (or vice versa).

    const slateId = crypto.randomUUID();
    // 노출은 추천 결과를 받은 시점에 User DO에 기록한다. 이 값은 다음 단계에서
    // 하드 제외가 아닌 시간 감쇠 페널티·재발견 보너스 계산에만 사용된다.
    try {
      const stub = c.env.USER_DO.get(c.env.USER_DO.idFromName(userId));
      await Promise.all(
        finalResults.map((item) =>
          stub.fetch("https://user-state/recordExposure", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ restaurantId: item.id, ts: now }),
          }),
        ),
      );
    } catch {
      /* recommendation serving must not fail if state storage is unavailable */
    }

    const policyVersion = "stage0-contextual-v1";
    const slateItems = finalResults.map((item) => ({
      restaurant_id: item.id,
      position: item.rank,
      score: item.score,
      propensity: item.propensity,
      components: scoreCandidateBreakdown(
        item.restaurant as Candidate,
        recommendationContext,
        results as Candidate[],
        null,
        exposurePenalty(item.id),
      ),
    }));
    const contextJson = JSON.stringify(recommendationContext);
    const expiry = now + 24 * 60 * 60 * 1000;
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO recommendation_slates (id, owner_user_id, session_id, slate_type, policy_version, variant, context_json, items_json, candidate_count, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ).bind(slateId, userId, requestSessionId, slateType, policyVersion, "contextual", contextJson, JSON.stringify(slateItems), results.length, now, expiry),
      ...slateItems.map((item) =>
        c.env.DB.prepare(
          "INSERT INTO rec_events (id, event_type, slate_id, slate_type, user_id, session_id, restaurant_id, position, propensity, score, model_version, variant, context_json, idempotency_key, created_at) VALUES (?, 'IMPRESSION', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ).bind(
          crypto.randomUUID(),
          slateId,
          slateType,
          userId,
          requestSessionId,
          item.restaurant_id,
          item.position,
          item.propensity,
          item.score,
          policyVersion,
          "contextual",
          contextJson,
          `slate:${slateId}:impression:${item.position}`,
          now,
        ),
      ),
    ]);
    const response = c.json({
      slate: finalResults.map((item) => ({
        ...item.restaurant,
        photos: json<string[]>(item.restaurant.photos, []),
        menu_items: json(item.restaurant.menus, []),
        tags: json<string[]>(item.restaurant.tags, []),
        rank: item.rank,
        score: item.score,
        propensity: item.propensity,
      })),
      user_id: userId,
      k,
      slate_id: slateId,
      slate_type: slateType,
      model_version: policyVersion,
      engine: "cloudflare-hono-d1",
    });
    if (!session && !existingGuestId)
      response.headers.append("Set-Cookie", cookie("lm_guest_id", guestId, 30 * 24 * 60 * 60, requestIsSecure(c.req.raw)));
    return response;
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// REST API — /api/restaurants (전체 식당 카탈로그)
app.get("/api/restaurants", async (c) => {
  // 카탈로그를 50개에서 자르면 런치의 후보 풀도 영구히 그 절반에 갇힌다.
  // 현재 규모와 다음 데이터 보강분을 함께 담을 수 있게 상한만 둔다.
  const requested = Number(c.req.query("limit") ?? 200);
  const limit = Number.isFinite(requested)
    ? Math.max(1, Math.min(Math.floor(requested), 200))
    : 200;
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM restaurants ORDER BY name ASC LIMIT ?",
  )
    .bind(limit)
    .all();
  return c.json(
    results.map((r: any) => ({
      ...r,
      photos: json<string[]>(r.photos, []),
      menu_items: json(r.menus, []),
      tags: json<string[]>(r.tags, []),
    })),
  );
});

// REST API — /api/courses (Munchie 코스 목록)
app.get("/api/courses", async (c) => {
  try {
    const { results: courses } = await c.env.DB.prepare(
      "SELECT * FROM courses WHERE is_public = 1 ORDER BY created_at DESC LIMIT 40",
    ).all();

    const populatedCourses = [];
    for (const course of courses as any[]) {
      const { results: stops } = await c.env.DB.prepare(
        "SELECT ci.*, r.name, r.category, r.photos, r.rating, r.latitude, r.longitude FROM course_items ci JOIN restaurants r ON ci.restaurant_id = r.id WHERE ci.course_id = ? ORDER BY ci.order_index",
      )
        .bind(course.id)
        .all();

      // 브라우저가 사용하는 Course 계약으로 정규화한다. DB의 JSON TEXT/스네이크 케이스를
      // 그대로 내보내면 tags.map에서 초기 동기화가 멈춰, 뒤의 피드 갱신도 실행되지 않는다.
      populatedCourses.push({
        id: course.id,
        title: course.title,
        description: course.description,
        heroImage: course.hero_image || "",
        tags: json<string[]>(course.tags, []),
        hashtags: json<string[]>(course.hashtags, []),
        region: course.region,
        metadata: {
          distance: Number(course.total_distance ?? 0),
          duration: Number(course.total_duration ?? 0),
          placeCount: stops.length,
        },
        creatorId: course.author_id,
        savedCount: Number(course.saves_count ?? 0),
        isPublic: Boolean(course.is_public),
        createdAt: isoDate(course.created_at),
        stops: stops.map((s: any) => ({
          placeId: s.restaurant_id,
          order: s.order_index,
          startTime: s.start_time || "",
          endTime: s.end_time || "",
          isBookmarked: Boolean(s.is_bookmarked),
          restaurant: {
            id: s.restaurant_id,
            name: s.name,
            category: s.category,
            photos: json<string[]>(s.photos, []),
            rating: s.rating,
            latitude: s.latitude,
            longitude: s.longitude,
          },
        })),
      });
    }

    return c.json(populatedCourses);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// 공개 코스의 원본은 브라우저 상태가 아니라 D1이다. 작성자 ID는 요청 본문이
// 아니라 Google 세션에서만 취하므로 다른 사용자를 가장해 게시할 수 없다.
app.post("/api/courses", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session)
    return c.json(
      { error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" },
      401,
    );

  try {
    const body = await c.req.json<Record<string, unknown>>();
    const title =
      typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
    const description =
      typeof body.description === "string"
        ? body.description.trim().slice(0, 2_000)
        : "";
    const stops = Array.isArray(body.stops) ? body.stops : [];
    if (!title || stops.length < 1 || stops.length > 3) {
      return c.json({ error: "제목과 1~3개의 장소가 필요합니다." }, 400);
    }
    const restaurantIds = stops.map((stop: any) =>
      typeof stop?.placeId === "string" ? stop.placeId : "",
    );
    if (restaurantIds.some((id) => !id))
      return c.json({ error: "장소 정보가 올바르지 않습니다." }, 400);
    const placeholders = restaurantIds.map(() => "?").join(",");
    const known = await c.env.DB.prepare(
      `SELECT id, photos FROM restaurants WHERE id IN (${placeholders})`,
    )
      .bind(...restaurantIds)
      .all();
    if ((known.results?.length ?? 0) !== restaurantIds.length)
      return c.json({ error: "존재하지 않는 장소가 포함되어 있습니다." }, 400);

    const strings = (value: unknown, limit: number) =>
      Array.isArray(value)
        ? value
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim().slice(0, 40))
            .filter(Boolean)
            .slice(0, limit)
        : [];
    // Feed artwork must be an author-uploaded R2 path. Restaurant imagery is
    // recommendation metadata and must never stand in for a user's post.
    const requestedHero =
      typeof body.heroImage === "string" &&
      body.heroImage.startsWith("/photos/")
        ? body.heroImage
        : null;
    // URL은 태그와 달리 잘라내면 안 된다. 과거 generic `strings()`를 써서
    // 40자로 절단된 R2 경로가 다른 사람의 카드에서 깨졌었다.
    const feedPhotos = Array.isArray(body.feedPhotos)
      ? Array.from(
          new Set(
            body.feedPhotos.filter(
              (photo): photo is string =>
                typeof photo === "string" &&
                photo.startsWith("/photos/") &&
                photo.length <= 512,
            ),
          ),
        ).slice(0, MAX_MUNCHIE_FEED_PHOTOS)
      : [];
    const feedDecor = Array.isArray(body.feedDecor)
      ? body.feedDecor
          .slice(0, MAX_MUNCHIE_FEED_PHOTOS)
          .flatMap((raw: any, index) => {
            if (
              !raw ||
              typeof raw !== "object" ||
              typeof raw.src !== "string" ||
              !raw.src.startsWith("/photos/")
            )
              return [];
            const number = (
              value: unknown,
              fallback: number,
              min: number,
              max: number,
            ) =>
              typeof value === "number" && Number.isFinite(value)
                ? Math.max(min, Math.min(max, value))
                : fallback;
            return [
              {
                id:
                  typeof raw.id === "string"
                    ? raw.id.slice(0, 120)
                    : `photo_${index}`,
                src: raw.src,
                x: number(raw.x, 50, 0, 100),
                y: number(raw.y, 50, 0, 100),
                w: number(raw.w, 40, 5, 100),
                h: number(raw.h, number(raw.w, 40, 5, 100), 5, 100),
                rotate: number(raw.rotate, 0, -180, 180),
              },
            ];
          })
      : [];
    if (!feedPhotos.length || !feedDecor.length) {
      return c.json(
        { error: "포스팅하려면 배치한 사진을 1장 이상 저장해야 합니다." },
        400,
      );
    }
    const heroImage = requestedHero ?? feedPhotos[0];
    const templateId =
      typeof body.templateId === "string" ? body.templateId.slice(0, 80) : null;
    const id = crypto.randomUUID();
    const createdAt = Date.now();
    const tags = strings(body.tags, 5);
    const hashtags = strings(body.hashtags, 10);
    const region =
      typeof body.region === "string" ? body.region.trim().slice(0, 120) : "";
    const metadata =
      body.metadata && typeof body.metadata === "object"
        ? (body.metadata as Record<string, unknown>)
        : {};
    const distance =
      typeof metadata.distance === "number" &&
      Number.isFinite(metadata.distance)
        ? metadata.distance
        : null;
    const duration =
      typeof metadata.duration === "number" &&
      Number.isFinite(metadata.duration)
        ? metadata.duration
        : null;
    const statements = [
      c.env.DB.prepare(
        "INSERT INTO courses (id, author_id, title, description, hero_image, category, region, tags, hashtags, total_distance, total_duration, likes_count, saves_count, comments_count, is_public, feed_photos, feed_decor, template_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 1, ?, ?, ?, ?)",
      ).bind(
        id,
        session.sub,
        title,
        description,
        heroImage,
        "course",
        region,
        JSON.stringify(tags),
        JSON.stringify(hashtags),
        distance,
        duration,
        JSON.stringify(feedPhotos),
        JSON.stringify(feedDecor),
        templateId,
        createdAt,
      ),
      ...feedDecor.map((photo: any, index: number) =>
        c.env.DB.prepare(
          "INSERT INTO course_media (id, course_id, r2_path, placement_index, x, y, width, height, rotation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ).bind(
          crypto.randomUUID(),
          id,
          photo.src,
          index,
          photo.x,
          photo.y,
          photo.w,
          photo.h ?? photo.w,
          photo.rotate,
          createdAt,
        ),
      ),
      ...restaurantIds.map((restaurantId, index) =>
        c.env.DB.prepare(
          "INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)",
        ).bind(
          crypto.randomUUID(),
          id,
          restaurantId,
          index + 1,
          "",
          "",
          createdAt,
        ),
      ),
    ];
    await c.env.DB.batch(statements);
    return c.json({ id, authorId: session.sub, createdAt }, 201);
  } catch (err: any) {
    return c.json({ error: err.message ?? "코스를 저장하지 못했습니다." }, 400);
  }
});

app.post("/api/feed-like", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session)
    return c.json(
      { error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" },
      401,
    );
  const { courseId } = await c.req.json<{ courseId?: string }>();
  if (!courseId) return c.json({ error: "게시물 정보가 필요합니다." }, 400);
  const exists = await c.env.DB.prepare(
    "SELECT id FROM courses WHERE id = ? AND is_public = 1",
  )
    .bind(courseId)
    .first();
  if (!exists) return c.json({ error: "게시물을 찾을 수 없습니다." }, 404);
  const prior = await c.env.DB.prepare(
    "SELECT 1 FROM feed_likes WHERE user_id = ? AND course_id = ?",
  )
    .bind(session.sub, courseId)
    .first();
  if (prior) {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "DELETE FROM feed_likes WHERE user_id = ? AND course_id = ?",
      ).bind(session.sub, courseId),
      c.env.DB.prepare(
        "UPDATE courses SET likes_count = MAX(0, likes_count - 1) WHERE id = ?",
      ).bind(courseId),
    ]);
    return c.json({ liked: false });
  }
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO feed_likes (user_id, course_id, created_at) VALUES (?, ?, ?)",
    ).bind(session.sub, courseId, Date.now()),
    c.env.DB.prepare(
      "UPDATE courses SET likes_count = likes_count + 1 WHERE id = ?",
    ).bind(courseId),
  ]);
  return c.json({ liked: true });
});

// Lunch 결과는 로그인 사용자에게는 서버 여정으로 영속한다. 익명 모드는 클라이언트의
// 당일 여정으로만 보이며 계정 데이터와 섞이지 않는다.
app.post("/api/journey-winner", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  const body = await c.req.json<{
    restaurantId?: string;
    sessionId?: string;
    intent?: string;
    idempotencyKey?: string;
  }>();
  if (
    !body.restaurantId ||
    !body.idempotencyKey ||
    body.idempotencyKey.length > 160
  )
    return c.json({ error: "식당과 멱등성 키가 필요합니다." }, 400);
  const restaurant = await c.env.DB.prepare(
    "SELECT id FROM restaurants WHERE id = ?",
  )
    .bind(body.restaurantId)
    .first();
  if (!restaurant) return c.json({ error: "식당을 찾을 수 없습니다." }, 404);
  const guestId = cookieValue(c.req.raw, "lm_guest_id") ?? crypto.randomUUID();
  const userId = session?.sub ?? `guest:${guestId}`;
  const result = await c.env.DB.prepare(
    "INSERT OR IGNORE INTO rec_events (id, event_type, user_id, session_id, restaurant_id, context_json, idempotency_key, created_at) VALUES (?, 'WINNER', ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      crypto.randomUUID(),
      userId,
      body.sessionId || null,
      body.restaurantId,
      JSON.stringify({ intent: body.intent || null }),
      body.idempotencyKey,
      Date.now(),
    )
    .run();
  if (!session && !cookieValue(c.req.raw, "lm_guest_id"))
    c.header(
      "Set-Cookie",
      cookie(
        "lm_guest_id",
        guestId,
        30 * 24 * 60 * 60,
        requestIsSecure(c.req.raw),
      ),
    );
  return c.json({ ok: true, duplicate: (result.meta?.changes ?? 0) === 0 });
});

type SessionRow = {
  id: string;
  host_user_id: string;
  share_token: string;
  group_size: number;
  filter_distance: number;
  distance_enabled: number;
  origin_latitude: number | null;
  origin_longitude: number | null;
  filter_budget: number;
  filter_categories: string;
  filter_dietary: string;
  intent: Intent | null;
  top_restaurant_ids: string;
  status: string;
  deadline_at: number | null;
  created_at: number;
};
const sessionPayload = (session: SessionRow) => ({
  ...session,
  // The existing app named this field filter_vibe. Keep that client contract
  // while D1 correctly stores food categories in filter_categories.
  filter_vibe: json<string[]>(session.filter_categories, []),
  filter_categories: json<string[]>(session.filter_categories, []),
  filter_dietary: json<string[]>(session.filter_dietary, []),
  deck_ids: json<string[]>(session.top_restaurant_ids, []),
});
const sessionToken = () =>
  crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
const PRELIM_DONE_ID = "__prelim_done__";
const DECK_SIZE_PREFIX = "__deck_size__:";
const FORCE_PREFIX = "__force__:";

type SessionSwipe = {
  session_id: string;
  user_id: string;
  restaurant_id: string;
  round: number;
  swipe_action: string;
  created_at: number;
};

type SessionPreference = { category: string; score: number; rank?: number };
const preferenceSnapshot = (value: unknown) => {
  const parsed = typeof value === "string" ? json<unknown>(value, []) : value;
  if (Array.isArray(parsed))
    return { categories: parsed, dietary: [] as string[] };
  if (parsed && typeof parsed === "object") {
    const item = parsed as { categories?: unknown; dietary?: unknown };
    return {
      categories: Array.isArray(item.categories) ? item.categories : [],
      dietary: Array.isArray(item.dietary)
        ? item.dietary.filter(
            (diet): diet is string => typeof diet === "string",
          )
        : [],
    };
  }
  return { categories: [] as unknown[], dietary: [] as string[] };
};
const sessionPreferences = (value: unknown): SessionPreference[] =>
  preferenceSnapshot(value)
    .categories.filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object",
    )
    .map((item) => ({
      category:
        typeof item.category === "string"
          ? item.category.trim().slice(0, 40)
          : "",
      score: Math.max(0, Math.min(1, Number(item.score) || 0)),
      rank: Number.isFinite(Number(item.rank)) ? Number(item.rank) : undefined,
    }))
    .filter((item) => item.category);
const sessionDietary = (value: unknown) => preferenceSnapshot(value).dietary;
const SESSION_SEAFOOD_RE =
  /해산물|seafood|스시|sushi|초밥|회|sashimi|오마카세|omakase/i;
function matchesGroupDiet(
  category: string,
  optionText: unknown,
  rawRestrictions: string[],
) {
  const required = rawRestrictions
    .map(normalizeDiet)
    .filter(
      (diet): diet is DietTag => Boolean(diet) && isHardRestriction(diet),
    );
  if (!required.length) return true;
  const offered = json<string[]>(
    typeof optionText === "string" ? optionText : "[]",
    [],
  ).map(normalizeDiet);
  return required.every((diet) =>
    diet === "NO_SEAFOOD"
      ? !SESSION_SEAFOOD_RE.test(category)
      : offered.includes(diet),
  );
}

// A group slate is intentionally computed once on the server. Ranking averages
// member preference signals, then applies a category-coverage penalty so the
// first seven cards do not collapse into one cuisine. The stable tie-break is
// session-based: identical room state always produces the identical deck.
function buildSharedSessionDeck(
  sessionId: string,
  restaurants: any[],
  memberRows: any[],
  size = 7,
) {
  const members = memberRows.map((member) =>
    sessionPreferences(member.preferences_json),
  );
  const categoryScores = new Map<string, number>();
  for (const preferences of members) {
    const perMember = new Map(
      preferences.map((preference) => [preference.category, preference.score]),
    );
    for (const restaurant of restaurants) {
      const previous = categoryScores.get(restaurant.category) ?? 0;
      categoryScores.set(
        restaurant.category,
        previous + (perMember.get(restaurant.category) ?? 0.35),
      );
    }
  }
  const divisor = Math.max(1, members.length);
  const hash = (value: string) => {
    let result = 2166136261;
    for (let index = 0; index < value.length; index++)
      result = Math.imul(result ^ value.charCodeAt(index), 16777619);
    return (result >>> 0) / 0xffffffff;
  };
  const remaining = restaurants.map((restaurant) => ({
    restaurant,
    score:
      (categoryScores.get(restaurant.category) ?? 0) / divisor +
      Math.min(1, Number(restaurant.rating ?? 0) / 5) * 0.15 +
      hash(`${sessionId}:${restaurant.id}`) * 0.03,
  }));
  const selected: any[] = [];
  const categoryCount = new Map<string, number>();
  while (remaining.length && selected.length < size) {
    remaining.sort(
      (a, b) =>
        b.score -
          (categoryCount.get(b.restaurant.category) ?? 0) * 0.22 -
          (a.score - (categoryCount.get(a.restaurant.category) ?? 0) * 0.22) ||
        a.restaurant.id.localeCompare(b.restaurant.id),
    );
    const next = remaining.shift()!.restaurant;
    selected.push(next);
    categoryCount.set(
      next.category,
      (categoryCount.get(next.category) ?? 0) + 1,
    );
  }
  return selected.map((restaurant) => restaurant.id);
}

export function sessionResults(
  session: SessionRow,
  members: any[],
  swipes: SessionSwipe[],
  restaurants: any[],
) {
  const generation = Math.max(
    1,
    Math.ceil(
      swipes.reduce(
        (max, swipe) => Math.max(max, Number(swipe.round) || 1),
        1,
      ) / 2,
    ),
  );
  const prelimRound = generation * 2 - 1;
  const finalRound = generation * 2;
  const inPrelim = swipes.filter(
    (swipe) => Number(swipe.round) === prelimRound,
  );
  const deckSizeByUser = new Map<string, number>();
  const completedUsers = new Set<string>();
  const forced = new Set<number>();
  for (const swipe of inPrelim) {
    if (swipe.restaurant_id === PRELIM_DONE_ID)
      completedUsers.add(swipe.user_id);
    if (swipe.restaurant_id.startsWith(DECK_SIZE_PREFIX)) {
      const size = Number(swipe.restaurant_id.slice(DECK_SIZE_PREFIX.length));
      if (Number.isInteger(size) && size > 0 && size <= 50)
        deckSizeByUser.set(swipe.user_id, size);
    }
    if (swipe.restaurant_id === `${FORCE_PREFIX}${prelimRound}`)
      forced.add(prelimRound);
  }
  const finalRows = swipes.filter(
    (swipe) => Number(swipe.round) === finalRound,
  );
  for (const swipe of finalRows)
    if (swipe.restaurant_id === `${FORCE_PREFIX}${finalRound}`)
      forced.add(finalRound);

  const prelimRows = inPrelim.filter(
    (swipe) =>
      swipe.restaurant_id !== PRELIM_DONE_ID &&
      !swipe.restaurant_id.startsWith(DECK_SIZE_PREFIX) &&
      !swipe.restaurant_id.startsWith(FORCE_PREFIX),
  );
  const validFinalRows = finalRows.filter(
    (swipe) => !swipe.restaurant_id.startsWith(FORCE_PREFIX),
  );
  const countByUser = new Map<string, number>();
  for (const swipe of prelimRows)
    countByUser.set(swipe.user_id, (countByUser.get(swipe.user_id) ?? 0) + 1);
  const filtered = restaurants.filter((restaurant) => {
    const categories = json<string[]>(session.filter_categories, []);
    const hasOrigin = Number(session.distance_enabled) !== 0 && isValidCoordinate(
      session.origin_latitude,
      session.origin_longitude,
    );
    return (
      (categories.length === 0 || categories.includes(restaurant.category)) &&
      categoryMatchesIntent(restaurant.category, session.intent) &&
      (!hasOrigin ||
        isWithinRadius(
          Number(session.origin_latitude),
          Number(session.origin_longitude),
          restaurant.latitude,
          restaurant.longitude,
          Number(session.filter_distance),
        ))
    );
  });
  const fallbackTarget = Math.min(filtered.length, 7);
  const targetFor = (userId: string) =>
    deckSizeByUser.get(userId) ?? fallbackTarget;
  const prelimComplete = (userId: string) =>
    completedUsers.has(userId) ||
    (countByUser.get(userId) ?? 0) >= targetFor(userId);
  const completedCount = members.filter((member) =>
    prelimComplete(member.user_id),
  ).length;
  const deadlineAt = session.deadline_at
    ? new Date(Number(session.deadline_at)).toISOString()
    : null;
  const expired =
    session.deadline_at !== null &&
    Number.isFinite(Number(session.deadline_at)) &&
    Date.now() >= Number(session.deadline_at);
  const decision = decideGroup(
    prelimRows as any,
    validFinalRows as any,
    members.length,
    completedCount,
    expired,
    generation,
    3,
    forced.has(prelimRound),
    forced.has(finalRound),
  );
  const finalVoters = new Set(
    validFinalRows
      .filter((swipe) => swipe.swipe_action === "LIKE")
      .map((swipe) => swipe.user_id),
  );
  const finalStage = decision.phase === "FINAL";
  return {
    completedCount,
    totalMembers: members.length,
    memberCompletion: members.map((member) => ({
      id: member.user_id,
      name: member.user_name,
      emoji: member.emoji,
      completed: finalStage
        ? finalVoters.has(member.user_id)
        : prelimComplete(member.user_id),
      swipeCount: finalStage
        ? finalVoters.has(member.user_id)
          ? 1
          : 0
        : Math.min(
            countByUser.get(member.user_id) ?? 0,
            targetFor(member.user_id),
          ),
      targetCount: finalStage ? 1 : targetFor(member.user_id),
    })),
    isExpired: expired,
    deadlineAt,
    generation,
    rerollCap: 3,
    results: decision.results,
    phase: decision.phase,
    finalists: decision.finalists,
    finalTally: decision.finalTally,
    finalVotedCount: decision.finalVotedCount,
    rejectVotes: decision.rejectVotes,
    excludeIds: decision.excludeIds,
    winnerId: decision.winnerId,
  };
}

// Group-session state must live in D1: a QR/link opened on another device
// cannot see the in-memory Express fallback used during local development.
app.post("/api/sessions/create", async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const hostId =
    nullableText(body.hostId, 256) ?? `guest:${crypto.randomUUID()}`;
  const hostName = nullableText(body.hostName, 80) ?? "호스트";
  const emoji = nullableText(body.emoji, 16) ?? "👤";
  const groupSize =
    typeof body.groupSize === "number" && Number.isFinite(body.groupSize)
      ? Math.max(1, Math.min(12, Math.floor(body.groupSize)))
      : 4;
  const filterDistance =
    typeof body.filterDistance === "number" &&
    Number.isFinite(body.filterDistance)
      ? Math.max(100, Math.min(50_000, Math.floor(body.filterDistance)))
      : 1000;
  const distanceEnabled = body.distanceEnabled !== false;
  const originLatitude = body.originLatitude;
  const originLongitude = body.originLongitude;
  if (distanceEnabled && !isValidCoordinate(originLatitude, originLongitude))
    return c.json(
      { error: "거리 제한을 사용하려면 현재 위치 권한이 필요합니다. 거리 제한 없음을 선택하면 위치 없이 시작할 수 있어요." },
      400,
    );
  const filterBudget =
    typeof body.filterBudget === "number" && Number.isFinite(body.filterBudget)
      ? Math.max(1, Math.min(4, Math.floor(body.filterBudget)))
      : 2;
  const categories = Array.isArray(body.filterCategories)
    ? body.filterCategories
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 12)
    : [];
  const dietary = Array.isArray(body.filterDietary)
    ? body.filterDietary
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 12)
    : [];
  const intent: Intent | null =
    body.intent === "meal" || body.intent === "cafe" || body.intent === "dessert"
      ? body.intent
      : null;
  const hostPreferences = Array.isArray(body.hostPreferences)
    ? sessionPreferences(JSON.stringify(body.hostPreferences)).slice(0, 20)
    : [];
  const hostDietary = Array.isArray(body.hostDietary)
    ? body.hostDietary
        .filter((item): item is string => typeof item === "string")
        .slice(0, 12)
    : [];
  const createdAt = Date.now();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const id = crypto.randomUUID();
    const token = sessionToken();
    try {
      await c.env.DB.batch([
        c.env.DB.prepare(
          "INSERT INTO sessions (id, host_user_id, share_token, group_size, filter_distance, distance_enabled, origin_latitude, origin_longitude, filter_budget, filter_categories, filter_dietary, intent, status, deadline_at, top_restaurant_ids, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'WAITING', NULL, ?, ?)",
        ).bind(
          id,
          hostId,
          token,
          groupSize,
          filterDistance,
          distanceEnabled ? 1 : 0,
          distanceEnabled ? Number(originLatitude) : null,
          distanceEnabled ? Number(originLongitude) : null,
          filterBudget,
          JSON.stringify(categories),
          JSON.stringify(dietary),
          intent,
          "[]",
          createdAt,
        ),
        c.env.DB.prepare(
          "INSERT INTO session_members (id, session_id, user_id, user_name, emoji, is_ready, preferences_json, joined_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
        ).bind(
          crypto.randomUUID(),
          id,
          hostId,
          hostName,
          emoji,
          JSON.stringify({ categories: hostPreferences, dietary: hostDietary }),
          createdAt,
        ),
      ]);
      const session: SessionRow = {
        id,
        host_user_id: hostId,
        share_token: token,
        group_size: groupSize,
        filter_distance: filterDistance,
        distance_enabled: distanceEnabled ? 1 : 0,
        origin_latitude: distanceEnabled ? Number(originLatitude) : null,
        origin_longitude: distanceEnabled ? Number(originLongitude) : null,
        filter_budget: filterBudget,
        filter_categories: JSON.stringify(categories),
        filter_dietary: JSON.stringify(dietary),
        intent,
        top_restaurant_ids: "[]",
        status: "WAITING",
        deadline_at: null,
        created_at: createdAt,
      };
      return c.json({ session: sessionPayload(session), token }, 201);
    } catch (error: any) {
      // A random invite-code collision is safe to retry; any other D1 error
      // is surfaced so the client never gives out a non-existent invitation.
      console.error("Lunchie session creation failed", error);
      if (attempt === 2 || !String(error?.message ?? "").includes("UNIQUE"))
        return c.json({ error: "세션을 서버에 저장하지 못했습니다." }, 500);
    }
  }
  return c.json({ error: "초대 코드를 만들지 못했습니다." }, 500);
});

app.get("/api/sessions/:token", async (c) => {
  const token = c.req.param("token").trim().toUpperCase();
  const session = await c.env.DB.prepare(
    "SELECT * FROM sessions WHERE share_token = ?",
  )
    .bind(token)
    .first<SessionRow>();
  if (!session) return c.json({ error: "Session not found" }, 404);
  const { results: members } = await c.env.DB.prepare(
    "SELECT user_id, user_name, emoji, is_ready, joined_at FROM session_members WHERE session_id = ? ORDER BY joined_at",
  )
    .bind(session.id)
    .all();
  return c.json({ session: sessionPayload(session), members });
});

app.post("/api/sessions/:token/join", async (c) => {
  const token = c.req.param("token").trim().toUpperCase();
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const userId = nullableText(body.userId, 256);
  const userName = nullableText(body.userName, 80);
  const emoji = nullableText(body.emoji, 16) ?? "👤";
  const preferences = Array.isArray(body.preferences)
    ? sessionPreferences(JSON.stringify(body.preferences)).slice(0, 20)
    : [];
  const dietary = Array.isArray(body.dietary)
    ? body.dietary
        .filter((item): item is string => typeof item === "string")
        .slice(0, 12)
    : [];
  if (!userId || !userName)
    return c.json({ error: "참여자 정보가 필요합니다." }, 400);
  const session = await c.env.DB.prepare(
    "SELECT id, group_size FROM sessions WHERE share_token = ?",
  )
    .bind(token)
    .first<{ id: string; group_size: number }>();
  if (!session)
    return c.json({ error: "세션을 찾을 수 없거나 만료되었습니다." }, 404);
  const existing = await c.env.DB.prepare(
    "SELECT id FROM session_members WHERE session_id = ? AND user_id = ?",
  )
    .bind(session.id, userId)
    .first();
  if (!existing) {
    const count = await c.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM session_members WHERE session_id = ?",
    )
      .bind(session.id)
      .first<{ count: number }>();
    if (Number(count?.count ?? 0) >= Number(session.group_size)) {
      const solo = Number(session.group_size) === 1;
      return c.json(
        {
          error: solo
            ? "호스트가 혼자 세션으로 만들었어요. 호스트가 '같이' 세션을 새로 만들어야 합니다."
            : "정원이 찼어요.",
          code: solo ? "SOLO_SESSION" : "SESSION_FULL",
        },
        409,
      );
    }
  }
  await c.env.DB.prepare(
    "INSERT INTO session_members (id, session_id, user_id, user_name, emoji, is_ready, preferences_json, joined_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?) ON CONFLICT(session_id, user_id) DO UPDATE SET user_name = excluded.user_name, emoji = excluded.emoji, preferences_json = excluded.preferences_json",
  )
    .bind(
      crypto.randomUUID(),
      session.id,
      userId,
      userName,
      emoji,
      JSON.stringify({ categories: preferences, dietary }),
      Date.now(),
    )
    .run();
  return c.json({ ok: true });
});

app.post("/api/sessions/:token/ready", async (c) => {
  const token = c.req.param("token").trim().toUpperCase();
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const userId = nullableText(body.userId, 256);
  if (!userId || typeof body.isReady !== "boolean")
    return c.json({ error: "준비 상태 정보가 필요합니다." }, 400);
  const session = await c.env.DB.prepare(
    "SELECT id FROM sessions WHERE share_token = ?",
  )
    .bind(token)
    .first<{ id: string }>();
  if (!session) return c.json({ error: "세션을 찾을 수 없습니다." }, 404);
  const result = await c.env.DB.prepare(
    "UPDATE session_members SET is_ready = ? WHERE session_id = ? AND user_id = ?",
  )
    .bind(body.isReady ? 1 : 0, session.id, userId)
    .run();
  if ((result.meta?.changes ?? 0) === 0)
    return c.json({ error: "세션 참여자를 찾을 수 없습니다." }, 404);
  return c.json({ ok: true });
});

app.post("/api/sessions/:token/status", async (c) => {
  const token = c.req.param("token").trim().toUpperCase();
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const status = nullableText(body.status, 40)?.toUpperCase();
  if (!status) return c.json({ error: "세션 상태가 필요합니다." }, 400);
  const userId = nullableText(body.userId, 256);
  const session = await c.env.DB.prepare(
    "SELECT * FROM sessions WHERE share_token = ?",
  )
    .bind(token)
    .first<SessionRow>();
  if (!session) return c.json({ error: "세션을 찾을 수 없습니다." }, 404);
  if (status === "SWIPING_1") {
    if (!userId || userId !== session.host_user_id)
      return c.json({ error: "세션 시작은 호스트만 할 수 있습니다." }, 403);
    const { results: members } = await c.env.DB.prepare(
      "SELECT user_id, preferences_json FROM session_members WHERE session_id = ? ORDER BY joined_at",
    )
      .bind(session.id)
      .all();
    const minParticipants = Number(session.group_size) === 1 ? 1 : 2;
    if (members.length < minParticipants)
      return c.json(
        { error: `투표를 시작하려면 최소 ${minParticipants}명이 필요합니다.` },
        409,
      );
    const { results: catalogue } = await c.env.DB.prepare(
      "SELECT id, category, rating, price_level, dietary_options, latitude, longitude FROM restaurants",
    ).all();
    const categories = json<string[]>(session.filter_categories, []);
    const memberDietary = (members as any[]).flatMap((member) =>
      sessionDietary(member.preferences_json),
    );
    const requiredDietary = [
      ...json<string[]>(session.filter_dietary, []),
      ...memberDietary,
    ];
    // Sessions created before migration 0009 have no saved origin. Preserve
    // their ability to finish, but every newly-created room must have passed
    // origin validation above and is therefore distance-constrained.
    const hasOrigin = Number(session.distance_enabled) !== 0 && isValidCoordinate(
      session.origin_latitude,
      session.origin_longitude,
    );
    const pool = (catalogue as any[]).filter(
      (restaurant) =>
        (categories.length === 0 || categories.includes(restaurant.category)) &&
        categoryMatchesIntent(restaurant.category, session.intent) &&
        (!hasOrigin ||
          isWithinRadius(
            Number(session.origin_latitude),
            Number(session.origin_longitude),
            restaurant.latitude,
            restaurant.longitude,
            Number(session.filter_distance),
          )) &&
        (Number(session.filter_budget) >= 4 ||
          Number(restaurant.price_level ?? 4) <=
            Number(session.filter_budget)) &&
        matchesGroupDiet(
          restaurant.category,
          restaurant.dietary_options,
          requiredDietary,
        ),
    );
    // Never fall back to the full catalogue: that would silently violate a
    // user's explicit meal/cafe/dessert, category, budget, or dietary choice.
    const deckIds = buildSharedSessionDeck(session.id, pool, members as any[]);
    if (!deckIds.length)
      return c.json(
        {
          error: Number(session.distance_enabled) !== 0
            ? `${Number(session.filter_distance) >= 1000 ? `${Number(session.filter_distance) / 1000}km` : `${session.filter_distance}m`} 반경 안에 현재 조건과 맞는 식당이 없어요. 반경 또는 조건을 바꿔 주세요.`
            : "현재 조건과 맞는 식당이 없어요. 조건을 바꿔 주세요.",
          code: "NO_ELIGIBLE_RESTAURANTS",
        },
        409,
      );
    await c.env.DB.prepare(
      "UPDATE sessions SET top_restaurant_ids = ? WHERE id = ?",
    )
      .bind(JSON.stringify(deckIds), session.id)
      .run();
  }
  const deadlineMinutes =
    typeof body.deadlineMinutes === "number" &&
    Number.isFinite(body.deadlineMinutes)
      ? Math.max(1, Math.min(120, Math.floor(body.deadlineMinutes)))
      : null;
  const deadline = deadlineMinutes
    ? Date.now() + deadlineMinutes * 60_000
    : null;
  const result = await c.env.DB.prepare(
    "UPDATE sessions SET status = ?, deadline_at = COALESCE(?, deadline_at) WHERE id = ?",
  )
    .bind(status, deadline, session.id)
    .run();
  if ((result.meta?.changes ?? 0) === 0)
    return c.json({ error: "세션을 찾을 수 없습니다." }, 404);
  return c.json({ ok: true });
});

// Every swipe and progress marker is persisted in D1.  A shared session must
// never rely on browser state: other devices poll this exact source of truth.
app.post("/api/swipes", async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const sessionId = nullableText(body.session_id, 128);
  const userId = nullableText(body.user_id, 256);
  const restaurantId = nullableText(body.restaurant_id, 128);
  const round =
    typeof body.round === "number" && Number.isInteger(body.round)
      ? body.round
      : Number(body.round);
  const action = nullableText(body.swipe_action, 16)?.toUpperCase();
  if (
    !sessionId ||
    !userId ||
    !restaurantId ||
    !Number.isInteger(round) ||
    round < 1 ||
    round > 12 ||
    !action
  ) {
    return c.json({ error: "올바른 스와이프 정보가 필요합니다." }, 400);
  }
  const member = await c.env.DB.prepare(
    "SELECT id FROM session_members WHERE session_id = ? AND user_id = ?",
  )
    .bind(sessionId, userId)
    .first();
  if (!member) return c.json({ error: "세션 참여자를 찾을 수 없습니다." }, 403);
  const isSignal =
    restaurantId === PRELIM_DONE_ID ||
    restaurantId.startsWith(DECK_SIZE_PREFIX);
  const allowedAction =
    action === "LIKE" ||
    action === "DISLIKE" ||
    (isSignal && action === "SYSTEM");
  if (!allowedAction || restaurantId.startsWith(FORCE_PREFIX))
    return c.json({ error: "유효하지 않은 투표입니다." }, 400);
  // A final vote is replaceable before the group is completed, but there is
  // only one effective vote per person. This makes retries idempotent.
  const statements =
    round % 2 === 0 && action === "LIKE"
      ? [
          c.env.DB.prepare(
            "DELETE FROM swipes WHERE session_id = ? AND user_id = ? AND round = ? AND swipe_action = 'LIKE'",
          ).bind(sessionId, userId, round),
          c.env.DB.prepare(
            "INSERT OR IGNORE INTO swipes (id, session_id, user_id, restaurant_id, round, swipe_action, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          ).bind(
            nullableText(body.id, 128) ?? crypto.randomUUID(),
            sessionId,
            userId,
            restaurantId,
            round,
            action,
            Date.now(),
          ),
        ]
      : [
          c.env.DB.prepare(
            "INSERT OR IGNORE INTO swipes (id, session_id, user_id, restaurant_id, round, swipe_action, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          ).bind(
            nullableText(body.id, 128) ?? crypto.randomUUID(),
            sessionId,
            userId,
            restaurantId,
            round,
            action,
            Date.now(),
          ),
        ];
  await c.env.DB.batch(statements);
  return c.json({ ok: true });
});

app.post("/api/sessions/:token/force", async (c) => {
  const token = c.req.param("token").trim().toUpperCase();
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const userId = nullableText(body.userId, 256);
  const round =
    typeof body.round === "number" && Number.isInteger(body.round)
      ? body.round
      : Number(body.round);
  if (!userId || !Number.isInteger(round) || round < 1 || round > 12)
    return c.json({ error: "올바른 진행 정보가 필요합니다." }, 400);
  const session = await c.env.DB.prepare(
    "SELECT id, host_user_id FROM sessions WHERE share_token = ?",
  )
    .bind(token)
    .first<{ id: string; host_user_id: string }>();
  if (!session) return c.json({ error: "세션을 찾을 수 없습니다." }, 404);
  if (session.host_user_id !== userId)
    return c.json({ error: "host_only" }, 403);
  // Force is a durable marker, rather than Worker memory, so a new Pages
  // isolate or a second device observes the same transition.
  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO swipes (id, session_id, user_id, restaurant_id, round, swipe_action, created_at) VALUES (?, ?, ?, ?, ?, 'SYSTEM', ?)",
  )
    .bind(
      `force:${session.id}:${round}`,
      session.id,
      userId,
      `${FORCE_PREFIX}${round}`,
      round,
      Date.now(),
    )
    .run();
  return c.json({ ok: true });
});

app.get("/api/sessions/:token/results", async (c) => {
  const token = c.req.param("token").trim().toUpperCase();
  const session = await c.env.DB.prepare(
    "SELECT * FROM sessions WHERE share_token = ?",
  )
    .bind(token)
    .first<SessionRow>();
  if (!session) return c.json({ error: "세션을 찾을 수 없습니다." }, 404);
  const [memberRows, swipeRows, restaurantRows] = await Promise.all([
    c.env.DB.prepare(
      "SELECT user_id, user_name, emoji FROM session_members WHERE session_id = ? ORDER BY joined_at",
    )
      .bind(session.id)
      .all(),
    c.env.DB.prepare(
      "SELECT session_id, user_id, restaurant_id, round, swipe_action, created_at FROM swipes WHERE session_id = ? ORDER BY created_at",
    )
      .bind(session.id)
      .all(),
    c.env.DB.prepare("SELECT id, category, latitude, longitude FROM restaurants").all(),
  ]);
  const payload = sessionResults(
    session,
    memberRows.results,
    swipeRows.results as SessionSwipe[],
    restaurantRows.results,
  );
  if (payload.phase === "DONE" && session.status !== "COMPLETED") {
    await c.env.DB.prepare(
      "UPDATE sessions SET status = 'COMPLETED' WHERE id = ?",
    )
      .bind(session.id)
      .run();
  }
  return c.json(payload);
});

app.get("/api/journey-today", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  const guestId = cookieValue(c.req.raw, "lm_guest_id");
  const userId = session?.sub ?? (guestId ? `guest:${guestId}` : null);
  if (!userId) return c.json({ stops: [] });
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { results } = await c.env.DB.prepare(
    "SELECT e.restaurant_id, r.name, r.category, e.context_json, e.created_at FROM rec_events e JOIN restaurants r ON r.id = e.restaurant_id WHERE e.user_id = ? AND e.event_type = 'WINNER' AND e.created_at >= ? ORDER BY e.created_at ASC",
  )
    .bind(userId, start.getTime())
    .all();
  return c.json({
    stops: results.map((row: any) => ({
      restaurant_id: row.restaurant_id,
      name: row.name,
      category: row.category,
      intent: json<{ intent?: string }>(row.context_json, {}).intent ?? null,
      at: row.created_at,
      satisfaction: null,
    })),
  });
});

// Lunchie에서 확정한 WINNER는 단순 알림이 아니라 사용자의 식사 여정 기록이다.
// 날짜 묶음은 기기 현지 시간으로 UI가 결정하므로, 서버는 시간순 원본만 반환한다.
app.get("/api/journey", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session) return c.json({ stops: [] });
  const requestedDays = Number(c.req.query("days"));
  const days = Number.isFinite(requestedDays)
    ? Math.max(1, Math.min(90, Math.floor(requestedDays)))
    : 30;
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const { results } = await c.env.DB.prepare(
    "SELECT e.restaurant_id, r.name, r.category, e.context_json, e.created_at FROM rec_events e JOIN restaurants r ON r.id = e.restaurant_id WHERE e.user_id = ? AND e.event_type = 'WINNER' AND e.created_at >= ? ORDER BY e.created_at DESC LIMIT 200",
  )
    .bind(session.sub, since)
    .all();
  return c.json({
    stops: results.map((row: any) => ({
      restaurant_id: row.restaurant_id,
      name: row.name,
      category: row.category,
      intent: json<{ intent?: string }>(row.context_json, {}).intent ?? null,
      at: row.created_at,
      satisfaction: null,
    })),
  });
});

// 수정과 삭제는 UI의 버튼 노출만으로 판단하지 않는다. 매 요청에서 현재 Google
// 세션의 sub와 courses.author_id가 일치해야만 실행된다.
app.patch("/api/feed-post", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session)
    return c.json(
      { error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" },
      401,
    );
  const body = await c.req.json<{
    courseId?: string;
    caption?: string;
    heroImage?: string;
  }>();
  const caption = body.caption?.trim().slice(0, 2_000);
  if (!body.courseId || !caption)
    return c.json({ error: "게시물과 한줄평을 입력해주세요." }, 400);
  const owned = await c.env.DB.prepare(
    "SELECT id FROM courses WHERE id = ? AND author_id = ? AND is_public = 1",
  )
    .bind(body.courseId, session.sub)
    .first();
  if (!owned) return c.json({ error: "수정 권한이 없습니다." }, 403);
  const heroImage =
    typeof body.heroImage === "string" && body.heroImage.startsWith("/photos/")
      ? body.heroImage
      : null;
  await c.env.DB.prepare(
    "UPDATE courses SET description = ?, hero_image = COALESCE(?, hero_image) WHERE id = ?",
  )
    .bind(caption, heroImage, body.courseId)
    .run();
  return c.json({ ok: true });
});

// 이전 버전에서 브라우저에만 남아 있던 작성자 배치를 서버 원본으로 한 번 승계한다.
app.patch("/api/course-media", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session)
    return c.json(
      { error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" },
      401,
    );
  const body = await c.req.json<{
    courseId?: string;
    feedPhotos?: unknown;
    feedDecor?: unknown;
    templateId?: unknown;
  }>();
  if (!body.courseId)
    return c.json({ error: "게시물 정보가 필요합니다." }, 400);
  const owned = await c.env.DB.prepare(
    "SELECT id FROM courses WHERE id = ? AND author_id = ? AND is_public = 1",
  )
    .bind(body.courseId, session.sub)
    .first();
  if (!owned) return c.json({ error: "수정 권한이 없습니다." }, 403);
  const photos = Array.isArray(body.feedPhotos)
    ? body.feedPhotos
        .filter(
          (value): value is string =>
            typeof value === "string" && value.startsWith("/photos/"),
        )
        .slice(0, MAX_MUNCHIE_FEED_PHOTOS)
    : [];
  const decor = Array.isArray(body.feedDecor)
    ? body.feedDecor
        .slice(0, MAX_MUNCHIE_FEED_PHOTOS)
        .flatMap((raw: any, index) => {
          if (
            !raw ||
            typeof raw !== "object" ||
            typeof raw.src !== "string" ||
            !raw.src.startsWith("/photos/")
          )
            return [];
          const number = (
            value: unknown,
            fallback: number,
            min: number,
            max: number,
          ) =>
            typeof value === "number" && Number.isFinite(value)
              ? Math.max(min, Math.min(max, value))
              : fallback;
          return [
            {
              id:
                typeof raw.id === "string"
                  ? raw.id.slice(0, 120)
                  : `photo_${index}`,
              src: raw.src,
              x: number(raw.x, 50, 0, 100),
              y: number(raw.y, 50, 0, 100),
              w: number(raw.w, 40, 5, 100),
              h: number(raw.h, number(raw.w, 40, 5, 100), 5, 100),
              rotate: number(raw.rotate, 0, -180, 180),
            },
          ];
        })
    : [];
  if (!decor.length)
    return c.json({ error: "승계할 서버 사진 배치가 없습니다." }, 400);
  const templateId =
    typeof body.templateId === "string" ? body.templateId.slice(0, 80) : null;
  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE courses SET feed_photos = ?, feed_decor = ?, template_id = COALESCE(?, template_id) WHERE id = ?",
    ).bind(
      JSON.stringify(photos),
      JSON.stringify(decor),
      templateId,
      body.courseId,
    ),
    c.env.DB.prepare("DELETE FROM course_media WHERE course_id = ?").bind(
      body.courseId,
    ),
    ...decor.map((photo, index) =>
      c.env.DB.prepare(
        "INSERT INTO course_media (id, course_id, r2_path, placement_index, x, y, width, height, rotation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ).bind(
        crypto.randomUUID(),
        body.courseId,
        photo.src,
        index,
        photo.x,
        photo.y,
        photo.w,
        photo.h ?? photo.w,
        photo.rotate,
        Date.now(),
      ),
    ),
  ]);
  return c.json({ ok: true });
});

app.delete("/api/feed-post", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session)
    return c.json(
      { error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" },
      401,
    );
  const courseId = new URL(c.req.url).searchParams.get("courseId");
  if (!courseId || courseId.length > 128)
    return c.json({ error: "게시물 정보가 필요합니다." }, 400);
  // A feed is its course's public representation. The product policy is now
  // explicit: deleting a feed permanently deletes the author-owned course and
  // every relational record that exists only because of that course. Ownership
  // is checked before any mutation; clients can never delete another account's
  // content by guessing a course ID.
  const course = await c.env.DB.prepare(
    "SELECT id FROM courses WHERE id = ? AND author_id = ?",
  )
    .bind(courseId, session.sub)
    .first<{ id: string }>();
  if (!course)
    return c.json({ error: "이 게시물을 삭제할 권한이 없습니다." }, 403);
  const { results: comments } = await c.env.DB.prepare(
    "SELECT id FROM feed_comments WHERE course_id = ?",
  )
    .bind(courseId)
    .all<{ id: string }>();
  const statements = [
    c.env.DB.prepare("DELETE FROM course_media WHERE course_id = ?").bind(
      courseId,
    ),
    c.env.DB.prepare("DELETE FROM course_items WHERE course_id = ?").bind(
      courseId,
    ),
    c.env.DB.prepare("DELETE FROM saved_courses WHERE course_id = ?").bind(
      courseId,
    ),
    c.env.DB.prepare("DELETE FROM feed_likes WHERE course_id = ?").bind(
      courseId,
    ),
    c.env.DB.prepare("DELETE FROM feed_comments WHERE course_id = ?").bind(
      courseId,
    ),
    c.env.DB.prepare("DELETE FROM rec_events WHERE course_id = ?").bind(
      courseId,
    ),
    c.env.DB.prepare("DELETE FROM content_reports WHERE target_id = ?").bind(
      courseId,
    ),
    ...comments.map((comment) =>
      c.env.DB.prepare("DELETE FROM content_reports WHERE target_id = ?").bind(
        comment.id,
      ),
    ),
    c.env.DB.prepare("DELETE FROM courses WHERE id = ? AND author_id = ?").bind(
      courseId,
      session.sub,
    ),
  ];
  await c.env.DB.batch(statements);
  return c.json({ ok: true, deletedCourseId: courseId });
});

app.post("/api/feed-comment", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session)
    return c.json(
      { error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" },
      401,
    );
  const body = await c.req.json<{
    courseId?: string;
    text?: string;
    parentId?: string;
  }>();
  const text = body.text?.trim().slice(0, 500);
  if (!text || !body.courseId)
    return c.json({ error: "게시물과 댓글 내용을 입력해주세요." }, 400);
  const courseId = body.courseId;
  const course = await c.env.DB.prepare(
    "SELECT id FROM courses WHERE id = ? AND is_public = 1",
  )
    .bind(courseId)
    .first();
  if (!course) return c.json({ error: "게시물을 찾을 수 없습니다." }, 404);
  if (body.parentId) {
    const parent = await c.env.DB.prepare(
      "SELECT id FROM feed_comments WHERE id = ? AND course_id = ? AND status = 'visible'",
    )
      .bind(body.parentId, courseId)
      .first();
    if (!parent)
      return c.json({ error: "답글을 달 댓글을 찾을 수 없습니다." }, 400);
  }
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO feed_comments (id, course_id, author_id, author_name, parent_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).bind(
      id,
      courseId,
      session.sub,
      session.name?.slice(0, 80) || "Lunchie 사용자",
      body.parentId || null,
      text,
      createdAt,
    ),
    c.env.DB.prepare(
      "UPDATE courses SET comments_count = comments_count + 1 WHERE id = ?",
    ).bind(courseId),
  ]);
  return c.json(
    {
      id,
      authorId: session.sub,
      authorName: session.name || "Lunchie 사용자",
      text,
      parentId: body.parentId,
      createdAt,
    },
    201,
  );
});

app.post("/api/reports", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session)
    return c.json(
      { error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" },
      401,
    );
  const body = await c.req.json<{ targetType?: string; targetId?: string }>();
  if (!body.targetId || !["course", "comment"].includes(body.targetType || ""))
    return c.json({ error: "신고 대상이 올바르지 않습니다." }, 400);
  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO content_reports (id, reporter_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(
      crypto.randomUUID(),
      session.sub,
      body.targetType,
      body.targetId,
      Date.now(),
    )
    .run();
  return c.json({ ok: true });
});

// REST API — /api/feed (Munchie 피드 개인화 랭킹)
app.get("/api/feed", async (c) => {
  try {
    // Older local databases may predate the public-profile columns. Keep the
    // feed readable while still joining author data whenever the canonical
    // schema is present.
    const { results: userColumns } = await c.env.DB.prepare(
      "PRAGMA table_info(users)",
    ).all<{ name: string }>();
    const userColumnNames = new Set(userColumns.map((column) => column.name));
    const hasPublicProfiles =
      userColumnNames.has("username") &&
      userColumnNames.has("profile_image_url");
    const { results: courses } = await c.env.DB.prepare(
      hasPublicProfiles
        ? "SELECT c.*, u.username AS author_name, u.profile_image_url AS author_image FROM courses c LEFT JOIN users u ON u.id = c.author_id WHERE c.is_public = 1 ORDER BY c.created_at DESC LIMIT 20"
        : "SELECT c.* FROM courses c WHERE c.is_public = 1 ORDER BY c.created_at DESC LIMIT 20",
    ).all();

    const feedItems = [];
    for (const course of courses as any[]) {
      // Fetch course items for this course
      const { results: stops } = await c.env.DB.prepare(
        "SELECT ci.*, r.name, r.category, r.photos, r.rating FROM course_items ci JOIN restaurants r ON ci.restaurant_id = r.id WHERE ci.course_id = ? ORDER BY ci.order_index",
      )
        .bind(course.id)
        .all();
      const { results: mediaRows } = await c.env.DB.prepare(
        "SELECT r2_path, placement_index, x, y, width, height, rotation FROM course_media WHERE course_id = ? ORDER BY placement_index",
      )
        .bind(course.id)
        .all();
      // 0005 backfills valid legacy user layouts. The JSON fields remain a
      // compatibility fallback only until every old writer has upgraded.
      const canonicalMedia = (mediaRows as any[]).map((media) => ({
        id: `${course.id}:media:${media.placement_index}`,
        src: media.r2_path,
        x: Number(media.x),
        y: Number(media.y),
        w: Number(media.width),
        h: Number(media.height),
        rotate: Number(media.rotation),
      }));
      const decor = canonicalMedia.length
        ? canonicalMedia
        : json<any[]>(course.feed_decor, []);
      const photos = canonicalMedia.length
        ? Array.from(new Set(canonicalMedia.map((media) => media.src)))
        : json<string[]>(course.feed_photos, []);

      feedItems.push({
        id: `post_${course.id}`,
        courseId: course.id,
        creatorId: course.author_id,
        authorName: hasPublicProfiles ? course.author_name || null : null,
        authorImage: hasPublicProfiles ? course.author_image || null : null,
        title: course.title,
        description: course.description,
        heroImage: course.hero_image,
        photos,
        decor,
        templateId: course.template_id || null,
        tags: json<string[]>(course.tags, []),
        stops: stops.map((s: any) => ({
          placeId: s.restaurant_id,
          restaurant: {
            id: s.restaurant_id,
            name: s.name,
            category: s.category,
            photos: json<string[]>(s.photos, []),
            rating: s.rating,
          },
        })),
        likesCount: course.likes_count ?? 0,
        savesCount: course.saves_count ?? 0,
        commentsCount: course.comments_count ?? 0,
        comments: (
          await c.env.DB.prepare(
            "SELECT id, author_id, author_name, author_emoji, parent_id, body, created_at FROM feed_comments WHERE course_id = ? AND status = 'visible' ORDER BY created_at ASC",
          )
            .bind(course.id)
            .all()
        ).results.map((comment: any) => ({
          id: comment.id,
          authorId: comment.author_id,
          authorName: comment.author_name,
          authorEmoji: comment.author_emoji,
          parentId: comment.parent_id,
          text: comment.body,
          createdAt: comment.created_at,
        })),
        createdAt: course.created_at,
      });
    }

    return c.json(feedItems);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

export const onRequest = handle(app);
