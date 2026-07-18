/**
 * hooks/useDevAccounts.ts — 개발용 계정 스위처 훅 (DEV 전용).
 *
 * listDevAccounts / createTestUser / switchToUser 를 TanStack Query로 감싼다. 생성·전환은
 * "내가 누구인가"(auth.uid) 자체가 바뀌는 일이라, 성공 시 queryClient.clear()로 모든
 * 유저별 캐시(['authUser'], ['isFollowing'], ['followCounts'], ['user'] 등)를 통째로 비운다
 * — 이전 신원 기준 데이터가 새 신원 화면에 남지 않게. 이후 각 화면이 새 세션으로 재조회한다.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listDevAccounts, createTestUser, switchToUser } from '@/lib/devAccounts';

export function useDevAccounts() {
  const queryClient = useQueryClient();

  const accountsQ = useQuery({
    queryKey: ['devAccounts'],
    queryFn: listDevAccounts,
  });

  const create = useMutation({
    mutationFn: createTestUser,
    onSuccess: () => queryClient.clear(),
  });

  const switchTo = useMutation({
    mutationFn: (uid: string) => switchToUser(uid),
    onSuccess: () => queryClient.clear(),
  });

  return { accountsQ, create, switchTo };
}
