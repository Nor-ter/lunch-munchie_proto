import { useMemo } from 'react';
import { CoursePlace } from '@/types/course';
import { CourseMap as GoogleCourseMap, type MapPoint } from '@/components/map/CourseMap';
import { CourseMap as SvgCourseMap } from '@/components/course/CourseMap';
import { useDirections } from '@/hooks/useDirections';

interface Props {
  places: CoursePlace[];
  width: number;
  height: number;
  className?: string;
}

/**
 * 코스 지도 — mobile app/course/[id]/edit.tsx의 지도 동작을 웹에 포팅.
 *   · pinning  : 각 place를 순번 마커로 지도에 핀(components/map/CourseMap의 AdvancedMarker).
 *   · connect  : useDirections(순서 좌표) → directions Edge Function 실제 도보 경로.
 *   · drawing  : 그 경로를 폴리라인으로 그린다(도착 전엔 마커 직선으로 폴백).
 * 연결된 Restaurant에 실 위경도가 있을 때만 Google 지도를 쓰고, 없으면(순수 mock 폴백
 * 코스) 기존 추상 그리드 SVG로 폴백한다.
 */
export function CourseMapView({ places, width, height, className }: Props) {
  // 키가 없으면 MapProvider가 APIProvider 없이 children만 렌더하므로,
  // GoogleCourseMap을 그리면 앱이 죽는다 — 이때도 SVG 폴백을 쓴다.
  const hasMapsKey = !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const hasGeo =
    hasMapsKey &&
    places.length > 0 &&
    places.every((p) => typeof p.latitude === 'number' && typeof p.longitude === 'number');

  // 훅은 조건부 호출 불가 — 항상 부르고, geo가 없으면 빈 배열로 비활성(MIN_STOPS 미달).
  const routePoints = useMemo(
    () =>
      hasGeo
        ? places.map((p) => ({ latitude: p.latitude as number, longitude: p.longitude as number }))
        : [],
    [hasGeo, places],
  );
  const { coordinates: routeCoordinates } = useDirections(
    routePoints,
    'walking',
  );

  if (!hasGeo) {
    return <SvgCourseMap places={places} width={width} height={height} className={className} />;
  }

  const points: MapPoint[] = places.map((p) => ({
    id: p.id,
    name: p.name,
    latitude: p.latitude!,
    longitude: p.longitude!,
    subtitle: p.address ?? p.category,
  }));

  return (
    <div className={className} style={{ position: 'relative', width, maxWidth: '100%', height, borderRadius: 12, overflow: 'hidden' }}>
      <GoogleCourseMap points={points} width="100%" height={height} routeCoordinates={routeCoordinates} />
    </div>
  );
}
