import { describe, expect, it } from 'vitest';
import {
  buildGoogleMapsDirectionsUrl,
  googlePlaceIdFromRestaurantId,
} from './googleMapsDirections';

function params(url: string | null) {
  expect(url).not.toBeNull();
  return new URL(url!).searchParams;
}

describe('buildGoogleMapsDirectionsUrl', () => {
  it('routes a single stop from the current device location and prefers its Place ID', () => {
    const route = params(buildGoogleMapsDirectionsUrl([{
      googlePlaceId: 'ChIJDestination',
      address: '1 Swanston St, Melbourne VIC',
      latitude: -37.8136,
      longitude: 144.9631,
    }]));

    expect(route.get('api')).toBe('1');
    expect(route.get('destination')).toBe('1 Swanston St, Melbourne VIC');
    expect(route.get('destination_place_id')).toBe('ChIJDestination');
    expect(route.get('origin')).toBeNull();
    expect(route.get('travelmode')).toBe('walking');
    expect(route.get('dir_action')).toBe('navigate');
  });

  it('preserves the order of three Place ID-backed course stops', () => {
    const route = params(buildGoogleMapsDirectionsUrl([
      { googlePlaceId: 'ChIJFirst', address: 'First restaurant' },
      { googlePlaceId: 'ChIJSecond', address: 'Second cafe' },
      { googlePlaceId: 'ChIJThird', address: 'Third dessert' },
    ], 'transit'));

    expect(route.get('origin')).toBe('First restaurant');
    expect(route.get('origin_place_id')).toBe('ChIJFirst');
    expect(route.get('waypoints')).toBe('Second cafe');
    expect(route.get('waypoint_place_ids')).toBe('ChIJSecond');
    expect(route.get('destination')).toBe('Third dessert');
    expect(route.get('destination_place_id')).toBe('ChIJThird');
    expect(route.get('travelmode')).toBe('transit');
  });

  it('falls back to addresses and then valid coordinates without inventing Place IDs', () => {
    const route = params(buildGoogleMapsDirectionsUrl([
      { address: '10 Bourke St, Melbourne VIC', latitude: -1, longitude: 1 },
      { address: '주소 정보 없음', latitude: -37.8183, longitude: 144.9671 },
    ]));

    expect(route.get('origin')).toBe('10 Bourke St, Melbourne VIC');
    expect(route.get('origin_place_id')).toBeNull();
    expect(route.get('destination')).toBe('-37.8183,144.9671');
    expect(route.get('destination_place_id')).toBeNull();
  });

  it('rejects 0,0 coordinates instead of routing to the missing-coordinate placeholder', () => {
    expect(buildGoogleMapsDirectionsUrl([{ latitude: 0, longitude: 0 }])).toBeNull();
    expect(buildGoogleMapsDirectionsUrl([{
      googlePlaceId: 'ChIJZeroFallback',
      latitude: 0,
      longitude: 0,
    }])).toBeNull();
  });

  it('rejects Place-ID-only stops because Google also requires a text or coordinate companion', () => {
    expect(buildGoogleMapsDirectionsUrl([{
      googlePlaceId: 'ChIJPlaceIdOnly',
    }])).toBeNull();
    expect(buildGoogleMapsDirectionsUrl([
      { address: 'First restaurant' },
      { googlePlaceId: 'ChIJMissingCompanion' },
      { address: 'Third dessert' },
    ])).toBeNull();
  });

  it('returns null when any stop is unusable or the course exceeds the MVP limit', () => {
    expect(buildGoogleMapsDirectionsUrl([])).toBeNull();
    expect(buildGoogleMapsDirectionsUrl([
      { address: 'A' }, { address: 'B' }, { address: 'C' }, { address: 'D' },
    ])).toBeNull();
  });
});

describe('googlePlaceIdFromRestaurantId', () => {
  it('extracts only Google-backed internal ids', () => {
    expect(googlePlaceIdFromRestaurantId('google_ChIJ123')).toBe('ChIJ123');
    expect(googlePlaceIdFromRestaurantId('osm_node_123')).toBeNull();
    expect(googlePlaceIdFromRestaurantId('drv_123')).toBeNull();
    expect(googlePlaceIdFromRestaurantId('google_')).toBeNull();
  });
});
