import { describe, expect, it } from 'vitest';
import { buildLunchieRoundStats, cuisineSignal, roundStatSignalPrefix, satisfactionSignal } from './lunchieRoundStats';

describe('Lunchie anonymous round statistics', () => {
  it('keeps only each member latest cuisine and satisfaction response', () => {
    const stats = buildLunchieRoundStats([
      { user_id: 'a', restaurant_id: cuisineSignal('korean'), created_at: 1 },
      { user_id: 'a', restaurant_id: cuisineSignal('asian'), created_at: 2 },
      { user_id: 'b', restaurant_id: cuisineSignal('asian'), created_at: 1 },
      { user_id: 'a', restaurant_id: satisfactionSignal(65), created_at: 3 },
      { user_id: 'a', restaurant_id: satisfactionSignal(85), created_at: 4 },
      { user_id: 'b', restaurant_id: satisfactionSignal(35), created_at: 3 },
    ]);

    expect(stats.cuisineTally).toEqual({ korean: 0, asian: 2, western: 0, surprise: 0 });
    expect(stats.cuisineVotedCount).toBe(2);
    expect(stats.satisfactionAverage).toBe(60);
    expect(stats.satisfactionBuckets).toEqual({ low: 1, medium: 0, high: 1 });
  });

  it('accepts only valid anonymous statistic signal values', () => {
    expect(roundStatSignalPrefix('__cuisine__:western')).toBe('__cuisine__:');
    expect(roundStatSignalPrefix('__cuisine__:invalid')).toBeNull();
    expect(roundStatSignalPrefix('__satisfaction__:100')).toBe('__satisfaction__:');
    expect(roundStatSignalPrefix('__satisfaction__:101')).toBeNull();
  });
});
