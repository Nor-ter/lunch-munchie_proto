/**
 * services/placesApi.ts — Places Edge Function 프록시 호출 래퍼 (순수 함수 · React 비의존)
 * 원본: mobile/services/placesApi.ts (web-maps-places-workflow.md Phase 1 이식).
 * 변경점: `@/types/db`의 Restaurant → `GoogleRestaurantRow`(웹 AppContext.Restaurant와 이름 충돌 회피, §1.3).
 *
 * ⚠️ Google 키는 여기서 절대 다루지 않는다. 반드시 Cloudflare Pages API로
 * places-search / places-autocomplete / place-details만 거친다 —
 * 클라이언트에서 Google API 직접 호출 금지(web-maps-places-workflow.md §2 불변 원칙).
 *
 */
import type { GoogleRestaurantRow } from '@/types/db';
import { invokeEdgeFunction, EdgeFunctionError } from '@/services/edgeFunctions';

/**
 * Autocomplete 세션 토큰 생성. 암호학적 강도는 불필요(Google이 세션 묶음 용도로만 씀) —
 * crypto.randomUUID 같은 추가 폴리필/패키지 없이 이 정도 무작위성으로 충분하다.
 */
export function generateSessionToken(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

export const PlacesApiError = EdgeFunctionError;

export interface Bias {
  lat: number;
  lng: number;
  radiusMeters?: number;
}

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  priceLevel: number;
  category: string;
}

export interface PlaceSuggestion {
  placeId: string;
  text: string;
}

export interface LocationDetails {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

/** Places Text Search — 명시적 "검색" 액션(자동완성에서 결과가 없을 때 폴백 등)용. */
export async function searchPlaces(query: string, bias?: Bias): Promise<PlaceSearchResult[]> {
  const { results } = await invokeEdgeFunction<{ results: PlaceSearchResult[] }>(
    'places-search',
    { query, ...(bias ? { bias } : {}) },
  );
  return results;
}

/** Autocomplete — 타이핑 중 실시간 후보. sessionToken 으로 place-details 와 한 세션 묶음. */
export async function autocompletePlaces(
  input: string,
  sessionToken: string,
  bias?: Bias,
): Promise<PlaceSuggestion[]> {
  const { suggestions } = await invokeEdgeFunction<{
    suggestions: PlaceSuggestion[];
    sessionToken: string;
  }>('places-autocomplete', { input, sessionToken, ...(bias ? { bias } : {}) });
  return suggestions;
}

export async function autocompleteLocations(
  input: string,
  sessionToken: string,
  bias?: Bias,
): Promise<PlaceSuggestion[]> {
  const { suggestions } = await invokeEdgeFunction<{
    suggestions: PlaceSuggestion[];
    sessionToken: string;
  }>('location-autocomplete', { input, sessionToken, ...(bias ? { bias } : {}) });
  return suggestions;
}

export async function getLocationDetails(
  placeId: string,
  sessionToken?: string,
): Promise<LocationDetails> {
  const { location } = await invokeEdgeFunction<{ location: LocationDetails }>(
    'location-details',
    { placeId, ...(sessionToken ? { sessionToken } : {}) },
  );
  return location;
}

/**
 * Place Details — 후보를 "선택"했을 때 **1회만** 호출한다(비용 제약). 응답은 이미
 * Edge Function이 restaurants에 upsert한 뒤의 행(내부 id 확보됨)을 그대로 반환한다.
 */
export async function getPlaceDetails(
  placeId: string,
  sessionToken?: string,
): Promise<GoogleRestaurantRow> {
  const { restaurant } = await invokeEdgeFunction<{ restaurant: GoogleRestaurantRow; fromCache: boolean }>(
    'place-details',
    { placeId, ...(sessionToken ? { sessionToken } : {}) },
  );
  return restaurant;
}
