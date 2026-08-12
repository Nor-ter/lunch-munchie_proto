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
};

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
    return {
      level: "blocked",
      label: "학습 전제 미충족",
      detail: "슬레이트·노출 확률·점수·정책 버전·맥락 중 하나 이상이 충분히 기록되지 않았습니다.",
      nextStep: "이 화면의 계측 계약을 모두 녹색으로 만든 뒤 결과를 비교하세요.",
    };
  }
  if (input.attributableSwipes < 50 || input.decisions < 20) {
    return {
      level: "instrumenting",
      label: "계측 중 — 표본 축적 필요",
      detail: "서빙 증거는 연결됐지만 개인화 또는 정책 우열을 판단할 표본이 아직 작습니다.",
      nextStep: "최소 스와이프 50건과 결정 20건을 모은 뒤 수락률·결정 피로를 관찰하세요.",
    };
  }
  if (input.attributableSwipes < 300 || input.decisions < 100) {
    return {
      level: "measuring",
      label: "측정 가능 — 온라인 학습 전",
      detail: "정책별 기초 수락률과 카테고리 노출 편향을 볼 수 있습니다. 아직 자동 가중치 변경은 하지 않습니다.",
      nextStep: "고정 정책의 홀드아웃을 유지한 채 오프라인 평가를 먼저 실행하세요.",
    };
  }
  return {
    level: "evaluation-ready",
    label: "오프라인 평가 준비",
    detail: "노출 증거와 반응 표본이 있어 IPS/정책 비교를 시작할 수 있습니다. 이는 자동 배포 승인이 아닙니다.",
    nextStep: "사전 등록한 가드레일(결정 시간·재추천·다양성)과 함께 정책 후보를 평가하세요.",
  };
}

export const coverage = (completeCount: number, total: number) =>
  total > 0 ? completeCount / total : null;
