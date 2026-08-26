import type { Restaurant } from '@/contexts/AppContext';
import type { GoogleRestaurantRow } from '@/types/db';
import { normalizeFoodTag } from '@/constants/foodTags';

type RestaurantApiRecord = Pick<GoogleRestaurantRow, 'id' | 'name' | 'category' | 'address'> & {
  tags?: unknown;
  rating?: unknown;
  review_count?: unknown;
  reviewCount?: unknown;
  distance?: unknown;
  image?: string;
  photos?: unknown;
  menu_items?: unknown;
  menuItems?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  lat?: unknown;
  lng?: unknown;
  price_level?: unknown;
  priceRange?: unknown;
  business_hours?: string | null;
  openHours?: string;
  phone_number?: string | null;
  phone?: string;
  dietary_options?: unknown;
  dietary?: unknown;
  short_description?: string | null;
  description?: string;
};

function arrayValue<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

/** restaurants/place-details API 응답 → AppContext의 카멜케이스 Restaurant 모델. */
export function mapRestaurantApiRecord(row: RestaurantApiRecord): Restaurant {
  const tags = arrayValue<string>(row.tags);
  const photos = arrayValue<string>(row.photos);
  const latitude = Number(row.latitude ?? row.lat);
  const longitude = Number(row.longitude ?? row.lng);
  const priceLevel = Number(row.price_level ?? row.priceRange ?? 1);
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    tags: tags.length > 0 ? tags.map(normalizeFoodTag) : ['맛집'],
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? row.reviewCount ?? 0),
    distance: typeof row.distance === 'string' ? row.distance : '',
    address: row.address,
    image: row.image ?? photos[0] ?? '',
    photos,
    menuItems: arrayValue(row.menu_items ?? row.menuItems),
    lat: latitude,
    lng: longitude,
    priceRange: Math.min(4, Math.max(1, Number.isFinite(priceLevel) ? priceLevel : 1)) as 1 | 2 | 3 | 4,
    openHours: row.business_hours ?? row.openHours ?? '',
    phone: row.phone_number ?? row.phone ?? '',
    dietary: arrayValue(row.dietary_options ?? row.dietary),
    description: row.short_description ?? row.description ?? '',
  };
}

/** place-details의 snake_case DB row → AppContext의 카멜케이스 Restaurant 모델. */
export function mapGoogleRestaurant(row: GoogleRestaurantRow): Restaurant {
  return mapRestaurantApiRecord(row);
}
