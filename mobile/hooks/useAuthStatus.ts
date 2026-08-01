/**
 * hooks/useAuthStatus.ts — 현재 세션의 uid + 익명 여부 (TanStack Query · server cache)
 * queryKey: ['authStatus']. login-workflow.md §6 Phase 2.
 *
 * 기존 useCurrentUserId(['authUser'])는 uid만 반환하고 follow 기능 전반(useIsFollowing 등)이
 * 이미 그 키/시그니처에 의존하고 있어 그대로 둔다 — isAnonymous까지 필요한 화면(로그인/로그아웃
 * 버튼 분기 등)만 이 훅을 쓴다. staleTime=Infinity — app/_layout.tsx 의 onAuthStateChange
 * 구독이 로그인/로그아웃/프로필갱신 시 queryClient.clear() 로 무효화한다.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AuthStatus {
  uid: string;
  isAnonymous: boolean;
}

async function getAuthStatus(): Promise<AuthStatus> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('로그인 세션이 없습니다.');
  return { uid: user.id, isAnonymous: user.is_anonymous ?? false };
}

export function useAuthStatus() {
  return useQuery({
    queryKey: ['authStatus'],
    queryFn: getAuthStatus,
    staleTime: Infinity,
  });
}
