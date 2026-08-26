import { describe, expect, it } from "vitest";
import { onRequest } from "./[[path]]";

const restaurants = [
  { id: "r1", name: "One", category: "한식", rating: 4.5, review_count: 80, price_level: 2, dietary_options: "[\"VG\"]", photos: "[]", menus: "[]", tags: "[]" },
  { id: "r2", name: "Two", category: "일식", rating: 4.2, review_count: 60, price_level: 2, dietary_options: "[\"V\"]", photos: "[]", menus: "[]", tags: "[]" },
  { id: "r3", name: "Three", category: "베트남", rating: 4.1, review_count: 40, price_level: 2, dietary_options: "[]", photos: "[]", menus: "[]", tags: "[]" },
];

const photoRows = restaurants.flatMap((restaurant) => [1, 2].map((index) => ({
  restaurant_id: restaurant.id,
  r2_key: `${restaurant.id}-${index}.jpg`,
  drive_file_id: `${restaurant.id}-source-${index}`,
  kind: "dish",
  dishes: JSON.stringify([`${restaurant.id}-dish-${index}`]),
  perceptual_hash: null,
})));

describe("canonical recommendation serving", () => {
  it("persists an immutable slate and server-owned impression evidence", async () => {
    const sql: string[] = [];
    const db = {
      prepare(query: string) {
        sql.push(query);
        return {
          bind: () => ({
            all: async () => query.includes("FROM restaurant_menu_items")
              ? { results: [{ restaurant_id: "r1", dietary: "[\"VG\"]" }, { restaurant_id: "r2", dietary: "[\"V\"]" }] }
              : query.includes("FROM restaurant_photos") ? { results: photoRows }
              : query.includes("FROM restaurants") ? { results: restaurants } : { results: [] },
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

  it("enforces Korean dietary choices using indexed menu evidence", async () => {
    const db = {
      prepare(query: string) {
        return { bind: () => ({
          all: async () => query.includes("FROM restaurant_menu_items")
            ? { results: [{ restaurant_id: "r1", dietary: "[\"VG\"]" }, { restaurant_id: "r2", dietary: "[\"V\"]" }] }
            : query.includes("FROM restaurant_photos") ? { results: photoRows }
            : query.includes("FROM restaurants") ? { results: restaurants } : { results: [] },
          first: async () => null,
        }) };
      },
      batch: async (statements: unknown[]) => ({ results: statements.map(() => ({ meta: { changes: 1 } })) }),
    };
    const response = await onRequest({
      request: new Request("https://example.test/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ k: 7, context: { intent: "meal", diet: ["비건"] } }),
      }),
      env: { DB: db, AUTH_SESSION_SECRET: "test-secret", USER_DO: { idFromName: (name: string) => name, get: () => ({ fetch: async () => Response.json({ exposureMap: {} }) }) } },
    } as any);
    const body = await response.json() as { slate: { id: string }[] };
    expect(response.status).toBe(200);
    expect(body.slate.map((item) => item.id)).toEqual(["r1"]);
  });

  it("uses menu-price evidence for a budget ceiling without inventing a price for missing menus", async () => {
    const db = {
      prepare(query: string) {
        return { bind: () => ({
          all: async () => query.includes("FROM restaurant_menu_items")
            ? { results: [
              { restaurant_id: "r1", dietary: "[\"VG\"]", price: 35, category: "Mains" },
              { restaurant_id: "r2", dietary: "[\"V\"]", price: 10, category: "Mains" },
            ] }
            : query.includes("FROM restaurant_photos") ? { results: photoRows }
            : query.includes("FROM restaurants") ? { results: restaurants } : { results: [] },
          first: async () => null,
        }) };
      },
      batch: async (statements: unknown[]) => ({ results: statements.map(() => ({ meta: { changes: 1 } })) }),
    };
    const response = await onRequest({
      request: new Request("https://example.test/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ k: 7, context: { intent: "meal", budget: 1 } }),
      }),
      env: { DB: db, AUTH_SESSION_SECRET: "test-secret", USER_DO: { idFromName: (name: string) => name, get: () => ({ fetch: async () => Response.json({ exposureMap: {} }) }) } },
    } as any);
    const body = await response.json() as { slate: { id: string }[] };
    // r3 has no menu evidence and stays eligible; r1 is evidence-backed but exceeds ₩.
    expect(body.slate.map((item) => item.id).sort()).toEqual(["r2", "r3"]);
  });
});
