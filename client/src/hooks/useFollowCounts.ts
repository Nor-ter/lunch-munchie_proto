import { useQuery } from '@tanstack/react-query';
import { getFollowCounts } from '@/services/followsApi';

export function useFollowCounts(userId: string) {
  return useQuery({ queryKey: ['followCounts', userId], queryFn: () => getFollowCounts(userId), enabled: !!userId });
}
