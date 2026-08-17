import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./[[path]].ts", import.meta.url), "utf8");

describe("Lunchie presentation-photo safety", () => {
  it("prefers classified food/table photos, excludes known people, and restores a same-restaurant legacy fallback", () => {
    expect(source).toContain("function lunchiePresentationPhotos");
    expect(source).toContain("kind IN ('dish', 'table')");
    expect(source).toContain("has_person = 0");
    expect(source).toContain("perceptual_hash");
    expect(source).toContain("kind = 'unclassified'");
    expect(source).toContain("classified.results.length");
  });

  it("uses the same safe resolver for catalogue and recommendation cards", () => {
    expect(source).toContain("photos: await lunchiePresentationPhotos(c.env.DB, item.restaurant.id)");
    expect(source).toContain("photos: await lunchiePresentationPhotos(c.env.DB, r.id)");
  });
});
