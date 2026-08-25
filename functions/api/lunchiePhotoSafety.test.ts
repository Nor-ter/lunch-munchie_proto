import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MIN_LUNCHIE_PRESENTATION_PHOTOS,
  lunchiePresentationPhotosByRestaurant,
  selectLunchiePresentationPhotoKeys,
} from "./[[path]]";

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
    expect(source).toContain("photos: presentationPhotos.get(String(item.restaurant.id)) ?? []");
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

  it("groups the same food across angles, variants, and card photo kinds", () => {
    const rows = [
      { r2_key: "pizza.jpg", kind: "dish", dishes: '["pizza"]', perceptual_hash: "0000000000000000" },
      { r2_key: "pepperoni-angle.jpg", kind: "table", dishes: '["pepperoni pizza"]', perceptual_hash: "ffffffffffffffff" },
      { r2_key: "crepe.jpg", kind: "dish", dishes: '["crepe"]', perceptual_hash: null },
      { r2_key: "cheese-crepe.jpg", kind: "table", dishes: '["cheese_crepe"]', perceptual_hash: null },
      { r2_key: "chicken.jpg", kind: "dish", dishes: '["fried_chicken"]', perceptual_hash: null },
      { r2_key: "chicken-angle.jpg", kind: "table", dishes: '["fried chicken"]', perceptual_hash: null },
    ];

    expect(selectLunchiePresentationPhotoKeys(rows, 10)).toEqual([
      "/photos/pizza.jpg",
      "/photos/crepe.jpg",
      "/photos/chicken.jpg",
    ]);
  });

  it("groups highly overlapping table compositions but keeps distinct dishes", () => {
    const rows = [
      { r2_key: "spread.jpg", kind: "table", dishes: '["grilled meat","bread","butter","coffee"]', perceptual_hash: null },
      { r2_key: "spread-angle.jpg", kind: "table", dishes: '["grilled meat","bread","butter"]', perceptual_hash: null },
      { r2_key: "beef-noodles.jpg", kind: "dish", dishes: '["beef noodles"]', perceptual_hash: null },
      { r2_key: "beef-skewer.jpg", kind: "dish", dishes: '["beef skewer"]', perceptual_hash: null },
      { r2_key: "skewer-closeup.jpg", kind: "dish", dishes: '["beef skewer"]', perceptual_hash: null },
      { r2_key: "tonkatsu-table.jpg", kind: "table", dishes: '["tonkatsu","beef skewer"]', perceptual_hash: null },
    ];

    expect(selectLunchiePresentationPhotoKeys(rows, 10)).toEqual([
      "/photos/spread.jpg",
      "/photos/beef-noodles.jpg",
      "/photos/beef-skewer.jpg",
      "/photos/tonkatsu-table.jpg",
    ]);
  });

  it("removes duplicate object keys before presenting a card", () => {
    const rows = [
      { r2_key: "same.jpg", kind: "dish", dishes: '["pizza"]', perceptual_hash: null },
      { r2_key: "same.jpg", kind: "dish", dishes: '["pasta"]', perceptual_hash: null },
    ];

    expect(selectLunchiePresentationPhotoKeys(rows)).toEqual(["/photos/same.jpg"]);
  });

  it("removes the same source photo even when it was uploaded under two object keys", () => {
    const rows = [
      { r2_key: "first.jpg", drive_file_id: "drive-1", kind: "dish", dishes: '["pizza"]', perceptual_hash: null },
      { r2_key: "copied.jpg", drive_file_id: "drive-1", kind: "dish", dishes: '["pasta"]', perceptual_hash: null },
      { r2_key: "other.jpg", drive_file_id: "drive-2", kind: "dish", dishes: '["salad"]', perceptual_hash: null },
    ];

    expect(selectLunchiePresentationPhotoKeys(rows)).toEqual([
      "/photos/first.jpg",
      "/photos/other.jpg",
    ]);
  });

  it("qualifies recommendations by distinct safe photos, not raw photo rows", async () => {
    const db = {
      prepare: () => ({
        bind: () => ({
          all: async () => ({ results: [
            { restaurant_id: "duplicate-only", r2_key: "a.jpg", drive_file_id: "same", kind: "dish", dishes: '["pizza"]', perceptual_hash: null },
            { restaurant_id: "duplicate-only", r2_key: "b.jpg", drive_file_id: "same", kind: "dish", dishes: '["pasta"]', perceptual_hash: null },
            { restaurant_id: "eligible", r2_key: "c.jpg", drive_file_id: "one", kind: "dish", dishes: '["pizza"]', perceptual_hash: null },
            { restaurant_id: "eligible", r2_key: "d.jpg", drive_file_id: "two", kind: "dish", dishes: '["pasta"]', perceptual_hash: null },
          ] }),
        }),
      }),
    };

    const photos = await lunchiePresentationPhotosByRestaurant(db, ["duplicate-only", "eligible"]);
    expect(photos.get("duplicate-only")).toHaveLength(1);
    expect(photos.get("eligible")).toHaveLength(MIN_LUNCHIE_PRESENTATION_PHOTOS);
  });

  it("does not fan catalogue reads out into per-photo R2 probes", () => {
    expect(source).toContain("return selectLunchiePresentationPhotoKeys(results)");
    expect(source).not.toContain("filterExistingPhotos(env, selectLunchiePresentationPhotoKeys(results))");
  });

  it("uses the same minimum distinct-photo gate for individual and shared recommendations", () => {
    expect(MIN_LUNCHIE_PRESENTATION_PHOTOS).toBe(2);
    expect(source.match(/MIN_LUNCHIE_PRESENTATION_PHOTOS/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain("lunchiePresentationPhotosByRestaurant");
  });
});
