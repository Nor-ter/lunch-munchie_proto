// 인텐트(밥/카페/디저트) ↔ 카테고리 매핑. server·client 공용.
// 놀거리(복합문화공간·공원)는 Phase 3에서 일급 인텐트로 추가.
export type Intent = "meal" | "cafe" | "dessert";

export const INTENT_CATEGORIES: Record<Intent, string[]> = {
  meal: ["한식", "중식", "일식", "이탈리안", "스테이크", "베트남", "버거", "멕시칸", "레스토랑", "브런치", "샐러드", "비건"],
  cafe: ["카페", "전통찻집"],
  dessert: ["베이커리"],
};

export function categoriesForIntent(intent: Intent): string[] {
  return INTENT_CATEGORIES[intent] ?? [];
}

export function intentForCategory(category: string | null | undefined): Intent | null {
  if (!category) return null;
  for (const k of Object.keys(INTENT_CATEGORIES) as Intent[]) {
    if (INTENT_CATEGORIES[k].includes(category)) return k;
  }
  return null;
}

// 시간대 → 첫 스톱 기본 인텐트. 14~17시는 카페, 그 외는 밥(점심·저녁).
export function intentForHour(hour: number): Intent {
  if (hour >= 14 && hour < 17) return "cafe";
  return "meal";
}
