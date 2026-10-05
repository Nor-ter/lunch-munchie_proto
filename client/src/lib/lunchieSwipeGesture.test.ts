import { describe, expect, it } from "vitest";
import { lunchieSwipeExit, resolveLunchieSwipeGesture } from "./lunchieSwipeGesture";

describe("resolveLunchieSwipeGesture", () => {
  it("maps left, right, and down to the three vote actions", () => {
    expect(resolveLunchieSwipeGesture({ offsetX: -120, offsetY: 10 })).toBe(
      "dislike",
    );
    expect(resolveLunchieSwipeGesture({ offsetX: 120, offsetY: 10 })).toBe(
      "like",
    );
    expect(resolveLunchieSwipeGesture({ offsetX: 12, offsetY: 120 })).toBe(
      "neutral",
    );
  });

  it("accepts a deliberate flick and ignores short or upward gestures", () => {
    expect(
      resolveLunchieSwipeGesture({ offsetX: 36, offsetY: 2, velocityX: 900 }),
    ).toBe("like");
    expect(resolveLunchieSwipeGesture({ offsetX: 22, offsetY: 18 })).toBeNull();
    expect(
      resolveLunchieSwipeGesture({ offsetX: 4, offsetY: -140 }),
    ).toBeNull();
  });

  it("uses the dominant direction for diagonal gestures", () => {
    expect(resolveLunchieSwipeGesture({ offsetX: 82, offsetY: 125 })).toBe(
      "neutral",
    );
    expect(resolveLunchieSwipeGesture({ offsetX: -140, offsetY: 70 })).toBe(
      "dislike",
    );
  });

  it("uses the same visible exit direction for button taps and card gestures", () => {
    expect(lunchieSwipeExit("dislike")).toEqual({ x: -520, y: 18 });
    expect(lunchieSwipeExit("neutral")).toEqual({ x: 0, y: 720 });
    expect(lunchieSwipeExit("like")).toEqual({ x: 520, y: 18 });
  });
});
