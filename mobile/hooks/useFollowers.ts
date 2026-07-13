/**
 * hooks/useFollowers.ts — userId 를 팔로우하는 사람 목록 (TanStack Query)
 * queryKey: ['followers', userId] · follow-feature-workflow.md §6.2.
 */
import { useQuery } from '@tanstack/react-query';
import { getFollowers } from '@/services/followsApi';

export function useFollowers(userId: string) {
  return useQuery({
    queryKey: ['followers', userId],
    queryFn: () => getFollowers(userId),
    enabled: !!userId,
  });
}
