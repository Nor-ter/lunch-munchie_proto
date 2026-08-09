import { describe, expect, it } from "vitest";
import { onRequest } from "./[[path]]";

const restaurants = [
  { id: "r1", name: "One", category: "한식", rating: 4.5, review_count: 80, price_level: 2, photos: "[]", menus: "[]", tags: "[]" },
  { id: "r2", name: "Two", category: "일식", rating: 4.2, review_count: 60, price_level: 2, photos: "[]", menus: "[]", tags: "[]" },
  { id: "r3", name: "Three", category: "베트남", rating: 4.1, review_count: 40, price_level: 2, photos: "[]", menus: "[]", tags: "[]" },
];

describe("canonical recommendation serving", () => {
  it("persists an immutable slate and server-owned impression evidence", async () => {
    const sql: string[] = [];
    const db = {
      prepare(query: string) {
        sql.push(query);
        return {
          bind: () => ({
            all: async () => query.includes("FROM restaurants") ? { results: restaurants } : { results: [] },
            first: async () => null,
          }),
        };
      },
      batch: async (statements: unknown[]) => ({ results: statements.map(() => ({ meta: { changes: 1 } })) }),
    };
    const response = await onRequest({
      request: new Request("https://example.test/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ k: 2, context: { intent: "meal" } }),
      }),
      env: {
        DB: db,
        AUTH_SESSION_SECRET: "test-secret",
        USER_DO: {
          idFromName: (name: string) => name,
          get: () => ({ fetch: async (request: string) => request.endsWith("/state") ? Response.json({ exposureMap: {} }) : Response.json({ ok: true }) }),
        },
      },
    } as any);
    const body = await response.json() as { slate: unknown[]; slate_id: string; model_version: string };

    expect(response.status).toBe(200);
    expect(body.slate).toHaveLength(2);
    expect(body.slate_id).toBeTruthy();
    expect(body.model_version).toBe("stage0-contextual-v1");
    expect(sql.some((query) => query.includes("INSERT INTO recommendation_slates"))).toBe(true);
    expect(sql.some((query) => query.includes("event_type, slate_id") && query.includes("'IMPRESSION'"))).toBe(true);
  });
});
