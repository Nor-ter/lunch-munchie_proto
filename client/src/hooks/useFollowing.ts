import { useQuery } from '@tanstack/react-query';
import { getFollowing } from '@/services/followsApi';

export function useFollowing(userId: string) {
  return useQuery({ queryKey: ['following', userId], queryFn: () => getFollowing(userId), enabled: !!userId });
}
