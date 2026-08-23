import { isValidCoordinate, isWithinRadius } from '../../shared/geo';

export interface FeedLocationFilter {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

type QueryReader = (name: string) => string | undefined;

/** 위치 파라미터가 하나라도 있으면 세 값 모두를 엄격히 검증한다. */
export function parseFeedLocationFilter(query: QueryReader): FeedLocationFilter | null {
  const rawLatitude = query('latitude');
  const rawLongitude = query('longitude');
  const rawRadius = query('radiusKm');
  if (rawLatitude === undefined && rawLongitude === undefined && rawRadius === undefined) return null;

  const latitude = Number(rawLatitude);
  const longitude = Number(rawLongitude);
  const radiusKm = Number(rawRadius);
  if (!isValidCoordinate(latitude, longitude) || !Number.isFinite(radiusKm) || radiusKm < 1 || radiusKm > 50) {
    throw new Error('위치와 반경은 유효한 좌표 및 1~50km 값이어야 합니다.');
  }
  return { latitude, longitude, radiusKm };
}

export function feedItemMatchesLocation(
  item: { stops?: Array<{
    latitude?: unknown;
    longitude?: unknown;
    restaurant?: { latitude?: unknown; longitude?: unknown };
  }> },
  filter: FeedLocationFilter,
) {
  return Boolean(item.stops?.some(stop => isWithinRadius(
    filter.latitude,
    filter.longitude,
    stop.latitude ?? stop.restaurant?.latitude,
    stop.longitude ?? stop.restaurant?.longitude,
    filter.radiusKm * 1_000,
  )));
}
