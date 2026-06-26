import { describe, it, expect } from "vitest";
import { categoriesForIntent, intentForCategory, intentForHour } from "./intent";

describe("intent ↔ category 매핑", () => {
  it("cafe 인텐트는 카페를 포함하고 한식을 제외한다", () => {
    expect(categoriesForIntent("cafe")).toContain("카페");
    expect(categoriesForIntent("cafe")).not.toContain("한식");
  });
  it("카테고리 → 인텐트 역매핑", () => {
    expect(intentForCategory("베이커리")).toBe("dessert");
    expect(intentForCategory("한식")).toBe("meal");
    expect(intentForCategory("공원")).toBeNull(); // 놀거리=Phase 3
  });
  it("시간대 기본 인텐트: 점심=밥, 오후=카페", () => {
    expect(intentForHour(12)).toBe("meal");
    expect(intentForHour(15)).toBe("cafe");
  });
});
