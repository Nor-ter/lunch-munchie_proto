// 런치 엔진 v0 — 이벤트 기록 (DB 우선, 실패 시 인메모리 폴백)
//
// routes.ts의 세션/식당 폴백과 동일한 취지: Supabase가 일시정지/차단돼도
// 로깅이 앱을 막지 않도록 한다. 인메모리 버퍼는 개발/장애 시 임시 보관용.

import { db } from "../db.js";
import { recEvents } from "../../shared/schema.js";
import type { RecEventInput } from "../../shared/engine.js";
import { assignVariant } from "./scorer.js";
import { tasteStats } from "./taste.js";
import { exposureStats } from "./exposure.js";
import { satiationStats, satiationCurve } from "./satiation.js";
import { nanoid } from "nanoid";

const MEM_CAP = 5000;
const memEvents: Record<string, unknown>[] = [];

export function memEventCount(): number {
  return memEvents.length;
}

// 카탈로그 크기(커버리지 분모) — /recommend가 후보 풀 크기를 알려준다.
let catalogSize = 0;
export function recordCatalogSize(n: number): void {
  if (n > catalogSize) catalogSize = n;
}

// 아이템 피처(카테고리·가격·평점) — feature 효과 분석에서 restaurant_id로 조인.
type ItemFeat = { category?: string; price_level?: number; rating?: number };
const itemFeatures = new Map<string, ItemFeat>();
export function recordItemFeatures(
  items: { id: string; category?: string | null; price_level?: number | null; rating?: number | null }[]
): void {
  for (const it of items)
    if (it.id) itemFeatures.set(it.id, { category: it.category ?? undefined, price_level: it.price_level ?? undefined, rating: it.rating ?? undefined });
}

// v1 온라인 학습기가 restaurant_id로 아이템 메타(카테고리·가격)를 조회 → x_i 계산
export function getItemFeatures(id: string): ItemFeat | undefined {
  return itemFeatures.get(id);
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
  // 조건별 수락률 분해 (round1 예선 스와이프) — 포지션 편향 + 유저 분포
  // (시간대·A/B·feature 분해는 Tier 3·4로 일반화됨)
  const posAcc: Record<number, { like: number; nope: number }> = {};
  const userAcc: Record<string, { like: number; nope: number }> = {};
  const bump = (m: Record<string, { like: number; nope: number }>, k: string, like: boolean) => {
    const b = m[k] ?? (m[k] = { like: 0, nope: 0 });
    like ? b.like++ : b.nope++;
  };
  for (const e of ev) {
    if (e.event_type === "SWIPE" && (e.action === "LIKE" || e.action === "NOPE") && e.round === 1) {
      const like = e.action === "LIKE";
      if (typeof e.position === "number") bump(posAcc as never, String(e.position), like);
      bump(userAcc, String(e.user_id ?? "(anon)"), like);
    }
  }
  const accList = (m: Record<string, { like: number; nope: number }>) =>
    Object.entries(m).map(([k, b]) => ({ key: k, acceptance: b.like + b.nope ? b.like / (b.like + b.nope) : 0, n: b.like + b.nope }));
  const acceptanceByPosition = accList(posAcc as never)
    .map((d) => ({ position: Number(d.key), acceptance: d.acceptance, n: d.n }))
    .sort((a, b) => a.position - b.position);
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

  // ── Tier 1: 결정 만족(결과축) ⟂ 과정 피로(여정축) — 세션 단위 ──────────
  // 측정 철학: 두 축은 다르므로 따로 측정. 세션을 단위로 신호를 모은다.
  const median = (arr: number[]) => {
    if (!arr.length) return null;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };
  type SwipeRec = { pos: number | null; like: boolean; dwell: number | null };
  type SessAgg = {
    swipes: SwipeRec[]; winner: boolean; navigate: boolean; reroll: boolean;
    survey: string | null; winnerTs: number | null; firstTs: number | null; decisionMs: number | null; variant: string | null;
  };
  const sessMap = new Map<string, SessAgg>();
  const getSess = (id: string) => {
    let o = sessMap.get(id);
    if (!o) { o = { swipes: [], winner: false, navigate: false, reroll: false, survey: null, winnerTs: null, firstTs: null, decisionMs: null, variant: null }; sessMap.set(id, o); }
    return o;
  };
  for (const e of ev) {
    const sid = nonNull(e.session_id) ? String(e.session_id) : null;
    if (!sid) continue;
    const o = getSess(sid);
    if (o.variant == null && nonNull(e.variant)) o.variant = String(e.variant);
    const t = e.created_at instanceof Date ? (e.created_at as Date).getTime() : new Date(String(e.created_at)).getTime();
    if (!isNaN(t) && (o.firstTs == null || t < o.firstTs)) o.firstTs = t;
    switch (e.event_type) {
      case "SWIPE":
        if (e.action === "LIKE" || e.action === "NOPE")
          o.swipes.push({ pos: typeof e.position === "number" ? e.position : null, like: e.action === "LIKE", dwell: typeof e.dwell_ms === "number" ? e.dwell_ms : null });
        break;
      case "WINNER": {
        o.winner = true;
        if (!isNaN(t)) o.winnerTs = t;
        const c = e.context as Record<string, unknown> | null | undefined;
        if (c && typeof c.decision_time_ms === "number") o.decisionMs = c.decision_time_ms;
        break;
      }
      case "NAVIGATE": o.navigate = true; break;
      case "REROLL": o.reroll = true; break;
      case "SURVEY": o.survey = (e.action as string) ?? null; break; // POS|NEU|NEG
    }
  }
  // "시도된" 세션만 (스와이프가 있거나 우승에 도달) — 노출만 있고 안 한 건 제외
  const attempted = Array.from(sessMap.values()).filter((o) => o.swipes.length > 0 || o.winner);

  let satImplicit = 0, satConfirmed = 0, confirmable = 0;
  let reachWinner = 0, noReroll = 0, navigated = 0, abandoned = 0, rerolledSess = 0;
  const decisionTimes: number[] = [], swipeCounts: number[] = [];
  let earlyNope = 0, earlyTot = 0, lateNope = 0, lateTot = 0;
  let earlyDwellSum = 0, earlyDwellN = 0, lateDwellSum = 0, lateDwellN = 0;
  const survey = { POS: 0, NEU: 0, NEG: 0 };
  const quadInput: { satisfied: boolean; dt: number | null; swipes: number; reroll: boolean; abandoned: boolean }[] = [];

  for (const o of attempted) {
    if (o.winner) reachWinner++; else abandoned++;
    if (o.reroll) rerolledSess++; else noReroll++;
    if (o.navigate) navigated++;
    if (o.survey === "POS") survey.POS++; else if (o.survey === "NEU") survey.NEU++; else if (o.survey === "NEG") survey.NEG++;

    const dt = o.decisionMs ?? (o.winnerTs != null && o.firstTs != null ? o.winnerTs - o.firstTs : null);
    if (dt != null) decisionTimes.push(dt);
    swipeCounts.push(o.swipes.length);

    // 초반/후반 분할 (position 우선, 없으면 배열 순서) → 후반 피로 측정
    const sw = o.swipes;
    const ordered = sw.every((s) => s.pos != null) ? [...sw].sort((a, b) => (a.pos as number) - (b.pos as number)) : sw;
    const lateFrom = Math.ceil(ordered.length / 2);
    ordered.forEach((s, i) => {
      const late = i >= lateFrom;
      if (late) { lateTot++; if (!s.like) lateNope++; if (s.dwell != null) { lateDwellSum += s.dwell; lateDwellN++; } }
      else { earlyTot++; if (!s.like) earlyNope++; if (s.dwell != null) { earlyDwellSum += s.dwell; earlyDwellN++; } }
    });

    const satImp = o.winner && !o.reroll && o.navigate; // 암묵 만족: 우승∧재롤없음∧길찾기
    if (satImp) satImplicit++;
    if (o.survey != null) { confirmable++; if (satImp && o.survey === "POS") satConfirmed++; } // 확정: 회고 있는 세션만
    quadInput.push({ satisfied: satImp, dt, swipes: o.swipes.length, reroll: o.reroll, abandoned: !o.winner });
  }

  // 2×2: 만족(세로) × 피로(가로). 피로 = 재롤∨이탈∨결정시간>중앙값∨스와이프수>중앙값
  const dtMed = median(decisionTimes), swMed = median(swipeCounts);
  const quad: Record<string, number> = { "만족·피로낮음": 0, "만족·피로높음": 0, "불만족·피로낮음": 0, "불만족·피로높음": 0 };
  for (const q of quadInput) {
    const fatigued = q.reroll || q.abandoned || (dtMed != null && q.dt != null && q.dt > dtMed) || (swMed != null && q.swipes > swMed);
    quad[(q.satisfied ? "만족" : "불만족") + "·" + (fatigued ? "피로높음" : "피로낮음")]++;
  }

  const satisfaction = {
    sessions: attempted.length,
    implicitRate: attempted.length ? satImplicit / attempted.length : null,
    confirmedRate: confirmable ? satConfirmed / confirmable : null,
    confirmable,
    components: [
      { key: "우승 도달", rate: attempted.length ? reachWinner / attempted.length : null },
      { key: "재롤 없음", rate: attempted.length ? noReroll / attempted.length : null },
      { key: "길찾기", rate: attempted.length ? navigated / attempted.length : null },
    ],
    survey,
  };
  const fatigue = {
    decisionTimeMedianMs: dtMed,
    swipesMedian: swMed,
    earlyNopeRate: earlyTot ? earlyNope / earlyTot : null,
    lateNopeRate: lateTot ? lateNope / lateTot : null,
    earlyDwellMs: earlyDwellN ? earlyDwellSum / earlyDwellN : null,
    lateDwellMs: lateDwellN ? lateDwellSum / lateDwellN : null,
    rerollRate: attempted.length ? rerolledSess / attempted.length : null,
    abandonRate: attempted.length ? abandoned / attempted.length : null,
  };
  const quadrants = Object.entries(quad).map(([quadrant, sessions]) => ({ quadrant, sessions }));

  // ── Tier 2: 메커니즘 (가설 검증) — "엔진이 실제로 작동하나" ──────────────
  const tsOf = (e: Record<string, unknown>) =>
    e.created_at instanceof Date ? (e.created_at as Date).getTime() : new Date(String(e.created_at)).getTime();
  const evSorted = [...ev].sort((a, b) => tsOf(a) - tsOf(b));

  // A. 노출 피로: (user,restaurant) 누적 노출 ↔ LIKE율 감소 (엔진 시그니처)
  const expCount = new Map<string, number>();
  const fb: Record<string, { like: number; nope: number }> = { "1": { like: 0, nope: 0 }, "2": { like: 0, nope: 0 }, "3+": { like: 0, nope: 0 } };
  for (const e of evSorted) {
    const rid = nonNull(e.restaurant_id) ? String(e.restaurant_id) : null;
    if (!rid) continue;
    const key = (nonNull(e.user_id) ? String(e.user_id) : "(anon)") + "|" + rid;
    if (e.event_type === "IMPRESSION") expCount.set(key, (expCount.get(key) ?? 0) + 1);
    else if (e.event_type === "SWIPE" && (e.action === "LIKE" || e.action === "NOPE")) {
      const seen = expCount.get(key) ?? 1;
      const bucket = seen <= 1 ? "1" : seen === 2 ? "2" : "3+";
      if (e.action === "LIKE") fb[bucket].like++; else fb[bucket].nope++;
    }
  }
  const exposureFatigue = Object.entries(fb).map(([exposures, b]) => ({
    exposures, likeRate: b.like + b.nope ? b.like / (b.like + b.nope) : null, n: b.like + b.nope,
  }));

  // B. 분별력: 모델 score 사분위 → 실제 LIKE율 (score가 선호를 예측하나)
  const imprScore = new Map<string, number>();
  for (const e of ev)
    if (e.event_type === "IMPRESSION" && typeof e.score === "number" && nonNull(e.slate_id) && nonNull(e.restaurant_id))
      imprScore.set(String(e.slate_id) + "|" + String(e.restaurant_id), e.score as number);
  const swScored: { score: number; like: boolean }[] = [];
  for (const e of ev)
    if (e.event_type === "SWIPE" && (e.action === "LIKE" || e.action === "NOPE")) {
      let sc = typeof e.score === "number" ? (e.score as number) : undefined;
      if (sc === undefined && nonNull(e.slate_id) && nonNull(e.restaurant_id))
        sc = imprScore.get(String(e.slate_id) + "|" + String(e.restaurant_id));
      if (typeof sc === "number") swScored.push({ score: sc, like: e.action === "LIKE" });
    }
  swScored.sort((a, b) => a.score - b.score);
  let discriminationBuckets: { q: string; likeRate: number; n: number }[] = [];
  let discriminationGap: number | null = null;
  if (swScored.length >= 4) {
    const labels = ["Q1(낮음)", "Q2", "Q3", "Q4(높음)"];
    const quarts: { score: number; like: boolean }[][] = [[], [], [], []];
    swScored.forEach((s, i) => quarts[Math.min(3, Math.floor((i / swScored.length) * 4))].push(s));
    discriminationBuckets = quarts.map((q, i) => ({ q: labels[i], likeRate: q.length ? q.filter((x) => x.like).length / q.length : 0, n: q.length }));
    discriminationGap = discriminationBuckets[3].likeRate - discriminationBuckets[0].likeRate;
  }
  const discrimination = { n: swScored.length, buckets: discriminationBuckets, gap: discriminationGap };

  // C. 탐색 건강성: novelty(첫 노출 비율) · coverage · propensity 분포
  const seenSet = new Set<string>();
  const distinctShown = new Set<string>();
  const propVals: number[] = [];
  let firstTime = 0, totalImpr = 0;
  for (const e of evSorted)
    if (e.event_type === "IMPRESSION") {
      totalImpr++;
      const rid = nonNull(e.restaurant_id) ? String(e.restaurant_id) : "?";
      distinctShown.add(rid);
      const key = (nonNull(e.user_id) ? String(e.user_id) : "(anon)") + "|" + rid;
      if (!seenSet.has(key)) { firstTime++; seenSet.add(key); }
      if (typeof e.propensity === "number") propVals.push(e.propensity as number);
    }
  const propHist = [0, 0, 0, 0, 0];
  for (const p of propVals) propHist[p < 0.02 ? 0 : p < 0.05 ? 1 : p < 0.1 ? 2 : p < 0.2 ? 3 : 4]++;
  const exploration = {
    noveltyRate: totalImpr ? firstTime / totalImpr : null,
    distinctShown: distinctShown.size,
    catalogSize: catalogSize > 0 ? catalogSize : null,
    coverage: catalogSize > 0 ? distinctShown.size / catalogSize : null,
    propensityDist: [
      { range: "<2%", n: propHist[0] }, { range: "2-5%", n: propHist[1] }, { range: "5-10%", n: propHist[2] },
      { range: "10-20%", n: propHist[3] }, { range: "20%+", n: propHist[4] },
    ],
  };

  // D. 그룹 공정성: 멀티멤버 그룹에서 우승을 각 멤버가 LIKE 했나 (least-misery)
  const grp = new Map<string, { users: Set<string>; winner: string | null; likes: Map<string, Set<string>> }>();
  for (const e of ev) {
    const g = nonNull(e.group_id) ? String(e.group_id) : null;
    if (!g) continue;
    let o = grp.get(g);
    if (!o) { o = { users: new Set(), winner: null, likes: new Map() }; grp.set(g, o); }
    if (nonNull(e.user_id)) o.users.add(String(e.user_id));
    if (e.event_type === "WINNER" && nonNull(e.restaurant_id)) o.winner = String(e.restaurant_id);
    if (e.event_type === "SWIPE" && e.action === "LIKE" && nonNull(e.restaurant_id) && nonNull(e.user_id)) {
      const rid = String(e.restaurant_id);
      let s = o.likes.get(rid);
      if (!s) { s = new Set(); o.likes.set(rid, s); }
      s.add(String(e.user_id));
    }
  }
  let multiGroups = 0, unanimous = 0, someoneUnhappy = 0, consensusSum = 0;
  for (const o of Array.from(grp.values())) {
    if (o.users.size < 2 || !o.winner) continue;
    multiGroups++;
    const likedWinner = o.likes.get(o.winner) ?? new Set<string>();
    let liked = 0;
    for (const u of Array.from(o.users)) if (likedWinner.has(u)) liked++;
    const consensus = liked / o.users.size;
    consensusSum += consensus;
    if (consensus >= 1) unanimous++; else someoneUnhappy++;
  }
  const groupFairness = {
    multiGroups,
    avgConsensus: multiGroups ? consensusSum / multiGroups : null,
    unanimousRate: multiGroups ? unanimous / multiGroups : null,
    someoneUnhappyRate: multiGroups ? someoneUnhappy / multiGroups : null,
  };

  const mechanism = { exposureFatigue, discrimination, exploration, groupFairness, satiationCurve: satiationCurve() };

  // ── Tier 3: 맥락·아이템 feature 효과 (일반 분석) ──────────────────────
  // "어떤 feature가 수락률을 얼마나 움직이나" — 수집된 모든 차원을 일반적으로 분해.
  // 주의: marginal 분해는 상관까지. 진짜 효과(인과)는 confound 통제(모델)·실험(Phase4) 필요.
  const slateCtx = new Map<string, Record<string, unknown>>();
  for (const e of ev)
    if (e.event_type === "IMPRESSION" && nonNull(e.slate_id) && e.context && typeof e.context === "object" && !slateCtx.has(String(e.slate_id)))
      slateCtx.set(String(e.slate_id), e.context as Record<string, unknown>);

  const companionBucket = (n: unknown) => (typeof n === "number" ? (n <= 1 ? "혼자" : n <= 3 ? "2-3명" : "4명+") : null);
  const dietBucket = (d: unknown) => (Array.isArray(d) ? (d.length ? "제약있음" : "제약없음") : null);
  const priceBucket = (p: unknown) => (typeof p === "number" && p > 0 ? "$".repeat(Math.min(4, p)) : null);
  const ratingBucket = (r: unknown) => (typeof r === "number" ? (r >= 4.5 ? "4.5+" : r >= 4.0 ? "4.0–4.5" : r >= 3.5 ? "3.5–4.0" : "<3.5") : null);

  type Dim = { key: string; group: string; get: (sw: Record<string, unknown>, c: Record<string, unknown> | undefined, f: ItemFeat | undefined) => string | null };
  const dims: Dim[] = [
    { key: "날씨", group: "맥락", get: (_s, c) => (c?.weather as string) ?? null },
    { key: "시간대", group: "맥락", get: (_s, c) => (c?.time_of_day as string) ?? null },
    { key: "요일", group: "맥락", get: (_s, c) => (c?.day_of_week as string) ?? null },
    { key: "동행", group: "맥락", get: (_s, c) => companionBucket(c?.companions) },
    { key: "diet", group: "맥락", get: (_s, c) => dietBucket(c?.diet) },
    { key: "카테고리", group: "아이템", get: (_s, _c, f) => f?.category ?? null },
    { key: "가격대", group: "아이템", get: (_s, _c, f) => priceBucket(f?.price_level) },
    { key: "평점", group: "아이템", get: (_s, _c, f) => ratingBucket(f?.rating) },
    { key: "A/B 변형", group: "실험", get: (s) => (s.variant as string) ?? null },
  ];
  const MIN_BUCKET_N = 5;
  const swipesR1 = ev.filter((e) => e.event_type === "SWIPE" && (e.action === "LIKE" || e.action === "NOPE") && e.round === 1);
  const featureEffects = dims
    .map((dim) => {
      const buckets = new Map<string, { like: number; n: number }>();
      for (const sw of swipesR1) {
        const c = nonNull(sw.slate_id) ? slateCtx.get(String(sw.slate_id)) : undefined;
        const f = nonNull(sw.restaurant_id) ? itemFeatures.get(String(sw.restaurant_id)) : undefined;
        const v = dim.get(sw, c, f);
        if (v == null) continue;
        const b = buckets.get(v) ?? { like: 0, n: 0 };
        b.n++;
        if (sw.action === "LIKE") b.like++;
        buckets.set(v, b);
      }
      const arr = Array.from(buckets.entries())
        .map(([value, b]) => ({ value, rate: b.n ? b.like / b.n : 0, n: b.n }))
        .filter((x) => x.n >= MIN_BUCKET_N)
        .sort((a, b) => b.rate - a.rate);
      // 효과 = 수락률 변동폭(최고-최저 버킷). 버킷 1개뿐이면 측정 불가(표본 다양성 부족).
      const effect = arr.length >= 2 ? arr[0].rate - arr[arr.length - 1].rate : null;
      return { key: dim.key, group: dim.group, effect, buckets: arr };
    })
    .sort((a, b) => (b.effect ?? -1) - (a.effect ?? -1));

  // ── Tier 4: 진짜 A/B 실험 readout ──────────────────────────────────
  // 점추정 막대가 아니라 "판정" — 차이가 노이즈인지 구분(CI·유의성·가드레일·SRM).
  const normalCdf = (z: number) => {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp((-z * z) / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  };
  // 배정(랜덤 단위=user, 결정적) — SRM·표본은 배정 기준. 그룹 오염과 무관하게 disjoint.
  const userArm = new Map<string, string>();
  for (const e of ev) if (nonNull(e.user_id)) { const u = String(e.user_id); if (!userArm.has(u)) userArm.set(u, assignVariant(u)); }
  let u1 = 0, u2 = 0;
  for (const a of Array.from(userArm.values())) { if (a === "control") u1++; else u2++; }
  // 노출·결과는 served policy(e.variant) 기준 (슬레이트를 생성한 정책에 귀속)
  const arm: Record<string, { sessions: Set<string>; like: number; nope: number }> = {
    control: { sessions: new Set(), like: 0, nope: 0 },
    B: { sessions: new Set(), like: 0, nope: 0 },
  };
  for (const e of ev) {
    const v = e.variant === "B" ? "B" : e.variant === "control" ? "control" : null;
    if (!v) continue;
    const a = arm[v];
    if (nonNull(e.session_id)) a.sessions.add(String(e.session_id));
    if (e.event_type === "SWIPE" && e.action === "LIKE") a.like++;
    else if (e.event_type === "SWIPE" && e.action === "NOPE") a.nope++;
  }
  const cA = arm.control, bA = arm.B;
  const n1 = cA.like + cA.nope, n2 = bA.like + bA.nope;
  const p1 = n1 ? cA.like / n1 : null, p2 = n2 ? bA.like / n2 : null;
  let delta: number | null = null, ciLo: number | null = null, ciHi: number | null = null, pValue: number | null = null;
  if (p1 != null && p2 != null && n1 > 0 && n2 > 0) {
    delta = p2 - p1;
    const se = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
    ciLo = delta - 1.96 * se; ciHi = delta + 1.96 * se;
    const pPool = (cA.like + bA.like) / (n1 + n2);
    const sePool = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
    const z = sePool > 0 ? delta / sePool : 0;
    pValue = 2 * (1 - normalCdf(Math.abs(z)));
  }
  // SRM: 배정 단위(user) 50/50 기대 대비 카이제곱(df=1)
  const uT = u1 + u2;
  let srmP: number | null = null;
  if (uT > 0) {
    const exp = uT / 2;
    const chi = (Math.pow(u1 - exp, 2) + Math.pow(u2 - exp, 2)) / exp;
    srmP = 2 * (1 - normalCdf(Math.sqrt(chi)));
  }
  const srmOk = srmP == null || srmP > 0.01;
  // 가드레일: 결정시간 중앙값 · 이탈율 (arm별, 세션 단위)
  const armSess: Record<string, { dts: number[]; abandon: number; total: number }> = {
    control: { dts: [], abandon: 0, total: 0 }, B: { dts: [], abandon: 0, total: 0 },
  };
  for (const o of attempted) {
    const v = o.variant === "B" ? "B" : o.variant === "control" ? "control" : null;
    if (!v) continue;
    const a = armSess[v];
    a.total++;
    if (!o.winner) a.abandon++;
    const dt = o.decisionMs ?? (o.winnerTs != null && o.firstTs != null ? o.winnerTs - o.firstTs : null);
    if (dt != null) a.dts.push(dt);
  }
  const dtC = median(armSess.control.dts), dtB = median(armSess.B.dts);
  // 판정: 무효(SRM) → 보류(표본부족·무의미) → ship/롤백
  let verdict = "보류", verdictReason = "";
  if (!srmOk) { verdict = "무효"; verdictReason = "SRM — 배정 불균형(실험 신뢰 불가)"; }
  else if (pValue == null || n1 < 30 || n2 < 30) { verdict = "보류"; verdictReason = "표본 부족 (각 arm ≥30 스와이프 필요)"; }
  else if (pValue < 0.05 && delta != null && delta > 0) {
    const guardBreach = dtC != null && dtB != null && dtB > dtC * 1.2;
    if (guardBreach) { verdict = "롤백"; verdictReason = "1차 개선이지만 가드레일(결정시간) 악화"; }
    else { verdict = "ship"; verdictReason = "유의한 개선, 가드레일 통과"; }
  } else if (pValue < 0.05 && delta != null && delta < 0) { verdict = "롤백"; verdictReason = "유의하게 악화"; }
  else { verdict = "보류"; verdictReason = "유의하지 않음 (CI가 0 포함)"; }
  const experiment = {
    arms: [
      { arm: "control(랜덤)", users: u1, sessions: cA.sessions.size, swipes: n1, likeRate: p1 },
      { arm: "B(엔진)", users: u2, sessions: bA.sessions.size, swipes: n2, likeRate: p2 },
    ],
    srm: { ok: srmOk, p: srmP, control: u1, B: u2 },
    primary: { metric: "수락률 (스와이프 단위)", delta, ciLo, ciHi, pValue, n1, n2 },
    guardrails: {
      decisionTimeControlMs: dtC, decisionTimeBMs: dtB,
      abandonControl: armSess.control.total ? armSess.control.abandon / armSess.control.total : null,
      abandonB: armSess.B.total ? armSess.B.abandon / armSess.B.total : null,
    },
    verdict, verdictReason,
  };

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
    satisfaction, fatigue, quadrants,
    mechanism,
    featureEffects,
    experiment,
    engine: { ...tasteStats(), ...exposureStats(), ...satiationStats() },
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
    userAcceptanceDist,
    userSummary,
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
