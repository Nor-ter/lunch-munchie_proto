/**
 * _shared/cors.ts — 공통 CORS 헤더.
 *
 * 모바일 앱(Expo)이 브라우저가 아니라 네이티브 fetch 로 호출하므로 CORS가 필수는
 * 아니지만, 웹 프리뷰/로컬 curl/향후 웹 클라이언트 재사용을 위해 열어둔다.
 * 스택: Deno 표준 Response 만 사용. 새 의존성 없음.
 */
export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** OPTIONS 프리플라이트 응답 (각 함수 진입부에서 먼저 처리) */
export function handlePreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  return null;
}
