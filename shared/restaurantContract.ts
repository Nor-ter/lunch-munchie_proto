export interface RestaurantPayloadMenuItem {
  name: string;
  price: number | null;
  image?: string;
  dietary?: string[];
  category?: string;
  description?: string;
}

export interface RestaurantPayload {
  id: string;
  name: string;
  category: string;
  tags: string[];
  rating: number;
  reviewCount: number;
  distance: string;
  address: string;
  image: string;
  photos: string[];
  menuItems: RestaurantPayloadMenuItem[];
  lat: number;
  lng: number;
  priceRange: 1 | 2 | 3 | 4;
  openHours: string;
  dietary: string[];
  description: string;
}

function parsedArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function finiteNumber(value: unknown, fallback = 0) {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

export function normalizeRestaurantPayload(raw: Record<string, unknown>): RestaurantPayload {
  const photos = parsedArray(raw.photos).filter((value): value is string => typeof value === 'string');
  const rawReviewCount = raw.reviewCount ?? raw.review_count;
  const rawPriceRange = raw.priceRange ?? raw.price_level;

  return {
    id: text(raw.id),
    name: text(raw.name),
    category: text(raw.category, '기타'),
    tags: parsedArray(raw.tags).filter((value): value is string => typeof value === 'string'),
    rating: finiteNumber(raw.rating),
    reviewCount: Math.max(0, Math.trunc(finiteNumber(rawReviewCount))),
    distance: text(raw.distance),
    address: text(raw.address, '주소 정보 없음'),
    image: text(raw.image, photos[0] ?? ''),
    photos,
    menuItems: parsedArray(raw.menuItems ?? raw.menu_items ?? raw.menus)
      .filter((value): value is RestaurantPayloadMenuItem => (
        typeof value === 'object' && value !== null && typeof (value as { name?: unknown }).name === 'string'
      )),
    lat: finiteNumber(raw.lat ?? raw.latitude),
    lng: finiteNumber(raw.lng ?? raw.longitude),
    priceRange: Math.min(4, Math.max(1, Math.trunc(finiteNumber(rawPriceRange, 1)))) as 1 | 2 | 3 | 4,
    openHours: text(raw.openHours ?? raw.business_hours, '영업시간 정보 없음'),
    dietary: parsedArray(raw.dietary ?? raw.dietary_options)
      .filter((value): value is string => typeof value === 'string'),
    description: text(raw.description ?? raw.short_description),
  };
}

export function formatRestaurantReviewCount(value: unknown) {
  return Math.max(0, Math.trunc(finiteNumber(value))).toLocaleString();
}
