/**
 * POST /places-search — Places Text Search(New). 워크플로우 §4.
 * body: { query: string, bias?: { lat: number, lng: number, radiusMeters?: number } }
 * Melbourne locationBias 를 기본 적용(bias 미지정 시).
 *
 * Google 원본을 그대로 흘리지 않고 정규화된 { results: [...] } 만 반환한다.
 */
import { CORS_HEADERS, handlePreflight } from '../_shared/cors.ts';
import { errorResponse } from '../_shared/errors.ts';
import { parseJsonBody, requireString } from '../_shared/validate.ts';
import { callPlacesNew, resolveLocationBias, type LocationBiasInput } from '../_shared/google.ts';
import { mapPriceLevel, mapRating, mapReviewCount } from '../_shared/restaurantMapping.ts';

// 리스트 표시에 필요한 필드만 요청 → 과금 최소화(§4 설계 규칙).
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.primaryTypeDisplayName',
].join(',');

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    const body = await parseJsonBody(req);
    const query = requireString(body, 'query', { maxLength: 200 });
    const locationBias = resolveLocationBias(body.bias as LocationBiasInput | undefined);

    const google = await callPlacesNew(
      'places:searchText',
      { textQuery: query, locationBias },
      FIELD_MASK,
    );

    const places = (google.places as Record<string, unknown>[] | undefined) ?? [];
    const results = places.map((p) => {
      const displayName = p.displayName as { text?: string } | undefined;
      const location = p.location as { latitude?: number; longitude?: number } | undefined;
      const primaryType = p.primaryTypeDisplayName as { text?: string } | undefined;
      return {
        placeId: String(p.id ?? ''),
        name: displayName?.text ?? '이름 없음',
        address: (p.formattedAddress as string | undefined) ?? '',
        latitude: location?.latitude ?? 0,
        longitude: location?.longitude ?? 0,
        rating: mapRating(p.rating),
        reviewCount: mapReviewCount(p.userRatingCount),
        priceLevel: mapPriceLevel(p.priceLevel),
        category: primaryType?.text ?? '기타',
      };
    });

    return new Response(JSON.stringify({ results }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return errorResponse(err, CORS_HEADERS);
  }
});
