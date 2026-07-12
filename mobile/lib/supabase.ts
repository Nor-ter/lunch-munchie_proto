/**
 * lib/supabase.ts — Supabase 클라이언트 (anon 키) + 익명 인증 (Phase 0)
 *
 * 워크플로우 §3.5 패턴 1: Supabase Auth 익명 로그인 → 기기마다 auth.uid() 확보 →
 * RLS 정책 동작. 이후 소셜/이메일 로그인으로 승격 가능.
 *
 * RN 주의점:
 *  · URL 전역이 필요해 react-native-url-polyfill/auto 를 최상단에서 import.
 *  · 세션 지속에 AsyncStorage 를 스토리지 어댑터로 지정(없으면 재시작 시 세션 소실).
 *  · detectSessionInUrl=false (RN에는 URL 콜백 개념이 없음).
 *  · AppState 로 포그라운드에서만 토큰 자동 갱신(공식 Expo 가이드).
 *
 * 스택: @supabase/supabase-js (확정 스택). 새 라이브러리 없음.
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient, type Session } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY 가 .env 에 설정되지 않았습니다.',
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// 앱이 포그라운드일 때만 토큰 자동 갱신(백그라운드 소켓/타이머 절약).
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

/**
 * 앱 부팅 시 호출: 세션이 없으면 익명 로그인해 auth.uid() 를 확보한다.
 * (익명 로그인은 Supabase 대시보드에서 "Anonymous sign-ins" 활성화가 전제.)
 *
 * login-workflow.md §6 Phase 2: 정식(비익명) 로그인 세션이 있으면 이 함수가 그걸 그대로
 * 반환하고 익명 로그인을 시도하지 않는다 — getSession() 은 persistSession(AsyncStorage)에
 * 저장된 세션을 익명/정식 구분 없이 그대로 돌려주므로, 별도 분기 없이 이미 이 요구사항을
 * 만족한다(정식 로그인 후 앱 재시작해도 위에 익명 세션이 덧씌워지지 않음).
 */
export async function ensureAnonymousSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) return session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    // 대시보드에서 익명 로그인 미활성 등 → 명확히 로깅. RLS가 필요한 화면은
    // 세션 없이 동작하지 않으므로, 호출부에서 이 실패를 인지해 처리한다.
    console.error('[supabase] 익명 로그인 실패:', error.message);
    throw error;
  }
  return data.session;
}
