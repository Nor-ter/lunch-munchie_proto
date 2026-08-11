// 런치 엔진 v0.5 — 아이템 피처 표현 (x_i)
//
// 취향 벡터 학습의 기반. v0.5는 "구조적 + 맛 프로파일"만(로컬에서 계산 가능).
// 텍스트 임베딩은 후속(Python 오프라인). 아키텍처상 이 x_i를 피처 스토어가 보관하지만,
// 프로토타입에선 카테고리 룰 기반으로 서빙 시 즉석 계산(24개 카탈로그라 충분).

// "bias"는 상수 1 성분 — 모델이 기저 선호율(이 유저가 전반적으로 잘 좋아하는가)을
// 학습할 수 있게 한다. 없으면 모든 설명을 맛/가격 축에 억지로 실어야 한다(감사 개선 2).
export const FEATURE_KEYS = ["spicy", "salty", "sweet", "oily", "light", "price", "dessert", "cafe", "bias"] as const;
export const FEATURE_DIM = FEATURE_KEYS.length;

// 카테고리 → 맛 프로파일 [맵기, 짭짤, 단맛, 기름짐, 가벼움] (0~1). 키워드 부분일치.
// 한글/영문 둘 다 매칭한다 — 서빙 카탈로그(melbourne_osm)는 영문 카테고리를 쓰므로
// 한글 패턴만 있으면 전 식당이 NEUTRAL로 떨어져 아이템 신호가 0이 된다(콜드스타트).
const TASTE_PROFILES: { match: RegExp; p: [number, number, number, number, number] }[] = [
  { match: /한식|고기|korean|bbq|barbecue/i, p: [0.7, 0.6, 0.3, 0.5, 0.3] },
  { match: /중식|chinese|dumpling|hot ?pot/i, p: [0.5, 0.7, 0.4, 0.8, 0.2] },
  { match: /일식|스시|라멘|japanese|sushi|ramen|udon|izakaya/i, p: [0.2, 0.5, 0.3, 0.3, 0.7] },
  { match: /이탈리안|피자|italian|pizza|pasta/i, p: [0.2, 0.6, 0.3, 0.6, 0.3] },
  { match: /타이|태국|thai/i, p: [0.8, 0.6, 0.5, 0.5, 0.4] },
  { match: /인도|indian|curry/i, p: [0.75, 0.6, 0.35, 0.6, 0.3] },
  { match: /베트남|vietnamese|pho/i, p: [0.3, 0.5, 0.3, 0.3, 0.75] },
  { match: /멕시칸|mexican|taco|burrito/i, p: [0.7, 0.6, 0.3, 0.6, 0.35] },
  { match: /스테이크|steak/i, p: [0.2, 0.7, 0.2, 0.8, 0.1] },
  { match: /치킨|chicken|fried/i, p: [0.5, 0.7, 0.3, 0.9, 0.1] },
  { match: /버거|burger|fast ?food/i, p: [0.25, 0.7, 0.3, 0.8, 0.15] },
  { match: /디저트|dessert|ice ?cream|gelato/i, p: [0.0, 0.2, 0.95, 0.5, 0.4] },
  { match: /베이커리|빵|bakery|pastry|patisserie/i, p: [0.0, 0.3, 0.8, 0.5, 0.5] },
  { match: /카페|cafe|coffee|tea|juice|bubble/i, p: [0.0, 0.2, 0.6, 0.3, 0.7] },
  { match: /브런치|brunch|breakfast/i, p: [0.1, 0.5, 0.5, 0.5, 0.5] },
  { match: /비건|샐러드|vegan|vegetarian|salad|poke/i, p: [0.2, 0.3, 0.3, 0.2, 0.9] },
  { match: /타파스|스페인|tapas|spanish/i, p: [0.3, 0.7, 0.2, 0.6, 0.4] },
  { match: /해산물|seafood|fish/i, p: [0.2, 0.55, 0.25, 0.35, 0.65] },
  { match: /파인다이닝|fine ?dining/i, p: [0.2, 0.5, 0.4, 0.5, 0.5] },
  { match: /펍|pub|bar|wine/i, p: [0.3, 0.7, 0.3, 0.6, 0.3] },
  { match: /말레이|malaysian|indonesian|asian|nasi|laksa/i, p: [0.6, 0.6, 0.4, 0.6, 0.35] },
  { match: /프렌치|french|bistro/i, p: [0.15, 0.6, 0.35, 0.6, 0.4] },
  { match: /american|diner|sandwich|deli/i, p: [0.25, 0.65, 0.35, 0.7, 0.25] },
  { match: /confectionery|candy|chocolate|donut|waffle|cake/i, p: [0.0, 0.2, 0.95, 0.5, 0.4] },
  { match: /그리스|greek|turkish|kebab|lebanese|middle ?eastern/i, p: [0.4, 0.6, 0.35, 0.5, 0.45] },
];
const NEUTRAL: [number, number, number, number, number] = [0.4, 0.4, 0.4, 0.4, 0.5];

function profileFor(category?: string): [number, number, number, number, number] {
  const cat = category ?? "";
  for (const { match, p } of TASTE_PROFILES) if (match.test(cat)) return p;
  return NEUTRAL;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export interface ItemMeta {
  id?: string | null;
  category?: string | null;
  price_level?: number | null;
  menu_intents?: Array<"meal" | "cafe" | "dessert"> | null;
}

// ── 피처 스토어 (콜드스타트 해소) ─────────────────────────────────────────────
// 카테고리 룰만 쓰면 "같은 카테고리 = 같은 벡터"라 엔진이 식당을 구분하지 못한다.
// 사진·메뉴에서 뽑은 식당별 실측 맛 프로파일이 있으면 그걸 우선 쓴다.
// 출처: server/data/drive_ingest.json (드라이브 사진 인제스천) / restaurant_features 테이블.
export interface StoredFeature {
  taste?: { spicy: number; salty: number; sweet: number; oily: number; light: number } | null;
  price_stats?: { min: number; max: number; median: number; n: number } | null;
}

const featureStore = new Map<string, StoredFeature>();

export function loadFeatureStore(rows: Array<{ restaurant_id: string } & StoredFeature>): number {
  for (const r of rows) if (r?.restaurant_id) featureStore.set(String(r.restaurant_id), r);
  return featureStore.size;
}

export function featureStoreSize(): number {
  return featureStore.size;
}

// 실측 메뉴 가격(중앙값) → 0~1. price_level(1~4)과 같은 축으로 정규화.
// 멜버른 점심 기준 대략 $10~$45 구간을 0~1로 편다.
const priceFromMedian = (m: number) => clamp01((m - 10) / 35);

// 아이템 피처 벡터 x_i (FEATURE_DIM 차원). 취향 벡터 theta_u와 내적해 tasteFit 산출.
// 피처 스토어에 실측값이 있으면 그것으로, 없으면 카테고리 룰로 폴백한다.
export function buildItemVector(item: ItemMeta): number[] {
  const cat = item.category ?? "";
  const stored = item.id ? featureStore.get(String(item.id)) : undefined;
  const t = stored?.taste;
  const [spicy, salty, sweet, oily, light] = t
    ? [t.spicy, t.salty, t.sweet, t.oily, t.light]
    : profileFor(cat);
  const median = stored?.price_stats?.median;
  const price = typeof median === "number" && median > 0
    ? priceFromMedian(median)
    : typeof item.price_level === "number" ? clamp01((item.price_level - 1) / 3) : 0.5;
  // A structured menu heading is stronger evidence than a broad venue
  // category (e.g. a restaurant with a real espresso section).  It only
  // enriches ranking; hard Lunchie intent eligibility remains server-owned.
  const dessert = /디저트|베이커리|빵|dessert|bakery|gelato|ice.?cream/i.test(cat) || item.menu_intents?.includes("dessert") ? 1 : 0;
  const cafe = /카페|cafe|coffee|tea/i.test(cat) || item.menu_intents?.includes("cafe") ? 1 : 0;
  return [clamp01(spicy), clamp01(salty), clamp01(sweet), clamp01(oily), clamp01(light), price, dessert, cafe, 1];
}

// ── 평판 사전확률 (감사 치명 1 대응) ───────────────────────────────────────────
// 팀 인제스천 식당은 외부 평점이 없어 rating=0 → reputation 항이 상수 0이 되고
// 점수의 40~60%가 죽는다. 외부 평점이 들어오기 전까지 "우리가 가진 증거"로 대체한다.
//
// 근거: 팀원이 사진을 여러 장 남겼다 = 인상 깊었을 가능성이 높다(약한 신호지만 0보다 낫다).
//       메뉴를 확보했다 = 정보가 충실하다. 사진 품질 = 기록의 성실도.
// 주의: 이건 **대용 지표**지 사용자 평점이 아니다. 실제 평점이 생기면 그쪽이 우선한다.
export interface RepEvidence {
  restaurant_id: string;
  photo_kinds?: Record<string, number> | null;
  evidence?: { photos?: number; menu_items?: number } | null;
  vibe_tags?: string[] | null;
}

const repPriorStore = new Map<string, number>();

export function loadReputationPriors(rows: RepEvidence[]): number {
  // 사진 수는 로그 스케일(1장과 3장의 차이가 10장과 12장보다 크다)
  const raw = rows.map((r) => {
    const photos = r.evidence?.photos ?? 0;
    const menus = r.evidence?.menu_items ?? 0;
    const kinds = Object.keys(r.photo_kinds ?? {}).length; // 컷 다양성(외관·내부·음식…)
    return {
      id: r.restaurant_id,
      // 0.55·사진량(log) + 0.25·컷 다양성 + 0.20·메뉴 확보
      s: 0.55 * Math.log1p(photos) + 0.25 * Math.min(1, kinds / 4) * Math.log1p(4) + 0.20 * Math.min(1, menus / 20) * Math.log1p(4),
    };
  });
  if (!raw.length) return 0;
  const vals = raw.map((r) => r.s);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  for (const r of raw) {
    // [0.25, 0.85] 로 압축 — 증거가 없다고 0점(=완전 배제)이 되면 탐색이 죽는다.
    repPriorStore.set(r.id, 0.25 + 0.6 * (hi > lo ? (r.s - lo) / (hi - lo) : 0.5));
  }
  return repPriorStore.size;
}

export function reputationPrior(id: string | null | undefined): number | null {
  if (!id) return null;
  return repPriorStore.get(String(id)) ?? null;
}
