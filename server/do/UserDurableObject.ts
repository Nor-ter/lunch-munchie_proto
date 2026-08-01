/**
 * UserDurableObject — Cloudflare Durable Object for User Recommendation State
 * Manages per-user taste vector theta (A matrix & b vector), satiation history,
 * exposure counts, and lastStop occasion chain in single lock-free edge memory + storage.
 */

export interface UserStateData {
  tasteA?: number[][];
  tasteB?: number[];
  tasteN?: number;
  lastStopCat?: string;
  lastStopTs?: number;
  satiationHistory?: Array<{ category: string; ts: number }>;
  exposureMap?: Record<string, { count: number; updatedAt: number; positive: number; negative: number }>;
}

type ExposureMap = Record<string, { count: number; updatedAt: number; positive: number; negative: number }>;

const EXPOSURE_HALF_LIFE_MS = 24 * 60 * 60 * 1000;
const decay = (count: number, elapsed: number) => count * Math.pow(0.5, Math.max(0, elapsed) / EXPOSURE_HALF_LIFE_MS);

export class UserDurableObject {
  state: any;
  env: any;

  constructor(state: any, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    if (method === "GET" && url.pathname === "/state") {
      const data: UserStateData = {
        tasteA: await this.state.storage.get("tasteA"),
        tasteB: await this.state.storage.get("tasteB"),
        tasteN: await this.state.storage.get("tasteN"),
        lastStopCat: await this.state.storage.get("lastStopCat"),
        lastStopTs: await this.state.storage.get("lastStopTs"),
        satiationHistory: (await this.state.storage.get("satiationHistory")) ?? [],
        exposureMap: (await this.state.storage.get("exposureMap")) ?? {},
      };
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "POST" && url.pathname === "/updateTaste") {
      const body: { A: number[][]; b: number[]; n: number } = await request.json();
      await this.state.storage.put("tasteA", body.A);
      await this.state.storage.put("tasteB", body.b);
      await this.state.storage.put("tasteN", body.n);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "POST" && url.pathname === "/recordStop") {
      const body: { category: string; ts: number } = await request.json();
      await this.state.storage.put("lastStopCat", body.category);
      await this.state.storage.put("lastStopTs", body.ts);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 노출은 차단 목록이 아니라 시간 감쇠 상태다. 긍정 반응을 함께 보관해
    // 재발견 후보를 만들 수 있게 하며, 실제 소비 이력과는 절대 섞지 않는다.
    if (method === "POST" && url.pathname === "/recordExposure") {
      const body: { restaurantId: string; ts?: number } = await request.json();
      if (!body.restaurantId) return new Response("restaurantId required", { status: 400 });
      const now = body.ts ?? Date.now();
      const exposures = ((await this.state.storage.get("exposureMap")) ?? {}) as ExposureMap;
      const previous = exposures[body.restaurantId];
      exposures[body.restaurantId] = {
        count: (previous ? decay(previous.count, now - previous.updatedAt) : 0) + 1,
        updatedAt: now,
        positive: previous?.positive ?? 0,
        negative: previous?.negative ?? 0,
      };
      await this.state.storage.put("exposureMap", exposures);
      return Response.json({ ok: true });
    }

    if (method === "POST" && url.pathname === "/recordReaction") {
      const body: { restaurantId: string; reaction: "positive" | "negative"; ts?: number } = await request.json();
      if (!body.restaurantId || !body.reaction) return new Response("invalid reaction", { status: 400 });
      const now = body.ts ?? Date.now();
      const exposures = ((await this.state.storage.get("exposureMap")) ?? {}) as ExposureMap;
      const previous = exposures[body.restaurantId] ?? { count: 0, updatedAt: now, positive: 0, negative: 0 };
      exposures[body.restaurantId] = {
        ...previous,
        count: decay(previous.count, now - previous.updatedAt),
        updatedAt: now,
        positive: previous.positive + (body.reaction === "positive" ? 1 : 0),
        negative: previous.negative + (body.reaction === "negative" ? 1 : 0),
      };
      await this.state.storage.put("exposureMap", exposures);
      return Response.json({ ok: true });
    }

    return new Response("Not Found", { status: 404 });
  }
}
