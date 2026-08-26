import type { Restaurant } from '@/contexts/AppContext';

function nonEmpty(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function restaurantSummary(restaurant: Restaurant): string {
  const description = nonEmpty(restaurant.description);
  if (description) return description;
  const fallback = [nonEmpty(restaurant.category), nonEmpty(restaurant.address)].filter(Boolean);
  return fallback.length > 0 ? fallback.join(' · ') : '상세 정보 준비 중이에요.';
}

export function mergeCanonicalRestaurantPresentation(
  sessionRestaurant: Restaurant,
  canonical: Restaurant,
): Restaurant {
  const photos = canonical.photos ?? sessionRestaurant.photos ?? [];
  return {
    ...sessionRestaurant,
    name: nonEmpty(canonical.name) || sessionRestaurant.name,
    category: nonEmpty(canonical.category) || sessionRestaurant.category,
    tags: canonical.tags ?? sessionRestaurant.tags,
    rating: canonical.rating,
    reviewCount: canonical.reviewCount,
    distance: nonEmpty(sessionRestaurant.distance) || canonical.distance,
    address: nonEmpty(canonical.address) || sessionRestaurant.address,
    image: photos[0] ?? canonical.image ?? sessionRestaurant.image,
    photos,
    menuItems: canonical.menuItems ?? sessionRestaurant.menuItems,
    lat: canonical.lat,
    lng: canonical.lng,
    priceRange: canonical.priceRange,
    openHours: nonEmpty(canonical.openHours) || sessionRestaurant.openHours,
    phone: nonEmpty(canonical.phone) || sessionRestaurant.phone,
    dietary: canonical.dietary ?? sessionRestaurant.dietary,
    description: nonEmpty(canonical.description) || sessionRestaurant.description,
  };
}
