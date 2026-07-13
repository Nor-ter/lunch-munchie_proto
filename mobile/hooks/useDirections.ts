/**
 * hooks/useDirections.ts — draft 순서 기준 경로(Directions) 조회 + 디코드 (TanStack Query)
 *
 * draft가 바뀔 때마다(드래그 순서변경/추가/삭제) 즉시 재요청하지 않도록 좌표 목록을
 * debounce(usePlacesSearch와 동일 패턴, 새 라이브러리 없이 useEffect+setTimeout으로 구현)
 * 한 뒤 Phase 3 directions 프록시를 호출하고, 응답 polyline을 react-native-maps
 * <Polyline coordinates=...> 에 바로 먹일 수 있는 {latitude,longitude}[] 로 디코드한다.
 *
 * queryKey: ['directions', coordsKey, mode] — coordsKey는 좌표를 5자리로 반올림해 만든
 * 안정적 문자열(부동소수 미세 차이로 캐시가 계속 미스되는 것 방지, directions Edge
 * Function의 좌표해시 캐시 키와 동일한 반올림 정밀도).
 *
 * 스택: TanStack Query(확정). 새 라이브러리 없음.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDirections, type TravelMode } from '@/services/directionsApi';
import { decodePolyline, type LatLng } from '@/lib/polyline';

const DEBOUNCE_MS = 500;
const MIN_STOPS = 2;

// 좌표를 5자리(≈1m)로 반올림한 안정적 키 — 배열 참조가 매 렌더 바뀌어도 값이 같으면
// 재계산/재요청되지 않게 한다(directions Edge Function의 좌표해시 캐시와 동일 정밀도).
function keyOf(points: LatLng[]): string {
  return points.map((p) => `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`).join('|');
}

export function useDirections(points: LatLng[], mode: TravelMode = 'walking') {
  const pointsKey = useMemo(() => keyOf(points), [points]);
  const [debouncedPoints, setDebouncedPoints] = useState<LatLng[]>(points);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedPoints(points), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey]);

  const coordsKey = useMemo(() => keyOf(debouncedPoints), [debouncedPoints]);
  const enabled = debouncedPoints.length >= MIN_STOPS;

  const query = useQuery({
    queryKey: ['directions', coordsKey, mode],
    queryFn: () =>
      getDirections(
        debouncedPoints.map((p) => ({ lat: p.latitude, lng: p.longitude })),
        mode,
      ),
    enabled,
  });

  const coordinates = useMemo(
    () => (query.data ? decodePolyline(query.data.polyline) : []),
    [query.data],
  );

  return {
    coordinates,
    distanceMeters: query.data?.distanceMeters,
    durationSeconds: query.data?.durationSeconds,
    isLoading: enabled && query.isLoading,
    isError: query.isError,
  };
}
