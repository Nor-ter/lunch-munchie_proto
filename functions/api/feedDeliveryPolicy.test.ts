import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rankMunchieFeedItems } from "./[[path]]";

const source = readFileSync(new URL("./[[path]].ts", import.meta.url), "utf8");

describe("Munchie feed delivery policy", () => {
  it("keeps legacy hydration while exposing a cursor-based personalised feed contract", () => {
    expect(source).toContain('const paged = c.req.query("limit") !== undefined || c.req.query("cursor") !== undefined');
    expect(source).toContain("if (!paged) return c.json(locationItems)");
    expect(source).toContain(": feedItems;");
    expect(source).toContain('"feed-personal-location-v1" : "feed-personal-v1"');
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

  it("changes ranking with viewer taste/follows while keeping ISO dates finite", () => {
    const items = [
      { id: "korean", creatorId: "chef", tags: ["한식"], stops: [], createdAt: "2026-08-01T00:00:00.000Z" },
      { id: "cafe", creatorId: "friend", tags: ["카페"], stops: [], createdAt: "2026-08-02T00:00:00.000Z" },
      { id: "pizza", creatorId: "other", tags: ["이탈리안"], stops: [], createdAt: "invalid" },
    ];
    const now = Date.parse("2026-08-17T00:00:00.000Z");

    const koreanViewer = rankMunchieFeedItems(items, {
      viewerId: "viewer-a",
      categoryAffinity: new Map([["한식", 2]]),
      following: new Set(),
      now,
    });
    const cafeViewer = rankMunchieFeedItems(items, {
      viewerId: "viewer-b",
      categoryAffinity: new Map(),
      following: new Set(["friend"]),
      now,
    });

    expect(koreanViewer[0].id).toBe("korean");
    expect(cafeViewer[0].id).toBe("cafe");
    expect(koreanViewer.map(item => item.id).sort()).toEqual(["cafe", "korean", "pizza"]);
  });

  it("uses a bounded 80-post candidate window instead of truncating the feed at 20", () => {
    expect(source).toContain("ORDER BY c.created_at DESC LIMIT 80");
    expect(source).not.toContain("ORDER BY c.created_at DESC LIMIT 20");
  });
});
