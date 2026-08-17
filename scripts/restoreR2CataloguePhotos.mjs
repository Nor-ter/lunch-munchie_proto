#!/usr/bin/env node
/**
 * Restore only the catalogue images referenced by the production D1 database.
 *
 * The original image stays in Google Drive.  Each image is fetched at a
 * presentation-sized resolution and streamed directly to R2: no catalogue is
 * written to the developer's disk.  This is an operations/recovery command,
 * not part of local development or CI.
 *
 * Requires an authenticated Wrangler session with access to lunchie-db and
 * lunchie-photos:
 *   node scripts/restoreR2CataloguePhotos.mjs --remote
 */
import { spawn, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const REMOTE = process.argv.includes("--remote");
const CONFIRM = process.argv.includes("--confirm");
const WRANGLER = process.platform === "win32" ? "wrangler.cmd" : "wrangler";

if (!REMOTE || !CONFIRM) {
  console.error("Refusing to modify R2. Run: node scripts/restoreR2CataloguePhotos.mjs --remote --confirm");
  process.exit(1);
}

function runWrangler(args) {
  const result = spawnSync(WRANGLER, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "Wrangler command failed");
  return result.stdout;
}

function pipeToWrangler(args, body) {
  return new Promise((resolve, reject) => {
    const child = spawn(WRANGLER, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(stderr || `wrangler exited ${code}`)));
    child.stdin.on("error", reject);
    child.stdin.end(body);
  });
}

const raw = runWrangler([
  "d1", "execute", "lunchie-db", "--remote",
  "--command", "SELECT r2_key FROM restaurant_photos",
  "--json",
]);
const expectedKeys = new Set(JSON.parse(raw)[0]?.results?.map((row) => row.r2_key) ?? []);
const dataset = JSON.parse(await readFile(new URL("../server/data/drive_ingest.json", import.meta.url), "utf8"));
const photos = dataset.photos
  .filter((photo) => photo.drive_file_id && typeof photo.url === "string" && photo.url.startsWith("/photos/"))
  .map((photo) => ({
    key: photo.url.slice("/photos/".length),
    driveFileId: photo.drive_file_id,
  }))
  .filter((photo) => expectedKeys.has(photo.key));

if (photos.length !== expectedKeys.size) {
  const sourced = new Set(photos.map((photo) => photo.key));
  console.warn(`[restore] ${expectedKeys.size - sourced.size} D1 keys have no Drive source in drive_ingest.json and will remain unchanged.`);
}

let restored = 0;
let failed = 0;
for (const [index, photo] of photos.entries()) {
  try {
    // The thumbnail endpoint returns a display-sized JPEG, avoiding original
    // multi-megabyte uploads while keeping the R2 URL and database key stable.
    const response = await fetch(`https://drive.google.com/thumbnail?id=${encodeURIComponent(photo.driveFileId)}&sz=w1600`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.startsWith("image/") || bytes.length < 1024) {
      throw new Error(`Google Drive returned ${response.status} (${contentType || "unknown"})`);
    }
    await pipeToWrangler([
      "r2", "object", "put", `lunchie-photos/photos/${photo.key}`,
      "--remote", "--pipe", "--content-type", contentType.split(";")[0],
      "--cache-control", "public, max-age=604800, immutable",
    ], bytes);
    restored++;
    console.log(`[${index + 1}/${photos.length}] restored ${photo.key}`);
  } catch (error) {
    failed++;
    console.error(`[${index + 1}/${photos.length}] failed ${photo.key}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(`[restore] complete: ${restored} restored, ${failed} failed, ${expectedKeys.size} D1 references.`);
process.exitCode = failed === 0 ? 0 : 1;
