// 런치 엔진 v0 — 휴리스틱 스코어러 + propensity 샘플링
//
// v0 목표: "평판 + 맥락" 휴리스틱으로 슬레이트를 만들되, 각 노출 아이템의
// propensity(보여줄 확률)를 함께 산출한다. 이 propensity가 있어야 나중에
// off-policy 평가(IPS/DR)와 contextual bandit(v3)으로 확장할 수 있다.
//
// 정책: p_i = (1-eps)·softmax(score_i / tau) + eps·(1/N)  (epsilon-탐색 혼합)
// 슬레이트는 p_i 분포에서 비복원 샘플링 → 로그된 propensity = 실제 노출 확률(근사).

import type { Candidate, RecContext, ScoredItem } from "../../shared/engine.js";

export interface SlateOptions {
  k?: number;    // 슬레이트 크기 (예선 카드 수)
  eps?: number;  // 탐색 비율 (0~1)
  tau?: number;  // softmax 온도
  seed?: number; // 재현용(테스트)
  tasteFit?: (c: Candidate) => number | null; // v3 취향 적합도 [0,1] (단일=샘플θ·x, 그룹=멤버 min). null=콜드
  exposurePenalty?: (id: string) => number; // v1 단기 노출 피로 g(누적 노출) in [0,1)
  satiation?: (category: string | undefined) => number; // v2 재소비 갈망 in [-0.5,+0.5)
  chainFit?: (category: string | undefined) => number; // v2 음식 연쇄 P(next|prev) in [0,1]
}

const W_FATIGUE = 0.3; // -w6 단기 노출 피로 가중
const W_SATIATION = 0.3; // ±w7 장기 재소비 갈망 가중
const W_CHAIN = 0.4; // 음식 연쇄 가중 (NEXT_STOP에서 직전 스톱 다음 적합도)

function norm(x: number, lo: number, hi: number): number {
  if (hi <= lo) return 0;
  return Math.max(0, Math.min(1, (x - lo) / (hi - lo)));
}

// v0 맥락 적합도 — 가벼운 규칙. (v2에서 학습형으로 대체)
function contextFit(c: Candidate, ctx: RecContext): number {
  let f = 0.5;
  const cat = c.category ?? "";
  if (ctx.weather === "rain" || ctx.weather === "cold") {
    if (/한식|중식|국물|탕|찌개|면|일식/.test(cat)) f += 0.2; // 비/추위 → 국물·따뜻한 음식
  }
  if (ctx.weather === "hot" && /냉면|샐러드|디저트|음료|카페/.test(cat)) f += 0.15;
  if (ctx.time_of_day === "evening" && (c.price_level ?? 0) >= 3) f += 0.1; // 저녁 → 객단가 ↑ 허용
  // 동행(companions): 혼자 vs 같이 → 적합한 식당이 다르다.
  const n = typeof ctx.companions === "number" ? ctx.companions : 0;
  if (n === 1) { // 혼자 → 혼밥 편하고 빠른 곳
    if (/카페|베이커리|일식|라멘|스시|분식|비건|샐러드|디저트|브런치/.test(cat)) f += 0.15;
    if (/파인다이닝|고기|스테이크|타파스/.test(cat)) f -= 0.1; // 혼자 가기 부담
  } else if (n >= 2) { // 같이 → 나눠먹기·넓은 자리·예약 (대규모일수록 가중 ↑)
    if (/한식|중식|고기|스테이크|파인다이닝|타파스|이탈리안/.test(cat)) f += n >= 5 ? 0.2 : 0.15;
  }
  return Math.max(0, Math.min(1, f));
}

export function scoreCandidate(
  c: Candidate, ctx: RecContext, pool: Candidate[], tasteFit: number | null = null, fatigue = 0, sat = 0, chain = 0,
): number {
  const ratings = pool.map((p) => p.rating ?? 0);
  const reviews = pool.map((p) => p.review_count ?? 0);
  const rLo = Math.min(...ratings, 0), rHi = Math.max(...ratings, 5);
  const vHi = Math.max(...reviews, 1);
  const reputation = 0.7 * norm(c.rating ?? 0, rLo, rHi) + 0.3 * norm(c.review_count ?? 0, 0, vHi);
  const cf = contextFit(c, ctx);
  // v3: 취향 적합도(단일 유저 또는 그룹 least-misery)가 있으면 섞는다. 아니면 v0 가중(콜드).
  const base = tasteFit != null
    ? 0.4 * reputation + 0.3 * cf + 0.3 * tasteFit
    : 0.6 * reputation + 0.4 * cf;
  // v1 노출 피로(−) + v2 재소비 갈망(±) + v2 음식 연쇄(직전 스톱 다음 적합 +)
  return base - W_FATIGUE * fatigue + W_SATIATION * sat + W_CHAIN * chain;
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

/**
 * 후보를 점수화하고, epsilon-혼합 분포에서 K개를 비복원 샘플링한다.
 * 반환된 각 항목의 propensity = 그 분포에서의 marginal 노출 확률(근사).
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
  const scores = pool.map((c) =>
    scoreCandidate(c, ctx, pool, tf ? tf(c) : null, pen ? pen(c.id) : 0, sat ? sat(c.category) : 0, ch ? ch(c.category) : 0));
  const maxS = Math.max(...scores);
  const exps = scores.map((s) => Math.exp((s - maxS) / tau));
  const sumExp = exps.reduce((a, b) => a + b, 0);
  // 정책 확률 p_i (탐색 혼합)
  const probs = exps.map((e) => (1 - eps) * (e / sumExp) + eps * (1 / n));

  // p_i 비례 비복원 샘플링
  const idx = pool.map((_, i) => i);
  const chosen: number[] = [];
  const remaining = [...idx];
  const remProb = [...probs];
  const take = Math.min(k, n);
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

  return chosen.map((i, rank) => ({
    id: pool[i].id,
    score: Number(scores[i].toFixed(4)),
    propensity: Number(probs[i].toFixed(6)), // marginal 노출 확률(근사) → off-policy용
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
  const scores = pool.map((c) => scoreCandidate(c, ctx, pool));
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
