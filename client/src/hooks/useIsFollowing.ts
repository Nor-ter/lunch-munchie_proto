import { useQuery } from '@tanstack/react-query';
import { getIsFollowing } from '@/services/followsApi';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';

export function useIsFollowing(followingId: string, initialFollowing?: boolean) {
  const { data: myId } = useCurrentUserId();
  return useQuery({
    queryKey: ['isFollowing', myId, followingId],
    queryFn: () => getIsFollowing(followingId),
    enabled: !!myId && !!followingId,
    initialData: initialFollowing,
    staleTime: initialFollowing === undefined ? 0 : 30_000,
  });
}
