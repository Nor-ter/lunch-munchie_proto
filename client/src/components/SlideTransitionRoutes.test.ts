import { describe, expect, it } from "vitest";
import { getSlideDirection, isFeedListLocation } from "./SlideTransitionRoutes";

describe("Home and Quick Match route slide transitions", () => {
  it("animates home and settings in both directions", () => {
    expect(getSlideDirection("/", "/lunchie/settings")).toBe(1);
    expect(getSlideDirection("/lunchie/settings", "/")).toBe(-1);
  });
  it("preserves session transitions", () => {
    expect(getSlideDirection(undefined, "/home")).toBe(0);
    expect(getSlideDirection("/lunchie/settings", "/session/lobby")).toBe(1);
    expect(getSlideDirection("/session/lobby", "/lunchie/swipe")).toBe(1);
    expect(getSlideDirection("/lunchie/swipe", "/session/lobby")).toBe(-1);
  });
});

describe("feed list scroll restoration route matching", () => {
  it("treats the template-tab return URL as the feed list", () => {
    expect(isFeedListLocation("/feed?tab=template")).toBe(true);
  });

  it("does not treat feed detail routes as the feed list", () => {
    expect(isFeedListLocation("/feed/post-1")).toBe(false);
  });
});
