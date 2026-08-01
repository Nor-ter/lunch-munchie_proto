/**
 * Resolve only catalogue rows that have no coordinate yet.
 * Default mode writes a review report; `--apply` adds only in-bounds Nominatim
 * matches to the manifest. Existing EXIF/OSM coordinates are never replaced.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const source = resolve(root, "server/data/drive_ingest.json");
const reportPath = resolve(root, "server/data/geocode_review.json");
const apply = process.argv.includes("--apply");
const data = JSON.parse(readFileSync(source, "utf8"));
const targets = data.restaurants.filter((restaurant) =>
  !Number.isFinite(restaurant.lat) || !Number.isFinite(restaurant.lng) || restaurant.coord_source === "placeholder",
);
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
const insideMelbourne = (lat, lng) => lat > -38.6 && lat < -37.2 && lng > 144.3 && lng < 145.6;
const results = [];

for (const [index, restaurant] of targets.entries()) {
  const params = new URLSearchParams({ q: `${restaurant.name}, Melbourne, Victoria, Australia`, format: "jsonv2", limit: "1" });
  let match = null;
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": "lunchie-munchie-catalogue/1.0 (data quality pass)" },
      signal: AbortSignal.timeout(8_000),
    });
    const candidates = await response.json();
    const candidate = candidates[0];
    if (candidate && insideMelbourne(Number(candidate.lat), Number(candidate.lon))) {
      match = { lat: Number(Number(candidate.lat).toFixed(6)), lng: Number(Number(candidate.lon).toFixed(6)), address: candidate.display_name };
      if (apply) Object.assign(restaurant, { lat: match.lat, lng: match.lng, resolved_address: match.address, coord_source: "nominatim_reviewed" });
    }
  } catch (error) {
    match = { error: error instanceof Error ? error.message : "request failed" };
  }
  results.push({ id: restaurant.id, name: restaurant.name, match });
  console.log(`${index + 1}/${targets.length} ${restaurant.name}: ${match ? "match" : "unresolved"}`);
  if (index < targets.length - 1) await sleep(1100);
}

writeFileSync(reportPath, `${JSON.stringify({ generated_at: new Date().toISOString(), apply, results }, null, 2)}\n`);
if (apply) writeFileSync(source, `${JSON.stringify(data, null, 1)}\n`);
console.log(`Wrote ${reportPath}${apply ? " and updated drive_ingest.json" : ""}.`);
