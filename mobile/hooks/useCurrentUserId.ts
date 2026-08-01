/**
 * hooks/useCurrentUserId.ts — 현재 세션 uid (TanStack Query · server cache)
 * queryKey: ['authUser']. 로그인 상태가 세션 지속 동안 안 바뀌므로 staleTime=Infinity.
 * useIsFollowing 의 queryKey(['isFollowing', myId, followingId]) 구성에 재사용.
 */
import { useQuery } from '@tanstack/react-query';
import { getCurrentUserId } from '@/services/followsApi';

export function useCurrentUserId() {
  return useQuery({
    queryKey: ['authUser'],
    queryFn: getCurrentUserId,
    staleTime: Infinity,
  });
}
