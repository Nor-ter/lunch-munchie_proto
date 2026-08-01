/** Canonical Drive catalogue audit. `--strict` validates the serveable subset. */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const manifestPath = resolve(root, "server/data/drive_ingest.json");
const strict = process.argv.includes("--strict");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const restaurants = manifest.restaurants ?? [];
const photos = manifest.photos ?? [];
const ids = new Set();
const duplicateIds = [];
for (const restaurant of restaurants) {
  if (!restaurant.id || !restaurant.name) continue;
  if (ids.has(restaurant.id)) duplicateIds.push(restaurant.id);
  ids.add(restaurant.id);
}

const invalidPhotos = [];
const missingAssets = [];
const photoRestaurants = new Set();
for (const photo of photos) {
  if (!photo.id || !photo.restaurant_id || !ids.has(photo.restaurant_id) || !photo.url?.startsWith("/photos/")) {
    invalidPhotos.push(photo.id ?? "(missing id)");
    continue;
  }
  photoRestaurants.add(photo.restaurant_id);
  if (!existsSync(resolve(root, "server/data", `.${photo.url}`))) missingAssets.push(photo.url);
}

const orphanReferences = [...(manifest.menu_items ?? []), ...(manifest.features ?? [])]
  .filter((row) => !row.restaurant_id || !ids.has(row.restaurant_id)).length;
const unresolvedCoordinates = restaurants.filter((restaurant) =>
  !Number.isFinite(restaurant.lat) || !Number.isFinite(restaurant.lng) || restaurant.coord_source === "placeholder",
);
const duplicateIdSet = new Set(duplicateIds);
const servingCandidates = restaurants.filter((restaurant) =>
  restaurant.id && !duplicateIdSet.has(restaurant.id) && photoRestaurants.has(restaurant.id) && Number.isFinite(restaurant.lat) && Number.isFinite(restaurant.lng) && restaurant.coord_source !== "placeholder",
);

console.log(JSON.stringify({
  source: "server/data/drive_ingest.json",
  restaurants: restaurants.length,
  photos: photos.length,
  photoRestaurants: photoRestaurants.size,
  servingCandidates: servingCandidates.length,
  unresolvedCoordinates: unresolvedCoordinates.length,
  quarantined: {
    unresolvedCoordinates: unresolvedCoordinates.length,
    duplicateRestaurantIds: duplicateIds.length,
    photosWithoutServeableUrl: invalidPhotos.length,
    missingLocalAssets: missingAssets.length,
  },
  orphanMenuOrFeatureReferences: orphanReferences,
}, null, 2));
if (unresolvedCoordinates.length) console.warn(`WARN unresolved coordinates: ${unresolvedCoordinates.length}; excluded from distance-based serving.`);
if (duplicateIds.length) console.warn(`WARN duplicate restaurant IDs: ${duplicateIds.length}; conflicting records are excluded from serving.`);
if (invalidPhotos.length || missingAssets.length) console.warn(`WARN unservable photo rows: ${invalidPhotos.length + missingAssets.length}; excluded by the production seed generator.`);
if (orphanReferences || (strict && servingCandidates.length === 0)) process.exitCode = 1;
