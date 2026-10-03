export const RANKING_SIZE = 7;
export const GROUP_TOP_COUNT = 4;

export interface RestaurantRanking {
  initialRanking: string[];
  userRanking: string[];
  finalRanking: string[] | null;
  selectedRestaurantId: string | null;
}

export function isCompleteRanking(value: unknown, deck: readonly string[]): value is string[] {
  return Array.isArray(value) && deck.length === RANKING_SIZE &&
    value.length === RANKING_SIZE && new Set(value).size === RANKING_SIZE &&
    value.every(id => typeof id === 'string' && deck.includes(id));
}

export function initialRestaurantRanking(deck: readonly string[], results: readonly { restaurantId: string }[]): string[] {
  return Array.from(new Set([...results.map(result => result.restaurantId).filter(id => deck.includes(id)), ...deck]));
}

export function finalCandidates(ranking: RestaurantRanking): string[] {
  return ranking.finalRanking?.slice(0, 2) ?? [];
}
