/**
 * hooks/useUser.ts — 단일 유저(users 행) 조회 (TanStack Query · server cache)
 * queryKey: ['user', userId]. follow-screen-wiring-workflow.md §4.1 — useCourse.ts 패턴 그대로.
 */
import { useQuery } from '@tanstack/react-query';
import { getUser } from '@/services/followsApi';

export function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUser(userId),
    enabled: !!userId,
  });
}
