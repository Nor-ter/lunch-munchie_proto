import { useQuery } from '@tanstack/react-query';
import { searchUsers } from '@/services/followsApi';

export function useUserSearch(query: string, enabled = true) {
  const normalized = query.trim().replace(/^@/, '');
  return useQuery({
    queryKey: ['userSearch', normalized.toLowerCase()],
    queryFn: ({ signal }) => searchUsers(normalized, signal),
    enabled: enabled && normalized.length > 0 && normalized.length <= 40,
    staleTime: 15_000,
  });
}
