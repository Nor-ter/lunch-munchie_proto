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
    expect(assessLearningReadiness({ ...complete, propensityCoverage: 0.95 }).level).toBe("blocked");
  });

  it("does not call a small but complete dataset learned", () => {
    expect(assessLearningReadiness({ ...complete, attributableSwipes: 49 }).level).toBe("instrumenting");
  });

  it("requires a larger outcome sample before offline evaluation", () => {
    expect(assessLearningReadiness({ ...complete, attributableSwipes: 300, decisions: 100 }).level).toBe("evaluation-ready");
  });
});
