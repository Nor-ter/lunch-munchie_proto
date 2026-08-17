/** Generate a D1 seed from verifiable Drive catalogue records only. */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const data = JSON.parse(readFileSync(resolve(root, "server/data/drive_ingest.json"), "utf8"));
const output = resolve(root, "scripts/seed.sql");
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
writeFileSync(output, `${lines.join("\n")}\n`);
console.log(`Generated ${output}: ${candidates.length}/${data.restaurants.length} verified restaurants.`);
