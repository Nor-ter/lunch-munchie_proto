import { describe, expect, it } from "vitest";
import { intentForMenuSection, menuSectionIntents } from "./menuTaxonomy";

describe("menu section taxonomy", () => {
  it("classifies only specific food, cafe, and dessert sections", () => {
    expect(intentForMenuSection("LUNCH MAIN")).toBe("meal");
    expect(intentForMenuSection("Espresso")).toBe("cafe");
    expect(intentForMenuSection("Gelato Cakes")).toBe("dessert");
  });

  it("does not turn beverage or ambiguous headings into a food claim", () => {
    expect(intentForMenuSection("COCKTAILS AND THEIR VARIATIONS")).toBeNull();
    expect(intentForMenuSection("SPECIAL")).toBeNull();
    expect(menuSectionIntents(["LUNCH", "Espresso", "Beer", "Gelato"])).toEqual(["meal", "cafe", "dessert"]);
  });
});
