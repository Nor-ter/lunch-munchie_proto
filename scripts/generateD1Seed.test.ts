import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("local D1 feed seed", () => {
  it("creates canonical demo posts without copying production user uploads", () => {
    const directory = mkdtempSync(join(tmpdir(), "lunchie-seed-"));
    temporaryDirectories.push(directory);
    const output = join(directory, "seed.sql");

    execFileSync(process.execPath, [resolve("scripts/generateD1Seed.mjs"), "--include-local-demos"], {
      cwd: process.cwd(),
      env: { ...process.env, LUNCHIE_D1_SEED_OUTPUT: output },
    });

    const sql = readFileSync(output, "utf8");
    const demoCourseInserts = sql.match(
      /INSERT OR REPLACE INTO courses[^\n]+local_demo_feed_/g,
    ) ?? [];

    expect(demoCourseInserts).toHaveLength(6);
    expect(sql).toContain("local_demo_feed_dodam:stop:0");
    expect(sql).toContain("local_demo_feed_pasta_cafe:stop:1");
    expect(sql).toContain("local_demo_feed_brunswick_cafes:media:2");
    expect(sql).toContain("'team', 'legacy_import'");
    expect(sql).toContain("'restaurant', 'other'");
    expect(sql).not.toContain("/photos/uploads/");
  });

  it("keeps demo posts out of the generic catalogue generator", () => {
    const directory = mkdtempSync(join(tmpdir(), "lunchie-seed-"));
    temporaryDirectories.push(directory);
    const output = join(directory, "seed.sql");

    execFileSync(process.execPath, [resolve("scripts/generateD1Seed.mjs")], {
      cwd: process.cwd(),
      env: { ...process.env, LUNCHIE_D1_SEED_OUTPUT: output },
    });

    expect(readFileSync(output, "utf8")).not.toContain("local_demo_feed_");
  });
});
