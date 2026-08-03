/**
 * services/directionsApi.ts — Cloudflare directions API 호출 래퍼 (순수 함수)
 * 원본: mobile/services/directionsApi.ts (web-maps-places-workflow.md Phase 1 이식, 변경 없음).
 */
import { invokeEdgeFunction } from '@/services/edgeFunctions';

export type TravelMode = 'walking' | 'driving' | 'bicycling' | 'transit';

export interface DirectionsCoord {
  lat: number;
  lng: number;
}

export interface DirectionsResult {
  polyline: string; // 인코딩된 폴리라인 — lib/polyline.ts 의 decodePolyline 으로 디코드
  distanceMeters: number;
  durationSeconds: number;
}

export async function getDirections(
  coordinates: DirectionsCoord[],
  mode: TravelMode = 'walking',
): Promise<DirectionsResult> {
  return invokeEdgeFunction<DirectionsResult>('directions', { coordinates, mode });
}
