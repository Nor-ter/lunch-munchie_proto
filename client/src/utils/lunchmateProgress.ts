export interface LunchmateLevelDefinition {
  level: number;
  levelName: string;
  requiredTotalXp: number;
  rewardPlaceholder: string;
}

export const LUNCHMATE_LEVELS: readonly LunchmateLevelDefinition[] = [
  { level: 1, levelName: '한입 새싹', requiredTotalXp: 0, rewardPlaceholder: '기본 런치 스티커 placeholder' },
  { level: 2, levelName: '맛 탐험가', requiredTotalXp: 20, rewardPlaceholder: '피크닉 냅킨 아이템 placeholder' },
  { level: 3, levelName: '한상 수집가', requiredTotalXp: 50, rewardPlaceholder: '미니 접시 아이템 placeholder' },
  { level: 4, levelName: '맛추억 마스터', requiredTotalXp: 90, rewardPlaceholder: '반짝 포크 아이템 placeholder' },
];

const MAX_XP_REQUIRED_PER_LEVEL = 100;

export function normalizeLunchmateTotalXp(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(value)))
    : 0;
}

export function getXpRequiredForNextLunchmateLevel(currentLevel: number): number {
  const normalizedLevel = Number.isFinite(currentLevel)
    ? Math.max(1, Math.floor(currentLevel))
    : 1;
  return Math.min(20 + (normalizedLevel - 1) * 10, MAX_XP_REQUIRED_PER_LEVEL);
}

export function getTotalXpRequiredForLunchmateLevel(targetLevel: number): number {
  const normalizedLevel = Number.isFinite(targetLevel)
    ? Math.max(1, Math.floor(targetLevel))
    : 1;
  let totalXp = 0;
  const cappedGrowthLevel = Math.min(normalizedLevel, 9);

  for (let level = 1; level < cappedGrowthLevel; level += 1) {
    totalXp += getXpRequiredForNextLunchmateLevel(level);
  }

  if (normalizedLevel > 9) {
    totalXp += (normalizedLevel - 9) * MAX_XP_REQUIRED_PER_LEVEL;
  }
  return normalizeLunchmateTotalXp(totalXp);
}

function getLunchmateLevelDefinition(level: number): Omit<LunchmateLevelDefinition, 'requiredTotalXp'> {
  const knownLevel = LUNCHMATE_LEVELS.find(definition => definition.level === level);
  if (knownLevel) return knownLevel;
  return {
    level,
    levelName: '맛추억 마스터',
    rewardPlaceholder: `Lv.${level} 꾸미기 아이템`,
  };
}

export interface LunchmateProgressSnapshot {
  totalXp: number;
  level: number;
  levelName: string;
  currentLevelStartXp: number;
  nextLevelTotalXp: number;
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
  const normalizedTotalXp = normalizeLunchmateTotalXp(totalXp);
  let level = 1;
  let currentLevelStartXp = 0;
  let remainingXp = normalizedTotalXp;

  while (level < 9) {
    const requiredXp = getXpRequiredForNextLunchmateLevel(level);
    if (remainingXp < requiredXp) break;
    remainingXp -= requiredXp;
    currentLevelStartXp += requiredXp;
    level += 1;
  }

  if (level === 9 && remainingXp >= MAX_XP_REQUIRED_PER_LEVEL) {
    const completedLevels = Math.floor(remainingXp / MAX_XP_REQUIRED_PER_LEVEL);
    level += completedLevels;
    currentLevelStartXp += completedLevels * MAX_XP_REQUIRED_PER_LEVEL;
    remainingXp -= completedLevels * MAX_XP_REQUIRED_PER_LEVEL;
  }

  const currentLevel = getLunchmateLevelDefinition(level);
  const nextLevel = getLunchmateLevelDefinition(level + 1);
  const xpRequiredForNextLevel = getXpRequiredForNextLunchmateLevel(level);
  const progressPercent = Math.min(100, Math.max(0, (
    remainingXp / xpRequiredForNextLevel
  ) * 100));

  return {
    totalXp: normalizedTotalXp,
    level,
    levelName: currentLevel.levelName,
    currentLevelStartXp,
    nextLevelTotalXp: currentLevelStartXp + xpRequiredForNextLevel,
    xpIntoCurrentLevel: remainingXp,
    xpRequiredForNextLevel,
    xpRemainingToNextLevel: Math.max(0, xpRequiredForNextLevel - remainingXp),
    progressPercent,
    nextRewardPlaceholder: nextLevel.rewardPlaceholder,
    isMaxLevel: false,
  };
}

export function getLunchmateLevelUpEvents(
  previousTotalXp: number,
  newTotalXp: number,
): LunchmateLevelUpEvent[] {
  const previousProgress = getLunchmateProgressSnapshot(previousTotalXp);
  const newProgress = getLunchmateProgressSnapshot(newTotalXp);

  if (newProgress.level <= previousProgress.level) return [];

  const events: LunchmateLevelUpEvent[] = [];
  for (let level = previousProgress.level + 1; level <= newProgress.level; level += 1) {
    const levelDefinition = getLunchmateLevelDefinition(level);
    events.push({
      previousLevel: level - 1,
      newLevel: level,
      levelName: levelDefinition.levelName,
      rewardPlaceholder: levelDefinition.rewardPlaceholder,
      previousTotalXp: previousProgress.totalXp,
      newTotalXp: newProgress.totalXp,
    });
  }
  return events;
}

export function getLunchmateLevelUpEvent(
  previousTotalXp: number,
  newTotalXp: number,
): LunchmateLevelUpEvent | null {
  return getLunchmateLevelUpEvents(previousTotalXp, newTotalXp)[0] ?? null;
}

export interface LunchmateProgressUpdate {
  previousTotalXp: number;
  nextTotalXp: number;
  levelUpEvents: LunchmateLevelUpEvent[];
}

export function createLunchmateProgressUpdate(
  currentTotalXp: unknown,
  xpGained: unknown,
): LunchmateProgressUpdate {
  const previousTotalXp = normalizeLunchmateTotalXp(currentTotalXp);
  const normalizedXpGained = normalizeLunchmateTotalXp(xpGained);
  const nextTotalXp = normalizeLunchmateTotalXp(previousTotalXp + normalizedXpGained);
  return {
    previousTotalXp,
    nextTotalXp,
    levelUpEvents: getLunchmateLevelUpEvents(previousTotalXp, nextTotalXp),
  };
}
