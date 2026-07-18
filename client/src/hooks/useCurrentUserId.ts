import { useQuery } from '@tanstack/react-query';
import { getCurrentUserId } from '@/services/followsApi';

export function useCurrentUserId() {
  return useQuery({ queryKey: ['authUser'], queryFn: getCurrentUserId, staleTime: Infinity });
}
