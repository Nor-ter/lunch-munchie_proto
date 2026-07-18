// 메뉴 추출 배치 — melbourne_osm.json의 website 있는 식당들에 extractMenu 실행.
// 사용:  npx tsx server/menu/runBatch.ts [개수]     (기본 10, 키 없으면 dry-run)
// 결과:  server/data/menus.json  ({ id, url, ok, format, items, image }[])
// image(og:image)는 LLM 미사용(메타태그 파싱) — 키 없어도 dryRun에서도 채워짐.
//
// 예의: 요청 사이 딜레이(rate limit). 키 있으면 실제 추출, 없으면 파이프라인만 확인.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractMenu, closeBrowser } from "./extractMenu.js";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const N = Number(process.argv[2]) || 10;
const DELAY_MS = 1500; // 도메인 예의
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Row { id: string; name: string; website: string | null }

async function main() {
  const rows: Row[] = JSON.parse(readFileSync(join(dir, "melbourne_osm.json"), "utf8"));
  const targets = rows.filter((r) => r.website).slice(0, N);
  const dryRun = !process.env.NVIDIA_API_KEY;
  console.log(`대상 ${targets.length}곳 (website 보유) · ${dryRun ? "DRY-RUN (키 없음)" : "실제 추출"} · 모델 ${process.env.MENU_MODEL || "meta/llama-3.3-70b-instruct"}\n`);

  const out: unknown[] = [];
  let okFetch = 0, withMenu = 0, withImage = 0, dishPhotos = 0;
  for (let i = 0; i < targets.length; i++) {
    const r = targets[i];
    const res = await extractMenu(r.website!);
    if (res.ok) okFetch++;
    if (res.items.length) withMenu++;
    if (res.image) withImage++;
    const itemPhotos = res.items.filter((it) => it.image).length;
    dishPhotos += itemPhotos;
    out.push({ id: r.id, name: r.name, url: r.website, ok: res.ok, format: res.format, error: res.error, items: res.items, image: res.image });
    const tag = res.error ? `(${res.error})` : [res.items.length ? `${res.items.length}개 메뉴` : "", itemPhotos ? `📷${itemPhotos}` : "", res.image ? "🖼" : ""].filter(Boolean).join(" ");
    console.log(`  [${i + 1}/${targets.length}] ${res.ok ? "✅" : "❌"} ${res.format ?? "-"}\t${r.name}  ${tag}`);
    if (i < targets.length - 1) await sleep(DELAY_MS);
  }

  const outPath = join(dir, "menus.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\n결과: fetch 성공 ${okFetch}/${targets.length} · 메뉴 추출 ${withMenu} · 대표사진 ${withImage} · 요리사진 ${dishPhotos} → ${outPath}`);
  if (dryRun) console.log("※ DRY-RUN — LLM 미호출. NVIDIA_API_KEY 설정 후 재실행하면 실제 menu_items가 채워집니다.");
}

main().catch((e) => { console.error("실패:", e.message); process.exit(1); }).finally(closeBrowser);
