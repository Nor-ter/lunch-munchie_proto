import type { Restaurant } from '@/contexts/AppContext';
import type { GoogleRestaurantRow } from '@/types/db';
import { normalizeFoodTag } from '@/constants/foodTags';

/** place-details의 snake_case DB row → AppContext의 카멜케이스 Restaurant 모델. */
export function mapGoogleRestaurant(row: GoogleRestaurantRow): Restaurant {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    tags: row.tags && row.tags.length > 0 ? row.tags.map(normalizeFoodTag) : ['맛집'],
    rating: row.rating,
    reviewCount: row.review_count,
    distance: '',
    address: row.address,
    image: row.photos?.[0] ?? '',
    photos: row.photos ?? [],
    menuItems: row.menu_items ?? [],
    lat: row.latitude,
    lng: row.longitude,
    priceRange: Math.min(4, Math.max(1, row.price_level || 1)) as 1 | 2 | 3 | 4,
    openHours: row.business_hours ?? '',
    dietary: row.dietary_options ?? [],
    description: row.short_description ?? '',
  };
}
