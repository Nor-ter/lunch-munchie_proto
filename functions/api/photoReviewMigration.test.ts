import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../migrations/0020_restaurant_photo_review.sql', import.meta.url),
  'utf8',
);
const api = readFileSync(new URL('./[[path]].ts', import.meta.url), 'utf8');

describe('restaurant photo review persistence', () => {
  it('adds reversible review evidence without deleting R2 objects', () => {
    expect(migration).toContain("review_status TEXT NOT NULL DEFAULT 'pending'");
    expect(migration).toContain('review_notes TEXT');
    expect(migration).toContain('reviewed_at INTEGER');
    expect(migration).toContain('reviewed_by TEXT');
    expect(migration).not.toMatch(/DELETE\s+FROM/i);
  });

  it('keeps rejected photos out of Lunchie presentation candidates', () => {
    expect(api).toContain("review_status != 'rejected'");
  });
});
