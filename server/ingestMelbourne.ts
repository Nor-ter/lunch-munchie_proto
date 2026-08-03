// 멜번 식당/카페 인제스트 — OpenStreetMap Overpass API (ODbL, 자유 사용)
// 사용: npx tsx server/ingestMelbourne.ts
// 결과: server/data/melbourne_osm.json (restaurants 스키마 + website/instagram)
//
// Overpass fetch는 HTTP라 로컬에서 동작(방화벽 무관). DB 적재는 방화벽 때문에
// 이 JSON은 D1 시드 또는 마이그레이션으로 적용한다.
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 멜번 CBD 일대 bbox: south, west, north, east (필요시 넓히세요)
const BBOX = [-37.835, 144.940, -37.795, 144.990] as const;
const OVERPASS = "https://overpass-api.de/api/interpreter";

const query = `
[out:json][timeout:120];
(
  nwr["amenity"~"^(restaurant|cafe|fast_food|ice_cream)$"](${BBOX.join(",")});
  nwr["shop"~"^(bakery|pastry|confectionery)$"](${BBOX.join(",")});
);
out center tags;`;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function toCategory(t: Record<string, string>): string {
  if (t.amenity === "cafe") return "Cafe";
  if (t.amenity === "fast_food") return "Fast Food";
  if (t.amenity === "ice_cream") return "Ice Cream";
  if (t.shop === "bakery") return "Bakery";
  if (t.shop === "pastry") return "Pastry";
  if (t.shop === "confectionery") return "Confectionery";
  const c = (t.cuisine || "").split(";")[0].trim();
  if (c) return c.split("_").map(cap).join(" "); // korean → Korean, coffee_shop → Coffee Shop
  return "Restaurant";
}

function toAddress(t: Record<string, string>): string {
  return [t["addr:housenumber"], t["addr:street"], t["addr:suburb"], t["addr:postcode"]]
    .filter(Boolean).join(" ");
}

function toDiet(t: Record<string, string>): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(t)) {
    if (k.startsWith("diet:") && (v === "yes" || v === "only")) out.push(k.slice(5));
  }
  return out;
}

interface OverpassEl {
  type: string; id: number; lat?: number; lon?: number;
  center?: { lat: number; lon: number }; tags?: Record<string, string>;
}

async function main() {
  console.log(`Overpass 요청 (bbox ${BBOX.join(", ")})…`);
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "lunchie-munchie-ingest/0.1 (dev)" },
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { elements: OverpassEl[] };

  const rows = data.elements.flatMap((el) => {
    const t = el.tags ?? {};
    const name = t.name;
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!name || lat == null || lon == null) return []; // 이름·좌표 없으면 스킵
    return [{
      id: `osm_${el.type}_${el.id}`,
      name,
      category: toCategory(t),
      address: toAddress(t) || "",
      latitude: lat,
      longitude: lon,
      rating: 0,            // 미평가 — 엔진이 유저 행동으로 축적
      review_count: 0,
      price_level: 2,       // 기본 중간
      short_description: null as string | null,
      tags: [t.amenity, ...(t.cuisine ? t.cuisine.split(";") : [])].filter(Boolean),
      dietary_options: toDiet(t),
      photos: [] as string[],
      menu_items: [] as { name: string; price: number }[],
      phone_number: t.phone || t["contact:phone"] || null,
      business_hours: t.opening_hours || null,
      // 스키마 외 — 메뉴 파이프라인용 (DB엔 website 컬럼 추가 필요)
      website: t.website || t["contact:website"] || null,
      instagram: t["contact:instagram"] || null,
    }];
  });

  const outDir = join(__dirname, "data");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "melbourne_osm.json");
  writeFileSync(outPath, JSON.stringify(rows, null, 2));

  // 통계
  const byCat = new Map<string, number>();
  for (const r of rows) byCat.set(r.category, (byCat.get(r.category) ?? 0) + 1);
  const top = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const pct = (n: number) => rows.length ? Math.round((n / rows.length) * 100) : 0;
  const withWeb = rows.filter((r) => r.website).length;
  const withInsta = rows.filter((r) => !r.website && r.instagram).length;
  const withPhone = rows.filter((r) => r.phone_number).length;
  const withHours = rows.filter((r) => r.business_hours).length;
  const withDiet = rows.filter((r) => r.dietary_options.length).length;

  console.log(`\n✅ ${rows.length}개 식당/카페 → ${outPath}`);
  console.log(`\n카테고리 top:\n${top.map(([c, n]) => `  ${n}\t${c}`).join("\n")}`);
  console.log(`\n필드 채움율:`);
  console.log(`  website:   ${withWeb} (${pct(withWeb)}%)  [메뉴 스크랩 대상]`);
  console.log(`  instagram(웹없음): ${withInsta} (${pct(withInsta)}%)`);
  console.log(`  phone:     ${withPhone} (${pct(withPhone)}%)`);
  console.log(`  hours:     ${withHours} (${pct(withHours)}%)`);
  console.log(`  diet태그:  ${withDiet} (${pct(withDiet)}%)`);
  console.log(`\n샘플:`);
  console.log(JSON.stringify(rows.slice(0, 2), null, 2));
}

main().catch((e) => { console.error("실패:", e.message); process.exit(1); });
