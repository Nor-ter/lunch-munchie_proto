const OCCASION_CATEGORY_MAP: Record<string, readonly string[]> = {
  카페: ["카페"],
  펍나이트: ["바"],
  브런치: ["카페", "베이커리"],
  디저트: ["디저트", "베이커리", "카페"],
};

/**
 * Occasion chips describe the kind of outing, not a literal restaurant
 * category. Only translate chips with an explicit catalogue mapping. The
 * broad "Food Spots" chip intentionally means any category.
 */
export function categoryFiltersForOccasions(
  tags: readonly string[],
  availableCategories: ReadonlySet<string>,
): string[] {
  if (tags.includes("맛집")) return [];

  return Array.from(new Set(
    tags.flatMap(tag => OCCASION_CATEGORY_MAP[tag] ?? [])
      .filter(category => availableCategories.has(category)),
  ));
}

/**
 * Rooms created by older clients persisted the broad "Food Spots" chip as
 * the literal category "맛집". Those catalogue rows have no presentation
 * photos, so the room could never start. Keep existing invite links usable by
 * treating that legacy value as the broad filter it represented in the UI.
 */
export function normalizePersistedSessionCategories(categories: readonly string[]): string[] {
  if (categories.includes("맛집")) return [];
  return Array.from(new Set(categories));
}
