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
    expect(source).toContain('Map as GoogleMap');
    expect(source).toContain('<Marker position={position} title={restaurant.name} />');
    expect(source).not.toContain('AdvancedMarker');
    expect(source).toContain("style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}");
    expect(source).not.toContain('react-leaflet');
    expect(source).not.toContain('openstreetmap.org');
  });

  it('uses the shared header back-button and returns to the saved Lunchie tab', () => {
    expect(source).toContain("from '@/components/ui/HeaderIconButton'");
    expect(source).toContain('<ChevronLeft size={20} aria-hidden="true" />');
    expect(source).toContain('aria-label="Lunchie 런치픽으로 돌아가기"');
    expect(source).toContain("const SAVED_LUNCHIE_PATH = '/saved?tab=restaurants'");
    expect(source).toContain('navigate(SAVED_LUNCHIE_PATH)');
    expect(source).not.toContain('식당 위치 안내');
    expect(source).toContain('tracking-[0.18em] text-[#E67E78]">Lunchie</p>');
    expect(source).toContain('text-[16px] font-black text-[#49362E]">Lunchie Pick</p>');
    expect(source).toContain('className="h-10 w-10" aria-hidden="true"');
  });

  it('uses the shared rounded detail-card composition with the map inside it', () => {
    expect(source).toContain('data-ui="lunchie-location-card"');
    expect(source).toContain('rounded-3xl border border-[#EBD9CF] bg-[#FFFDFC]');
    expect(source).toContain('data-ui="lunchie-restaurant-map"');
    expect(source).toContain('overflow-hidden rounded-[26px] border border-[#EBD9CF]');
  });

  it('always loads restaurant details from Cloudflare D1 and renders the detail sheet', () => {
    expect(source).toContain('fetchRestaurantById(restaurantId)');
    expect(source).not.toContain('if (!restaurantId || cachedRestaurant)');
    expect(source).toContain('data-ui="lunchie-restaurant-detail"');
    expect(source).toContain('restaurant.menuItems');
    expect(source).toContain('restaurant.photos');
    expect(source).toContain('restaurant.openHours');
    expect(source).toContain('restaurant.description');
  });

  it('does not read .length on possibly missing tags or dietary from the list catalogue', () => {
    expect(source).toContain('(restaurant.tags ?? []).length');
    expect(source).toContain('(restaurant.dietary ?? []).length');
    expect(source).not.toContain('restaurant.tags.length');
    expect(source).not.toContain('restaurant.dietary.length');
  });
});
