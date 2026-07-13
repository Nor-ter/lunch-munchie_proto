import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ensureAnonymousSession, supabase } from '@/lib/supabase';

const queryClient = new QueryClient();

// login-workflow.md §6 Phase 2: 로그인/로그아웃/프로필갱신(linkIdentity·signInWithIdToken
// 등)은 auth.uid() 가 바뀌거나 is_anonymous 가 바뀌는 "신원 전환" 이벤트다. useDevAccounts 가
// 자기 자신의 mutation에서만 queryClient.clear() 하던 걸(devAccounts.ts 경유), 이제 앱
// 전역에서 supabase 세션이 바뀌는 모든 경로(authApi.linkOrSignIn/confirmConflictSignIn 포함)
// 에 대해 한 곳에서 처리한다 — 호출부마다 clear() 를 잊지 않아도 되게. TOKEN_REFRESHED(백그라운드
// 토큰 갱신)와 INITIAL_SESSION(부팅 시 1회, 캐시가 비어 있어 무의미)은 신원 전환이 아니라 제외.
const IDENTITY_CHANGE_EVENTS = new Set(['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED']);

export default function RootLayout() {
  // 앱 부팅 시 세션 확보(정식 세션이 있으면 그대로, 없으면 익명 — lib/supabase.ts 참고).
  // 실패해도 앱은 뜨게 두고 로깅만.
  useEffect(() => {
    ensureAnonymousSession().catch(() => {
      /* 익명 로그인 미활성 등 — lib/supabase.ts 에서 이미 로깅. */
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (IDENTITY_CHANGE_EVENTS.has(event)) {
        queryClient.clear();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
