/**
 * hooks/useFollowing.ts — userId 가 팔로우하는 사람 목록 (TanStack Query)
 * queryKey: ['following', userId] · follow-feature-workflow.md §6.2.
 */
import { useQuery } from '@tanstack/react-query';
import { getFollowing } from '@/services/followsApi';

export function useFollowing(userId: string) {
  return useQuery({
    queryKey: ['following', userId],
    queryFn: () => getFollowing(userId),
    enabled: !!userId,
  });
}
