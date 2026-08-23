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

  it('uses the app Google Maps stack and renders the exact restaurant marker', () => {
    expect(source).toContain('data-ui="lunchie-restaurant-map"');
    expect(source).toContain("from '@vis.gl/react-google-maps'");
    expect(source).toContain('<Marker position={position} title={restaurant.name} />');
    expect(source).not.toContain('AdvancedMarker');
    expect(source).toContain("style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}");
    expect(source).not.toContain('react-leaflet');
    expect(source).not.toContain('openstreetmap.org');
  });

  it('uses the Lunchie header back-button pattern and returns to the saved Lunchie tab', () => {
    expect(source).toContain('whileTap={{ scale: 0.9 }}');
    expect(source).toContain('className="flex size-9 items-center justify-center rounded-full bg-white shadow-sm"');
    expect(source).toContain('aria-label="Lunchie 런치픽으로 돌아가기"');
    expect(source).toContain("const SAVED_LUNCHIE_PATH = '/saved?tab=restaurants'");
    expect(source).toContain('navigate(SAVED_LUNCHIE_PATH)');
  });
});
