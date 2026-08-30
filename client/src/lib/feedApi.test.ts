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
      title: "을지로 점심 코스",
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
      title: "을지로 점심 코스",
      photos: ["/photos/photo.jpg"],
      caption: "오늘의 기록",
      createdAt: "2026-08-25T00:00:00.000Z",
    });
    expect(post.comments[0]).toMatchObject({ authorId: "commenter-1", authorName: "댓글러" });
  });

  it("keeps only story slides that reference canonical author media", () => {
    const photo = "/photos/uploads/author-1/meal.jpg";
    const post = feedPostFromApi({
      id: "post-course-1",
      courseId: "course-1",
      creatorId: "author-1",
      photos: [photo],
      storySlides: [
        {
          id: "meal-slide",
          photo,
          overlays: [{ kind: "food_name", text: "트러플 파스타", x: 50, y: 70, width: 80 }],
        },
        {
          id: "foreign-slide",
          photo: "/photos/uploads/another-user/meal.jpg",
          overlays: [{ kind: "text", text: "다른 사용자 사진" }],
        },
      ],
    }, viewer);

    expect(post.storySlides).toEqual([
      expect.objectContaining({
        id: "meal-slide",
        photo,
        overlays: [expect.objectContaining({ kind: "food_name", text: "트러플 파스타" })],
      }),
    ]);
  });

  it("keeps only photo attributions that target canonical post media", () => {
    const photo = "/photos/uploads/author-1/meal.jpg";
    const post = feedPostFromApi({
      id: "post-course-1",
      courseId: "course-1",
      creatorId: "author-1",
      photos: [photo],
      photoAttributions: [{
        r2Path: photo,
        classification: "restaurant",
        restaurantId: "restaurant-one",
        source: "user_selected",
      }, {
        r2Path: "/photos/uploads/another-user/meal.jpg",
        classification: "restaurant",
        restaurantId: "restaurant-two",
        source: "user_selected",
      }, {
        r2Path: photo,
        classification: "restaurant",
        source: "user_selected",
      }],
    }, viewer);

    expect(post.photoAttributions).toEqual([{
      r2Path: photo,
      classification: "restaurant",
      restaurantId: "restaurant-one",
      source: "user_selected",
    }]);
  });

  it("canonicalizes non-restaurant attribution without borrowing a source or restaurant", () => {
    const photo = "/photos/uploads/author-1/receipt.jpg";
    const post = feedPostFromApi({
      id: "post-course-1",
      courseId: "course-1",
      creatorId: "author-1",
      photos: [photo],
      photoAttributions: [{
        r2Path: photo,
        restaurantId: "restaurant-forged",
        classification: "other",
        source: "gps_suggestion",
      }],
    }, viewer);

    expect(post.photoAttributions).toEqual([{
      r2Path: photo,
      classification: "other",
      source: "other",
    }]);
  });
});
