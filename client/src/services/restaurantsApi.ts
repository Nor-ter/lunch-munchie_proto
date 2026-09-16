import type { Restaurant } from '@/contexts/AppContext';
import { mapRestaurantApiRecord } from '@/lib/googlePlaces';
import type { GoogleRestaurantRow } from '@/types/db';

type RequestLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function getRestaurantById(
  restaurantId: string,
  request: RequestLike = fetch,
): Promise<Restaurant | null> {
  const response = await request(`/api/restaurants/${encodeURIComponent(restaurantId)}`, {
    credentials: 'same-origin',
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Couldn\'t load restaurant details.');
  return mapRestaurantApiRecord(await response.json() as GoogleRestaurantRow);
}
