import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const PHOTOS_DIR = path.resolve(process.cwd(), "server/data/photos");
const WRANGLER_CLI = path.resolve(
  process.cwd(),
  "node_modules/wrangler/bin/wrangler.js",
);
const local = process.argv.includes("--local");
// Wrangler reads the binding-to-bucket mapping from wrangler.toml in both
// local Pages development and production.
const BUCKET_NAME = "lunchie-photos";

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      if (/\.(jpg|jpeg|png|webp)$/i.test(file)) {
        arrayOfFiles.push(fullPath);
      }
    }
  }
  return arrayOfFiles;
}

export async function runUpload() {
  const files = getAllFiles(PHOTOS_DIR);
  console.log(
    `[R2 Sync] Found ${files.length} images to upload to ${local ? "local" : "remote"} R2.`,
  );

  let successCount = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const r2Key =
      "photos/" + path.relative(PHOTOS_DIR, file).replace(/\\/g, "/");
    try {
      console.log(`[${i + 1}/${files.length}] Uploading ${r2Key}...`);
      // Use the current Node runtime rather than `npx`: the workstation's default
      // Node can be older than Wrangler's supported version.
      execSync(
        `"${process.execPath}" "${WRANGLER_CLI}" r2 object put "${BUCKET_NAME}/${r2Key}" --file "${file}"${local ? " --local" : ""}`,
        { stdio: "pipe" },
      );
      successCount++;
    } catch (e: any) {
      console.error(`Failed to upload ${r2Key}: ${e.message}`);
    }
  }
  console.log(
    `[R2 Sync Complete] Uploaded ${successCount}/${files.length} images.`,
  );
}

if (process.argv[1] && process.argv[1].endsWith("uploadPhotosR2.ts")) {
  runUpload();
}
