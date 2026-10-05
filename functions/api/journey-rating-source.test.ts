import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./[[path]].ts', import.meta.url), 'utf8');

describe('Food Journey rating API', () => {
  it('returns each decision with its session and latest private meal rating', () => {
    expect(source).toContain('e.session_id');
    expect(source).toContain('AS meal_rating FROM rec_events e');
    expect(source).toContain('meal_rating: Number(row.meal_rating) || null');
  });

  it('allows only the signed-in decision owner to add or replace a rating', () => {
    expect(source).toContain('app.put("/api/journey-rating"');
    expect(source).toContain("user_id = ? AND session_id = ? AND event_type = 'WINNER'");
    expect(source).toContain('DELETE FROM swipes WHERE session_id = ? AND user_id = ?');
    expect(source).toContain('mealRatingSignal(rating)');
  });
});
