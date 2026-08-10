import { useMutation, useQueryClient } from '@tanstack/react-query';
import { followUser, unfollowUser } from '@/services/followsApi';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';

export function useToggleFollow(followingId: string) {
  const queryClient = useQueryClient();
  const { data: myId } = useCurrentUserId();
  const key = ['isFollowing', myId, followingId] as const;

  return useMutation({
    mutationFn: (next: boolean) => next ? followUser(followingId) : unfollowUser(followingId),
    onMutate: async (next: boolean) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<boolean>(key);
      queryClient.setQueryData(key, next);
      return { previous };
    },
    onError: (_error, _next, context) => queryClient.setQueryData(key, context?.previous),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['isFollowing'] });
      queryClient.invalidateQueries({ queryKey: ['followCounts'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['userSearch'] });
    },
  });
}
