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

  it("removes near-identical hashes but keeps photos that only share an unverified label", () => {
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
      "/photos/pasta-b.jpg",
      "/photos/table.jpg",
    ]);
  });

  it("does not auto-reject different photos from generated dish semantics alone", () => {
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
      "/photos/pepperoni-angle.jpg",
      "/photos/crepe.jpg",
      "/photos/cheese-crepe.jpg",
      "/photos/chicken.jpg",
      "/photos/chicken-angle.jpg",
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
