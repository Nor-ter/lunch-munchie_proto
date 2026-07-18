/**
 * lib/polyline.ts — Google Encoded Polyline Algorithm Format 디코더.
 * 원본: mobile/lib/polyline.ts (web-maps-places-workflow.md Phase 1 이식, 변경 없음).
 *
 * Directions API(및 대부분 Google Maps API)는 경로를 이 인코딩 문자열로 반환한다.
 * 별도 패키지(google-polyline, @mapbox/polyline 등) 없이 공개된 알고리즘을 직접
 * 구현했다 — 새 라이브러리 도입 없음(제약 준수).
 * 참고: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export interface LatLng {
  latitude: number;
  longitude: number;
}

export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
}
