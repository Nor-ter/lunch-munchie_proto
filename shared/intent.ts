// 인텐트(밥/카페/디저트) ↔ 카테고리 분류. server·client 공용.
// 규칙 기반 — 한국어 mock(한식·카페…)과 영문 멜번(Cafe·Italian…) 롱테일 cuisine을
// 하나로 커버. 정적 리스트로 다 열거할 수 없어 카테고리 문자열 규칙으로 판정.
// 놀거리(공원·복합문화공간)는 Phase 3에서 일급 인텐트로 추가.
export type Intent = "meal" | "cafe" | "dessert";

const CAFE_RE = /카페|찻집|cafe|coffee/i;
const DESSERT_RE = /베이커리|디저트|아이스크림|bakery|dessert|ice.?cream|pastry|patisserie|gelato|confection/i;

// 카테고리 → 인텐트. cafe/dessert 규칙에 안 걸리면 식사류(meal)로 본다.
export function intentForCategory(category: string | null | undefined): Intent | null {
  if (!category) return null;
  if (CAFE_RE.test(category)) return "cafe";
  if (DESSERT_RE.test(category)) return "dessert";
  return "meal";
}

// 시간대 → 첫 스톱 기본 인텐트. 14~17시는 카페, 그 외는 밥(점심·저녁).
export function intentForHour(hour: number): Intent {
  if (hour >= 14 && hour < 17) return "cafe";
  return "meal";
}
