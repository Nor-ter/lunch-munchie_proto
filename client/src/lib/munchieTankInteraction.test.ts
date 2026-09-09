import { describe, expect, it } from 'vitest';
import {
  expandInteractionRect,
  isMunchieDrag,
  isPointInsideRect,
} from './munchieTankInteraction';

const tank = { left: 10, right: 310, top: 20, bottom: 420, width: 300, height: 400 };
const lunchmate = { left: 100, right: 220, top: 440, bottom: 550, width: 120, height: 110 };

describe('Snack Time Munchie drag target', () => {
  it('treats sub-threshold movement as a tap', () => {
    expect(isMunchieDrag(5, 5)).toBe(false);
    expect(isMunchieDrag(9, 0)).toBe(true);
  });

  it('distinguishes the Tank area from the Lunchmate target', () => {
    expect(isPointInsideRect({ x: 150, y: 210 }, tank)).toBe(true);
    expect(isPointInsideRect({ x: 150, y: 480 }, tank)).toBe(false);
    expect(isPointInsideRect({ x: 150, y: 480 }, lunchmate)).toBe(true);
  });

  it('gives the Snack Time Lunchmate a generous drop target', () => {
    expect(expandInteractionRect(lunchmate, 40)).toEqual({
      left: 60,
      right: 260,
      top: 400,
      bottom: 590,
      width: 200,
      height: 190,
    });
  });

  it('expands the existing Hatch hit area invisibly by 30px', () => {
    const hatch = { left: 110, right: 266, top: 420, bottom: 532, width: 156, height: 112 };
    const expandedHatch = expandInteractionRect(hatch, 30);

    expect(isPointInsideRect({ x: 90, y: 410 }, expandedHatch)).toBe(true);
    expect(isPointInsideRect({ x: 70, y: 410 }, expandedHatch)).toBe(false);
  });
});
