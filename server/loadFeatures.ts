// 피처 스토어 부팅 로더 — restaurant_features 를 엔진 메모리에 적재.
//
// 왜: features.ts 의 x_i 가 카테고리 룰만 쓰면 "같은 카테고리 = 같은 벡터"라
//     엔진이 식당을 구분하지 못한다(콜드스타트). 사진·메뉴에서 뽑은 실측
//     맛 프로파일을 넣어 식당별 고유 벡터를 만든다.
//
// 경로: DB(restaurant_features) 우선 → 실패 시 server/data/drive_ingest.json 폴백.
//       (이 저장소의 다른 로더와 동일한 이중 경로 — DB 차단 환경에서도 동작)
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./db.js";
import { restaurantFeatures } from "../shared/schema.js";
import { loadFeatureStore, featureStoreSize, loadReputationPriors } from "./engine/features.js";

const here = dirname(fileURLToPath(import.meta.url));

type Row = {
  restaurant_id: string;
  photo_kinds?: Record<string, number> | null;
  evidence?: { photos?: number; menu_items?: number } | null;
  taste?: { spicy: number; salty: number; sweet: number; oily: number; light: number } | null;
  price_stats?: { min: number; max: number; median: number; n: number } | null;
};

export async function loadFeatures(): Promise<{ count: number; source: "db" | "file" | "none" }> {
  try {
    const rows = await db.select().from(restaurantFeatures);
    if (rows.length) {
      loadFeatureStore(rows as Row[]);
      loadReputationPriors(rows as unknown as Parameters<typeof loadReputationPriors>[0]);
      return { count: featureStoreSize(), source: "db" };
    }
  } catch {
    /* DB 불가 → 파일 폴백 */
  }
  try {
    const raw = readFileSync(join(here, "data", "drive_ingest.json"), "utf8");
    const parsed = JSON.parse(raw) as { features?: Row[] };
    const rows = (parsed.features ?? []).filter((f) => f.restaurant_id);
    if (rows.length) {
      loadFeatureStore(rows);
      loadReputationPriors(rows as Parameters<typeof loadReputationPriors>[0]); // 평점 부재 대체(감사 치명 1)
      return { count: featureStoreSize(), source: "file" };
    }
  } catch {
    /* 파일도 없으면 카테고리 룰 폴백으로 동작 */
  }
  return { count: 0, source: "none" };
}
