import type { LatLng } from '@/lib/polyline';

export interface GoogleMapPathPoint {
  lat: number;
  lng: number;
}

/**
 * A saved course must only render a line after the Directions API returned an
 * actual route. Connecting the stops directly would present a failed request
 * as a valid walking route.
 */
export function toSavedCourseRoutePath(routeCoordinates: LatLng[]): GoogleMapPathPoint[] {
  if (routeCoordinates.length < 2) return [];
  return routeCoordinates.map((point) => ({
    lat: point.latitude,
    lng: point.longitude,
  }));
}
