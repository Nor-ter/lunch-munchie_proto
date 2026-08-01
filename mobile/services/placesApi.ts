/**
 * services/placesApi.ts — Phase 3 Edge Function 프록시 호출 래퍼 (순수 함수 · React 비의존)
 *
 * ⚠️ Google 키는 여기서 절대 다루지 않는다. 반드시 supabase.functions.invoke()로
 * Edge Function(places-search / places-autocomplete / place-details)만 거친다.
 * (구 hooks/useNearbyPlaces.ts 처럼 클라이언트에서 Google Places를 직접 fetch하는
 * 패턴은 워크플로우 §2 위반이라 재사용하지 않았다 — 그 훅은 현재 미사용 상태.)
 *
 * 스택: @supabase/supabase-js(확정, Phase 0에 설치됨). 새 라이브러리 없음.
 * (Phase 5: invoke 헬퍼를 services/edgeFunctions.ts 로 공용화 — directionsApi 와 공유.)
 */
import type { Restaurant } from '@/types/db';
import { invokeEdgeFunction, EdgeFunctionError } from '@/services/edgeFunctions';

/**
 * Autocomplete 세션 토큰 생성. 암호학적 강도는 불필요(Google이 세션 묶음 용도로만 씀) —
 * crypto.randomUUID 같은 추가 폴리필/패키지 없이 이 정도 무작위성으로 충분하다.
 */
export function generateSessionToken(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

/** 하위 호환 별칭 — 기존 AddRestaurantSheet.tsx(Phase 4)가 이 이름으로 import 중. */
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

/**
 * Place Details — 후보를 "선택"했을 때 **1회만** 호출한다(비용 제약). 응답은 이미
 * Edge Function이 restaurants에 upsert한 뒤의 행(내부 id 확보됨)을 그대로 반환한다.
 */
export async function getPlaceDetails(
  placeId: string,
  sessionToken?: string,
): Promise<Restaurant> {
  const { restaurant } = await invokeEdgeFunction<{ restaurant: Restaurant; fromCache: boolean }>(
    'place-details',
    { placeId, ...(sessionToken ? { sessionToken } : {}) },
  );
  return restaurant;
}
