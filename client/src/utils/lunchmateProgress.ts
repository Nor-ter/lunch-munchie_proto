export interface LunchmateLevelDefinition {
  level: number;
  levelName: string;
  requiredTotalXp: number;
  rewardPlaceholder: string;
}

export const LUNCHMATE_LEVELS: readonly LunchmateLevelDefinition[] = [
  { level: 1, levelName: '한입 새싹', requiredTotalXp: 0, rewardPlaceholder: '기본 런치 스티커' },
  { level: 2, levelName: '맛 탐험가', requiredTotalXp: 10, rewardPlaceholder: '피크닉 냅킨 아이템' },
  { level: 3, levelName: '한상 수집가', requiredTotalXp: 25, rewardPlaceholder: '미니 접시 아이템' },
  { level: 4, levelName: '맛추억 마스터', requiredTotalXp: 40, rewardPlaceholder: '반짝 포크 아이템' },
];

export const LUNCHMATE_PREVIEW_MAX_XP = LUNCHMATE_LEVELS[LUNCHMATE_LEVELS.length - 1].requiredTotalXp;

export interface LunchmateProgressSnapshot {
  totalXp: number;
  level: number;
  levelName: string;
  currentLevelStartXp: number;
  nextLevelTotalXp: number | null;
  xpIntoCurrentLevel: number;
  xpRequiredForNextLevel: number;
  xpRemainingToNextLevel: number;
  progressPercent: number;
  nextRewardPlaceholder: string;
  isMaxLevel: boolean;
}

export interface LunchmateLevelUpEvent {
  previousLevel: number;
  newLevel: number;
  levelName: string;
  rewardPlaceholder: string;
  previousTotalXp: number;
  newTotalXp: number;
}

export function getLunchmateProgressSnapshot(totalXp: number): LunchmateProgressSnapshot {
  const normalizedTotalXp = Number.isFinite(totalXp) ? Math.max(0, totalXp) : 0;
  let levelIndex = 0;

  for (let index = LUNCHMATE_LEVELS.length - 1; index >= 0; index -= 1) {
    if (normalizedTotalXp >= LUNCHMATE_LEVELS[index].requiredTotalXp) {
      levelIndex = index;
      break;
    }
  }

  const currentLevel = LUNCHMATE_LEVELS[levelIndex];
  const nextLevel = LUNCHMATE_LEVELS[levelIndex + 1] ?? null;
  const xpIntoCurrentLevel = normalizedTotalXp - currentLevel.requiredTotalXp;
  const xpRequiredForNextLevel = nextLevel
    ? nextLevel.requiredTotalXp - currentLevel.requiredTotalXp
    : 0;
  const progressPercent = nextLevel && xpRequiredForNextLevel > 0
    ? Math.min(100, Math.max(0, (xpIntoCurrentLevel / xpRequiredForNextLevel) * 100))
    : 100;

  return {
    totalXp: normalizedTotalXp,
    level: currentLevel.level,
    levelName: currentLevel.levelName,
    currentLevelStartXp: currentLevel.requiredTotalXp,
    nextLevelTotalXp: nextLevel?.requiredTotalXp ?? null,
    xpIntoCurrentLevel,
    xpRequiredForNextLevel,
    xpRemainingToNextLevel: nextLevel
      ? Math.max(0, nextLevel.requiredTotalXp - normalizedTotalXp)
      : 0,
    progressPercent,
    nextRewardPlaceholder: nextLevel?.rewardPlaceholder ?? '현재 preview의 최대 Level이에요',
    isMaxLevel: nextLevel === null,
  };
}

export function getLunchmateLevelUpEvent(
  previousTotalXp: number,
  newTotalXp: number,
): LunchmateLevelUpEvent | null {
  const previousProgress = getLunchmateProgressSnapshot(previousTotalXp);
  const newProgress = getLunchmateProgressSnapshot(newTotalXp);

  if (newProgress.level <= previousProgress.level) return null;

  const newLevelDefinition = LUNCHMATE_LEVELS.find(level => level.level === newProgress.level);
  if (!newLevelDefinition) return null;

  return {
    previousLevel: previousProgress.level,
    newLevel: newProgress.level,
    levelName: newLevelDefinition.levelName,
    rewardPlaceholder: newLevelDefinition.rewardPlaceholder,
    previousTotalXp: previousProgress.totalXp,
    newTotalXp: newProgress.totalXp,
  };
}
