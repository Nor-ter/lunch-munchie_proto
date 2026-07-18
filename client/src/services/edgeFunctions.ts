/**
 * services/edgeFunctions.ts — Supabase Edge Function 호출 공통 헬퍼 (순수 함수 · React 비의존)
 *
 * placesApi/directionsApi 가 공유한다. 에러를 {code,message}로 정규화해 던진다
 * (Edge Function의 반환 형태와 동일 — services/hooks/컴포넌트가 일관되게 처리).
 * 원본: mobile/services/edgeFunctions.ts (web-maps-places-workflow.md Phase 1 이식, 변경 없음).
 * 스택: @supabase/supabase-js(확정, follow Phase 0에 설치됨). 새 라이브러리 없음.
 */
import { supabase } from '@/lib/supabase';

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
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) {
    let code = 'internal_error';
    let message = error.message ?? '알 수 없는 오류가 발생했어요.';
    // FunctionsHttpError 는 .context 에 원본 Response 를 담는다 — Edge Function이 반환한
    // {code,message} 본문을 최대한 살려서 노출한다.
    const context = (error as { context?: Response }).context;
    if (context) {
      try {
        const body = (await context.json()) as { code?: string; message?: string };
        if (body.code) code = body.code;
        if (body.message) message = body.message;
      } catch {
        /* 파싱 실패 시 기본 메시지 유지 */
      }
    }
    throw new EdgeFunctionError(code, message);
  }
  if (!data) {
    throw new EdgeFunctionError('internal_error', `${name} 응답이 비어있어요.`);
  }
  return data;
}
