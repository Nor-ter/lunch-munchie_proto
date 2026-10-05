import { describe, expect, it } from 'vitest';
import { mergeFoodJourneyStops, readFoodJourneyStops, updateFoodJourneyRating } from './foodJourney';

const stop = {
  restaurant_id: 'r1',
  name: 'Lunch Place',
  category: 'Cafe',
  at: 1_000,
  session_id: 'session-1',
  meal_rating: null,
};

describe('food journey', () => {
  it('restores valid decisions and ignores corrupt storage', () => {
    expect(readFoodJourneyStops(JSON.stringify([stop]))).toEqual([stop]);
    expect(readFoodJourneyStops('{')).toEqual([]);
  });

  it('adds and edits a rating on the exact historical decision', () => {
    expect(updateFoodJourneyRating([stop], stop, 4)[0].meal_rating).toBe(4);
    expect(updateFoodJourneyRating([{ ...stop, meal_rating: 4 }], stop, 2)[0].meal_rating).toBe(2);
  });

  it('keeps local fallback details while preferring persisted server ratings', () => {
    const local = [{ ...stop, photo: '/meal.jpg', meal_rating: 3 }];
    const remote = [{ ...stop, at: 1_030, meal_rating: 5 }];
    expect(mergeFoodJourneyStops(remote, local)[0]).toMatchObject({
      photo: '/meal.jpg',
      meal_rating: 5,
      session_id: 'session-1',
    });
  });
});
