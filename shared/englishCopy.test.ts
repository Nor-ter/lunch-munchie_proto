import { describe, expect, it } from "vitest";
import { englishText } from "./englishCopy";
import {
  FOOD_TAGS,
  hasFoodTag,
  normalizeFoodTag,
} from "../client/src/constants/foodTags";

describe("English display copy", () => {
  it("renders canonical Korean tags in English without changing filter values", () => {
    expect(FOOD_TAGS).toContain("카페");
    expect(englishText("카페")).toBe("Cafe");
    expect(normalizeFoodTag("데이트 코스")).toBe("데이트코스");
    expect(hasFoodTag(["데이트 코스"], "데이트코스")).toBe(true);
  });

  it("preserves whitespace and supports an empty translated suffix", () => {
    expect(englishText("  카페  ")).toBe("  Cafe  ");
    expect(englishText("번째")).toBe("");
  });

  it("leaves unknown user content and inherited property names unchanged", () => {
    expect(englishText("내가 직접 쓴 리뷰")).toBe("내가 직접 쓴 리뷰");
    expect(englishText("constructor")).toBe("constructor");
    expect(englishText("__proto__")).toBe("__proto__");
  });

  it("does not change non-string render values", () => {
    const value = { id: "restaurant-a" };
    expect(englishText(value)).toBe(value);
    expect(englishText(null)).toBe(null);
    expect(englishText(7)).toBe(7);
  });
});
