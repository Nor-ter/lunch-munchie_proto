/**
 * _shared/errors.ts — 에러를 {code, message} 로 정규화 (워크플로우 §4 공통 규칙).
 * 클라이언트는 이 형태만 보고 재시도/토스트 처리를 일관되게 한다.
 */

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function errorResponse(err: unknown, corsHeaders: Record<string, string>): Response {
  if (err instanceof ApiError) {
    // google_api_error/db_error 는 클라이언트엔 사용자용 문구로 보이지만(mobile의
    // describeApiError), 원인(예: Google의 실제 에러 메시지 — API 미활성화/키 제한/결제
    // 등)은 여기 로그로만 남는다. 배포된 Edge Function은 콘솔에 직접 못 붙으므로 이게
    // 유일한 디버깅 채널 — `supabase functions logs <name>`으로 확인.
    console.error(`[edge-function] ${err.code}:`, err.message);
    return new Response(JSON.stringify({ code: err.code, message: err.message }), {
      status: err.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  console.error('[edge-function] unexpected error:', err);
  return new Response(
    JSON.stringify({ code: 'internal_error', message: '알 수 없는 오류가 발생했어요.' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}
