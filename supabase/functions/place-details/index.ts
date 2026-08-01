/**
 * POST /place-details — Place Details(New) + restaurants 스냅샷 upsert. 워크플로우 §4.
 * body: { placeId: string, sessionToken?: string }
 *
 * 흐름:
 *   1. google_place_id 로 기존 캐시 조회. synced_at 이 TTL(30일) 이내면 Google 호출 없이
 *      캐시 행을 정규화해 바로 반환(§4 "TTL 이내면 Google 호출 생략").
 *   2. 없거나 만료면 Place Details(New) 호출 → restaurants upsert(source='google',
 *      synced_at=now()) → upsert 결과 행을 반환.
 * rating/price_level 미제공 시 0/2 기본값(NOT NULL 유지, §3.2).
 * Google 원본을 그대로 흘리지 않고, upsert 후의 DB 행(정규화된 형태)만 반환한다.
 */
import { CORS_HEADERS, handlePreflight } from '../_shared/cors.ts';
import { errorResponse } from '../_shared/errors.ts';
import { parseJsonBody, requireString, optionalString } from '../_shared/validate.ts';
import { callPlaceDetailsNew } from '../_shared/google.ts';
import {
  toRestaurantUpsertPayload,
  isSyncFresh,
  type GooglePlaceDetails,
} from '../_shared/restaurantMapping.ts';
import { findRestaurantByGooglePlaceId, upsertRestaurant } from '../_shared/db.ts';

const TTL_DAYS = 30;

// 상세 화면에 필요한 필드만 요청 → 과금 최소화(§4 설계 규칙).
const FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'rating',
  'userRatingCount',
  'priceLevel',
  'primaryTypeDisplayName',
  'editorialSummary',
  'internationalPhoneNumber',
  'regularOpeningHours.weekdayDescriptions',
].join(',');

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    const body = await parseJsonBody(req);
    const placeId = requireString(body, 'placeId', { maxLength: 200 });
    const sessionToken = optionalString(body, 'sessionToken');

    // 1) TTL 이내 캐시가 있으면 Google 호출 생략.
    const cached = await findRestaurantByGooglePlaceId(placeId);
    if (cached && isSyncFresh(cached.synced_at as string | null, TTL_DAYS)) {
      return new Response(JSON.stringify({ restaurant: cached, fromCache: true }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // 2) Google 조회 → 정규화 → upsert.
    //    callPlaceDetailsNew 반환 타입은 Record<string, unknown>(범용 JSON)이라
    //    GooglePlaceDetails 와 구조가 겹치지 않는다고 판단될 수 있어 unknown 경유로 단언한다.
    const google = (await callPlaceDetailsNew(
      placeId,
      FIELD_MASK,
      sessionToken,
    )) as unknown as GooglePlaceDetails;

    if (!google.id) {
      throw new Error('Google Place Details 응답에 id 가 없어요.');
    }

    const payload = toRestaurantUpsertPayload(google);
    const row = await upsertRestaurant(payload);

    return new Response(JSON.stringify({ restaurant: row, fromCache: false }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return errorResponse(err, CORS_HEADERS);
  }
});
