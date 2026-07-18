import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const manifest = JSON.parse(readFileSync(resolve(root, "automation/web-follow-login/manifest.json"), "utf8"));
const artifactDir = resolve(root, ".artifacts/web-follow-login");
const statePath = resolve(artifactDir, "state.json");
const lockPath = resolve(artifactDir, "lock.json");

function readState() {
  if (!existsSync(statePath)) return { version: 1, evidence: {} };
  try { return JSON.parse(readFileSync(statePath, "utf8")); } catch { return { version: 1, evidence: {} }; }
}

function writeState(state) {
  mkdirSync(artifactDir, { recursive: true });
  const tmp = `${statePath}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`);
  renameSync(tmp, statePath);
}

function fingerprint(phase) {
  const hash = createHash("sha256");
  for (const file of phase.files) {
    const path = resolve(root, file);
    hash.update(file);
    hash.update(existsSync(path) ? readFileSync(path) : "<missing>");
  }
  return hash.digest("hex").slice(0, 16);
}

function structural(phase) {
  const missing = phase.files.filter((file) => !existsSync(resolve(root, file)));
  if (phase.id === 0) {
    const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    for (const dep of ["@supabase/supabase-js", "@tanstack/react-query"]) {
      if (!pkg.dependencies?.[dep]) missing.push(`dependency:${dep}`);
    }
    const example = readFileSync(resolve(root, ".env.example"), "utf8");
    for (const key of ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]) {
      if (!new RegExp(`^${key}=`, "m").test(example)) missing.push(`env-example:${key}`);
    }
    const envPath = resolve(root, ".env");
    const env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
    for (const key of ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]) {
      if (!new RegExp(`^${key}=.+`, "m").test(env)) missing.push(`runtime-env:${key}`);
    }
  }
  return [...new Set(missing)];
}

function assess(phase, state) {
  const missing = structural(phase);
  const fp = fingerprint(phase);
  const evidence = state.evidence?.[phase.id] ?? {};
  const staleOrMissing = phase.evidence.filter((kind) => evidence[kind]?.status !== "pass" || evidence[kind]?.fingerprint !== fp);
  return { phase, fingerprint: fp, missing, staleOrMissing, passed: missing.length === 0 && staleOrMissing.length === 0 };
}

function printStatus() {
  const state = readState();
  const results = manifest.phases.map((phase) => assess(phase, state));
  for (const result of results) {
    const status = result.passed ? "PASS" : result.missing.length ? "INCOMPLETE" : "NEEDS_EVIDENCE";
    console.log(`P${result.phase.id} ${status} ${result.phase.name}`);
    if (result.missing.length) console.log(`  missing: ${result.missing.join(", ")}`);
    if (result.staleOrMissing.length) console.log(`  evidence: ${result.staleOrMissing.join(", ")}`);
  }
  const next = results.find((result) => !result.passed);
  console.log(next ? `NEXT_PHASE=${next.phase.id}` : "ALL_DONE");
}

function withLock(fn) {
  mkdirSync(artifactDir, { recursive: true });
  if (existsSync(lockPath)) throw new Error(`harness lock exists: ${lockPath}`);
  writeFileSync(lockPath, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
  try { fn(); } finally { rmSync(lockPath, { force: true }); }
}

function verify(id) {
  const phase = manifest.phases.find((item) => item.id === id);
  if (!phase) throw new Error(`unknown phase: ${id}`);
  withLock(() => {
    const missing = structural(phase);
    if (missing.length) {
      console.error(`P${id} structural checks failed: ${missing.join(", ")}`);
      process.exitCode = 1;
      return;
    }
    execFileSync("pnpm", ["run", "check"], { cwd: root, stdio: "inherit" });
    if (id === 4) {
      execFileSync("pnpm", ["run", "test"], { cwd: root, stdio: "inherit" });
      execFileSync("pnpm", ["run", "build"], { cwd: root, stdio: "inherit" });
      execFileSync("pnpm", ["run", "test:e2e:web-follow"], { cwd: root, stdio: "inherit" });
    }
    console.log(`P${id} automated checks PASS; record fresh evidence for: ${phase.evidence.join(", ")}`);
  });
}

function evidence(id, kind, status, note = "") {
  const phase = manifest.phases.find((item) => item.id === id);
  if (!phase || !phase.evidence.includes(kind)) throw new Error(`invalid evidence P${id}/${kind}`);
  if (!['pass', 'blocked', 'fail'].includes(status)) throw new Error("status must be pass|blocked|fail");
  const state = readState();
  state.evidence[id] ??= {};
  state.evidence[id][kind] = { status, note, fingerprint: fingerprint(phase), recordedAt: new Date().toISOString() };
  writeState(state);
  console.log(`recorded P${id}/${kind}=${status}`);
}

const [command = "status", arg1, arg2, ...rest] = process.argv.slice(2);
try {
  if (command === "status" || command === "next") printStatus();
  else if (command === "verify") verify(Number(arg1));
  else if (command === "evidence") evidence(Number(arg1), arg2, rest.shift(), rest.join(" "));
  else throw new Error("usage: run.mjs status | verify <phase> | evidence <phase> <kind> <pass|blocked|fail> [note]");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
