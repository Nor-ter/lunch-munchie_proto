import { describe, expect, it } from "vitest";
import { feedPostFromApi, normalizeFeedApiPage } from "./feedApi";

const viewer = { id: "author-1", name: "작성자", emoji: "🍜" };

describe("feed API normalization", () => {
  it("normalizes a canonical profile page without changing its cursor", () => {
    expect(normalizeFeedApiPage({
      items: [{ id: "post-1" }],
      nextCursor: "20",
      hasMore: true,
      policyVersion: "feed-author-chronological-v1",
    })).toEqual({
      items: [{ id: "post-1" }],
      nextCursor: "20",
      hasMore: true,
      policyVersion: "feed-author-chronological-v1",
    });
  });

  it("maps server ownership, media and date into one shared FeedPost shape", () => {
    const post = feedPostFromApi({
      id: "post-course-1",
      courseId: "course-1",
      creatorId: "author-1",
      authorName: "작성자",
      photos: ["photo.jpg"],
      description: "오늘의 기록",
      tags: ["한식"],
      comments: [{ id: "comment-1", authorId: "commenter-1", authorName: "댓글러", text: "좋아요", createdAt: 1 }],
      createdAt: "2026-08-25T00:00:00.000Z",
    }, viewer);

    expect(post).toMatchObject({
      id: "post-course-1",
      courseId: "course-1",
      authorId: "author-1",
      authorName: "작성자",
      authorEmoji: "🍜",
      photos: ["/photos/photo.jpg"],
      caption: "오늘의 기록",
      createdAt: "2026-08-25T00:00:00.000Z",
    });
    expect(post.comments[0]).toMatchObject({ authorId: "commenter-1", authorName: "댓글러" });
  });
});
