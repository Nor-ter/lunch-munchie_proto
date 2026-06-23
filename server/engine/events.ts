// 런치 엔진 v0 — 이벤트 기록 (DB 우선, 실패 시 인메모리 폴백)
//
// routes.ts의 세션/식당 폴백과 동일한 취지: Supabase가 일시정지/차단돼도
// 로깅이 앱을 막지 않도록 한다. 인메모리 버퍼는 개발/장애 시 임시 보관용.

import { db } from "../db.js";
import { recEvents } from "../../shared/schema.js";
import type { RecEventInput } from "../../shared/engine.js";
import { nanoid } from "nanoid";

const MEM_CAP = 5000;
const memEvents: Record<string, unknown>[] = [];

export function memEventCount(): number {
  return memEvents.length;
}

// 대시보드용 집계 (dev: 인메모리 버퍼 기준; 프로덕션은 rec_events 쿼리로 대체 예정)
function inc(obj: Record<string, number>, key: unknown) {
  if (key === undefined || key === null || key === "") return;
  const k = String(key);
  obj[k] = (obj[k] ?? 0) + 1;
}

export function getMetrics() {
  const ev = memEvents as Array<Record<string, unknown>>;
  const byType: Record<string, number> = {};
  const bySlate: Record<string, number> = {};
  const byAction: Record<string, number> = {};
  const byVariant: Record<string, number> = {};
  const byRound: Record<string, number> = {};
  let like = 0, nope = 0, choose = 0, impressions = 0, propSum = 0, posSum = 0, dwellSum = 0, dwellN = 0;
  for (const e of ev) {
    inc(byType, e.event_type);
    inc(bySlate, e.slate_type);
    inc(byAction, e.action);
    inc(byVariant, e.variant);
    if (e.round !== undefined && e.round !== null) inc(byRound, "R" + e.round);
    if (e.action === "LIKE") like++;
    else if (e.action === "NOPE") nope++;
    else if (e.action === "CHOOSE") choose++;
    if (e.event_type === "IMPRESSION") {
      impressions++;
      if (typeof e.propensity === "number") propSum += e.propensity;
      if (typeof e.position === "number") posSum += e.position;
    }
    if (typeof e.dwell_ms === "number") { dwellSum += e.dwell_ms; dwellN++; }
  }
  // 조건별 수락률 분해 (round1 예선 스와이프 기준) — "어떤 조건에서 지표가 달라지나"
  const hourBucket = (h: number) =>
    h < 11 ? "아침" : h < 14 ? "점심" : h < 17 ? "오후" : h < 22 ? "저녁" : "심야";
  const posAcc: Record<number, { like: number; nope: number }> = {};
  const varAcc: Record<string, { like: number; nope: number }> = {};
  const userAcc: Record<string, { like: number; nope: number }> = {};
  const timeAcc: Record<string, { like: number; nope: number }> = {};
  const bump = (m: Record<string, { like: number; nope: number }>, k: string, like: boolean) => {
    const b = m[k] ?? (m[k] = { like: 0, nope: 0 });
    like ? b.like++ : b.nope++;
  };
  for (const e of ev) {
    if (e.event_type === "SWIPE" && (e.action === "LIKE" || e.action === "NOPE") && e.round === 1) {
      const like = e.action === "LIKE";
      if (typeof e.position === "number") bump(posAcc as never, String(e.position), like);
      bump(varAcc, String(e.variant ?? "(none)"), like);
      bump(userAcc, String(e.user_id ?? "(anon)"), like);
      const dt = e.created_at instanceof Date ? (e.created_at as Date) : new Date(String(e.created_at));
      bump(timeAcc, hourBucket(dt.getHours()), like);
    }
  }
  const accList = (m: Record<string, { like: number; nope: number }>) =>
    Object.entries(m).map(([k, b]) => ({ key: k, acceptance: b.like + b.nope ? b.like / (b.like + b.nope) : 0, n: b.like + b.nope }));
  const acceptanceByPosition = accList(posAcc as never)
    .map((d) => ({ position: Number(d.key), acceptance: d.acceptance, n: d.n }))
    .sort((a, b) => a.position - b.position);
  const acceptanceByVariant = accList(varAcc).map((d) => ({ variant: d.key, acceptance: d.acceptance, n: d.n }));
  // 유저별 수락률은 "무한 차원" — 절대 나열하지 않는다(10만 유저=10만 막대).
  // 분포(히스토그램)+요약통계로 압축. 표본 적은 유저(스와이프<3)는 노이즈라 제외.
  const userRates = Object.values(userAcc)
    .filter((b) => b.like + b.nope >= 3)
    .map((b) => b.like / (b.like + b.nope))
    .sort((a, b) => a - b);
  const histo = [0, 0, 0, 0, 0];
  for (const r of userRates) histo[Math.min(4, Math.floor(r * 5))]++;
  const userAcceptanceDist = histo.map((c, i) => ({ range: i * 20 + "-" + (i + 1) * 20 + "%", users: c }));
  const q = (p: number) => (userRates.length ? userRates[Math.min(userRates.length - 1, Math.floor(p * userRates.length))] : null);
  const userSummary = { users: userRates.length, median: q(0.5), p10: q(0.1), p90: q(0.9) };
  const order = ["아침", "점심", "오후", "저녁", "심야"];
  const acceptanceByTime = accList(timeAcc)
    .map((d) => ({ bucket: d.key, acceptance: d.acceptance, n: d.n }))
    .sort((a, b) => order.indexOf(a.bucket) - order.indexOf(b.bucket));

  // ── Tier 0: 데이터 신뢰성 (계측 무결성) — 모든 분석의 전제 ──────────────
  // "분석 가능한 데이터인가"를 먼저 본다. 비면 위층 지표는 전부 신뢰 불가.
  const nonNull = (v: unknown) => v !== undefined && v !== null && v !== "";
  const impr = ev.filter((e) => e.event_type === "IMPRESSION");
  const swp = ev.filter((e) => e.event_type === "SWIPE");
  const winr = ev.filter((e) => e.event_type === "WINNER");
  const navi = ev.filter((e) => e.event_type === "NAVIGATE");
  const cov = (arr: typeof ev, pred: (e: (typeof ev)[number]) => boolean) =>
    arr.length ? arr.filter(pred).length / arr.length : null;

  // 4대 필수 로그 (측정계획 §0): slate_id · propensity 승계 · 안정 user_id · timestamp
  const slateLinked = ev.filter((e) => e.event_type === "IMPRESSION" || e.event_type === "SWIPE");
  const userActed = ev.filter((e) => ["IMPRESSION", "SWIPE", "WINNER", "NAVIGATE", "REROLL"].includes(String(e.event_type)));
  const essential = [
    { key: "slate_id", label: "slate_id (노출·스와이프 연결)", coverage: cov(slateLinked, (e) => nonNull(e.slate_id)), n: slateLinked.length },
    { key: "propensity", label: "propensity 승계 (스와이프)", coverage: cov(swp, (e) => typeof e.propensity === "number"), n: swp.length },
    { key: "user_id", label: "안정적 user_id", coverage: cov(userActed, (e) => nonNull(e.user_id)), n: userActed.length },
    { key: "timestamp", label: "timestamp (created_at)", coverage: cov(ev, (e) => nonNull(e.created_at)), n: ev.length },
  ];

  // slate join 무결성: SWIPE.slate_id가 IMPRESSION.slate_id 집합에 실제로 존재하나
  const imprSlateIds = new Set(impr.map((e) => e.slate_id).filter(nonNull).map(String));
  const swWithSlate = swp.filter((e) => nonNull(e.slate_id));
  const slateJoinMatched = swWithSlate.filter((e) => imprSlateIds.has(String(e.slate_id))).length;
  const slateJoin = { matched: slateJoinMatched, total: swWithSlate.length, rate: swWithSlate.length ? slateJoinMatched / swWithSlate.length : null };

  // 맥락 스냅샷 커버리지 (IMPRESSION의 context 기준) — weather 등 미수집을 정직하게 폭로
  const ctxKeys = ["time_of_day", "day_of_week", "weather", "minutes_since_meal", "companions", "city", "diet"];
  const contextCoverage = ctxKeys.map((key) => {
    const present = impr.filter((e) => {
      const c = e.context as Record<string, unknown> | null | undefined;
      if (!c || typeof c !== "object") return false;
      const v = c[key];
      return Array.isArray(v) ? v.length > 0 : nonNull(v);
    }).length;
    return { key, coverage: impr.length ? present / impr.length : null, n: impr.length };
  });

  // 퍼널: 노출 → 스와이프 → 우승 → 길찾기 (중간 누락 = 계측 구멍)
  const funnel = [
    { stage: "노출", count: impr.length },
    { stage: "스와이프", count: swp.length },
    { stage: "우승", count: winr.length },
    { stage: "길찾기", count: navi.length },
  ];

  // 볼륨·신선도
  const tsArr = ev
    .map((e) => (e.created_at instanceof Date ? (e.created_at as Date).getTime() : new Date(String(e.created_at)).getTime()))
    .filter((n) => !isNaN(n));
  const sessionSet = new Set(ev.map((e) => e.session_id).filter(nonNull).map(String));
  const volume = {
    total: ev.length,
    sessions: sessionSet.size,
    eventsPerSession: sessionSet.size ? ev.length / sessionSet.size : null,
    lastEventTs: tsArr.length ? new Date(Math.max(...tsArr)).toISOString() : null,
  };

  const dataHealth = { essential, slateJoin, contextCoverage, funnel, volume };

  const recent = ev.slice(-40).reverse().map((e) => ({
    ts: e.created_at instanceof Date ? (e.created_at as Date).toISOString() : String(e.created_at ?? ""),
    user_id: e.user_id ?? null,
    event_type: e.event_type ?? null,
    slate_type: e.slate_type ?? null,
    action: e.action ?? null,
    restaurant_id: e.restaurant_id ?? null,
    position: e.position ?? null,
    propensity: typeof e.propensity === "number" ? Number((e.propensity as number).toFixed(4)) : null,
    round: e.round ?? null,
    variant: e.variant ?? null,
    session_id: e.session_id ?? null,
  }));
  return {
    total: ev.length,
    dataHealth,
    byType, bySlate, byAction, byVariant, byRound,
    swipes: { like, nope, acceptance: like + nope > 0 ? like / (like + nope) : null },
    duels: choose,
    impressions,
    navigate: byType["NAVIGATE"] ?? 0,
    winner: byType["WINNER"] ?? 0,
    reroll: byType["REROLL"] ?? 0,
    avgPropensity: impressions > 0 ? propSum / impressions : null,
    avgPosition: impressions > 0 ? posSum / impressions : null,
    avgDwellMs: dwellN > 0 ? dwellSum / dwellN : null,
    acceptanceByPosition,
    acceptanceByVariant,
    userAcceptanceDist,
    userSummary,
    acceptanceByTime,
    recent,
  };
}

function toRow(e: RecEventInput) {
  return {
    id: nanoid(),
    event_type: e.event_type,
    slate_id: e.slate_id ?? null,
    slate_type: e.slate_type ?? null,
    user_id: e.user_id ?? null,
    session_id: e.session_id ?? null,
    group_id: e.group_id ?? null,
    restaurant_id: e.restaurant_id ?? null,
    round: e.round ?? null,
    position: e.position ?? null,
    action: e.action ?? null,
    propensity: e.propensity ?? null,
    score: e.score ?? null,
    model_version: e.model_version ?? null,
    variant: e.variant ?? null,
    dwell_ms: e.dwell_ms ?? null,
    context: (e.context ?? null) as Record<string, unknown> | null,
    created_at: new Date(),
  };
}

export async function recordEvents(
  events: RecEventInput[]
): Promise<{ ok: boolean; count: number; persisted: boolean }> {
  if (!events?.length) return { ok: true, count: 0, persisted: false };
  const rows = events.map(toRow);
  try {
    await db.insert(recEvents).values(rows);
    return { ok: true, count: rows.length, persisted: true };
  } catch (err) {
    console.error("DB unavailable for rec_events, buffering in memory:", (err as Error)?.message);
    for (const r of rows) {
      memEvents.push(r);
      if (memEvents.length > MEM_CAP) memEvents.shift();
    }
    return { ok: true, count: rows.length, persisted: false };
  }
}
