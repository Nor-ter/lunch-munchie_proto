// melbourne_osm.json → SQL INSERT 파일 (D1 시드 검토용)
// 사용: npx tsx server/genSeedSql.ts
// 결과: server/data/melbourne_seed.sql
//   - website 컬럼 없으면 추가(idempotent)
//   - restaurants upsert (ON CONFLICT id DO NOTHING) → 재실행 안전
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "data");

interface Row {
  id: string; name: string; category: string; address: string;
  latitude: number; longitude: number; rating: number; review_count: number;
  price_level: number; short_description: string | null; tags: string[];
  dietary_options: string[]; photos: string[]; menu_items: unknown[];
  phone_number: string | null; business_hours: string | null; website: string | null;
}

const rows: Row[] = JSON.parse(readFileSync(join(dir, "melbourne_osm.json"), "utf8"));

// SQL 리터럴 이스케이프
const q = (v: string | null): string => (v == null ? "NULL" : `'${v.replace(/'/g, "''")}'`);
const jb = (v: unknown): string => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
const num = (v: number): string => String(v);

const COLS = "id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours, website";

function valuesFor(r: Row): string {
  return `(${[
    q(r.id), q(r.name), q(r.category), q(r.address),
    num(r.latitude), num(r.longitude), num(r.rating), num(r.review_count), num(r.price_level),
    q(r.short_description), jb(r.tags), jb(r.dietary_options), jb(r.photos), jb(r.menu_items),
    q(r.phone_number), q(r.business_hours), q(r.website),
  ].join(", ")})`;
}

const BATCH = 500;
const parts: string[] = [
  `-- 멜번 식당/카페 시드 (OSM, ODbL) — © OpenStreetMap contributors`,
  `-- 생성: server/genSeedSql.ts · ${rows.length}곳`,
  `-- D1 로컬 시드 또는 마이그레이션으로 검토 후 적용`,
  ``,
  `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS website text;`,
  ``,
];

for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH);
  parts.push(
    `INSERT INTO restaurants (${COLS}) VALUES`,
    chunk.map(valuesFor).join(",\n"),
    `ON CONFLICT (id) DO NOTHING;`,
    ``,
  );
}

const outPath = join(dir, "melbourne_seed.sql");
writeFileSync(outPath, parts.join("\n"));
const kb = (readFileSync(outPath).length / 1024).toFixed(0);
console.log(`✅ ${rows.length} rows → ${outPath} (${kb}KB, ${Math.ceil(rows.length / BATCH)} batches)`);
console.log(`\n적재: D1 시드/마이그레이션 절차로 파일 내용을 검토 후 적용`);
console.log(`\n미리보기 (앞 20줄):`);
console.log(parts.join("\n").split("\n").slice(0, 20).join("\n"));
