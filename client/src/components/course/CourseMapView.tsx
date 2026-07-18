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
  const hasGeo =
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
  const { coordinates: routeCoordinates, distanceMeters, isError } = useDirections(
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

  // 도보 거리 배지 — 실제 경로가 도착했을 때만. 실패 시 직선 폴백임을 알린다.
  const distanceLabel =
    distanceMeters != null
      ? `도보 약 ${Math.round(distanceMeters / 100) / 10}km`
      : isError && points.length >= 2
        ? '직선 표시 중'
        : null;

  return (
    <div className={className} style={{ position: 'relative', width, height, borderRadius: 12, overflow: 'hidden' }}>
      <GoogleCourseMap points={points} width="100%" height={height} routeCoordinates={routeCoordinates} />
      {distanceLabel && (
        <span
          className="absolute left-2 top-2 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-white"
          style={{ pointerEvents: 'none' }}
        >
          {distanceLabel}
        </span>
      )}
    </div>
  );
}
