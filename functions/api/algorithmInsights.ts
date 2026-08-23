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
      input.persistedSlates <= 0 ? "불변 슬레이트" : null,
      input.servedImpressions <= 0 ? "서버 노출" : null,
      !complete(input.propensityCoverage) ? "포함 확률" : null,
      !complete(input.scoreCoverage) ? "정책 점수" : null,
      !complete(input.modelVersionCoverage) ? "정책 버전" : null,
      !complete(input.contextCoverage) ? "요청 맥락" : null,
    ].filter((value): value is string => value !== null);
    return {
      level: "blocked",
      label: "계측 연결 보완 필요",
      detail: `스와이프 수와 별개로 추천 당시의 ${missing.join("·")} 기록이 98% 기준에 미달합니다.`,
      nextStep: "누락 계측을 먼저 연결한 뒤 표본 수를 판단하세요.",
      targets: { swipes: LEARNING_SAMPLE_TARGETS.attributableSwipes, decisions: LEARNING_SAMPLE_TARGETS.decisions },
    };
  }
  if (input.attributableSwipes < LEARNING_SAMPLE_TARGETS.attributableSwipes || input.decisions < LEARNING_SAMPLE_TARGETS.decisions) {
    return {
      level: "instrumenting",
      label: "계측 중 — 표본 축적 필요",
      detail: "서빙 증거는 연결됐지만 개인화 또는 정책 우열을 판단할 표본이 아직 작습니다.",
      nextStep: `학습 연결 스와이프 ${input.attributableSwipes}/${LEARNING_SAMPLE_TARGETS.attributableSwipes}건, 최종 결정 ${input.decisions}/${LEARNING_SAMPLE_TARGETS.decisions}건을 모으세요.`,
      targets: { swipes: LEARNING_SAMPLE_TARGETS.attributableSwipes, decisions: LEARNING_SAMPLE_TARGETS.decisions },
    };
  }
  if (input.attributableSwipes < LEARNING_SAMPLE_TARGETS.evaluationSwipes || input.decisions < LEARNING_SAMPLE_TARGETS.evaluationDecisions) {
    return {
      level: "measuring",
      label: "측정 가능 — 온라인 학습 전",
      detail: "정책별 기초 수락률과 카테고리 노출 편향을 볼 수 있습니다. 아직 자동 가중치 변경은 하지 않습니다.",
      nextStep: "고정 정책의 홀드아웃을 유지한 채 오프라인 평가를 먼저 실행하세요.",
      targets: { swipes: LEARNING_SAMPLE_TARGETS.evaluationSwipes, decisions: LEARNING_SAMPLE_TARGETS.evaluationDecisions },
    };
  }
  return {
    level: "evaluation-ready",
    label: "오프라인 평가 준비",
    detail: "노출 증거와 반응 표본이 있어 IPS/정책 비교를 시작할 수 있습니다. 이는 자동 배포 승인이 아닙니다.",
    nextStep: "사전 등록한 가드레일(결정 시간·재추천·다양성)과 함께 정책 후보를 평가하세요.",
    targets: { swipes: LEARNING_SAMPLE_TARGETS.evaluationSwipes, decisions: LEARNING_SAMPLE_TARGETS.evaluationDecisions },
  };
}

export const coverage = (completeCount: number, total: number) =>
  total > 0 ? completeCount / total : null;
