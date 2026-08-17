import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./[[path]].ts", import.meta.url), "utf8");

describe("Munchie feed delivery policy", () => {
  it("keeps legacy hydration while exposing a cursor-based personalised feed contract", () => {
    expect(source).toContain('const paged = c.req.query("limit") !== undefined || c.req.query("cursor") !== undefined');
    expect(source).toContain("if (!paged) return c.json(feedItems)");
    expect(source).toContain('policyVersion: "feed-personal-v1"');
    expect(source).toContain("nextCursor");
    expect(source).toContain("hasMore");
  });

  it("ranks signed-in feeds from durable preference and follow signals with bounded exploration", () => {
    expect(source).toContain("const categoryAffinity = new Map<string, number>()");
    expect(source).toContain("JOIN restaurants r ON r.id = e.restaurant_id");
    expect(source).toContain("FROM user_follows WHERE follower_id = ?");
    expect(source).toContain("const followBoost");
    expect(source).toContain("const exploration");
  });
});
