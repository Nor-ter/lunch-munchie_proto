import { describe, expect, it } from "vitest";
import { getSlideDirection, isFeedListLocation } from "./SlideTransitionRoutes";

describe("home route slide transitions", () => {
  it("supports repeated home/settings round trips", () => {
    for (let index = 0; index < 3; index += 1) {
      expect(getSlideDirection("/home", "/lunchie/settings")).toBe(1);
      expect(getSlideDirection("/lunchie/settings", "/home")).toBe(-1);
    }
  });
  it("does not animate the default redirect and preserves session transitions", () => {
    expect(getSlideDirection("/", "/lunchie/settings")).toBe(0);
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
