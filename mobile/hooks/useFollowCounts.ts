/**
 * hooks/useFollowCounts.ts — userId 의 팔로워/팔로잉 수 (TanStack Query)
 * queryKey: ['followCounts', userId] · follow-feature-workflow.md §6.2.
 */
import { useQuery } from '@tanstack/react-query';
import { getFollowCounts } from '@/services/followsApi';

export function useFollowCounts(userId: string) {
  return useQuery({
    queryKey: ['followCounts', userId],
    queryFn: () => getFollowCounts(userId),
    enabled: !!userId,
  });
}
