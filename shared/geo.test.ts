import { describe, expect, it } from "vitest";
import { distanceMetres, isWithinRadius } from "./geo";

describe("Lunchie distance constraint", () => {
  it("uses great-circle distance in metres", () => {
    // Melbourne CBD → Carlton is approximately 1.5 km.
    expect(
      distanceMetres(-37.8136, 144.9631, -37.8007, 144.9534),
    ).toBeGreaterThan(1_000);
  });

  it("keeps only valid venues inside the selected radius", () => {
    expect(isWithinRadius(-37.8136, 144.9631, -37.8128, 144.9614, 500)).toBe(
      true,
    );
    expect(isWithinRadius(-37.8136, 144.9631, -37.7982, 144.9857, 500)).toBe(
      false,
    );
    expect(isWithinRadius(-37.8136, 144.9631, null, 144.9614, 500)).toBe(
      false,
    );
  });
});
