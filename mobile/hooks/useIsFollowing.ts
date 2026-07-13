/**
 * hooks/useIsFollowing.ts — 내가 followingId 를 팔로우 중인지 (TanStack Query)
 * queryKey: ['isFollowing', myId, followingId] · follow-feature-workflow.md §6.2.
 */
import { useQuery } from '@tanstack/react-query';
import { getIsFollowing } from '@/services/followsApi';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';

export function useIsFollowing(followingId: string) {
  const { data: myId } = useCurrentUserId();

  return useQuery({
    queryKey: ['isFollowing', myId, followingId],
    queryFn: () => getIsFollowing(followingId),
    enabled: !!myId && !!followingId,
  });
}
