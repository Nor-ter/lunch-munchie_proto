/**
 * hooks/useToggleFollow.ts — 팔로우/언팔로우 토글 (TanStack Query useMutation)
 * follow-feature-workflow.md §6.2. FollowButton 이 다음 상태(nextIsFollowing)를
 * mutate(!isFollowing) 로 넘기면, 버튼이 즉시 반응하도록 낙관적으로
 * ['isFollowing', myId, followingId] 캐시를 먼저 뒤집고, 실패 시 원래 값으로 롤백한다.
 * 정착(성공/실패 무관) 시 팔로우 관계에 영향받는 읽기 쿼리를 전부 prefix 무효화한다:
 * isFollowing(모든 FollowButton) + followCounts(A·B ProfileStats) + followers/following 목록.
 * 목록까지 무효화해야 팔로우 직후 FollowerListSheet 가 재시작 없이 즉시 갱신된다. prefix 매칭이라
 * myId 해결 타이밍과 무관하게 양쪽(대상·나) 캐시가 모두 수렴한다.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { followUser, unfollowUser } from '@/services/followsApi';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';

export function useToggleFollow(followingId: string) {
  const queryClient = useQueryClient();
  const { data: myId } = useCurrentUserId();
  const isFollowingKey = ['isFollowing', myId, followingId] as const;

  return useMutation({
    mutationFn: (nextIsFollowing: boolean) =>
      nextIsFollowing ? followUser(followingId) : unfollowUser(followingId),

    onMutate: async (nextIsFollowing: boolean) => {
      await queryClient.cancelQueries({ queryKey: isFollowingKey });
      const previous = queryClient.getQueryData<boolean>(isFollowingKey);
      queryClient.setQueryData(isFollowingKey, nextIsFollowing);
      return { previous };
    },

    onError: (_err, _nextIsFollowing, context) => {
      queryClient.setQueryData(isFollowingKey, context?.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['isFollowing'] }); // 모든 FollowButton 상태
      queryClient.invalidateQueries({ queryKey: ['followCounts'] }); // A·B 카운트 (ProfileStats)
      queryClient.invalidateQueries({ queryKey: ['followers'] }); // 대상의 팔로워 목록 (내가 추가/제거됨)
      queryClient.invalidateQueries({ queryKey: ['following'] }); // 내 팔로잉 목록 (대상이 추가/제거됨)
    },
  });
}
