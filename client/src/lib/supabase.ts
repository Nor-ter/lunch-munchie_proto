/**
 * lib/supabase.ts — 웹(Vite) Supabase 클라이언트 + 익명 인증
 * web-follow-login-workflow.md Phase 0 · 원본: mobile/lib/supabase.ts
 *
 * 웹 차이점(원본 대비):
 *  · storage 어댑터 지정 불필요 — 브라우저 기본 localStorage 사용.
 *  · detectSessionInUrl 기본값(true) 유지 — Google OAuth 리다이렉트 복귀 시 URL의
 *    토큰/에러를 supabase-js가 자동 처리한다(§2.2). RN에서만 false였다.
 *  · AppState 토큰 갱신 제어 없음 — 웹은 autoRefreshToken 기본 동작으로 충분.
 *
 * anon key는 공개 식별자(RLS가 보안 경계) — 클라이언트 번들에 들어가는 것이 정상.
 */
import { createClient, type Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim();

const hasAnySupabaseConfiguration = Boolean(
  supabaseUrl || supabasePublishableKey,
);

// 인증 설정이 전혀 없는 로컬 프로토타입은 mock/OSM 데이터로 계속 실행한다.
// AuthBootstrap/AuthContext가 이 상태에서는 인증 메서드를 호출하지 않으므로,
// 정적으로 이 모듈을 import하는 화면들이 부팅 중 예외를 던지지 않게 하는 용도다.
const LOCAL_DISABLED_SUPABASE_URL = 'http://127.0.0.1:54321';
const LOCAL_DISABLED_SUPABASE_KEY = 'local-development-placeholder';

function requireSupabaseEnvironmentVariable(
  value: string | undefined,
  variableName: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_PUBLISHABLE_KEY',
): string {
  if (!value) {
    throw new Error(`[Supabase] Missing required environment variable: ${variableName}`);
  }
  return value;
}

function requireValidSupabaseUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error('Unsupported protocol');
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new Error('[Supabase] VITE_SUPABASE_URL must be a valid HTTP(S) URL');
  }
}

const validatedSupabaseUrl = requireValidSupabaseUrl(
  hasAnySupabaseConfiguration
    ? requireSupabaseEnvironmentVariable(supabaseUrl, 'VITE_SUPABASE_URL')
    : LOCAL_DISABLED_SUPABASE_URL,
);
const validatedSupabasePublishableKey = hasAnySupabaseConfiguration
  ? requireSupabaseEnvironmentVariable(
      supabasePublishableKey,
      'VITE_SUPABASE_PUBLISHABLE_KEY',
    )
  : LOCAL_DISABLED_SUPABASE_KEY;

export const supabase = createClient(
  validatedSupabaseUrl,
  validatedSupabasePublishableKey,
);

/**
 * 앱 부팅 시 호출: 세션이 없으면 익명 로그인해 auth.uid() 를 확보한다.
 * 정식(비익명) 로그인 세션이 있으면 그대로 반환하고 익명을 덮지 않는다 —
 * getSession() 이 localStorage 세션을 익명/정식 구분 없이 돌려주므로 별도 분기 불필요
 * (login-workflow.md Phase 2와 동일 속성). OAuth 리다이렉트 복귀 직후에도
 * detectSessionInUrl 이 먼저 세션을 심어두므로 여기서 익명이 새로 생기지 않는다.
 */
export async function ensureAnonymousSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) return session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error('[supabase] 익명 로그인 실패:', error.message);
    throw error;
  }
  return data.session;
}
