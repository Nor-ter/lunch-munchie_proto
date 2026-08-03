/**
 * services/edgeFunctions.ts — Cloudflare Pages API 호출 공통 헬퍼 (순수 함수 · React 비의존)
 *
 * placesApi/directionsApi 가 공유한다. 에러를 {code,message}로 정규화해 던진다
 * (Edge Function의 반환 형태와 동일 — services/hooks/컴포넌트가 일관되게 처리).
 * 원본: mobile/services/edgeFunctions.ts (web-maps-places-workflow.md Phase 1 이식, 변경 없음).
 */

export class EdgeFunctionError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export async function invokeEdgeFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`/api/${encodeURIComponent(name)}`, {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!response.ok) {
    let code = 'internal_error';
    let message = '알 수 없는 오류가 발생했어요.';
    try { const error = await response.json() as { code?: string; message?: string }; code = error.code ?? code; message = error.message ?? message; } catch { /* default */ }
    throw new EdgeFunctionError(code, message);
  }
  const data = await response.json() as T;
  if (!data) {
    throw new EdgeFunctionError('internal_error', `${name} 응답이 비어있어요.`);
  }
  return data;
}
