import { describe, expect, it } from "vitest";
import { buildSharedSessionDeck, onRequest } from "./[[path]]";

const HOST_KEY = "host-key";
const HOST_KEY_HASH = "09f10e4bdc37a471382a5aa37101705b258c9b246fbcfa1e8727723214f1a738";

describe("group-session recommendation attribution", () => {
  it("does not boost a cuisine merely because it has more candidate rows", () => {
    const deck = buildSharedSessionDeck(
      "stable-session",
      [
        { id: "fav", category: "한식", rating: 4 },
        ...Array.from({ length: 12 }, (_, index) => ({ id: `neutral-${index}`, category: "카페", rating: 4 })),
      ],
      [{ preferences_json: JSON.stringify({ categories: [{ category: "한식", score: 1 }] }) }],
      1,
    );

    expect(deck[0]?.id).toBe("fav");
  });

  it("persists one immutable group slate and participant impressions before voting starts", async () => {
    const queries: string[] = [];
    const session = {
      id: "session-1", host_user_id: "host", share_token: "ABC123", group_size: 1,
      filter_distance: 1000, distance_enabled: 0, origin_latitude: null, origin_longitude: null,
      filter_budget: 4, filter_categories: "[]", filter_dietary: "[]", intent: "meal",
      top_restaurant_ids: "[]", recommendation_slate_id: null, status: "WAITING", deadline_at: null, created_at: 1,
    };
    const db = {
      prepare(query: string) {
        queries.push(query);
        const all = async () => {
          if (query.includes("FROM session_members")) return { results: [{ user_id: "host", preferences_json: "{}" }] };
          if (query.includes("FROM restaurants")) return { results: [
            { id: "r1", category: "한식", rating: 4.5, price_level: 2, dietary_options: "[]", latitude: 0, longitude: 0 },
            { id: "r2", category: "일식", rating: 4.2, price_level: 2, dietary_options: "[]", latitude: 0, longitude: 0 },
          ] };
          return { results: [] };
        };
        const statement = {
          query,
          all,
          bind: () => ({
            first: async () => {
              if (query.includes("FROM sessions")) return session;
              if (query.includes("member_secret_hash FROM session_members")) {
                return { user_id: "host", member_secret_hash: HOST_KEY_HASH };
              }
              return null;
            },
            all,
            run: async () => ({ meta: { changes: 1 } }),
          }),
        };
        return statement;
      },
      batch: async (statements: Array<{ query: string }>) => {
        queries.push(...statements.map((statement) => statement.query));
        return [];
      },
    };

    const response = await onRequest({
      request: new Request("https://example.test/api/sessions/ABC123/status", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SWIPING_1", userId: "host", memberKey: HOST_KEY }),
      }),
      env: { DB: db, AUTH_SESSION_SECRET: "test" },
    } as any);

    expect(response.status).toBe(200);
    expect(queries.some((query) => query.includes("INSERT INTO recommendation_slates"))).toBe(true);
    expect(queries.some((query) => query.includes("'IMPRESSION'"))).toBe(true);
    expect(queries.some((query) => query.includes("recommendation_slate_id"))).toBe(true);
  });

  it("persists an idempotent attributed event with each preliminary session swipe", async () => {
    const batched: Array<{ query: string; args: unknown[] }> = [];
    const db = {
      prepare(query: string) {
        return {
          query,
          args: [] as unknown[],
          bind(...args: unknown[]) {
            const statement = {
              query,
              args,
              first: async () => {
                if (query.includes("FROM session_members")) return { id: "member-1" };
                if (query.includes("json_each(s.items_json)")) return {
                  slate_id: "slate-1", policy_version: "session-group-deterministic-v1",
                  variant: "group", context_json: "{}", position: 0, propensity: 1, score: 4.2,
                };
                return null;
              },
            };
            return statement;
          },
        };
      },
      batch: async (statements: Array<{ query: string; args: unknown[] }>) => {
        batched.push(...statements);
        return statements.map(() => ({ meta: { changes: 1 } }));
      },
    };

    const response = await onRequest({
      request: new Request("https://example.test/api/swipes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "swipe-1", session_id: "session-1", user_id: "host", restaurant_id: "r1", round: 1, swipe_action: "DISLIKE" }),
      }),
      env: { DB: db, AUTH_SESSION_SECRET: "test" },
    } as any);

    expect(response.status).toBe(200);
    expect(batched.some((statement) => statement.query.includes("INSERT OR IGNORE INTO swipes"))).toBe(true);
    const evidence = batched.find((statement) => statement.query.includes("INSERT OR IGNORE INTO rec_events"));
    expect(evidence?.args).toContain("NOPE");
    expect(evidence?.args).toContain("session-swipe:session-1:host:r1:1");
  });
});
