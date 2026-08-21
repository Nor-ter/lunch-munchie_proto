import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(new URL('./CoursemapCreatePage.tsx', import.meta.url), 'utf8');
const MAP_SOURCE = readFileSync(new URL('../../components/map/CourseMap.tsx', import.meta.url), 'utf8');

describe('CoursemapCreatePage Google Places regression', () => {
  it('restores marker search through the server-backed Google Places flow', () => {
    expect(SOURCE).toContain("import { usePlacesSearch } from '@/hooks/usePlacesSearch'");
    expect(SOURCE).toContain('usePlacesSearch(bias)');
    expect(SOURCE).toContain('getPlaceDetails(placeId, sessionToken)');
    expect(SOURCE).toContain('registerRestaurants([restaurant])');
    expect(SOURCE).toContain('pickRestaurant(slot, restaurant)');
    expect(SOURCE).toContain('resetSearch()');
  });

  it('keeps saved restaurants alongside Google suggestions and never calls Google directly', () => {
    expect(SOURCE).toContain('restaurants.filter');
    expect(SOURCE).toContain('suggestions.map');
    expect(SOURCE).toContain('Google 장소');
    expect(SOURCE).not.toContain('places.googleapis.com');
  });

  it('lets an activated numbered slot select a Google Maps POI directly', () => {
    expect(MAP_SOURCE).toContain('onPressPlaceId?: (placeId: string) => void');
    expect(MAP_SOURCE).toContain('const placeId = event.detail.placeId');
    expect(MAP_SOURCE).toContain('onPressPlaceId(placeId)');
    expect(SOURCE).toContain('onPressPlaceId={activeBubble === null ? undefined : onMapPlaceTap}');
    expect(SOURCE).toContain('void handlePickGoogle(bubbleSlot, placeId)');
    expect(SOURCE).toContain('data-ui="map-place-picker-status"');
  });

  it('draws a walking directions route and preserves sparse slot numbers', () => {
    expect(SOURCE).toContain("import { useDirections } from '@/hooks/useDirections'");
    expect(SOURCE).toContain("useDirections(directionsPoints, 'walking')");
    expect(SOURCE).toContain('routeCoordinates={routeCoordinates}');
    expect(SOURCE).toContain('sequenceNumber: slot + 1');
    expect(MAP_SOURCE).toContain('point.sequenceNumber ?? idx + 1');
  });
});
