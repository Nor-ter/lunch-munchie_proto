import { describe, expect, it, vi } from 'vitest';
import {
  autocompleteGooglePlaces,
  autocompleteGoogleLocations,
  FOOD_AUTOCOMPLETE_PRIMARY_TYPES,
  getGoogleDirections,
  getGooglePlaceDetails,
  getGoogleLocationDetails,
  GooglePlacesProxyError,
} from './googlePlaces';

const cachedRestaurant = (overrides: Record<string, unknown> = {}) => ({
  id: 'google_place-1',
  name: 'Test Cafe',
  category: 'Cafe',
  address: '1 Test Street',
  latitude: -37.81,
  longitude: 144.96,
  rating: 4.7,
  review_count: 100,
  price_level: 2,
  short_description: null,
  tags: '[]',
  dietary_options: '[]',
  photos: '[]',
  menus: '[]',
  phone_number: null,
  business_hours: null,
  google_place_id: 'place-1',
  synced_at: Date.now(),
  source: 'google',
  place_types: '["cafe","food"]',
  ...overrides,
});

describe('Cloudflare Google Places proxy', () => {
  it('normalises autocomplete suggestions and keeps the key in server headers', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({
        'X-Goog-Api-Key': 'server-key',
        'X-Goog-FieldMask': expect.stringContaining('placePrediction.placeId'),
      });
      expect(JSON.parse(String(init?.body))).toMatchObject({
        input: 'test cafe',
        sessionToken: 'session-1',
        includedPrimaryTypes: [...FOOD_AUTOCOMPLETE_PRIMARY_TYPES],
      });
      return Response.json({
        suggestions: [{
          placePrediction: { placeId: 'place-1', text: { text: 'Test Cafe, Melbourne' } },
        }],
      });
    });

    const result = await autocompleteGooglePlaces(
      { DB: {}, GOOGLE_MAPS_SERVER_API_KEY: 'server-key' },
      { input: 'test cafe', sessionToken: 'session-1' },
      fetcher as typeof fetch,
    );

    expect(result).toEqual({
      suggestions: [{ placeId: 'place-1', text: 'Test Cafe, Melbourne' }],
      sessionToken: 'session-1',
    });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('fails before a provider call when the server key is missing', async () => {
    const fetcher = vi.fn();
    await expect(autocompleteGooglePlaces(
      { DB: {} },
      { input: 'test cafe', sessionToken: 'session-1' },
      fetcher as typeof fetch,
    )).rejects.toMatchObject<Partial<GooglePlacesProxyError>>({ code: 'config_error', status: 500 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('searches general Australian locations without the food-only type filter', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({
        input: 'Fitzroy',
        sessionToken: 'location-session',
        includedRegionCodes: ['au'],
      });
      expect(body).not.toHaveProperty('includedPrimaryTypes');
      return Response.json({
        suggestions: [{
          placePrediction: { placeId: 'fitzroy-1', text: { text: 'Fitzroy VIC, Australia' } },
        }],
      });
    });

    await expect(autocompleteGoogleLocations(
      { DB: {}, GOOGLE_MAPS_SERVER_API_KEY: 'server-key' },
      { input: 'Fitzroy', sessionToken: 'location-session' },
      fetcher as typeof fetch,
    )).resolves.toEqual({
      suggestions: [{ placeId: 'fitzroy-1', text: 'Fitzroy VIC, Australia' }],
      sessionToken: 'location-session',
    });
  });

  it('returns coordinates for a searched location without writing a restaurant row', async () => {
    const fetcher = vi.fn(async () => Response.json({
      id: 'fitzroy-1',
      displayName: { text: 'Fitzroy' },
      formattedAddress: 'Fitzroy VIC 3065, Australia',
      location: { latitude: -37.7984, longitude: 144.9783 },
    }));
    const db = { prepare: vi.fn() };

    await expect(getGoogleLocationDetails(
      { DB: db, GOOGLE_MAPS_SERVER_API_KEY: 'server-key' },
      { placeId: 'fitzroy-1', sessionToken: 'location-session' },
      fetcher as typeof fetch,
    )).resolves.toEqual({
      location: {
        placeId: 'fitzroy-1',
        name: 'Fitzroy',
        address: 'Fitzroy VIC 3065, Australia',
        latitude: -37.7984,
        longitude: 144.9783,
      },
    });
    expect(db.prepare).not.toHaveBeenCalled();
  });

  it('returns a fresh D1 restaurant without another billable details call', async () => {
    const row = cachedRestaurant({ tags: '["카페"]' });
    const statement = {
      bind: vi.fn(() => statement),
      first: vi.fn(async () => row),
    };
    const fetcher = vi.fn();

    const result = await getGooglePlaceDetails(
      { DB: { prepare: vi.fn(() => statement) }, GOOGLE_MAPS_SERVER_API_KEY: 'server-key' },
      { placeId: 'place-1', sessionToken: 'session-1' },
      fetcher as typeof fetch,
    );

    expect(result.fromCache).toBe(true);
    expect(result.restaurant).toMatchObject({ id: 'google_place-1', tags: ['카페'] });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('upserts provider details and returns the normalised D1 row', async () => {
    let stored: ReturnType<typeof cachedRestaurant> | null = null;
    const db = {
      prepare: vi.fn((query: string) => {
        const statement = {
          bind: vi.fn((...args: unknown[]) => {
            if (query.startsWith('INSERT INTO restaurants')) {
              stored = cachedRestaurant({
                id: args[0], name: args[1], category: args[2], address: args[3],
                latitude: args[4], longitude: args[5], rating: args[6],
                review_count: args[7], price_level: args[8], google_place_id: args[12],
                synced_at: args[13], place_types: args[14],
              });
            }
            return statement;
          }),
          first: vi.fn(async () => query.startsWith('SELECT') ? stored : null),
          run: vi.fn(async () => ({ success: true })),
        };
        return statement;
      }),
    };
    const fetcher = vi.fn(async () => Response.json({
      id: 'place-1',
      displayName: { text: 'Provider Cafe' },
      formattedAddress: '2 Provider Street',
      location: { latitude: -37.82, longitude: 144.97 },
      rating: 4.8,
      userRatingCount: 250,
      priceLevel: 'PRICE_LEVEL_EXPENSIVE',
      primaryTypeDisplayName: { text: 'Cafe' },
      types: ['cafe', 'food'],
    }));

    const result = await getGooglePlaceDetails(
      { DB: db, GOOGLE_MAPS_SERVER_API_KEY: 'server-key' },
      { placeId: 'place-1', sessionToken: 'session-1' },
      fetcher as typeof fetch,
    );

    expect(result.fromCache).toBe(false);
    expect(result.restaurant).toMatchObject({
      id: 'google_place-1',
      name: 'Provider Cafe',
      latitude: -37.82,
      longitude: 144.97,
      price_level: 3,
      source: 'google',
    });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('rejects a directly clicked map POI when Google says it is not a food place', async () => {
    const db = {
      prepare: vi.fn(() => ({
        bind() { return this; },
        first: vi.fn(async () => null),
        run: vi.fn(async () => ({ success: true })),
      })),
    };
    const fetcher = vi.fn(async () => Response.json({
      id: 'tram-stop-1',
      displayName: { text: 'Central Tram Stop' },
      location: { latitude: -37.81, longitude: 144.96 },
      types: ['transit_station', 'point_of_interest'],
    }));

    await expect(getGooglePlaceDetails(
      { DB: db, GOOGLE_MAPS_SERVER_API_KEY: 'server-key' },
      { placeId: 'tram-stop-1' },
      fetcher as typeof fetch,
    )).rejects.toMatchObject<Partial<GooglePlacesProxyError>>({ code: 'not_food_place', status: 400 });
    expect(db.prepare).toHaveBeenCalledTimes(1);
  });

  it('requests a walking route through every selected course stop', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.origin + url.pathname).toBe('https://maps.googleapis.com/maps/api/directions/json');
      expect(url.searchParams.get('origin')).toBe('-37.81,144.96');
      expect(url.searchParams.get('waypoints')).toBe('-37.82,144.97');
      expect(url.searchParams.get('destination')).toBe('-37.83,144.98');
      expect(url.searchParams.get('mode')).toBe('walking');
      expect(url.searchParams.get('key')).toBe('server-key');
      return Response.json({
        status: 'OK',
        routes: [{
          overview_polyline: { points: 'encoded-route' },
          legs: [
            { distance: { value: 500 }, duration: { value: 360 } },
            { distance: { value: 700 }, duration: { value: 480 } },
          ],
        }],
      });
    });

    await expect(getGoogleDirections(
      { DB: {}, GOOGLE_MAPS_SERVER_API_KEY: 'server-key' },
      { coordinates: [
        { lat: -37.81, lng: 144.96 },
        { lat: -37.82, lng: 144.97 },
        { lat: -37.83, lng: 144.98 },
      ], mode: 'walking' },
      fetcher as typeof fetch,
    )).resolves.toEqual({
      polyline: 'encoded-route',
      distanceMeters: 1200,
      durationSeconds: 840,
    });
  });
});
