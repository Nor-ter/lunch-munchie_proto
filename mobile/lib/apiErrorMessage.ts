/**
 * lib/apiErrorMessage.ts — Phase 6 §2: 에러 표시 표준화.
 *
 * Edge Function 프록시(places-search/autocomplete/place-details/directions)는 전부
 * {code,message} 로 에러를 정규화해 던진다(EdgeFunctionError, services/edgeFunctions.ts).
 * 화면마다 err.message 를 그대로/제각각 보여주지 않고, 이 함수 하나를 거쳐 일관된
 * 문구로 변환한다 — 특히 Google 쿼터초과/rate-limit 류는 원문(영문, 딱딱함) 대신
 * 사용자에게 뜻이 통하는 한국어 안내로 바꾼다.
 *
 * 새 라이브러리 없음 — 순수 함수.
 */
export function describeApiError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code;
  const raw = err instanceof Error ? err.message : '';

  const friendly = describeByCode(code, raw);
  // 개발 빌드에서는 실제 원인(Google/DB 원문 메시지)을 괄호로 덧붙인다 — 프로덕션
  // 사용자에게는 안 보이지만, 지금처럼 "왜 실패하는지" 진단할 때 Supabase 로그
  // 없이도 화면에서 바로 원인을 볼 수 있게 한다.
  if (__DEV__ && raw && raw !== friendly) {
    return `${friendly} (${raw})`;
  }
  return friendly;
}

function describeByCode(code: string | undefined, raw: string): string {
  // Google 쿼터/rate-limit 계열은 원문 그대로 보여주면 사용자가 이해하기 어렵다.
  if (/quota|rate.?limit|resource_exhausted|over_query_limit/i.test(raw)) {
    return '요청이 많아 지금은 처리할 수 없어요. 잠시 후 다시 시도해 주세요.';
  }

  switch (code) {
    case 'invalid_request':
      return raw || '요청 내용을 확인해 주세요.';
    case 'google_api_error':
      return '지도 서비스에 일시적인 문제가 있어요. 잠시 후 다시 시도해 주세요.';
    case 'db_error':
      return '저장 중 문제가 생겼어요. 다시 시도해 주세요.';
    case 'config_error':
      return '서비스 설정에 문제가 있어요. 잠시 후 다시 시도해 주세요.';
    case 'internal_error':
      return raw || '알 수 없는 오류가 발생했어요.';
    default:
      return raw || '알 수 없는 오류가 발생했어요.';
  }
}
