export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

// ── Diet 통제 어휘 (controlled vocabulary) ───────────────────────────────────
// 문제: 유저 필터('비건')와 식당 태그('비건 옵션')가 다른 문자열이라 매칭이 깨졌음.
// 해결: 모든 diet 값을 enum으로 정규화하고, 하드 제약(필터)과 소프트 선호(가점)를 분리한다.

export type DietRestriction = "VEGAN" | "VEGETARIAN" | "GLUTEN_FREE" | "HALAL" | "NO_SEAFOOD";
export type DietPreference = "MEAT_LOVER";
export type DietTag = DietRestriction | DietPreference;

// 하드 제약 — 후보 생성에서 제외(필터)
export const DIET_RESTRICTIONS: { id: DietRestriction; label: string }[] = [
  { id: "VEGAN", label: "비건" },
  { id: "VEGETARIAN", label: "채식" },
  { id: "GLUTEN_FREE", label: "글루텐프리" },
  { id: "HALAL", label: "할랄" },
  { id: "NO_SEAFOOD", label: "해산물 제외" },
];

// 소프트 선호 — 제약이 아니라 스코어러 가점
export const DIET_PREFERENCES: { id: DietPreference; label: string }[] = [
  { id: "MEAT_LOVER", label: "육식" },
];

// 한국어 라벨·식당 태그·영문 → enum 정규화 매핑
const DIET_ALIASES: Record<string, DietTag> = {
  "비건": "VEGAN", "비건 옵션": "VEGAN", "vegan": "VEGAN",
  "채식": "VEGETARIAN", "베지테리언": "VEGETARIAN", "vegetarian": "VEGETARIAN",
  "글루텐프리": "GLUTEN_FREE", "글루텐 프리": "GLUTEN_FREE", "글루텐프리 옵션": "GLUTEN_FREE",
  "gluten free": "GLUTEN_FREE", "gluten-free": "GLUTEN_FREE", "glutenfree": "GLUTEN_FREE",
  "할랄": "HALAL", "halal": "HALAL",
  "해산물 제외": "NO_SEAFOOD", "해산물제외": "NO_SEAFOOD", "no seafood": "NO_SEAFOOD",
  "육식": "MEAT_LOVER", "meat": "MEAT_LOVER",
};

/** 임의 문자열(유저 필터/식당 태그)을 diet enum으로 정규화. 매칭 실패 시 null. */
export function normalizeDiet(raw: string): DietTag | null {
  if (!raw) return null;
  return DIET_ALIASES[raw.trim().toLowerCase()] ?? null;
}

const HARD_IDS = new Set<string>(DIET_RESTRICTIONS.map((d) => d.id));
export function isHardRestriction(tag: string): boolean {
  return HARD_IDS.has(tag);
}
