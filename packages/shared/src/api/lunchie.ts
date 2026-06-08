import type { LunchieResult, LunchieSwipeAction, Restaurant, SwipeRecord } from '../types/domain';

export function rankLunchieResults(records: SwipeRecord[], candidates: Restaurant[]): LunchieResult[] {
  return candidates
    .map(candidate => {
      const candidateRecords = records.filter(record => record.restaurantId === candidate.id);
      const likes = candidateRecords.filter(record => record.swipeAction === 'LIKE').length;
      const dislikes = candidateRecords.filter(record => record.swipeAction === 'DISLIKE').length;
      return { restaurantId: candidate.id, likes, dislikes, score: likes * 2 - dislikes };
    })
    .sort((a, b) => b.score - a.score || b.likes - a.likes);
}

export function nextRoundCandidateIds(records: SwipeRecord[], candidates: Restaurant[], limit = 3): string[] {
  return rankLunchieResults(records, candidates).slice(0, limit).map(result => result.restaurantId);
}

export function createSwipeRecord(params: {
  sessionId: string;
  userId: string;
  restaurantId: string;
  round: number;
  swipeAction: LunchieSwipeAction;
}): SwipeRecord {
  return {
    id: `swipe-${params.sessionId}-${params.userId}-${params.restaurantId}-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...params,
  };
}
