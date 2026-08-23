import { Router, type Request, type Response } from "express";
import { db, tryDb, withDb } from "./db.js";
import {
  verifyRequestAuth,
  type RequestAuthVerifier,
} from "./auth/requestAuth.js";
import { users, sessions, restaurants, swipes, courses, courseItems, sessionMembers } from "../shared/schema.js";
import { eq, and, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { MOCK_RESTAURANTS, MOCK_COURSES } from "./melbourneData.js";
import { buildSlate, buildControlSlate, assignVariant } from "./engine/scorer.js";
import { recordEvents, memEventCount, getMetrics, recordCatalogSize, recordItemFeatures, getItemFeatures, todayStops, recentStops } from "./engine/events.js";
import { enrichContext } from "./engine/context.js";
import { getTaste, updateTaste, updatePairwise, pairwiseWeight, sampleTheta, tasteFitFromTheta, MIN_TASTE, EVENT_WEIGHTS } from "./engine/taste.js";
import { buildItemVector, reputationPrior } from "./engine/features.js";
import { exposurePenalty, recordExposure } from "./engine/exposure.js";
import { satiation as satiationScore, recordConsumption } from "./engine/satiation.js";
import { recordStop, prevStop, chainFit as chainFitFn } from "./engine/chain.js";
import { decideGroup } from "./engine/group.js";
import { ENGINE_MODEL_VERSION } from "../shared/engine.js";
import type { Candidate, RecContext, RecEventInput } from "../shared/engine.js";
import { normalizeDiet, isHardRestriction, isIngredientAvoidance, restaurantSatisfiesDietRestriction } from "../shared/const.js";
import type { DietRestriction } from "../shared/const.js";
import { intentForCategory, intentForHour } from "../shared/intent.js";

const router = Router();

interface EventsRouteDependencies {
  verifyAuth: RequestAuthVerifier;
  persistEvents: (events: RecEventInput[]) => Promise<unknown>;
}

type CompatibleRequestIdentity =
  | {
      status: "ready";
      userId: string | null | undefined;
    }
  | {
      status: "responded";
    };

async function resolveCompatibleRequestIdentity(
  req: Request,
  res: Response,
  fallbackUserId: string | null | undefined,
  verifyAuth: RequestAuthVerifier,
): Promise<CompatibleRequestIdentity> {
  let authResult;
  try {
    authResult = await verifyAuth(req.get("authorization"));
  } catch {
    res.status(401).json({ error: "invalid_authorization" });
    return { status: "responded" };
  }

  if (
    authResult.status === "malformed_authorization"
  ) {
    res.status(401).json({ error: "invalid_authorization" });
    return { status: "responded" };
  }

  return {
    status: "ready",
    userId:
      authResult.status === "authenticated"
        ? authResult.userId
        : fallbackUserId,
  };
}

// 공유 이미지 캡처용 동일 출처 프록시. 앱에서 사용하는 HTTPS 이미지 호스트만 허용한다.
router.get("/image-proxy", async (req, res) => {
  try {
    const source = new URL(String(req.query.url ?? ""));
    const allowed = source.protocol === "https:" && (
      source.hostname === "images.unsplash.com" ||
      source.hostname.endsWith(".cloudfront.net")
    );
    if (!allowed) return res.status(400).send("Unsupported image host");

    const response = await fetch(source, { headers: { Accept: "image/*" } });
    if (!response.ok) return res.status(502).send("Image fetch failed");
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.status(400).send("Invalid image URL");
  }
});

// ── In-memory fallback session store ─────────────────────────────────────────
// 개발 DB가 일시정지/차단된 경우에도 세션 생성→초대→참여→투표 플로우가
// 동작하도록, 동일 서버 프로세스 메모리에 세션을 보관하는 폴백.
// (restaurants/courses의 멜버른 mock 폴백과 동일한 취지)
interface MemStore {
  session: Record<string, any>;
  members: Record<string, any>[];
  swipes: Record<string, any>[];
}
const memSessions = new Map<string, MemStore>(); // key: share_token
// Local-development capabilities stay outside response objects, so session
// GET responses cannot leak a host or participant mutation credential.
const localSessionMemberKeys = new Map<string, string>();
const localMemberKeySlot = (token: string, userId: string) => `${token}:${userId}`;
const newLocalMemberKey = () =>
  `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
const hasLocalMemberKey = (token: string, userId: string, supplied: unknown) =>
  typeof supplied === "string" &&
  localSessionMemberKeys.get(localMemberKeySlot(token, userId)) === supplied;
const TERMINAL_SESSION_STATUSES = new Set(["CANCELLED", "COMPLETED", "EXPIRED"]);
const normalizedSessionStatus = (value: unknown) => String(value ?? "").trim().toUpperCase();
// 호스트 '지금 진행'(D): 강제 완료된 단계 `${session.id}:${round}` 집합 (서버 메모리).
const forcedSteps = new Set<string>();

function memByToken(token: string): MemStore | undefined {
  return memSessions.get(token);
}
function memBySessionId(id: string): MemStore | undefined {
  let found: MemStore | undefined;
  memSessions.forEach(store => {
    if (store.session.id === id) found = store;
  });
  return found;
}

// 인제스트된 멜번 OSM 데이터(server/data/melbourne_osm.json)가 있으면 폴백으로 우선 사용.
// 없으면 기존 하드코딩 mock. (DB 적재 전에도 실데이터로 앱이 돈다 — © OpenStreetMap contributors)
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __osmPath = join(dirname(fileURLToPath(import.meta.url)), "data", "melbourne_osm.json");
let __osmCache: Record<string, any>[] | null | undefined; // undefined=미시도, null=없음
function osmRestaurants(): Record<string, any>[] | null {
  if (__osmCache !== undefined) return __osmCache;
  try {
    __osmCache = existsSync(__osmPath) ? JSON.parse(readFileSync(__osmPath, "utf8")) : null;
    if (__osmCache) console.log(`[data] 멜번 OSM 폴백 로드: ${__osmCache.length}곳`);
  } catch { __osmCache = null; }
  return __osmCache ?? null;
}

// DB 연결이 불가능할 때(예: 로컬 개발 DB 중단) 코스맵 프로토타입이
// 그대로 동작하도록, 멜버른 샘플 데이터를 API 응답 형태로 변환하는 폴백 헬퍼.
// 드라이브 인제스천 사진(server/data/drive_ingest.json) → restaurant_id별 URL 목록.
// OSM 데이터엔 사진이 거의 없어(2115곳 중 2109곳 없음) 앱이 카테고리 스톡 이미지를 돌려쓴다.
// 팀이 직접 찍은 실제 사진을 그 자리에 넣는다. 메뉴판 사진은 인제스천 단계에서 이미 제외됨.
const __ingestPath = join(dirname(fileURLToPath(import.meta.url)), "data", "drive_ingest.json");
let __drivePhotos: Map<string, string[]> | undefined;
function drivePhotosByRestaurant(): Map<string, string[]> {
  if (__drivePhotos) return __drivePhotos;
  const m = new Map<string, string[]>();
  try {
    if (existsSync(__ingestPath)) {
      const d = JSON.parse(readFileSync(__ingestPath, "utf8")) as { photos?: { restaurant_id?: string; url?: string; kind?: string; quality?: number }[] };
      // 대표 사진 우선순위: 음식(dish/table) → 외관 → 내부. 품질 높은 순.
      const rank: Record<string, number> = { dish: 0, table: 1, storefront: 2, interior: 3, other: 4 };
      for (const p of d.photos ?? []) {
        if (!p.restaurant_id || !p.url || p.kind === "menu") continue;
        const arr = m.get(p.restaurant_id) ?? [];
        arr.push(p.url);
        m.set(p.restaurant_id, arr);
      }
      for (const k of Array.from(m.keys())) {
        const meta = (d.photos ?? []).filter(p => p.restaurant_id === k && p.kind !== "menu");
        meta.sort((a, b) => (rank[a.kind ?? "other"] ?? 9) - (rank[b.kind ?? "other"] ?? 9) || (b.quality ?? 0) - (a.quality ?? 0));
        m.set(k, meta.map(p => p.url!).filter(Boolean));
      }
      if (m.size) console.log(`[data] 드라이브 사진 로드: ${m.size}곳 / ${(d.photos ?? []).length}장`);
    }
  } catch { /* 없으면 사진 없이 진행 */ }
  __drivePhotos = m;
  return m;
}

// 드라이브 인제스천 식당 전체(팀이 직접 다녀와 사진을 올린 곳) — 실사진·실메뉴 보유.
// OSM과 이름이 겹치지 않아 카탈로그에 없던 곳까지 여기서 카탈로그에 편입한다.
let __driveRestaurants: Record<string, any>[] | undefined;
function driveRestaurants(): Record<string, any>[] {
  if (__driveRestaurants) return __driveRestaurants;
  const out: Record<string, any>[] = [];
  try {
    if (existsSync(__ingestPath)) {
      const d = JSON.parse(readFileSync(__ingestPath, "utf8")) as {
        restaurants?: { id: string; name: string; category?: string; cuisine_guess?: string; match_type?: string; lat?: number; lng?: number; coord_source?: string; resolved_address?: string }[];
        menu_items?: { restaurant_id: string; name: string; price: number | null; category?: string | null; description?: string | null; dietary?: string[] }[];
      };
      const dp = drivePhotosByRestaurant();
      const idCounts = new Map<string, number>();
      for (const restaurant of d.restaurants ?? []) {
        idCounts.set(restaurant.id, (idCounts.get(restaurant.id) ?? 0) + 1);
      }
      const menus = new Map<string, Record<string, unknown>[]>();
      for (const m of d.menu_items ?? []) {
        const arr = menus.get(m.restaurant_id) ?? [];
        arr.push({ name: m.name, price: m.price, category: m.category, description: m.description, dietary: m.dietary ?? [] });
        menus.set(m.restaurant_id, arr);
      }
      for (const r of d.restaurants ?? []) {
        const photos = dp.get(r.id) ?? [];
        // 지도·거리 추천에는 검증된 위치와 실제 이미지가 필수다. 불완전 수집 행을
        // CBD 좌표로 위장하거나 다른 식당 사진으로 보완하지 않는다.
        const hasCoordinates = Number.isFinite(r.lat) && Number.isFinite(r.lng) && r.coord_source !== "placeholder";
        if (!hasCoordinates || photos.length === 0 || (idCounts.get(r.id) ?? 0) !== 1) continue;
        out.push({
          id: r.id, name: r.name, category: r.category || r.cuisine_guess || "기타",
          tags: [], rating: 0, review_count: 0,
          address: r.resolved_address || "Melbourne VIC",
          latitude: r.lat,
          longitude: r.lng,
          coordSource: r.coord_source,
          price_level: 2, photos, menu_items: menus.get(r.id) ?? [],
          business_hours: null, dietary_options: [], short_description: null,
          needsEnrichment: false,
        });
      }
      if (out.length) console.log(`[data] 드라이브 식당 카탈로그: ${out.length}곳 (사진 보유 ${out.filter(x => x.photos.length).length}곳)`);
    }
  } catch { /* 없으면 OSM만 */ }
  __driveRestaurants = out;
  return out;
}

function mockRestaurantsResponse() {
  const osm = osmRestaurants();
  const drive = driveRestaurants();
  // 실데이터 전용: 팀이 직접 다녀와 사진을 올린 드라이브 식당만 서빙한다.
  // OSM 2115곳은 사진이 없어(2109곳 무사진) 앱이 스톡 이미지를 돌려쓰게 만들었다 → 카탈로그에서 제외.
  const source = drive.length ? drive : osm;
  if (source) {
    const dp = drivePhotosByRestaurant();
    return source.map(r => {
      const photos = [...(dp.get(r.id) ?? []), ...(r.photos || [])];
      const uniq = Array.from(new Set(photos));
      return {
        id: r.id, name: r.name, category: r.category,
        tags: r.tags || [], rating: r.rating, reviewCount: r.review_count,
        distance: "", address: r.address, image: uniq[0] || "",
        photos: uniq, menuItems: r.menu_items || [],
        lat: r.latitude, lng: r.longitude, priceRange: r.price_level,
        openHours: r.business_hours, dietary: r.dietary_options || [],
        description: r.short_description,
      };
    });
  }
  return MOCK_RESTAURANTS.map(r => ({
    id: r.id,
    name: r.name,
    category: r.category,
    tags: r.tags || [],
    rating: r.rating,
    reviewCount: r.review_count,
    distance: "500m",
    address: r.address,
    image: (r.photos && r.photos.length > 0) ? r.photos[0] : "",
    photos: r.photos || [],
    menuItems: r.menu_items || [],
    lat: r.latitude,
    lng: r.longitude,
    priceRange: r.price_level,
    openHours: r.business_hours,
    dietary: r.dietary_options || [],
    description: r.short_description,
  }));
}

// 여정 타임라인 표시용 — id → name (DB 우선, 실패 시 OSM 폴백). 대상 id만 조회(전체 스캔 X).
async function restaurantNames(ids: string[]): Promise<Map<string, string>> {
  const uniq = Array.from(new Set(ids));
  if (!uniq.length) return new Map();
  try {
    const rows = await db.select({ id: restaurants.id, name: restaurants.name }).from(restaurants).where(inArray(restaurants.id, uniq));
    if (rows.length) return new Map(rows.map((r) => [r.id, r.name]));
  } catch { /* DB 불가 → 폴백 */ }
  const osm = osmRestaurants();
  const pool = osm ?? MOCK_RESTAURANTS;
  const idSet = new Set(uniq);
  return new Map(pool.filter((r) => idSet.has(r.id)).map((r) => [r.id, r.name as string]));
}

function mockCoursesResponse() {
  return MOCK_COURSES.map(c => ({
    id: c.id,
    title: c.title,
    description: c.description,
    heroImage: c.hero_image,
    tags: c.tags || [],
    hashtags: c.hashtags || [],
    region: c.region,
    metadata: {
      distance: c.total_distance,
      duration: c.total_duration,
      placeCount: Math.min(c.stops.length, 3),
    },
    stops: [...c.stops]
      .sort((a, b) => a.order - b.order)
      .slice(0, 3)
      .map(s => ({
        placeId: s.placeId,
        order: s.order,
        startTime: s.startTime,
        endTime: s.endTime,
        isBookmarked: s.isBookmarked,
      })),
    createdAt: new Date(c.created_at).toISOString().split('T')[0],
    isPublic: true,
    creatorId: c.author_id,
    savedCount: 0,
  }));
}

// Users
router.get("/users", async (req: any, res: any) => {
  try {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/users", async (req: any, res: any) => {
  try {
    const newUser = req.body;
    await db.insert(users).values(newUser);
    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Sessions
router.post("/sessions/create", async (req: any, res: any) => {
  try {
    const { hostId, hostName, emoji, name, groupSize, filterDistance, filterBudget, filterCategories, filterDietary, deadlineMinutes } = req.body;
    const token = Math.random().toString(36).substring(2, 8).toUpperCase();
    const sessionId = `session_${Date.now()}`;
    const memberKey = newLocalMemberKey();
    localSessionMemberKeys.set(localMemberKeySlot(token, hostId || "unknown"), memberKey);
    
    const minutes = Number(deadlineMinutes) || 10;
    const deadlineAt = new Date(Date.now() + 1000 * 60 * minutes);
    
    const newSession = {
      id: sessionId,
      host_user_id: hostId || "unknown",
      share_token: token,
      status: "WAITING",
      deadline_at: deadlineAt,
      group_size: groupSize || 4,
      filter_distance: filterDistance || 1000,
      filter_budget: filterBudget || 2,
      filter_min_rating: 0,
      filter_dietary: filterDietary || [],
      filter_vibe: filterCategories || [],
      // 예선 덱 상한 = 추천엔진 슬레이트 크기(k=7, buildDeck 참고).
      swipe_limit: 7,
      created_at: new Date()
    };

    const newMember = {
      id: nanoid(),
      session_id: sessionId,
      user_id: hostId || "unknown",
      user_name: hostName || "Guest",
      emoji: emoji || "👤",
      is_ready: false,
      created_at: new Date()
    };

    await withDb(
      async () => {
        await db.insert(sessions).values(newSession as any);
        await db.insert(sessionMembers).values(newMember);
      },
      () => {
        // DB 불가 → 메모리 폴백 (같은 서버를 보는 모든 유저가 공유)
        memSessions.set(token, { session: newSession, members: [newMember], swipes: [] });
      },
    );

    res.status(201).json({ session: newSession, token, memberKey });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create session" });
  }
});

router.get("/sessions/:token", async (req: any, res: any) => {
  const token = req.params.token;
  const r = await tryDb(async () => {
    const [session] = await db.select().from(sessions).where(eq(sessions.share_token, token));
    if (!session) return null;
    const members = await db.select().from(sessionMembers).where(eq(sessionMembers.session_id, session.id));
    return { session, members };
  });
  if (r.ok && r.value) return res.json(r.value);
  // DB 다운이거나, DB엔 없지만 메모리(다운 중 생성된 세션)에 있을 수 있다.
  const mem = memByToken(token);
  if (mem) return res.json({ session: mem.session, members: mem.members });
  res.status(404).json({ error: "Session not found" });
});

router.post("/sessions/:token/join", async (req: any, res: any) => {
  const token = req.params.token;
  const { userId, userName, emoji, memberKey: suppliedMemberKey } = req.body;
  let memberKey = localSessionMemberKeys.get(localMemberKeySlot(token, userId));
  const r = await tryDb(async () => {
    const [session] = await db.select().from(sessions).where(eq(sessions.share_token, token));
    if (!session) return { found: false as const };
    const existing = await db.select().from(sessionMembers).where(eq(sessionMembers.session_id, session.id));
    const isAlreadyJoined = existing.find(m => m.user_id === userId);
    const status = normalizedSessionStatus(session.status);
    if (TERMINAL_SESSION_STATUSES.has(status)) return { found: true as const, ended: true as const };
    if (status !== "WAITING" && !isAlreadyJoined) return { found: true as const, started: true as const };
    if (isAlreadyJoined && !hasLocalMemberKey(token, userId, suppliedMemberKey)) {
      return { found: true as const, credential: false as const };
    }

    // 정원 제한: 새 참여자가 group_size를 넘기면 거부 (이미 들어온 사람은 갱신 허용)
    const cap = (session as { group_size?: number }).group_size ?? 99;
    if (!isAlreadyJoined && existing.length >= cap) {
      return { found: true as const, full: true as const, cap };
    }

    if (!isAlreadyJoined) {
      memberKey = newLocalMemberKey();
      localSessionMemberKeys.set(localMemberKeySlot(token, userId), memberKey);
      await db.insert(sessionMembers).values({
        id: nanoid(),
        session_id: session.id,
        user_id: userId,
        user_name: userName,
        emoji: emoji,
        is_ready: false,
        created_at: new Date()
      });
    } else {
      await db.update(sessionMembers)
        .set({ user_name: userName, emoji: emoji })
        .where(and(eq(sessionMembers.user_id, userId), eq(sessionMembers.session_id, session.id)));
    }
    return { found: true as const, full: false as const };
  });
  if (r.ok && r.value.found) {
    if ('ended' in r.value && r.value.ended) return res.status(410).json({ error: "session_ended" });
    if ('started' in r.value && r.value.started) return res.status(409).json({ error: "session_started" });
    if ('credential' in r.value && !r.value.credential) return res.status(403).json({ error: "member_credential_required" });
    if (r.value.full) {
      return res.status(409).json({ error: "session_full", message: "정원이 찼어요", cap: r.value.cap });
    }
    return res.status(200).json({ success: true, memberKey });
  }
  const mem = memByToken(token);
  if (mem) {
    const existing = mem.members.find(m => m.user_id === userId);
    const status = normalizedSessionStatus(mem.session.status);
    if (TERMINAL_SESSION_STATUSES.has(status)) return res.status(410).json({ error: "session_ended" });
    if (status !== "WAITING" && !existing) return res.status(409).json({ error: "session_started" });
    if (existing) {
      if (!hasLocalMemberKey(token, userId, suppliedMemberKey)) {
        return res.status(403).json({ error: "member_credential_required" });
      }
      existing.user_name = userName;
      existing.emoji = emoji;
    } else {
      const cap = (mem.session as { group_size?: number }).group_size ?? 99;
      if (mem.members.length >= cap) {
        return res.status(409).json({ error: "session_full", message: "정원이 찼어요", cap });
      }
      mem.members.push({
        id: nanoid(),
        session_id: mem.session.id,
        user_id: userId,
        user_name: userName,
        emoji: emoji,
        is_ready: false,
        created_at: new Date()
      });
      memberKey = newLocalMemberKey();
      localSessionMemberKeys.set(localMemberKeySlot(token, userId), memberKey);
    }
    return res.status(200).json({ success: true, memberKey });
  }
  res.status(404).json({ error: "Session not found" });
});

router.post("/sessions/:token/cancel", async (req: any, res: any) => {
  const { userId, memberKey } = req.body;
  if (!userId) return res.status(400).json({ error: "user_required" });
  if (!hasLocalMemberKey(req.params.token, userId, memberKey)) return res.status(403).json({ error: "invalid_member_credential" });
  const result = await tryDb(async () => {
    const [session] = await db.select().from(sessions).where(eq(sessions.share_token, req.params.token));
    if (!session) return { found: false as const };
    if (session.host_user_id !== userId) return { found: true as const, forbidden: true as const };
    const status = normalizedSessionStatus(session.status);
    if (status === "CANCELLED") return { found: true as const, alreadyCancelled: true as const };
    if (status === "COMPLETED" || status === "EXPIRED") return { found: true as const, ended: true as const };
    await db.update(sessions).set({ status: "CANCELLED" }).where(eq(sessions.id, session.id));
    return { found: true as const };
  });
  if (result.ok && result.value.found) {
    if ('forbidden' in result.value && result.value.forbidden) return res.status(403).json({ error: "host_only" });
    if ('ended' in result.value && result.value.ended) return res.status(409).json({ error: "session_ended" });
    return res.json({ success: true });
  }
  const mem = memByToken(req.params.token);
  if (!mem) return res.status(404).json({ error: "Session not found" });
  if (mem.session.host_user_id !== userId) return res.status(403).json({ error: "host_only" });
  const status = normalizedSessionStatus(mem.session.status);
  if (status === "COMPLETED" || status === "EXPIRED") return res.status(409).json({ error: "session_ended" });
  mem.session.status = "CANCELLED";
  return res.json({ success: true });
});

router.post("/sessions/:token/leave", async (req: any, res: any) => {
  const { userId, memberKey } = req.body;
  if (!userId) return res.status(400).json({ error: "user_required" });
  if (!hasLocalMemberKey(req.params.token, userId, memberKey)) return res.status(403).json({ error: "invalid_member_credential" });
  const result = await tryDb(async () => {
    const [session] = await db.select().from(sessions).where(eq(sessions.share_token, req.params.token));
    if (!session) return { found: false as const };
    if (session.host_user_id === userId) return { found: true as const, host: true as const };
    if (!TERMINAL_SESSION_STATUSES.has(normalizedSessionStatus(session.status))) {
      await db.delete(sessionMembers).where(and(eq(sessionMembers.session_id, session.id), eq(sessionMembers.user_id, userId)));
    }
    return { found: true as const };
  });
  if (result.ok && result.value.found) {
    if ('host' in result.value && result.value.host) return res.status(409).json({ error: "host_must_cancel" });
    return res.json({ success: true });
  }
  const mem = memByToken(req.params.token);
  if (!mem) return res.status(404).json({ error: "Session not found" });
  if (mem.session.host_user_id === userId) return res.status(409).json({ error: "host_must_cancel" });
  mem.members = mem.members.filter(member => member.user_id !== userId);
  return res.json({ success: true });
});

router.post("/sessions/:token/ready", async (req: any, res: any) => {
  const token = req.params.token;
  const { userId, isReady, memberKey } = req.body;
  if (!hasLocalMemberKey(token, userId, memberKey)) return res.status(403).json({ error: "invalid_member_credential" });
  const r = await tryDb(async () => {
    const [session] = await db.select().from(sessions).where(eq(sessions.share_token, token));
    if (!session) return false;
    await db.update(sessionMembers)
      .set({ is_ready: isReady })
      .where(and(eq(sessionMembers.user_id, userId), eq(sessionMembers.session_id, session.id)));
    return true;
  });
  if (r.ok && r.value) return res.status(200).json({ success: true });
  const mem = memByToken(token);
  if (mem) {
    const member = mem.members.find(m => m.user_id === userId);
    if (member) member.is_ready = isReady;
    return res.status(200).json({ success: true });
  }
  res.status(404).json({ error: "Session not found" });
});

router.post("/sessions/:token/status", async (req: any, res: any) => {
  const token = req.params.token;
  const { status, deadlineMinutes, userId, memberKey } = req.body;
  if (normalizedSessionStatus(status) !== "SWIPING_1") return res.status(400).json({ error: "unsupported_status" });
  if (!hasLocalMemberKey(token, userId, memberKey)) return res.status(403).json({ error: "invalid_member_credential" });
  // 마감 타이머는 투표 시작(상태 변경) 시점부터 적용
  const patch: Record<string, any> = { status: status.toUpperCase() };
  if (deadlineMinutes) {
    patch.deadline_at = new Date(Date.now() + 1000 * 60 * Number(deadlineMinutes));
  }
  const r = await tryDb(async () => {
    const [session] = await db.select().from(sessions).where(eq(sessions.share_token, token));
    if (!session) return { found: false as const };
    if (session.host_user_id !== userId) return { found: true as const, forbidden: true as const };
    if (normalizedSessionStatus(session.status) === "SWIPING_1") return { found: true as const };
    if (normalizedSessionStatus(session.status) !== "WAITING") return { found: true as const, ended: true as const };
    await db.update(sessions)
      .set(patch)
      .where(eq(sessions.share_token, token));
    return { found: true as const };
  });
  if (r.ok && r.value.found) {
    if ('forbidden' in r.value && r.value.forbidden) return res.status(403).json({ error: "host_only" });
    if ('ended' in r.value && r.value.ended) return res.status(409).json({ error: "session_ended" });
    return res.status(200).json({ success: true, memberKey });
  }
  const mem = memByToken(token);
  if (mem) {
    if (mem.session.host_user_id !== userId) return res.status(403).json({ error: "host_only" });
    if (normalizedSessionStatus(mem.session.status) !== "WAITING" && normalizedSessionStatus(mem.session.status) !== "SWIPING_1") return res.status(409).json({ error: "session_ended" });
    Object.assign(mem.session, patch);
    return res.status(200).json({ success: true });
  }
  res.status(404).json({ error: "Session not found" });
});

// 호스트 '지금 진행'(D) — 현재 단계(round)를 강제 완료 처리. 호스트만.
router.post("/sessions/:token/force", async (req: any, res: any) => {
  const { userId, round } = req.body;
  let session: Record<string, any> | null = null;
  try {
    const [s] = await db.select().from(sessions).where(eq(sessions.share_token, req.params.token));
    if (s) session = s;
  } catch { /* mem 폴백 */ }
  if (!session) { const mem = memByToken(req.params.token); if (mem) session = mem.session; }
  if (!session) return res.status(404).json({ error: "Session not found" });
  if (session.host_user_id !== userId) return res.status(403).json({ error: "host_only" });
  forcedSteps.add(`${session.id}:${Number(round)}`);
  return res.json({ success: true });
});

// 세션 결과 집계 — DB/메모리 공용 (rows는 컬럼명 기반 객체)
function buildResultsPayload(
  session: Record<string, any>,
  members: Record<string, any>[],
  sessionSwipes: Record<string, any>[],
  restaurantPool: { category: string }[],
) {
  const filterVibe: string[] = session.filter_vibe || [];
  const filteredRestaurants = restaurantPool.filter(r =>
    filterVibe.length === 0 || filterVibe.includes(r.category)
  );

  // 예선 덱 크기 = session.swipe_limit(추천엔진 슬레이트 상한, k=7). 클라는 이보다 많이 스와이프하지
  // 않으므로 여기서 다른 상한을 쓰면 멤버가 영원히 "완료" 판정을 못 받아 결과 화면으로 못 넘어간다.
  const targetCount = Math.min(filteredRestaurants.length, session.swipe_limit || 7);

  // 세대(generation) = round 인코딩: 예선=2G-1, 결승=2G. reroll마다 세대+1.
  // 현재 세대 = 최대 round 기준. 새 세대 swipe가 없으면 G=1로 기존과 동일.
  const REROLL_CAP = 3;
  const maxRound = sessionSwipes.reduce((m, s) => Math.max(m, Number(s.round) || 1), 1);
  const generation = Math.max(1, Math.ceil(maxRound / 2));
  const prelimRound = 2 * generation - 1;
  const finalRound = 2 * generation;
  // 예선 덱은 추천엔진이 식단·시간대 인텐트까지 걸러 targetCount보다 작을 수 있다(예: 4장).
  // 서버는 멤버별 실제 덱 크기를 재현할 수 없으므로, 클라가 스와이프를 시작하자마자 보내는
  // DECK_SIZE sentinel로 자기 덱 크기를 알리고, 다 소진하면 PRELIM_DONE_ID로 완료를 알린다.
  const PRELIM_DONE_ID = "__prelim_done__";
  const DECK_SIZE_PREFIX = "__deck_size__:";
  const r1All = sessionSwipes.filter(s => (Number(s.round) || 1) === prelimRound);
  const doneUsers = new Set(r1All.filter(s => s.restaurant_id === PRELIM_DONE_ID).map(s => s.user_id));
  const deckSizeByUser: Record<string, number> = {};
  r1All.forEach(s => {
    if (typeof s.restaurant_id === 'string' && s.restaurant_id.startsWith(DECK_SIZE_PREFIX)) {
      const n = Number(s.restaurant_id.slice(DECK_SIZE_PREFIX.length));
      if (Number.isFinite(n) && n > 0) deckSizeByUser[s.user_id] = n;
    }
  });
  // 집계에서 sentinel 전부 제외 (안 빼면 가짜 결승 후보가 된다)
  const r1 = r1All.filter(s => s.restaurant_id !== PRELIM_DONE_ID && !(typeof s.restaurant_id === 'string' && s.restaurant_id.startsWith(DECK_SIZE_PREFIX)));
  const r2 = sessionSwipes.filter(s => Number(s.round) === finalRound);

  const completionMap: Record<string, number> = {};
  r1.forEach(s => {
    completionMap[s.user_id] = (completionMap[s.user_id] || 0) + 1;
  });

  // 멤버별 실제 목표치 — 클라가 알려온 자기 덱 크기가 있으면 그걸, 없으면(아직 미도착) 서버 추정치.
  const memberTargetOf = (userId: string) => deckSizeByUser[userId] ?? targetCount;
  const isMemberDone = (userId: string) =>
    (completionMap[userId] || 0) >= memberTargetOf(userId) || doneUsers.has(userId);
  const completedMembers = members.filter(m => isMemberDone(m.user_id));
  const isExpired = Date.now() > new Date(session.deadline_at).getTime();

  // D: 호스트 '지금 진행'으로 현재 예선/결승 단계 강제 완료됐나
  const forcePrelim = forcedSteps.has(`${session.id}:${prelimRound}`);
  const forceFinal = forcedSteps.has(`${session.id}:${finalRound}`);

  // 그룹 결정 상태기계: least-misery 집계 + 3지선다 결승 + reroll/합의실패 (현재 세대 기준)
  const decision = decideGroup(r1 as any, r2 as any, members.length, completedMembers.length, isExpired, generation, REROLL_CAP, forcePrelim, forceFinal);

  // 결승 투표 여부(라운드=finalRound의 LIKE, 후보든 '둘 다 별로'든 한 표 던지면 투표 완료).
  const finalVoters = new Set(r2.filter(s => s.swipe_action === 'LIKE').map(s => s.user_id));

  // memberCompletion.completed는 "지금 단계에서 할 일을 끝냈는가"를 뜻한다. 예선 중엔 예선 완료,
  // 결승 단계(FINAL)에선 결승 투표 완료로 바뀌어야 한다 — 안 그러면 예선을 끝낸 멤버는 아직
  // 결승 투표 전인데도 대기 화면에 계속 "완료 ✅"로 표시된다.
  const memberCompletion = members.map(m => {
    const cnt = completionMap[m.user_id] || 0;
    const prelimDone = isMemberDone(m.user_id);
    // 클라가 알려온 실제 덱 크기를 분모로 쓴다 (예: 4장이면 진행 중에도 x/4로 표시).
    const memberTarget = memberTargetOf(m.user_id);
    const inFinalStage = decision.phase === 'FINAL';
    return {
      id: m.user_id,
      name: m.user_name,
      emoji: m.emoji,
      completed: inFinalStage ? finalVoters.has(m.user_id) : prelimDone,
      swipeCount: inFinalStage ? (finalVoters.has(m.user_id) ? 1 : 0) : Math.min(cnt, memberTarget),
      targetCount: inFinalStage ? 1 : memberTarget,
    };
  });

  return {
    completedCount: completedMembers.length,
    totalMembers: members.length,
    memberCompletion,
    isExpired,
    deadlineAt: session.deadline_at,
    generation,                      // 현재 세대 (클라가 swipe round 계산: 예선 2G-1·결승 2G)
    rerollCap: REROLL_CAP,
    results: decision.results,
    phase: decision.phase,           // PRELIM | FINAL | REROLL | NO_CONSENSUS | DONE
    finalists: decision.finalists,   // 결승 후보 1~2곳
    finalTally: decision.finalTally, // 결승 표수(+REJECT)
    finalVotedCount: decision.finalVotedCount,
    rejectVotes: decision.rejectVotes,
    excludeIds: decision.excludeIds, // REROLL 시 다음 세대에서 뺄 곳(거절+다수미움)
    winnerId: decision.winnerId,     // DONE일 때 우승
  };
}

router.get("/sessions/:token/results", async (req: any, res: any) => {
  const token = req.params.token;
  const r = await tryDb(async () => {
    const [session] = await db.select().from(sessions).where(eq(sessions.share_token, token));
    if (!session) return null;
    const members = await db.select().from(sessionMembers).where(eq(sessionMembers.session_id, session.id));
    const sessionSwipes = await db.select().from(swipes).where(eq(swipes.session_id, session.id));
    const allRestaurants = await db.select().from(restaurants);

    const payload = buildResultsPayload(session, members, sessionSwipes, allRestaurants);

    if (payload.isExpired && session.status !== 'COMPLETED') {
      await db.update(sessions)
        .set({ status: 'COMPLETED' })
        .where(eq(sessions.id, session.id));
    }
    return payload;
  });
  if (r.ok && r.value) return res.json(r.value);
  const mem = memByToken(token);
  if (mem) {
    const payload = buildResultsPayload(mem.session, mem.members, mem.swipes, MOCK_RESTAURANTS);
    if (payload.isExpired && mem.session.status !== 'COMPLETED') {
      mem.session.status = 'COMPLETED';
    }
    return res.json(payload);
  }
  res.status(404).json({ error: "Session not found" });
});

// Restaurants
router.get("/restaurants", async (req: any, res: any) => {
  const dbRes = await tryDb(() => db.select().from(restaurants));
  if (dbRes.ok) {
    const formatted = dbRes.value.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      tags: r.tags || [],
      rating: r.rating,
      reviewCount: r.review_count,
      distance: "500m", // Mock distance
      address: r.address,
      image: (r.photos && r.photos.length > 0) ? r.photos[0] : "",
      photos: r.photos || [],
      menuItems: r.menu_items || [],
      lat: r.latitude,
      lng: r.longitude,
      priceRange: r.price_level,
      openHours: r.business_hours,
      dietary: r.dietary_options || [],
      description: r.short_description
    }));
    // DB가 비어 있으면(시드 전) 멜버른 샘플 데이터로 폴백.
    return res.json(formatted.length > 0 ? formatted : mockRestaurantsResponse());
  }
  res.json(mockRestaurantsResponse());
});

router.get("/restaurants/:id", async (req: any, res: any) => {
  const formatRestaurant = (r: any) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    tags: r.tags || [],
    rating: r.rating,
    reviewCount: r.review_count,
    distance: "",
    address: r.address,
    image: r.photos?.[0] || "",
    photos: r.photos || [],
    menuItems: r.menu_items || [],
    lat: r.latitude,
    lng: r.longitude,
    priceRange: r.price_level,
    openHours: r.business_hours,
    dietary: r.dietary_options || [],
    description: r.short_description || "",
  });
  const dbRes = await tryDb(async () => {
    const rows = await db.select().from(restaurants).where(eq(restaurants.id, req.params.id)).limit(1);
    return rows[0] ?? null;
  });
  if (dbRes.ok && dbRes.value) return res.json(formatRestaurant(dbRes.value));
  const fallback = MOCK_RESTAURANTS.find(restaurant => restaurant.id === req.params.id);
  if (fallback) return res.json(formatRestaurant(fallback));
  return res.status(404).json({ error: "restaurant_not_found" });
});

// Courses
router.get("/courses", async (req: any, res: any) => {
  const dbRes = await tryDb(async () => {
    const allCourses = await db.select().from(courses);
    const allCourseItems = await db.select().from(courseItems);
    return { allCourses, allCourseItems };
  });
  if (dbRes.ok) {
    const { allCourses, allCourseItems } = dbRes.value;
    const formattedCourses = allCourses.map(c => {
      const stops = allCourseItems
        .filter(ci => ci.course_id === c.id)
        .sort((a, b) => a.order_index - b.order_index)
        .slice(0, 3)
        .map(ci => ({
          placeId: ci.restaurant_id,
          order: ci.order_index,
          startTime: ci.start_time,
          endTime: ci.end_time,
          isBookmarked: ci.is_bookmarked
        }));

      return {
        id: c.id,
        title: c.title,
        description: c.description,
        heroImage: c.hero_image,
        tags: c.tags || [],
        hashtags: c.hashtags || [],
        region: c.region,
        metadata: {
          distance: c.total_distance,
          duration: c.total_duration,
          placeCount: stops.length
        },
        stops,
        createdAt: new Date(c.created_at).toISOString().split('T')[0],
        isPublic: c.is_public,
        creatorId: c.author_id,
        savedCount: c.saves_count
      };
    });
    return res.json(formattedCourses.length > 0 ? formattedCourses : mockCoursesResponse());
  }
  res.json(mockCoursesResponse());
});

// Swipes
router.post("/swipes", async (req: any, res: any) => {
  const { id, session_id, user_id, restaurant_id, round, swipe_action, created_at } = req.body;
  const row = {
    id,
    session_id,
    user_id,
    restaurant_id,
    round: Number(round),
    swipe_action,
    created_at: created_at ? new Date(created_at) : new Date()
  };
  const r = await tryDb(() => db.insert(swipes).values(row));
  if (r.ok) return res.status(201).json({ success: true });
  const mem = memBySessionId(session_id);
  if (mem) {
    mem.swipes.push(row);
    return res.status(201).json({ success: true });
  }
  res.status(500).json({ error: "Failed to insert swipe" });
});

// ── 런치 엔진 v0 — 로깅 / 추천 (Phase 0) ─────────────────────────────────────
// 후보 풀: DB 우선, 실패 시 멜버른 mock 폴백.
async function candidatePool(): Promise<Candidate[]> {
  const dbRes = await tryDb(() =>
    db
      .select({
        id: restaurants.id,
        rating: restaurants.rating,
        review_count: restaurants.review_count,
        price_level: restaurants.price_level,
        category: restaurants.category,
        dietary_options: restaurants.dietary_options,
        menu_items: restaurants.menu_items,
      })
      .from(restaurants),
  );
  if (dbRes.ok && dbRes.value.length) return dbRes.value as Candidate[];
  // DB 불가/빈 결과 → OSM(멜버른) 폴백 → 그래도 없으면 MOCK (폴백 체인)
  const osm = osmRestaurants();
  if (osm) {
    return osm.map((r) => ({
      id: r.id, rating: r.rating, review_count: r.review_count,
      price_level: r.price_level, category: r.category,
      dietary_options: r.dietary_options,
    })) as Candidate[];
  }
  return MOCK_RESTAURANTS.map((r) => ({
    id: r.id,
    rating: r.rating,
    review_count: r.review_count,
    price_level: r.price_level,
    category: r.category,
    dietary_options: r.dietary_options,
  }));
}

// 하드 diet 제약 충족 여부. D1 경로와 같은 공용 evidence 판정기를 사용한다.
function satisfiesDiet(c: Candidate, tag: DietRestriction): boolean {
  return restaurantSatisfiesDietRestriction({
    category: c.category,
    dietaryOptions: c.dietary_options,
    menuItems: c.menu_items,
  }, tag);
}

// 유저 diet 입력(라벨/태그)에서 하드 제약만 추출 + 정규화.
function requiredHardDiets(diet?: string[]): DietRestriction[] {
  const out: DietRestriction[] = [];
  for (const raw of diet ?? []) {
    const norm = normalizeDiet(raw);
    if (norm && isHardRestriction(norm)) out.push(norm as DietRestriction);
  }
  return out;
}

// 이벤트 수집: 단건 또는 { events: [...] } 배치 모두 허용.
export function createEventsHandler(
  dependencies: EventsRouteDependencies = {
    verifyAuth: verifyRequestAuth,
    persistEvents: recordEvents,
  },
) {
  return async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const requestedEvents: RecEventInput[] = Array.isArray(body.events)
      ? body.events
      : body.event_type
        ? [body]
        : [];
    if (!requestedEvents.length) {
      return res.status(400).json({ error: "no events" });
    }

    let authResult;
    try {
      authResult = await dependencies.verifyAuth(req.get("authorization"));
    } catch {
      return res.status(401).json({ error: "invalid_authorization" });
    }

    if (
      authResult.status === "malformed_authorization"
    ) {
      return res.status(401).json({ error: "invalid_authorization" });
    }

    const events: RecEventInput[] =
      authResult.status === "authenticated"
        ? requestedEvents.map((event) => ({
            ...event,
            user_id: authResult.userId,
          }))
        : requestedEvents;

    // 스와이프·선택은 취향을, 검증된 VISIT만 포만감·동선 상태를 갱신한다.
    for (const e of events) {
      if (!e.user_id) continue;
      const uid = String(e.user_id);

      // Munchie 피드/코스 신호 처리 (course_id 기반)
      if (e.course_id && (e.event_type === "FEED_LIKE" || e.event_type === "FEED_DISLIKE" || e.event_type === "COURSE_SAVE" || e.event_type === "COURSE_OPEN")) {
        const dbRes = await tryDb(async () => {
          const items = await db.select().from(courseItems).where(eq(courseItems.course_id, e.course_id!));
          return items;
        });
        const items = dbRes.ok ? dbRes.value : [];
        const numStops = Math.max(1, items.length);
        const baseWeight = e.event_type === "FEED_LIKE" ? EVENT_WEIGHTS.FEED_LIKE :
                           e.event_type === "FEED_DISLIKE" ? EVENT_WEIGHTS.FEED_DISLIKE :
                           e.event_type === "COURSE_SAVE" ? EVENT_WEIGHTS.COURSE_SAVE : EVENT_WEIGHTS.COURSE_OPEN;
        const dilutedWeight = Math.abs(baseWeight) / numStops;
        const targetVal = baseWeight >= 0 ? 1 : 0;

        for (const item of items) {
          const feat = getItemFeatures(item.restaurant_id);
          if (feat) {
            const vec = buildItemVector({ ...feat, id: item.restaurant_id });
            updateTaste(uid, vec, targetVal, dilutedWeight);
          }
        }
        // Model Access Isolation: Satiation & Personal Chain 갱신은 수행하지 않음!
      }

      if (!e.restaurant_id) continue;
      const feat = getItemFeatures(String(e.restaurant_id));
      if (!feat) continue;
      const vec = buildItemVector({ ...feat, id: String(e.restaurant_id) });

      if (e.event_type === "SWIPE" && (e.action === "LIKE" || e.action === "NOPE")) {
        updateTaste(uid, vec, e.action === "LIKE" ? 1 : 0, EVENT_WEIGHTS.SWIPE);
      } else if (e.event_type === "SWIPE" && e.action === "CHOOSE") {
        const c = e.context as { opponent_id?: string; decision_ms?: number } | null | undefined;
        const oppFeat = c?.opponent_id ? getItemFeatures(String(c.opponent_id)) : undefined;
        if (oppFeat) updatePairwise(uid, vec, buildItemVector({ ...oppFeat, id: String(c!.opponent_id) }), pairwiseWeight(c?.decision_ms));
      } else if (e.event_type === "WINNER") {
        updateTaste(uid, vec, 1, EVENT_WEIGHTS.WINNER);
      } else if (e.event_type === "VISIT" && feat.category) {
        updateTaste(uid, vec, 1, EVENT_WEIGHTS.VISIT);
        recordConsumption(uid, feat.category, Date.now());
        recordStop(uid, feat.category, Date.now());
      } else if (e.event_type === "SURVEY") {
        const val = e.action === "POS" ? 1 : e.action === "NEG" ? 0 : 0.5;
        updateTaste(uid, vec, val, EVENT_WEIGHTS.SURVEY);
      }
    }
    const result = await dependencies.persistEvents(events);
    res.status(201).json(result);
  };
}

router.post("/events", createEventsHandler());

// 추천 슬레이트 + propensity 로깅. v0 휴리스틱 스코어러.
interface RecommendRouteDependencies {
  verifyAuth: RequestAuthVerifier;
  enrichRequestContext: (context: RecContext) => Promise<RecContext>;
  loadCandidates: () => Promise<Candidate[]>;
  persistEvents: (events: RecEventInput[]) => Promise<unknown>;
}

export function createRecommendHandler(
  dependencies: RecommendRouteDependencies = {
    verifyAuth: verifyRequestAuth,
    enrichRequestContext: enrichContext,
    loadCandidates: candidatePool,
    persistEvents: recordEvents,
  },
) {
  return async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const identity = await resolveCompatibleRequestIdentity(
    req,
    res,
    body.user_id,
    dependencies.verifyAuth,
  );
  if (identity.status === "responded") return;
  const userId = identity.userId;

  const ctx: RecContext = await dependencies.enrichRequestContext(body.context ?? {});
  const k = typeof body.k === "number" ? body.k : 7;
  const variant: string = body.variant ?? assignVariant(userId);
  const pool = await dependencies.loadCandidates();
  recordCatalogSize(pool.length);
  recordItemFeatures(pool.map((c) => ({ id: c.id, category: c.category, price_level: c.price_level, rating: c.rating })));
  const candidateIds: string[] | undefined = Array.isArray(body.candidate_ids) ? body.candidate_ids : undefined;
  const scoped = candidateIds && candidateIds.length
    ? pool.filter((c) => new Set(candidateIds).has(c.id))
    : pool;
  const reqDiet = requiredHardDiets(ctx.diet);
  let filtered = scoped;
  let diet_relaxed = false;
  if (reqDiet.length) {
    filtered = scoped.filter((c) => reqDiet.every((tag) => satisfiesDiet(c, tag)));
    if (!filtered.length && reqDiet.some(tag => !isIngredientAvoidance(tag))) {
      const ingredientAvoidances = reqDiet.filter(isIngredientAvoidance);
      filtered = scoped.filter((c) => ingredientAvoidances.every((tag) => satisfiesDiet(c, tag)));
      diet_relaxed = filtered.length > 0;
    }
  }
  let intent_relaxed = false;
  if (ctx.intent) {
    const byIntent = filtered.filter((c) => intentForCategory(c.category) === ctx.intent);
    if (byIntent.length) filtered = byIntent;
    else intent_relaxed = true;
  }
  const now = Date.now();
  const memberIds: string[] = Array.isArray(body.member_ids) && body.member_ids.length
    ? body.member_ids.map(String)
    : (userId ? [String(userId)] : []);
  const memberThetas: number[][] = [];
  for (const uid of memberIds) {
    const t = getTaste(uid);
    if (t) memberThetas.push(sampleTheta(t)); // RL 탐색: n=0부터 Thompson 샘플
  }
  // least-misery: 후보별 멤버 tasteFit의 최소 (아무도 불행하지 않게). 학습된 멤버 없으면 콜드.
  const tasteFit = (c: Candidate) => {
    if (!memberThetas.length) return null;
    const x = buildItemVector(c);
    let m = Infinity;
    for (const th of memberThetas) m = Math.min(m, tasteFitFromTheta(th, x));
    return m;
  };
  const prev = prevStop(userId, now); // 같은 occasion 직전 스톱 (있으면 다음-스톱 가산)
  const slate = variant === "control"
    ? buildControlSlate(filtered, ctx, { k, reputationPrior: (id) => reputationPrior(id) })
    : buildSlate(filtered, ctx, {
        k, eps: 0.05, tasteFit, // 탐색=Thompson, 그룹=least-misery
        exposurePenalty: (id) => exposurePenalty(userId, id, now),
        satiation: (cat) => satiationScore(userId, cat, now),
        chainFit: (cat) => chainFitFn(prev, cat),
        reputationPrior: (id) => reputationPrior(id), // 평점 없는 식당의 평판 대체(감사 치명 1)
      });
  // arm·합성 방식별 model_version
  const mv = variant === "control"
    ? "control-random"
    : memberThetas.length >= 2 ? "v3-group" : memberThetas.length === 1 ? "v3-bandit" : ENGINE_MODEL_VERSION;
  const slate_id = nanoid();
  const slate_type = (body.slate_type as "PRELIM" | "FINAL" | "NEXT_STOP" | "COURSE_FEED") ?? "PRELIM";

  // 노출(IMPRESSION) 이벤트를 slate_id·propensity와 함께 기록 → off-policy 평가 기반
  await dependencies.persistEvents(
    slate.map((s) => ({
      event_type: "IMPRESSION" as const,
      slate_id,
      slate_type,
      user_id: userId ?? null,
      session_id: body.session_id ?? null,
      group_id: body.session_id ?? null,
      restaurant_id: s.id,
      position: s.rank,
      propensity: s.propensity,
      score: s.score,
      model_version: mv,
      variant,
      context: ctx,
    }))
  );
  // 실제 보여준 카드만 노출 누적 (다음 추천의 단기 피로 패널티에 반영)
  for (const s of slate) recordExposure(userId, s.id, now);

  res.json({ slate, slate_id, slate_type, model_version: mv, variant, diet_relaxed, intent_relaxed });
  };
}

router.post("/recommend", createRecommendHandler());

// 하루 여정: 오늘의 스톱 타임라인 + (사슬 열림 시) 다음-스톱 제안.
interface JourneyTodayRouteDependencies {
  verifyAuth: RequestAuthVerifier;
  loadTodayStops: typeof todayStops;
  loadRestaurantNames: typeof restaurantNames;
  loadCandidates: typeof candidatePool;
}

export function createJourneyTodayHandler(
  dependencies: JourneyTodayRouteDependencies = {
    verifyAuth: verifyRequestAuth,
    loadTodayStops: todayStops,
    loadRestaurantNames: restaurantNames,
    loadCandidates: candidatePool,
  },
) {
  return async (req: Request, res: Response) => {
  const fallbackUserId = String(req.query.userId ?? "");
  const identity = await resolveCompatibleRequestIdentity(
    req,
    res,
    fallbackUserId,
    dependencies.verifyAuth,
  );
  if (identity.status === "responded") return;
  const userId = String(identity.userId ?? "");
  if (!userId) return res.json({ stops: [], nextSuggestion: null });
  const now = Date.now();
  const stopsRaw = await dependencies.loadTodayStops(userId, now);
  const nameMap = await dependencies.loadRestaurantNames(stopsRaw.map((s) => s.restaurant_id));
  const stops = stopsRaw.map((s) => ({ ...s, name: nameMap.get(s.restaurant_id) ?? s.restaurant_id }));
  let nextSuggestion: { intent: string; restaurant: { id: string; name: string; category?: string }; reason: string } | null = null;
  const prev = prevStop(userId, now); // 6h occasion 윈도우 내 직전 카테고리 (없으면 null = 사슬 닫힘)
  if (prev) {
    const pool = await dependencies.loadCandidates();
    // 직전 카테고리 다음에 가장 잘 오는 카테고리 (chainFit 최대) → 인텐트
    const cats = Array.from(new Set(pool.map((c) => c.category).filter(Boolean) as string[]));
    let bestCat: string | null = null, bestP = 0;
    for (const c of cats) {
      const p = chainFitFn(prev, c);
      if (p > bestP) { bestP = p; bestCat = c; }
    }
    // 신호 없으면(bestCat null) 시간대 기반으로 — "cafe" 하드코딩 폴백은 버그였음(항상 카페만 제안됨)
    const intent = bestCat ? (intentForCategory(bestCat) ?? intentForHour(new Date(now).getHours())) : intentForHour(new Date(now).getHours());
    const visited = new Set(stops.map((s) => s.restaurant_id));
    const pick = pool
      .filter((c) => intentForCategory(c.category) === intent && !visited.has(c.id))
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
    if (pick) {
      const pickName = (await dependencies.loadRestaurantNames([pick.id])).get(pick.id) ?? pick.id;
      nextSuggestion = { intent, restaurant: { id: pick.id, name: pickName, category: pick.category }, reason: `${prev} 다음` };
    }
  }
    res.json({ stops, nextSuggestion });
  };
}

router.get("/journey/today", createJourneyTodayHandler());

// 전구 알림에서 언제든 확인하는 최근 여정 히스토리 (최신순, 최대 5개).
interface JourneyHistoryRouteDependencies {
  verifyAuth: RequestAuthVerifier;
  loadRecentStops: typeof recentStops;
}

export function createJourneyHistoryHandler(
  dependencies: JourneyHistoryRouteDependencies = {
    verifyAuth: verifyRequestAuth,
    loadRecentStops: recentStops,
  },
) {
  return async (req: Request, res: Response) => {
    const fallbackUserId = String(req.query.userId ?? "");
    const identity = await resolveCompatibleRequestIdentity(
      req,
      res,
      fallbackUserId,
      dependencies.verifyAuth,
    );
    if (identity.status === "responded") return;
    const userId = String(identity.userId ?? "");
    if (!userId) return res.json({ stops: [] });
    const requested = Number(req.query.limit ?? 5);
    const limit = Number.isFinite(requested) ? Math.max(1, Math.min(Math.floor(requested), 5)) : 5;
    res.json({ stops: await dependencies.loadRecentStops(userId, limit) });
  };
}

router.get("/journey/history", createJourneyHistoryHandler());

// 디버그: 인메모리 버퍼에 쌓인 이벤트 수 (DB 폴백 동작 확인용)
router.get("/events/_debug", (_req, res) => {
  res.json({ memBuffered: memEventCount() });
});

// 대시보드 집계
router.get("/metrics", (_req, res) => {
  res.json(getMetrics());
});

export default router;
