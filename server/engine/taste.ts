// 런치 엔진 v1 — 유저 취향 벡터 theta_u (로지스틱) + 온라인 SGD 학습기
//
// P(like | u, i) = sigmoid(theta_u dot x_i + bias). 스와이프(암묵 라벨)로 학습.
// 온라인: 스와이프마다 즉시 갱신("오늘 뭐 골랐지"가 바로 반영).
// 아키텍처상 theta_u는 피처 스토어(user_taste)에 보관하지만, 프로토타입에선 인메모리
// (DB 폴백과 동일 취지). 오프라인 IPS 재적합은 후속(Python 배치).

import { FEATURE_DIM } from "./features.js";

export const MIN_TASTE = 5; // 이 수 이상 스와이프해야 취향항을 점수에 반영(콜드스타트 보호)
const LR = 0.12;
const L2 = 0.002;

export interface Taste {
  theta: number[];
  bias: number;
  n: number; // 학습에 쓰인 스와이프 수
}

const store = new Map<string, Taste>();

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const dot = (a: number[], b: number[]) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

export function getTaste(userId: string | null | undefined): Taste | null {
  if (!userId) return null;
  return store.get(String(userId)) ?? null;
}

// tasteFit = P(like) 추정. 0~1. (콜드스타트 판단은 호출부에서 n으로.)
export function tasteScore(t: Taste, x: number[]): number {
  return sigmoid(dot(t.theta, x) + t.bias);
}

// 온라인 SGD 1스텝: theta += lr*((y - p) * x - l2*theta).  y = LIKE?1:0
export function updateTaste(userId: string, x: number[], y: number): void {
  const uid = String(userId);
  let t = store.get(uid);
  if (!t) { t = { theta: new Array(FEATURE_DIM).fill(0), bias: 0, n: 0 }; store.set(uid, t); }
  const p = tasteScore(t, x);
  const g = y - p;
  for (let i = 0; i < t.theta.length; i++) t.theta[i] += LR * (g * x[i] - L2 * t.theta[i]);
  t.bias += LR * g;
  t.n++;
}

// 대시보드용 — 학습 진행 상황 요약
export function tasteStats() {
  let learned = 0, normSum = 0;
  for (const t of Array.from(store.values())) {
    if (t.n >= MIN_TASTE) {
      learned++;
      normSum += Math.sqrt(dot(t.theta, t.theta));
    }
  }
  return {
    modelVersion: "v1-taste",
    dim: FEATURE_DIM,
    users: store.size,
    learnedUsers: learned, // 취향이 점수에 반영되는 유저(n>=MIN_TASTE)
    avgThetaNorm: learned ? Number((normSum / learned).toFixed(3)) : null,
  };
}
