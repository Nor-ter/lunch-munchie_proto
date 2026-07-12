/**
 * _shared/restaurantMapping.ts — Google Places(New) 응답 → restaurants 행 정규화.
 *
 * 클라이언트에는 Google 원본을 그대로 흘리지 않고, 이 모듈을 거친 정규화된 형태만
 * 반환한다(워크플로우 제약). rating/price_level 은 NOT NULL 이므로 미제공 시 0/2 기본값.
 */

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_UNSPECIFIED: 2,
  PRICE_LEVEL_FREE: 1,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

/** Google priceLevel enum(string) → 1~4 int. 없거나 모르는 값이면 §3.2 기본값 2. */
export function mapPriceLevel(googlePriceLevel: unknown): number {
  if (typeof googlePriceLevel === 'string' && googlePriceLevel in PRICE_LEVEL_MAP) {
    return PRICE_LEVEL_MAP[googlePriceLevel];
  }
  return 2;
}

/** Google rating(0~5 float) → 없으면 §3.2 기본값 0. */
export function mapRating(googleRating: unknown): number {
  return typeof googleRating === 'number' ? googleRating : 0;
}

export function mapReviewCount(googleUserRatingCount: unknown): number {
  return typeof googleUserRatingCount === 'number' ? googleUserRatingCount : 0;
}

/** Place Details(New) 응답 한 곳의 최소 타입(요청한 FieldMask 기준 필드만 존재) */
export interface GooglePlaceDetails {
  id: string; // = Google place_id
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  primaryTypeDisplayName?: { text?: string };
  editorialSummary?: { text?: string };
  internationalPhoneNumber?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
}

/** id 는 결정적으로 생성(같은 place_id → 같은 내부 id) → upsert 재실행 안전. */
export function restaurantIdForPlace(googlePlaceId: string): string {
  return `google_${googlePlaceId}`;
}

/**
 * Place Details(New) 응답 → restaurants upsert payload.
 * (google_place_id 는 unique 이므로 PostgREST on_conflict 대상. id 는 최초 insert 시에만 쓰이고,
 *  이미 있는 행이면 PK 라 갱신되지 않는다 — 그래서 결정적 id 를 써도 안전하다.)
 */
export function toRestaurantUpsertPayload(place: GooglePlaceDetails) {
  return {
    id: restaurantIdForPlace(place.id),
    google_place_id: place.id,
    source: 'google' as const,
    synced_at: new Date().toISOString(),
    name: place.displayName?.text ?? '이름 없음',
    category: place.primaryTypeDisplayName?.text ?? '기타',
    address: place.formattedAddress ?? '',
    latitude: place.location?.latitude ?? 0,
    longitude: place.location?.longitude ?? 0,
    rating: mapRating(place.rating),
    review_count: mapReviewCount(place.userRatingCount),
    price_level: mapPriceLevel(place.priceLevel),
    short_description: place.editorialSummary?.text ?? null,
    phone_number: place.internationalPhoneNumber ?? null,
    business_hours: place.regularOpeningHours?.weekdayDescriptions?.join('\n') ?? null,
  };
}

/** synced_at 이 TTL(기본 30일) 이내인지 — 이내면 Google 재호출 없이 캐시 반환. */
export function isSyncFresh(syncedAt: string | null, ttlDays = 30): boolean {
  if (!syncedAt) return false;
  const ageMs = Date.now() - new Date(syncedAt).getTime();
  return ageMs < ttlDays * 24 * 60 * 60 * 1000;
}
