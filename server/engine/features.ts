// 런치 엔진 v0.5 — 아이템 피처 표현 (x_i)
//
// 취향 벡터 학습의 기반. v0.5는 "구조적 + 맛 프로파일"만(로컬에서 계산 가능).
// 텍스트 임베딩은 후속(Python 오프라인). 아키텍처상 이 x_i를 피처 스토어가 보관하지만,
// 프로토타입에선 카테고리 룰 기반으로 서빙 시 즉석 계산(24개 카탈로그라 충분).

export const FEATURE_KEYS = ["spicy", "salty", "sweet", "oily", "light", "price", "dessert", "cafe"] as const;
export const FEATURE_DIM = FEATURE_KEYS.length;

// 카테고리 → 맛 프로파일 [맵기, 짭짤, 단맛, 기름짐, 가벼움] (0~1). 키워드 부분일치.
const TASTE_PROFILES: { match: RegExp; p: [number, number, number, number, number] }[] = [
  { match: /한식|고기/, p: [0.7, 0.6, 0.3, 0.5, 0.3] },
  { match: /중식/, p: [0.5, 0.7, 0.4, 0.8, 0.2] },
  { match: /일식|스시|라멘/, p: [0.2, 0.5, 0.3, 0.3, 0.7] },
  { match: /이탈리안|피자/, p: [0.2, 0.6, 0.3, 0.6, 0.3] },
  { match: /타이|태국/, p: [0.8, 0.6, 0.5, 0.5, 0.4] },
  { match: /스테이크/, p: [0.2, 0.7, 0.2, 0.8, 0.1] },
  { match: /치킨/, p: [0.5, 0.7, 0.3, 0.9, 0.1] },
  { match: /디저트/, p: [0.0, 0.2, 0.95, 0.5, 0.4] },
  { match: /베이커리|빵/, p: [0.0, 0.3, 0.8, 0.5, 0.5] },
  { match: /카페/, p: [0.0, 0.2, 0.6, 0.3, 0.7] },
  { match: /브런치/, p: [0.1, 0.5, 0.5, 0.5, 0.5] },
  { match: /비건|샐러드/, p: [0.2, 0.3, 0.3, 0.2, 0.9] },
  { match: /타파스|스페인/, p: [0.3, 0.7, 0.2, 0.6, 0.4] },
  { match: /파인다이닝/, p: [0.2, 0.5, 0.4, 0.5, 0.5] },
];
const NEUTRAL: [number, number, number, number, number] = [0.4, 0.4, 0.4, 0.4, 0.5];

function profileFor(category?: string): [number, number, number, number, number] {
  const cat = category ?? "";
  for (const { match, p } of TASTE_PROFILES) if (match.test(cat)) return p;
  return NEUTRAL;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export interface ItemMeta {
  category?: string | null;
  price_level?: number | null;
}

// 아이템 피처 벡터 x_i (FEATURE_DIM 차원). 취향 벡터 theta_u와 내적해 tasteFit 산출.
export function buildItemVector(item: ItemMeta): number[] {
  const cat = item.category ?? "";
  const [spicy, salty, sweet, oily, light] = profileFor(cat);
  const price = typeof item.price_level === "number" ? clamp01((item.price_level - 1) / 3) : 0.5;
  const dessert = /디저트|베이커리|빵/.test(cat) ? 1 : 0;
  const cafe = /카페/.test(cat) ? 1 : 0;
  return [spicy, salty, sweet, oily, light, price, dessert, cafe];
}
