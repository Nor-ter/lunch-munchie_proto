import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'LunchieMapPage.tsx'), 'utf8');

describe('LunchieMapPage persisted restaurant recovery', () => {
  it('loads an exact saved restaurant when it is absent from the startup catalogue', () => {
    expect(source).toContain('fetchRestaurantById(restaurantId)');
    expect(source).toContain('registerRestaurants([found])');
    expect(source).toContain('식당 위치를 불러오는 중…');
  });

  it('returns an unresolved saved pick to the saved list', () => {
    expect(source).toContain("navigate('/saved')");
  });
});
