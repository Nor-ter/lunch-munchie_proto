import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import { decideGroup } from "../../server/engine/group";
import {
  isHardRestriction,
  isIngredientAvoidance,
  normalizeDiet,
  restaurantSatisfiesDietRestriction,
  type DietRestriction,
} from "../../shared/const";
import { categoryMatchesIntent, type Intent } from "../../shared/intent";
import { intentForMenuSection, menuSectionIntents } from "../../shared/menuTaxonomy";
import { isValidCoordinate, isWithinRadius } from "../../shared/geo";
import { normalizeQuickMatchPartySize } from "../../shared/quickMatchParty";
import { normalizeRestaurantPayload } from "../../shared/restaurantContract";
import { normalizeLunchieSessionAvatar } from "../../shared/lunchieAvatar";
import { buildSlate, scoreCandidateBreakdown } from "../../server/engine/scorer";
import type { Candidate, RecContext, SlateType } from "../../shared/engine";
import { isAdminEmail } from "./adminAccess";
import { assessLearningReadiness, coverage } from "./algorithmInsights";
import {
  PHOTO_KINDS,
  PHOTO_REVIEW_STATUSES,
  escapePhotoSearchTerm,
  parsePhotoReviewUpdate,
  type PhotoKind,
  type PhotoReviewRecord,
  type PhotoReviewStatus,
} from "./photoReview";
import {
  autocompleteGooglePlaces,
  autocompleteGoogleLocations,
  getGoogleDirections,
  getGoogleLocationDetails,
  getGooglePlaceDetails,
  googlePlacePhotosSynced,
  googlePlacesErrorResponse,
  storedRestaurantPhotoUrls,
} from "./googlePlaces";
import { feedItemMatchesLocation, parseFeedLocationFilter } from "./feedLocation";

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
  GOOGLE_MAPS_SERVER_API_KEY?: string;
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

function photoPathToKey(path: unknown) {
  return typeof path === "string" && path.startsWith("/photos/")
    ? path.slice("/photos/".length)
    : null;
}
async function photoExists(env: Pick<EnvBindings, "MEDIA_ORIGIN" | "PHOTOS_R2">, path: unknown) {
  const key = photoPathToKey(path);
  if (!key || key.includes("..")) return false;
  const remoteObject = await fetchConfiguredMedia(env.MEDIA_ORIGIN, key);
  if (remoteObject) {
    await remoteObject.body?.cancel().catch(() => undefined);
    return true;
  }
  // R2 `head` verifies the object without reading the photo body. Keep the
  // legacy `get` fallback for the small test doubles used by older suites.
  const object = typeof env.PHOTOS_R2.head === "function"
    ? await env.PHOTOS_R2.head(`photos/${key}`)
    : await env.PHOTOS_R2.get(`photos/${key}`);
  return Boolean(object);
}
async function filterExistingPhotos(
  env: Pick<EnvBindings, "MEDIA_ORIGIN" | "PHOTOS_R2">,
  paths: string[],
) {
  const checks = await Promise.all(paths.map(async (path) => [path, await photoExists(env, path)] as const));
  return checks.filter(([, exists]) => exists).map(([path]) => path);
}

type PendingR2MediaDeletion = {
  r2_path: string;
  owner_id: string;
};

async function r2MediaReferenceCount(db: EnvBindings["DB"], r2Path: string) {
  const row = await db.prepare(
    `SELECT
      (SELECT COUNT(*) FROM course_media WHERE r2_path = ?) +
      (SELECT COUNT(*) FROM course_photo_attributions WHERE r2_path = ?) +
      (SELECT COUNT(*) FROM users WHERE profile_image_url = ?) +
      (SELECT COUNT(*) FROM courses WHERE hero_image = ? OR instr(COALESCE(feed_photos, ''), ?) > 0 OR instr(COALESCE(feed_decor, ''), ?) > 0)
      AS count`,
  ).bind(r2Path, r2Path, r2Path, r2Path, r2Path, r2Path).first<{ count: number }>();
  return Number(row?.count ?? 0);
}

async function drainR2MediaDeletionQueue(
  env: Pick<EnvBindings, "DB" | "PHOTOS_R2">,
  preferredPaths: string[] = [],
) {
  let queue: PendingR2MediaDeletion[];
  if (preferredPaths.length) {
    const uniquePaths = Array.from(new Set(preferredPaths));
    queue = [];
    // D1 caps the number of bound parameters per statement. Chunk the exact
    // paths instead of applying the background LIMIT 25: a large post must not
    // report successful deletion while some of its own objects were skipped.
    for (let offset = 0; offset < uniquePaths.length; offset += 50) {
      const chunk = uniquePaths.slice(offset, offset + 50);
      const placeholders = chunk.map(() => "?").join(",");
      const { results } = await env.DB.prepare(
        `SELECT r2_path, owner_id FROM r2_media_deletions WHERE r2_path IN (${placeholders}) ORDER BY created_at`,
      ).bind(...chunk).all<PendingR2MediaDeletion>();
      queue.push(...results);
    }
  } else {
    const { results } = await env.DB.prepare(
      "SELECT r2_path, owner_id FROM r2_media_deletions ORDER BY created_at LIMIT 25",
    ).all<PendingR2MediaDeletion>();
    queue = results;
  }

  let pending = 0;
  for (const item of queue) {
    const authorPrefix = `/photos/uploads/${item.owner_id}/`;
    const key = photoPathToKey(item.r2_path);
    if (!key || !item.r2_path.startsWith(authorPrefix)) {
      await env.DB.prepare("DELETE FROM r2_media_deletions WHERE r2_path = ?")
        .bind(item.r2_path)
        .run();
      continue;
    }
    if (await r2MediaReferenceCount(env.DB, item.r2_path)) {
      // Keep the tombstone while another post/profile still references this
      // asset. A later publication/deletion drain re-checks it, so the final
      // reference removal can still clean the R2 object.
      pending += 1;
      continue;
    }
    if (typeof env.PHOTOS_R2?.delete !== "function") {
      pending += 1;
      continue;
    }
    try {
      await env.PHOTOS_R2.delete(`photos/${key}`);
      await env.DB.prepare("DELETE FROM r2_media_deletions WHERE r2_path = ?")
        .bind(item.r2_path)
        .run();
    } catch (error) {
      pending += 1;
      await env.DB.prepare(
        "UPDATE r2_media_deletions SET attempts = attempts + 1, last_error = ? WHERE r2_path = ?",
      ).bind(error instanceof Error ? error.message.slice(0, 500) : "R2 delete failed", item.r2_path).run();
    }
  }
  // Exact-path cleanup belongs to the current mutation. An unrelated backlog
  // must not make this request report a false pending count.
  if (preferredPaths.length) return pending;
  const remaining = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM r2_media_deletions",
  ).first<{ count: number }>();
  return Number(remaining?.count ?? pending);
}
export const app = new Hono<{ Bindings: EnvBindings }>();

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
const fromBase64Url = (value: string) => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return decoder.decode(
    Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)),
  );
};
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

export function normalizePublicHandle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/^@/, "").toLowerCase();
  return /^[a-z0-9_]{3,20}$/.test(normalized) ? normalized : null;
}

export function escapeUserSearchTerm(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
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
    if (columns.has("handle")) {
      await db
        .prepare(
          "UPDATE users SET handle = 'user_' || printf('%08x', rowid) WHERE id = ? AND handle IS NULL",
        )
        .bind(session.sub)
        .run();
    }
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

const hasGoogleOAuthConfig = (
  env: Partial<Pick<EnvBindings, "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET" | "AUTH_SESSION_SECRET">>,
): env is EnvBindings & {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  AUTH_SESSION_SECRET: string;
} =>
  Boolean(
    env.GOOGLE_CLIENT_ID?.trim()
      && env.GOOGLE_CLIENT_SECRET?.trim()
      && env.AUTH_SESSION_SECRET?.trim(),
  );

app.get("/api/auth/google/start", (c) => {
  if (!hasGoogleOAuthConfig(c.env))
    return c.redirect("/auth/login?error=oauth_config");
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
  if (!hasGoogleOAuthConfig(c.env))
    return c.redirect("/auth/login?error=oauth_config");
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
          "SELECT id, username, handle, profile_image_url, bio, location FROM users WHERE id = ?",
        )
          .bind(session.sub)
          .first<any>()
      : null;
  return c.json({
    user: session,
    profile,
    // Expose only the decision, never the ADMIN_EMAILS allowlist itself.
    isAdmin: Boolean(session && isAdminEmail(session.email, c.env.ADMIN_EMAILS)),
  });
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

app.post("/api/places-autocomplete", async (c) => {
  try {
    const body = await c.req.json<Record<string, unknown>>();
    return c.json(await autocompleteGooglePlaces(c.env, body));
  } catch (error) {
    return googlePlacesErrorResponse(error);
  }
});

app.post("/api/location-autocomplete", async (c) => {
  try {
    const body = await c.req.json<Record<string, unknown>>();
    return c.json(await autocompleteGoogleLocations(c.env, body));
  } catch (error) {
    return googlePlacesErrorResponse(error);
  }
});

app.post("/api/location-details", async (c) => {
  try {
    const body = await c.req.json<Record<string, unknown>>();
    return c.json(await getGoogleLocationDetails(c.env, body));
  } catch (error) {
    return googlePlacesErrorResponse(error);
  }
});

app.post("/api/place-details", async (c) => {
  try {
    const body = await c.req.json<Record<string, unknown>>();
    return c.json(await getGooglePlaceDetails(c.env, body));
  } catch (error) {
    return googlePlacesErrorResponse(error);
  }
});

app.post("/api/directions", async (c) => {
  try {
    const body = await c.req.json<Record<string, unknown>>();
    return c.json(await getGoogleDirections(c.env, body));
  } catch (error) {
    return googlePlacesErrorResponse(error);
  }
});

const json = <T>(value: string | null | undefined, fallback: T): T => {
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

/**
 * The menu index is the current evidence source for dietary eligibility.
 * Restaurants without indexed menus retain their legacy catalogue tag as a
 * migration fallback. It can be removed after full catalogue indexing; until
 * then this keeps deployment backwards-compatible without treating an unknown
 * restaurant as compliant with a selected restriction.
 */
type IndexedMenuEvidence = { dietary: string[]; prices: number[]; categories: string[] };

async function indexedMenuEvidenceByRestaurant(db: any, ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  const evidence = new Map<string, IndexedMenuEvidence>();
  if (!uniqueIds.length) return evidence;
  const { results } = await db.prepare(
    `SELECT restaurant_id, dietary, price, category FROM restaurant_menu_items WHERE restaurant_id IN (${uniqueIds.map(() => "?").join(",")})`,
  ).bind(...uniqueIds).all<{ restaurant_id: string; dietary: string; price: number | null; category: string | null }>();
  for (const row of results) {
    const value = evidence.get(row.restaurant_id) ?? { dietary: [], prices: [], categories: [] };
    value.dietary.push(...json<string[]>(row.dietary, []));
    if (typeof row.price === "number" && Number.isFinite(row.price) && row.price > 0)
      value.prices.push(row.price);
    if (row.category?.trim()) value.categories.push(row.category.trim());
    evidence.set(row.restaurant_id, value);
  }
  return evidence;
}

/** Uses the same evidence-backed tiers as seed generation, from the menu median. */
function menuPriceLevel(evidence: IndexedMenuEvidence | undefined): 1 | 2 | 3 | 4 | null {
  const prices = evidence?.prices.filter((price) => Number.isFinite(price) && price > 0).sort((a, b) => a - b) ?? [];
  if (!prices.length) return null;
  const median = prices[Math.floor(prices.length / 2)];
  return median <= 15 ? 1 : median <= 30 ? 2 : median <= 50 ? 3 : 4;
}

/** A missing menu is unknown, never an invented mid-price restaurant. */
function matchesMenuBudget(evidence: IndexedMenuEvidence | undefined, budget: number | null) {
  if (!budget || budget >= 4) return true;
  const level = menuPriceLevel(evidence);
  return level === null || level <= budget;
}

function withMenuIntentEvidence<T extends Candidate>(restaurant: T, evidence: IndexedMenuEvidence | undefined): T {
  return { ...restaurant, menu_intents: menuSectionIntents(evidence?.categories ?? []) };
}
const isoDate = (value: unknown) => {
  const numeric = typeof value === "number" ? value : Number(value);
  const date = Number.isFinite(numeric)
    ? new Date(numeric)
    : new Date(String(value ?? ""));
  return Number.isFinite(date.getTime())
    ? date.toISOString()
    : new Date(0).toISOString();
};

type PresentationPhotoRow = {
  restaurant_id?: string;
  r2_key: string;
  drive_file_id?: string | null;
  kind: string;
  dishes: string;
  perceptual_hash: string | null;
};

export const MIN_LUNCHIE_PRESENTATION_PHOTOS = 2;

function hashDistance(left: string, right: string) {
  if (!/^[0-9a-f]+$/i.test(left) || left.length !== right.length) return Infinity;
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    let bits = Number.parseInt(left[index], 16) ^ Number.parseInt(right[index], 16);
    while (bits) {
      distance += bits & 1;
      bits >>>= 1;
    }
  }
  return distance;
}

export function selectLunchiePresentationPhotoKeys(
  rows: PresentationPhotoRow[],
  limit = 4,
) {
  const hashes: string[] = [];
  const keys = new Set<string>();
  const sourceIds = new Set<string>();
  const safe: string[] = [];
  for (const row of rows) {
    if (keys.has(row.r2_key)) continue;
    const sourceId = row.drive_file_id?.trim() || null;
    if (sourceId && sourceIds.has(sourceId)) continue;
    const hash = row.perceptual_hash?.trim().toLowerCase() || null;
    if (hash && hashes.some((known) => hashDistance(hash, known) <= 8)) continue;
    // Generated dish labels are discovery metadata, not verified identity.
    // Never hide a user's photo from a recommendation solely because two
    // unreviewed labels look similar. Automatic removal requires objective
    // evidence: the same object/source ID, or a near-identical image hash.
    if (hash) hashes.push(hash);
    keys.add(row.r2_key);
    if (sourceId) sourceIds.add(sourceId);
    safe.push(`/photos/${row.r2_key}`);
    if (safe.length === limit) break;
  }
  return safe;
}

/** Lunchie cards only present evidence-backed food/table media. */
export async function lunchiePresentationPhotos(
  db: any,
  restaurantId: string,
) {
  const { results } = await db.prepare(
    "SELECT r2_key, drive_file_id, kind, dishes, perceptual_hash FROM restaurant_photos WHERE restaurant_id = ? AND kind IN ('dish', 'table') AND has_person = 0 AND review_status != 'rejected' ORDER BY CASE kind WHEN 'dish' THEN 0 ELSE 1 END, COALESCE(quality, 0) DESC, id ASC LIMIT 24",
  ).bind(restaurantId).all<PresentationPhotoRow>();
  // Object availability is handled by the browser at render time. Probing R2
  // for every catalogue photo made one request fan out into 100+ storage
  // reads and added several seconds to Lunchie startup.
  return selectLunchiePresentationPhotoKeys(results);
}

async function restaurantDetailPhotos(db: any, restaurantId: string, storedPhotos: unknown) {
  const presentation = await lunchiePresentationPhotos(db, restaurantId);
  if (presentation.length > 0) return presentation;
  return storedRestaurantPhotoUrls(storedPhotos);
}

type IndexedMenuRow = {
  name: string;
  price: number | null;
  category: string | null;
  description: string | null;
  dietary: string | null;
};

/** Prefer the queryable menu index over the legacy restaurants.menus JSON snapshot. */
async function restaurantIndexedMenuItems(db: any, restaurantId: string) {
  try {
    const { results } = await db.prepare(
      "SELECT name, price, category, description, dietary FROM restaurant_menu_items WHERE restaurant_id = ? ORDER BY category ASC, name ASC LIMIT 80",
    ).bind(restaurantId).all<IndexedMenuRow>();
    return (results ?? []).map((item) => ({
      name: item.name,
      price: typeof item.price === "number" && Number.isFinite(item.price) ? item.price : null,
      category: item.category || undefined,
      description: item.description || undefined,
      dietary: json<string[]>(item.dietary, []),
    }));
  } catch {
    return [];
  }
}

/** Resolve recommendation media in bounded D1 batches, then apply exactly the
 * same within-restaurant de-duplication contract used by the rendered card. */
export async function lunchiePresentationPhotosByRestaurant(
  db: any,
  restaurantIds: string[],
  limit = 4,
) {
  const uniqueIds = [...new Set(restaurantIds.map(String).filter(Boolean))];
  const rowsByRestaurant = new Map<string, PresentationPhotoRow[]>();
  const batchSize = 80;
  for (let offset = 0; offset < uniqueIds.length; offset += batchSize) {
    const ids = uniqueIds.slice(offset, offset + batchSize);
    if (!ids.length) continue;
    const { results } = await db.prepare(
      `SELECT restaurant_id, r2_key, drive_file_id, kind, dishes, perceptual_hash
       FROM restaurant_photos
       WHERE restaurant_id IN (${ids.map(() => "?").join(",")})
         AND kind IN ('dish', 'table')
         AND has_person = 0
         AND review_status != 'rejected'
       ORDER BY restaurant_id, CASE kind WHEN 'dish' THEN 0 ELSE 1 END,
                COALESCE(quality, 0) DESC, id ASC`,
    ).bind(...ids).all<PresentationPhotoRow>();
    for (const row of results) {
      if (!row.restaurant_id) continue;
      const current = rowsByRestaurant.get(row.restaurant_id) ?? [];
      if (current.length < 24) current.push(row);
      rowsByRestaurant.set(row.restaurant_id, current);
    }
  }
  return new Map(
    uniqueIds.map((restaurantId) => [
      restaurantId,
      selectLunchiePresentationPhotoKeys(rowsByRestaurant.get(restaurantId) ?? [], limit),
    ]),
  );
}

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

type MunchieRankSignals = {
  viewerId: string | null;
  categoryAffinity: Map<string, number>;
  following: Set<string>;
  now?: number;
};

function stableFeedNoise(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1)
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return (hash >>> 0) / 0xffffffff;
}

/** Stable per-viewer ordering: relevance dominates bounded daily exploration. */
export function rankMunchieFeedItems<T extends {
  id: string;
  creatorId: string;
  tags?: string[];
  stops?: Array<{ restaurant?: { category?: string } }>;
  createdAt: unknown;
  likesCount?: number;
  commentsCount?: number;
}>(feedItems: T[], signals: MunchieRankSignals) {
  const now = signals.now ?? Date.now();
  const day = Math.floor(now / 86_400_000);
  return feedItems
    .map((item) => {
      const tags = Array.isArray(item.tags) ? item.tags : [];
      const stopCategories = (item.stops ?? [])
        .map(stop => stop.restaurant?.category)
        .filter((category): category is string => typeof category === "string");
      const affinity = [...tags, ...stopCategories]
        .reduce((sum, key) => sum + (signals.categoryAffinity.get(key) ?? 0), 0);
      const createdAtMs = new Date(isoDate(item.createdAt)).getTime();
      const ageDays = Math.max(0, (now - createdAtMs) / 86_400_000);
      const recency = Math.max(0, 1 - ageDays / 21);
      const followBoost = signals.viewerId && signals.following.has(item.creatorId) ? 1.2 : 0;
      const ownPenalty = signals.viewerId === item.creatorId ? 0.25 : 0;
      const engagement = Math.log1p(Number(item.likesCount ?? 0) + Number(item.commentsCount ?? 0)) * 0.08;
      const exploration = stableFeedNoise(`${signals.viewerId ?? "guest"}:${day}:${item.id}`) * 0.14;
      return { item, score: affinity + followBoost + recency * 0.35 + engagement + exploration - ownPenalty, createdAtMs };
    })
    .sort((left, right) =>
      right.score - left.score ||
      right.createdAtMs - left.createdAtMs ||
      left.item.id.localeCompare(right.item.id)
    )
    .map(({ item }) => item);
}
const MAX_MUNCHIE_FEED_PHOTOS = 6;
const MAX_FEED_STORY_SLIDES = 6;
const MAX_FEED_STORY_OVERLAYS = 6;
const MAX_FEED_STORY_TEXT_LENGTH = 120;
const FEED_STORY_KINDS = new Set([
  "course_map",
  "food_name",
  "restaurant_name",
  "price",
  "review",
  "text",
] as const);
const FEED_STORY_TONES = new Set(["light", "dark", "accent"] as const);
const FEED_STORY_SIZES = new Set(["sm", "md", "lg"] as const);
const FEED_STORY_ALIGNS = new Set(["left", "center", "right"] as const);

type FeedStoryKind = "course_map" | "food_name" | "restaurant_name" | "price" | "review" | "text";
type FeedStoryTone = "light" | "dark" | "accent";
type FeedStorySize = "sm" | "md" | "lg";
type FeedStoryAlign = "left" | "center" | "right";

export type FeedStoryOverlay = {
  id: string;
  kind: FeedStoryKind;
  text?: string;
  restaurantId?: string;
  x: number;
  y: number;
  width: number;
  tone: FeedStoryTone;
  size: FeedStorySize;
  align: FeedStoryAlign;
};

export type FeedStorySlide = {
  id: string;
  photo: string;
  overlays: FeedStoryOverlay[];
};

const boundedStoryNumber = (
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) => {
  const number = typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
  return Math.max(minimum, Math.min(maximum, number));
};

const boundedStoryText = (value: unknown, limit: number) => {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, limit) || null;
};

function uniqueStoryId(
  value: unknown,
  fallback: string,
  usedIds: Set<string>,
) {
  const base = boundedStoryText(value, 80) ?? fallback;
  let candidate = base;
  let suffix = 2;
  while (usedIds.has(candidate)) {
    const marker = `-${suffix}`;
    candidate = `${base.slice(0, Math.max(1, 80 - marker.length))}${marker}`;
    suffix += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

/**
 * Treat the browser payload as untrusted presentation data. The server keeps
 * only bounded tokens and references that are already owned by this course.
 * Array order is significant: it is the persisted carousel/overlay order.
 */
export function sanitizeFeedStorySlides(
  value: unknown,
  allowedPhotoPaths: readonly string[],
  allowedRestaurantIds: readonly string[],
): FeedStorySlide[] {
  if (!Array.isArray(value)) return [];
  const allowedPhotos = new Set(allowedPhotoPaths);
  const allowedRestaurants = new Set(allowedRestaurantIds);
  const seenPhotos = new Set<string>();
  const usedSlideIds = new Set<string>();
  const usedOverlayIds = new Set<string>();
  const slides: FeedStorySlide[] = [];

  // The persisted result is tiny, and the validation scan is bounded as well
  // so a hostile array of invalid objects cannot consume an entire request.
  for (const rawValue of value.slice(0, MAX_FEED_STORY_SLIDES * 10)) {
    if (slides.length >= MAX_FEED_STORY_SLIDES) break;
    if (!rawValue || typeof rawValue !== "object") continue;
    const raw = rawValue as Record<string, unknown>;
    const photo = boundedStoryText(raw.photo, 512);
    if (!photo || !allowedPhotos.has(photo) || seenPhotos.has(photo)) continue;

    const slideIndex = slides.length;
    const overlays: FeedStoryOverlay[] = [];
    const requestedOverlays = Array.isArray(raw.overlays)
      ? raw.overlays.slice(0, MAX_FEED_STORY_OVERLAYS * 10)
      : [];
    for (const requested of requestedOverlays) {
      if (overlays.length >= MAX_FEED_STORY_OVERLAYS) break;
      if (!requested || typeof requested !== "object") continue;
      const overlay = requested as Record<string, unknown>;
      if (typeof overlay.kind !== "string" || !FEED_STORY_KINDS.has(overlay.kind as FeedStoryKind))
        continue;
      const kind = overlay.kind as FeedStoryKind;
      const text = boundedStoryText(overlay.text, MAX_FEED_STORY_TEXT_LENGTH);
      const requestedRestaurantId = boundedStoryText(overlay.restaurantId, 160);
      if (requestedRestaurantId && !allowedRestaurants.has(requestedRestaurantId))
        continue;
      if (kind !== "course_map" && !text && !(kind === "restaurant_name" && requestedRestaurantId))
        continue;

      const overlayIndex = overlays.length;
      const id = uniqueStoryId(
        overlay.id,
        `overlay-${slideIndex}-${overlayIndex}`,
        usedOverlayIds,
      );
      overlays.push({
        id,
        kind,
        ...(text ? { text } : {}),
        ...(requestedRestaurantId ? { restaurantId: requestedRestaurantId } : {}),
        x: boundedStoryNumber(overlay.x, 50, 0, 100),
        y: boundedStoryNumber(overlay.y, 50, 0, 100),
        width: boundedStoryNumber(overlay.width, 72, 10, 100),
        tone: typeof overlay.tone === "string" && FEED_STORY_TONES.has(overlay.tone as FeedStoryTone)
          ? overlay.tone as FeedStoryTone
          : "light",
        size: typeof overlay.size === "string" && FEED_STORY_SIZES.has(overlay.size as FeedStorySize)
          ? overlay.size as FeedStorySize
          : "md",
        align: typeof overlay.align === "string" && FEED_STORY_ALIGNS.has(overlay.align as FeedStoryAlign)
          ? overlay.align as FeedStoryAlign
          : "left",
      });
    }

    seenPhotos.add(photo);
    slides.push({
      id: uniqueStoryId(raw.id, `slide-${slideIndex}`, usedSlideIds),
      photo,
      overlays,
    });
  }
  return slides;
}

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
  const [registered, newRegistered, activeActors, activeSignedIn, activeGuests, eventResult, trendResult, personaResult, modelResult, impressionCoverage, persistedSlates, servedImpressions, attributableSwipes, persistedSessionSwipes, attributableSessionSwipes, categoryResult, contributionResult, catalogueSummary, photoAssetSummary, coursePhotoSummary, menuSummary, menuSectionRows, catalogueCategories, dietarySupport, sourceDistribution, restaurantSamples] = await Promise.all([
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
    c.env.DB.prepare("SELECT COUNT(DISTINCT CASE WHEN e.session_id IS NOT NULL THEN e.session_id || ':' || e.user_id || ':' || e.restaurant_id || ':' || COALESCE(e.round, 1) ELSE e.id END) AS count FROM rec_events e INNER JOIN recommendation_slates s ON s.id = e.slate_id WHERE e.created_at >= ? AND e.event_type = 'SWIPE'").bind(start).first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM swipes WHERE created_at >= ? AND round % 2 = 1 AND swipe_action IN ('LIKE', 'DISLIKE') AND restaurant_id NOT LIKE '__%'").bind(start).first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(DISTINCT e.session_id || ':' || e.user_id || ':' || e.restaurant_id || ':' || e.round) AS count FROM rec_events e INNER JOIN recommendation_slates s ON s.id = e.slate_id WHERE e.created_at >= ? AND e.event_type = 'SWIPE' AND e.session_id IS NOT NULL AND e.round % 2 = 1").bind(start).first<{ count: number }>(),
    c.env.DB.prepare("SELECT r.category AS category, SUM(CASE WHEN e.event_type = 'IMPRESSION' THEN 1 ELSE 0 END) AS impressions, SUM(CASE WHEN e.event_type = 'SWIPE' AND e.action = 'LIKE' THEN 1 ELSE 0 END) AS likes, SUM(CASE WHEN e.event_type = 'SWIPE' AND e.action = 'NOPE' THEN 1 ELSE 0 END) AS nopes, SUM(CASE WHEN e.event_type = 'WINNER' THEN 1 ELSE 0 END) AS decisions FROM rec_events e JOIN restaurants r ON r.id = e.restaurant_id WHERE e.created_at >= ? AND e.event_type IN ('IMPRESSION', 'SWIPE', 'WINNER') GROUP BY r.category ORDER BY impressions DESC, decisions DESC LIMIT 8").bind(start).all<{ category: string; impressions: number; likes: number; nopes: number; decisions: number }>(),
    c.env.DB.prepare("SELECT AVG(CAST(json_extract(item.value, '$.components.reputation') AS REAL)) AS reputation, AVG(CAST(json_extract(item.value, '$.components.context') AS REAL)) AS context, AVG(CAST(json_extract(item.value, '$.components.taste') AS REAL)) AS taste, AVG(CAST(json_extract(item.value, '$.components.exposureFatigue') AS REAL)) AS exposure_fatigue, AVG(CAST(json_extract(item.value, '$.components.satiation') AS REAL)) AS satiation, AVG(CAST(json_extract(item.value, '$.components.journeyChain') AS REAL)) AS journey_chain, COUNT(*) AS count FROM recommendation_slates s, json_each(s.items_json) AS item WHERE s.created_at >= ? AND json_type(item.value, '$.components') = 'object'").bind(start).first<{ reputation: number | null; context: number | null; taste: number | null; exposure_fatigue: number | null; satiation: number | null; journey_chain: number | null; count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS restaurants, SUM(CASE WHEN address IS NOT NULL AND trim(address) != '' THEN 1 ELSE 0 END) AS with_address, SUM(CASE WHEN latitude != 0 OR longitude != 0 THEN 1 ELSE 0 END) AS with_coordinates, SUM(CASE WHEN short_description IS NOT NULL AND trim(short_description) != '' THEN 1 ELSE 0 END) AS with_description, SUM(CASE WHEN json_valid(photos) AND json_array_length(photos) > 0 THEN 1 ELSE 0 END) AS with_photo_reference, SUM(CASE WHEN json_valid(photos) THEN json_array_length(photos) ELSE 0 END) AS photo_references, SUM(CASE WHEN json_valid(menus) AND json_array_length(menus) > 0 THEN 1 ELSE 0 END) AS with_menu_reference, SUM(CASE WHEN json_valid(menus) THEN json_array_length(menus) ELSE 0 END) AS menu_references FROM restaurants").first<{ restaurants: number; with_address: number; with_coordinates: number; with_description: number; with_photo_reference: number; photo_references: number; with_menu_reference: number; menu_references: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS photo_assets, COUNT(DISTINCT restaurant_id) AS restaurants_with_photo_assets FROM restaurant_photos").first<{ photo_assets: number; restaurants_with_photo_assets: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS count, SUM(CASE WHEN classification = 'restaurant' THEN 1 ELSE 0 END) AS restaurant_count, SUM(CASE WHEN classification = 'other' THEN 1 ELSE 0 END) AS other_count FROM course_photo_attributions").first<{ count: number; restaurant_count: number; other_count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS menu_items, COUNT(DISTINCT restaurant_id) AS restaurants_with_menus, SUM(CASE WHEN price IS NOT NULL THEN 1 ELSE 0 END) AS priced_menu_items, SUM(CASE WHEN json_valid(dietary) AND json_array_length(dietary) > 0 THEN 1 ELSE 0 END) AS dietary_menu_items, SUM(CASE WHEN confidence IS NOT NULL THEN 1 ELSE 0 END) AS evidenced_menu_items FROM restaurant_menu_items").first<{ menu_items: number; restaurants_with_menus: number; priced_menu_items: number; dietary_menu_items: number; evidenced_menu_items: number }>(),
    c.env.DB.prepare("SELECT category, COUNT(*) AS count FROM restaurant_menu_items WHERE category IS NOT NULL AND trim(category) != '' GROUP BY category").all<{ category: string; count: number }>(),
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
    persistedSessionSwipes: count(persistedSessionSwipes),
    attributableSessionSwipes: count(attributableSessionSwipes),
    unattributedSessionSwipes: Math.max(0, count(persistedSessionSwipes) - count(attributableSessionSwipes)),
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
      communityPhotoAttributions: count(coursePhotoSummary),
      restaurantPhotoAttributions: Number(coursePhotoSummary?.restaurant_count ?? 0),
      otherPhotoAttributions: Number(coursePhotoSummary?.other_count ?? 0),
      menuItems: Number(catalogueSummary?.menu_references ?? 0),
      restaurantsWithMenus: Number(catalogueSummary?.with_menu_reference ?? 0),
      normalisedMenuItems: count(menuSummary),
      restaurantsWithNormalisedMenus: Number(menuSummary?.restaurants_with_menus ?? 0),
      pricedMenuItems: Number(menuSummary?.priced_menu_items ?? 0),
      dietaryMenuItems: Number(menuSummary?.dietary_menu_items ?? 0),
      evidencedMenuItems: Number(menuSummary?.evidenced_menu_items ?? 0),
      completeness: {
        address: Number(catalogueSummary?.with_address ?? 0),
        coordinates: Number(catalogueSummary?.with_coordinates ?? 0),
        description: Number(catalogueSummary?.with_description ?? 0),
        photoReference: Number(catalogueSummary?.with_photo_reference ?? 0),
        menu: Number(menuSummary?.restaurants_with_menus ?? 0),
      },
      categories: catalogueCategories.results.map((row) => ({ category: row.category, count: Number(row.count) })),
      menuIntentEvidence: (["meal", "cafe", "dessert"] as const).map((intent) => ({
        intent,
        count: menuSectionRows.results.reduce(
          (total, row) => total + (intentForMenuSection(row.category) === intent ? Number(row.count) : 0),
          0,
        ),
      })),
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
  const body = await c.req.json<{ avatarUrl?: unknown; username?: unknown; handle?: unknown }>().catch(() => ({}));
  const hasAvatarUrl = "avatarUrl" in body;
  const hasUsername = "username" in body;
  const hasHandle = "handle" in body;
  if (!hasAvatarUrl && !hasUsername && !hasHandle)
    return c.json({ error: "변경할 프로필 정보가 없습니다." }, 400);

  const statements: any[] = [];
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
    statements.push(
      c.env.DB.prepare("UPDATE users SET profile_image_url = ? WHERE id = ?")
        .bind(avatarUrl, session.sub),
    );
  }

  if (hasUsername) {
    if (typeof body.username !== "string")
      return c.json({ error: "이름을 입력해 주세요." }, 400);
    const username = body.username.trim();
    if (!username || username.length > 80)
      return c.json({ error: "이름은 1~80자로 입력해 주세요." }, 400);
    statements.push(
      c.env.DB.prepare("UPDATE users SET username = ? WHERE id = ?")
        .bind(username, session.sub),
    );
  }

  if (hasHandle) {
    const handle = normalizePublicHandle(body.handle);
    if (!handle)
      return c.json({ error: "아이디는 영문 소문자, 숫자, 밑줄로 3~20자까지 입력해 주세요." }, 400);
    const owner = await c.env.DB.prepare(
      "SELECT id FROM users WHERE handle = ? COLLATE NOCASE AND id <> ?",
    ).bind(handle, session.sub).first<{ id: string }>();
    if (owner)
      return c.json({ error: "이미 사용 중인 아이디입니다.", code: "HANDLE_TAKEN" }, 409);
    statements.push(
      c.env.DB.prepare("UPDATE users SET handle = ? WHERE id = ?")
        .bind(handle, session.sub),
    );
  }
  try {
    await c.env.DB.batch(statements);
  } catch (error) {
    if (hasHandle)
      return c.json({ error: "이미 사용 중인 아이디입니다.", code: "HANDLE_TAKEN" }, 409);
    throw error;
  }
  const profile = await c.env.DB.prepare(
    "SELECT id, username, handle, profile_image_url, bio, location FROM users WHERE id = ?",
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

async function requireGoogleSession(c: { req: { raw: Request }; env: EnvBindings }) {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session) return null;
  await ensurePublicUser(c.env.DB, session);
  return session;
}

// User search is limited to authenticated Lunchie accounts. Only public
// profile fields are returned; OAuth subject IDs are used solely as route keys.
app.get("/api/users/search", async (c) => {
  const session = await requireGoogleSession(c);
  if (!session) return c.json({ error: "로그인이 필요합니다." }, 401);
  const rawQuery = (c.req.query("q") ?? "").trim();
  const query = rawQuery.replace(/^@/, "");
  if (!query || query.length > 40)
    return c.json({ error: "검색어는 1~40자로 입력해 주세요." }, 400);
  const escaped = escapeUserSearchTerm(query.toLowerCase());
  const namePattern = `%${escaped}%`;
  const handlePattern = `${escaped}%`;
  const { results } = await c.env.DB.prepare(
    `SELECT
      u.id,
      u.username,
      COALESCE(u.handle, '') AS handle,
      u.profile_image_url,
      u.bio,
      u.location,
      u.created_at,
      CASE WHEN u.id = ? THEN 1 ELSE 0 END AS is_self,
      CASE WHEN EXISTS (
        SELECT 1 FROM user_follows f
        WHERE f.follower_id = ? AND f.following_id = u.id
      ) THEN 1 ELSE 0 END AS is_following
    FROM users u
    WHERE lower(u.username) LIKE ? ESCAPE '\\'
       OR lower(COALESCE(u.handle, '')) LIKE ? ESCAPE '\\'
    ORDER BY
      CASE
        WHEN lower(COALESCE(u.handle, '')) = ? THEN 0
        WHEN lower(u.username) = ? THEN 1
        ELSE 2
      END,
      u.username COLLATE NOCASE ASC,
      u.id ASC
    LIMIT 20`,
  ).bind(
    session.sub,
    session.sub,
    namePattern,
    handlePattern,
    query.toLowerCase(),
    query.toLowerCase(),
  ).all<any>();
  return c.json((results ?? []).map((user: any) => ({
    ...user,
    is_self: Boolean(user.is_self),
    is_following: Boolean(user.is_following),
  })));
});

// Public profile data comes from the same D1 identity store that owns a post.
// D1 is the only public-profile source of truth.
app.get("/api/users/:id", async (c) => {
  const id = c.req.param("id");
  if (!id || id.length > 256)
    return c.json({ error: "사용자 정보가 올바르지 않습니다." }, 400);
  const user = await c.env.DB.prepare(
    "SELECT id, username, handle, profile_image_url, bio, location, created_at FROM users WHERE id = ?",
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
    handle: user.handle,
    profile_image_url: user.profile_image_url,
    bio: user.bio,
    location: user.location,
    created_at: user.created_at,
    public_post_count: Number(count?.count ?? 0),
  });
});

async function requireAdminSession(c: { req: { raw: Request }; env: EnvBindings; json: (value: unknown, status?: number) => Response }) {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session) return c.json({ error: "관리자 로그인이 필요합니다." }, 401);
  if (!isAdminEmail(session.email, c.env.ADMIN_EMAILS))
    return c.json({ error: "관리자 권한이 없습니다." }, 403);
  return session;
}

type AdminPhotoRow = PhotoReviewRecord & {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_category: string;
  restaurant_address: string;
  r2_key: string;
  dishes: string;
  vibe_tags: string;
  source: string;
  created_at: number;
  reviewed_at: number | null;
};

type AdminPhotoInventoryRow = {
  restaurant_id: string;
  r2_key: string | null;
  drive_file_id: string | null;
  kind: string | null;
  dishes: string | null;
  perceptual_hash: string | null;
  has_person: number | null;
  review_status: PhotoReviewStatus | null;
};

type AdminRestaurantMedia = {
  totalPhotos: number;
  distinctSafePhotos: number;
  eligible: boolean;
};

app.get("/api/admin/photos", async (c) => {
  const admin = await requireAdminSession(c);
  if (admin instanceof Response) return admin;

  const requestedLimit = Number(c.req.query("limit") ?? 48);
  const requestedOffset = Number(c.req.query("offset") ?? 0);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(60, Math.floor(requestedLimit))) : 48;
  const offset = Number.isFinite(requestedOffset) ? Math.max(0, Math.floor(requestedOffset)) : 0;
  const query = (c.req.query("q") ?? "").trim().slice(0, 80);
  const requestedStatus = c.req.query("status") ?? "all";
  const requestedKind = c.req.query("kind") ?? "all";
  const requestedReadiness = c.req.query("readiness") ?? "all";
  const status: PhotoReviewStatus | "all" = PHOTO_REVIEW_STATUSES.includes(requestedStatus as PhotoReviewStatus)
    ? requestedStatus as PhotoReviewStatus
    : "all";
  const kind: PhotoKind | "all" = PHOTO_KINDS.includes(requestedKind as PhotoKind)
    ? requestedKind as PhotoKind
    : "all";
  const readiness = requestedReadiness === "eligible" || requestedReadiness === "insufficient"
    ? requestedReadiness
    : "all";
  const search = query ? `%${escapePhotoSearchTerm(query.toLowerCase())}%` : "";
  const inventory = await c.env.DB.prepare(`
    SELECT r.id AS restaurant_id, rp.r2_key, rp.drive_file_id, rp.kind,
           rp.dishes, rp.perceptual_hash, rp.has_person, rp.review_status
    FROM restaurants r
    LEFT JOIN restaurant_photos rp ON rp.restaurant_id = r.id
    ORDER BY r.id, CASE rp.kind WHEN 'dish' THEN 0 WHEN 'table' THEN 1 ELSE 2 END,
             COALESCE(rp.quality, 0) DESC, rp.id
  `).all<AdminPhotoInventoryRow>();
  const inventoryByRestaurant = new Map<string, AdminPhotoInventoryRow[]>();
  for (const row of inventory.results) {
    const current = inventoryByRestaurant.get(row.restaurant_id ?? "") ?? [];
    if (row.r2_key) current.push(row);
    inventoryByRestaurant.set(row.restaurant_id ?? "", current);
  }
  const restaurantMedia = Object.fromEntries(
    [...inventoryByRestaurant.entries()].map(([restaurantId, photoRows]) => {
      const safeRows: PresentationPhotoRow[] = photoRows
        .filter(row => Boolean(row.r2_key) && (row.kind === "dish" || row.kind === "table") && row.has_person === 0 && row.review_status !== "rejected")
        .map(row => ({
          restaurant_id: row.restaurant_id,
          r2_key: row.r2_key as string,
          drive_file_id: row.drive_file_id,
          kind: row.kind as string,
          dishes: row.dishes ?? "[]",
          perceptual_hash: row.perceptual_hash,
        }));
      const distinctSafePhotos = selectLunchiePresentationPhotoKeys(safeRows, safeRows.length).length;
      return [restaurantId, {
        totalPhotos: photoRows.length,
        distinctSafePhotos,
        eligible: distinctSafePhotos >= MIN_LUNCHIE_PRESENTATION_PHOTOS,
      } satisfies AdminRestaurantMedia];
    }),
  ) as Record<string, AdminRestaurantMedia>;
  const selectedRestaurantIds = Object.entries(restaurantMedia)
    .filter(([, media]) => readiness === "all" || (readiness === "eligible" ? media.eligible : !media.eligible))
    .map(([restaurantId]) => restaurantId);
  const selectedRestaurantIdsJson = JSON.stringify(selectedRestaurantIds);
  const where = `
    WHERE (?1 = '' OR lower(r.name) LIKE ?2 ESCAPE '\\' OR lower(r.address) LIKE ?2 ESCAPE '\\')
      AND (?3 = 'all' OR rp.review_status = ?3)
      AND (?4 = 'all' OR rp.kind = ?4)
      AND (?5 = 'all' OR r.id IN (SELECT value FROM json_each(?6)))`;

  const [rows, total, statusRows, overall] = await Promise.all([
    c.env.DB.prepare(`
      SELECT rp.id, rp.restaurant_id, r.name AS restaurant_name,
             r.category AS restaurant_category, r.address AS restaurant_address,
             rp.r2_key, rp.kind, rp.dishes, rp.vibe_tags, rp.quality,
             rp.has_person, rp.source, rp.review_status, rp.review_notes,
             rp.created_at, rp.reviewed_at
      FROM restaurant_photos rp
      JOIN restaurants r ON r.id = rp.restaurant_id
      ${where}
      ORDER BY CASE rp.review_status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END,
               lower(r.name), rp.created_at, rp.id
      LIMIT ?7 OFFSET ?8
    `).bind(query, search, status, kind, readiness, selectedRestaurantIdsJson, limit, offset).all<AdminPhotoRow>(),
    c.env.DB.prepare(`
      SELECT COUNT(*) AS count
      FROM restaurant_photos rp
      JOIN restaurants r ON r.id = rp.restaurant_id
      ${where}
    `).bind(query, search, status, kind, readiness, selectedRestaurantIdsJson).first<{ count: number }>(),
    c.env.DB.prepare("SELECT review_status AS status, COUNT(*) AS count, COUNT(DISTINCT restaurant_id) AS restaurants FROM restaurant_photos GROUP BY review_status").all<{ status: PhotoReviewStatus; count: number; restaurants: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS photos, COUNT(DISTINCT restaurant_id) AS restaurants FROM restaurant_photos").first<{ photos: number; restaurants: number }>(),
  ]);

  const summary = Object.fromEntries(PHOTO_REVIEW_STATUSES.map(value => [value, { photos: 0, restaurants: 0 }]));
  for (const row of statusRows.results) {
    if (PHOTO_REVIEW_STATUSES.includes(row.status)) {
      summary[row.status] = { photos: Number(row.count), restaurants: Number(row.restaurants) };
    }
  }
  const mediaValues = Object.values(restaurantMedia);
  const eligibleRestaurants = mediaValues.filter(value => value.eligible).length;
  const noSafePhotos = mediaValues.filter(value => value.distinctSafePhotos === 0).length;
  const oneSafePhoto = mediaValues.filter(value => value.distinctSafePhotos === 1).length;
  return c.json({
    photos: rows.results.map(row => ({
      id: row.id,
      restaurantId: row.restaurant_id,
      restaurantName: row.restaurant_name,
      restaurantCategory: row.restaurant_category,
      restaurantAddress: row.restaurant_address,
      url: `/photos/${row.r2_key}`,
      r2Key: row.r2_key,
      kind: row.kind,
      dishes: json<string[]>(row.dishes, []),
      vibeTags: json<string[]>(row.vibe_tags, []),
      quality: row.quality === null ? null : Number(row.quality),
      hasPerson: Boolean(row.has_person),
      source: row.source,
      reviewStatus: row.review_status,
      reviewNotes: row.review_notes,
      createdAt: isoDate(row.created_at),
      reviewedAt: row.reviewed_at ? isoDate(row.reviewed_at) : null,
    })),
    summary: {
      ...summary,
      all: { photos: Number(overall?.photos ?? 0), restaurants: Number(overall?.restaurants ?? 0) },
    },
    readinessSummary: {
      restaurants: mediaValues.length,
      eligibleRestaurants,
      insufficientRestaurants: mediaValues.length - eligibleRestaurants,
      noSafePhotos,
      oneSafePhoto,
      minimumDistinctPhotos: MIN_LUNCHIE_PRESENTATION_PHOTOS,
    },
    restaurantMedia,
    pagination: { total: Number(total?.count ?? 0), limit, offset, hasMore: offset + rows.results.length < Number(total?.count ?? 0) },
  });
});

app.patch("/api/admin/photos/:id", async (c) => {
  const admin = await requireAdminSession(c);
  if (admin instanceof Response) return admin;
  const id = c.req.param("id");
  if (!id || id.length > 200) return c.json({ error: "사진 식별자가 올바르지 않습니다." }, 400);
  const current = await c.env.DB.prepare(
    "SELECT review_status, kind, has_person, quality, review_notes FROM restaurant_photos WHERE id = ?",
  ).bind(id).first<PhotoReviewRecord>();
  if (!current) return c.json({ error: "사진을 찾을 수 없습니다." }, 404);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "검수 내용이 올바르지 않습니다." }, 400);
  }
  const parsed = parsePhotoReviewUpdate(body, current);
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);
  const value = parsed.value;
  const reviewedAt = Date.now();
  await c.env.DB.prepare(
    "UPDATE restaurant_photos SET review_status = ?, kind = ?, has_person = ?, quality = ?, review_notes = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?",
  ).bind(value.reviewStatus, value.kind, value.hasPerson, value.quality, value.reviewNotes, reviewedAt, admin.email ?? admin.sub, id).run();
  return c.json({ ok: true, id, ...value, reviewedAt: new Date(reviewedAt).toISOString() });
});

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
    ? "SELECT u.id, u.username, u.handle, u.profile_image_url, u.bio, u.location, u.created_at FROM user_follows f JOIN users u ON u.id = f.follower_id WHERE f.following_id = ? ORDER BY f.created_at DESC"
    : "SELECT u.id, u.username, u.handle, u.profile_image_url, u.bio, u.location, u.created_at FROM user_follows f JOIN users u ON u.id = f.following_id WHERE f.follower_id = ? ORDER BY f.created_at DESC";
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

    // 1. Dietary Hard Filter.  This runs below against the structured menu
    // index so Korean UI labels and source-menu abbreviations share one
    // normalisation contract.  Do not use SQL LIKE: "비건" and "VG" are the
    // same constraint but are not the same stored string.
    const diets = Array.isArray(ctx.dietary)
      ? ctx.dietary
      : Array.isArray(ctx.diet)
        ? ctx.diet
        : [];
    const requiredDiets = diets
      .map((diet: unknown) => typeof diet === "string" ? normalizeDiet(diet) : null)
      .filter(
        (diet: ReturnType<typeof normalizeDiet>): diet is DietRestriction =>
          Boolean(diet) && isHardRestriction(diet),
      );

    // 2. Taste (Categories) mapping
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
    const rawRestaurants = rawResults as any[];
    const menuEvidence = await indexedMenuEvidenceByRestaurant(
      c.env.DB,
      rawRestaurants.map((restaurant) => String(restaurant.id)),
    );
    const requestedBudget = Number.isInteger(ctx.budget) && ctx.budget >= 1 && ctx.budget <= 4
      ? Number(ctx.budget)
      : null;
    const intentResults = rawRestaurants.filter((restaurant) =>
      categoryMatchesIntent(restaurant.category, selectedIntent) &&
      matchesMenuBudget(menuEvidence.get(restaurant.id), requestedBudget),
    );
    const exactResults = intentResults.filter((restaurant) =>
      requiredDiets.every((restriction) =>
        restaurantSatisfiesDietRestriction(
          {
            category: restaurant.category,
            dietaryOptions: menuEvidence.get(restaurant.id)?.dietary ?? json<string[]>(restaurant.dietary_options, []),
            menuItems: json(restaurant.menus, []),
          },
          restriction,
        ),
      ),
    );
    const ingredientAvoidances = requiredDiets.filter(isIngredientAvoidance);
    const dietRelaxed = exactResults.length === 0 && requiredDiets.some(restriction => !isIngredientAvoidance(restriction));
    const filteredResults = dietRelaxed
      ? intentResults.filter((restaurant) =>
          ingredientAvoidances.every((restriction) =>
            restaurantSatisfiesDietRestriction(
              {
                category: restaurant.category,
                dietaryOptions: menuEvidence.get(restaurant.id)?.dietary ?? json<string[]>(restaurant.dietary_options, []),
                menuItems: json(restaurant.menus, []),
              },
              restriction,
            ),
          ),
        )
      : exactResults;
    const contextualResults = filteredResults
      // Menu taxonomy never widens the hard intent filter above. It simply
      // gives the contextual ranker a verified cafe/dessert signal when an
      // otherwise broad restaurant category has a structured menu section.
      .map((restaurant) => withMenuIntentEvidence(restaurant, menuEvidence.get(restaurant.id)));
    const presentationPhotos = await lunchiePresentationPhotosByRestaurant(
      c.env.DB,
      contextualResults.map((restaurant) => String(restaurant.id)),
    );
    // A restaurant is recommendable only when the final card can show at
    // least two distinct, classified, person-free photos. Raw row counts are
    // insufficient because near-duplicates collapse in the card resolver.
    const results = contextualResults.filter(
      (restaurant) =>
        (presentationPhotos.get(String(restaurant.id))?.length ?? 0) >=
        MIN_LUNCHIE_PRESENTATION_PHOTOS,
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
      budget: requestedBudget as 1 | 2 | 3 | 4 | undefined,
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
    const safeSlate = finalResults.map((item) => ({
        ...item.restaurant,
        photos: presentationPhotos.get(String(item.restaurant.id)) ?? [],
        menu_items: json(item.restaurant.menus, []),
        tags: json<string[]>(item.restaurant.tags, []),
        rank: item.rank,
        score: item.score,
        propensity: item.propensity,
      }));
    const response = c.json({
      slate: safeSlate,
      user_id: userId,
      k,
      slate_id: slateId,
      slate_type: slateType,
      model_version: policyVersion,
      engine: "cloudflare-hono-d1",
      diet_relaxed: dietRelaxed && results.length > 0,
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
    await Promise.all(results.map(async (r: any) => normalizeRestaurantPayload({
      ...r,
      photos: await lunchiePresentationPhotos(c.env.DB, r.id),
      menu_items: json(r.menus, []),
      tags: json<string[]>(r.tags, []),
    }))),
  );
});

// 저장된 Lunchie 여정은 식당 ID만 보관한다. 전체 카탈로그 초기화와 무관하게
// 해당 식당을 다시 열 수 있도록 정본 행을 ID로 직접 조회한다.
app.get("/api/restaurants/:id", async (c) => {
  const restaurant = await c.env.DB.prepare(
    "SELECT * FROM restaurants WHERE id = ? LIMIT 1",
  )
    .bind(c.req.param("id"))
    .first();
  if (!restaurant) return c.json({ error: "restaurant_not_found" }, 404);
  let row = restaurant as any;
  const indexedMenu = await restaurantIndexedMenuItems(c.env.DB, row.id);
  let photos = await restaurantDetailPhotos(c.env.DB, row.id, row.photos);
  if (
    photos.length === 0
    && row.source === "google"
    && typeof row.google_place_id === "string"
    && row.google_place_id
    && !googlePlacePhotosSynced(row.photos)
  ) {
    try {
      await getGooglePlaceDetails(c.env, { placeId: row.google_place_id });
      const refreshed = await c.env.DB.prepare(
        "SELECT * FROM restaurants WHERE id = ? LIMIT 1",
      )
        .bind(row.id)
        .first();
      if (refreshed) {
        row = refreshed as any;
        photos = await restaurantDetailPhotos(c.env.DB, row.id, row.photos);
      }
    } catch {
      // Keep the stored text details even if photo backfill fails.
    }
  }
  return c.json({
    ...row,
    photos,
    menu_items: indexedMenu.length > 0 ? indexedMenu : json(row.menus, []),
    tags: json<string[]>(row.tags, []),
    dietary_options: json<string[]>(row.dietary_options, []),
  });
});

type CourseDatabaseRow = {
  id: string;
  author_id: string;
  title: string;
  description: string;
  hero_image: string | null;
  region: string | null;
  tags: string | null;
  hashtags: string | null;
  total_distance: number | null;
  total_duration: number | null;
  likes_count: number | null;
  saves_count: number | null;
  comments_count: number | null;
  is_public: number;
  feed_photos: string | null;
  feed_decor: string | null;
  feed_story: string | null;
  template_id: string | null;
  source_course_id?: string | null;
  source_stops_snapshot?: string | null;
  publish_idempotency_key?: string | null;
  created_at: number | string;
  author_name?: string | null;
  author_image?: string | null;
};

type CourseStopDatabaseRow = {
  restaurant_id: string;
  order_index: number;
  start_time: string | null;
  end_time: string | null;
  is_bookmarked: number | null;
  name: string;
  category: string;
  photos: string | null;
  rating: number | null;
  address: string | null;
  review_count: number | null;
  price_level: number | null;
  short_description: string | null;
  tags: string | null;
  dietary_options: string | null;
  menus: string | null;
  phone_number: string | null;
  business_hours: string | null;
  latitude: number | null;
  longitude: number | null;
};

type CourseMediaDatabaseRow = {
  r2_path: string;
  owner_id: string | null;
  media_source: string | null;
  placement_index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

type CoursePhotoAttributionDatabaseRow = {
  r2_path: string;
  restaurant_id: string | null;
  classification: "restaurant" | "other";
  attribution_source: "gps_suggestion" | "user_selected" | "other";
};

type FeedCommentDatabaseRow = {
  id: string;
  author_id: string;
  author_name: string;
  author_emoji: string;
  parent_id: string | null;
  body: string;
  created_at: number | string;
};

type SavedCourseDatabaseRow = CourseDatabaseRow & {
  saved_course_id: string;
  saved_at: number | string;
};

const validCourseId = (value: unknown) => {
  if (typeof value !== "string") return null;
  const courseId = value.trim();
  return courseId && courseId.length <= 128 ? courseId : null;
};

async function courseStops(
  env: Pick<EnvBindings, "DB" | "MEDIA_ORIGIN" | "PHOTOS_R2">,
  courseId: string,
) {
  const { results } = await env.DB.prepare(
    "SELECT ci.*, r.name, r.category, r.address, r.photos, r.rating, r.review_count, r.price_level, r.short_description, r.tags, r.dietary_options, r.menus, r.phone_number, r.business_hours, r.latitude, r.longitude FROM course_items ci JOIN restaurants r ON ci.restaurant_id = r.id WHERE ci.course_id = ? ORDER BY ci.order_index",
  )
    .bind(courseId)
    .all<CourseStopDatabaseRow>();

  return Promise.all(
    results.map(async (stop) => ({
      placeId: stop.restaurant_id,
      order: Number(stop.order_index),
      startTime: stop.start_time || "",
      endTime: stop.end_time || "",
      isBookmarked: Boolean(stop.is_bookmarked),
      restaurant: {
        id: stop.restaurant_id,
        name: stop.name,
        category: stop.category,
        photos: await filterExistingPhotos(
          env,
          json<string[]>(stop.photos, []),
        ),
        rating: stop.rating,
        reviewCount: Number(stop.review_count ?? 0),
        priceLevel: Math.max(1, Math.min(4, Number(stop.price_level ?? 2))),
        address: stop.address || "",
        description: stop.short_description || "",
        tags: json<string[]>(stop.tags, []),
        dietary: json<string[]>(stop.dietary_options, []),
        menuItems: json<unknown[]>(stop.menus, []),
        phone: stop.phone_number || null,
        openHours: stop.business_hours || "",
        latitude: stop.latitude == null ? null : Number(stop.latitude),
        longitude: stop.longitude == null ? null : Number(stop.longitude),
      },
    })),
  );
}

function mediaBelongsToCourse(
  course: Pick<CourseDatabaseRow, "author_id">,
  media: Pick<CourseMediaDatabaseRow, "owner_id" | "media_source" | "r2_path">,
) {
  if (!media.owner_id || media.owner_id !== course.author_id) return false;
  const authorPrefix = `/photos/uploads/${course.author_id}/`;
  if (media.media_source === "author_upload")
    return media.r2_path.startsWith(authorPrefix);
  // Curated team imports predate per-user upload paths. They remain explicit
  // legacy imports, while ordinary user content must prove the owner in path.
  return course.author_id === "team" || media.r2_path.startsWith(authorPrefix);
}

function legacyMediaBelongsToCourse(course: CourseDatabaseRow, path: unknown) {
  if (typeof path !== "string" || !path.startsWith("/photos/")) return false;
  return course.author_id === "team"
    || path.startsWith(`/photos/uploads/${course.author_id}/`);
}

function courseResponse(
  course: CourseDatabaseRow,
  stops: Awaited<ReturnType<typeof courseStops>>,
) {
  return {
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
    sourceCourseId: course.source_course_id || null,
    sourceStopsSnapshot: json<Array<{
      placeId: string;
      order: number;
      name: string;
      category: string;
      address: string;
    }>>(course.source_stops_snapshot, []),
    savedCount: Number(course.saves_count ?? 0),
    isPublic: Boolean(course.is_public),
    createdAt: isoDate(course.created_at),
    stops,
  };
}

async function feedResponseForCourse(
  env: Pick<EnvBindings, "DB" | "MEDIA_ORIGIN" | "PHOTOS_R2">,
  course: CourseDatabaseRow,
  stops: Awaited<ReturnType<typeof courseStops>>,
) {
  const [
    { results: mediaRows },
    { results: commentRows },
    { results: attributionRows },
  ] = await Promise.all([
    env.DB.prepare(
      "SELECT r2_path, owner_id, media_source, placement_index, x, y, width, height, rotation FROM course_media WHERE course_id = ? ORDER BY placement_index",
    )
      .bind(course.id)
      .all<CourseMediaDatabaseRow>(),
    env.DB.prepare(
      "SELECT id, author_id, author_name, author_emoji, parent_id, body, created_at FROM feed_comments WHERE course_id = ? AND status = 'visible' ORDER BY created_at ASC",
    )
      .bind(course.id)
      .all<FeedCommentDatabaseRow>(),
    env.DB.prepare(
      "SELECT r2_path, restaurant_id, classification, attribution_source FROM course_photo_attributions WHERE course_id = ? ORDER BY r2_path",
    )
      .bind(course.id)
      .all<CoursePhotoAttributionDatabaseRow>(),
  ]);
  const canonicalMedia = mediaRows.filter((media) => mediaBelongsToCourse(course, media)).map((media) => ({
    id: `${course.id}:media:${media.placement_index}`,
    src: media.r2_path,
    x: Number(media.x),
    y: Number(media.y),
    w: Number(media.width),
    h: Number(media.height),
    rotate: Number(media.rotation),
  }));
  // Once canonical rows exist, owner/provenance validation is authoritative.
  // Falling back after all canonical rows were rejected would resurrect the
  // same untrusted path from legacy JSON.
  const hasCanonicalMediaRows = mediaRows.length > 0;
  const rawDecor = hasCanonicalMediaRows
    ? canonicalMedia
    : json<Array<{ src?: unknown } & Record<string, unknown>>>(
        course.feed_decor,
        [],
      ).filter((item) => legacyMediaBelongsToCourse(course, item.src));
  const rawPhotos = hasCanonicalMediaRows
    ? Array.from(new Set(canonicalMedia.map((media) => media.src)))
    : json<string[]>(course.feed_photos, []).filter((path) => legacyMediaBelongsToCourse(course, path));
  const photos = await filterExistingPhotos(env, rawPhotos);
  const photoSet = new Set(photos);
  const decor = rawDecor.filter((item) => {
    const src = typeof item.src === "string" ? item.src : null;
    // Shape/stroke decor has no src and remains valid. Every bitmap src must
    // be one of the owner-validated R2 files above; external/catalogue images
    // cannot become an author's representative post media.
    return !src || photoSet.has(src);
  });
  const heroImage = photos[0] ?? "";
  const stopRestaurantIds = stops.map((stop) => stop.placeId);
  const storedStorySlides = sanitizeFeedStorySlides(
    json<unknown>(course.feed_story, []),
    photos,
    stopRestaurantIds,
  );
  // Preserve an empty persisted story as empty. The browser owns the legacy
  // presentation fallback because it also has the title, caption and stop
  // labels needed to build useful default overlays. Returning empty-overlay
  // slides here would look "persisted" to the client and suppress that fallback.
  const storySlides = storedStorySlides;
  const photoAttributions = attributionRows.flatMap((row) => {
    if (!photoSet.has(row.r2_path)) return [];
    if (
      row.classification === "restaurant" &&
      (!row.restaurant_id || !stopRestaurantIds.includes(row.restaurant_id))
    ) return [];
    return [{
      r2Path: row.r2_path,
      classification: row.classification === "restaurant" ? "restaurant" as const : "other" as const,
      ...(row.classification === "restaurant" && row.restaurant_id
        ? { restaurantId: row.restaurant_id }
        : {}),
      source: row.classification === "restaurant"
        && (row.attribution_source === "gps_suggestion" || row.attribution_source === "user_selected")
        ? row.attribution_source
        : "other" as const,
    }];
  });

  return {
    id: `post_${course.id}`,
    courseId: course.id,
    creatorId: course.author_id,
    authorName: course.author_name || null,
    authorImage: course.author_image || null,
    title: course.title,
    description: course.description,
    heroImage,
    photos,
    decor,
    storySlides,
    photoAttributions,
    templateId: course.template_id || null,
    tags: json<string[]>(course.tags, []),
    stops,
    likesCount: Number(course.likes_count ?? 0),
    savesCount: Number(course.saves_count ?? 0),
    commentsCount: Number(course.comments_count ?? 0),
    comments: commentRows.map((comment) => ({
      id: comment.id,
      authorId: comment.author_id,
      authorName: comment.author_name,
      authorEmoji: comment.author_emoji,
      parentId: comment.parent_id,
      text: comment.body,
      createdAt: comment.created_at,
    })),
    createdAt: course.created_at,
  };
}

async function visibleCourse(
  db: EnvBindings["DB"],
  courseId: string,
  viewerId: string | null,
) {
  const course = await db
    .prepare("SELECT * FROM courses WHERE id = ? LIMIT 1")
    .bind(courseId)
    .first<CourseDatabaseRow>();
  if (!course) return null;
  if (!Boolean(course.is_public) && course.author_id !== viewerId) return null;
  return course;
}

async function visibleCourseWithAuthor(
  env: Pick<EnvBindings, "DB">,
  courseId: string,
  viewerId: string | null,
) {
  const course = await visibleCourse(env.DB, courseId, viewerId);
  if (!course) return null;
  const columns = await userColumnNames(env.DB);
  if (!columns.has("username") || !columns.has("profile_image_url"))
    return course;
  const author = await env.DB.prepare(
    "SELECT username, profile_image_url FROM users WHERE id = ? LIMIT 1",
  )
    .bind(course.author_id)
    .first<{ username: string | null; profile_image_url: string | null }>();
  return {
    ...course,
    author_name: author?.username ?? null,
    author_image: author?.profile_image_url ?? null,
  };
}

const courseNotFound = () => ({
  error: "코스를 찾을 수 없습니다.",
  code: "COURSE_NOT_FOUND",
});

// D1 is the canonical saved-course store. Every operation is scoped to the
// signed Google subject; callers cannot list or mutate another user's saves.
app.get("/api/saved-courses", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session)
    return c.json(
      { error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" },
      401,
    );
  c.header("Cache-Control", "private, no-store");

  const columns = await userColumnNames(c.env.DB);
  const hasPublicProfiles =
    columns.has("username") && columns.has("profile_image_url");
  const authorFields = hasPublicProfiles
    ? ", u.username AS author_name, u.profile_image_url AS author_image"
    : "";
  const authorJoin = hasPublicProfiles
    ? " LEFT JOIN users u ON u.id = c.author_id"
    : "";
  const { results } = await c.env.DB.prepare(
    `SELECT sc.course_id AS saved_course_id, sc.created_at AS saved_at, c.*${authorFields}
     FROM saved_courses sc JOIN courses c ON c.id = sc.course_id${authorJoin}
     WHERE sc.user_id = ? AND (c.is_public = 1 OR c.author_id = ?)
     ORDER BY sc.created_at DESC, sc.course_id ASC`,
  )
    .bind(session.sub, session.sub)
    .all<SavedCourseDatabaseRow>();

  const items = await Promise.all(
    results.map(async (row) => {
      const stops = await courseStops(c.env, row.id);
      const [course, post] = await Promise.all([
        Promise.resolve(courseResponse(row, stops)),
        feedResponseForCourse(c.env, row, stops),
      ]);
      return {
        courseId: row.saved_course_id,
        savedAt: isoDate(row.saved_at),
        course,
        post,
      };
    }),
  );

  return c.json({
    items,
    courseIds: items.map((item) => item.courseId),
  });
});

app.put("/api/saved-courses", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session)
    return c.json(
      { error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" },
      401,
    );

  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  const courseId = validCourseId(body?.courseId);
  if (!courseId)
    return c.json(
      { error: "코스 정보가 올바르지 않습니다.", code: "INVALID_COURSE_ID" },
      400,
    );
  if (!(await visibleCourse(c.env.DB, courseId, session.sub)))
    return c.json(courseNotFound(), 404);

  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT OR IGNORE INTO saved_courses (user_id, course_id, created_at) VALUES (?, ?, ?)",
    ).bind(session.sub, courseId, Date.now()),
    c.env.DB.prepare(
      "UPDATE courses SET saves_count = (SELECT COUNT(*) FROM saved_courses WHERE course_id = ?) WHERE id = ?",
    ).bind(courseId, courseId),
  ]);
  return c.json({ courseId, saved: true });
});

app.delete("/api/saved-courses", async (c) => {
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  if (!session)
    return c.json(
      { error: "로그인이 필요합니다.", code: "AUTH_REQUIRED" },
      401,
    );
  const courseId = validCourseId(c.req.query("courseId"));
  if (!courseId)
    return c.json(
      { error: "코스 정보가 올바르지 않습니다.", code: "INVALID_COURSE_ID" },
      400,
    );

  await c.env.DB.batch([
    c.env.DB.prepare(
      "DELETE FROM saved_courses WHERE user_id = ? AND course_id = ?",
    ).bind(session.sub, courseId),
    c.env.DB.prepare(
      "UPDATE courses SET saves_count = (SELECT COUNT(*) FROM saved_courses WHERE course_id = ?) WHERE id = ?",
    ).bind(courseId, courseId),
  ]);
  return c.json({ courseId, saved: false });
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
      const courseStops = await Promise.all(stops.map(async (s: any) => ({
        placeId: s.restaurant_id,
        order: s.order_index,
        startTime: s.start_time || "",
        endTime: s.end_time || "",
        isBookmarked: Boolean(s.is_bookmarked),
        restaurant: {
          id: s.restaurant_id,
          name: s.name,
          category: s.category,
          photos: await filterExistingPhotos(c.env, json<string[]>(s.photos, [])),
          rating: s.rating,
          latitude: s.latitude,
          longitude: s.longitude,
        },
      })));

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
        stops: courseStops,
      });
    }

    return c.json(populatedCourses);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

app.get("/api/courses/:id", async (c) => {
  const courseId = validCourseId(c.req.param("id"));
  if (!courseId)
    return c.json(
      { error: "코스 정보가 올바르지 않습니다.", code: "INVALID_COURSE_ID" },
      400,
    );
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  const course = await visibleCourse(c.env.DB, courseId, session?.sub ?? null);
  if (!course) return c.json(courseNotFound(), 404);
  if (!Boolean(course.is_public))
    c.header("Cache-Control", "private, no-store");
  const stops = await courseStops(c.env, course.id);
  return c.json(courseResponse(course, stops));
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

  const rawIdempotencyKey = c.req.header("Idempotency-Key")?.trim() || "";
  if (!rawIdempotencyKey || rawIdempotencyKey.length > 160) {
    return c.json({
      error: "게시 요청 식별자가 필요합니다.",
      code: "IDEMPOTENCY_KEY_REQUIRED",
    }, 400);
  }
  const idempotencyKey = rawIdempotencyKey;

  const findExistingPublication = async () => {
    return c.env.DB.prepare(
      "SELECT id, author_id, created_at, publish_payload_hash, feed_story FROM courses WHERE author_id = ? AND publish_idempotency_key = ? LIMIT 1",
    ).bind(session.sub, idempotencyKey).first<{
      id: string;
      author_id: string;
      created_at: number | string;
      publish_payload_hash: string | null;
      feed_story: string | null;
    }>();
  };

  let payloadHash = "";
  try {
    const body = await c.req.json<Record<string, unknown>>();
    payloadHash = toBase64Url(new Uint8Array(await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(JSON.stringify(body)),
    )));
    const existingPublication = await findExistingPublication();
    if (existingPublication) {
      if (existingPublication.publish_payload_hash !== payloadHash) {
        return c.json({
          error: "같은 게시 요청 식별자를 다른 내용에 다시 사용할 수 없습니다.",
          code: "IDEMPOTENCY_KEY_REUSED",
        }, 409);
      }
      return c.json({
        id: existingPublication.id,
        authorId: existingPublication.author_id,
        createdAt: existingPublication.created_at,
        storySlides: json<FeedStorySlide[]>(existingPublication.feed_story, []),
        idempotent: true,
      });
    }
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
      `SELECT id, name, category, address, photos FROM restaurants WHERE id IN (${placeholders})`,
    )
      .bind(...restaurantIds)
      .all<{ id: string; name: string; category: string; address: string | null; photos: string | null }>();
    if ((known.results?.length ?? 0) !== restaurantIds.length)
      return c.json({ error: "존재하지 않는 장소가 포함되어 있습니다." }, 400);

    const sourceCourseId = body.sourceCourseId == null
      ? null
      : validCourseId(body.sourceCourseId);
    if (body.sourceCourseId != null && !sourceCourseId) {
      return c.json({ error: "원본 코스 정보가 올바르지 않습니다." }, 400);
    }
    if (sourceCourseId) {
      const visibleSource = await c.env.DB.prepare(
        `SELECT c.id FROM courses c
         LEFT JOIN saved_courses sc ON sc.course_id = c.id AND sc.user_id = ?
         WHERE c.id = ? AND (c.is_public = 1 OR c.author_id = ? OR sc.user_id = ?)
         LIMIT 1`,
      ).bind(session.sub, sourceCourseId, session.sub, session.sub).first<{ id: string }>();
      if (!visibleSource) {
        return c.json({ error: "원본 코스를 사용할 권한이 없습니다." }, 403);
      }
    }
    const knownById = new Map((known.results ?? []).map((row) => [row.id, row]));
    const sourceStopsSnapshot = restaurantIds.map((restaurantId, index) => {
      const restaurant = knownById.get(restaurantId);
      return {
        placeId: restaurantId,
        order: index + 1,
        name: restaurant?.name ?? "",
        category: restaurant?.category ?? "",
        address: restaurant?.address ?? "",
      };
    });

    const strings = (value: unknown, limit: number) =>
      Array.isArray(value)
        ? value
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim().slice(0, 40))
            .filter(Boolean)
            .slice(0, limit)
        : [];
    const isAuthorUpload = (value: unknown): value is string =>
      typeof value === "string" &&
      value.startsWith(`/photos/uploads/${session.sub}/`) &&
      value.length <= 512;
    // Feed artwork must be an author-uploaded R2 path. Restaurant imagery is
    // recommendation metadata and must never stand in for a user's post.
    const requestedHero =
      isAuthorUpload(body.heroImage)
        ? body.heroImage
        : null;
    // URL은 태그와 달리 잘라내면 안 된다. 과거 generic `strings()`를 써서
    // 40자로 절단된 R2 경로가 다른 사람의 카드에서 깨졌었다.
    const feedPhotos = Array.isArray(body.feedPhotos)
      ? Array.from(
          new Set(
            body.feedPhotos.filter(
              (photo): photo is string =>
                isAuthorUpload(photo),
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
              !isAuthorUpload(raw.src) ||
              !feedPhotos.includes(raw.src)
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
    const decoratedPhotoPaths = new Set(feedDecor.map((photo) => photo.src));
    if (
      !feedPhotos.length ||
      !feedDecor.length ||
      feedPhotos.some((photo) => !decoratedPhotoPaths.has(photo))
    ) {
      return c.json(
        { error: "피드 사진과 배치 정보를 모두 일치시켜 저장해주세요." },
        400,
      );
    }
    const existingFeedPhotos = await filterExistingPhotos(c.env, feedPhotos);
    if (existingFeedPhotos.length !== feedPhotos.length) {
      return c.json(
        { error: "업로드가 완료된 사진만 게시할 수 있습니다." },
        400,
      );
    }
    if (requestedHero && !feedPhotos.includes(requestedHero)) {
      return c.json(
        { error: "대표 사진은 이 게시물의 사진 중에서 선택해주세요." },
        400,
      );
    }
    const storySlides = sanitizeFeedStorySlides(
      body.storySlides,
      feedPhotos,
      restaurantIds,
    );
    const rawAttributions = Array.isArray(body.photoAttributions)
      ? body.photoAttributions
      : [];
    const attributionByPath = new Map<string, {
      r2Path: string;
      classification: "restaurant" | "other";
      restaurantId: string | null;
      source: "gps_suggestion" | "user_selected" | "other";
    }>();
    for (const raw of rawAttributions) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Record<string, unknown>;
      if (!isAuthorUpload(item.r2Path) || !feedPhotos.includes(item.r2Path)) continue;
      const classification = item.classification === "restaurant" ? "restaurant" : "other";
      const restaurantId = typeof item.restaurantId === "string" && restaurantIds.includes(item.restaurantId)
        ? item.restaurantId
        : null;
      if (classification === "restaurant" && !restaurantId) {
        return c.json({ error: "사진은 이 코스에 포함된 식당에만 연결할 수 있습니다." }, 400);
      }
      const source = classification === "restaurant"
        && (item.source === "gps_suggestion" || item.source === "user_selected")
        ? item.source
        : "other";
      attributionByPath.set(item.r2Path, { r2Path: item.r2Path, classification, restaurantId, source });
    }
    const photoAttributions = feedPhotos.map((r2Path) => attributionByPath.get(r2Path) ?? {
      r2Path,
      classification: "other" as const,
      restaurantId: null,
      source: "other" as const,
    });
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
        "INSERT INTO courses (id, author_id, title, description, hero_image, category, region, tags, hashtags, total_distance, total_duration, likes_count, saves_count, comments_count, is_public, feed_photos, feed_decor, feed_story, template_id, source_course_id, source_stops_snapshot, publish_idempotency_key, publish_payload_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
        JSON.stringify(storySlides),
        templateId,
        sourceCourseId,
        JSON.stringify(sourceStopsSnapshot),
        idempotencyKey,
        payloadHash,
        createdAt,
      ),
      ...feedDecor.map((photo: any, index: number) =>
        c.env.DB.prepare(
          "INSERT INTO course_media (id, course_id, r2_path, owner_id, media_source, placement_index, x, y, width, height, rotation, created_at) VALUES (?, ?, ?, ?, 'author_upload', ?, ?, ?, ?, ?, ?, ?)",
        ).bind(
          crypto.randomUUID(),
          id,
          photo.src,
          session.sub,
          index,
          photo.x,
          photo.y,
          photo.w,
          photo.h ?? photo.w,
          photo.rotate,
          createdAt,
        ),
      ),
      ...photoAttributions.map((attribution) =>
        c.env.DB.prepare(
          "INSERT INTO course_photo_attributions (id, course_id, r2_path, restaurant_id, classification, attribution_source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ).bind(
          crypto.randomUUID(),
          id,
          attribution.r2Path,
          attribution.restaurantId,
          attribution.classification,
          attribution.source,
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
    // Opportunistically advance any previous failed R2 cleanup. Every row is
    // reference-checked again after this publication has committed.
    await drainR2MediaDeletionQueue(c.env).catch(() => 0);
    return c.json({ id, authorId: session.sub, createdAt, storySlides }, 201);
  } catch (err: any) {
    const existing = await findExistingPublication();
    if (existing) {
      if (existing.publish_payload_hash === payloadHash) {
        return c.json({
          id: existing.id,
          authorId: existing.author_id,
          createdAt: existing.created_at,
          storySlides: json<FeedStorySlide[]>(existing.feed_story, []),
          idempotent: true,
        });
      }
      // This also covers the concurrent loser after the unique index rejects
      // two different payloads racing with the same idempotency key.
      return c.json({
        error: "같은 게시 요청 키가 다른 내용에 재사용되었습니다.",
        code: "IDEMPOTENCY_KEY_REUSED",
      }, 409);
    }
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
  recommendation_slate_id: string | null;
  status: string;
  deadline_at: number | null;
  created_at: number;
};
const TERMINAL_SESSION_STATUSES = new Set(["CANCELLED", "COMPLETED", "EXPIRED"]);
const sessionStatus = (value: unknown) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";
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
const sessionMemberKey = () =>
  `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
const sessionMemberKeyHash = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
};
const authorizedSessionMember = async (
  db: EnvBindings["DB"],
  sessionId: string,
  userId: string | null,
  memberKey: string | null,
) => {
  if (!userId || !memberKey) return null;
  const member = await db
    .prepare(
      "SELECT user_id, member_secret_hash FROM session_members WHERE session_id = ? AND user_id = ?",
    )
    .bind(sessionId, userId)
    .first<{ user_id: string; member_secret_hash: string | null }>();
  if (!member?.member_secret_hash) return null;
  const suppliedHash = await sessionMemberKeyHash(memberKey);
  return suppliedHash === member.member_secret_hash ? member : null;
};
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
function matchesGroupDiet(
  category: string,
  optionText: unknown,
  menuItems: unknown,
  rawRestrictions: string[],
) {
  const required = rawRestrictions
    .map(normalizeDiet)
    .filter(
      (diet): diet is DietRestriction => Boolean(diet) && isHardRestriction(diet),
    );
  if (!required.length) return true;
  return required.every((restriction) =>
    restaurantSatisfiesDietRestriction(
      { category, dietaryOptions: optionText, menuItems },
      restriction,
    ),
  );
}
// A group slate is intentionally computed once on the server. Ranking averages
// member preference signals, then applies a category-coverage penalty so the
// first seven cards do not collapse into one cuisine. The stable tie-break is
// session-based: identical room state always produces the identical deck.
export function buildSharedSessionDeck(
  sessionId: string,
  restaurants: any[],
  memberRows: any[],
  size = 7,
): Array<{ id: string; score: number; position: number }> {
  const memberPreferences = memberRows.map((member) => new Map(
    sessionPreferences(member.preferences_json)
      .map((preference) => [preference.category, preference.score]),
  ));
  const averagePreferenceFor = (category: string) => {
    if (!memberPreferences.length) return 0.35;
    // A neutral fallback means a member without an explicit category signal
    // neither vetoes nor silently boosts a cuisine. Crucially, calculate this
    // per restaurant: summing category scores while iterating candidates made
    // categories with more catalogue entries unfairly dominate the group deck.
    return memberPreferences.reduce(
      (total, preferences) => total + (preferences.get(category) ?? 0.35),
      0,
    ) / memberPreferences.length;
  };
  const hash = (value: string) => {
    let result = 2166136261;
    for (let index = 0; index < value.length; index++)
      result = Math.imul(result ^ value.charCodeAt(index), 16777619);
    return (result >>> 0) / 0xffffffff;
  };
  const remaining = restaurants.map((restaurant) => ({
    restaurant,
    score:
      averagePreferenceFor(restaurant.category) +
      Math.min(1, Number(restaurant.rating ?? 0) / 5) * 0.15 +
      hash(`${sessionId}:${restaurant.id}`) * 0.03,
  }));
  const selected: Array<{ restaurant: any; selectionScore: number }> = [];
  const categoryCount = new Map<string, number>();
  while (remaining.length && selected.length < size) {
    remaining.sort(
      (a, b) =>
        b.score -
          (categoryCount.get(b.restaurant.category) ?? 0) * 0.22 -
          (a.score - (categoryCount.get(a.restaurant.category) ?? 0) * 0.22) ||
        a.restaurant.id.localeCompare(b.restaurant.id),
    );
    const next = remaining.shift()!;
    selected.push({
      restaurant: next.restaurant,
      selectionScore: next.score - (categoryCount.get(next.restaurant.category) ?? 0) * 0.22,
    });
    categoryCount.set(
      next.restaurant.category,
      (categoryCount.get(next.restaurant.category) ?? 0) + 1,
    );
  }
  return selected.map(({ restaurant, selectionScore }, position) => ({
    id: restaurant.id,
    score: Number(selectionScore.toFixed(4)),
    position,
  }));
}

// Each impression row binds 12 values. D1 allows at most 100 bound parameters
// per statement, so eight rows keep a multi-row INSERT safely below the limit.
// At 30 participants and a seven-card deck this produces 27 INSERT statements
// instead of 210 one-row statements.
export const SESSION_IMPRESSION_ROWS_PER_STATEMENT = 8;

export function chunkSessionImpressionRows<T>(rows: T[]): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += SESSION_IMPRESSION_ROWS_PER_STATEMENT)
    chunks.push(rows.slice(index, index + SESSION_IMPRESSION_ROWS_PER_STATEMENT));
  return chunks;
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
      emoji: normalizeLunchieSessionAvatar(member.emoji),
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
  const emoji = normalizeLunchieSessionAvatar(nullableText(body.emoji, 16));
  const groupSize =
    typeof body.groupSize === "number" && Number.isFinite(body.groupSize)
      ? normalizeQuickMatchPartySize(Math.floor(body.groupSize))
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
    const memberKey = sessionMemberKey();
    const memberSecretHash = await sessionMemberKeyHash(memberKey);
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
          "INSERT INTO session_members (id, session_id, user_id, user_name, emoji, is_ready, preferences_json, member_secret_hash, joined_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)",
        ).bind(
          crypto.randomUUID(),
          id,
          hostId,
          hostName,
          emoji,
          JSON.stringify({ categories: hostPreferences, dietary: hostDietary }),
          memberSecretHash,
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
        recommendation_slate_id: null,
        status: "WAITING",
        deadline_at: null,
        created_at: createdAt,
      };
      return c.json({ session: sessionPayload(session), token, memberKey }, 201);
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
  const slate = session.recommendation_slate_id
    ? await c.env.DB.prepare(
      "SELECT id, policy_version, items_json FROM recommendation_slates WHERE id = ? AND session_id = ?",
    ).bind(session.recommendation_slate_id, session.id).first<{ id: string; policy_version: string; items_json: string }>()
    : null;
  return c.json({
    session: sessionPayload(session),
    members: members.map((member: any) => ({
      ...member,
      emoji: normalizeLunchieSessionAvatar(member.emoji),
    })),
    slate: slate ? {
      id: slate.id,
      policy_version: slate.policy_version,
      items: json<Array<{ restaurant_id: string; position: number; score: number; propensity: number }>>(slate.items_json, []),
    } : null,
  });
});

app.post("/api/sessions/:token/join", async (c) => {
  const token = c.req.param("token").trim().toUpperCase();
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const userId = nullableText(body.userId, 256);
  const userName = nullableText(body.userName, 80);
  const emoji = normalizeLunchieSessionAvatar(nullableText(body.emoji, 16));
  const preferences = Array.isArray(body.preferences)
    ? sessionPreferences(JSON.stringify(body.preferences)).slice(0, 20)
    : [];
  const dietary = Array.isArray(body.dietary)
    ? body.dietary
        .filter((item): item is string => typeof item === "string")
        .slice(0, 12)
    : [];
  const suppliedMemberKey = nullableText(body.memberKey, 256);
  if (!userId || !userName)
    return c.json({ error: "참여자 정보가 필요합니다." }, 400);
  const session = await c.env.DB.prepare(
    "SELECT id, group_size, status FROM sessions WHERE share_token = ?",
  )
    .bind(token)
    .first<{ id: string; group_size: number; status: string }>();
  if (!session)
    return c.json({ error: "세션을 찾을 수 없거나 만료되었습니다." }, 404);
  const existing = await c.env.DB.prepare(
    "SELECT id, member_secret_hash FROM session_members WHERE session_id = ? AND user_id = ?",
  )
    .bind(session.id, userId)
    .first<{ id: string; member_secret_hash: string | null }>();
  const currentStatus = sessionStatus(session.status);
  if (TERMINAL_SESSION_STATUSES.has(currentStatus))
    return c.json({ error: "이미 종료된 세션입니다.", code: `SESSION_${currentStatus}` }, 410);
  if (currentStatus !== "WAITING" && !existing)
    return c.json({ error: "이미 투표가 시작된 세션입니다.", code: "SESSION_STARTED" }, 409);
  if (existing) {
    if (
      !suppliedMemberKey ||
      !existing.member_secret_hash ||
      (await sessionMemberKeyHash(suppliedMemberKey)) !== existing.member_secret_hash
    ) {
      return c.json(
        { error: "이 기기의 세션 자격 증명을 확인할 수 없습니다.", code: "MEMBER_CREDENTIAL_REQUIRED" },
        403,
      );
    }
    await c.env.DB.prepare(
      "UPDATE session_members SET user_name = ?, emoji = ?, preferences_json = ? WHERE session_id = ? AND user_id = ?",
    )
      .bind(
        userName,
        emoji,
        JSON.stringify({ categories: preferences, dietary }),
        session.id,
        userId,
      )
      .run();
    return c.json({ ok: true, memberKey: suppliedMemberKey });
  }

  // Capacity is checked inside the INSERT statement. A separate COUNT then
  // INSERT lets two simultaneous invitees both observe the final free seat.
  // D1/SQLite serializes this statement, so only one insertion can win it.
  const preferencesJson = JSON.stringify({ categories: preferences, dietary });
  const memberKey = sessionMemberKey();
  const memberSecretHash = await sessionMemberKeyHash(memberKey);
  const inserted = await c.env.DB.prepare(
    "INSERT INTO session_members (id, session_id, user_id, user_name, emoji, is_ready, preferences_json, member_secret_hash, joined_at) SELECT ?, ?, ?, ?, ?, 0, ?, ?, ? WHERE (SELECT COUNT(*) FROM session_members WHERE session_id = ?) < ?",
  )
    .bind(
      crypto.randomUUID(),
      session.id,
      userId,
      userName,
      emoji,
      preferencesJson,
      memberSecretHash,
      Date.now(),
      session.id,
      session.group_size,
    )
    .run();
  if ((inserted.meta?.changes ?? 0) === 0) {
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
  return c.json({ ok: true, memberKey });
});

app.post("/api/sessions/:token/cancel", async (c) => {
  const token = c.req.param("token").trim().toUpperCase();
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const userId = nullableText(body.userId, 256);
  const memberKey = nullableText(body.memberKey, 256);
  if (!userId) return c.json({ error: "사용자 정보가 필요합니다." }, 400);
  const session = await c.env.DB.prepare(
    "SELECT id, host_user_id, status FROM sessions WHERE share_token = ?",
  )
    .bind(token)
    .first<Pick<SessionRow, "id" | "host_user_id" | "status">>();
  if (!session) return c.json({ error: "세션을 찾을 수 없습니다." }, 404);
  if (session.host_user_id !== userId)
    return c.json({ error: "세션 취소는 호스트만 할 수 있습니다.", code: "HOST_ONLY" }, 403);
  if (!(await authorizedSessionMember(c.env.DB, session.id, userId, memberKey)))
    return c.json({ error: "호스트 자격 증명을 확인할 수 없습니다.", code: "INVALID_MEMBER_CREDENTIAL" }, 403);
  const currentStatus = sessionStatus(session.status);
  if (currentStatus === "CANCELLED") return c.json({ ok: true, alreadyCancelled: true });
  if (currentStatus === "COMPLETED" || currentStatus === "EXPIRED")
    return c.json({ error: "이미 종료된 세션입니다.", code: `SESSION_${currentStatus}` }, 409);
  await c.env.DB.prepare("UPDATE sessions SET status = 'CANCELLED' WHERE id = ?")
    .bind(session.id)
    .run();
  return c.json({ ok: true });
});

app.post("/api/sessions/:token/leave", async (c) => {
  const token = c.req.param("token").trim().toUpperCase();
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const userId = nullableText(body.userId, 256);
  const memberKey = nullableText(body.memberKey, 256);
  if (!userId) return c.json({ error: "사용자 정보가 필요합니다." }, 400);
  const session = await c.env.DB.prepare(
    "SELECT id, host_user_id, status FROM sessions WHERE share_token = ?",
  )
    .bind(token)
    .first<Pick<SessionRow, "id" | "host_user_id" | "status">>();
  if (!session) return c.json({ error: "세션을 찾을 수 없습니다." }, 404);
  if (session.host_user_id === userId)
    return c.json({ error: "호스트는 세션을 취소해야 합니다.", code: "HOST_MUST_CANCEL" }, 409);
  if (TERMINAL_SESSION_STATUSES.has(sessionStatus(session.status)))
    return c.json({ ok: true, alreadyEnded: true });
  const existingMember = await c.env.DB.prepare(
    "SELECT user_id, member_secret_hash FROM session_members WHERE session_id = ? AND user_id = ?",
  )
    .bind(session.id, userId)
    .first<{ user_id: string; member_secret_hash: string | null }>();
  if (!existingMember) return c.json({ ok: true, alreadyLeft: true });
  if (
    !memberKey ||
    !existingMember.member_secret_hash ||
    (await sessionMemberKeyHash(memberKey)) !== existingMember.member_secret_hash
  )
    return c.json({ error: "참여자 자격 증명을 확인할 수 없습니다.", code: "INVALID_MEMBER_CREDENTIAL" }, 403);
  const result = await c.env.DB.prepare(
    "DELETE FROM session_members WHERE session_id = ? AND user_id = ?",
  )
    .bind(session.id, userId)
    .run();
  return c.json({ ok: true, alreadyLeft: (result.meta?.changes ?? 0) === 0 });
});

app.post("/api/sessions/:token/ready", async (c) => {
  const token = c.req.param("token").trim().toUpperCase();
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}));
  const userId = nullableText(body.userId, 256);
  const memberKey = nullableText(body.memberKey, 256);
  if (!userId || typeof body.isReady !== "boolean")
    return c.json({ error: "준비 상태 정보가 필요합니다." }, 400);
  const session = await c.env.DB.prepare(
    "SELECT id, status FROM sessions WHERE share_token = ?",
  )
    .bind(token)
    .first<{ id: string; status: string }>();
  if (!session) return c.json({ error: "세션을 찾을 수 없습니다." }, 404);
  if (sessionStatus(session.status) !== "WAITING")
    return c.json({ error: "대기 중인 세션에서만 준비 상태를 바꿀 수 있습니다." }, 409);
  if (!(await authorizedSessionMember(c.env.DB, session.id, userId, memberKey)))
    return c.json({ error: "참여자 자격 증명을 확인할 수 없습니다.", code: "INVALID_MEMBER_CREDENTIAL" }, 403);
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
  if (status !== "SWIPING_1")
    return c.json({ error: "지원하지 않는 세션 상태입니다." }, 400);
  const userId = nullableText(body.userId, 256);
  const memberKey = nullableText(body.memberKey, 256);
  const session = await c.env.DB.prepare(
    "SELECT * FROM sessions WHERE share_token = ?",
  )
    .bind(token)
    .first<SessionRow>();
  if (!session) return c.json({ error: "세션을 찾을 수 없습니다." }, 404);
  if (status === "SWIPING_1") {
    if (!userId || userId !== session.host_user_id)
      return c.json({ error: "세션 시작은 호스트만 할 수 있습니다." }, 403);
    if (!(await authorizedSessionMember(c.env.DB, session.id, userId, memberKey)))
      return c.json({ error: "호스트 자격 증명을 확인할 수 없습니다.", code: "INVALID_MEMBER_CREDENTIAL" }, 403);
    const currentStatus = sessionStatus(session.status);
    // Starting twice must preserve both the shared deck and its attribution
    // identity. Replacing it after people began swiping would corrupt the
    // evidence chain.
    if (currentStatus === "SWIPING_1") return c.json({ ok: true, alreadyStarted: true, already_started: true });
    if (currentStatus !== "WAITING")
      return c.json({ error: "종료되거나 취소된 세션은 시작할 수 없습니다.", code: `SESSION_${currentStatus}` }, 409);
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
      "SELECT id, category, rating, price_level, dietary_options, menus, latitude, longitude FROM restaurants",
    ).all();
    const presentationPhotos = await lunchiePresentationPhotosByRestaurant(
      c.env.DB,
      (catalogue as any[]).map((restaurant) => String(restaurant.id)),
    );
    const menuEvidence = await indexedMenuEvidenceByRestaurant(
      c.env.DB,
      (catalogue as any[]).map((restaurant) => String(restaurant.id)),
    );
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
    const eligibleCatalogue = (catalogue as any[]).filter(
      (restaurant) =>
        (presentationPhotos.get(String(restaurant.id))?.length ?? 0) >=
          MIN_LUNCHIE_PRESENTATION_PHOTOS &&
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
        matchesMenuBudget(menuEvidence.get(restaurant.id), Number(session.filter_budget)),
    );
    let pool = eligibleCatalogue.filter(
      (restaurant) =>
        matchesGroupDiet(
          restaurant.category,
          menuEvidence.get(restaurant.id)?.dietary ?? json<string[]>(restaurant.dietary_options, []),
          restaurant.menus,
          requiredDietary,
        ),
    );
    // Never fall back to the full catalogue: that would silently violate a
    // user's explicit meal/cafe/dessert, category, budget, or dietary choice.
    const normalizedDietary = requiredDietary
      .map(normalizeDiet)
      .filter((restriction): restriction is DietRestriction => restriction !== null && isHardRestriction(restriction));
    if (!pool.length && normalizedDietary.some(restriction => !isIngredientAvoidance(restriction))) {
      const ingredientAvoidances = normalizedDietary.filter(isIngredientAvoidance);
      pool = eligibleCatalogue.filter((restaurant) =>
        ingredientAvoidances.every((restriction) =>
            restaurantSatisfiesDietRestriction(
              {
                category: restaurant.category,
                dietaryOptions: menuEvidence.get(restaurant.id)?.dietary ?? json<string[]>(restaurant.dietary_options, []),
                menuItems: restaurant.menus,
            },
            restriction,
          ),
        ),
      );
    }
    if (!(catalogue as any[]).length)
      return c.json({ error: "식당 후보를 준비하지 못했습니다.", code: "CATALOG_EMPTY" }, 409);
    const deck = buildSharedSessionDeck(session.id, pool, members as any[]);
    if (!deck.length)
      return c.json(
        {
          error: Number(session.distance_enabled) !== 0
            ? `${Number(session.filter_distance) >= 1000 ? `${Number(session.filter_distance) / 1000}km` : `${session.filter_distance}m`} 반경 안에 현재 조건과 맞는 식당이 없어요. 반경 또는 조건을 바꿔 주세요.`
            : "현재 조건과 맞는 식당이 없어요. 조건을 바꿔 주세요.",
          code: "NO_ELIGIBLE_RESTAURANTS",
        },
        409,
      );
    const slateId = crypto.randomUUID();
    const now = Date.now();
    const groupContext: RecContext = {
      intent: session.intent,
      budget: Number(session.filter_budget) as 1 | 2 | 3 | 4,
      companions: Number(session.group_size),
      diet: requiredDietary,
    };
    // The group deck is deterministic for the exact member-preference
    // snapshot. Therefore each selected item has conditional inclusion
    // probability 1. It is attributable evidence, but it remains distinct
    // from the exploratory individual policy in `policy_version`.
    const slateItems = deck.map((item) => ({
      restaurant_id: item.id,
      position: item.position,
      score: item.score,
      propensity: 1,
    }));
    const impressionRows = (members as any[]).flatMap((member) => slateItems.map((item) => ({
      id: crypto.randomUUID(),
      slateId,
      userId: member.user_id,
      sessionId: session.id,
      restaurantId: item.restaurant_id,
      position: item.position,
      propensity: item.propensity,
      score: item.score,
      modelVersion: "session-group-deterministic-v1",
      contextJson: JSON.stringify(groupContext),
      idempotencyKey: `session-slate:${slateId}:impression:${member.user_id}:${item.position}`,
      createdAt: now,
    })));
    const impressionStatements = chunkSessionImpressionRows(impressionRows).map((chunk) =>
      c.env.DB.prepare(
        `INSERT INTO rec_events (id, event_type, slate_id, slate_type, user_id, session_id, restaurant_id, position, propensity, score, model_version, variant, context_json, idempotency_key, created_at) VALUES ${chunk.map(() => "(?, 'IMPRESSION', ?, 'PRELIM', ?, ?, ?, ?, ?, ?, ?, 'group', ?, ?, ?)").join(", ")}`,
      ).bind(...chunk.flatMap((row) => [
        row.id,
        row.slateId,
        row.userId,
        row.sessionId,
        row.restaurantId,
        row.position,
        row.propensity,
        row.score,
        row.modelVersion,
        row.contextJson,
        row.idempotencyKey,
        row.createdAt,
      ])),
    );
    await c.env.DB.batch([
      c.env.DB.prepare(
        "UPDATE sessions SET top_restaurant_ids = ?, recommendation_slate_id = ? WHERE id = ?",
      ).bind(JSON.stringify(deck.map((item) => item.id)), slateId, session.id),
      c.env.DB.prepare(
        "INSERT INTO recommendation_slates (id, owner_user_id, session_id, slate_type, policy_version, variant, context_json, items_json, candidate_count, created_at, expires_at) VALUES (?, ?, ?, 'PRELIM', ?, 'group', ?, ?, ?, ?, ?)",
      ).bind(slateId, session.host_user_id, session.id, "session-group-deterministic-v1", JSON.stringify(groupContext), JSON.stringify(slateItems), pool.length, now, now + 24 * 60 * 60 * 1000),
      ...impressionStatements,
    ]);
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
  const now = Date.now();
  const requestId = nullableText(body.id, 128) ?? crypto.randomUUID();
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
            requestId,
            sessionId,
            userId,
            restaurantId,
            round,
            action,
            now,
          ),
        ]
      : [
          c.env.DB.prepare(
            "INSERT OR IGNORE INTO swipes (id, session_id, user_id, restaurant_id, round, swipe_action, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          ).bind(
            requestId,
            sessionId,
            userId,
            restaurantId,
            round,
            action,
            now,
          ),
        ];
  // 예선 선택은 UX용 swipes와 평가용 rec_events에 같은 요청으로 기록한다.
  // 클라이언트의 pagehide/beacon 성공 여부가 학습 근거 수를 바꾸면 안 된다.
  if (!isSignal && round % 2 === 1) {
    const evidence = await c.env.DB.prepare(
      "SELECT sess.recommendation_slate_id AS slate_id, s.policy_version, s.variant, s.context_json, json_extract(item.value, '$.position') AS position, json_extract(item.value, '$.propensity') AS propensity, json_extract(item.value, '$.score') AS score FROM sessions sess JOIN recommendation_slates s ON s.id = sess.recommendation_slate_id, json_each(s.items_json) AS item WHERE sess.id = ? AND json_extract(item.value, '$.restaurant_id') = ? LIMIT 1",
    ).bind(sessionId, restaurantId).first<{
      slate_id: string;
      policy_version: string | null;
      variant: string | null;
      context_json: string | null;
      position: number | null;
      propensity: number | null;
      score: number | null;
    }>();
    if (evidence) {
      statements.push(
        c.env.DB.prepare(
          "INSERT OR IGNORE INTO rec_events (id, event_type, slate_id, slate_type, user_id, session_id, restaurant_id, round, position, action, propensity, score, model_version, variant, context_json, idempotency_key, created_at) VALUES (?, 'SWIPE', ?, 'PRELIM', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ).bind(
          crypto.randomUUID(),
          evidence.slate_id,
          userId,
          sessionId,
          restaurantId,
          round,
          evidence.position,
          action === "DISLIKE" ? "NOPE" : action,
          evidence.propensity,
          evidence.score,
          evidence.policy_version,
          evidence.variant,
          evidence.context_json,
          `session-swipe:${sessionId}:${userId}:${restaurantId}:${round}`,
          now,
        ),
      );
    }
  }
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

// 수정과 삭제는 UI의 버튼 노출만으로 판단하지 않는다. 수정은 작성자만 가능하고,
// 삭제는 작성자 또는 ADMIN_EMAILS에 등록된 운영자만 가능하다.
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
    feedPhotos?: unknown;
    feedDecor?: unknown;
    templateId?: unknown;
    storySlides?: unknown;
    photoAttributions?: unknown;
  }>();
  const caption = body.caption?.trim().slice(0, 2_000);
  if (!body.courseId || !caption)
    return c.json({ error: "게시물과 한줄평을 입력해주세요." }, 400);
  const owned = await c.env.DB.prepare(
    "SELECT id, author_id, hero_image, feed_photos, feed_decor, feed_story, template_id FROM courses WHERE id = ? AND author_id = ? AND is_public = 1",
  )
    .bind(body.courseId, session.sub)
    .first<Pick<
      CourseDatabaseRow,
      "id" | "author_id" | "hero_image" | "feed_photos" | "feed_decor" | "feed_story" | "template_id"
    >>();
  if (!owned) return c.json({ error: "수정 권한이 없습니다." }, 403);

  const [
    { results: mediaRows },
    { results: stopRows },
    { results: currentAttributionRows },
  ] = await Promise.all([
    c.env.DB.prepare(
      "SELECT r2_path, owner_id, media_source, placement_index, x, y, width, height, rotation FROM course_media WHERE course_id = ? ORDER BY placement_index",
    ).bind(body.courseId).all<CourseMediaDatabaseRow>(),
    c.env.DB.prepare(
      "SELECT restaurant_id FROM course_items WHERE course_id = ? ORDER BY order_index",
    ).bind(body.courseId).all<{ restaurant_id: string }>(),
    c.env.DB.prepare(
      "SELECT r2_path, restaurant_id, classification, attribution_source FROM course_photo_attributions WHERE course_id = ? ORDER BY r2_path",
    ).bind(body.courseId).all<CoursePhotoAttributionDatabaseRow>(),
  ]);
  const ownerPrefix = `/photos/uploads/${session.sub}/`;
  const validAuthorPath = (value: unknown): value is string =>
    typeof value === "string" && value.startsWith(ownerPrefix) && value.length <= 512;
  const canonicalMediaRows = mediaRows.filter((media) => mediaBelongsToCourse(owned, media));
  const canonicalMediaPaths = Array.from(new Set(canonicalMediaRows.map((media) => media.r2_path)));
  const storedPhotoOrder = json<string[]>(owned.feed_photos, []);
  const canonicalMediaSet = new Set(canonicalMediaPaths);
  const currentPhotos = canonicalMediaRows.length > 0
    ? Array.from(new Set([
        ...storedPhotoOrder.filter((photo) => canonicalMediaSet.has(photo)),
        ...canonicalMediaPaths.filter((photo) => !storedPhotoOrder.includes(photo)),
      ])).slice(0, MAX_MUNCHIE_FEED_PHOTOS)
    : Array.from(new Set(storedPhotoOrder.filter(validAuthorPath)))
        .slice(0, MAX_MUNCHIE_FEED_PHOTOS);

  const hasFeedPhotos = Object.prototype.hasOwnProperty.call(body, "feedPhotos");
  const hasFeedDecor = Object.prototype.hasOwnProperty.call(body, "feedDecor");
  if (hasFeedPhotos !== hasFeedDecor) {
    return c.json({ error: "사진과 배치 정보는 함께 저장해야 합니다." }, 400);
  }
  const replacingMedia = hasFeedPhotos && hasFeedDecor;
  let nextPhotos = currentPhotos;
  let nextDecor = json<Array<{
    id: string;
    src: string;
    x: number;
    y: number;
    w: number;
    h: number;
    rotate: number;
  }>>(owned.feed_decor, []);
  const attributionOriginByNextPhoto = new Map<string, string>();

  if (replacingMedia) {
    if (
      !Array.isArray(body.feedPhotos) ||
      !Array.isArray(body.feedDecor) ||
      body.feedPhotos.length < 1 ||
      body.feedPhotos.length > MAX_MUNCHIE_FEED_PHOTOS ||
      body.feedDecor.length < 1 ||
      body.feedDecor.length > MAX_MUNCHIE_FEED_PHOTOS
    ) {
      return c.json({ error: "사진은 1~6장까지 저장할 수 있습니다." }, 400);
    }
    const requestedPhotos = body.feedPhotos;
    if (!requestedPhotos.every(validAuthorPath))
      return c.json({ error: "본인이 업로드한 사진만 저장할 수 있습니다." }, 400);
    nextPhotos = Array.from(new Set(requestedPhotos));
    if (nextPhotos.length !== requestedPhotos.length)
      return c.json({ error: "중복된 사진은 한 번만 저장해주세요." }, 400);
    const nextPhotoSet = new Set(nextPhotos);
    nextDecor = body.feedDecor.flatMap((raw, index) => {
      if (!raw || typeof raw !== "object") return [];
      const item = raw as Record<string, unknown>;
      if (!validAuthorPath(item.src) || !nextPhotoSet.has(item.src)) return [];
      if (
        validAuthorPath(item.originalSrc) &&
        canonicalMediaSet.has(item.originalSrc)
      ) {
        attributionOriginByNextPhoto.set(item.src, item.originalSrc);
      }
      return [{
        id: boundedStoryText(item.id, 120) ?? `photo_${index}`,
        src: item.src,
        x: boundedStoryNumber(item.x, 50, 0, 100),
        y: boundedStoryNumber(item.y, 50, 0, 100),
        w: boundedStoryNumber(item.w, 40, 5, 100),
        h: boundedStoryNumber(item.h, boundedStoryNumber(item.w, 40, 5, 100), 5, 100),
        rotate: boundedStoryNumber(item.rotate, 0, -180, 180),
      }];
    });
    const decoratedPaths = new Set(nextDecor.map((item) => item.src));
    if (
      nextDecor.length !== body.feedDecor.length ||
      nextPhotos.some((photo) => !decoratedPaths.has(photo))
    ) {
      return c.json({ error: "피드 사진과 배치 정보가 일치하지 않습니다." }, 400);
    }
    const existingNextPhotos = await filterExistingPhotos(c.env, nextPhotos);
    if (existingNextPhotos.length !== nextPhotos.length) {
      return c.json({ error: "업로드가 완료된 사진만 저장할 수 있습니다." }, 400);
    }
  }
  const removedCanonicalPhotoPaths = replacingMedia
    ? canonicalMediaPaths.filter((photo) => (
        validAuthorPath(photo) && !nextPhotos.includes(photo)
      ))
    : [];

  const stopRestaurantIds = stopRows.map((row) => row.restaurant_id);
  const stopRestaurantSet = new Set(stopRestaurantIds);
  const attributionWasSupplied = Object.prototype.hasOwnProperty.call(
    body,
    "photoAttributions",
  );
  const replacingAttributions = replacingMedia || attributionWasSupplied;
  let nextPhotoAttributions: Array<{
    r2Path: string;
    restaurantId: string | null;
    classification: "restaurant" | "other";
    source: "gps_suggestion" | "user_selected" | "other";
  }> | null = null;
  if (replacingAttributions) {
    const currentAttributionByPath = new Map(
      currentAttributionRows.map((row) => [row.r2_path, row]),
    );
    const suppliedAttributionByPath = new Map<string, {
      r2Path: string;
      restaurantId: string | null;
      classification: "restaurant" | "other";
      source: "gps_suggestion" | "user_selected" | "other";
    }>();
    if (attributionWasSupplied) {
      if (
        !Array.isArray(body.photoAttributions) ||
        body.photoAttributions.length > MAX_MUNCHIE_FEED_PHOTOS
      ) {
        return c.json({ error: "사진 귀속 정보가 올바르지 않습니다." }, 400);
      }
      for (const raw of body.photoAttributions) {
        if (!raw || typeof raw !== "object")
          return c.json({ error: "사진 귀속 정보가 올바르지 않습니다." }, 400);
        const item = raw as Record<string, unknown>;
        if (!validAuthorPath(item.r2Path) || !nextPhotos.includes(item.r2Path))
          return c.json({ error: "이 게시물의 사진만 식당에 연결할 수 있습니다." }, 400);
        if (suppliedAttributionByPath.has(item.r2Path))
          return c.json({ error: "사진 귀속 정보가 중복되었습니다." }, 400);
        if (item.classification !== "restaurant" && item.classification !== "other")
          return c.json({ error: "사진 분류 정보가 올바르지 않습니다." }, 400);
        const classification = item.classification;
        const restaurantId = classification === "restaurant"
          && typeof item.restaurantId === "string"
          && stopRestaurantSet.has(item.restaurantId)
          ? item.restaurantId
          : null;
        if (classification === "restaurant" && !restaurantId) {
          return c.json({ error: "사진은 이 코스에 포함된 식당에만 연결할 수 있습니다." }, 400);
        }
        const source = classification === "other"
          ? "other" as const
          : item.source === "gps_suggestion" || item.source === "user_selected"
            ? item.source
            : "other" as const;
        suppliedAttributionByPath.set(item.r2Path, {
          r2Path: item.r2Path,
          restaurantId,
          classification,
          source,
        });
      }
    }
    nextPhotoAttributions = nextPhotos.map((r2Path) => {
      const supplied = suppliedAttributionByPath.get(r2Path);
      if (supplied) return supplied;
      const originalPath = attributionOriginByNextPhoto.get(r2Path) ?? r2Path;
      const existing = currentAttributionByPath.get(originalPath);
      if (
        existing?.classification === "restaurant" &&
        existing.restaurant_id &&
        stopRestaurantSet.has(existing.restaurant_id)
      ) {
        return {
          r2Path,
          restaurantId: existing.restaurant_id,
          classification: "restaurant" as const,
          source: existing.attribution_source,
        };
      }
      return {
        r2Path,
        restaurantId: null,
        classification: "other" as const,
        source: "other" as const,
      };
    });
  }
  const storyWasSupplied = Object.prototype.hasOwnProperty.call(body, "storySlides");
  const nextStorySlides = storyWasSupplied || replacingMedia
    ? sanitizeFeedStorySlides(
        storyWasSupplied ? body.storySlides : json<unknown>(owned.feed_story, []),
        nextPhotos,
        stopRestaurantIds,
      )
    : null;
  let nextHeroImage = owned.hero_image;
  if (Object.prototype.hasOwnProperty.call(body, "heroImage")) {
    if (!validAuthorPath(body.heroImage) || !nextPhotos.includes(body.heroImage))
      return c.json({ error: "대표 사진은 이 게시물의 사진 중에서 선택해주세요." }, 400);
    nextHeroImage = body.heroImage;
  } else if (replacingMedia && (!nextHeroImage || !nextPhotos.includes(nextHeroImage))) {
    nextHeroImage = nextPhotos[0] ?? null;
  }
  let nextTemplateId = owned.template_id;
  if (Object.prototype.hasOwnProperty.call(body, "templateId")) {
    if (body.templateId !== null && typeof body.templateId !== "string")
      return c.json({ error: "템플릿 정보가 올바르지 않습니다." }, 400);
    nextTemplateId = typeof body.templateId === "string"
      ? body.templateId.trim().slice(0, 80) || null
      : null;
  }

  const statements = [
    c.env.DB.prepare(
      "UPDATE courses SET description = ?, hero_image = ?, feed_photos = ?, feed_decor = ?, feed_story = ?, template_id = ? WHERE id = ?",
    ).bind(
      caption,
      nextHeroImage,
      replacingMedia ? JSON.stringify(nextPhotos) : owned.feed_photos,
      replacingMedia ? JSON.stringify(nextDecor) : owned.feed_decor,
      nextStorySlides ? JSON.stringify(nextStorySlides) : owned.feed_story,
      nextTemplateId,
      body.courseId,
    ),
  ];
  if (replacingMedia) {
    statements.push(
      c.env.DB.prepare("DELETE FROM course_media WHERE course_id = ?").bind(body.courseId),
      ...nextDecor.map((photo, index) =>
        c.env.DB.prepare(
          "INSERT INTO course_media (id, course_id, r2_path, owner_id, media_source, placement_index, x, y, width, height, rotation, created_at) VALUES (?, ?, ?, ?, 'author_upload', ?, ?, ?, ?, ?, ?, ?)",
        ).bind(
          crypto.randomUUID(),
          body.courseId,
          photo.src,
          session.sub,
          index,
          photo.x,
          photo.y,
          photo.w,
          photo.h,
          photo.rotate,
          Date.now(),
        ),
      ),
    );
  }
  if (nextPhotoAttributions) {
    const attributionCreatedAt = Date.now();
    statements.push(
      c.env.DB.prepare(
        "DELETE FROM course_photo_attributions WHERE course_id = ?",
      ).bind(body.courseId),
      ...nextPhotoAttributions.map((attribution) =>
        c.env.DB.prepare(
          "INSERT INTO course_photo_attributions (id, course_id, r2_path, restaurant_id, classification, attribution_source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ).bind(
          crypto.randomUUID(),
          body.courseId,
          attribution.r2Path,
          attribution.restaurantId,
          attribution.classification,
          attribution.source,
          attributionCreatedAt,
        ),
      ),
    );
  }
  const responsePhotoAttributions = nextPhotoAttributions ?? currentAttributionRows.flatMap((row) => {
    if (!nextPhotos.includes(row.r2_path)) return [];
    if (
      row.classification === "restaurant" &&
      (!row.restaurant_id || !stopRestaurantSet.has(row.restaurant_id))
    ) return [];
    return [{
      r2Path: row.r2_path,
      restaurantId: row.classification === "restaurant" ? row.restaurant_id : null,
      classification: row.classification === "restaurant" ? "restaurant" as const : "other" as const,
      source: row.classification === "restaurant" &&
        (row.attribution_source === "gps_suggestion" || row.attribution_source === "user_selected")
        ? row.attribution_source
        : "other" as const,
    }];
  });
  if (removedCanonicalPhotoPaths.length > 0) {
    const queuedAt = Date.now();
    statements.push(...removedCanonicalPhotoPaths.map((path) =>
      c.env.DB.prepare(
        "INSERT OR IGNORE INTO r2_media_deletions (r2_path, owner_id, attempts, created_at) VALUES (?, ?, 0, ?)",
      ).bind(path, session.sub, queuedAt)
    ));
  }
  await c.env.DB.batch(statements);
  const mediaCleanupPending = removedCanonicalPhotoPaths.length > 0
    ? await drainR2MediaDeletionQueue(c.env, removedCanonicalPhotoPaths)
        .catch(() => removedCanonicalPhotoPaths.length)
    : 0;
  return c.json({
    ok: true,
    feedPhotos: nextPhotos,
    feedDecor: nextDecor,
    storySlides: nextStorySlides ?? sanitizeFeedStorySlides(
      json<unknown>(owned.feed_story, []),
      nextPhotos,
      stopRestaurantIds,
    ),
    templateId: nextTemplateId,
    photoAttributions: responsePhotoAttributions,
    mediaCleanupPending,
  });
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
            typeof value === "string" &&
            value.startsWith(`/photos/uploads/${session.sub}/`),
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
            !raw.src.startsWith(`/photos/uploads/${session.sub}/`)
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
        "INSERT INTO course_media (id, course_id, r2_path, owner_id, media_source, placement_index, x, y, width, height, rotation, created_at) VALUES (?, ?, ?, ?, 'author_upload', ?, ?, ?, ?, ?, ?, ?)",
      ).bind(
        crypto.randomUUID(),
        body.courseId,
        photo.src,
        session.sub,
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
  // A feed is its course's public representation. Normal users may delete only
  // their own content; ADMIN_EMAILS grants this delete operation only and does
  // not grant edit ownership.
  const isAdmin = isAdminEmail(session.email, c.env.ADMIN_EMAILS);
  const course = await c.env.DB.prepare(
    "SELECT id, author_id, hero_image, feed_photos, feed_decor FROM courses WHERE id = ?",
  )
    .bind(courseId)
    .first<{
      id: string;
      author_id: string;
      hero_image: string | null;
      feed_photos: string | null;
      feed_decor: string | null;
    }>();
  if (!course) {
    const mediaCleanupPending = await drainR2MediaDeletionQueue(c.env).catch(() => 0);
    return c.json({
      ok: true,
      deletedCourseId: courseId,
      alreadyDeleted: true,
      mediaCleanupPending,
    });
  }
  if (!isAdmin && course.author_id !== session.sub)
    return c.json({ error: "이 게시물을 삭제할 권한이 없습니다." }, 403);
  // Retry one bounded batch of older tombstones before enqueueing this post.
  // The current post is then drained by exact path, so a backlog larger than
  // 25 rows cannot starve its cleanup or produce a false zero response.
  await drainR2MediaDeletionQueue(c.env).catch(() => 0);
  const { results: comments } = await c.env.DB.prepare(
    "SELECT id FROM feed_comments WHERE course_id = ?",
  )
    .bind(courseId)
    .all<{ id: string }>();
  const { results: mediaRows } = await c.env.DB.prepare(
    `SELECT r2_path FROM course_media WHERE course_id = ?
     UNION
     SELECT r2_path FROM course_photo_attributions WHERE course_id = ?`,
  ).bind(courseId, courseId).all<{ r2_path: string }>();
  const legacyDecorPaths = json<Array<{ src?: unknown }>>(course.feed_decor, [])
    .map((item) => item.src)
    .filter((path): path is string => typeof path === "string");
  const authorMediaPaths = Array.from(new Set([
    ...mediaRows.map((row) => row.r2_path),
    course.hero_image,
    ...json<string[]>(course.feed_photos, []),
    ...legacyDecorPaths,
  ].filter((path): path is string => (
    typeof path === "string"
    && path.startsWith(`/photos/uploads/${course.author_id}/`)
  ))));
  const statements = [
    ...authorMediaPaths.map((path) => c.env.DB.prepare(
      "INSERT OR IGNORE INTO r2_media_deletions (r2_path, owner_id, attempts, created_at) VALUES (?, ?, 0, ?)",
    ).bind(path, course.author_id, Date.now())),
    c.env.DB.prepare("DELETE FROM course_photo_attributions WHERE course_id = ?").bind(
      courseId,
    ),
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
    c.env.DB.prepare("DELETE FROM courses WHERE id = ?").bind(courseId),
  ];
  await c.env.DB.batch(statements);
  const mediaCleanupPending = await drainR2MediaDeletionQueue(c.env, authorMediaPaths)
    .catch(() => authorMediaPaths.length);
  return c.json({ ok: true, deletedCourseId: courseId, mediaCleanupPending });
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

// A shared/saved detail must not depend on the viewer's first paginated feed
// batch. The canonical D1 course, author and owner-validated R2 media are
// returned together, with private courses visible only to their owner.
app.get("/api/feed/:id", async (c) => {
  const feedId = c.req.param("id");
  const courseId = validCourseId(
    feedId.startsWith("post_") ? feedId.slice("post_".length) : null,
  );
  if (!courseId)
    return c.json({ error: "피드 정보가 올바르지 않습니다.", code: "INVALID_FEED_ID" }, 400);
  const session = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
  const course = await visibleCourseWithAuthor(c.env, courseId, session?.sub ?? null);
  if (!course) return c.json({ error: "피드를 찾을 수 없습니다.", code: "FEED_NOT_FOUND" }, 404);
  c.header("Cache-Control", "private, no-store");
  const stops = await courseStops(c.env, course.id);
  const [coursePayload, post] = await Promise.all([
    Promise.resolve(courseResponse(course, stops)),
    feedResponseForCourse(c.env, course, stops),
  ]);
  return c.json({ course: coursePayload, post });
});

// REST API — /api/feed (Munchie 피드 개인화 랭킹)
app.get("/api/feed", async (c) => {
  try {
    const requestedLimit = Number(c.req.query("limit"));
    const paged = c.req.query("limit") !== undefined || c.req.query("cursor") !== undefined;
    const pageSize = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(Math.floor(requestedLimit), 20))
      : 8;
    const cursor = Math.max(0, Math.floor(Number(c.req.query("cursor")) || 0));
    const requestedAuthorId = c.req.query("authorId")?.trim() || null;
    if (requestedAuthorId && requestedAuthorId.length > 256)
      return c.json({ error: "작성자 정보가 올바르지 않습니다." }, 400);
    const locationFilter = parseFeedLocationFilter((name) => c.req.query(name));
    const viewer = await readSession(c.req.raw, c.env.AUTH_SESSION_SECRET);
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
    const authorClause = requestedAuthorId ? " AND c.author_id = ?" : "";
    const courseQuery = hasPublicProfiles
      ? `SELECT c.*, u.username AS author_name, u.profile_image_url AS author_image
         FROM courses c LEFT JOIN users u ON u.id = c.author_id
         WHERE c.is_public = 1${authorClause}
         ORDER BY c.created_at DESC, c.id ASC LIMIT 80`
      : `SELECT c.* FROM courses c
         WHERE c.is_public = 1${authorClause}
         ORDER BY c.created_at DESC, c.id ASC LIMIT 80`;
    const courseStatement = c.env.DB.prepare(courseQuery);
    const { results: courses } = requestedAuthorId
      ? await courseStatement.bind(requestedAuthorId).all()
      : await courseStatement.all();

    const feedItems = [];
    for (const course of courses as any[]) {
      const stops = await courseStops(c.env, course.id);
      feedItems.push(await feedResponseForCourse(c.env, course, stops));
    }

    // Preserve the legacy array response for initial/home hydration. The
    // Munchie page opts into a stable, personalised page contract with
    // `limit`/`cursor`; this avoids rendering every post at once.
    const locationItems = locationFilter
      ? feedItems.filter((item) => feedItemMatchesLocation(item, locationFilter))
      : feedItems;
    if (!paged) return c.json(locationItems);

    const categoryAffinity = new Map<string, number>();
    const following = new Set<string>();
    if (viewer && !requestedAuthorId) {
      const [winnerRows, likedRows, followRows] = await Promise.all([
        c.env.DB.prepare(
          "SELECT r.category, COUNT(*) AS count FROM rec_events e JOIN restaurants r ON r.id = e.restaurant_id WHERE e.user_id = ? AND e.event_type IN ('WINNER', 'SWIPE') AND (e.event_type != 'SWIPE' OR e.action = 'LIKE') GROUP BY r.category",
        ).bind(viewer.sub).all<{ category: string; count: number }>(),
        c.env.DB.prepare(
          "SELECT c.tags FROM feed_likes l JOIN courses c ON c.id = l.course_id WHERE l.user_id = ?",
        ).bind(viewer.sub).all<{ tags: string }>(),
        c.env.DB.prepare(
          "SELECT following_id FROM user_follows WHERE follower_id = ?",
        ).bind(viewer.sub).all<{ following_id: string }>(),
      ]);
      for (const row of winnerRows.results)
        categoryAffinity.set(row.category, (categoryAffinity.get(row.category) ?? 0) + Math.min(1, Number(row.count) * 0.2));
      for (const row of likedRows.results)
        for (const tag of json<string[]>(row.tags, []))
          categoryAffinity.set(tag, (categoryAffinity.get(tag) ?? 0) + 0.45);
      for (const row of followRows.results) following.add(row.following_id);
    }
    // A public profile is a canonical author timeline. It must not change
    // because a different viewer has different recommendation preferences.
    const ranked = requestedAuthorId
      ? locationItems
      : rankMunchieFeedItems(locationItems, {
          viewerId: viewer?.sub ?? null,
          categoryAffinity,
          following,
        });
    const items = ranked.slice(cursor, cursor + pageSize);
    const nextCursor = cursor + items.length;
    if (requestedAuthorId) c.header("Cache-Control", "private, no-store");
    return c.json({
      items,
      nextCursor: nextCursor < ranked.length ? String(nextCursor) : null,
      hasMore: nextCursor < ranked.length,
      policyVersion: requestedAuthorId
        ? "feed-author-chronological-v1"
        : locationFilter
          ? "feed-personal-location-v1"
          : "feed-personal-v1",
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

export const onRequest = handle(app);
