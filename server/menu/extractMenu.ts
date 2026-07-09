// 메뉴 추출 — 식당 website URL → { name, price }[] (menu_items)
// HTML/PDF/이미지 자동 감지 → Claude(비전)로 추출. 의존성 0 (native fetch).
// 키 없으면 dryRun: fetch+포맷감지+robots까지만 확인.
//
// 단일 테스트:  npx tsx server/menu/extractMenu.ts <url>
import "dotenv/config";

export interface MenuItem { name: string; price: number | null }
export interface ExtractResult {
  url: string;
  ok: boolean;
  format?: "html" | "pdf" | "image" | "other";
  items: MenuItem[];
  note?: string;
  error?: string;
}

const UA = "lunchie-munchie-menu/0.1 (+contact: dev)";
const MODEL = process.env.MENU_MODEL || "claude-haiku-4-5-20251001"; // 저비용 추출
const PROMPT =
  "You extract a restaurant menu from the given content (web page text, PDF, or image). " +
  "Return ONLY JSON: {\"items\":[{\"name\":\"Dish name\",\"price\":12.5}]}. " +
  "price is a number in AUD (no symbol), or null if not shown. " +
  "Include only real food/drink menu items — no headings, hours, addresses, or descriptions. " +
  "If there is no menu in the content, return {\"items\":[]}.";

// robots.txt 최소 체크 — User-agent * 의 Disallow 경로 매칭.
async function robotsAllowed(url: string): Promise<boolean> {
  try {
    const u = new URL(url);
    const res = await fetch(`${u.origin}/robots.txt`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return true; // robots 없으면 허용
    const txt = await res.text();
    // 매우 단순한 파서: User-agent: * 블록의 Disallow 접두사만 확인
    let inStar = false, disallows: string[] = [];
    for (const line of txt.split("\n").map((l) => l.trim())) {
      const [kRaw, ...rest] = line.split(":");
      const k = (kRaw || "").toLowerCase(); const v = rest.join(":").trim();
      if (k === "user-agent") inStar = v === "*";
      else if (inStar && k === "disallow" && v) disallows.push(v);
    }
    return !disallows.some((d) => u.pathname.startsWith(d));
  } catch { return true; }
}

function htmlToText(html: string): string {
  const ld = Array.from(html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi))
    .map((m) => m[1].trim()).join("\n");
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
  return (ld ? `[STRUCTURED DATA]\n${ld}\n\n[PAGE TEXT]\n` : "") + body;
}

// LLM 응답에서 첫 균형 잡힌 {…} 만 추출 — 앞뒤 프롤로그·코드펜스·설명 무시.
// (문자열 리터럴 안의 중괄호/따옴표는 세지 않음.)
export function firstJsonObject(text: string): string {
  const start = text.indexOf("{");
  if (start === -1) return text.trim();
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  return text.slice(start); // 불균형 — 그대로(파싱 시 에러로 드러남)
}

// 응답 텍스트 → MenuItem[] (파싱 분리 = 테스트 가능)
export function parseMenuResponse(text: string): MenuItem[] {
  const parsed = JSON.parse(firstJsonObject(text)) as { items?: MenuItem[] };
  return (parsed.items ?? []).filter((i) => i && typeof i.name === "string");
}

async function callClaude(content: unknown[], apiKey: string): Promise<MenuItem[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 8000, messages: [{ role: "user", content }] }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { content?: { text?: string }[] };
  return parseMenuResponse(data.content?.[0]?.text ?? "");
}

// 홈페이지 HTML에서 '메뉴 페이지' 링크 하나를 골라 절대 URL로 반환(없으면 null).
// href/링크텍스트를 키워드로 점수화: menu > our-food/food > dining/eat > drinks.
// 앵커(#)·mailto·tel·js·같은 페이지는 제외. 타 도메인 허용(Flower Drum: 메뉴가 별도 도메인).
const A_TAG_RE = /<a\b[^>]*?href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
export function findMenuLink(html: string, baseUrl: string): string | null {
  const score = (s: string) =>
    /(^|[^a-z])menus?([^a-z]|$)/i.test(s) ? 3 :
    /our-?food|\/food|food-?menu/i.test(s) ? 2 :
    /dining|eat|what-?s-?on/i.test(s) ? 1 :
    /drinks?|beverage|wine|cocktail/i.test(s) ? 1 : 0;
  const bare = (u: string) => u.split("#")[0];
  let best: { url: string; sc: number } | null = null;
  for (const m of Array.from(html.matchAll(A_TAG_RE))) {
    const href = m[1].trim();
    if (/^(mailto:|tel:|javascript:)/i.test(href)) continue;
    const sc = Math.max(score(href), score(m[2].replace(/<[^>]+>/g, " ")));
    if (sc === 0) continue;
    let abs: string;
    try { abs = new URL(href, baseUrl).href; } catch { continue; }
    if (bare(abs) === bare(baseUrl)) continue; // 같은 페이지(앵커 등)
    if (!best || sc > best.sc) best = { url: bare(abs), sc };
  }
  return best?.url ?? null;
}

// URL 하나를 가져와 포맷 감지 + 추출. rawHtml은 링크 추적에 재사용.
async function fetchAndExtract(
  url: string, apiKey: string | undefined, dryRun: boolean,
): Promise<{ ok: boolean; format?: ExtractResult["format"]; items: MenuItem[]; rawHtml?: string; error?: string; note?: string }> {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(20000) });
  if (!res.ok) return { ok: false, items: [], error: `HTTP ${res.status}` };
  const ct = (res.headers.get("content-type") || "").toLowerCase();

  let format: ExtractResult["format"], content: unknown[], rawHtml: string | undefined;
  if (ct.includes("pdf") || url.toLowerCase().endsWith(".pdf")) {
    format = "pdf";
    const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
    content = [{ type: "text", text: PROMPT }, { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }];
  } else if (ct.startsWith("image/")) {
    format = "image";
    const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
    content = [{ type: "text", text: PROMPT }, { type: "image", source: { type: "base64", media_type: ct.split(";")[0], data: b64 } }];
  } else {
    format = "html";
    rawHtml = await res.text();
    const text = htmlToText(rawHtml).slice(0, 20000); // LLM 입력 상한
    content = [{ type: "text", text: `${PROMPT}\n\n---CONTENT---\n${text}` }];
  }

  if (dryRun) {
    const preview = format === "html" ? String((content[0] as { text: string }).text).slice(-300) : "(binary)";
    return { ok: true, format, items: [], rawHtml, note: `dryRun — ${format} 감지, LLM 호출 스킵. preview: …${preview}` };
  }
  return { ok: true, format, items: await callClaude(content, apiKey!), rawHtml };
}

export async function extractMenu(url: string, opts: { dryRun?: boolean } = {}): Promise<ExtractResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const dryRun = opts.dryRun ?? !apiKey; // 키 없으면 자동 dry-run
  try {
    if (!(await robotsAllowed(url))) return { url, ok: false, items: [], error: "robots.txt 차단" };

    const r = await fetchAndExtract(url, apiKey, dryRun);
    if (!r.ok) return { url, ok: false, items: [], error: r.error };

    // 홈에서 0개 & HTML이면 메뉴 페이지 링크를 1회 추적 (JS 렌더 아닌 '메뉴 별도 페이지' 케이스 회수)
    if (!dryRun && r.items.length === 0 && r.rawHtml) {
      const menuUrl = findMenuLink(r.rawHtml, url);
      if (menuUrl && menuUrl !== url && (await robotsAllowed(menuUrl))) {
        const r2 = await fetchAndExtract(menuUrl, apiKey, dryRun);
        if (r2.ok && r2.items.length > 0) {
          return { url, ok: true, format: r2.format, items: r2.items, note: `menu link: ${menuUrl}` };
        }
      }
    }
    return { url, ok: true, format: r.format, items: r.items, note: r.note };
  } catch (e) {
    return { url, ok: false, items: [], error: (e as Error).message };
  }
}

// CLI: 단일 URL 테스트
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2];
  if (!url) { console.error("사용: npx tsx server/menu/extractMenu.ts <url>"); process.exit(1); }
  extractMenu(url).then((r) => console.log(JSON.stringify(r, null, 2)));
}
