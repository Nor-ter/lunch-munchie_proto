import { describe, it, expect } from "vitest";
import { buildSlate, inclusionProbabilities, contextFit } from "./scorer";
import { buildItemVector, FEATURE_DIM, FEATURE_KEYS } from "./features";
import type { Candidate } from "../../shared/engine";

// 감사 치명 3 회귀 테스트.
// 로깅되는 propensity 는 "첫 draw 확률(p_i)"이 아니라 "K개 슬레이트에 포함될 확률(π_i)"이어야 한다.
// p_i 를 쓰면 실측상 실제 노출률의 1/7 로 과소평가되고 그 배율이 항목마다 달라(5.9~14.5x)
// off-policy(IPS) 추정이 체계적으로 편향된다.

const pool = (n: number): Candidate[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `r${i}`,
    category: i % 2 === 0 ? "카페" : "한식",
    rating: 0,
    review_count: 0,
    price_level: 2,
  }));

describe("propensity = 마진 포함확률", () => {
  it("로깅된 propensity 가 실제 노출률과 일치한다 (편향 < 20%)", () => {
    const p = pool(40);
    const K = 7, TRIALS = 1500;
    const seen = new Map<string, number>();
    const logged = new Map<string, number>();
    for (let t = 0; t < TRIALS; t++) {
      for (const s of buildSlate(p, {}, { k: K, eps: 0.1 })) {
        seen.set(s.id, (seen.get(s.id) ?? 0) + 1);
        logged.set(s.id, s.propensity);
      }
    }
    const ratios = Array.from(seen.entries())
      .map(([id, n]) => (n / TRIALS) / (logged.get(id) ?? 1))
      .filter((r) => Number.isFinite(r));
    const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    // p_i 를 쓰던 시절엔 이 값이 ~7.0 이었다.
    expect(mean).toBeGreaterThan(0.8);
    expect(mean).toBeLessThan(1.2);
  });

  it("π 는 p 보다 크다 (K회 추출이면 포함 기회가 K배)", () => {
    const probs = Array.from({ length: 50 }, () => 1 / 50);
    const pi = inclusionProbabilities(probs, 7, 400, 1);
    // 균등 분포에서 π ≈ K/n = 0.14, p = 0.02
    for (const x of pi) {
      expect(x).toBeGreaterThan(0.05);
      expect(x).toBeLessThanOrEqual(1);
    }
  });

  it("K >= n 이면 전부 포함되므로 π = 1", () => {
    expect(inclusionProbabilities([0.5, 0.5], 5, 50, 1)).toEqual([1, 1]);
  });

  it("0 나눗셈 방지 하한이 있다 (IPS 헤비테일 차단)", () => {
    // 한 항목만 확률이 압도적 → 나머지는 거의 안 뽑힘
    const probs = [0.99, ...Array.from({ length: 30 }, () => 0.01 / 30)];
    const pi = inclusionProbabilities(probs, 2, 100, 7);
    for (const x of pi) expect(x).toBeGreaterThan(0);
  });
});

describe("평판 사전확률 (감사 치명 1)", () => {
  it("평점이 전무해도 사전확률이 있으면 점수가 갈린다", () => {
    const p = pool(20);
    const prior = (id: string) => (Number(id.slice(1)) % 5) / 5; // 0, .2, .4, .6, .8
    const withPrior = buildSlate(p, {}, { k: 20, eps: 0, reputationPrior: prior, seed: 3 });
    const uniq = new Set(withPrior.map((s) => s.score)).size;
    expect(uniq).toBeGreaterThan(2); // 사전확률 없으면 카테고리 2분류로 고유값 ≤2
  });
});

describe("contextFit 피처 기반 (감사 개선 3)", () => {
  it("카테고리 정규식에 안 걸리는 곳도 맥락에 반응한다 (사각지대 제거)", () => {
    // '레스토랑'·'바'는 옛 정규식 어디에도 안 걸려 항상 0.5 였다.
    const bar: Candidate = { id: "b1", category: "바", rating: 0, review_count: 0, price_level: 2 };
    const cold = contextFit(bar, { weather: "cold" });
    const hot = contextFit(bar, { weather: "hot" });
    expect(cold).not.toBeCloseTo(0.5, 3);
    expect(cold).not.toBeCloseTo(hot, 3); // 맥락에 따라 값이 갈린다
  });

  it("추운 날엔 든든한 쪽(기름짐↑·가벼움↓)이 가벼운 쪽보다 높다", () => {
    const hearty: Candidate = { id: "h", category: "한식", rating: 0, review_count: 0, price_level: 2 };
    const light: Candidate = { id: "l", category: "샐러드", rating: 0, review_count: 0, price_level: 2 };
    expect(contextFit(hearty, { weather: "cold" })).toBeGreaterThan(contextFit(light, { weather: "cold" }));
  });

  it("더운 날엔 반대로 뒤집힌다", () => {
    const hearty: Candidate = { id: "h", category: "한식", rating: 0, review_count: 0, price_level: 2 };
    const light: Candidate = { id: "l", category: "샐러드", rating: 0, review_count: 0, price_level: 2 };
    expect(contextFit(light, { weather: "hot" })).toBeGreaterThan(contextFit(hearty, { weather: "hot" }));
  });

  it("맥락이 없으면 중립 0.5", () => {
    const c: Candidate = { id: "x", category: "한식", rating: 0, review_count: 0, price_level: 2 };
    expect(contextFit(c, {})).toBeCloseTo(0.5, 6);
  });

  it("구조화 메뉴의 카페 섹션은 넓은 업종 분류를 덮지 않고 카페 맥락 점수만 보강한다", () => {
    const generic: Candidate = { id: "g", category: "레스토랑", rating: 0, review_count: 0, price_level: 2 };
    const withEspresso: Candidate = { ...generic, id: "e", menu_intents: ["cafe"] };
    expect(contextFit(withEspresso, { intent: "cafe" })).toBeGreaterThan(contextFit(generic, { intent: "cafe" }));
  });
});

describe("절편 항 (감사 개선 2)", () => {
  it("피처 벡터 마지막이 상수 1 (기저율 학습용)", () => {
    const v = buildItemVector({ id: "z", category: "한식", price_level: 2 });
    expect(v.length).toBe(FEATURE_DIM);
    expect(FEATURE_KEYS[FEATURE_DIM - 1]).toBe("bias");
    expect(v[FEATURE_DIM - 1]).toBe(1);
  });
});
