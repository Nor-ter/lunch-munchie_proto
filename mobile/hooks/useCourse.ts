/**
 * hooks/useCourse.ts — 코스 단건 조회 (TanStack Query · server cache)
 * queryKey: ['course', id]. 스택: TanStack Query(확정). 새 라이브러리 없음.
 */
import { useQuery } from '@tanstack/react-query';
import { getCourse } from '@/services/coursesApi';

export function useCourse(id: string) {
  return useQuery({
    queryKey: ['course', id],
    queryFn: () => getCourse(id),
    enabled: !!id,
  });
}
