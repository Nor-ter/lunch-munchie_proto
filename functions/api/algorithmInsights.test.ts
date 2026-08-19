import { describe, expect, it } from "vitest";
import { assessLearningReadiness } from "./algorithmInsights";

const complete = {
  persistedSlates: 1,
  servedImpressions: 7,
  attributableSwipes: 50,
  decisions: 20,
  propensityCoverage: 1,
  scoreCoverage: 1,
  modelVersionCoverage: 1,
  contextCoverage: 1,
};

describe("algorithm learning readiness", () => {
  it("blocks evaluation when immutable serving evidence is incomplete", () => {
    const result = assessLearningReadiness({ ...complete, propensityCoverage: 0.95 });
    expect(result.level).toBe("blocked");
    expect(result.detail).toContain("포함 확률");
  });

  it("does not call a small but complete dataset learned", () => {
    const result = assessLearningReadiness({ ...complete, attributableSwipes: 12, decisions: 3 });
    expect(result.level).toBe("instrumenting");
    expect(result.nextStep).toContain("12/50");
    expect(result.nextStep).toContain("3/20");
  });

  it("requires a larger outcome sample before offline evaluation", () => {
    expect(assessLearningReadiness({ ...complete, attributableSwipes: 300, decisions: 100 }).level).toBe("evaluation-ready");
  });
});
