import { describe, expect, it } from "vitest";
import { isFeedListLocation } from "./SlideTransitionRoutes";

describe("feed list scroll restoration route matching", () => {
  it("treats the template-tab return URL as the feed list", () => {
    expect(isFeedListLocation("/feed?tab=template")).toBe(true);
  });

  it("does not treat feed detail routes as the feed list", () => {
    expect(isFeedListLocation("/feed/post-1")).toBe(false);
  });
});
