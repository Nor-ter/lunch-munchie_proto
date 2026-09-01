/** Generate a D1 seed from verifiable Drive catalogue records only. */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const data = JSON.parse(readFileSync(resolve(root, "server/data/drive_ingest.json"), "utf8"));
const output = process.env.LUNCHIE_D1_SEED_OUTPUT
  ? resolve(process.env.LUNCHIE_D1_SEED_OUTPUT)
  : resolve(root, "scripts/seed.sql");
const includeLocalDemos = process.argv.includes("--include-local-demos");
const quote = (value) => value === null || value === undefined ? "NULL" : `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => quote(JSON.stringify(value));
const validCoordinate = (restaurant) => Number.isFinite(restaurant.lat) && Number.isFinite(restaurant.lng) && restaurant.coord_source !== "placeholder";
const rank = { dish: 0, table: 1, storefront: 2, interior: 3, other: 4 };

const photosByRestaurant = new Map();
for (const photo of data.photos) {
  // Source images are an ignored operational cache. Local Pages reads these
  // public paths through MEDIA_ORIGIN, so a fresh clone must never require the
  // 429 original files merely to seed its isolated D1 catalogue.
  if (!photo.url?.startsWith("/photos/")) continue;
  const photos = photosByRestaurant.get(photo.restaurant_id) ?? [];
  photos.push(photo.url);
  photosByRestaurant.set(photo.restaurant_id, photos);
}
for (const [id, photos] of photosByRestaurant) {
  const metadata = data.photos.filter((photo) => photo.restaurant_id === id && photos.includes(photo.url));
  metadata.sort((a, b) => (rank[a.kind ?? "other"] ?? 9) - (rank[b.kind ?? "other"] ?? 9) || (b.quality ?? 0) - (a.quality ?? 0));
  photosByRestaurant.set(id, metadata.map((photo) => photo.url));
}

const menusByRestaurant = new Map();
for (const menu of data.menu_items) {
  const menus = menusByRestaurant.get(menu.restaurant_id) ?? [];
  menus.push(menu);
  menusByRestaurant.set(menu.restaurant_id, menus);
}
const featuresByRestaurant = new Map(
  (data.features ?? [])
    .filter((feature) => feature?.restaurant_id)
    .map((feature) => [feature.restaurant_id, feature]),
);
const priceLevel = (menus) => {
  const prices = menus.map((menu) => menu.price).filter((price) => typeof price === "number" && price > 0).sort((a, b) => a - b);
  if (!prices.length) return 2;
  const median = prices[Math.floor(prices.length / 2)];
  return median <= 15 ? 1 : median <= 30 ? 2 : median <= 50 ? 3 : 4;
};
const demoCourseCreatedAt = Date.UTC(2026, 7, 30, 9, 0, 0);
const demoCourseSpecs = [
  {
    id: "local_demo_feed_dodam",
    title: "DODAM에서 제대로 한식 한 상",
    description: "따뜻한 만두와 푸짐한 한 접시. 브런즈윅에서 편하게 즐긴 한식 기록이에요.",
    restaurantIds: ["drv_e0f56a7a445b"],
    photoCounts: [3],
    duration: 75,
  },
  {
    id: "local_demo_feed_pasta_cafe",
    title: "파스타 다음엔 커피",
    description: "ALT Pasta에서 식사하고 Time After Time으로 이어지는 도심 코스.",
    restaurantIds: ["osm_node_12189425008", "osm_node_13523348331"],
    photoCounts: [1, 2],
    duration: 140,
  },
  {
    id: "local_demo_feed_market_dessert",
    title: "야시장부터 카키고리까지",
    description: "Queen Victoria Night Market의 활기와 시원한 디저트를 한 번에 담았어요.",
    restaurantIds: ["drv_23d957b609b1", "osm_node_1282403408"],
    photoCounts: [2, 1],
    duration: 165,
  },
  {
    id: "local_demo_feed_tonkatsu",
    title: "오늘은 바삭한 돈카츠",
    description: "Ton & Co에서 고른 점심 메뉴. 음식 사진 중심으로 빠르게 확인해 보세요.",
    restaurantIds: ["drv_62183f88307f"],
    photoCounts: [2],
    duration: 60,
  },
  {
    id: "local_demo_feed_pizza_dessert",
    title: "피자와 디저트로 채운 오후",
    description: "Leonardo's Pizza Palace에서 시작해 Brunetti Classico로 마무리한 코스예요.",
    restaurantIds: ["osm_node_676533299", "drv_601ccdf0764f"],
    photoCounts: [2, 1],
    duration: 150,
  },
  {
    id: "local_demo_feed_brunswick_cafes",
    title: "브런즈윅 카페 산책",
    description: "CATALOGUE와 Good Measure를 연결한 가벼운 카페 코스. 코스맵과 장소 정보를 함께 볼 수 있어요.",
    restaurantIds: ["drv_0f86e92497c5", "drv_4bf1bb8a34ed"],
    photoCounts: [1, 2],
    duration: 125,
  },
];
const mediaPlacements = [
  { x: 50, y: 32, width: 92, height: 48, rotation: -1.5 },
  { x: 34, y: 73, width: 58, height: 38, rotation: -3 },
  { x: 70, y: 73, width: 54, height: 36, rotation: 3 },
];
const idCounts = new Map();
for (const restaurant of data.restaurants) idCounts.set(restaurant.id, (idCounts.get(restaurant.id) ?? 0) + 1);
const candidates = data.restaurants.filter((restaurant) =>
  idCounts.get(restaurant.id) === 1 && validCoordinate(restaurant) && (photosByRestaurant.get(restaurant.id)?.length ?? 0) > 0,
);
const lines = [
  "-- Generated from server/data/drive_ingest.json. Do not hand edit.",
  "-- Images resolve through MEDIA_ORIGIN; local source-photo cache is not required.",
];
for (const restaurant of candidates) {
  const menus = menusByRestaurant.get(restaurant.id) ?? [];
  const dietary = [...new Set(menus.flatMap((menu) => menu.dietary ?? []))];
  lines.push(`INSERT OR REPLACE INTO restaurants (id, name, category, address, latitude, longitude, menus, dietary_options, price_level, photos, short_description) VALUES (${quote(restaurant.id)}, ${quote(restaurant.name)}, ${quote(restaurant.category ?? restaurant.cuisine_guess ?? "기타")}, ${quote(restaurant.resolved_address ?? "")}, ${restaurant.lat}, ${restaurant.lng}, ${json(menus)}, ${json(dietary)}, ${priceLevel(menus)}, ${json(photosByRestaurant.get(restaurant.id))}, NULL);`);
  // Keep a first-class index for every image that is already present in the
  // canonical Drive manifest.  Fresh local D1 databases therefore receive the
  // evidence-backed kind/tags/quality values rather than only the migration's
  // intentionally conservative `unclassified` fallback.
  const cataloguePhotos = data.photos
    .filter((photo) => photo.restaurant_id === restaurant.id && photo.url?.startsWith("/photos/"))
    .sort((a, b) => (rank[a.kind ?? "other"] ?? 9) - (rank[b.kind ?? "other"] ?? 9) || (b.quality ?? 0) - (a.quality ?? 0));
  for (const photo of cataloguePhotos) {
    lines.push(`INSERT OR REPLACE INTO restaurant_photos (id, restaurant_id, r2_key, drive_file_id, kind, dishes, vibe_tags, quality, source, created_at, has_person, perceptual_hash) VALUES (${quote(photo.id)}, ${quote(restaurant.id)}, ${quote(photo.url.slice("/photos/".length))}, ${quote(photo.drive_file_id ?? null)}, ${quote(photo.kind ?? "unclassified")}, ${json(photo.dishes ?? [])}, ${json(photo.vibe_tags ?? [])}, ${typeof photo.quality === "number" ? photo.quality : "NULL"}, ${quote(photo.source ?? "drive")}, 0, ${photo.has_person === true ? 1 : 0}, ${quote(photo.perceptual_hash ?? null)});`);
  }
  // Keep the same source facts in the queryable menu index.  `menus` above is
  // intentionally retained as the original catalogue snapshot, while this
  // index supports aggregation and future menu-aware filtering without JSON
  // scans.  Signature/dietary values are never inferred during seeding.
  for (const menu of menus) {
    if (!menu.name?.trim() || !(menu.normalized_name ?? menu.name)?.trim()) continue;
    lines.push(`INSERT OR REPLACE INTO restaurant_menu_items (id, restaurant_id, name, normalized_name, price, currency, category, description, dietary, source, confidence, is_signature, extracted_at) VALUES (${quote(menu.id ?? `${restaurant.id}:${menu.normalized_name}`)}, ${quote(restaurant.id)}, ${quote(menu.name.trim())}, ${quote((menu.normalized_name ?? menu.name).trim().toLowerCase())}, ${typeof menu.price === "number" ? menu.price : "NULL"}, ${quote(menu.currency ?? "AUD")}, ${quote(menu.category ?? null)}, ${quote(menu.description ?? null)}, ${json(menu.dietary ?? [])}, ${quote(menu.source ?? "catalogue-seed")}, ${typeof menu.confidence === "number" ? menu.confidence : "NULL"}, 0, 0);`);
  }
  const feature = featuresByRestaurant.get(restaurant.id);
  if (feature?.taste) {
    lines.push(`INSERT OR REPLACE INTO restaurant_features (restaurant_id, taste, price_stats, signature_dishes, vibe_tags, photo_kinds, evidence, feature_version, updated_at) VALUES (${quote(restaurant.id)}, ${json(feature.taste)}, ${json(feature.price_stats ?? null)}, ${json(feature.signature_dishes ?? [])}, ${json(feature.vibe_tags ?? [])}, ${json(feature.photo_kinds ?? {})}, ${json(feature.evidence ?? {})}, ${quote(feature.feature_version ?? "v1-photo")}, 0);`);
  }
}
// Local demo posts deliberately reuse the verified catalogue rather than
// copying production users' uploads or restoring the ignored source-photo
// cache. They still pass through the canonical feed schema, so list/detail
// views exercise the same course, stop, media, and attribution contracts.
let generatedDemoCourses = 0;
if (includeLocalDemos) {
  const restaurantById = new Map(candidates.map((restaurant) => [restaurant.id, restaurant]));
  lines.push(`INSERT OR REPLACE INTO users (id, username, profile_image_url, bio, location, dietary_preferences, created_at, handle) VALUES ('team', 'Lunchie Demo', NULL, '검증된 카탈로그로 만든 로컬 데모 계정', 'Melbourne', '[]', ${demoCourseCreatedAt}, 'lunchie_demo');`);
  for (const [courseIndex, spec] of demoCourseSpecs.entries()) {
    const stops = spec.restaurantIds.map((restaurantId) => restaurantById.get(restaurantId));
    if (stops.some((restaurant) => !restaurant)) continue;
    const selectedPhotos = spec.restaurantIds.flatMap((restaurantId, stopIndex) =>
      (photosByRestaurant.get(restaurantId) ?? [])
        .slice(0, spec.photoCounts[stopIndex] ?? 1)
        .map((path) => ({ path, restaurantId })),
    ).slice(0, 3);
    if (selectedPhotos.length === 0) continue;
    const createdAt = demoCourseCreatedAt - courseIndex * 3_600_000;
    const categories = [...new Set(stops.map((restaurant) => restaurant.category ?? restaurant.cuisine_guess ?? "기타"))];
    const tags = stops.map((restaurant) => restaurant.name);
    const decor = selectedPhotos.map(({ path }, mediaIndex) => {
      const placement = mediaPlacements[mediaIndex] ?? mediaPlacements[0];
      return { src: path, x: placement.x, y: placement.y, w: placement.width, h: placement.height, rotate: placement.rotation };
    });
    lines.push(`INSERT OR REPLACE INTO courses (id, author_id, title, description, hero_image, category, region, tags, hashtags, total_distance, total_duration, likes_count, saves_count, comments_count, is_public, created_at, feed_photos, feed_decor, template_id, feed_story) VALUES (${quote(spec.id)}, 'team', ${quote(spec.title)}, ${quote(spec.description)}, ${quote(selectedPhotos[0].path)}, ${quote(categories[0] ?? "맛집")}, 'Melbourne', ${json(tags)}, ${json(categories)}, 0, ${spec.duration}, ${courseIndex % 3}, ${courseIndex % 2}, 0, 1, ${createdAt}, ${json(selectedPhotos.map((photo) => photo.path))}, ${json(decor)}, 'story-overlay', '[]');`);
    for (const [stopIndex, restaurant] of stops.entries()) {
      lines.push(`INSERT OR REPLACE INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES (${quote(`${spec.id}:stop:${stopIndex}`)}, ${quote(spec.id)}, ${quote(restaurant.id)}, ${stopIndex}, NULL, NULL, 0, ${createdAt});`);
    }
    for (const [mediaIndex, photo] of selectedPhotos.entries()) {
      const placement = mediaPlacements[mediaIndex] ?? mediaPlacements[0];
      lines.push(`INSERT OR REPLACE INTO course_media (id, course_id, r2_path, placement_index, x, y, width, height, rotation, created_at, owner_id, media_source) VALUES (${quote(`${spec.id}:media:${mediaIndex}`)}, ${quote(spec.id)}, ${quote(photo.path)}, ${mediaIndex}, ${placement.x}, ${placement.y}, ${placement.width}, ${placement.height}, ${placement.rotation}, ${createdAt}, 'team', 'legacy_import');`);
      lines.push(`INSERT OR REPLACE INTO course_photo_attributions (id, course_id, r2_path, restaurant_id, classification, attribution_source, created_at) VALUES (${quote(`${spec.id}:attribution:${mediaIndex}`)}, ${quote(spec.id)}, ${quote(photo.path)}, ${quote(photo.restaurantId)}, 'restaurant', 'other', ${createdAt});`);
    }
    generatedDemoCourses += 1;
  }
}
writeFileSync(output, `${lines.join("\n")}\n`);
console.log(`Generated ${output}: ${candidates.length}/${data.restaurants.length} verified restaurants and ${generatedDemoCourses} local demo courses.`);
