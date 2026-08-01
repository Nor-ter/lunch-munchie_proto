/**
 * components/map/CourseMap.tsx — 코스 지도 (Google Maps JS, web-maps-places-workflow.md Phase 2).
 * 대응 원본: mobile/components/CourseMap.tsx (react-native-maps) — 웹 재작성(@vis.gl/react-google-maps).
 *
 * 마커(순번 핀) + 경로 폴리라인. routeCoordinates(useDirections 결과)가 있으면 실제 도보
 * 경로를, 없으면 마커를 순서대로 잇는 직선을 그린다(모바일과 동일 폴백 전략 — 화면 진입
 * 즉시 직선 프리뷰가 보이고 경로가 도착하면 실제 경로로 바뀐다).
 *
 * AdvancedMarker는 Map ID가 있어야 벡터 렌더링된다 — Google이 제공하는 공개 데모 ID
 * `DEMO_MAP_ID`를 사용(별도 Cloud Console 스타일 설정 없이 바로 동작, 테스트/프로토타입용
 * 공식 지원 값). 카메라 fit은 CourseMap이 아니라 <Map> 내부의 useMap() 훅에서 처리
 * (@vis.gl/react-google-maps는 <Map>의 자식만 지도 컨텍스트에 접근 가능).
 *
 * 스택: @vis.gl/react-google-maps(Phase 0 승인·설치됨). 새 라이브러리 없음.
 */
import { useEffect, useMemo } from 'react';
import { Map, AdvancedMarker, Polyline, useMap } from '@vis.gl/react-google-maps';
import { BRAND } from '@/constants/brand';
import { getCourseSequenceColor } from '@/constants/courseTheme';

/** 지도에 찍을 최소 마커 단위 (course_items ⨝ restaurants 대응) */
export interface MapPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  subtitle?: string;
}

interface Props {
  points: MapPoint[];
  width: number | string;
  height: number | string;
  onPressPoint?: (point: MapPoint) => void;
  selectedPointId?: string | null;
  /** Directions(실제 도보 경로) 좌표. 없으면 마커를 잇는 직선으로 폴백. */
  routeCoordinates?: { latitude: number; longitude: number }[];
}

// 장소가 없을 때의 기본 시야 (Melbourne — Places 검증에서 쓴 것과 동일 기준점)
const FALLBACK_CENTER = { lat: -37.8136, lng: 144.9631 };
const FIT_PADDING_PX = 72;

/** <Map> 자식으로 마운트 — points가 바뀔 때마다 카메라를 전체가 보이게 fit한다. */
function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.panTo({ lat: points[0].latitude, lng: points[0].longitude });
      map.setZoom(15);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend({ lat: p.latitude, lng: p.longitude }));
    map.fitBounds(bounds, FIT_PADDING_PX);
  }, [map, points]);

  return null;
}

export function CourseMap({ points, width, height, onPressPoint, selectedPointId, routeCoordinates }: Props) {
  const path = useMemo(() => {
    const coords =
      routeCoordinates && routeCoordinates.length >= 2
        ? routeCoordinates
        : points.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
    return coords.map((c) => ({ lat: c.latitude, lng: c.longitude }));
  }, [points, routeCoordinates]);

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden' }}>
      <Map
        mapId="DEMO_MAP_ID"
        defaultCenter={FALLBACK_CENTER}
        defaultZoom={13}
        gestureHandling="greedy"
        disableDefaultUI
        style={{ width: '100%', height: '100%' }}
      >
        <FitBounds points={points} />

        {path.length >= 2 && (
          <Polyline path={path} strokeColor={BRAND.primary} strokeWeight={4} strokeOpacity={0.9} />
        )}

        {points.map((point, idx) => {
          const selected = selectedPointId === point.id;
          const size = selected ? 38 : 28;
          const color = getCourseSequenceColor(idx).base;

          return (
            <AdvancedMarker
              key={point.id}
              position={{ lat: point.latitude, lng: point.longitude }}
              title={point.subtitle ? `${point.name} · ${point.subtitle}` : point.name}
              onClick={() => onPressPoint?.(point)}
              zIndex={selected ? 10 : 1}
            >
              <div
                aria-label={`${point.name}${selected ? ', 선택됨' : ''}`}
                data-selected={selected ? 'true' : 'false'}
                style={{
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  background: color,
                  border: selected ? '4px solid white' : '2px solid white',
                  color: 'white',
                  fontSize: selected ? 15 : 13,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: selected
                    ? `0 0 0 7px ${color}33, 0 5px 14px rgba(66, 35, 26, 0.35)`
                    : '0 1px 2px rgba(0,0,0,0.25)',
                  transform: selected ? 'translateY(-3px)' : undefined,
                  transition: 'width 160ms ease, height 160ms ease, transform 160ms ease, box-shadow 160ms ease',
                }}
              >
                {idx + 1}
              </div>
            </AdvancedMarker>
          );
        })}
      </Map>
    </div>
  );
}
