import { describe, it, expect } from "vitest";
import { firstJsonObject, parseMenuResponse } from "./extractMenu";

describe("firstJsonObject", () => {
  it("깔끔한 JSON은 그대로", () => {
    expect(firstJsonObject('{"items":[]}')).toBe('{"items":[]}');
  });

  it("코드펜스 + 뒤 프롤로그 제거 (실제 실패 케이스)", () => {
    const raw = '```json\n{"items":[]}\n```\nThis page has no menu.';
    expect(firstJsonObject(raw)).toBe('{"items":[]}');
  });

  it("앞 설명 문장 무시", () => {
    const raw = 'Here is the menu:\n{"items":[{"name":"Pho","price":16}]}';
    expect(firstJsonObject(raw)).toBe('{"items":[{"name":"Pho","price":16}]}');
  });

  it("문자열 안의 중괄호·따옴표에 안 속음", () => {
    const raw = '{"items":[{"name":"Chef\'s {special} \\"deluxe\\"","price":null}]} trailing';
    const cut = firstJsonObject(raw);
    expect(JSON.parse(cut).items[0].name).toBe('Chef\'s {special} "deluxe"');
  });

  it("여러 줄 JSON + 뒤 텍스트", () => {
    const raw = '{\n  "items": [\n    {"name":"Latte","price":4.5}\n  ]\n}\nDone.';
    expect(JSON.parse(firstJsonObject(raw)).items[0].name).toBe("Latte");
  });
});

describe("parseMenuResponse", () => {
  it("펜스+프롤로그 감싼 응답도 items 추출", () => {
    const raw = '```json\n{"items":[{"name":"Butter Chicken","price":22.9},{"name":"Naan","price":null}]}\n```\nEnjoy!';
    const items = parseMenuResponse(raw);
    expect(items).toEqual([
      { name: "Butter Chicken", price: 22.9 },
      { name: "Naan", price: null },
    ]);
  });

  it("name 없는 항목은 걸러냄", () => {
    const raw = '{"items":[{"name":"Pizza","price":20},{"price":5},{"name":123}]}';
    expect(parseMenuResponse(raw)).toEqual([{ name: "Pizza", price: 20 }]);
  });

  it("메뉴 없음 → 빈 배열", () => {
    expect(parseMenuResponse('{"items":[]}')).toEqual([]);
  });
});
