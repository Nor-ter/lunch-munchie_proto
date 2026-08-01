/**
 * _shared/google.ts — Google API 호출 공통 헬퍼.
 *
 * 서버 키는 여기서만 읽는다(Deno.env, 클라이언트 번들 절대 미노출). Places 계열은
 * "Places API (New)" 엔드포인트(places.googleapis.com/v1/*)를 쓴다(워크플로우 §4.5
 * "서버 키: Places API (New)"). Directions 는 레거시 Directions API(maps.googleapis.com)
 * — 워크플로우가 "Routes API"가 아니라 "Directions API"로 명시했으므로 그대로 따른다.
 */
import { ApiError } from './errors.ts';

export const MELBOURNE_CENTER = { lat: -37.8136, lng: 144.9631 };
export const DEFAULT_BIAS_RADIUS_METERS = 5000; // 워크플로우 §4.5 "Melbourne 바이어스"

export interface LocationBiasInput {
  lat?: unknown;
  lng?: unknown;
  radiusMeters?: unknown;
}

/**
 * bias 요청 필드 → Google locationBias.circle. 클라이언트가 좌표를 안 주면(§4.5 "Melbourne
 * 바이어스 기본 적용") Melbourne 중심으로 폴백한다. places-search / places-autocomplete 공용.
 */
export function resolveLocationBias(bias: LocationBiasInput | undefined) {
  const lat = typeof bias?.lat === 'number' ? bias.lat : MELBOURNE_CENTER.lat;
  const lng = typeof bias?.lng === 'number' ? bias.lng : MELBOURNE_CENTER.lng;
  const radius =
    typeof bias?.radiusMeters === 'number' ? bias.radiusMeters : DEFAULT_BIAS_RADIUS_METERS;
  return {
    circle: { center: { latitude: lat, longitude: lng }, radius },
  };
}

export function getGoogleServerKey(): string {
  const key = Deno.env.get('GOOGLE_MAPS_SERVER_API_KEY');
  if (!key) {
    throw new ApiError(
      'config_error',
      'GOOGLE_MAPS_SERVER_API_KEY 가 Edge Function 환경변수에 설정되지 않았어요.',
      500,
    );
  }
  return key;
}

/**
 * Places API (New) 호출. X-Goog-FieldMask 로 응답 필드를 최소화해 과금을 줄인다.
 * (레거시 `fields` 쿼리 파라미터 대신 New API 는 헤더로 지정한다.)
 */
export async function callPlacesNew(
  path: string,
  body: Record<string, unknown>,
  fieldMask: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`https://places.googleapis.com/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': getGoogleServerKey(),
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify(body),
  });
  return parseGoogleJson(res, 'places');
}

/** Place Details (New) — GET + path param, POST 바디가 없다. */
export async function callPlaceDetailsNew(
  placeId: string,
  fieldMask: string,
  sessionToken?: string,
): Promise<Record<string, unknown>> {
  const url = new URL(`https://places.googleapis.com/v1/places/${placeId}`);
  if (sessionToken) url.searchParams.set('sessionToken', sessionToken);
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': getGoogleServerKey(),
      'X-Goog-FieldMask': fieldMask,
    },
  });
  return parseGoogleJson(res, 'place-details');
}

/** Directions API (레거시 REST). */
export async function callDirections(params: URLSearchParams): Promise<Record<string, unknown>> {
  params.set('key', getGoogleServerKey());
  const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`);
  const json = await parseGoogleJson(res, 'directions');
  // Directions 레거시는 HTTP 200 이어도 body.status 로 에러를 표현한다(OVER_QUERY_LIMIT 등).
  if (json.status !== 'OK') {
    throw new ApiError(
      'google_api_error',
      `Directions API: ${String(json.status ?? 'UNKNOWN')} — ${String(json.error_message ?? '')}`.trim(),
      502,
    );
  }
  return json;
}

async function parseGoogleJson(res: Response, label: string): Promise<Record<string, unknown>> {
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ApiError('google_api_error', `${label}: 응답을 파싱하지 못했어요.`, 502);
  }
  if (!res.ok) {
    const message =
      (json as { error?: { message?: string } })?.error?.message ??
      `${label} 호출이 실패했어요 (HTTP ${res.status}).`;
    throw new ApiError('google_api_error', message, 502);
  }
  return json as Record<string, unknown>;
}
