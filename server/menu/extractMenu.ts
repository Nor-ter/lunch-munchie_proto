// 메뉴 추출 — 식당 website URL → { name, price }[] (menu_items)
// HTML/이미지 자동 감지 → NVIDIA NIM(OpenAI 호환)으로 추출. 의존성 0 (native fetch).
// 키(NVIDIA_API_KEY) 없으면 dryRun: fetch+포맷감지+robots까지만 확인.
//
// 단일 테스트:  npx tsx server/menu/extractMenu.ts <url>
import "dotenv/config";

export interface MenuItem { name: string; price: number | null; image?: string; dietary?: string[]; category?: string; description?: string }
export interface ExtractResult {
  url: string;
  ok: boolean;
  format?: "html" | "pdf" | "image" | "other";
  items: MenuItem[];
  image?: string; // 대표 사진(og:image 등, LLM 미사용) — 없으면 undefined
  note?: string;
  error?: string;
}

const UA = "lunchie-munchie-menu/0.1 (+contact: dev)";
// NVIDIA NIM (OpenAI 호환). 텍스트/비전 모델 분리 — env로 교체 가능.
const NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const TEXT_MODEL = process.env.MENU_MODEL || "meta/llama-3.3-70b-instruct";
const VISION_MODEL = process.env.MENU_VISION_MODEL || "meta/llama-3.2-90b-vision-instruct";
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
    const txt = await res.text(); // ok 여부와 무관하게 항상 바디 소비 — 안 하면 undici가 커넥션을 안 놓아 이후 같은 origin 요청이 간헐적으로 실패함
    if (!res.ok) return true; // robots 없으면 허용
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// NVIDIA NIM 호출 (OpenAI 호환 /chat/completions). content = OpenAI content 블록 배열.
// 무료 티어는 동시요청 한도(16)가 있어 503 ResourceExhausted·응답 지연(헤더 타임아웃)이 잦음 — backoff 재시도.
async function callLLM(content: unknown[], model: string, apiKey: string, retries = 4): Promise<MenuItem[]> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(NIM_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "content-type": "application/json",
          "accept": "application/json",
        },
        body: JSON.stringify({ model, max_tokens: 8000, temperature: 0, messages: [{ role: "user", content }] }),
      });
      if (res.ok) {
        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        return parseMenuResponse(data.choices?.[0]?.message?.content ?? "");
      }
      const body = await res.text();
      if (res.status === 503 && attempt < retries) { await sleep(3000 * (attempt + 1)); continue; }
      throw new Error(`NIM ${res.status}: ${body.slice(0, 200)}`);
    } catch (e) {
      // 네트워크/타임아웃(예: UND_ERR_HEADERS_TIMEOUT — NIM 무료 티어 과부하)도 재시도 대상
      if (attempt < retries && (e as Error).message?.includes("NIM ") === false) { await sleep(3000 * (attempt + 1)); continue; }
      throw e;
    }
  }
}

// HTML <meta> 태그에서 대표 이미지 URL 추출 (og:image 우선, twitter:image 폴백). LLM 미사용.
const META_TAG_RE = /<meta\b[^>]*>/gi;
const IMAGE_KEYS = ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"];
export function extractOgImage(html: string, baseUrl: string): string | null {
  const found: Record<string, string> = {};
  for (const m of Array.from(html.matchAll(META_TAG_RE))) {
    const tag = m[0];
    const keyM = tag.match(/(?:property|name)=["']([^"']+)["']/i);
    const contentM = tag.match(/content=["']([^"']*)["']/i);
    if (!keyM || !contentM || !contentM[1]) continue;
    const key = keyM[1].toLowerCase();
    if (IMAGE_KEYS.includes(key) && !found[key]) found[key] = contentM[1];
  }
  for (const key of IMAGE_KEYS) {
    if (found[key]) {
      try { return new URL(found[key], baseUrl).href; } catch { return null; }
    }
  }
  return null;
}

// HTML의 <img alt="..." src="..."> 를 파싱해 요리 이름과 alt 텍스트를 대조,
// 매칭되면 해당 항목에 image(절대 URL)를 채워 반환. LLM 미사용(순수 문자열 매칭).
// 실제 사례(Grill'd): item "Superbuns" ↔ alt "Superbuns - high protein, low carb".
const IMG_TAG_RE = /<img\b[^>]*>/gi;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
function parseImgTags(html: string): { alt: string; src: string }[] {
  const out: { alt: string; src: string }[] = [];
  for (const m of Array.from(html.matchAll(IMG_TAG_RE))) {
    const tag = m[0];
    const altM = tag.match(/\balt=["']([^"']*)["']/i);
    const srcM = tag.match(/\bsrc=["']([^"']*)["']/i);
    if (altM?.[1]?.trim() && srcM?.[1]?.trim()) out.push({ alt: altM[1].trim(), src: srcM[1].trim() });
  }
  return out;
}
export function matchItemImages(items: MenuItem[], html: string, baseUrl: string): MenuItem[] {
  const imgs = parseImgTags(html).map((img) => ({ ...img, altNorm: norm(img.alt) })).filter((img) => img.altNorm.length >= 3);
  return items.map((item) => {
    const name = norm(item.name);
    if (name.length < 3) return item;
    const hit = imgs.find((img) => img.altNorm.includes(name) || name.includes(img.altNorm));
    if (!hit) return item;
    try { return { ...item, image: new URL(hit.src, baseUrl).href }; } catch { return item; }
  });
}

// 헤드리스 브라우저(JS 렌더링) — 정적 fetch로는 안 보이는 SPA 메뉴/사진 대응. 3티어 폴백에서만 사용(비쌈).
let _browser: import("playwright").Browser | null = null;
async function getBrowser() {
  if (!_browser) {
    const { chromium } = await import("playwright");
    _browser = await chromium.launch();
  }
  return _browser;
}
export async function closeBrowser(): Promise<void> {
  if (_browser) { await _browser.close(); _browser = null; }
}
async function renderWithBrowser(url: string): Promise<string | null> {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage({ userAgent: UA });
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
      return await page.content();
    } finally { await page.close(); }
  } catch { return null; }
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
// image(og:image)는 dryRun 여부와 무관하게 항상 시도 — LLM 콜 없는 메타태그 파싱이라 공짜.
async function fetchAndExtract(
  url: string, apiKey: string | undefined, dryRun: boolean,
): Promise<{ ok: boolean; format?: ExtractResult["format"]; items: MenuItem[]; image?: string; rawHtml?: string; error?: string; note?: string }> {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(20000) });
  if (!res.ok) return { ok: false, items: [], error: `HTTP ${res.status}` };
  const ct = (res.headers.get("content-type") || "").toLowerCase();

  let format: ExtractResult["format"], content: unknown[], model: string, rawHtml: string | undefined, image: string | undefined;
  if (ct.includes("pdf") || url.toLowerCase().endsWith(".pdf")) {
    // NVIDIA NIM(OpenAI 호환)은 PDF 문서 입력을 안 받음 → 이미지 변환 필요(미구현). 스킵.
    return { ok: true, format: "pdf", items: [], note: "PDF 메뉴는 현재 미지원(NVIDIA 비전은 이미지만)" };
  } else if (ct.startsWith("image/")) {
    format = "image"; model = VISION_MODEL;
    const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
    const dataUri = `data:${ct.split(";")[0]};base64,${b64}`;
    content = [{ type: "text", text: PROMPT }, { type: "image_url", image_url: { url: dataUri } }];
  } else {
    format = "html"; model = TEXT_MODEL;
    rawHtml = await res.text();
    image = extractOgImage(rawHtml, url) ?? undefined;
    const text = htmlToText(rawHtml).slice(0, 20000); // LLM 입력 상한
    content = [{ type: "text", text: `${PROMPT}\n\n---CONTENT---\n${text}` }];
  }

  if (dryRun) {
    const preview = format === "html" ? String((content[0] as { text: string }).text).slice(-300) : "(binary)";
    return { ok: true, format, items: [], image, rawHtml, note: `dryRun — ${format} 감지, LLM 호출 스킵. preview: …${preview}` };
  }
  return { ok: true, format, items: await callLLM(content, model, apiKey!), image, rawHtml };
}

// 렌더된(post-JS) HTML에서 바로 추출 — tier 3(헤드리스 브라우저) 전용, fetch 재사용 없음.
async function extractFromRenderedHtml(html: string, url: string, apiKey: string): Promise<{ items: MenuItem[]; image?: string }> {
  const image = extractOgImage(html, url) ?? undefined;
  const text = htmlToText(html).slice(0, 20000);
  const content = [{ type: "text", text: `${PROMPT}\n\n---CONTENT---\n${text}` }];
  return { items: await callLLM(content, TEXT_MODEL, apiKey), image };
}

export async function extractMenu(url: string, opts: { dryRun?: boolean } = {}): Promise<ExtractResult> {
  const apiKey = process.env.NVIDIA_API_KEY;
  const dryRun = opts.dryRun ?? !apiKey; // 키 없으면 자동 dry-run
  try {
    if (!(await robotsAllowed(url))) return { url, ok: false, items: [], error: "robots.txt 차단" };

    const r = await fetchAndExtract(url, apiKey, dryRun);
    if (!r.ok) return { url, ok: false, items: [], error: r.error };
    if (dryRun) return { url, ok: true, format: r.format, items: r.items, image: r.image, note: r.note };

    if (r.items.length > 0) {
      const items = r.rawHtml ? matchItemImages(r.items, r.rawHtml, url) : r.items;
      return { url, ok: true, format: r.format, items, image: r.image, note: r.note };
    }

    // tier 2: 홈에서 0개 & HTML이면 메뉴 페이지 링크를 1회 추적 (메뉴가 별도 페이지인 케이스)
    let menuUrl: string | null = null;
    if (r.rawHtml) {
      const candidate = findMenuLink(r.rawHtml, url);
      if (candidate && candidate !== url && (await robotsAllowed(candidate))) menuUrl = candidate;
    }
    if (menuUrl) {
      const r2 = await fetchAndExtract(menuUrl, apiKey, dryRun);
      if (r2.ok && r2.items.length > 0) {
        const items = r2.rawHtml ? matchItemImages(r2.items, r2.rawHtml, menuUrl) : r2.items;
        return { url, ok: true, format: r2.format, items, image: r.image ?? r2.image, note: `menu link: ${menuUrl}` };
      }
    }

    // tier 3: 여전히 0개 → 헤드리스 브라우저로 JS 렌더링 후 재시도 (SPA 대응)
    const renderUrl = menuUrl ?? url;
    const rendered = await renderWithBrowser(renderUrl);
    if (rendered) {
      const r3 = await extractFromRenderedHtml(rendered, renderUrl, apiKey!);
      if (r3.items.length > 0) {
        const items = matchItemImages(r3.items, rendered, renderUrl);
        return { url, ok: true, format: "html", items, image: r.image ?? r3.image, note: `rendered: ${renderUrl}` };
      }
    }

    return { url, ok: true, format: r.format, items: r.items, image: r.image, note: r.note };
  } catch (e) {
    if (process.env.MENU_DEBUG) console.error("[DEBUG]", e, (e as any)?.cause);
    return { url, ok: false, items: [], error: (e as Error).message };
  }
}

// CLI: 단일 URL 테스트
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2];
  if (!url) { console.error("사용: npx tsx server/menu/extractMenu.ts <url>"); process.exit(1); }
  extractMenu(url).then((r) => console.log(JSON.stringify(r, null, 2))).finally(closeBrowser);
}
