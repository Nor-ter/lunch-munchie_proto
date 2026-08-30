import { isValidCoordinate } from '@shared/geo';

export type GoogleMapsTravelMode = 'driving' | 'walking' | 'bicycling' | 'transit';

export interface GoogleMapsDirectionsStop {
  googlePlaceId?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

const GOOGLE_MAPS_DIRECTIONS_URL = 'https://www.google.com/maps/dir/';
const UNUSABLE_ADDRESSES = new Set([
  '주소 정보 없음',
  '주소 없음',
  'address unavailable',
  'unknown address',
]);

function cleanText(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

function usableAddress(value: string | null | undefined) {
  const address = cleanText(value);
  return address && !UNUSABLE_ADDRESSES.has(address.toLowerCase()) ? address : null;
}

function usableCoordinates(latitude: unknown, longitude: unknown) {
  if (!isValidCoordinate(latitude, longitude)) return null;
  // The catalogue normalizer historically used 0,0 for missing coordinates.
  // Never send users to the Gulf of Guinea when a route stop is incomplete.
  if (latitude === 0 && longitude === 0) return null;
  return `${latitude},${longitude}`;
}

function routeQuery(stop: GoogleMapsDirectionsStop) {
  const placeId = cleanText(stop.googlePlaceId);
  const fallback = usableAddress(stop.address)
    ?? usableCoordinates(stop.latitude, stop.longitude);

  if (placeId) {
    // Google requires the text/coordinate companion parameter even when its
    // more precise Place ID parameter is supplied.
    return fallback ? { query: fallback, placeId } : null;
  }
  return fallback ? { query: fallback, placeId: null } : null;
}

/**
 * Google-sourced restaurants use `google_${PLACE_ID}` as their internal D1 id.
 * Other catalogue ids (osm_/drv_/etc.) are not Google Place IDs and must fall
 * back to their address or coordinates.
 */
export function googlePlaceIdFromRestaurantId(restaurantId: unknown) {
  if (typeof restaurantId !== 'string' || !restaurantId.startsWith('google_')) return null;
  const placeId = restaurantId.slice('google_'.length).trim();
  return placeId || null;
}

/**
 * Builds an official cross-platform Google Maps Directions URL for one to
 * three ordered course stops. A single stop routes from the device's current
 * location. Multi-stop courses use the first stop as origin, the final stop as
 * destination, and preserve intermediate stop order as waypoints.
 */
export function buildGoogleMapsDirectionsUrl(
  stops: GoogleMapsDirectionsStop[],
  travelMode: GoogleMapsTravelMode = 'walking',
) {
  if (stops.length < 1 || stops.length > 3) return null;
  const resolved = stops.map(routeQuery);
  if (resolved.some(stop => !stop)) return null;

  const route = resolved as Array<NonNullable<ReturnType<typeof routeQuery>>>;
  const destination = route.at(-1)!;
  const params = new URLSearchParams({
    api: '1',
    destination: destination.query,
    travelmode: travelMode,
    dir_action: 'navigate',
  });
  if (destination.placeId) params.set('destination_place_id', destination.placeId);

  if (route.length > 1) {
    const origin = route[0]!;
    params.set('origin', origin.query);
    if (origin.placeId) params.set('origin_place_id', origin.placeId);

    const waypoints = route.slice(1, -1);
    if (waypoints.length) {
      params.set('waypoints', waypoints.map(stop => stop.query).join('|'));
      // The Place ID list must correspond one-to-one with the waypoint list.
      if (waypoints.every(stop => stop.placeId)) {
        params.set('waypoint_place_ids', waypoints.map(stop => stop.placeId).join('|'));
      }
    }
  }

  const url = `${GOOGLE_MAPS_DIRECTIONS_URL}?${params.toString()}`;
  return url.length <= 2_048 ? url : null;
}
