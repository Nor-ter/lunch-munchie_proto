import { describe, it, expect } from "vitest";
import { firstJsonObject, parseMenuResponse, findMenuLink, extractOgImage, matchItemImages } from "./extractMenu";

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

describe("extractOgImage", () => {
  const base = "https://www.example.com.au/";

  it("og:image 절대 URL 그대로", () => {
    const html = '<meta property="og:image" content="https://cdn.example.com/hero.jpg">';
    expect(extractOgImage(html, base)).toBe("https://cdn.example.com/hero.jpg");
  });

  it("og:image 상대 URL → 절대 URL", () => {
    const html = '<meta property="og:image" content="/images/hero.jpg">';
    expect(extractOgImage(html, base)).toBe("https://www.example.com.au/images/hero.jpg");
  });

  it("og:image 없으면 twitter:image 폴백", () => {
    const html = '<meta name="twitter:image" content="/tw.jpg">';
    expect(extractOgImage(html, base)).toBe("https://www.example.com.au/tw.jpg");
  });

  it("og:image:secure_url 이 og:image보다 우선", () => {
    const html = '<meta property="og:image" content="/insecure.jpg"><meta property="og:image:secure_url" content="/secure.jpg">';
    expect(extractOgImage(html, base)).toBe("https://www.example.com.au/secure.jpg");
  });

  it("속성 순서(content가 property보다 먼저)여도 인식", () => {
    const html = '<meta content="/hero.jpg" property="og:image">';
    expect(extractOgImage(html, base)).toBe("https://www.example.com.au/hero.jpg");
  });

  it("이미지 메타 없으면 null", () => {
    expect(extractOgImage('<meta name="description" content="A great cafe">', base)).toBe(null);
  });

  it("content 비어있으면 무시하고 null", () => {
    expect(extractOgImage('<meta property="og:image" content="">', base)).toBe(null);
  });
});

describe("matchItemImages", () => {
  const base = "https://www.grilld.com.au/";

  it("실제 Grill'd 케이스 — alt가 요리명을 포함(부가설명 붙음)", () => {
    const html = '<img src="/img/superbuns.jpg" alt="Superbuns - high protein, low carb">';
    const items = [{ name: "Superbuns", price: null }];
    expect(matchItemImages(items, html, base)).toEqual([
      { name: "Superbuns", price: null, image: "https://www.grilld.com.au/img/superbuns.jpg" },
    ]);
  });

  it("정확히 일치", () => {
    const html = '<img alt="Superbuns" src="/superbuns.jpg">'; // 속성 순서 반대
    const items = [{ name: "Superbuns", price: 14.9 }];
    expect(matchItemImages(items, html, base)[0].image).toBe("https://www.grilld.com.au/superbuns.jpg");
  });

  it("요리명이 alt보다 길고 alt를 포함하는 경우도 매칭", () => {
    const html = '<img src="/x.jpg" alt="Bulgogi">';
    const items = [{ name: "Wagyu Bulgogi Bowl", price: 20 }];
    expect(matchItemImages(items, html, base)[0].image).toBe("https://www.grilld.com.au/x.jpg");
  });

  it("매칭되는 이미지 없으면 image 필드 없이 그대로", () => {
    const html = '<img src="/logo.jpg" alt="Grill\'d Logo">';
    const items = [{ name: "Superbuns", price: null }];
    expect(matchItemImages(items, html, base)).toEqual([{ name: "Superbuns", price: null }]);
  });

  it("너무 짧은 이름(2자 이하)은 오탐 방지로 매칭 스킵", () => {
    const html = '<img src="/x.jpg" alt="Ox">';
    const items = [{ name: "Ox", price: 2 }];
    expect(matchItemImages(items, html, base)[0].image).toBeUndefined();
  });

  it("alt 없는 img는 무시", () => {
    const html = '<img src="/x.jpg">';
    const items = [{ name: "Superbuns", price: null }];
    expect(matchItemImages(items, html, base)[0].image).toBeUndefined();
  });

  it("여러 항목 각각 다른 이미지에 매칭", () => {
    const html = '<img src="/a.jpg" alt="Superbuns"><img src="/b.jpg" alt="Loaded Fries">';
    const items = [{ name: "Superbuns", price: null }, { name: "Loaded Fries", price: 8 }, { name: "Plain Water", price: 0 }];
    const result = matchItemImages(items, html, base);
    expect(result[0].image).toBe("https://www.grilld.com.au/a.jpg");
    expect(result[1].image).toBe("https://www.grilld.com.au/b.jpg");
    expect(result[2].image).toBeUndefined();
  });
});
