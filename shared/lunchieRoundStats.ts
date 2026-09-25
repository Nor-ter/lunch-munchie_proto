export const LUNCHIE_CUISINE_IDS = ['korean', 'asian', 'western', 'surprise'] as const;
export type LunchieCuisineId = (typeof LUNCHIE_CUISINE_IDS)[number];

export const CUISINE_SIGNAL_PREFIX = '__cuisine__:';
export const SATISFACTION_SIGNAL_PREFIX = '__satisfaction__:';
export const MEAL_RATING_SIGNAL_PREFIX = '__meal_rating__:';

export interface LunchieRoundSignalRow {
  user_id: string;
  restaurant_id: string;
  created_at?: number | string | Date | null;
}

export function cuisineSignal(choices: LunchieCuisineId | readonly LunchieCuisineId[]) {
  const selected = Array.isArray(choices) ? choices : [choices];
  const normalized = LUNCHIE_CUISINE_IDS.filter(choice => selected.includes(choice));
  return `${CUISINE_SIGNAL_PREFIX}${normalized.join(',')}`;
}

export function satisfactionSignal(score: number) {
  return `${SATISFACTION_SIGNAL_PREFIX}${Math.max(0, Math.min(100, Math.round(score)))}`;
}

export function mealRatingSignal(score: number) {
  return `${MEAL_RATING_SIGNAL_PREFIX}${Math.max(1, Math.min(5, Math.round(score)))}`;
}

export function roundStatSignalPrefix(restaurantId: string) {
  if (restaurantId.startsWith(CUISINE_SIGNAL_PREFIX)) {
    const choices = restaurantId.slice(CUISINE_SIGNAL_PREFIX.length).split(',').filter(Boolean);
    return choices.length > 0 &&
      new Set(choices).size === choices.length &&
      choices.every(choice => LUNCHIE_CUISINE_IDS.includes(choice as LunchieCuisineId))
      ? CUISINE_SIGNAL_PREFIX
      : null;
  }
  if (restaurantId.startsWith(SATISFACTION_SIGNAL_PREFIX)) {
    const score = Number(restaurantId.slice(SATISFACTION_SIGNAL_PREFIX.length));
    return Number.isInteger(score) && score >= 0 && score <= 100
      ? SATISFACTION_SIGNAL_PREFIX
      : null;
  }
  if (restaurantId.startsWith(MEAL_RATING_SIGNAL_PREFIX)) {
    const score = Number(restaurantId.slice(MEAL_RATING_SIGNAL_PREFIX.length));
    return Number.isInteger(score) && score >= 1 && score <= 5
      ? MEAL_RATING_SIGNAL_PREFIX
      : null;
  }
  return null;
}

function latestByUser(rows: LunchieRoundSignalRow[], prefix: string) {
  const latest = new Map<string, LunchieRoundSignalRow>();
  for (const row of rows) {
    if (!row.restaurant_id.startsWith(prefix)) continue;
    const previous = latest.get(row.user_id);
    const previousTime = previous ? new Date(previous.created_at ?? 0).getTime() : -1;
    const nextTime = new Date(row.created_at ?? 0).getTime();
    if (!previous || nextTime >= previousTime) latest.set(row.user_id, row);
  }
  return Array.from(latest.values());
}

export function buildLunchieRoundStats(rows: LunchieRoundSignalRow[]) {
  const cuisineRows = latestByUser(rows, CUISINE_SIGNAL_PREFIX);
  const cuisineTally: Record<LunchieCuisineId, number> = {
    korean: 0,
    asian: 0,
    western: 0,
    surprise: 0,
  };
  for (const row of cuisineRows) {
    const choices = row.restaurant_id.slice(CUISINE_SIGNAL_PREFIX.length).split(',') as LunchieCuisineId[];
    for (const choice of choices) {
      if (LUNCHIE_CUISINE_IDS.includes(choice)) cuisineTally[choice] += 1;
    }
  }

  const satisfactionRows = latestByUser(rows, SATISFACTION_SIGNAL_PREFIX);
  const scores = satisfactionRows
    .map(row => Number(row.restaurant_id.slice(SATISFACTION_SIGNAL_PREFIX.length)))
    .filter(score => Number.isFinite(score) && score >= 0 && score <= 100);
  const satisfactionAverage = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : null;

  const mealRatingRows = latestByUser(rows, MEAL_RATING_SIGNAL_PREFIX);
  const mealRatings = mealRatingRows
    .map(row => Number(row.restaurant_id.slice(MEAL_RATING_SIGNAL_PREFIX.length)))
    .filter(score => Number.isInteger(score) && score >= 1 && score <= 5);
  const mealRatingAverage = mealRatings.length
    ? Math.round((mealRatings.reduce((sum, score) => sum + score, 0) / mealRatings.length) * 10) / 10
    : null;
  const mealRatingDistribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const rating of mealRatings) {
    mealRatingDistribution[rating as 1 | 2 | 3 | 4 | 5] += 1;
  }

  return {
    cuisineTally,
    cuisineVotedCount: cuisineRows.length,
    satisfactionResponseCount: scores.length,
    satisfactionAverage,
    satisfactionBuckets: {
      low: scores.filter(score => score < 40).length,
      medium: scores.filter(score => score >= 40 && score < 70).length,
      high: scores.filter(score => score >= 70).length,
    },
    visitedCount: mealRatings.length,
    mealRatingAverage,
    mealRatingDistribution,
  };
}
