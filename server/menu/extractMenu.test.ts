import { describe, it, expect } from "vitest";
import { firstJsonObject, parseMenuResponse, findMenuLink } from "./extractMenu";

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

describe("findMenuLink", () => {
  const base = "http://www.flower-drum.com/";

  it("타 도메인 메뉴 링크도 잡음 (실제 Flower Drum 케이스)", () => {
    const html = '<nav><a href="/about">About</a><a href="https://flowerdrum.melbourne/our-food/">Our Food</a></nav>';
    expect(findMenuLink(html, base)).toBe("https://flowerdrum.melbourne/our-food/");
  });

  it("상대 href → 절대 URL", () => {
    expect(findMenuLink('<a href="/menu">Menu</a>', base)).toBe("http://www.flower-drum.com/menu");
  });

  it("링크 텍스트가 Menu 여도 잡음", () => {
    const html = '<a href="/food-page">Our Menu</a>';
    expect(findMenuLink(html, base)).toBe("http://www.flower-drum.com/food-page");
  });

  it("menu 를 drinks 보다 우선", () => {
    const html = '<a href="/drinks">Drinks</a><a href="/menu">Menu</a>';
    expect(findMenuLink(html, base)).toBe("http://www.flower-drum.com/menu");
  });

  it("#앵커·mailto·같은 페이지는 무시", () => {
    const html = '<a href="#menu">Menu</a><a href="mailto:x@y.com?menu">Mail</a><a href="/">Home</a>';
    expect(findMenuLink(html, base)).toBe(null);
  });

  it("메뉴 관련 링크 없으면 null", () => {
    expect(findMenuLink('<a href="/about">About</a><a href="/contact">Contact</a>', base)).toBe(null);
  });
});
