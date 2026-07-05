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

async function callClaude(content: unknown[], apiKey: string): Promise<MenuItem[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 2000, messages: [{ role: "user", content }] }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { content?: { text?: string }[] };
  const text = data.content?.[0]?.text ?? "";
  const json = text.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(json) as { items?: MenuItem[] };
  return (parsed.items ?? []).filter((i) => i && typeof i.name === "string");
}

export async function extractMenu(url: string, opts: { dryRun?: boolean } = {}): Promise<ExtractResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const dryRun = opts.dryRun ?? !apiKey; // 키 없으면 자동 dry-run
  try {
    if (!(await robotsAllowed(url))) return { url, ok: false, items: [], error: "robots.txt 차단" };

    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(20000) });
    if (!res.ok) return { url, ok: false, items: [], error: `HTTP ${res.status}` };
    const ct = (res.headers.get("content-type") || "").toLowerCase();

    let format: ExtractResult["format"], content: unknown[];
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
      const text = htmlToText(await res.text()).slice(0, 20000); // LLM 입력 상한
      content = [{ type: "text", text: `${PROMPT}\n\n---CONTENT---\n${text}` }];
    }

    if (dryRun) {
      const preview = format === "html" ? String((content[0] as { text: string }).text).slice(-300) : "(binary)";
      return { url, ok: true, format, items: [], note: `dryRun — ${format} 감지, LLM 호출 스킵. preview: …${preview}` };
    }
    const items = await callClaude(content, apiKey!);
    return { url, ok: true, format, items };
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
