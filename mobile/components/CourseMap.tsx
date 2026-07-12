/**
 * CourseMap
 *
 * 코스 지도 뷰 — react-native-maps + Google Maps(PROVIDER_GOOGLE).
 * 마커(번호) + 순서대로 잇는 폴리라인. 입력은 프로토타입 타입과 분리된 범용 MapPoint.
 *
 * Provider 정책:
 *   - Android            → 항상 Google Maps (Expo Go 포함, 키 불필요).
 *   - iOS + 네이티브 빌드 → Google Maps (app.config.ts 의 googleMapsApiKey 필요).
 *   - iOS + Expo Go      → 구글 SDK가 없어 빈 지도가 되므로 Apple Maps(PROVIDER_DEFAULT)로 폴백.
 *
 * 스택: react-native-maps(확정), expo-constants(설치됨). 새 라이브러리 없음.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
  type Region,
} from 'react-native-maps';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { THEME } from '@/constants/theme';

/** 지도에 찍을 최소 마커 단위 (course_items ⨝ restaurants 에서 매핑) */
export interface MapPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  subtitle?: string;
}

interface Props {
  points: MapPoint[];
  width: number;
  height: number;
  onPressPoint?: (point: MapPoint) => void;
  /**
   * Phase 5: Directions(실제 도보 경로) 좌표. 있으면 이걸로 폴리라인을 그리고,
   * 없으면(로딩 중/실패/미도입 화면) 기존처럼 마커를 순서대로 잇는 직선을 그린다
   * — 화면 진입 즉시 straight-line 프리뷰가 보이고, 경로가 도착하면 실제 경로로 바뀐다.
   */
  routeCoordinates?: { latitude: number; longitude: number }[];
}

// iOS Expo Go 에서 구글맵이 빈 화면이 되는 문제를 피하려 provider 를 가른다.
const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const MAP_PROVIDER =
  Platform.OS === 'ios' && IS_EXPO_GO ? PROVIDER_DEFAULT : PROVIDER_GOOGLE;

// 장소가 없거나 1곳일 때의 기본 시야 (Melbourne — 워크플로우 §4.5)
const FALLBACK_REGION: Region = {
  latitude: -37.8136,
  longitude: 144.9631,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const EDGE_PADDING = { top: 48, right: 48, bottom: 48, left: 48 };

function regionForPoints(points: MapPoint[]): Region {
  if (points.length === 0) return FALLBACK_REGION;
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.01),
    longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.01),
  };
}

export function CourseMap({ points, width, height, onPressPoint, routeCoordinates }: Props) {
  const mapRef = useRef<MapView>(null);

  const coords = useMemo(
    () => points.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
    [points],
  );

  // 실제 경로가 있으면 그걸, 없으면 마커 순서를 잇는 직선(폴백/즉시 프리뷰)을 그린다.
  const polylineCoords =
    routeCoordinates && routeCoordinates.length >= 2 ? routeCoordinates : coords;

  const initialRegion = useMemo(() => regionForPoints(points), []); // 최초 1회

  // Android 마커 flicker/배터리 이슈 완화: 첫 렌더 뒤 tracksViewChanges 끔.
  const [tracksChanges, setTracksChanges] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setTracksChanges(false), 600);
    return () => clearTimeout(t);
  }, [points.length]);

  // 포인트가 바뀌면 전체가 보이도록 카메라 fit.
  useEffect(() => {
    if (coords.length === 0) return;
    const t = setTimeout(() => {
      if (coords.length === 1) {
        mapRef.current?.animateToRegion(
          { ...coords[0], latitudeDelta: 0.01, longitudeDelta: 0.01 },
          300,
        );
      } else {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: EDGE_PADDING,
          animated: true,
        });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [coords]);

  return (
    <View style={{ width, height }}>
      <MapView
        ref={mapRef}
        provider={MAP_PROVIDER}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        loadingEnabled
        loadingIndicatorColor={THEME.coral}
      >
        {polylineCoords.length >= 2 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor={THEME.coral}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {points.map((point, idx) => (
          <Marker
            key={point.id}
            coordinate={{ latitude: point.latitude, longitude: point.longitude }}
            title={point.name}
            description={point.subtitle}
            tracksViewChanges={tracksChanges}
            onPress={() => onPressPoint?.(point)}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.pin}>
              <Text style={styles.pinText}>{idx + 1}</Text>
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.coral,
    borderWidth: 2,
    borderColor: THEME.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
      },
      android: { elevation: 3 },
    }),
  },
  pinText: { color: THEME.white, fontSize: 13, fontWeight: '700' },
});
