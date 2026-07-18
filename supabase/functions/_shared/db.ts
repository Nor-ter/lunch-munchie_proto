/**
 * _shared/db.ts — restaurants 테이블 읽기/upsert (PostgREST 직접 호출).
 *
 * 설계 결정: @supabase/supabase-js 를 import 하지 않는다. Edge Function 은
 * SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 를 자동으로 env 에 주입받으므로,
 * PostgREST REST 엔드포인트를 fetch 로 직접 호출하면 **새 의존성 0개**로 끝난다
 * (services/* 가 fetch 기반·no axios 인 워크플로우 원칙과도 일치).
 * service_role 은 RLS 를 우회하므로, restaurants 쓰기는 워크플로우 §3.5 설계대로
 * "서버(Edge Function)만" 가능하고 클라이언트 anon 키로는 여전히 막혀 있다.
 */
import { ApiError } from './errors.ts';

function restUrl(path: string): string {
  const base = Deno.env.get('SUPABASE_URL');
  if (!base) throw new ApiError('config_error', 'SUPABASE_URL 이 없어요.', 500);
  return `${base}/rest/v1/${path}`;
}

function serviceHeaders(): Record<string, string> {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!key) throw new ApiError('config_error', 'SUPABASE_SERVICE_ROLE_KEY 가 없어요.', 500);
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

/** google_place_id 로 기존 캐시 행 조회 (TTL 판정용). 없으면 null. */
export async function findRestaurantByGooglePlaceId(
  googlePlaceId: string,
): Promise<Record<string, unknown> | null> {
  const url = `${restUrl('restaurants')}?google_place_id=eq.${encodeURIComponent(googlePlaceId)}&select=*&limit=1`;
  const res = await fetch(url, { headers: serviceHeaders() });
  if (!res.ok) {
    throw new ApiError('db_error', `restaurants 조회 실패 (HTTP ${res.status})`, 502);
  }
  const rows = (await res.json()) as Record<string, unknown>[];
  return rows[0] ?? null;
}

/**
 * google_place_id 기준 upsert. on_conflict 대상은 google_place_id(unique, Phase 0).
 * id 는 PK 라 충돌 시에도 갱신되지 않고 최초 insert 값이 유지된다.
 */
export async function upsertRestaurant(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const url = `${restUrl('restaurants')}?on_conflict=google_place_id`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...serviceHeaders(),
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify([payload]),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError('db_error', `restaurants upsert 실패 (HTTP ${res.status}) ${text}`.trim(), 502);
  }
  const rows = (await res.json()) as Record<string, unknown>[];
  if (!rows[0]) {
    throw new ApiError('db_error', 'restaurants upsert 결과가 비어있어요.', 502);
  }
  return rows[0];
}
