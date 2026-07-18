/**
 * hooks/useItems.ts — 코스의 stop 목록 조회 (TanStack Query · server cache)
 * queryKey: ['items', courseId]. course_items ⨝ restaurants, order_index asc.
 * 스택: TanStack Query(확정). 새 라이브러리 없음.
 */
import { useQuery } from '@tanstack/react-query';
import { getItems } from '@/services/itemsApi';

export function useItems(courseId: string) {
  return useQuery({
    queryKey: ['items', courseId],
    queryFn: () => getItems(courseId),
    enabled: !!courseId,
  });
}
