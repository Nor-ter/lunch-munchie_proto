// 메뉴/사진 로더 — menus.json(extractMenu 결과)의 items·image를
// restaurants.menu_items·photos에 반영.
// 기본: UPDATE SQL 파일 생성(D1 마이그레이션 검토용, 방화벽 안전).
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

interface MenuRow { id: string; name?: string; items?: { name: string; price: number | null; image?: string; dietary?: string[]; category?: string; description?: string }[]; image?: string }
interface Update { id: string; menu_items?: { name: string; price: number | null; image?: string; dietary?: string[]; category?: string; description?: string }[]; photos?: string[] }

async function main() {
  const rows: MenuRow[] = JSON.parse(readFileSync(inPath, "utf8"));
  const updates: Update[] = rows
    .filter((r) => r.id && ((r.items && r.items.length > 0) || r.image))
    .map((r) => ({
      id: r.id,
      ...(r.items && r.items.length > 0 ? { menu_items: r.items } : {}),
      ...(r.image ? { photos: [r.image] } : {}),
    }));
  const dishes = updates.reduce((n, u) => n + (u.menu_items?.length ?? 0), 0);
  const withImage = updates.filter((u) => u.photos).length;
  console.log(`${inPath}: ${rows.length}건 중 반영 대상 ${updates.length}곳 (메뉴 ${updates.filter((u) => u.menu_items).length}곳·${dishes}개 요리 · 사진 ${withImage}곳)`);
  if (!updates.length) { console.log("반영할 것 없음 (extractMenu를 NVIDIA_API_KEY와 함께 먼저 실행)."); return; }

  if (useDb) {
    // DB 직접 업데이트 (도달 가능 환경에서만 — 방화벽 로컬에선 매달릴 수 있음)
    const { db } = await import("./db.js");
    const { restaurants } = await import("../shared/schema.js");
    const { eq } = await import("drizzle-orm");
    let ok = 0;
    for (const u of updates) {
      const { id, ...set } = u;
      await db.update(restaurants).set(set).where(eq(restaurants.id, id));
      ok++;
    }
    console.log(`✅ DB 직접 업데이트 완료: ${ok}곳`);
    return;
  }

  // 기본: UPDATE SQL 생성 (컬럼별로 있는 것만 SET)
  const esc = (s: string) => s.replace(/'/g, "''");
  const sql = [
    `-- 메뉴·사진 반영 (${updates.length}곳, 메뉴 ${dishes}개 요리 · 사진 ${withImage}곳) — D1 마이그레이션으로 적용`,
    ...updates.map((u) => {
      const sets = [
        u.menu_items ? `menu_items = '${esc(JSON.stringify(u.menu_items))}'::jsonb` : null,
        u.photos ? `photos = '${esc(JSON.stringify(u.photos))}'::jsonb` : null,
      ].filter(Boolean);
      return `UPDATE restaurants SET ${sets.join(", ")} WHERE id = '${esc(u.id)}';`;
    }),
    "",
  ].join("\n");
  const outPath = join(here, "data", "menu_updates.sql");
  writeFileSync(outPath, sql);
  console.log(`✅ SQL ${updates.length}건 → ${outPath}\n   (D1 마이그레이션으로 검토·적용)`);
}

main().catch((e) => { console.error("실패:", e.message); process.exit(1); });
