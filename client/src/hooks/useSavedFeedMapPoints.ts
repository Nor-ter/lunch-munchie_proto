import { useMemo } from 'react';
import type { FeedPost } from '@/contexts/AppContext';
import { useApp } from '@/contexts/AppContext';
import { buildSavedFeedMapPoints } from '@/lib/savedFeedMap';

/**
 * Saved 지도 데이터의 단일 조회 경계.
 * 실제 DB 연결 시 이 훅에서 저장 피드의 course_items/restaurants 위치 쿼리를 수행하면 된다.
 */
export function useSavedFeedMapPoints(posts: FeedPost[]) {
  const { getCourseById, getRestaurantById } = useApp();

  return useMemo(
    () => buildSavedFeedMapPoints({ posts, getCourseById, getRestaurantById }),
    [posts, getCourseById, getRestaurantById],
  );
}
