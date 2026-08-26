const MELBOURNE_CENTER = { lat: -37.8136, lng: 144.9631 };
const DEFAULT_BIAS_RADIUS_METERS = 5_000;
const DETAILS_TTL_MS = 30 * 24 * 60 * 60 * 1_000;

/** Places Autocomplete (New)는 primary type을 최대 5개까지 받을 수 있다. */
export const FOOD_AUTOCOMPLETE_PRIMARY_TYPES = [
  'restaurant',
  'cafe',
  'bakery',
  'bar',
  'market',
] as const;

const FOOD_PLACE_TYPES = new Set<string>([
  ...FOOD_AUTOCOMPLETE_PRIMARY_TYPES,
  'food', 'meal_delivery', 'meal_takeaway', 'coffee_shop', 'coffee_stand',
  'tea_house', 'juice_shop', 'ice_cream_shop', 'dessert_shop', 'donut_shop',
  'candy_store', 'confectionery', 'chocolate_shop', 'cake_shop', 'deli', 'diner',
  'food_court', 'sandwich_shop', 'pizza_restaurant', 'fast_food_restaurant',
  'steak_house', 'seafood_restaurant', 'sushi_restaurant', 'brunch_restaurant',
  'breakfast_restaurant', 'fine_dining_restaurant', 'buffet_restaurant',
  'wine_bar', 'cocktail_bar', 'pub', 'brewery', 'brewpub', 'gastropub',
  'cat_cafe', 'dog_cafe', 'farmers_market', 'flea_market',
]);

export function isFoodPlaceTypes(types: string[] | undefined) {
  return Boolean(types?.some(type => (
    FOOD_PLACE_TYPES.has(type)
    || type.endsWith('_restaurant')
    || type.endsWith('_cafe')
    || type.includes('food')
  )));
}

function assertFoodPlaceTypes(types: string[] | undefined) {
  if (isFoodPlaceTypes(types)) return;
  throw new GooglePlacesProxyError(
    'not_food_place',
    '음식점·카페·마켓 같은 먹거리 장소만 코스에 담을 수 있어요.',
    400,
  );
}

function categoryFromTypes(types: string[]) {
  const set = new Set(types);
  if (set.has('market') || set.has('farmers_market') || set.has('flea_market')) return '마켓';
  if (set.has('cafe') || set.has('coffee_shop') || set.has('tea_house') || set.has('cat_cafe') || set.has('dog_cafe')) return '카페';
  if (set.has('bakery') || set.has('cake_shop') || set.has('donut_shop') || set.has('dessert_shop')) return '베이커리';
  if (set.has('bar') || set.has('wine_bar') || set.has('cocktail_bar') || set.has('pub') || set.has('brewery') || set.has('brewpub') || set.has('gastropub')) return '바';
  if (set.has('meal_takeaway') || set.has('meal_delivery') || set.has('food_court')) return '테이크아웃';
  return '맛집';
}

export interface GooglePlacesEnv {
  DB: any;
  GOOGLE_MAPS_SERVER_API_KEY?: string;
  PHOTOS_R2?: {
    put: (key: string, value: ArrayBuffer | Uint8Array, options?: { httpMetadata?: { contentType?: string } }) => Promise<unknown>;
  };
}

export class GooglePlacesProxyError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

function requireString(body: Record<string, unknown>, key: string, maxLength: number) {
  const value = body[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new GooglePlacesProxyError('invalid_request', `${key} 는 필수 문자열입니다.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new GooglePlacesProxyError('invalid_request', `${key} 가 너무 깁니다.`);
  }
  return trimmed;
}

function optionalString(body: Record<string, unknown>, key: string, maxLength: number) {
  const value = body[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new GooglePlacesProxyError('invalid_request', `${key} 는 문자열이어야 합니다.`);
  }
  return value;
}

function serverKey(env: GooglePlacesEnv) {
  const key = env.GOOGLE_MAPS_SERVER_API_KEY?.trim();
  if (!key) {
    throw new GooglePlacesProxyError(
      'config_error',
      'Google 장소 검색 서버 설정이 필요합니다.',
      500,
    );
  }
  return key;
}

function locationBias(value: unknown) {
  const bias = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const lat = typeof bias.lat === 'number' && Number.isFinite(bias.lat)
    ? bias.lat
    : MELBOURNE_CENTER.lat;
  const lng = typeof bias.lng === 'number' && Number.isFinite(bias.lng)
    ? bias.lng
    : MELBOURNE_CENTER.lng;
  const radius = typeof bias.radiusMeters === 'number' && Number.isFinite(bias.radiusMeters)
    ? Math.min(50_000, Math.max(100, bias.radiusMeters))
    : DEFAULT_BIAS_RADIUS_METERS;
  return { circle: { center: { latitude: lat, longitude: lng }, radius } };
}

async function googleJson(response: Response, label: string) {
  const payload = await response.json<Record<string, unknown>>().catch(() => null);
  if (!response.ok || !payload) {
    const providerMessage = (payload as { error?: { message?: string } } | null)?.error?.message;
    console.error(`[google-places] ${label}:`, providerMessage ?? `HTTP ${response.status}`);
    throw new GooglePlacesProxyError(
      'google_api_error',
      'Google 장소 서비스를 불러오지 못했어요.',
      502,
    );
  }
  return payload;
}

export async function autocompleteGooglePlaces(
  env: GooglePlacesEnv,
  body: Record<string, unknown>,
  fetcher: typeof fetch = fetch,
) {
  const input = requireString(body, 'input', 200);
  const sessionToken = requireString(body, 'sessionToken', 100);
  const response = await fetcher('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': serverKey(env),
      'X-Goog-FieldMask': [
        'suggestions.placePrediction.placeId',
        'suggestions.placePrediction.text',
      ].join(','),
    },
    body: JSON.stringify({
      input,
      sessionToken,
      includedPrimaryTypes: [...FOOD_AUTOCOMPLETE_PRIMARY_TYPES],
      locationBias: locationBias(body.bias),
    }),
  });
  const google = await googleJson(response, 'autocomplete');
  const raw = Array.isArray(google.suggestions) ? google.suggestions : [];
  const suggestions = raw.flatMap((suggestion) => {
    const prediction = (suggestion as { placePrediction?: Record<string, unknown> }).placePrediction;
    const text = prediction?.text as { text?: unknown } | undefined;
    const placeId = typeof prediction?.placeId === 'string' ? prediction.placeId : '';
    return placeId ? [{ placeId, text: typeof text?.text === 'string' ? text.text : '' }] : [];
  });
  return { suggestions, sessionToken };
}

/** Feed 반경 기준점 검색용 일반 장소 자동완성. 코스 음식점 검색과 타입 제한을 공유하지 않는다. */
export async function autocompleteGoogleLocations(
  env: GooglePlacesEnv,
  body: Record<string, unknown>,
  fetcher: typeof fetch = fetch,
) {
  const input = requireString(body, 'input', 200);
  const sessionToken = requireString(body, 'sessionToken', 100);
  const response = await fetcher('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': serverKey(env),
      'X-Goog-FieldMask': [
        'suggestions.placePrediction.placeId',
        'suggestions.placePrediction.text',
      ].join(','),
    },
    body: JSON.stringify({
      input,
      sessionToken,
      includedRegionCodes: ['au'],
      locationBias: locationBias(body.bias),
    }),
  });
  const google = await googleJson(response, 'location-autocomplete');
  const raw = Array.isArray(google.suggestions) ? google.suggestions : [];
  const suggestions = raw.flatMap((suggestion) => {
    const prediction = (suggestion as { placePrediction?: Record<string, unknown> }).placePrediction;
    const text = prediction?.text as { text?: unknown } | undefined;
    const placeId = typeof prediction?.placeId === 'string' ? prediction.placeId : '';
    return placeId ? [{ placeId, text: typeof text?.text === 'string' ? text.text : '' }] : [];
  });
  return { suggestions, sessionToken };
}

export async function getGoogleLocationDetails(
  env: GooglePlacesEnv,
  body: Record<string, unknown>,
  fetcher: typeof fetch = fetch,
) {
  const placeId = requireString(body, 'placeId', 200);
  const sessionToken = optionalString(body, 'sessionToken', 100);
  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  if (sessionToken) url.searchParams.set('sessionToken', sessionToken);
  const response = await fetcher(url, {
    headers: {
      'X-Goog-Api-Key': serverKey(env),
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
    },
  });
  const google = await googleJson(response, 'location-details');
  const location = google.location as { latitude?: unknown; longitude?: unknown } | undefined;
  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new GooglePlacesProxyError('location_missing', '선택한 장소의 위치를 찾지 못했어요.', 502);
  }
  const displayName = google.displayName as { text?: unknown } | undefined;
  return {
    location: {
      placeId: typeof google.id === 'string' ? google.id : placeId,
      name: typeof displayName?.text === 'string' ? displayName.text : '',
      address: typeof google.formattedAddress === 'string' ? google.formattedAddress : '',
      latitude,
      longitude,
    },
  };
}

type RestaurantRow = {
  id: string;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  review_count: number;
  price_level: number;
  short_description: string | null;
  tags: string;
  dietary_options: string;
  photos: string;
  menus: string;
  phone_number: string | null;
  business_hours: string | null;
  google_place_id: string | null;
  synced_at: number | null;
  source: string;
  place_types: string;
};

function parseArray(value: string | null | undefined) {
  try {
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function storedRestaurantPhotoUrls(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.startsWith('/photos/'));
  }
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.startsWith('/photos/'))
      : [];
  } catch {
    return [];
  }
}

export function googlePlacePhotosSynced(value: unknown): boolean {
  if (storedRestaurantPhotoUrls(value).length > 0) return true;
  const marker = (candidate: unknown) => Boolean(
    candidate
    && typeof candidate === 'object'
    && !Array.isArray(candidate)
    && (candidate as { googleCached?: unknown }).googleCached === true,
  );
  if (marker(value)) return true;
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    return marker(JSON.parse(value));
  } catch {
    return false;
  }
}

function photosColumnValue(urls: string[], attempted: boolean): string {
  if (urls.length > 0) return JSON.stringify(urls);
  return attempted ? JSON.stringify({ googleCached: true }) : '[]';
}

function googlePhotoResourceNames(payload: Record<string, unknown>): string[] {
  const photos = Array.isArray(payload.photos) ? payload.photos : [];
  const names: string[] = [];
  for (const photo of photos) {
    if (!photo || typeof photo !== 'object') continue;
    const name = (photo as { name?: unknown }).name;
    if (typeof name !== 'string' || !name.includes('/photos/')) continue;
    names.push(name);
    if (names.length >= 4) break;
  }
  return names;
}

async function hashPhotoBytes(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (part) => part.toString(16).padStart(2, '0')).join('');
}

async function cacheGooglePlacePhotos(
  env: GooglePlacesEnv,
  photoNames: string[],
  fetcher: typeof fetch,
): Promise<string[]> {
  const bucket = env.PHOTOS_R2;
  const apiKey = env.GOOGLE_MAPS_SERVER_API_KEY?.trim();
  if (!bucket || !apiKey || photoNames.length === 0) return [];

  const stored: string[] = [];
  for (const photoName of photoNames) {
    try {
      const mediaUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&skipHttpRedirect=true`;
      const mediaResponse = await fetcher(mediaUrl, {
        headers: { 'X-Goog-Api-Key': apiKey },
      });
      if (!mediaResponse.ok) continue;

      const contentType = mediaResponse.headers.get('content-type') || '';
      let bytes: ArrayBuffer;
      let type = 'image/jpeg';
      if (contentType.includes('application/json')) {
        const payload = (await mediaResponse.json()) as { photoUri?: unknown };
        const photoUri = typeof payload.photoUri === 'string' ? payload.photoUri : undefined;
        if (!photoUri) continue;
        const imageResponse = await fetcher(photoUri);
        if (!imageResponse.ok) continue;
        type = imageResponse.headers.get('content-type') || 'image/jpeg';
        bytes = await imageResponse.arrayBuffer();
      } else {
        type = contentType.startsWith('image/') ? contentType : 'image/jpeg';
        bytes = await mediaResponse.arrayBuffer();
      }
      if (!bytes.byteLength) continue;

      const hash = await hashPhotoBytes(bytes);
      const key = `photos/google/${hash}.jpg`;
      await bucket.put(key, bytes, { httpMetadata: { contentType: type } });
      stored.push(`/${key}`);
    } catch {
      continue;
    }
  }
  return stored;
}

function clientRestaurant(row: RestaurantRow) {
  return {
    ...row,
    tags: parseArray(row.tags),
    dietary_options: parseArray(row.dietary_options),
    photos: parseArray(row.photos),
    menu_items: parseArray(row.menus),
    place_types: parseArray(row.place_types),
    synced_at: row.synced_at ? new Date(row.synced_at).toISOString() : null,
    source: row.source === 'google' ? 'google' : 'seed',
  };
}

const RESTAURANT_SELECT = `SELECT id, name, category, address, latitude, longitude,
  rating, review_count, price_level, short_description, tags, dietary_options,
  photos, menus, phone_number, business_hours, google_place_id, synced_at, source, place_types
  FROM restaurants WHERE google_place_id = ?`;

const PRICE_LEVELS: Record<string, number> = {
  PRICE_LEVEL_FREE: 1,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

export async function getGooglePlaceDetails(
  env: GooglePlacesEnv,
  body: Record<string, unknown>,
  fetcher: typeof fetch = fetch,
) {
  const placeId = requireString(body, 'placeId', 200);
  const sessionToken = optionalString(body, 'sessionToken', 100);
  const cached = await env.DB.prepare(RESTAURANT_SELECT).bind(placeId).first<RestaurantRow>();
  const cachedTypes = cached ? parseArray(cached.place_types).filter((value): value is string => typeof value === 'string') : [];
  // Text metadata can be fresh while photos were never requested. Treat those
  // rows as stale so the next details lookup can fetch and cache images once.
  if (
    cached?.synced_at
    && Date.now() - cached.synced_at < DETAILS_TTL_MS
    && isFoodPlaceTypes(cachedTypes)
    && googlePlacePhotosSynced(cached.photos)
  ) {
    return { restaurant: clientRestaurant(cached), fromCache: true };
  }

  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  if (sessionToken) url.searchParams.set('sessionToken', sessionToken);
  const response = await fetcher(url, {
    headers: {
      'X-Goog-Api-Key': serverKey(env),
      'X-Goog-FieldMask': [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'rating',
        'userRatingCount',
        'priceLevel',
        'types',
        'primaryTypeDisplayName',
        'editorialSummary',
        'internationalPhoneNumber',
        'regularOpeningHours.weekdayDescriptions',
        'photos',
      ].join(','),
    },
  });
  const google = await googleJson(response, 'place-details');
  const id = typeof google.id === 'string' ? google.id : placeId;
  const displayName = google.displayName as { text?: unknown } | undefined;
  const types = Array.isArray(google.types)
    ? google.types.filter((value): value is string => typeof value === 'string')
    : [];
  assertFoodPlaceTypes(types);
  const summary = google.editorialSummary as { text?: unknown } | undefined;
  const location = google.location as { latitude?: unknown; longitude?: unknown } | undefined;
  const openingHours = google.regularOpeningHours as { weekdayDescriptions?: unknown } | undefined;
  const photoNames = googlePhotoResourceNames(google);
  const photos = await cacheGooglePlacePhotos(env, photoNames, fetcher);
  const attemptedPhotoSync = photoNames.length === 0 || Boolean(env.PHOTOS_R2);
  const syncedAt = Date.now();

  await env.DB.prepare(`INSERT INTO restaurants (
      id, name, category, address, latitude, longitude, rating, review_count,
      price_level, short_description, phone_number, business_hours, photos,
      google_place_id, synced_at, source, place_types
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'google', ?)
    ON CONFLICT(google_place_id) DO UPDATE SET
      name = excluded.name, category = excluded.category, address = excluded.address,
      latitude = excluded.latitude, longitude = excluded.longitude, rating = excluded.rating,
      review_count = excluded.review_count, price_level = excluded.price_level,
      short_description = excluded.short_description, phone_number = excluded.phone_number,
      business_hours = excluded.business_hours,
      photos = CASE
        WHEN excluded.photos GLOB '[*' AND excluded.photos != '[]' THEN excluded.photos
        WHEN restaurants.photos GLOB '[*' AND restaurants.photos != '[]' THEN restaurants.photos
        ELSE excluded.photos
      END,
      synced_at = excluded.synced_at,
      source = 'google', place_types = excluded.place_types`)
    .bind(
      `google_${id}`,
      typeof displayName?.text === 'string' ? displayName.text : '이름 없음',
      categoryFromTypes(types),
      typeof google.formattedAddress === 'string' ? google.formattedAddress : '',
      typeof location?.latitude === 'number' ? location.latitude : 0,
      typeof location?.longitude === 'number' ? location.longitude : 0,
      typeof google.rating === 'number' ? google.rating : 0,
      typeof google.userRatingCount === 'number' ? google.userRatingCount : 0,
      typeof google.priceLevel === 'string' ? PRICE_LEVELS[google.priceLevel] ?? 2 : 2,
      typeof summary?.text === 'string' ? summary.text : null,
      typeof google.internationalPhoneNumber === 'string' ? google.internationalPhoneNumber : null,
      Array.isArray(openingHours?.weekdayDescriptions)
        ? openingHours.weekdayDescriptions.filter(value => typeof value === 'string').join('\n')
        : null,
      photosColumnValue(photos, attemptedPhotoSync),
      id,
      syncedAt,
      JSON.stringify(types),
    )
    .run();

  const row = await env.DB.prepare(RESTAURANT_SELECT).bind(id).first<RestaurantRow>();
  if (!row) {
    throw new GooglePlacesProxyError('db_error', '식당 정보를 저장하지 못했어요.', 500);
  }
  return { restaurant: clientRestaurant(row), fromCache: false };
}

type DirectionsPoint = { lat: number; lng: number };

function directionsPoints(value: unknown): DirectionsPoint[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(point => {
    if (!point || typeof point !== 'object') return [];
    const lat = Number((point as Record<string, unknown>).lat);
    const lng = Number((point as Record<string, unknown>).lng);
    return Number.isFinite(lat) && Number.isFinite(lng)
      && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
      ? [{ lat, lng }]
      : [];
  });
}

export async function getGoogleDirections(
  env: GooglePlacesEnv,
  body: Record<string, unknown>,
  fetcher: typeof fetch = fetch,
) {
  const coordinates = directionsPoints(body.coordinates);
  if (coordinates.length < 2 || coordinates.length > 10) {
    throw new GooglePlacesProxyError('invalid_request', '경로는 장소 2~10곳이 필요해요.', 400);
  }
  const allowedModes = new Set(['walking', 'driving', 'bicycling', 'transit']);
  const mode = typeof body.mode === 'string' && allowedModes.has(body.mode) ? body.mode : 'walking';
  const origin = coordinates[0];
  const destination = coordinates[coordinates.length - 1];
  const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
  url.searchParams.set('origin', `${origin.lat},${origin.lng}`);
  url.searchParams.set('destination', `${destination.lat},${destination.lng}`);
  url.searchParams.set('mode', mode);
  url.searchParams.set('key', serverKey(env));
  const waypoints = coordinates.slice(1, -1).map(point => `${point.lat},${point.lng}`).join('|');
  if (waypoints) url.searchParams.set('waypoints', waypoints);

  const response = await fetcher(url);
  const google = await googleJson(response, 'directions');
  const status = typeof google.status === 'string' ? google.status : '';
  if (status !== 'OK') {
    throw new GooglePlacesProxyError(
      status ? status.toLowerCase() : 'directions_error',
      typeof google.error_message === 'string' ? google.error_message : '경로를 가져오지 못했어요.',
      502,
    );
  }
  const route = Array.isArray(google.routes) ? google.routes[0] as {
    overview_polyline?: { points?: unknown };
    legs?: Array<{ distance?: { value?: unknown }; duration?: { value?: unknown } }>;
  } | undefined : undefined;
  const polyline = typeof route?.overview_polyline?.points === 'string' ? route.overview_polyline.points : '';
  if (!polyline) {
    throw new GooglePlacesProxyError('directions_empty', '경로 폴리라인이 비어 있어요.', 502);
  }
  return {
    polyline,
    distanceMeters: (route?.legs ?? []).reduce((sum, leg) => sum + Number(leg.distance?.value ?? 0), 0),
    durationSeconds: (route?.legs ?? []).reduce((sum, leg) => sum + Number(leg.duration?.value ?? 0), 0),
  };
}

export function googlePlacesErrorResponse(error: unknown) {
  if (error instanceof GooglePlacesProxyError) {
    return Response.json({ code: error.code, message: error.message }, { status: error.status });
  }
  console.error('[google-places] unexpected error:', error);
  return Response.json(
    { code: 'internal_error', message: '장소 검색 중 오류가 발생했어요.' },
    { status: 500 },
  );
}
