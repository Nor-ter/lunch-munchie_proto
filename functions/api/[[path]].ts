import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";

export interface EnvBindings {
  DB: any;
  PHOTOS_R2: any;
  USER_DO: any;
  SESSION_DO: any;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  AUTH_SESSION_SECRET: string;
}

const app = new Hono<{ Bindings: EnvBindings }>();

type GoogleSession = { sub: string; email?: string; name?: string; picture?: string; exp: number };
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const toBase64Url = (value: Uint8Array | string) => {
  const raw = typeof value === "string" ? value : String.fromCharCode(...value);
  return btoa(raw).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};
const fromBase64Url = (value: string) => decoder.decode(Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/") + "==".slice((value.length + 3) % 4)), (char) => char.charCodeAt(0)));
async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}
async function readSession(request: Request, secret: string): Promise<GoogleSession | null> {
  const token = request.headers.get("cookie")?.match(/(?:^|; )lm_session=([^;]+)/)?.[1];
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || signature !== await sign(payload, secret)) return null;
  try {
    const session = JSON.parse(fromBase64Url(payload)) as GoogleSession;
    return session.exp > Date.now() && session.sub ? session : null;
  } catch { return null; }
}
// OAuth subject는 권한 확인용 내부 키일 뿐 화면에 보여주지 않는다. 최초 로그인 때만
// 공개 사용자 행을 만들며, 이후 사용자가 앱에서 바꾼 이름은 덮어쓰지 않는다.
async function ensurePublicUser(db: any, session: GoogleSession) {
  await db.prepare(
    "INSERT INTO users (id, username, profile_image_url, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING"
  ).bind(session.sub, session.name?.trim().slice(0, 80) || "Lunchie 사용자", session.picture?.slice(0, 2_000) || null, Date.now()).run();
}
const cookie = (name: string, value: string, maxAge?: number) => `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax${maxAge !== undefined ? `; Max-Age=${maxAge}` : ""}`;
const cookieValue = (request: Request, name: string) => request.headers.get("cookie")?.match(new RegExp(`(?:^|; )${name}=([^;]+)`))?.[1] ?? null;

app.get("/api/auth/google/start", (c) => {
  const next = c.req.query("next")?.startsWith("/") ? c.req.query("next")! : "/";
  const state = crypto.randomUUID();
  const callback = new URL("/api/auth/google/callback", c.req.url).toString();
  const google = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  google.search = new URLSearchParams({ client_id: c.env.GOOGLE_CLIENT_ID, redirect_uri: callback, response_type: "code", scope: "openid email profile", state: `${state}.${toBase64Url(next)}`, prompt: "select_account" }).toString();
  c.header("Set-Cookie", cookie("lm_oauth_state", state, 600));
  return c.redirect(google.toString());
});

app.get("/api/auth/google/callback", async (c) => {
  const [state, encodedNext] = (c.req.query("state") ?? "").split(".");
  const expected = c.req.header("cookie")?.match(/(?:^|; )lm_oauth_state=([^;]+)/)?.[1];
  const code = c.req.query("code");
  const next = encodedNext ? fromBase64Url(encodedNext) : "/";
  if (!code || !state || state !== expected || !next.startsWith("/")) return c.redirect("/auth/login?error=oauth_state");
  const callback = new URL("/api/auth/google/callback", c.req.url).toString();
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: c.env.GOOGLE_CLIENT_ID, client_secret: c.env.GOOGLE_CLIENT_SECRET, redirect_uri: callback, grant_type: "authorization_code" }) });
  const token = await tokenResponse.json<{ access_token?: string }>();
  if (!tokenResponse.ok || !token.access_token) return c.redirect("/auth/login?error=oauth_exchange");
  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` } });
  const profile = await profileResponse.json<{ sub?: string; email?: string; name?: string; picture?: string }>();
  if (!profileResponse.ok || !profile.sub) return c.redirect("/auth/login?error=oauth_profile");
  // 로그인 전에 만들어 둔 익명 런치 여정은 이 계정의 최초 기록으로 승계한다.
  const guestId = cookieValue(c.req.raw, "lm_guest_id");
  if (guestId) await c.env.DB.prepare("UPDATE rec_events SET user_id = ? WHERE user_id = ?").bind(profile.sub, `guest:${guestId}`).run();
  await ensurePublicUser(c.env.DB, { ...profile, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const payload = toBase64Url(encoder.encode(JSON.stringify({ ...profile, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })));
  c.header("Set-Cookie", cookie("lm_session", `${payload}.${await sign(payload, c.env.AUTH_SESSION_SECRET)}`, 7 * 24 * 60 * 60));
  return c.redirect(next);
});

app.get("/api/auth/session", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (session) await ensurePublicUser(c.env.DB, session);
  // The session identifies the Google account, while the D1 profile owns
  // user-editable display data such as a custom avatar.  Returning both keeps
  // a refresh from replacing a user-selected photo with Google's old picture.
  const profile = session
    ? await c.env.DB.prepare(
      "SELECT id, username, profile_image_url, bio, location FROM users WHERE id = ?"
    ).bind(session.sub).first<any>()
    : null;
  return c.json({ user: session, profile });
});
app.post("/api/auth/logout", (c) => {
  c.header("Set-Cookie", cookie("lm_session", "", 0));
  c.res.headers.append("Set-Cookie", cookie("lm_guest_id", "", 0));
  return c.json({ ok: true });
});

const json = <T>(value: string | null | undefined, fallback: T): T => {
  try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
};

const EVENT_TYPES = new Set([
  "ONBOARDING_COMPLETED", "SESSION_CREATED", "IMPRESSION", "SWIPE", "WINNER",
  "NAVIGATE", "VISIT", "REORDER", "COURSE_SAVE", "COURSE_EDIT", "FEED_LIKE",
  "FEED_DISLIKE", "COURSE_OPEN", "REROLL", "SURVEY", "ABANDON", "NO_CONSENSUS",
]);
const MAX_MUNCHIE_FEED_PHOTOS = 6;
const nullableText = (value: unknown, max = 200) => typeof value === "string" ? value.trim().slice(0, max) || null : null;
const nullableNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;

// Cloudflare 배포의 정식 행동 수집 경로. 클라이언트가 보낸 user_id는 신뢰하지 않고,
// Google 세션 또는 익명 쿠키로 행위자를 정한다. 따라서 Jimin 같은 화면 기본값이
// 분석 데이터에 섞이거나 다른 사용자를 가장할 수 없다.
app.post("/api/events", async (c) => {
  const payload = await c.req.json<{ events?: unknown }>().catch(() => null);
  const requested = Array.isArray(payload?.events) ? payload!.events : [];
  if (!requested.length || requested.length > 50) return c.json({ error: "events must contain 1-50 items" }, 400);

  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  const existingGuestId = cookieValue(c.req.raw, "lm_guest_id");
  const guestId = existingGuestId ?? crypto.randomUUID();
  const userId = session?.sub ?? `guest:${guestId}`;
  const now = Date.now();
  const statements: any[] = [];

  for (const raw of requested) {
    if (!raw || typeof raw !== "object") return c.json({ error: "invalid event" }, 400);
    const event = raw as Record<string, unknown>;
    const eventType = nullableText(event.event_type, 40);
    if (!eventType || !EVENT_TYPES.has(eventType)) return c.json({ error: "invalid event_type" }, 400);
    const context = event.context && typeof event.context === "object" ? JSON.stringify(event.context) : null;
    if (context && context.length > 4_096) return c.json({ error: "context too large" }, 400);
    const idempotencyKey = nullableText(event.idempotency_key, 160) ?? crypto.randomUUID();
    statements.push(c.env.DB.prepare(
      "INSERT OR IGNORE INTO rec_events (id, event_type, slate_id, slate_type, user_id, course_id, session_id, group_id, restaurant_id, round, position, action, propensity, score, model_version, variant, dwell_ms, context_json, idempotency_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      crypto.randomUUID(), eventType, nullableText(event.slate_id), nullableText(event.slate_type, 30), userId,
      nullableText(event.course_id), nullableText(event.session_id), nullableText(event.group_id), nullableText(event.restaurant_id),
      nullableNumber(event.round), nullableNumber(event.position), nullableText(event.action, 30), nullableNumber(event.propensity),
      nullableNumber(event.score), nullableText(event.model_version, 100), nullableText(event.variant, 100), nullableNumber(event.dwell_ms),
      context, idempotencyKey, now,
    ));
  }
  const result = await c.env.DB.batch(statements);
  if (!session && !existingGuestId) c.header("Set-Cookie", cookie("lm_guest_id", guestId, 30 * 24 * 60 * 60));
  const inserted = result.reduce((sum: number, item: any) => sum + Number(item.meta?.changes ?? 0), 0);
  return c.json({ ok: true, received: requested.length, inserted });
});

// 집계값만 노출하는 운영 지표 API. 사용자/세션/식당 식별자와 원본 이벤트는 반환하지 않는다.
app.get("/api/metrics", async (c) => {
  const requestedDays = Number(c.req.query("days") ?? 30);
  const days = Number.isFinite(requestedDays) ? Math.max(1, Math.min(365, Math.floor(requestedDays))) : 30;
  const start = Date.now() - (days - 1) * 86_400_000;
  const { results } = await c.env.DB.prepare(
    "SELECT date(created_at / 1000, 'unixepoch') AS day, event_type, COUNT(*) AS count FROM rec_events WHERE created_at >= ? GROUP BY day, event_type ORDER BY day ASC"
  ).bind(start).all<{ day: string; event_type: string; count: number }>();
  const byDay = new Map<string, Record<string, number>>();
  const byType: Record<string, number> = {};
  for (const row of results) {
    const current = byDay.get(row.day) ?? {};
    current[row.event_type] = Number(row.count);
    byDay.set(row.day, current);
    byType[row.event_type] = (byType[row.event_type] ?? 0) + Number(row.count);
  }
  const daily = Array.from({ length: days }, (_, index) => {
    const date = new Date(start + index * 86_400_000);
    const day = date.toISOString().slice(0, 10);
    return { day, ...(byDay.get(day) ?? {}) };
  });
  return c.json({ days, total: Object.values(byType).reduce((sum, count) => sum + count, 0), byType, daily, updatedAt: new Date().toISOString() });
});

type FeatureRow = { restaurant_id: string; taste: string | null; price_stats: string | null; evidence: string | null };

// 첫 슬레이트는 "무작위 7개"가 아니라, 드라이브 피처 공간에서 서로 다른
// 질문이 되도록 MMR로 고른다. quality는 사용자 평점이 아니라 사진·메뉴 증거의 약한 사전값이다.
function selectColdStartMmr(
  restaurants: any[], features: FeatureRow[], k: number,
  exposureMap: Record<string, { count?: number; updatedAt?: number }> = {},
): any[] {
  const featureById = new Map(features.map((feature) => [feature.restaurant_id, feature]));
  const vector = (restaurant: any) => {
    const feature = featureById.get(restaurant.id);
    const taste = json<Record<string, number>>(feature?.taste, {});
    const price = json<{ median?: number } | null>(feature?.price_stats, null)?.median;
    return [taste.spicy ?? .4, taste.salty ?? .4, taste.sweet ?? .4, taste.oily ?? .4, taste.light ?? .5,
      typeof price === "number" ? Math.max(0, Math.min(1, (price - 10) / 35)) : ((restaurant.price_level ?? 2) - 1) / 3];
  };
  const quality = (restaurant: any) => {
    const evidence = json<{ photos?: number; menu_items?: number }>(featureById.get(restaurant.id)?.evidence, {});
    return .55 * Math.log1p(evidence.photos ?? 0) + .45 * Math.log1p(evidence.menu_items ?? 0);
  };
  const distance = (a: number[], b: number[]) => Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0) / a.length);
  const remaining = restaurants.map((restaurant) => ({ restaurant, vector: vector(restaurant), quality: quality(restaurant) }));
  // 메뉴가 많은 한 식당의 log 증거값은 다른 피처와 비교 가능한 [0,1] 사전값으로
  // 정규화한다. 그렇지 않으면 DODAM처럼 메뉴가 풍부한 곳이 첫 슬롯을 영구 점유한다.
  const maxQuality = Math.max(1, ...remaining.map(item => item.quality));
  const selected: typeof remaining = [];
  while (remaining.length && selected.length < k) {
    const scores: number[] = [];
    for (let index = 0; index < remaining.length; index++) {
      const candidate = remaining[index];
      const novelty = selected.length
        ? Math.min(...selected.map((chosen) => distance(candidate.vector, chosen.vector)))
        : 1;
      const exposure = exposureMap[candidate.restaurant.id];
      const age = exposure?.updatedAt ? Math.max(0, Date.now() - exposure.updatedAt) : Infinity;
      const decayedExposure = exposure ? (exposure.count ?? 0) * Math.pow(.5, age / 86_400_000) : 0;
      const weakQualityPrior = candidate.quality / maxQuality;
      scores.push(.15 * weakQualityPrior + .85 * novelty - .42 * Math.min(1, decayedExposure));
    }
    // MMR은 후보를 "정렬"하는 것이 아니라 정보성 분포다. 최고점만 계속 고르면
    // DODAM 같은 증거가 강한 한 식당이 첫 카드에 영구 고정된다. softmax+균등 탐색
    // 분포에서 매 단계 비복원 추출해 다양성과 반복 비결정성을 동시에 보장한다.
    const max = Math.max(...scores);
    const temperature = .35;
    const softmax = scores.map(score => Math.exp((score - max) / temperature));
    const total = softmax.reduce((sum, value) => sum + value, 0);
    const epsilon = .40;
    const weights = softmax.map(value => (1 - epsilon) * (value / total) + epsilon / remaining.length);
    let draw = (crypto.getRandomValues(new Uint32Array(1))[0] / 0xffffffff) * weights.reduce((sum, value) => sum + value, 0);
    let picked = weights.length - 1;
    for (let index = 0; index < weights.length; index++) {
      draw -= weights[index];
      if (draw <= 0) { picked = index; break; }
    }
    selected.push(remaining.splice(picked, 1)[0]);
  }
  return selected.map(({ restaurant }) => restaurant);
}

// R2 object keys are stored without a leading slash.  This mirrors the local
// `/photos/*` development route and never falls back to an external stock image.
app.get("/photos/*", async (c) => {
  const key = c.req.path.replace(/^\/photos\//, "");
  if (!key || key.includes("..")) return c.text("Not Found", 404);
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
  if (!session) return c.json({ error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" }, 401);
  const body = await c.req.json<{ dataUrl?: string }>().catch(() => ({}));
  const match = body.dataUrl?.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return c.json({ error: "JPEG, PNG, WebP 이미지만 업로드할 수 있습니다." }, 400);
  const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
  if (!bytes.length || bytes.length > 4 * 1024 * 1024) return c.json({ error: "이미지는 4MB 이하여야 합니다." }, 400);
  const extension = match[1] === "jpeg" ? "jpg" : match[1];
  const key = `uploads/${session.sub}/${crypto.randomUUID()}.${extension}`;
  await c.env.PHOTOS_R2.put(`photos/${key}`, bytes, { httpMetadata: { contentType: `image/${match[1]}` } });
  return c.json({ url: `/photos/${key}` }, 201);
});

// A profile avatar is an explicit reference to an image the current account
// uploaded.  Do not accept arbitrary URLs here: otherwise a user could make a
// different user's private upload appear as their own profile photo.
app.patch("/api/profile", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session) return c.json({ error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" }, 401);
  await ensurePublicUser(c.env.DB, session);
  const body = await c.req.json<{ avatarUrl?: unknown }>().catch(() => ({}));
  if (!("avatarUrl" in body)) return c.json({ error: "변경할 프로필 정보가 없습니다." }, 400);
  const avatarUrl = body.avatarUrl;
  if (avatarUrl !== null && (typeof avatarUrl !== "string" || !avatarUrl.startsWith(`/photos/uploads/${session.sub}/`) || avatarUrl.length > 2_000)) {
    return c.json({ error: "내가 업로드한 프로필 사진만 사용할 수 있습니다." }, 400);
  }
  await c.env.DB.prepare("UPDATE users SET profile_image_url = ? WHERE id = ?")
    .bind(avatarUrl, session.sub).run();
  const profile = await c.env.DB.prepare(
    "SELECT id, username, profile_image_url, bio, location FROM users WHERE id = ?"
  ).bind(session.sub).first<any>();
  return c.json({ profile });
});

// 헬스 체크
app.get("/api/health", async (c) => {
  try {
    const { results } = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM restaurants").all();
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
// Do not fall back to the retired Supabase profile table.
app.get("/api/users/:id", async (c) => {
  const id = c.req.param("id");
  if (!id || id.length > 256) return c.json({ error: "사용자 정보가 올바르지 않습니다." }, 400);
  const user = await c.env.DB.prepare(
    "SELECT id, username, profile_image_url, bio, location, created_at FROM users WHERE id = ?"
  ).bind(id).first<any>();
  if (!user) return c.json({ error: "사용자를 찾을 수 없습니다." }, 404);
  const count = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM courses WHERE author_id = ? AND is_public = 1"
  ).bind(id).first<{ count: number }>();
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

// REST API — /api/recommend (D1 Query Binding)
app.post("/api/recommend", async (c) => {
  try {
    const body = await c.req.json();
    const userId = typeof body.user_id === "string" && body.user_id.trim()
      ? body.user_id.trim()
      : "anonymous";
    const k = Math.min(20, Math.max(1, Number(body.k) || 7));
    const ctx = body.context || {};
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
    const diets = Array.isArray(ctx.dietary) ? ctx.dietary : Array.isArray(ctx.diet) ? ctx.diet : [];
    if (diets.length > 0) {
      // D1 doesn't have JSON_CONTAINS natively, we use LIKE for simple arrays
      for (const diet of diets) {
        query += ` AND dietary_options LIKE ?`;
        params.push(`%${diet}%`);
      }
    }

    // 2. Budget (Price Range)
    if (typeof ctx.budget === 'number') {
      if (ctx.budget === 1) { query += ` AND price_level = 1`; }
      else if (ctx.budget === 2) { query += ` AND price_level <= 2`; }
      else if (ctx.budget === 3) { query += ` AND price_level <= 3`; }
    }
    
    // 3. Category / Intent mapping (Simplification)
    if (ctx.intent) {
      if (ctx.intent === "cafe" || ctx.intent === "dessert") {
        query += ` AND category IN ('카페', '베이커리', '디저트', 'Cafe', 'Bakery', 'Dessert')`;
      } else if (ctx.intent === "meal") {
        query += ` AND category NOT IN ('카페', '베이커리', '디저트', 'Cafe', 'Bakery', 'Dessert')`;
      }
    }
    
    // 4. Taste (Categories) mapping
    if (ctx.categories && ctx.categories.length > 0) {
      query += ` AND category IN (${ctx.categories.map(() => '?').join(',')})`;
      params.push(...ctx.categories);
    }

    // Quality fields are a deterministic tie-breaker only. The final slate is
    // drawn without replacement below, so a catalogue with zero ratings does
    // not permanently pin users to alphabetically first restaurants.
    query += ` ORDER BY rating DESC, review_count DESC, name ASC LIMIT 200`;

    const { results } = await c.env.DB.prepare(query).bind(...params).all();

    const shuffle = <T,>(items: T[]) => {
      const shuffled = [...items];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const random = new Uint32Array(1);
        crypto.getRandomValues(random);
        const j = random[0] % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };
    let tasteN = 0;
    let exposureMap: Record<string, { count?: number; updatedAt?: number }> = {};
    if (userId !== "anonymous") {
      try {
        const id = c.env.USER_DO.idFromName(userId);
        const state = await c.env.USER_DO.get(id).fetch("https://user-state/state");
        const stateData = await state.json<{ tasteN?: number; exposureMap?: Record<string, { count?: number; updatedAt?: number }> }>();
        tasteN = Number(stateData.tasteN ?? 0);
        exposureMap = stateData.exposureMap ?? {};
      } catch { /* DO unavailable: preserve a safe cold-start slate */ }
    }
    const ids = (results as any[]).map((restaurant) => restaurant.id);
    const { results: featureRows } = ids.length
      ? await c.env.DB.prepare(`SELECT restaurant_id, taste, price_stats, evidence FROM restaurant_features WHERE restaurant_id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all<FeatureRow>()
      : { results: [] as FeatureRow[] };
    let finalResults = tasteN === 0
      ? selectColdStartMmr(results as any[], featureRows, k, exposureMap)
      : shuffle(results as any[]).slice(0, k);
    if (results.length < Math.min(k, 5)) {
       const fallback = await c.env.DB.prepare(`SELECT * FROM restaurants LIMIT 200`).all();
       const fallbackItems = shuffle(fallback.results as any[]);
       finalResults = fallbackItems.slice(0, k);
    }

    const slateId = crypto.randomUUID();
    // 노출은 추천 결과를 받은 시점에 User DO에 기록한다. 이 값은 다음 단계에서
    // 하드 제외가 아닌 시간 감쇠 페널티·재발견 보너스 계산에만 사용된다.
    if (userId !== "anonymous") {
      try {
        const stub = c.env.USER_DO.get(c.env.USER_DO.idFromName(userId));
        await Promise.all(finalResults.map((restaurant: any) => stub.fetch("https://user-state/recordExposure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restaurantId: restaurant.id }),
        })));
      } catch { /* recommendation serving must not fail if state storage is unavailable */ }
    }
    return c.json({
      slate: finalResults.map((r: any, rank: number) => ({
        ...r,
        photos: json<string[]>(r.photos, []),
        menu_items: json(r.menus, []),
        tags: json<string[]>(r.tags, []),
        rank,
        score: 0.5,
        propensity: Number((Math.min(k, results.length || finalResults.length) / Math.max(1, results.length || finalResults.length)).toFixed(6)),
      })),
      user_id: userId,
      k,
      slate_id: slateId,
      model_version: tasteN === 0 ? "stage0-mmr-v1" : "learning-loop-pending-v1",
      engine: "cloudflare-hono-d1",
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

// REST API — /api/restaurants (전체 식당 카탈로그)
app.get("/api/restaurants", async (c) => {
  // 카탈로그를 50개에서 자르면 런치의 후보 풀도 영구히 그 절반에 갇힌다.
  // 현재 규모와 다음 데이터 보강분을 함께 담을 수 있게 상한만 둔다.
  const requested = Number(c.req.query("limit") ?? 200);
  const limit = Number.isFinite(requested) ? Math.max(1, Math.min(Math.floor(requested), 200)) : 200;
  const { results } = await c.env.DB.prepare("SELECT * FROM restaurants ORDER BY name ASC LIMIT ?").bind(limit).all();
  return c.json(results.map((r: any) => ({
      ...r,
      photos: json<string[]>(r.photos, []),
      menu_items: json(r.menus, []),
      tags: json<string[]>(r.tags, [])
  })));
});

// REST API — /api/courses (Munchie 코스 목록)
app.get("/api/courses", async (c) => {
  try {
    const { results: courses } = await c.env.DB.prepare("SELECT * FROM courses WHERE is_public = 1 ORDER BY created_at DESC LIMIT 40").all();
    
    const populatedCourses = [];
    for (const course of courses as any[]) {
      const { results: stops } = await c.env.DB.prepare(
        "SELECT ci.*, r.name, r.category, r.photos, r.rating, r.latitude, r.longitude FROM course_items ci JOIN restaurants r ON ci.restaurant_id = r.id WHERE ci.course_id = ? ORDER BY ci.order_index"
      ).bind(course.id).all();
      
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
        createdAt: new Date(Number(course.created_at)).toISOString(),
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
            longitude: s.longitude
          }
        }))
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
  if (!session) return c.json({ error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" }, 401);

  try {
    const body = await c.req.json<Record<string, unknown>>();
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 2_000) : "";
    const stops = Array.isArray(body.stops) ? body.stops : [];
    if (!title || stops.length < 1 || stops.length > 3) {
      return c.json({ error: "제목과 1~3개의 장소가 필요합니다." }, 400);
    }
    const restaurantIds = stops.map((stop: any) => typeof stop?.placeId === "string" ? stop.placeId : "");
    if (restaurantIds.some((id) => !id)) return c.json({ error: "장소 정보가 올바르지 않습니다." }, 400);
    const placeholders = restaurantIds.map(() => "?").join(",");
    const known = await c.env.DB.prepare(`SELECT id, photos FROM restaurants WHERE id IN (${placeholders})`).bind(...restaurantIds).all();
    if ((known.results?.length ?? 0) !== restaurantIds.length) return c.json({ error: "존재하지 않는 장소가 포함되어 있습니다." }, 400);

    const strings = (value: unknown, limit: number) => Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim().slice(0, 40)).filter(Boolean).slice(0, limit)
      : [];
    // Feed artwork must be an author-uploaded R2 path. Restaurant imagery is
    // recommendation metadata and must never stand in for a user's post.
    const requestedHero = typeof body.heroImage === "string" && body.heroImage.startsWith("/photos/") ? body.heroImage : null;
    // URL은 태그와 달리 잘라내면 안 된다. 과거 generic `strings()`를 써서
    // 40자로 절단된 R2 경로가 다른 사람의 카드에서 깨졌었다.
    const feedPhotos = Array.isArray(body.feedPhotos)
      ? Array.from(new Set(body.feedPhotos.filter((photo): photo is string => typeof photo === "string" && photo.startsWith("/photos/") && photo.length <= 512))).slice(0, MAX_MUNCHIE_FEED_PHOTOS)
      : [];
    const feedDecor = Array.isArray(body.feedDecor) ? body.feedDecor.slice(0, MAX_MUNCHIE_FEED_PHOTOS).flatMap((raw: any, index) => {
      if (!raw || typeof raw !== "object" || typeof raw.src !== "string" || !raw.src.startsWith("/photos/")) return [];
      const number = (value: unknown, fallback: number, min: number, max: number) => typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
      return [{ id: typeof raw.id === "string" ? raw.id.slice(0, 120) : `photo_${index}`, src: raw.src, x: number(raw.x, 50, 0, 100), y: number(raw.y, 50, 0, 100), w: number(raw.w, 40, 5, 100), h: number(raw.h, number(raw.w, 40, 5, 100), 5, 100), rotate: number(raw.rotate, 0, -180, 180) }];
    }) : [];
    if (!feedPhotos.length || !feedDecor.length) {
      return c.json({ error: "포스팅하려면 배치한 사진을 1장 이상 저장해야 합니다." }, 400);
    }
    const heroImage = requestedHero ?? feedPhotos[0];
    const templateId = typeof body.templateId === "string" ? body.templateId.slice(0, 80) : null;
    const id = crypto.randomUUID();
    const createdAt = Date.now();
    const tags = strings(body.tags, 5);
    const hashtags = strings(body.hashtags, 10);
    const region = typeof body.region === "string" ? body.region.trim().slice(0, 120) : "";
    const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata as Record<string, unknown> : {};
    const distance = typeof metadata.distance === "number" && Number.isFinite(metadata.distance) ? metadata.distance : null;
    const duration = typeof metadata.duration === "number" && Number.isFinite(metadata.duration) ? metadata.duration : null;
    const statements = [
      c.env.DB.prepare("INSERT INTO courses (id, author_id, title, description, hero_image, category, region, tags, hashtags, total_distance, total_duration, likes_count, saves_count, comments_count, is_public, feed_photos, feed_decor, template_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 1, ?, ?, ?, ?)")
        .bind(id, session.sub, title, description, heroImage, "course", region, JSON.stringify(tags), JSON.stringify(hashtags), distance, duration, JSON.stringify(feedPhotos), JSON.stringify(feedDecor), templateId, createdAt),
      ...feedDecor.map((photo: any, index: number) => c.env.DB.prepare("INSERT INTO course_media (id, course_id, r2_path, placement_index, x, y, width, height, rotation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(crypto.randomUUID(), id, photo.src, index, photo.x, photo.y, photo.w, photo.h ?? photo.w, photo.rotate, createdAt)),
      ...restaurantIds.map((restaurantId, index) => c.env.DB.prepare("INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)")
        .bind(crypto.randomUUID(), id, restaurantId, index + 1, "", "", createdAt)),
    ];
    await c.env.DB.batch(statements);
    return c.json({ id, authorId: session.sub, createdAt }, 201);
  } catch (err: any) {
    return c.json({ error: err.message ?? "코스를 저장하지 못했습니다." }, 400);
  }
});

app.post("/api/feed-like", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session) return c.json({ error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" }, 401);
  const { courseId } = await c.req.json<{ courseId?: string }>();
  if (!courseId) return c.json({ error: "게시물 정보가 필요합니다." }, 400);
  const exists = await c.env.DB.prepare("SELECT id FROM courses WHERE id = ? AND is_public = 1").bind(courseId).first();
  if (!exists) return c.json({ error: "게시물을 찾을 수 없습니다." }, 404);
  const prior = await c.env.DB.prepare("SELECT 1 FROM feed_likes WHERE user_id = ? AND course_id = ?").bind(session.sub, courseId).first();
  if (prior) {
    await c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM feed_likes WHERE user_id = ? AND course_id = ?").bind(session.sub, courseId),
      c.env.DB.prepare("UPDATE courses SET likes_count = MAX(0, likes_count - 1) WHERE id = ?").bind(courseId),
    ]);
    return c.json({ liked: false });
  }
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO feed_likes (user_id, course_id, created_at) VALUES (?, ?, ?)").bind(session.sub, courseId, Date.now()),
    c.env.DB.prepare("UPDATE courses SET likes_count = likes_count + 1 WHERE id = ?").bind(courseId),
  ]);
  return c.json({ liked: true });
});

// Lunch 결과는 로그인 사용자에게는 서버 여정으로 영속한다. 익명 모드는 클라이언트의
// 당일 여정으로만 보이며 계정 데이터와 섞이지 않는다.
app.post("/api/journey-winner", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  const body = await c.req.json<{ restaurantId?: string; sessionId?: string; intent?: string; idempotencyKey?: string }>();
  if (!body.restaurantId || !body.idempotencyKey || body.idempotencyKey.length > 160) return c.json({ error: "식당과 멱등성 키가 필요합니다." }, 400);
  const restaurant = await c.env.DB.prepare("SELECT id FROM restaurants WHERE id = ?").bind(body.restaurantId).first();
  if (!restaurant) return c.json({ error: "식당을 찾을 수 없습니다." }, 404);
  const guestId = cookieValue(c.req.raw, "lm_guest_id") ?? crypto.randomUUID();
  const userId = session?.sub ?? `guest:${guestId}`;
  const result = await c.env.DB.prepare("INSERT OR IGNORE INTO rec_events (id, event_type, user_id, session_id, restaurant_id, context_json, idempotency_key, created_at) VALUES (?, 'WINNER', ?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), userId, body.sessionId || null, body.restaurantId, JSON.stringify({ intent: body.intent || null }), body.idempotencyKey, Date.now()).run();
  if (!session && !cookieValue(c.req.raw, "lm_guest_id")) c.header("Set-Cookie", cookie("lm_guest_id", guestId, 30 * 24 * 60 * 60));
  return c.json({ ok: true, duplicate: (result.meta?.changes ?? 0) === 0 });
});

app.get("/api/journey-today", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  const guestId = cookieValue(c.req.raw, "lm_guest_id");
  const userId = session?.sub ?? (guestId ? `guest:${guestId}` : null);
  if (!userId) return c.json({ stops: [] });
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const { results } = await c.env.DB.prepare("SELECT e.restaurant_id, r.name, r.category, e.context_json, e.created_at FROM rec_events e JOIN restaurants r ON r.id = e.restaurant_id WHERE e.user_id = ? AND e.event_type = 'WINNER' AND e.created_at >= ? ORDER BY e.created_at ASC")
    .bind(userId, start.getTime()).all();
  return c.json({ stops: results.map((row: any) => ({ restaurant_id: row.restaurant_id, name: row.name, category: row.category, intent: json<{ intent?: string }>(row.context_json, {}).intent ?? null, at: row.created_at, satisfaction: null })) });
});

// 수정과 삭제는 UI의 버튼 노출만으로 판단하지 않는다. 매 요청에서 현재 Google
// 세션의 sub와 courses.author_id가 일치해야만 실행된다.
app.patch("/api/feed-post", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session) return c.json({ error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" }, 401);
  const body = await c.req.json<{ courseId?: string; caption?: string; heroImage?: string }>();
  const caption = body.caption?.trim().slice(0, 2_000);
  if (!body.courseId || !caption) return c.json({ error: "게시물과 한줄평을 입력해주세요." }, 400);
  const owned = await c.env.DB.prepare("SELECT id FROM courses WHERE id = ? AND author_id = ? AND is_public = 1").bind(body.courseId, session.sub).first();
  if (!owned) return c.json({ error: "수정 권한이 없습니다." }, 403);
  const heroImage = typeof body.heroImage === "string" && body.heroImage.startsWith("/photos/") ? body.heroImage : null;
  await c.env.DB.prepare("UPDATE courses SET description = ?, hero_image = COALESCE(?, hero_image) WHERE id = ?").bind(caption, heroImage, body.courseId).run();
  return c.json({ ok: true });
});

// 이전 버전에서 브라우저에만 남아 있던 작성자 배치를 서버 원본으로 한 번 승계한다.
app.patch("/api/course-media", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session) return c.json({ error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" }, 401);
  const body = await c.req.json<{ courseId?: string; feedPhotos?: unknown; feedDecor?: unknown; templateId?: unknown }>();
  if (!body.courseId) return c.json({ error: "게시물 정보가 필요합니다." }, 400);
  const owned = await c.env.DB.prepare("SELECT id FROM courses WHERE id = ? AND author_id = ? AND is_public = 1").bind(body.courseId, session.sub).first();
  if (!owned) return c.json({ error: "수정 권한이 없습니다." }, 403);
  const photos = Array.isArray(body.feedPhotos) ? body.feedPhotos.filter((value): value is string => typeof value === "string" && value.startsWith("/photos/")).slice(0, MAX_MUNCHIE_FEED_PHOTOS) : [];
  const decor = Array.isArray(body.feedDecor) ? body.feedDecor.slice(0, MAX_MUNCHIE_FEED_PHOTOS).flatMap((raw: any, index) => {
    if (!raw || typeof raw !== "object" || typeof raw.src !== "string" || !raw.src.startsWith("/photos/")) return [];
    const number = (value: unknown, fallback: number, min: number, max: number) => typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
    return [{ id: typeof raw.id === "string" ? raw.id.slice(0, 120) : `photo_${index}`, src: raw.src, x: number(raw.x, 50, 0, 100), y: number(raw.y, 50, 0, 100), w: number(raw.w, 40, 5, 100), h: number(raw.h, number(raw.w, 40, 5, 100), 5, 100), rotate: number(raw.rotate, 0, -180, 180) }];
  }) : [];
  if (!decor.length) return c.json({ error: "승계할 서버 사진 배치가 없습니다." }, 400);
  const templateId = typeof body.templateId === "string" ? body.templateId.slice(0, 80) : null;
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE courses SET feed_photos = ?, feed_decor = ?, template_id = COALESCE(?, template_id) WHERE id = ?").bind(JSON.stringify(photos), JSON.stringify(decor), templateId, body.courseId),
    c.env.DB.prepare("DELETE FROM course_media WHERE course_id = ?").bind(body.courseId),
    ...decor.map((photo, index) => c.env.DB.prepare("INSERT INTO course_media (id, course_id, r2_path, placement_index, x, y, width, height, rotation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), body.courseId, photo.src, index, photo.x, photo.y, photo.w, photo.h ?? photo.w, photo.rotate, Date.now())),
  ]);
  return c.json({ ok: true });
});

app.delete("/api/feed-post", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session) return c.json({ error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" }, 401);
  const courseId = new URL(c.req.url).searchParams.get("courseId");
  if (!courseId || courseId.length > 128) return c.json({ error: "게시물 정보가 필요합니다." }, 400);
  // Check ownership before changing visibility.  Some D1 deployments do not
  // consistently expose `meta.changes`, which previously made a successful
  // soft-delete look like a permission failure in the app.
  const course = await c.env.DB.prepare(
    "SELECT id, is_public FROM courses WHERE id = ? AND author_id = ?"
  ).bind(courseId, session.sub).first<{ id: string; is_public: number }>();
  if (!course) return c.json({ error: "이 게시물을 삭제할 권한이 없습니다." }, 403);
  if (!Number(course.is_public)) return c.json({ ok: true, alreadyDeleted: true });
  await c.env.DB.prepare("UPDATE courses SET is_public = 0 WHERE id = ? AND author_id = ?")
    .bind(courseId, session.sub).run();
  return c.json({ ok: true });
});

app.post("/api/feed-comment", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session) return c.json({ error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" }, 401);
  const body = await c.req.json<{ courseId?: string; text?: string; parentId?: string }>();
  const text = body.text?.trim().slice(0, 500);
  if (!text || !body.courseId) return c.json({ error: "게시물과 댓글 내용을 입력해주세요." }, 400);
  const courseId = body.courseId;
  const course = await c.env.DB.prepare("SELECT id FROM courses WHERE id = ? AND is_public = 1").bind(courseId).first();
  if (!course) return c.json({ error: "게시물을 찾을 수 없습니다." }, 404);
  if (body.parentId) {
    const parent = await c.env.DB.prepare("SELECT id FROM feed_comments WHERE id = ? AND course_id = ? AND status = 'visible'").bind(body.parentId, courseId).first();
    if (!parent) return c.json({ error: "답글을 달 댓글을 찾을 수 없습니다." }, 400);
  }
  const id = crypto.randomUUID(); const createdAt = Date.now();
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO feed_comments (id, course_id, author_id, author_name, parent_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(id, courseId, session.sub, session.name?.slice(0, 80) || "Lunchie 사용자", body.parentId || null, text, createdAt),
    c.env.DB.prepare("UPDATE courses SET comments_count = comments_count + 1 WHERE id = ?").bind(courseId),
  ]);
  return c.json({ id, authorId: session.sub, authorName: session.name || "Lunchie 사용자", text, parentId: body.parentId, createdAt }, 201);
});

app.post("/api/reports", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session) return c.json({ error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" }, 401);
  const body = await c.req.json<{ targetType?: string; targetId?: string }>();
  if (!body.targetId || !["course", "comment"].includes(body.targetType || "")) return c.json({ error: "신고 대상이 올바르지 않습니다." }, 400);
  await c.env.DB.prepare("INSERT OR IGNORE INTO content_reports (id, reporter_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), session.sub, body.targetType, body.targetId, Date.now()).run();
  return c.json({ ok: true });
});

// REST API — /api/feed (Munchie 피드 개인화 랭킹)
app.get("/api/feed", async (c) => {
  try {
    // 1. Fetch courses
    const { results: courses } = await c.env.DB.prepare(
      "SELECT c.*, u.username AS author_name, u.profile_image_url AS author_image FROM courses c LEFT JOIN users u ON u.id = c.author_id WHERE c.is_public = 1 ORDER BY c.created_at DESC LIMIT 20"
    ).all();
    
    const feedItems = [];
    for (const course of courses as any[]) {
      // Fetch course items for this course
      const { results: stops } = await c.env.DB.prepare(
        "SELECT ci.*, r.name, r.category, r.photos, r.rating FROM course_items ci JOIN restaurants r ON ci.restaurant_id = r.id WHERE ci.course_id = ? ORDER BY ci.order_index"
      ).bind(course.id).all();
      const { results: mediaRows } = await c.env.DB.prepare(
        "SELECT r2_path, placement_index, x, y, width, height, rotation FROM course_media WHERE course_id = ? ORDER BY placement_index"
      ).bind(course.id).all();
      // 0005 backfills valid legacy user layouts. The JSON fields remain a
      // compatibility fallback only until every old writer has upgraded.
      const canonicalMedia = (mediaRows as any[]).map((media) => ({
        id: `${course.id}:media:${media.placement_index}`,
        src: media.r2_path,
        x: Number(media.x), y: Number(media.y),
        w: Number(media.width), h: Number(media.height), rotate: Number(media.rotation),
      }));
      const decor = canonicalMedia.length ? canonicalMedia : json<any[]>(course.feed_decor, []);
      const photos = canonicalMedia.length
        ? Array.from(new Set(canonicalMedia.map((media) => media.src)))
        : json<string[]>(course.feed_photos, []);
      
      feedItems.push({
        id: `post_${course.id}`,
        courseId: course.id,
        creatorId: course.author_id,
        authorName: course.author_name || null,
        authorImage: course.author_image || null,
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
            rating: s.rating
          }
        })),
        likesCount: course.likes_count ?? 0,
        savesCount: course.saves_count ?? 0,
        commentsCount: course.comments_count ?? 0,
        comments: (await c.env.DB.prepare("SELECT id, author_id, author_name, author_emoji, parent_id, body, created_at FROM feed_comments WHERE course_id = ? AND status = 'visible' ORDER BY created_at ASC").bind(course.id).all()).results.map((comment: any) => ({
          id: comment.id, authorId: comment.author_id, authorName: comment.author_name, authorEmoji: comment.author_emoji,
          parentId: comment.parent_id, text: comment.body, createdAt: comment.created_at,
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
