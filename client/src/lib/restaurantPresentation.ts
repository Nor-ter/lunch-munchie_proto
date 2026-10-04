import type { Restaurant } from '@/contexts/AppContext';
import { englishText } from '@shared/englishCopy';

function nonEmpty(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function restaurantRatingLabel(rating: number): string {
  return Number.isFinite(rating) && rating > 0 && rating <= 5 ? String(Math.round(rating * 10) / 10) : "Not Rated";
}

export function restaurantPriceLabel(restaurant: Restaurant): string | null {
  const prices = (restaurant.menuItems ?? []).map(item => item.price)
    .filter((price): price is number => typeof price === 'number' && Number.isFinite(price) && price > 0);
  if (!prices.length) return null;
  const currency = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 2 });
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  return low === high ? currency.format(low) : `${currency.format(low)}-${currency.format(high)}`;
}

export function restaurantSummary(restaurant: Restaurant): string {
  const description = nonEmpty(restaurant.description);
  if (description) return description;
  const category = englishText(nonEmpty(restaurant.category));
  const fallback = [category, nonEmpty(restaurant.address)].filter(Boolean);
  return fallback.length > 0 ? fallback.join(' · ') : "Details coming soon.";
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
