import { describe, expect, it } from "vitest";
import { scoreCandidate, scoreCandidateBreakdown } from "./scorer";

describe("policy score breakdown", () => {
  it("adds up exactly to the score used for serving", () => {
    const pool = [
      { id: "a", category: "한식", rating: 4.5, review_count: 100, price_level: 2 },
      { id: "b", category: "카페", rating: 4.1, review_count: 50, price_level: 2 },
    ];
    const breakdown = scoreCandidateBreakdown(pool[0], { companions: 2 }, pool, null, 0.25);

    expect(breakdown.total).toBeCloseTo(scoreCandidate(pool[0], { companions: 2 }, pool, null, 0.25));
    expect(breakdown.exposureFatigue).toBeLessThan(0);
    expect(breakdown.taste).toBe(0);
  });
});
