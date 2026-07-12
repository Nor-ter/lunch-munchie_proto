/**
 * POST /directions — Directions API. 워크플로우 §4.
 * body: { coordinates: {lat:number, lng:number}[], mode?: 'walking'|'driving'|'bicycling'|'transit' }
 *
 * 좌표 순서 = course_items.order_index 순서(최적화/재배열 없음 — 코스는 사용자가 정한
 * 순서를 그대로 걷는다는 전제). 좌표해시 키로 **단기 in-memory 캐시**(모듈 스코프,
 * 콜드스타트 시 초기화되는 best-effort 캐시 — Edge Function 특성상 이 이상의 영속
 * 캐시는 범위 밖). Google 원본을 그대로 흘리지 않고 { polyline, distanceMeters,
 * durationSeconds } 로 정규화해 반환한다.
 */
import { CORS_HEADERS, handlePreflight } from '../_shared/cors.ts';
import { ApiError, errorResponse } from '../_shared/errors.ts';
import { parseJsonBody } from '../_shared/validate.ts';
import { callDirections } from '../_shared/google.ts';

const MIN_STOPS = 2;
const MAX_STOPS = 25; // Google Directions waypoint 상한과 동일한 보수적 가드
const CACHE_TTL_MS = 10 * 60 * 1000; // 단기 캐시 10분

interface Coord {
  lat: number;
  lng: number;
}

interface DirectionsResult {
  polyline: string;
  distanceMeters: number;
  durationSeconds: number;
}

const cache = new Map<string, { value: DirectionsResult; expiresAt: number }>();

function validateCoordinates(body: Record<string, unknown>): Coord[] {
  const raw = body.coordinates;
  if (!Array.isArray(raw) || raw.length < MIN_STOPS) {
    throw new ApiError('invalid_request', `coordinates 는 최소 ${MIN_STOPS}개 필요합니다.`, 400);
  }
  if (raw.length > MAX_STOPS) {
    throw new ApiError('invalid_request', `coordinates 는 최대 ${MAX_STOPS}개까지 가능합니다.`, 400);
  }
  return raw.map((c, i) => {
    const lat = (c as Coord)?.lat;
    const lng = (c as Coord)?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw new ApiError('invalid_request', `coordinates[${i}] 는 {lat, lng} 숫자여야 합니다.`, 400);
    }
    return { lat, lng };
  });
}

const VALID_MODES = new Set(['walking', 'driving', 'bicycling', 'transit']);

function validateMode(body: Record<string, unknown>): string {
  const mode = body.mode;
  if (mode === undefined) return 'walking'; // 코스맵 기본은 도보
  if (typeof mode !== 'string' || !VALID_MODES.has(mode)) {
    throw new ApiError('invalid_request', 'mode 는 walking|driving|bicycling|transit 중 하나입니다.', 400);
  }
  return mode;
}

// 좌표(소수 5자리=약 1m 단위로 반올림) + mode → 캐시 키. 부동소수 미세차를 흡수.
function hashKey(coords: Coord[], mode: string): string {
  const rounded = coords.map((c) => `${c.lat.toFixed(5)},${c.lng.toFixed(5)}`).join('|');
  return `${mode}::${rounded}`;
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    const body = await parseJsonBody(req);
    const coords = validateCoordinates(body);
    const mode = validateMode(body);

    const key = hashKey(coords, mode);
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return new Response(JSON.stringify({ ...hit.value, fromCache: true }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const origin = coords[0];
    const destination = coords[coords.length - 1];
    const waypoints = coords.slice(1, -1);

    const params = new URLSearchParams({
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      mode,
    });
    if (waypoints.length > 0) {
      // optimize:true 를 쓰지 않는다 — 순서는 order_index 로 이미 확정, 재배열 금지.
      params.set('waypoints', waypoints.map((w) => `${w.lat},${w.lng}`).join('|'));
    }

    const google = await callDirections(params);
    const route = (google.routes as Record<string, unknown>[] | undefined)?.[0];
    if (!route) {
      throw new ApiError('google_api_error', 'Directions 결과에 경로가 없어요.', 502);
    }

    const legs = (route.legs as Record<string, unknown>[] | undefined) ?? [];
    const distanceMeters = legs.reduce(
      (sum, leg) => sum + (((leg.distance as { value?: number })?.value) ?? 0),
      0,
    );
    const durationSeconds = legs.reduce(
      (sum, leg) => sum + (((leg.duration as { value?: number })?.value) ?? 0),
      0,
    );
    const polyline =
      ((route.overview_polyline as { points?: string } | undefined)?.points) ?? '';

    const result: DirectionsResult = { polyline, distanceMeters, durationSeconds };
    cache.set(key, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });

    return new Response(JSON.stringify({ ...result, fromCache: false }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return errorResponse(err, CORS_HEADERS);
  }
});
