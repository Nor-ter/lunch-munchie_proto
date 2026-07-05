// 메뉴 로더 — menus.json(extractMenu 결과)의 items를 restaurants.menu_items에 반영.
// 기본: UPDATE SQL 파일 생성(Supabase SQL Editor용, 방화벽 안전).
// --db 옵션: DB 직접 업데이트(도달 가능한 환경, 예: 배포).
// 사용:  npx tsx server/loadMenus.ts [menus.json경로] [--db]
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const useDb = args.includes("--db");
const inPath = args.find((a) => !a.startsWith("--")) || join(here, "data", "menus.json");

interface MenuRow { id: string; name?: string; items?: { name: string; price: number | null }[] }

async function main() {
  const rows: MenuRow[] = JSON.parse(readFileSync(inPath, "utf8"));
  const withItems = rows.filter((r) => r.id && r.items && r.items.length > 0);
  const dishes = withItems.reduce((n, r) => n + (r.items?.length ?? 0), 0);
  console.log(`${inPath}: ${rows.length}건 중 메뉴 있는 ${withItems.length}곳 · 총 ${dishes}개 요리`);
  if (!withItems.length) { console.log("반영할 메뉴 없음 (extractMenu를 ANTHROPIC_API_KEY와 함께 먼저 실행)."); return; }

  if (useDb) {
    // DB 직접 업데이트 (도달 가능 환경에서만 — 방화벽 로컬에선 매달릴 수 있음)
    const { db } = await import("./db.js");
    const { restaurants } = await import("../shared/schema.js");
    const { eq } = await import("drizzle-orm");
    let ok = 0;
    for (const r of withItems) {
      await db.update(restaurants).set({ menu_items: r.items! }).where(eq(restaurants.id, r.id));
      ok++;
    }
    console.log(`✅ DB 직접 업데이트 완료: ${ok}곳`);
    return;
  }

  // 기본: UPDATE SQL 생성
  const esc = (s: string) => s.replace(/'/g, "''");
  const sql = [
    `-- 메뉴 반영 (${withItems.length}곳, ${dishes}개 요리) — Supabase SQL Editor에 붙여넣고 Run`,
    ...withItems.map(
      (r) => `UPDATE restaurants SET menu_items = '${esc(JSON.stringify(r.items))}'::jsonb WHERE id = '${esc(r.id)}';`,
    ),
    "",
  ].join("\n");
  const outPath = join(here, "data", "menu_updates.sql");
  writeFileSync(outPath, sql);
  console.log(`✅ SQL ${withItems.length}건 → ${outPath}\n   (Supabase SQL Editor에 붙여넣기 · DB 직접은 --db 옵션)`);
}

main().catch((e) => { console.error("실패:", e.message); process.exit(1); });
