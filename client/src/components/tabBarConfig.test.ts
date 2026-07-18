import { describe, expect, it } from "vitest";

import { isTabActive, TAB_ITEMS } from "./tabBarConfig";

describe("TAB_ITEMS", () => {
  it("keeps the five established routes in order", () => {
    expect(TAB_ITEMS.map(({ path }) => path)).toEqual([
      "/",
      "/feed",
      "/lunchie/settings",
      "/saved",
      "/profile",
    ]);
  });

  it.each(TAB_ITEMS)("marks $path active at its exact route", ({ path }) => {
    expect(isTabActive(path, path)).toBe(true);
  });
});

describe("isTabActive", () => {
  it("ignores query strings, hashes, and trailing slashes", () => {
    expect(isTabActive("/feed/?sort=popular#top", "/feed")).toBe(true);
    expect(isTabActive("/lunchie/settings?intent=meal", "/lunchie/settings")).toBe(true);
  });

  it("matches genuine nested routes", () => {
    expect(isTabActive("/profile/following", "/profile")).toBe(true);
    expect(isTabActive("/saved/collections/weekend", "/saved")).toBe(true);
  });

  it("does not match lookalike prefixes", () => {
    expect(isTabActive("/feedback", "/feed")).toBe(false);
    expect(isTabActive("/saved-items", "/saved")).toBe(false);
    expect(isTabActive("/profiled", "/profile")).toBe(false);
    expect(isTabActive("/feed", "/")).toBe(false);
  });
});
