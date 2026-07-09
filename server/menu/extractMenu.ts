// 메뉴 추출 — 식당 website URL → { name, price }[] (menu_items)
// HTML/이미지 자동 감지 → NVIDIA NIM(OpenAI 호환)으로 추출. 의존성 0 (native fetch).
// 키(NVIDIA_API_KEY) 없으면 dryRun: fetch+포맷감지+robots까지만 확인.
//
// 단일 테스트:  npx tsx server/menu/extractMenu.ts <url>
import "dotenv/config";

export interface MenuItem { name: string; price: number | null }
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

// NVIDIA NIM 호출 (OpenAI 호환 /chat/completions). content = OpenAI content 블록 배열.
async function callLLM(content: unknown[], model: string, apiKey: string): Promise<MenuItem[]> {
  const res = await fetch(NIM_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "content-type": "application/json",
      "accept": "application/json",
    },
    body: JSON.stringify({ model, max_tokens: 8000, temperature: 0, messages: [{ role: "user", content }] }),
  });
  if (!res.ok) throw new Error(`NIM ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return parseMenuResponse(data.choices?.[0]?.message?.content ?? "");
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

export async function extractMenu(url: string, opts: { dryRun?: boolean } = {}): Promise<ExtractResult> {
  const apiKey = process.env.NVIDIA_API_KEY;
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
          return { url, ok: true, format: r2.format, items: r2.items, image: r.image ?? r2.image, note: `menu link: ${menuUrl}` };
        }
      }
    }
    return { url, ok: true, format: r.format, items: r.items, image: r.image, note: r.note };
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
