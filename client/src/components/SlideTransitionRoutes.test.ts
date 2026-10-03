import { describe, expect, it } from "vitest";
import { getSlideDirection } from "./SlideTransitionRoutes";

describe("Quick Match route slide transitions", () => {
  it("does not animate the removed home route", () => {
    expect(getSlideDirection("/home", "/lunchie/settings")).toBe(0);
    expect(getSlideDirection("/lunchie/settings", "/home")).toBe(0);
  });
  it("does not animate the default redirect and preserves session transitions", () => {
    expect(getSlideDirection("/", "/lunchie/settings")).toBe(0);
    expect(getSlideDirection(undefined, "/home")).toBe(0);
    expect(getSlideDirection("/lunchie/settings", "/session/lobby")).toBe(1);
    expect(getSlideDirection("/session/lobby", "/lunchie/swipe")).toBe(1);
    expect(getSlideDirection("/lunchie/swipe", "/session/lobby")).toBe(-1);
  });
});
