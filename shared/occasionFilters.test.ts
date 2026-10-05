import { describe, expect, it } from "vitest";
import {
  categoryFiltersForOccasions,
  normalizePersistedSessionCategories,
} from "./occasionFilters";

const catalogueCategories = new Set(["카페", "베이커리", "디저트", "바", "한식"]);

describe("Quick Match occasion filters", () => {
  it("keeps Food Spots broad instead of filtering to the legacy 맛집 category", () => {
    expect(categoryFiltersForOccasions(["맛집"], catalogueCategories)).toEqual([]);
    expect(categoryFiltersForOccasions(["맛집", "카페"], catalogueCategories)).toEqual([]);
  });

  it("maps specific occasion choices to catalogue categories that can be shown", () => {
    expect(categoryFiltersForOccasions(["펍나이트"], catalogueCategories)).toEqual(["바"]);
    expect(categoryFiltersForOccasions(["브런치", "디저트"], catalogueCategories)).toEqual([
      "카페",
      "베이커리",
      "디저트",
    ]);
  });

  it("repairs rooms created with the old broad category value", () => {
    expect(normalizePersistedSessionCategories(["맛집"])).toEqual([]);
    expect(normalizePersistedSessionCategories(["카페", "카페"])).toEqual(["카페"]);
  });
});
