// 런치 엔진 v0 — 휴리스틱 스코어러 + propensity 샘플링
//
// v0 목표: "평판 + 맥락" 휴리스틱으로 슬레이트를 만들되, 각 노출 아이템의
// propensity(보여줄 확률)를 함께 산출한다. 이 propensity가 있어야 나중에
// off-policy 평가(IPS/DR)와 contextual bandit(v3)으로 확장할 수 있다.
//
// 정책: p_i = (1-eps)·softmax(score_i / tau) + eps·(1/N)  (epsilon-탐색 혼합)
// 슬레이트는 p_i 분포에서 비복원 샘플링 → 로그된 propensity = 실제 노출 확률(근사).

import type { Candidate, RecContext, ScoredItem } from "../../shared/engine.js";
import { buildItemVector, FEATURE_DIM, FEATURE_KEYS } from "./features.js";

export interface SlateOptions {
  k?: number;    // 슬레이트 크기 (예선 카드 수)
  eps?: number;  // 탐색 비율 (0~1)
  tau?: number;  // softmax 온도
  seed?: number; // 재현용(테스트)
  tasteFit?: (c: Candidate) => number | null; // v3 취향 적합도 [0,1] (단일=샘플θ·x, 그룹=멤버 min). null=콜드
  exposurePenalty?: (id: string) => number; // v1 단기 노출 피로 g(누적 노출) in [0,1)
  satiation?: (category: string | undefined) => number; // v2 재소비 갈망 in [-0.5,+0.5)
  chainFit?: (category: string | undefined) => number; // v2 음식 연쇄 P(next|prev) in [0,1]
  // 평점이 없는 카탈로그(팀 인제스천 식당은 rating=0)에서 평판을 대체하는 사전확률 [0,1].
  // 외부 평점이 들어오면 rating 기반 reputation 이 우선한다.
  reputationPrior?: (id: string) => number | null;
  inclusionTrials?: number; // 마진 포함확률 몬테카를로 횟수 (기본 300)
}

const W_FATIGUE = 0.3; // -w6 단기 노출 피로 가중
const W_SATIATION = 0.3; // ±w7 장기 재소비 갈망 가중
const W_CHAIN = 0.4; // 음식 연쇄 가중 (NEXT_STOP에서 직전 스톱 다음 적합도)

function norm(x: number, lo: number, hi: number): number {
  if (hi <= lo) return 0;
  return Math.max(0, Math.min(1, (x - lo) / (hi - lo)));
}

// 맥락 → "이 상황에서 원하는 피처 방향" 가중 벡터.
//
// 왜 정규식을 버렸나(감사 개선 3): 카테고리 문자열 매칭은 ① 매칭 안 되는 카테고리가
// 통째로 사각지대가 되고(레스토랑·바 등 21곳이 항상 0.5 고정) ② 언어가 바뀌면 전부
// 무력화되며(features.ts에서 한글 정규식 때문에 전 카탈로그가 NEUTRAL로 떨어진 전례)
// ③ 값이 몇 개의 이산점으로만 나와 순위를 못 매긴다(고유값 2/118).
// 대신 이미 사진·메뉴에서 뽑아둔 **연속 피처 벡터**와 맥락을 내적한다.
const KEY_IDX = Object.fromEntries(FEATURE_KEYS.map((k, i) => [k, i])) as Record<string, number>;

export function contextWeights(ctx: RecContext): number[] {
  const w = new Array(FEATURE_DIM).fill(0);
  const add = (k: string, v: number) => { const i = KEY_IDX[k]; if (i !== undefined) w[i] += v; };

  if (ctx.weather === "rain" || ctx.weather === "cold") {
    add("oily", 0.35); add("salty", 0.20); add("light", -0.35); // 따뜻하고 든든한 쪽
  } else if (ctx.weather === "hot") {
    add("light", 0.35); add("sweet", 0.20); add("oily", -0.30); // 가볍고 시원한 쪽
  }
  if (ctx.time_of_day === "evening") add("price", 0.25);          // 저녁 → 객단가 허용
  if (ctx.time_of_day === "morning") { add("cafe", 0.30); add("sweet", 0.20); add("light", 0.20); }
  if (ctx.time_of_day === "late") { add("salty", 0.20); add("oily", 0.20); }

  const n = typeof ctx.companions === "number" ? ctx.companions : 0;
  if (n === 1) {                                                  // 혼밥 → 가볍고 부담 적은 쪽
    add("light", 0.25); add("price", -0.20); add("cafe", 0.15);
  } else if (n >= 2) {                                            // 같이 → 나눠먹기 좋은 쪽
    add("oily", 0.20); add("salty", 0.15); add("light", -0.20);
    if (n >= 5) add("price", 0.10);
  }
  // 인텐트(밥/카페/디저트)는 후보 필터에서 이미 걸러지므로 여기선 약한 보정만.
  if (ctx.intent === "cafe") add("cafe", 0.25);
  if (ctx.intent === "dessert") { add("dessert", 0.30); add("sweet", 0.20); }
  return w;
}

// 맥락 적합도 [0,1] — 0.5 기준으로 피처가 원하는 방향이면 가산, 반대면 감산.
// 피처가 중립(0.5)이면 정확히 0.5가 나온다.
export function contextFit(c: Candidate, ctx: RecContext): number {
  const x = buildItemVector({ id: c.id, category: c.category, price_level: c.price_level });
  const w = contextWeights(ctx);
  let s = 0;
  for (let i = 0; i < FEATURE_DIM; i++) {
    if (FEATURE_KEYS[i] === "bias") continue; // 절편은 맥락 판단 대상이 아니다
    s += w[i] * (x[i] - 0.5);
  }
  return Math.max(0, Math.min(1, 0.5 + s));
}

export interface ScoreBreakdown {
  reputation: number;
  context: number;
  taste: number;
  exposureFatigue: number;
  satiation: number;
  journeyChain: number;
  total: number;
}

/**
 * Returns policy-internal additive contributions.  These explain why the
 * current policy ranked an item; they are not a causal explanation of why a
 * person ultimately chose it.
 */
export function scoreCandidateBreakdown(
  c: Candidate, ctx: RecContext, pool: Candidate[], tasteFit: number | null = null, fatigue = 0, sat = 0, chain = 0,
  repPrior: number | null = null,
): ScoreBreakdown {
  const ratings = pool.map((p) => p.rating ?? 0);
  const reviews = pool.map((p) => p.review_count ?? 0);
  const rLo = Math.min(...ratings, 0), rHi = Math.max(...ratings, 5);
  const vHi = Math.max(...reviews, 1);
  const rated = (c.rating ?? 0) > 0 || (c.review_count ?? 0) > 0;
  // 외부 평점이 있으면 그것을 쓰고, 없으면(팀 인제스천 식당) 사전확률로 대체.
  // 평점이 전무한 카탈로그에서 reputation 이 상수 0이 되면 점수의 40~60%가 죽는다(감사 치명 1).
  const reputation = rated
    ? 0.7 * norm(c.rating ?? 0, rLo, rHi) + 0.3 * norm(c.review_count ?? 0, 0, vHi)
    : (repPrior ?? 0.5);
  const cf = contextFit(c, ctx);
  // v3: 취향 적합도(단일 유저 또는 그룹 least-misery)가 있으면 섞는다. 아니면 v0 가중(콜드).
  const reputationContribution = (tasteFit != null ? 0.4 : 0.6) * reputation;
  const contextContribution = (tasteFit != null ? 0.3 : 0.4) * cf;
  const tasteContribution = tasteFit != null ? 0.3 * tasteFit : 0;
  const exposureFatigue = -W_FATIGUE * fatigue;
  const satiation = W_SATIATION * sat;
  const journeyChain = W_CHAIN * chain;
  return {
    reputation: reputationContribution,
    context: contextContribution,
    taste: tasteContribution,
    exposureFatigue,
    satiation,
    journeyChain,
    total: reputationContribution + contextContribution + tasteContribution + exposureFatigue + satiation + journeyChain,
  };
}

export function scoreCandidate(
  c: Candidate, ctx: RecContext, pool: Candidate[], tasteFit: number | null = null, fatigue = 0, sat = 0, chain = 0,
  repPrior: number | null = null,
): number {
  const breakdown = scoreCandidateBreakdown(c, ctx, pool, tasteFit, fatigue, sat, chain, repPrior);
  // v1 노출 피로(−) + v2 재소비 갈망(±) + v2 음식 연쇄(직전 스톱 다음 적합 +)
  return breakdown.total;
}

// 간단한 시드 RNG (테스트 재현용). seed 없으면 Math.random.
function rng(seed?: number): () => number {
  if (seed === undefined) return Math.random;
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// 확률 p에서 K개를 비복원 순차 추출 (한 번의 슬레이트 뽑기).
function drawWithoutReplacement(probs: number[], k: number, rand: () => number): number[] {
  const remaining = probs.map((_, i) => i);
  const remProb = [...probs];
  const chosen: number[] = [];
  const take = Math.min(k, probs.length);
  for (let t = 0; t < take; t++) {
    const total = remProb.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    let pick = 0;
    for (let i = 0; i < remaining.length; i++) {
      r -= remProb[i];
      if (r <= 0) { pick = i; break; }
    }
    chosen.push(remaining[pick]);
    remaining.splice(pick, 1);
    remProb.splice(pick, 1);
  }
  return chosen;
}

/**
 * 마진 포함확률 π_i = P(아이템 i가 K개 슬레이트에 포함될 확률).
 *
 * 왜 필요한가: p_i 는 "첫 draw 에서 뽑힐 확률"이지 "슬레이트에 들어갈 확률"이 아니다.
 * K회 비복원 추출에서 실제 노출률은 p_i 보다 훨씬 크고(측정상 ~7배), 그 배율이
 * 항목마다 달라서(5.9~14.5x) 상수배로 상쇄되지 않는다. p_i 를 propensity 로 로깅하면
 * off-policy(IPS) 추정이 체계적으로 편향된다 → 여기서 몬테카를로로 π_i 를 직접 추정한다.
 *
 * 정확한 해석해는 조합 폭발이라, 실제 샘플러를 M회 돌려 포함 빈도로 추정한다(무편향).
 * 0 나눗셈 방지를 위해 하한을 둔다.
 */
export function inclusionProbabilities(probs: number[], k: number, trials?: number, seed?: number): number[] {
  const n = probs.length;
  if (n === 0) return [];
  const take = Math.min(k, n);
  if (take >= n) return probs.map(() => 1); // 전부 노출되면 π=1
  // 비용 O(trials·K·n). 카탈로그가 커져도 요청 지연이 터지지 않도록 연산 예산으로 상한.
  // (해석적 근사 1-(1-p)^K 는 비복원 효과를 무시해 오차가 커서 쓰지 않는다 — 실측 확인.)
  const BUDGET = 300_000;
  const auto = Math.floor(BUDGET / Math.max(1, take * n));
  const M = Math.max(60, Math.min(300, trials ?? auto));
  const rand = rng(seed);
  const hits = new Array(n).fill(0);
  for (let m = 0; m < M; m++) {
    for (const i of drawWithoutReplacement(probs, take, rand)) hits[i]++;
  }
  // Jeffreys 평활 (h+0.5)/(M+1): 표본 0회인 희소 항목의 추정치가 0이 되어
  // IPS 가중이 폭발하는 것을 막고, 상대오차도 크게 줄인다(단순 바닥값보다 안정).
  return hits.map((h) => Math.min(1, (h + 0.5) / (M + 1)));
}

/**
 * 후보를 점수화하고, epsilon-혼합 분포에서 K개를 비복원 샘플링한다.
 * 반환된 각 항목의 propensity = **마진 포함확률**(몬테카를로 추정) — off-policy 평가용.
 */
export function buildSlate(pool: Candidate[], ctx: RecContext, opts: SlateOptions = {}): ScoredItem[] {
  const k = Math.max(1, opts.k ?? 7);
  const eps = Math.min(1, Math.max(0, opts.eps ?? 0.15));
  const tau = opts.tau ?? 0.15;
  const rand = rng(opts.seed);
  const n = pool.length;
  if (n === 0) return [];

  const tf = opts.tasteFit;
  const pen = opts.exposurePenalty;
  const sat = opts.satiation;
  const ch = opts.chainFit;
  const rp = opts.reputationPrior;
  const scores = pool.map((c) =>
    scoreCandidate(c, ctx, pool, tf ? tf(c) : null, pen ? pen(c.id) : 0, sat ? sat(c.category) : 0, ch ? ch(c.category) : 0,
      rp ? rp(c.id) : null));
  const maxS = Math.max(...scores);
  const exps = scores.map((s) => Math.exp((s - maxS) / tau));
  const sumExp = exps.reduce((a, b) => a + b, 0);
  // 정책 확률 p_i (탐색 혼합)
  const probs = exps.map((e) => (1 - eps) * (e / sumExp) + eps * (1 / n));

  // p_i 비례 비복원 샘플링 (실제 슬레이트)
  const take = Math.min(k, n);
  const chosen = drawWithoutReplacement(probs, take, rand);
  // 로깅용 propensity = 마진 포함확률(π). p_i 가 아니다 — §inclusionProbabilities 주석 참조.
  const pi = inclusionProbabilities(probs, take, opts.inclusionTrials, opts.seed);

  return chosen.map((i, rank) => ({
    id: pool[i].id,
    score: Number(scores[i].toFixed(4)),
    propensity: Number(pi[i].toFixed(6)), // 마진 포함확률 → off-policy(IPS) 분모
    rank,
  }));
}

export type Variant = "control" | "B";

// 진짜 A/B 결정적 배정: user_id 해시(FNV-1a) → 안정적 arm. 같은 유저는 항상 같은 arm.
// (세션 단위로 흔들면 오염되므로 user 단위.) user_id 없으면 control.
export function assignVariant(userId: string | null | undefined, treatmentShare = 0.5): Variant {
  if (!userId) return "control";
  let h = 2166136261 >>> 0;
  for (let i = 0; i < userId.length; i++) { h ^= userId.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return (h % 1000) / 1000 < treatmentShare ? "B" : "control";
}

/**
 * control arm = 랜덤 베이스라인 ("엔진이 무작위보다 나은가").
 * 점수는 로깅·분석용으로 계산하되, 선택은 균등 무작위 → 처치가 엔진과 실제로 다르다.
 */
export function buildControlSlate(pool: Candidate[], ctx: RecContext, opts: SlateOptions = {}): ScoredItem[] {
  const k = Math.max(1, opts.k ?? 7);
  const rand = rng(opts.seed);
  const n = pool.length;
  if (n === 0) return [];
  const rp = opts.reputationPrior;
  const scores = pool.map((c) => scoreCandidate(c, ctx, pool, null, 0, 0, 0, rp ? rp(c.id) : null));
  const rem = pool.map((_, i) => i);
  const chosen: number[] = [];
  const take = Math.min(k, n);
  for (let t = 0; t < take; t++) {
    const pick = Math.floor(rand() * rem.length);
    chosen.push(rem[pick]);
    rem.splice(pick, 1);
  }
  return chosen.map((i, rank) => ({
    id: pool[i].id,
    score: Number(scores[i].toFixed(4)),       // 로깅용 (선택엔 미반영)
    propensity: Number((take / n).toFixed(6)), // 균등 = k/n
    rank,
  }));
}

const dot = (a: number[], b: number[]) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

export interface CourseFeedItem {
  id: string;
  courseId: string;
  creatorId: string;
  title?: string;
  tags?: string[];
  stops: Array<{ placeId: string; category?: string }>;
  savedCount?: number;
}

// Munchie 피드 개인화 랭킹 스코어러 (θ_u 기반 Thompson 샘플링 + 15% ε-다양성 탐색)
export function scoreFeedCourses<T extends CourseFeedItem>(
  userId: string | null | undefined,
  courses: T[],
  sampleThetaFn?: (uid: string) => number[] | null,
  getItemVectorFn?: (placeId: string) => number[] | undefined,
  eps = 0.15
): T[] {
  if (!courses.length) return [];
  const theta = userId && sampleThetaFn ? sampleThetaFn(userId) : null;

  const scored = courses.map((course) => {
    let tasteScore = 0.5; // 콜드스타트 기본값
    if (theta && getItemVectorFn && course.stops.length > 0) {
      let sum = 0;
      let count = 0;
      for (const stop of course.stops) {
        const vec = getItemVectorFn(stop.placeId);
        if (vec) {
          sum += 1 / (1 + Math.exp(-dot(theta, vec)));
          count++;
        }
      }
      if (count > 0) tasteScore = sum / count;
    }
    const popularityScore = Math.min(1, Math.log10((course.savedCount ?? 0) + 1) / 3);
    const totalScore = 0.7 * tasteScore + 0.3 * popularityScore;
    return { course, score: totalScore };
  });

  // 점수 내림차순 정렬
  scored.sort((a, b) => b.score - a.score);

  // 15% ε-탐색 (세렌디피티 보너스 / 에코챔버 방지)
  const result = scored.map((s) => s.course);
  for (let i = 0; i < result.length; i++) {
    if (Math.random() < eps) {
      const randIdx = Math.floor(Math.random() * result.length);
      const temp = result[i];
      result[i] = result[randIdx];
      result[randIdx] = temp;
    }
  }

  return result;
}
