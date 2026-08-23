export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

// ── Diet 통제 어휘 (controlled vocabulary) ───────────────────────────────────
// 문제: 유저 필터('비건')와 식당 태그('비건 옵션')가 다른 문자열이라 매칭이 깨졌음.
// 해결: 모든 diet 값을 enum으로 정규화하고, 하드 제약(필터)과 소프트 선호(가점)를 분리한다.

export type DietRestriction =
  | "VEGAN"
  | "VEGETARIAN"
  | "PESCATARIAN"
  | "GLUTEN_FREE"
  | "HALAL"
  | "NO_PORK"
  | "NO_BEEF"
  | "NO_LAMB"
  | "NO_SEAFOOD"
  | "NO_SHELLFISH"
  | "NO_NUTS"
  | "NO_DAIRY"
  | "NO_EGGS";
export type DietPreference = "MEAT_LOVER";
export type DietTag = DietRestriction | DietPreference;

// 하드 제약 — 후보 생성에서 제외(필터)
export const DIET_RESTRICTIONS: { id: DietRestriction; label: string }[] = [
  { id: "VEGAN", label: "비건" },
  { id: "VEGETARIAN", label: "채식" },
  { id: "PESCATARIAN", label: "페스코" },
  { id: "GLUTEN_FREE", label: "글루텐프리" },
  { id: "HALAL", label: "할랄" },
  { id: "NO_PORK", label: "돼지고기 제외" },
  { id: "NO_BEEF", label: "소고기 제외" },
  { id: "NO_LAMB", label: "양고기 제외" },
  { id: "NO_SEAFOOD", label: "해산물 제외" },
  { id: "NO_SHELLFISH", label: "갑각류·조개류 제외" },
  { id: "NO_NUTS", label: "견과류 제외" },
  { id: "NO_DAIRY", label: "유제품 제외" },
  { id: "NO_EGGS", label: "달걀 제외" },
];

// 소프트 선호 — 제약이 아니라 스코어러 가점
export const DIET_PREFERENCES: { id: DietPreference; label: string }[] = [
  { id: "MEAT_LOVER", label: "육식" },
];

// 한국어 라벨·식당 태그·영문 → enum 정규화 매핑
const DIET_ALIASES: Record<string, DietTag> = {
  "비건": "VEGAN", "비건 옵션": "VEGAN", "vegan": "VEGAN", "vg": "VEGAN", "vgo": "VEGAN", "vego": "VEGAN", "vego option": "VEGAN", "vg option": "VEGAN",
  "채식": "VEGETARIAN", "베지테리언": "VEGETARIAN", "vegetarian": "VEGETARIAN", "v": "VEGETARIAN",
  "페스코": "PESCATARIAN", "페스코테리언": "PESCATARIAN", "pescatarian": "PESCATARIAN", "pescetarian": "PESCATARIAN",
  "글루텐프리": "GLUTEN_FREE", "글루텐 프리": "GLUTEN_FREE", "글루텐프리 옵션": "GLUTEN_FREE",
  "gluten free": "GLUTEN_FREE", "gluten-free": "GLUTEN_FREE", "glutenfree": "GLUTEN_FREE", "gluten_free": "GLUTEN_FREE", "gf": "GLUTEN_FREE", "gfo": "GLUTEN_FREE",
  "할랄": "HALAL", "halal": "HALAL",
  "돼지고기 제외": "NO_PORK", "돼지고기제외": "NO_PORK", "no pork": "NO_PORK", "pork free": "NO_PORK", "no_pork": "NO_PORK",
  "소고기 제외": "NO_BEEF", "소고기제외": "NO_BEEF", "no beef": "NO_BEEF", "beef free": "NO_BEEF", "no_beef": "NO_BEEF",
  "양고기 제외": "NO_LAMB", "양고기제외": "NO_LAMB", "no lamb": "NO_LAMB", "lamb free": "NO_LAMB", "no_lamb": "NO_LAMB",
  "해산물 제외": "NO_SEAFOOD", "해산물제외": "NO_SEAFOOD", "no seafood": "NO_SEAFOOD", "no_seafood": "NO_SEAFOOD",
  "갑각류 제외": "NO_SHELLFISH", "조개류 제외": "NO_SHELLFISH", "shellfish free": "NO_SHELLFISH", "no shellfish": "NO_SHELLFISH", "no_shellfish": "NO_SHELLFISH",
  "견과류 제외": "NO_NUTS", "견과류 알러지": "NO_NUTS", "견과류 알레르기": "NO_NUTS", "nut free": "NO_NUTS", "nut-free": "NO_NUTS", "no nuts": "NO_NUTS", "no_nuts": "NO_NUTS", "nf": "NO_NUTS",
  "유제품 제외": "NO_DAIRY", "유제품제외": "NO_DAIRY", "dairy free": "NO_DAIRY", "dairy-free": "NO_DAIRY", "no dairy": "NO_DAIRY", "no_dairy": "NO_DAIRY", "df": "NO_DAIRY",
  "달걀 제외": "NO_EGGS", "계란 제외": "NO_EGGS", "egg free": "NO_EGGS", "no eggs": "NO_EGGS", "no_eggs": "NO_EGGS",
  "육식": "MEAT_LOVER", "meat": "MEAT_LOVER", "meat_lover": "MEAT_LOVER",
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

/** Ingredient exclusions remain hard even when venue data cannot verify a diet style. */
export function isIngredientAvoidance(tag: DietRestriction): boolean {
  return tag.startsWith("NO_");
}

export type RestaurantDietEvidence = {
  category?: unknown;
  dietaryOptions?: unknown;
  menuItems?: unknown;
};

const ingredientPatterns: Record<
  "PORK" | "BEEF" | "LAMB" | "LAND_MEAT" | "SEAFOOD" | "SHELLFISH" | "NUTS" | "DAIRY" | "EGGS",
  RegExp
> = {
  PORK: /\b(pork|bacon|ham|prosciutto|salami|chorizo|pancetta)\b|돼지|삼겹살|베이컨|햄|프로슈토|살라미|초리조/i,
  BEEF: /\b(beef|steak|wagyu|brisket|veal)\b|소고기|쇠고기|스테이크|와규/i,
  LAMB: /\b(lamb|mutton)\b|양고기/i,
  LAND_MEAT: /\b(pork|bacon|ham|prosciutto|salami|chorizo|pancetta|beef|steak|wagyu|brisket|veal|lamb|mutton|chicken|turkey|duck)\b|돼지|삼겹살|베이컨|소고기|쇠고기|스테이크|와규|양고기|닭|치킨|오리/i,
  SEAFOOD: /\b(seafood|fish|salmon|tuna|sushi|sashimi|omakase|prawns?|shrimps?|crabs?|lobsters?|oysters?|mussels?|clams?|scallops?|octopus|squid)\b|해산물|생선|연어|참치|스시|초밥|생선회|회덮밥|횟집|사시미|오마카세|새우|꽃게|대게|킹크랩|크랩|랍스터|굴|홍합|조개|가리비|문어|오징어/i,
  SHELLFISH: /\b(shellfish|prawns?|shrimps?|crabs?|lobsters?|oysters?|mussels?|clams?|scallops?|octopus|squid)\b|갑각류|조개류|새우|꽃게|대게|킹크랩|크랩|랍스터|굴|홍합|조개|가리비|문어|오징어/i,
  NUTS: /\b(peanut|almond|walnut|cashew|pistachio|hazelnut|pecan|macadamia|tree nuts?)\b|땅콩|견과|아몬드|호두|캐슈|피스타치오|헤이즐넛|피칸|마카다미아/i,
  DAIRY: /\b(milk|cheese|cream|butter|yogh?urt|gelato|mozzarella|parmesan)\b|우유|치즈|크림|버터|요거트|요구르트|젤라또|모차렐라|파마산/i,
  EGGS: /\b(egg|eggs|mayonnaise|aioli|meringue|custard)\b|계란|달걀|마요|아이올리|머랭|커스터드/i,
};

function arrayValue(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function restaurantDietText(evidence: RestaurantDietEvidence) {
  const menuItems = arrayValue(evidence.menuItems);
  const menuText = menuItems.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    return [row.name, row.category, row.description]
      .filter((value): value is string => typeof value === "string");
  });
  return [typeof evidence.category === "string" ? evidence.category : "", ...menuText].join(" ");
}

function offeredDietTags(evidence: RestaurantDietEvidence): DietTag[] {
  const restaurantTags = arrayValue(evidence.dietaryOptions);
  const menuTags = arrayValue(evidence.menuItems).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    return arrayValue((item as Record<string, unknown>).dietary);
  });
  return [...restaurantTags, ...menuTags]
    .filter((value): value is string => typeof value === "string")
    .map(normalizeDiet)
    .filter((value): value is DietTag => Boolean(value));
}

/**
 * Conservative restaurant-level eligibility based on the menu evidence we
 * actually store. Explicit safe tags win; otherwise avoidance rules reject a
 * venue when its category or menu text names the restricted ingredient.
 */
export function restaurantSatisfiesDietRestriction(
  evidence: RestaurantDietEvidence,
  restriction: DietRestriction,
): boolean {
  const offered = offeredDietTags(evidence);
  if (offered.includes(restriction)) return true;
  const text = restaurantDietText(evidence);
  switch (restriction) {
    case "VEGAN":
      return offered.includes("VEGAN");
    case "VEGETARIAN":
      return offered.includes("VEGETARIAN") || offered.includes("VEGAN");
    case "PESCATARIAN":
      return offered.includes("PESCATARIAN") ||
        offered.includes("VEGETARIAN") ||
        offered.includes("VEGAN") ||
        (ingredientPatterns.SEAFOOD.test(text) && !ingredientPatterns.LAND_MEAT.test(text));
    case "GLUTEN_FREE":
    case "HALAL":
      return offered.includes(restriction);
    case "NO_PORK":
      return !ingredientPatterns.PORK.test(text);
    case "NO_BEEF":
      return !ingredientPatterns.BEEF.test(text);
    case "NO_LAMB":
      return !ingredientPatterns.LAMB.test(text);
    case "NO_SEAFOOD":
      return !ingredientPatterns.SEAFOOD.test(text);
    case "NO_SHELLFISH":
      return !ingredientPatterns.SHELLFISH.test(text);
    case "NO_NUTS":
      return !ingredientPatterns.NUTS.test(text);
    case "NO_DAIRY":
      return !ingredientPatterns.DAIRY.test(text);
    case "NO_EGGS":
      return !ingredientPatterns.EGGS.test(text);
  }
}

/**
 * Compatibility path for callers that only have indexed dietary tags rather
 * than full menu rows. Unknown evidence stays conservative: non-seafood hard
 * requirements must have an explicit normalized tag.
 */
export function matchesDietaryRestrictions(
  category: string | null | undefined,
  offeredTags: readonly string[] | null | undefined,
  requestedTags: readonly string[] | null | undefined,
): boolean {
  const required = (requestedTags ?? [])
    .map(normalizeDiet)
    .filter((tag): tag is DietRestriction => tag !== null && isHardRestriction(tag));
  if (!required.length) return true;
  const offered = new Set((offeredTags ?? []).map(normalizeDiet).filter(Boolean));
  return required.every((tag) =>
    tag === "NO_SEAFOOD"
      ? restaurantSatisfiesDietRestriction({ category, dietaryOptions: offeredTags }, tag)
      : offered.has(tag),
  );
}
