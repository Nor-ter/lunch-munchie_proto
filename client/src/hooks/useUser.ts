import { useQuery } from '@tanstack/react-query';
import { getUser } from '@/services/followsApi';

export function useUser(userId: string, enabled = true) {
  return useQuery({ queryKey: ['user', userId], queryFn: () => getUser(userId), enabled: !!userId && enabled });
}
