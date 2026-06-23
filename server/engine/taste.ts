// 런치 엔진 v3 — 베이지안 취향 모델 + Thompson Sampling (contextual bandit)
//
// v1은 점추정(SGD). v3는 사후분포 N(mu, A^-1)을 유지해 "불확실하면 탐색"한다.
// 추천 시 theta를 사후에서 샘플(Thompson) → 데이터 적은 유저/피처는 자연히 더 탐색,
// 많이 본 곳은 활용. 랜덤 epsilon 대신 불확실성 기반 탐색. propensity는 여전히 로깅(off-policy).
//
// 베이지안 선형회귀: A = lambda*I + sum x x^T,  b = sum y x.  mu = A^-1 b.
// 인메모리(피처 스토어 대체). 오프라인 정밀화는 후속(Python).

import { FEATURE_DIM } from "./features.js";

export const MIN_TASTE = 5;
const D = FEATURE_DIM;
const PRIOR = 1.0; // 사전 정밀도 A0 = PRIOR*I → 콜드스타트 mu=0(중립), 분산 큼(탐색)

export interface Taste { A: number[][]; b: number[]; n: number }

const store = new Map<string, Taste>();

const dot = (a: number[], x: number[]) => { let s = 0; for (let i = 0; i < D; i++) s += a[i] * x[i]; return s; };
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const randn = () => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

// Cholesky A = L L^T (하삼각). PD 아니면 null.
function chol(A: number[][]): number[][] | null {
  const L = Array.from({ length: D }, () => new Array(D).fill(0));
  for (let i = 0; i < D; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) { if (s <= 1e-9) return null; L[i][j] = Math.sqrt(s); }
      else L[i][j] = s / L[j][j];
    }
  }
  return L;
}
const solveLower = (L: number[][], rhs: number[]) => { // L y = rhs
  const y = new Array(D).fill(0);
  for (let i = 0; i < D; i++) { let s = rhs[i]; for (let k = 0; k < i; k++) s -= L[i][k] * y[k]; y[i] = s / L[i][i]; }
  return y;
};
const solveUpper = (L: number[][], rhs: number[]) => { // L^T x = rhs
  const x = new Array(D).fill(0);
  for (let i = D - 1; i >= 0; i--) { let s = rhs[i]; for (let k = i + 1; k < D; k++) s -= L[k][i] * x[k]; x[i] = s / L[i][i]; }
  return x;
};

export function getTaste(userId: string | null | undefined): Taste | null {
  if (!userId) return null;
  return store.get(String(userId)) ?? null;
}

// 사후 평균 mu = A^-1 b (결정적; 분석·랭킹용)
export function posteriorMean(t: Taste): number[] {
  const L = chol(t.A);
  if (!L) return new Array(D).fill(0);
  return solveUpper(L, solveLower(L, t.b));
}

// Thompson 샘플: theta ~ N(mu, A^-1). 불확실할수록(데이터 적을수록) 더 흩어짐 → 탐색.
export function sampleTheta(t: Taste): number[] {
  const L = chol(t.A);
  if (!L) return new Array(D).fill(0);
  const mu = solveUpper(L, solveLower(L, t.b));
  const z = Array.from({ length: D }, () => randn());
  const w = solveUpper(L, z); // L^T w = z → Cov(w)=A^-1
  return mu.map((m, i) => m + w[i]);
}

export const tasteFitFromTheta = (theta: number[], x: number[]) => sigmoid(dot(theta, x));

// 베이지안 갱신: A += x x^T, b += y x.  y = LIKE?1:0
export function updateTaste(userId: string, x: number[], y: number): void {
  const uid = String(userId);
  let t = store.get(uid);
  if (!t) {
    const A = Array.from({ length: D }, (_, i) => Array.from({ length: D }, (_, j) => (i === j ? PRIOR : 0)));
    t = { A, b: new Array(D).fill(0), n: 0 };
    store.set(uid, t);
  }
  for (let i = 0; i < D; i++) {
    t.b[i] += y * x[i];
    for (let j = 0; j < D; j++) t.A[i][j] += x[i] * x[j];
  }
  t.n++;
}

export function tasteStats() {
  let learned = 0, normSum = 0;
  for (const t of Array.from(store.values())) {
    if (t.n >= MIN_TASTE) {
      learned++;
      const mu = posteriorMean(t);
      normSum += Math.sqrt(dot(mu, mu));
    }
  }
  return {
    modelVersion: "v3-bandit",
    dim: D,
    users: store.size,
    learnedUsers: learned,
    avgThetaNorm: learned ? Number((normSum / learned).toFixed(3)) : null,
  };
}
