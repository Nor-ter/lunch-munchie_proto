import { describe, it, expect } from "vitest";
import { categoryMatchesIntent, intentForCategory, intentForHour } from "./intent";
import { matchesDietaryRestrictions } from "./const";

describe("intentForCategory (규칙 기반 — 한국어 + 영문 멜번)", () => {
  it("카페류 → cafe (KR·EN)", () => {
    expect(intentForCategory("카페")).toBe("cafe");
    expect(intentForCategory("전통찻집")).toBe("cafe");
    expect(intentForCategory("Cafe")).toBe("cafe");
    expect(intentForCategory("Coffee Shop")).toBe("cafe");
  });
  it("디저트류 → dessert (KR·EN)", () => {
    expect(intentForCategory("베이커리")).toBe("dessert");
    expect(intentForCategory("Bakery")).toBe("dessert");
    expect(intentForCategory("Ice Cream")).toBe("dessert");
  });
  it("나머지 식사류 → meal (한식·롱테일 cuisine)", () => {
    expect(intentForCategory("한식")).toBe("meal");
    expect(intentForCategory("Italian")).toBe("meal");
    expect(intentForCategory("Fast Food")).toBe("meal");
    expect(intentForCategory("Restaurant")).toBe("meal");
    expect(intentForCategory("Vietnamese")).toBe("meal");
  });
  it("null/빈값 → null", () => {
    expect(intentForCategory(null)).toBeNull();
    expect(intentForCategory("")).toBeNull();
  });
});

describe("intentForHour", () => {
  it("점심=밥, 오후=카페", () => {
    expect(intentForHour(12)).toBe("meal");
    expect(intentForHour(15)).toBe("cafe");
  });
});

describe("matchesDietaryRestrictions (menu evidence)", () => {
  it("normalizes UI labels and source-menu abbreviations before enforcing a hard restriction", () => {
    expect(matchesDietaryRestrictions("Cafe", ["VG", "GFO"], ["비건", "글루텐프리"])).toBe(true);
    expect(matchesDietaryRestrictions("Cafe", ["V"], ["비건"])).toBe(false);
  });

  it("never silently ignores an unsupported hard restriction", () => {
    expect(matchesDietaryRestrictions("한식", [], ["견과류 알러지"])).toBe(false);
    expect(matchesDietaryRestrictions("한식", ["NF"], ["견과류 알러지"])).toBe(true);
  });
});

describe("categoryMatchesIntent", () => {
  it("선택한 인텐트를 세션의 하드 후보 제약으로 적용한다", () => {
    expect(categoryMatchesIntent("한식", "meal")).toBe(true);
    expect(categoryMatchesIntent("카페", "meal")).toBe(false);
    expect(categoryMatchesIntent("카페", "cafe")).toBe(true);
    expect(categoryMatchesIntent("베이커리", "dessert")).toBe(true);
    expect(categoryMatchesIntent("베이커리", "cafe")).toBe(false);
    expect(categoryMatchesIntent("바", "meal")).toBe(false);
    expect(categoryMatchesIntent("Pub", "meal")).toBe(false);
  });
});
