import type { Intent } from "./intent.js";

/**
 * A deliberately conservative taxonomy for menu *section headers*.
 *
 * It is evidence enrichment, not a cuisine guesser: vague headings such as
 * "Special" and drink/alcohol-only headings return null.  This lets the
 * recommendation engine use a known menu signal without turning an unknown
 * section into a false dietary or meal claim.
 */
const CAFE = /(?:coffee|espresso|frappuccino|latte|matcha|tea|café|cafe|찻집|커피)/i;
const DESSERT = /(?:dessert|gelato|sorbet|ice.?cream|cake|pastr(?:y|ies)|patisserie|confection|디저트|케이크|아이스크림)/i;
const MEAL = /(?:breakfast|brunch|lunch|dinner|main|mains|favourites|favorites|burger|pizza|pasta|noodles?|soup|stew|chicken|rice|bap|pork|dumpling|tteokbokki|meal|식사|메인|국밥|면|찌개|볶음|치킨|피자|파스타)/i;
// A bar may sell food, but a drinks-only heading is not enough evidence to
// classify the restaurant as a cafe or a meal stop.
const DRINKS_ONLY = /(?:beer|wine|cocktail|spirits?|alcohol|soft drinks?|juice|beverage|drinks?)/i;

export function intentForMenuSection(section: string | null | undefined): Intent | null {
  const value = section?.trim();
  if (!value || DRINKS_ONLY.test(value)) return null;
  if (DESSERT.test(value)) return "dessert";
  if (CAFE.test(value)) return "cafe";
  if (MEAL.test(value)) return "meal";
  return null;
}

/** Returns only evidence-supported intent labels, in a stable order. */
export function menuSectionIntents(sections: Iterable<string | null | undefined>): Intent[] {
  const intents = new Set<Intent>();
  // Array.from keeps this shared module compatible with the project's ES5
  // TypeScript target without enabling downlevel iterator helpers globally.
  for (const section of Array.from(sections)) {
    const intent = intentForMenuSection(section);
    if (intent) intents.add(intent);
  }
  return (["meal", "cafe", "dessert"] as const).filter((intent) => intents.has(intent));
}
