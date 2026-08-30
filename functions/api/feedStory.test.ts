import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sanitizeFeedStorySlides } from "./[[path]]";

const migration = readFileSync(
  new URL("../../migrations/0024_course_story_slides.sql", import.meta.url),
  "utf8",
);

describe("feed story sanitizer", () => {
  it("adds an empty, non-null legacy-safe story column without rewriting posts", () => {
    expect(migration).toContain(
      "ALTER TABLE courses ADD COLUMN feed_story TEXT NOT NULL DEFAULT '[]'",
    );
    expect(migration).not.toMatch(/\b(?:UPDATE|DELETE)\b/i);
  });

  it("keeps bounded presentation tokens and canonical references only", () => {
    const photos = Array.from(
      { length: 7 },
      (_, index) => `/photos/uploads/author/photo-${index}.jpg`,
    );
    const text = "한".repeat(150);
    const slides = sanitizeFeedStorySlides([
      {
        id: "first-slide",
        photo: photos[0],
        overlays: [
          {
            id: "food",
            kind: "food_name",
            text,
            restaurantId: "restaurant-one",
            x: -30,
            y: 300,
            width: 2,
            tone: "untrusted-css-token",
            size: "huge",
            align: "around",
          },
          {
            id: "forged-restaurant",
            kind: "restaurant_name",
            restaurantId: "restaurant-not-in-course",
            x: 50,
            y: 50,
            width: 50,
          },
          { id: "empty-review", kind: "review", text: "  " },
          { id: "map", kind: "course_map", x: 25, y: 20, width: 80 },
          { id: "unknown", kind: "arbitrary_html", text: "<script>" },
          { id: "price", kind: "price", text: "$12" },
          { id: "over-limit", kind: "text", text: "must not be read" },
        ],
      },
      { id: "duplicate", photo: photos[0], overlays: [] },
      ...photos.slice(1).map((photo, index) => ({
        id: `slide-${index + 1}`,
        photo,
        overlays: [],
      })),
      { id: "foreign", photo: "/photos/uploads/other/foreign.jpg", overlays: [] },
    ], photos, ["restaurant-one"]);

    expect(slides).toHaveLength(6);
    expect(slides.map((slide) => slide.photo)).toEqual(photos.slice(0, 6));
    expect(slides[0]?.overlays).toEqual([
      {
        id: "food",
        kind: "food_name",
        text: "한".repeat(120),
        restaurantId: "restaurant-one",
        x: 0,
        y: 100,
        width: 10,
        tone: "light",
        size: "md",
        align: "left",
      },
      {
        id: "map",
        kind: "course_map",
        x: 25,
        y: 20,
        width: 80,
        tone: "light",
        size: "md",
        align: "left",
      },
      expect.objectContaining({ id: "price", kind: "price", text: "$12" }),
      expect.objectContaining({ id: "over-limit", kind: "text", text: "must not be read" }),
    ]);
  });

  it("keeps the first six valid overlays instead of letting invalid entries consume the quota", () => {
    const photo = "/photos/uploads/author/meal.jpg";
    const valid = Array.from({ length: 7 }, (_, index) => ({
      id: `valid-${index}`,
      kind: "text",
      text: `유효 ${index}`,
    }));
    const [slide] = sanitizeFeedStorySlides([{
      photo,
      overlays: [
        { kind: "unknown", text: "invalid" },
        { kind: "review", text: "   " },
        { kind: "restaurant_name", restaurantId: "foreign" },
        ...valid,
      ],
    }], [photo], ["owned"]);

    expect(slide?.overlays).toHaveLength(6);
    expect(slide?.overlays.map(item => item.text)).toEqual([
      "유효 0",
      "유효 1",
      "유효 2",
      "유효 3",
      "유효 4",
      "유효 5",
    ]);
  });

  it("accepts a restaurant overlay without snapshot text only for a course stop", () => {
    const photo = "/photos/uploads/author/meal.jpg";
    expect(sanitizeFeedStorySlides([{
      photo,
      overlays: [{ kind: "restaurant_name", restaurantId: "restaurant-one" }],
    }], [photo], ["restaurant-one"])).toEqual([{
      id: "slide-0",
      photo,
      overlays: [expect.objectContaining({
        id: "overlay-0-0",
        kind: "restaurant_name",
        restaurantId: "restaurant-one",
      })],
    }]);
  });

  it("makes slide and overlay ids unique across the persisted post", () => {
    const firstPhoto = "/photos/uploads/author/first.jpg";
    const secondPhoto = "/photos/uploads/author/second.jpg";
    const slides = sanitizeFeedStorySlides([{
      id: "duplicate",
      photo: firstPhoto,
      overlays: [{ id: "duplicate-overlay", kind: "text", text: "First" }],
    }, {
      id: "duplicate",
      photo: secondPhoto,
      overlays: [
        { id: "duplicate-overlay", kind: "text", text: "Second" },
        { id: "duplicate-overlay", kind: "text", text: "Third" },
      ],
    }], [firstPhoto, secondPhoto], []);

    expect(slides.map((slide) => slide.id)).toEqual(["duplicate", "duplicate-2"]);
    expect(slides.flatMap((slide) => slide.overlays.map((overlay) => overlay.id))).toEqual([
      "duplicate-overlay",
      "duplicate-overlay-2",
      "duplicate-overlay-3",
    ]);
  });
});
