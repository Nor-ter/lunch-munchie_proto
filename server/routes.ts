import { Router } from "express";
import { db } from "./db.js";
import { users, sessions, restaurants, swipes, courses, courseItems, sessionMembers } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { MOCK_RESTAURANTS, MOCK_COURSES } from "./melbourneData.js";
import { buildSlate, buildControlSlate, assignVariant } from "./engine/scorer.js";
import { recordEvents, memEventCount, getMetrics, recordCatalogSize, recordItemFeatures, getItemFeatures } from "./engine/events.js";
import { enrichContext } from "./engine/context.js";
import { getTaste, updateTaste, updatePairwise, pairwiseWeight, sampleTheta, tasteFitFromTheta, MIN_TASTE } from "./engine/taste.js";
import { buildItemVector } from "./engine/features.js";
import { exposurePenalty, recordExposure } from "./engine/exposure.js";
import { satiation as satiationScore, recordConsumption } from "./engine/satiation.js";
import { recordStop, prevStop, chainFit as chainFitFn } from "./engine/chain.js";
import { ENGINE_MODEL_VERSION } from "../shared/engine.js";
import type { Candidate, RecContext, RecEventInput } from "../shared/engine.js";
import { normalizeDiet, isHardRestriction } from "../shared/const.js";
import type { DietTag } from "../shared/const.js";
import { categoriesForIntent } from "../shared/intent.js";

const router = Router();

// ── In-memory fallback session store ─────────────────────────────────────────
// DB(Supabase)가 일시정지/차단된 경우에도 세션 생성→초대→참여→투표 플로우가
// 동작하도록, 동일 서버 프로세스 메모리에 세션을 보관하는 폴백.
// (restaurants/courses의 멜버른 mock 폴백과 동일한 취지)
interface MemStore {
  session: Record<string, any>;
  members: Record<string, any>[];
  swipes: Record<string, any>[];
}
const memSessions = new Map<string, MemStore>(); // key: share_token

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

// DB 연결이 불가능할 때(예: Supabase 일시정지/포트 차단) 코스맵 프로토타입이
// 그대로 동작하도록, 멜버른 샘플 데이터를 API 응답 형태로 변환하는 폴백 헬퍼.
function mockRestaurantsResponse() {
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
    lat: r.latitude,
    lng: r.longitude,
    priceRange: r.price_level,
    openHours: r.business_hours,
    dietary: r.dietary_options || [],
    description: r.short_description,
  }));
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
      placeCount: c.stops.length,
    },
    stops: [...c.stops]
      .sort((a, b) => a.order - b.order)
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
      swipe_limit: 10,
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

    try {
      await db.insert(sessions).values(newSession as any);
      await db.insert(sessionMembers).values(newMember);
    } catch (dbErr) {
      // DB 불가 → 메모리 폴백 (같은 서버를 보는 모든 유저가 공유)
      console.error("DB unavailable, creating session in memory:", (dbErr as Error)?.message);
      memSessions.set(token, { session: newSession, members: [newMember], swipes: [] });
    }

    res.status(201).json({ session: newSession, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create session" });
  }
});

router.get("/sessions/:token", async (req: any, res: any) => {
  const token = req.params.token;
  try {
    const [session] = await db.select().from(sessions).where(eq(sessions.share_token, token));
    if (session) {
      const members = await db.select().from(sessionMembers).where(eq(sessionMembers.session_id, session.id));
      return res.json({ session, members });
    }
  } catch (err) {
    console.error("DB unavailable for fetch, trying memory:", (err as Error)?.message);
  }
  const mem = memByToken(token);
  if (mem) return res.json({ session: mem.session, members: mem.members });
  res.status(404).json({ error: "Session not found" });
});

router.post("/sessions/:token/join", async (req: any, res: any) => {
  const token = req.params.token;
  const { userId, userName, emoji } = req.body;
  try {
    const [session] = await db.select().from(sessions).where(eq(sessions.share_token, token));
    if (session) {
      const existing = await db.select().from(sessionMembers).where(eq(sessionMembers.session_id, session.id));
      const isAlreadyJoined = existing.find(m => m.user_id === userId);

      // 정원 제한: 새 참여자가 group_size를 넘기면 거부 (이미 들어온 사람은 갱신 허용)
      const cap = (session as { group_size?: number }).group_size ?? 99;
      if (!isAlreadyJoined && existing.length >= cap) {
        return res.status(409).json({ error: "session_full", message: "정원이 찼어요", cap });
      }

      if (!isAlreadyJoined) {
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

      return res.status(200).json({ success: true });
    }
  } catch (err) {
    console.error("DB unavailable for join, trying memory:", (err as Error)?.message);
  }
  const mem = memByToken(token);
  if (mem) {
    const existing = mem.members.find(m => m.user_id === userId);
    if (existing) {
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
    }
    return res.status(200).json({ success: true });
  }
  res.status(404).json({ error: "Session not found" });
});

router.post("/sessions/:token/ready", async (req: any, res: any) => {
  const token = req.params.token;
  const { userId, isReady } = req.body;
  try {
    const [session] = await db.select().from(sessions).where(eq(sessions.share_token, token));
    if (session) {
      await db.update(sessionMembers)
        .set({ is_ready: isReady })
        .where(and(eq(sessionMembers.user_id, userId), eq(sessionMembers.session_id, session.id)));
      return res.status(200).json({ success: true });
    }
  } catch (err) {
    console.error("DB unavailable for ready, trying memory:", (err as Error)?.message);
  }
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
  const { status, deadlineMinutes } = req.body;
  // 마감 타이머는 투표 시작(상태 변경) 시점부터 적용
  const patch: Record<string, any> = { status: status.toUpperCase() };
  if (deadlineMinutes) {
    patch.deadline_at = new Date(Date.now() + 1000 * 60 * Number(deadlineMinutes));
  }
  try {
    const [session] = await db.select().from(sessions).where(eq(sessions.share_token, token));
    if (session) {
      await db.update(sessions)
        .set(patch)
        .where(eq(sessions.share_token, token));
      return res.status(200).json({ success: true });
    }
  } catch (err) {
    console.error("DB unavailable for status, trying memory:", (err as Error)?.message);
  }
  const mem = memByToken(token);
  if (mem) {
    Object.assign(mem.session, patch);
    return res.status(200).json({ success: true });
  }
  res.status(404).json({ error: "Session not found" });
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

  const targetCount = Math.min(filteredRestaurants.length, 10);

  const completionMap: Record<string, number> = {};
  sessionSwipes.forEach(s => {
    completionMap[s.user_id] = (completionMap[s.user_id] || 0) + 1;
  });

  const completedMembers = members.filter(m => (completionMap[m.user_id] || 0) >= targetCount);

  const scoresMap: Record<string, { score: number, likeCount: number, dislikeCount: number }> = {};
  sessionSwipes.forEach(s => {
    if (!scoresMap[s.restaurant_id]) {
      scoresMap[s.restaurant_id] = { score: 0, likeCount: 0, dislikeCount: 0 };
    }
    if (s.swipe_action === 'LIKE') {
      scoresMap[s.restaurant_id].score += 14;
      scoresMap[s.restaurant_id].likeCount += 1;
    } else {
      scoresMap[s.restaurant_id].dislikeCount += 1;
    }
  });

  const results = Object.entries(scoresMap).map(([restaurantId, data]) => ({
    restaurantId,
    score: data.score,
    likeCount: data.likeCount,
    dislikeCount: data.dislikeCount
  })).sort((a, b) => b.score - a.score);

  const memberCompletion = members.map(m => ({
    id: m.user_id,
    name: m.user_name,
    emoji: m.emoji,
    completed: (completionMap[m.user_id] || 0) >= targetCount,
    swipeCount: Math.min(completionMap[m.user_id] || 0, targetCount),
    targetCount
  }));

  const isExpired = Date.now() > new Date(session.deadline_at).getTime();

  return {
    completedCount: completedMembers.length,
    totalMembers: members.length,
    memberCompletion,
    isExpired,
    deadlineAt: session.deadline_at,
    results
  };
}

router.get("/sessions/:token/results", async (req: any, res: any) => {
  const token = req.params.token;
  try {
    const [session] = await db.select().from(sessions).where(eq(sessions.share_token, token));
    if (session) {
      const members = await db.select().from(sessionMembers).where(eq(sessionMembers.session_id, session.id));
      const sessionSwipes = await db.select().from(swipes).where(eq(swipes.session_id, session.id));
      const allRestaurants = await db.select().from(restaurants);

      const payload = buildResultsPayload(session, members, sessionSwipes, allRestaurants);

      if (payload.isExpired && session.status !== 'COMPLETED') {
        await db.update(sessions)
          .set({ status: 'COMPLETED' })
          .where(eq(sessions.id, session.id));
      }

      return res.json(payload);
    }
  } catch (err) {
    console.error("DB unavailable for results, trying memory:", (err as Error)?.message);
  }
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
  try {
    const allRestaurants = await db.select().from(restaurants);
    const formatted = allRestaurants.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      tags: r.tags || [],
      rating: r.rating,
      reviewCount: r.review_count,
      distance: "500m", // Mock distance
      address: r.address,
      image: (r.photos && r.photos.length > 0) ? r.photos[0] : "",
      lat: r.latitude,
      lng: r.longitude,
      priceRange: r.price_level,
      openHours: r.business_hours,
      dietary: r.dietary_options || [],
      description: r.short_description
    }));
    // DB가 비어 있으면(시드 전) 멜버른 샘플 데이터로 폴백.
    res.json(formatted.length > 0 ? formatted : mockRestaurantsResponse());
  } catch (err) {
    console.error("Falling back to mock restaurants:", (err as Error)?.message);
    res.json(mockRestaurantsResponse());
  }
});

// Courses
router.get("/courses", async (req: any, res: any) => {
  try {
    const allCourses = await db.select().from(courses);
    const allCourseItems = await db.select().from(courseItems);
    
    const formattedCourses = allCourses.map(c => {
      const stops = allCourseItems.filter(ci => ci.course_id === c.id).map(ci => ({
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
        stops: stops.sort((a, b) => a.order - b.order),
        createdAt: new Date(c.created_at).toISOString().split('T')[0],
        isPublic: c.is_public,
        creatorId: c.author_id,
        savedCount: c.saves_count
      };
    });
    res.json(formattedCourses.length > 0 ? formattedCourses : mockCoursesResponse());
  } catch (err) {
    console.error("Falling back to mock courses:", (err as Error)?.message);
    res.json(mockCoursesResponse());
  }
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
  try {
    await db.insert(swipes).values(row);
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error("DB unavailable for swipe, trying memory:", (err as Error)?.message);
  }
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
  try {
    const rows = await db
      .select({
        id: restaurants.id,
        rating: restaurants.rating,
        review_count: restaurants.review_count,
        price_level: restaurants.price_level,
        category: restaurants.category,
        dietary_options: restaurants.dietary_options,
      })
      .from(restaurants);
    if (rows.length) return rows as Candidate[];
  } catch (err) {
    console.error("DB unavailable for candidates, using mock:", (err as Error)?.message);
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

// 하드 diet 제약 충족 여부. 식당 태그('비건 옵션')와 필터('비건')를 enum으로 정규화해 비교.
const SEAFOOD_RE = /해산물|seafood|스시|sushi|초밥|회|sashimi|오마카세|omakase/i;
function satisfiesDiet(c: Candidate, tag: DietTag): boolean {
  if (tag === "NO_SEAFOOD") return !SEAFOOD_RE.test(c.category ?? "");
  const offered = (c.dietary_options ?? []).map(normalizeDiet);
  return offered.includes(tag);
}

// 유저 diet 입력(라벨/태그)에서 하드 제약만 추출 + 정규화.
function requiredHardDiets(diet?: string[]): DietTag[] {
  const out: DietTag[] = [];
  for (const raw of diet ?? []) {
    const norm = normalizeDiet(raw);
    if (norm && isHardRestriction(norm)) out.push(norm);
  }
  return out;
}

// 이벤트 수집: 단건 또는 { events: [...] } 배치 모두 허용.
router.post("/events", async (req, res) => {
  const body = req.body ?? {};
  const events: RecEventInput[] = Array.isArray(body.events)
    ? body.events
    : body.event_type
      ? [body]
      : [];
  if (!events.length) return res.status(400).json({ error: "no events" });
  // v1 온라인 학습: 스와이프(암묵 라벨)마다 취향 벡터 theta_u를 즉시 SGD 갱신.
  // v2 satiation: WINNER(=소비 프록시)로 (user,카테고리,시각) 소비 이력 누적.
  for (const e of events) {
    if (!e.user_id || !e.restaurant_id) continue;
    const feat = getItemFeatures(String(e.restaurant_id));
    if (!feat) continue;
    const uid = String(e.user_id);
    const vec = buildItemVector(feat);
    if (e.event_type === "SWIPE" && (e.action === "LIKE" || e.action === "NOPE")) {
      updateTaste(uid, vec, e.action === "LIKE" ? 1 : 0); // 스와이프=약한 라벨 (둘 다 별로의 FINAL NOPE도 여기)
    } else if (e.event_type === "SWIPE" && e.action === "CHOOSE") {
      // 듀얼 A>B = 최고급 pairwise 신호 (결정 플로우 ⑤). opponent로 패자 파생해 pairwise 학습.
      // 신뢰도 가중: 빠르고 단호할수록 강하게(decision_ms).
      const c = e.context as { opponent_id?: string; decision_ms?: number } | null | undefined;
      const oppFeat = c?.opponent_id ? getItemFeatures(String(c.opponent_id)) : undefined;
      if (oppFeat) updatePairwise(uid, vec, buildItemVector(oppFeat), pairwiseWeight(c?.decision_ms));
    } else if (e.event_type === "WINNER" && feat.category) {
      updateTaste(uid, vec, 1, 2); // v4: 우승=강한 긍정(직접 선택)
      const ctx = e.context as { consumed_at?: number } | null | undefined;
      const ts = typeof ctx?.consumed_at === "number" ? ctx.consumed_at : Date.now();
      recordConsumption(uid, feat.category, ts); // v2 satiation
      recordStop(uid, feat.category, ts);        // v2 음식 연쇄
    } else if (e.event_type === "COURSE_SAVE") {
      updateTaste(uid, vec, 1, 3); // v4: 저장=가장 강한 명시 신호
    }
  }
  const result = await recordEvents(events);
  res.status(201).json(result);
});

// 추천 슬레이트 + propensity 로깅. v0 휴리스틱 스코어러.
router.post("/recommend", async (req, res) => {
  const body = req.body ?? {};
  // 맥락 보강(Phase 0b): 클라가 안 보낸 파생 가능 필드(시간대·요일·도시·날씨)를 서버에서 채움.
  // 스코어링·IMPRESSION 로깅 모두 보강된 맥락을 쓴다.
  const ctx: RecContext = await enrichContext(body.context ?? {});
  const k = typeof body.k === "number" ? body.k : 7;
  // 진짜 A/B: 서버가 user_id로 결정적 배정 (body.variant는 테스트 오버라이드용).
  const variant: string = body.variant ?? assignVariant(body.user_id);
  const pool = await candidatePool();
  recordCatalogSize(pool.length); // 커버리지 분모(전체 카탈로그 크기) 추적
  recordItemFeatures(pool.map((c) => ({ id: c.id, category: c.category, price_level: c.price_level, rating: c.rating }))); // feature 효과 분석용
  // 클라이언트가 사전 필터(카테고리 등)한 후보만 점수화하도록 범위 제한 (선택)
  const candidateIds: string[] | undefined = Array.isArray(body.candidate_ids) ? body.candidate_ids : undefined;
  const scoped = candidateIds && candidateIds.length
    ? pool.filter((c) => new Set(candidateIds).has(c.id))
    : pool;
  // diet 하드 제약 필터 (정규화 후 매칭). 모두 걸러지면 빈 덱 방지를 위해 완화.
  const reqDiet = requiredHardDiets(ctx.diet);
  let filtered = scoped;
  let diet_relaxed = false;
  if (reqDiet.length) {
    filtered = scoped.filter((c) => reqDiet.every((tag) => satisfiesDiet(c, tag)));
    if (filtered.length === 0) {
      filtered = scoped;
      diet_relaxed = true;
    }
  }
  // 인텐트(밥/카페/디저트) 필터: 후보를 해당 카테고리군으로 제한. 모두 걸러지면 완화.
  let intent_relaxed = false;
  if (ctx.intent) {
    const cats = new Set(categoriesForIntent(ctx.intent));
    const byIntent = filtered.filter((c) => c.category != null && cats.has(c.category));
    if (byIntent.length) filtered = byIntent;
    else intent_relaxed = true;
  }
  // 처치가 실제로 다르다: control=랜덤 베이스라인, B=엔진(취향+노출피로+재소비+연쇄).
  const now = Date.now();
  // 그룹 합의: member_ids 있으면 멤버 취향을 least-misery로 합성. 없으면 단일 유저.
  const memberIds: string[] = Array.isArray(body.member_ids) && body.member_ids.length
    ? body.member_ids.map(String)
    : (body.user_id ? [String(body.user_id)] : []);
  const memberThetas: number[][] = [];
  for (const uid of memberIds) {
    const t = getTaste(uid);
    if (t && t.n >= MIN_TASTE) memberThetas.push(sampleTheta(t)); // 멤버별 Thompson 샘플
  }
  // least-misery: 후보별 멤버 tasteFit의 최소 (아무도 불행하지 않게). 학습된 멤버 없으면 콜드.
  const tasteFit = (c: Candidate) => {
    if (!memberThetas.length) return null;
    const x = buildItemVector(c);
    let m = Infinity;
    for (const th of memberThetas) m = Math.min(m, tasteFitFromTheta(th, x));
    return m;
  };
  const prev = prevStop(body.user_id, now); // 같은 occasion 직전 스톱 (있으면 다음-스톱 가산)
  const slate = variant === "control"
    ? buildControlSlate(filtered, ctx, { k })
    : buildSlate(filtered, ctx, {
        k, eps: 0.05, tasteFit, // 탐색=Thompson, 그룹=least-misery
        exposurePenalty: (id) => exposurePenalty(body.user_id, id, now),
        satiation: (cat) => satiationScore(body.user_id, cat, now),
        chainFit: (cat) => chainFitFn(prev, cat),
      });
  // arm·합성 방식별 model_version
  const mv = variant === "control"
    ? "control-random"
    : memberThetas.length >= 2 ? "v3-group" : memberThetas.length === 1 ? "v3-bandit" : ENGINE_MODEL_VERSION;
  const slate_id = nanoid();
  const slate_type = (body.slate_type as "PRELIM" | "FINAL" | "NEXT_STOP" | "COURSE_FEED") ?? "PRELIM";

  // 노출(IMPRESSION) 이벤트를 slate_id·propensity와 함께 기록 → off-policy 평가 기반
  await recordEvents(
    slate.map((s) => ({
      event_type: "IMPRESSION" as const,
      slate_id,
      slate_type,
      user_id: body.user_id ?? null,
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
  for (const s of slate) recordExposure(body.user_id, s.id, now);

  res.json({ slate, slate_id, slate_type, model_version: mv, variant, diet_relaxed, intent_relaxed });
});

// 디버그: 인메모리 버퍼에 쌓인 이벤트 수 (DB 폴백 동작 확인용)
router.get("/events/_debug", (_req, res) => {
  res.json({ memBuffered: memEventCount() });
});

// 대시보드 집계
router.get("/metrics", (_req, res) => {
  res.json(getMetrics());
});

export default router;
