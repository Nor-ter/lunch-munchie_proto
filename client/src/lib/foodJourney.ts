export type FoodJourneyStop = {
  restaurant_id: string;
  name: string;
  category: string | null;
  at: number;
  session_id?: string | null;
  meal_rating?: number | null;
  photo?: string | null;
  address?: string | null;
};

export function readFoodJourneyStops(raw: string | null): FoodJourneyStop[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is FoodJourneyStop => Boolean(
      item
      && typeof item.restaurant_id === 'string'
      && typeof item.name === 'string'
      && Number.isFinite(item.at),
    ));
  } catch {
    return [];
  }
}

export function updateFoodJourneyRating(
  stops: FoodJourneyStop[],
  target: Pick<FoodJourneyStop, 'restaurant_id' | 'at'>,
  rating: number,
): FoodJourneyStop[] {
  const normalized = Math.max(1, Math.min(5, Math.round(rating)));
  return stops.map(stop => stop.restaurant_id === target.restaurant_id && stop.at === target.at
    ? { ...stop, meal_rating: normalized }
    : stop);
}

export function mergeFoodJourneyStops(
  remoteStops: FoodJourneyStop[],
  localStops: FoodJourneyStop[],
): FoodJourneyStop[] {
  return remoteStops.map(remote => {
    const local = localStops.find(candidate =>
      candidate.restaurant_id === remote.restaurant_id
      && Math.abs(candidate.at - remote.at) < 120_000,
    );
    if (!local) return remote;
    return {
      ...local,
      ...remote,
      session_id: remote.session_id ?? local.session_id ?? null,
      meal_rating: remote.meal_rating ?? local.meal_rating ?? null,
      photo: remote.photo ?? local.photo ?? null,
      address: remote.address ?? local.address ?? null,
    };
  });
}
