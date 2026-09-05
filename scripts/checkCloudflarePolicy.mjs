#!/usr/bin/env node
/**
 * Prevent new Cloudflare capabilities from quietly entering the repository.
 *
 * The policy is deliberately allowlist based. Deployment automation is kept in
 * one workflow; any new remote Wrangler command must first be reviewed by
 * updating docs/process/ci-cd-cloudflare-access-policy.md and this checker.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const root = process.cwd();
const staged = process.argv.includes("--staged");
const selfTest = process.argv.includes("--self-test");

const APPROVED_WRANGLER_PATHS = new Set([
  ".github/workflows/deploy-cloudflare.yml",
  ".github/workflows/deploy-demo-canva.yml",
  "package.json",
  "scripts/configureGoogleAuthSecrets.mjs",
  "scripts/uploadPhotosR2.ts",
  "scripts/checkCloudflarePolicy.mjs",
]);
const APPROVED_SECRET_NAMES = new Set([
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_WORKER_DEPLOY_TOKEN",
  "CLOUDFLARE_D1_MIGRATIONS_TOKEN",
  "VITE_GOOGLE_MAPS_API_KEY",
  "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
  "GOOGLE_MAPS_SERVER_API_KEY",
]);
const DOC_PATH = "docs/process/ci-cd-cloudflare-access-policy.md";

function git(args, encoding = "utf8") {
  return execFileSync("git", args, { cwd: root, encoding });
}

function filesToCheck() {
  const raw = staged
    ? git(["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"], "buffer")
    : git(["ls-files", "-z"], "buffer");
  return raw.toString("utf8").split("\0").filter(Boolean);
}

function readContent(file) {
  try {
    return staged
      ? git(["show", `:${file}`])
      : readFileSync(`${root}/${file}`, "utf8");
  } catch {
    return "";
  }
}

function isDocumentation(file) {
  return file === "README.md" || file.startsWith("docs/") || file.endsWith(".md");
}

function hasLiteralSecret(content) {
  const assignment = /^\s*(?:CLOUDFLARE_[A-Z0-9_]*(?:TOKEN|SECRET)|AUTH_SESSION_SECRET|GOOGLE_CLIENT_SECRET)\s*=\s*([^\n#]+)/gm;
  const yamlLiteral = /^\s*(?:CLOUDFLARE_[A-Z0-9_]*(?:TOKEN|SECRET)|AUTH_SESSION_SECRET|GOOGLE_CLIENT_SECRET)\s*:\s*(["'][^"']+["'])\s*$/gm;
  for (const match of [...content.matchAll(assignment), ...content.matchAll(yamlLiteral)]) {
    const value = match[1].trim();
    if (
      value &&
      !/^\$\{\{\s*secrets\.[A-Z0-9_]+\s*\}\}$/.test(value) &&
      !/^(?:"|')?(?:\.{3}|<[^>]+>|REPLACE|YOUR_|your_)/.test(value)
    ) {
      return true;
    }
  }
  return false;
}

function validateCloudflareConfig(file, content, errors) {
  const checkToml = (pattern, allowed, label) => {
    for (const match of content.matchAll(pattern)) {
      if (match[1] !== allowed) {
        errors.push(`${file}: ${label} '${match[1]}'은 Lunchie Munchie allowlist에 없습니다.`);
      }
    }
  };

  if (file === "wrangler.toml") {
    checkToml(/^\s*database_name\s*=\s*"([^"]+)"/gm, "lunchie-db", "D1 database");
    checkToml(/^\s*bucket_name\s*=\s*"([^"]+)"/gm, "lunchie-photos", "R2 bucket");
    checkToml(/^\s*script_name\s*=\s*"([^"]+)"/gm, "lunchie-munchie-state", "Durable Object script");
  }
  if (file === "wrangler.state.toml") {
    checkToml(/^\s*name\s*=\s*"([^"]+)"/gm, "lunchie-munchie-state", "Worker name");
  }
}

export function validateFile(file, content) {
  const errors = [];

  if (
    (/^(?:\.env|\.dev\.vars)(?:\.|$)/.test(file) || /(?:^|\/)\.dev\.vars(?:\.|$)/.test(file)) &&
    !file.endsWith(".example")
  ) {
    errors.push(`${file}: local/production environment file은 커밋할 수 없습니다.`);
  }
  if (!isDocumentation(file) && hasLiteralSecret(content)) {
    errors.push(`${file}: Cloudflare 또는 OAuth 비밀값의 리터럴 값이 감지됐습니다.`);
  }
  if (
    /^(?:client\/src|server|functions|migrations)\//.test(file) &&
    /\bsupabase\b/i.test(content)
  ) {
    errors.push(`${file}: retired Supabase runtime must not be reintroduced; use Cloudflare Pages/D1 APIs.`);
  }
  if (
    !isDocumentation(file) &&
    /\bwrangler\s+(?:pages|d1|r2|deploy)\b/.test(content) &&
    !APPROVED_WRANGLER_PATHS.has(file)
  ) {
    errors.push(`${file}: 새 Wrangler 사용은 허용되지 않습니다. 승인된 CI/운영 도구에만 둘 수 있습니다.`);
  }

  validateCloudflareConfig(file, content, errors);

  if (file === ".github/workflows/deploy-cloudflare.yml") {
    const required = [
      "wrangler d1 migrations apply lunchie-db --remote",
      "wrangler deploy --config wrangler.state.toml",
      "wrangler pages secret put GOOGLE_MAPS_SERVER_API_KEY --project-name=lunchie-munchie",
      "wrangler pages deploy dist/public --project-name=lunchie-munchie --branch=main --commit-dirty",
    ];
    for (const command of required) {
      if (!content.includes(command)) {
        errors.push(`${file}: 승인된 배포 명령이 변경·누락됐습니다: ${command}`);
      }
    }
    if (/\bwrangler\s+r2\b/.test(content) || /\bwrangler\s+d1\s+execute\b/.test(content)) {
      errors.push(`${file}: CI는 R2 작업이나 임의 D1 SQL을 실행할 수 없습니다.`);
    }
    for (const secret of content.matchAll(/secrets\.([A-Z0-9_]+)/g)) {
      if (!APPROVED_SECRET_NAMES.has(secret[1])) {
        errors.push(`${file}: 승인되지 않은 Cloudflare Actions secret '${secret[1]}'입니다.`);
      }
    }
  }

  if (file === ".github/workflows/deploy-demo-canva.yml") {
    const required = [
      "branches: [demo-canva]",
      "wrangler pages deploy dist/public",
      "--project-name=lunchie-munchie-demo-canva",
      "--branch=demo-canva",
    ];
    for (const command of required) {
      if (!content.includes(command)) {
        errors.push(`${file}: 승인된 데모 배포 설정이 변경·누락됐습니다: ${command}`);
      }
    }
    if (/\bwrangler\s+(?:d1|r2|deploy)\b/.test(content) || /pages\s+secret\s+(?:put|delete|bulk)\b/.test(content)) {
      errors.push(`${file}: 데모 CI는 Pages 정적/Functions 배포 외 Cloudflare 리소스를 변경할 수 없습니다.`);
    }
    for (const secret of content.matchAll(/secrets\.([A-Z0-9_]+)/g)) {
      if (!APPROVED_SECRET_NAMES.has(secret[1])) {
        errors.push(`${file}: 승인되지 않은 Cloudflare Actions secret '${secret[1]}'입니다.`);
      }
    }
  }

  if (file === "package.json") {
    const allowedCommands = [
      "wrangler deploy --config wrangler.state.toml",
      "wrangler d1 migrations apply lunchie-db --remote",
      "wrangler d1 migrations apply lunchie-db --local",
      "wrangler d1 execute lunchie-db --local",
      "wrangler pages deploy dist/public --project-name=lunchie-munchie",
      "wrangler pages dev dist/public --port 8788",
    ];
    for (const command of content.match(/wrangler\s+(?:deploy|pages|d1)[^"\\]*?(?=")/g) ?? []) {
      if (!allowedCommands.some((allowed) => command.includes(allowed))) {
        errors.push(`${file}: 승인되지 않은 Wrangler 명령 '${command}'입니다.`);
      }
    }
  }

  return errors;
}

function runSelfTest() {
  const forbiddenDeploy = validateFile(
    "scripts/newDeploy.mjs",
    "await execa('wrangler pages deploy dist/public --project-name=another-project');",
  );
  const foreignBucket = validateFile(
    "wrangler.toml",
    '[r2_buckets]\nbucket_name = "someone-elses-photos"',
  );
  const literalToken = validateFile(
    ".dev.vars",
    'CLOUDFLARE_API_TOKEN="not-a-real-token"',
  );
  if (!forbiddenDeploy.length || !foreignBucket.length || !literalToken.length) {
    throw new Error("Cloudflare policy self-test failed: an abuse case was not blocked.");
  }
  console.log("[cloudflare-policy] Self-test passed.");
}

if (selfTest) {
  runSelfTest();
  process.exit(0);
}

const errors = [];
for (const file of filesToCheck()) {
  errors.push(...validateFile(file, readContent(file)));
}

if (errors.length) {
  console.error("\n[cloudflare-policy] 커밋/검사를 차단했습니다:");
  for (const error of errors) console.error(`  - ${error}`);
  console.error(`\n허용 범위는 ${DOC_PATH}를 확인하세요.`);
  process.exit(1);
}

console.log(`[cloudflare-policy] ${staged ? "Staged changes" : "Repository"} comply with Lunchie Munchie allowlist.`);
