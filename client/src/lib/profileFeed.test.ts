import { describe, expect, it } from "vitest";
import type { FeedPost } from "@/contexts/AppContext";
import {
  getFeedAuthorFallback,
  getFeedPostsByAuthor,
  resolveFeedAuthorId,
} from "./profileFeed";

function post(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: "feed-1",
    authorName: "지민",
    authorEmoji: "😊",
    courseId: "course-1",
    photos: [],
    caption: "점심 기록",
    skinId: "default",
    likes: 0,
    saves: 0,
    comments: [],
    createdAt: "2026-07-20T00:00:00.000Z",
    tags: [],
    ...overrides,
  };
}

describe("profile feed data boundary", () => {
  it("uses the DB-ready authorId when present", () => {
    expect(resolveFeedAuthorId(post({ authorId: "user-123" }))).toBe(
      "user-123",
    );
  });

  it("gives legacy local authors a stable profile id", () => {
    const first = resolveFeedAuthorId(post());
    const second = resolveFeedAuthorId(post({ id: "feed-2" }));

    expect(first).toBe(second);
    expect(first).toMatch(/^local-user-/);
  });

  it("filters and sorts one author feed without coupling the profile page to storage", () => {
    const posts = [
      post({
        id: "older",
        authorId: "user-123",
        createdAt: "2026-07-01T00:00:00.000Z",
      }),
      post({ id: "other", authorId: "user-456" }),
      post({
        id: "newer",
        authorId: "user-123",
        createdAt: "2026-07-21T00:00:00.000Z",
      }),
    ];

    expect(
      getFeedPostsByAuthor(posts, "user-123").map((item) => item.id),
    ).toEqual(["newer", "older"]);
  });

  it("builds a display fallback for users that are not in the remote users table yet", () => {
    const legacyPost = post();
    const userId = resolveFeedAuthorId(legacyPost);

    expect(getFeedAuthorFallback([legacyPost], userId)).toEqual({
      user: {
        id: userId,
        username: "지민",
        profile_image_url: null,
        bio: null,
        location: null,
        created_at: legacyPost.createdAt,
      },
      emoji: "😊",
    });
  });

  it("keeps a feed author photo when the remote users table is unavailable", () => {
    const legacyPost = post({ authorImage: "https://example.com/avatar.jpg" });
    const userId = resolveFeedAuthorId(legacyPost);

    expect(getFeedAuthorFallback([legacyPost], userId)).toEqual({
      user: {
        id: userId,
        username: "지민",
        profile_image_url: "https://example.com/avatar.jpg",
        bio: null,
        location: null,
        created_at: legacyPost.createdAt,
      },
      emoji: "지",
    });
  });
});

