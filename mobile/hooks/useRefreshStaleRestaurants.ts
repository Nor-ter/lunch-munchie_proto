/**
 * hooks/useRefreshStaleRestaurants.ts — Phase 6 §1: TTL(30일) 만료 restaurants lazy refresh.
 *
 * 워크플로우가 말하는 "상세화면 진입 시 refresh"의 실제 적용 지점은 이 앱에서 코스
 * 편집 화면(edit.tsx)이다 — 별도의 식당 "상세" 라우트가 아직 없고, 사용자가 식당 정보를
 * 보는 곳이 여기이기 때문이다. items 목록이 로드되면 source='google' && TTL 만료인
 * 항목만 골라 place-details를 백그라운드로 재호출하고, 성공하면 TanStack Query 캐시
 * (['items', courseId])를 직접 갱신한다 — 화면을 막지 않고(로딩 스피너 없음), 실패해도
 * 조용히 무시한다(새로고침 실패가 화면 사용을 방해하면 안 됨).
 *
 * editStore.draft 는 이 갱신에 영향받지 않는다(dirty=true 인 동안은 기존 설계대로
 * 사용자의 로컬 편집을 덮지 않음 — !dirty 일 때만 draft가 재복제되는 기존 useEffect가
 * 자연히 이 규칙을 지킨다).
 *
 * 스택: TanStack Query(확정). 새 라이브러리 없음.
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getPlaceDetails } from '@/services/placesApi';
import { isSyncFresh } from '@/lib/restaurantFreshness';
import type { CourseItemWithRestaurant } from '@/types/db';

const TTL_DAYS = 30;

export function useRefreshStaleRestaurants(
  courseId: string,
  items: CourseItemWithRestaurant[],
) {
  const queryClient = useQueryClient();
  // 같은 place_id를 중복으로 재요청하지 않도록(이 컴포넌트 생명주기 동안) 진행 중 집합을 기억.
  const inFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!courseId || items.length === 0) return;

    const stale = items.filter((it) => {
      const r = it.restaurant;
      return (
        r.source === 'google' &&
        !!r.google_place_id &&
        !isSyncFresh(r.synced_at, TTL_DAYS) &&
        !inFlightRef.current.has(r.google_place_id)
      );
    });
    if (stale.length === 0) return;

    stale.forEach((it) => {
      const placeId = it.restaurant.google_place_id as string;
      inFlightRef.current.add(placeId);
      getPlaceDetails(placeId)
        .then((fresh) => {
          queryClient.setQueryData<CourseItemWithRestaurant[]>(['items', courseId], (prev) =>
            prev?.map((p) => (p.restaurant.id === fresh.id ? { ...p, restaurant: fresh } : p)),
          );
        })
        .catch(() => {
          /* 백그라운드 refresh 실패는 조용히 무시 — 다음 진입 때 다시 시도된다. */
        })
        .finally(() => {
          inFlightRef.current.delete(placeId);
        });
    });
  }, [courseId, items, queryClient]);
}
