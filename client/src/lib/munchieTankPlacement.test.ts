import { describe, expect, it } from 'vitest';
import {
  createMunchieTankPlacement,
  getMunchieTankPresentation,
  munchieTankSizeScale,
} from './munchieTankPlacement';
import type { CapturedMunchie } from '@/types/munchieCapture';

const itemCounts = [1, 5, 10, 15, 20, 21, 30];

function munchieAt(index: number): CapturedMunchie {
  return {
    id: `munchie-${index}`,
    originalImage: 'blob:image',
    createdAt: 1_700_000_000_000 + index,
    placement: createMunchieTankPlacement(`munchie-${index}`, index),
  };
}

describe('Big Munchie Tank placement', () => {
  it.each(itemCounts)('creates defined in-bounds placement for %i items', (count) => {
    const items = Array.from({ length: count }, (_, index) => munchieAt(index));

    items.forEach((item, index) => {
      const presentation = getMunchieTankPresentation(item, index, count);
      expect(presentation).toBeDefined();
      expect(presentation.xPercent).toBeGreaterThanOrEqual(10);
      expect(presentation.xPercent).toBeLessThanOrEqual(90);
      expect(presentation.bottomPercent).toBeGreaterThanOrEqual(3);
      expect(presentation.bottomPercent).toBeLessThanOrEqual(78);
      expect(presentation.sizePx).toBeGreaterThanOrEqual(56);
      expect(presentation.sizePx).toBeLessThanOrEqual(108);
      expect(presentation.rotationDeg).toBeGreaterThanOrEqual(-12);
      expect(presentation.rotationDeg).toBeLessThanOrEqual(12);
      expect(Number.isFinite(presentation.zIndex)).toBe(true);
    });
  });

  it('is deterministic for the same id and insertion index', () => {
    expect(createMunchieTankPlacement('ramen-id', 14))
      .toEqual(createMunchieTankPlacement('ramen-id', 14));
  });

  it('fills the Tank from the bottom upward without forming one repeated slot', () => {
    const placements = Array.from({ length: 20 }, (_, index) => (
      createMunchieTankPlacement(`munchie-${index}`, index)
    ));
    const uniqueCoordinates = new Set(
      placements.map(placement => `${placement.xPercent.toFixed(1)}:${placement.bottomPercent.toFixed(1)}`),
    );

    expect(placements[0]!.bottomPercent).toBeLessThan(7);
    expect(placements[4]!.bottomPercent).toBeGreaterThan(15);
    expect(placements[8]!.bottomPercent).toBeGreaterThan(29);
    expect(placements[12]!.bottomPercent).toBeGreaterThan(43);
    expect(placements[18]!.bottomPercent).toBeGreaterThan(70);
    expect(uniqueCoordinates.size).toBe(20);
  });

  it('builds ten items as connected 4 + 4 + 2 bottom-up layers', () => {
    const placements = Array.from({ length: 10 }, (_, index) => (
      createMunchieTankPlacement(`munchie-${index}`, index)
    ));

    expect(placements.slice(0, 4).every(placement => placement.bottomPercent < 7)).toBe(true);
    expect(placements.slice(4, 8).every(placement => (
      placement.bottomPercent > 15 && placement.bottomPercent < 21
    ))).toBe(true);
    expect(placements.slice(8, 10).every(placement => (
      placement.bottomPercent > 29 && placement.bottomPercent < 35
    ))).toBe(true);
  });

  it('keeps upper items close to an earlier supporting item at ten items', () => {
    const placements = Array.from({ length: 10 }, (_, index) => (
      createMunchieTankPlacement(`munchie-${index}`, index)
    ));

    placements.slice(4).forEach((placement, relativeIndex) => {
      const itemIndex = relativeIndex + 4;
      const nearestEarlierDistance = Math.min(...placements.slice(0, itemIndex).map(previous => (
        Math.hypot(
          placement.xPercent - previous.xPercent,
          (placement.bottomPercent - previous.bottomPercent) * 1.25,
        )
      )));
      expect(nearestEarlierDistance).toBeLessThan(29);
    });
  });

  it('adapts rendered size as the Tank gets fuller without creating a hard capacity', () => {
    expect(munchieTankSizeScale(1)).toBe(1);
    expect(munchieTankSizeScale(5)).toBe(1);
    expect(munchieTankSizeScale(10)).toBe(0.86);
    expect(munchieTankSizeScale(15)).toBe(0.76);
    expect(munchieTankSizeScale(20)).toBe(0.76);
    expect(munchieTankSizeScale(50)).toBeGreaterThan(0);
  });

  it('normalizes legacy placement only for rendering without mutating it', () => {
    const legacy: CapturedMunchie = {
      id: 'legacy',
      originalImage: 'blob:legacy',
      createdAt: 1,
      placement: { xPercent: 19, bottomPercent: 7, sizePx: 88, rotationDeg: -8 },
    };
    const originalPlacement = { ...legacy.placement };

    const presentation = getMunchieTankPresentation(legacy, 0, 15);

    expect(legacy.placement).toEqual(originalPlacement);
    expect(presentation.xPercent).toBeGreaterThanOrEqual(10);
    expect(presentation.xPercent).toBeLessThanOrEqual(90);
    expect(presentation.bottomPercent).toBeGreaterThanOrEqual(3);
    expect(presentation.bottomPercent).toBeLessThanOrEqual(78);
    expect(presentation.rotationDeg).toBe(-8);
    expect(presentation.sizePx).toBeLessThan(legacy.placement.sizePx);
  });
});
