/**
 * lib/restaurantFreshness.ts — restaurants.synced_at TTL 판정 (클라이언트 측).
 *
 * supabase/functions/_shared/restaurantMapping.ts 의 isSyncFresh 와 동일 로직(TTL 30일).
 * Edge Function(place-details)도 서버에서 같은 TTL을 검사해 만료 시에만 Google을 재호출
 * 하므로, 클라이언트에서 이 함수로 먼저 걸러 만료된 것만 place-details를 부르면
 * "매 화면 진입마다 안 써도 될 Edge Function 호출"을 줄일 수 있다(비용/지연 절감).
 * Deno 파일을 그대로 import할 수 없어(런타임 분리) 작게 복제했다 — 새 라이브러리 없음.
 */
export function isSyncFresh(syncedAt: string | null, ttlDays = 30): boolean {
  if (!syncedAt) return false;
  const ageMs = Date.now() - new Date(syncedAt).getTime();
  return ageMs < ttlDays * 24 * 60 * 60 * 1000;
}
