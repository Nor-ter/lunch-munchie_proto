export type LearningReadinessInput = {
  persistedSlates: number;
  servedImpressions: number;
  attributableSwipes: number;
  decisions: number;
  propensityCoverage: number | null;
  scoreCoverage: number | null;
  modelVersionCoverage: number | null;
  contextCoverage: number | null;
};

export type LearningReadiness = {
  level: "blocked" | "instrumenting" | "measuring" | "evaluation-ready";
  label: string;
  detail: string;
  nextStep: string;
  targets: { swipes: number; decisions: number };
};

export const LEARNING_SAMPLE_TARGETS = {
  attributableSwipes: 50,
  decisions: 20,
  evaluationSwipes: 300,
  evaluationDecisions: 100,
} as const;

const complete = (value: number | null) => value !== null && value >= 0.98;

/**
 * This deliberately reports readiness, not a fictitious model score.  A model
 * can only be evaluated once exposure evidence is attributable and complete.
 */
export function assessLearningReadiness(input: LearningReadinessInput): LearningReadiness {
  const evidenceComplete =
    input.persistedSlates > 0 &&
    input.servedImpressions > 0 &&
    complete(input.propensityCoverage) &&
    complete(input.scoreCoverage) &&
    complete(input.modelVersionCoverage) &&
    complete(input.contextCoverage);

  if (!evidenceComplete) {
    const missing = [
      input.persistedSlates <= 0 ? "Immutable Slates" : null,
      input.servedImpressions <= 0 ? "Server Impressions" : null,
      !complete(input.propensityCoverage) ? "Inclusion Probability" : null,
      !complete(input.scoreCoverage) ? "Policy Score" : null,
      !complete(input.modelVersionCoverage) ? "Policy Version" : null,
      !complete(input.contextCoverage) ? "Request Context" : null,
    ].filter((value): value is string => value !== null);
    return {
      level: "blocked",
      label: "Instrumentation Needs Attribution",
      detail: `Recommendation-time  ${missing.join("·")}  coverage is below 98%.`,
      nextStep: "Resolve missing attribution before evaluating sample size.",
      targets: { swipes: LEARNING_SAMPLE_TARGETS.attributableSwipes, decisions: LEARNING_SAMPLE_TARGETS.decisions },
    };
  }
  if (input.attributableSwipes < LEARNING_SAMPLE_TARGETS.attributableSwipes || input.decisions < LEARNING_SAMPLE_TARGETS.decisions) {
    return {
      level: "instrumenting",
      label: "Instrumented — More Samples Needed",
      detail: "Serving evidence is linked, but samples are too small to evaluate personalization or policy performance.",
      nextStep: `Attributed swipes:  ${input.attributableSwipes}/${LEARNING_SAMPLE_TARGETS.attributableSwipes}; final decisions:  ${input.decisions}/${LEARNING_SAMPLE_TARGETS.decisions} needed.`,
      targets: { swipes: LEARNING_SAMPLE_TARGETS.attributableSwipes, decisions: LEARNING_SAMPLE_TARGETS.decisions },
    };
  }
  if (input.attributableSwipes < LEARNING_SAMPLE_TARGETS.evaluationSwipes || input.decisions < LEARNING_SAMPLE_TARGETS.evaluationDecisions) {
    return {
      level: "measuring",
      label: "Measurable — Before Online Learning",
      detail: "Basic policy acceptance and category exposure bias can be measured. Weights aren't adjusted automatically yet.",
      nextStep: "Run offline evaluation first while retaining a fixed-policy holdout.",
      targets: { swipes: LEARNING_SAMPLE_TARGETS.evaluationSwipes, decisions: LEARNING_SAMPLE_TARGETS.evaluationDecisions },
    };
  }
  return {
    level: "evaluation-ready",
    label: "Ready for Offline Evaluation",
    detail: "Impression evidence and response samples support IPS and policy comparisons. This doesn't authorize automatic deployment.",
    nextStep: "Evaluate policies with predefined limits for decision time, rerolls and diversity.",
    targets: { swipes: LEARNING_SAMPLE_TARGETS.evaluationSwipes, decisions: LEARNING_SAMPLE_TARGETS.evaluationDecisions },
  };
}

export const coverage = (completeCount: number, total: number) =>
  total > 0 ? completeCount / total : null;
