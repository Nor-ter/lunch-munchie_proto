/**
 * Upload direct Google OAuth credentials as Cloudflare Pages secrets.
 * Values are entered into Wrangler prompts and are never written to disk,
 * command arguments, or package scripts.
 */
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const node = existsSync("/opt/homebrew/bin/node") ? "/opt/homebrew/bin/node" : process.execPath;
const wrangler = resolve(root, "node_modules/wrangler/bin/wrangler.js");
const project = "lunchie-munchie";

for (const secret of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "AUTH_SESSION_SECRET"]) {
  console.log(`\n${secret} 값을 입력하세요. 입력값은 Cloudflare Pages Secret으로만 저장됩니다.`);
  execFileSync(node, [wrangler, "pages", "secret", "put", secret, "--project-name", project], {
    stdio: "inherit",
  });
}

console.log("\nGoogle OAuth Secrets 업로드가 완료됐습니다.");
