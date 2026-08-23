import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { selectLunchiePresentationPhotoKeys } from "./[[path]]";

const source = readFileSync(new URL("./[[path]].ts", import.meta.url), "utf8");

describe("Lunchie presentation-photo safety", () => {
  it("uses only classified food/table photos and excludes known people", () => {
    expect(source).toContain("function lunchiePresentationPhotos");
    expect(source).toContain("kind IN ('dish', 'table')");
    expect(source).toContain("has_person = 0");
    expect(source).toContain("perceptual_hash");
    expect(source).not.toContain("kind = 'unclassified'");
    expect(source).toContain("CASE kind WHEN 'dish' THEN 0 ELSE 1 END");
  });

  it("uses the same safe resolver for catalogue and recommendation cards", () => {
    expect(source).toContain("photos: await lunchiePresentationPhotos(c.env.DB, item.restaurant.id)");
    expect(source).toContain("photos: await lunchiePresentationPhotos(c.env.DB, r.id)");
  });

  it("removes near-identical perceptual hashes and repeated dish labels", () => {
    const rows = [
      { r2_key: "pizza-a.jpg", kind: "dish", dishes: '["pizza"]', perceptual_hash: "0000000000000000" },
      { r2_key: "pizza-near.jpg", kind: "dish", dishes: '["pizza"]', perceptual_hash: "0000000000000001" },
      { r2_key: "pasta-a.jpg", kind: "dish", dishes: '["pasta"]', perceptual_hash: null },
      { r2_key: "pasta-b.jpg", kind: "dish", dishes: '["pasta"]', perceptual_hash: null },
      { r2_key: "table.jpg", kind: "table", dishes: '[]', perceptual_hash: null },
    ];

    expect(selectLunchiePresentationPhotoKeys(rows)).toEqual([
      "/photos/pizza-a.jpg",
      "/photos/pasta-a.jpg",
      "/photos/table.jpg",
    ]);
  });
});
