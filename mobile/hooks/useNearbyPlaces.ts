import { useQuery } from '@tanstack/react-query';
import type { LatLng, CoursePlace } from '@/types/course';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '';

interface GooglePlace {
  place_id: string;
  name: string;
  rating?: number;
  vicinity: string;
  types: string[];
  price_level?: number;
  photos?: { photo_reference: string }[];
  geometry: { location: { lat: number; lng: number } };
}

async function fetchNearby(coords: LatLng, radius = 500): Promise<CoursePlace[]> {
  if (!API_KEY) throw new Error('EXPO_PUBLIC_GOOGLE_PLACES_API_KEY is not set');

  const url =
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
    `?location=${coords.lat},${coords.lng}` +
    `&radius=${radius}` +
    `&type=restaurant` +
    `&key=${API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Places API error ${res.status}`);
  const json = await res.json();

  return (json.results as GooglePlace[]).map((p): CoursePlace => ({
    id: p.place_id,
    name: p.name,
    rating: p.rating ?? 0,
    distance: '–',
    category: p.types[0] ?? 'Restaurant',
    priceLevel: p.price_level ?? 1,
    imageUrl: p.photos?.[0]
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${p.photos[0].photo_reference}&key=${API_KEY}`
      : undefined,
    coords: { lat: p.geometry.location.lat, lng: p.geometry.location.lng },
  }));
}

/**
 * Fetch nearby restaurants for a given LatLng.
 * Pass `null` as coords to keep the query disabled.
 */
export function useNearbyPlaces(coords: LatLng | null) {
  return useQuery({
    queryKey: ['nearbyPlaces', coords?.lat, coords?.lng],
    queryFn: () => fetchNearby(coords!),
    enabled: coords !== null,
    staleTime: 1000 * 60 * 5, // 5 min
  });
}
