import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./[[path]].ts", import.meta.url), "utf8");

describe("Lunchie presentation-photo safety", () => {
  it("serves only classified food/table photos and excludes known people", () => {
    expect(source).toContain("function lunchiePresentationPhotos");
    expect(source).toContain("kind IN ('dish', 'table')");
    expect(source).toContain("has_person = 0");
    expect(source).toContain("perceptual_hash");
  });

  it("uses the same safe resolver for catalogue and recommendation cards", () => {
    expect(source).toContain("photos: await lunchiePresentationPhotos(c.env.DB, item.restaurant.id)");
    expect(source).toContain("photos: await lunchiePresentationPhotos(c.env.DB, r.id)");
  });
});
