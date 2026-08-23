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

  it('fills the visible map region and refreshes Leaflet after flex layout', () => {
    expect(source).toContain('data-ui="lunchie-restaurant-map"');
    expect(source).toContain('className="absolute inset-0 !h-full !w-full !rounded-none"');
    expect(source).toContain('<MapResizeSync />');
    expect(source).toContain('map.invalidateSize({ animate: false })');
    expect(source).not.toContain("style={{ height: '100%', width: '100%' }}");
  });

  it('returns an unresolved saved pick to the saved list', () => {
    expect(source).toContain("navigate('/saved')");
  });
});
