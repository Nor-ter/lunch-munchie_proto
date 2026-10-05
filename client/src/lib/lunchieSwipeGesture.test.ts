import { describe, expect, it } from "vitest";
import {
  lunchieSwipeArc,
  lunchieSwipeExit,
  resolveLunchieSwipeGesture,
} from "./lunchieSwipeGesture";

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

  it("builds one smooth sampled curve from rest through the full exit", () => {
    for (const action of ["like", "dislike", "neutral"] as const) {
      const arc = lunchieSwipeArc(action, { x: 0, y: 0 });
      expect(arc.x).toHaveLength(9);
      expect(arc.y).toHaveLength(9);
      expect(arc.scale).toHaveLength(9);
      expect(arc.times).toEqual([0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1]);
      expect({ x: arc.x[0], y: arc.y[0], scale: arc.scale[0] }).toEqual({ x: 0, y: 0, scale: 1 });
      expect(arc.scale.at(-1)).toBe(0.97);
    }

    const like = lunchieSwipeArc("like", { x: 0, y: 0 });
    const dislike = lunchieSwipeArc("dislike", { x: 0, y: 0 });
    const neutral = lunchieSwipeArc("neutral", { x: 0, y: 0 });
    expect(like.x.at(-1)).toBe(520);
    expect(dislike.x.at(-1)).toBe(-520);
    expect(neutral.y.at(-1)).toBe(720);
    expect(Math.min(...like.y)).toBeLessThan(-40);
    expect(Math.max(...neutral.x)).toBeGreaterThan(40);
  });
});
