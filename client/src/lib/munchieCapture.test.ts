import { describe, expect, it } from 'vitest';
import {
  createCapturedMunchie,
  displayImageForCapturedMunchie,
  markCapturedMunchieFedInCollection,
  normalizeCapturedMunchieCollection,
  updateCapturedMunchiePlacementInCollection,
} from './munchieCapture';

const originalImage = 'data:image/jpeg;base64,original';
const cutoutImage = 'data:image/webp;base64,cutout';

describe('captured Munchie v1 compatibility', () => {
  it('keeps an existing Phase 1A item and its stored placement unchanged', () => {
    const existing = {
      id: 'capture_phase_1a',
      originalImage,
      createdAt: 1_700_000_000_000,
      placement: { xPercent: 19, bottomPercent: 7, sizePx: 88, rotationDeg: -8 },
    };

    expect(normalizeCapturedMunchieCollection({ version: 1, items: [existing] })).toEqual({
      version: 1,
      items: [existing],
    });
  });

  it('uses the transparent cutout when present and the original image otherwise', () => {
    const fallback = createCapturedMunchie(originalImage, 0);
    const cutout = createCapturedMunchie(originalImage, 1, cutoutImage);

    expect(displayImageForCapturedMunchie(fallback)).toBe(originalImage);
    expect(displayImageForCapturedMunchie(cutout)).toBe(cutoutImage);
  });

  it('restores optional feeding metadata while keeping legacy v1 items compatible', () => {
    const legacy = createCapturedMunchie(originalImage, 0);
    const fed = {
      ...createCapturedMunchie(originalImage, 1, cutoutImage),
      fedAt: 1_700_000_123_456,
      xpGranted: 20,
    };

    const restored = normalizeCapturedMunchieCollection({ version: 1, items: [legacy, fed] });
    expect(restored.version).toBe(1);
    expect(restored.items[0]).not.toHaveProperty('fedAt');
    expect(restored.items[0]).not.toHaveProperty('xpGranted');
    expect(restored.items[1]).toMatchObject({ fedAt: fed.fedAt, xpGranted: 20 });
  });

  it('marks only the selected item fed without removing image or placement data', () => {
    const selected = createCapturedMunchie(originalImage, 0, cutoutImage);
    const other = createCapturedMunchie(originalImage, 1);
    const result = markCapturedMunchieFedInCollection(
      [selected, other],
      selected.id,
      20,
      1_700_000_123_456,
    );

    expect(result.updated).toBe(true);
    expect(result.items).toHaveLength(2);
    expect(result.item).toEqual({
      ...selected,
      fedAt: 1_700_000_123_456,
      xpGranted: 20,
    });
    expect(result.items[1]).toBe(other);
  });

  it('updates only position, clamps it to the Tank, and preserves all other v1 data', () => {
    const selected = {
      ...createCapturedMunchie(originalImage, 0, cutoutImage),
      fedAt: 1_700_000_123_456,
      xpGranted: 20,
    };
    const other = createCapturedMunchie(originalImage, 1);
    const result = updateCapturedMunchiePlacementInCollection(
      [selected, other],
      selected.id,
      { ...selected.placement, xPercent: 120, bottomPercent: -30 },
    );

    expect(result.updated).toBe(true);
    expect(result.item).toEqual({
      ...selected,
      placement: { ...selected.placement, xPercent: 90, bottomPercent: 3 },
    });
    expect(result.items[1]).toBe(other);
    expect(normalizeCapturedMunchieCollection({ version: 1, items: result.items }).items[0])
      .toEqual(result.item);
  });

  it('keeps every valid item and creates safe placement beyond the original six slots', () => {
    const bottomItem = createCapturedMunchie(originalImage, 0);
    const secondRowItem = createCapturedMunchie(originalImage, 5);
    const seventhItem = createCapturedMunchie(originalImage, 6);
    const expandedCollection = Array.from({ length: 10 }, (_, index) => ({
      ...createCapturedMunchie(originalImage, index),
      id: `capture_${index}`,
    }));

    expect(bottomItem.placement.bottomPercent).toBeLessThan(8);
    expect(secondRowItem.placement.bottomPercent).toBeGreaterThan(13);
    expect(seventhItem.placement).toMatchObject({
      xPercent: expect.any(Number),
      bottomPercent: expect.any(Number),
      sizePx: expect.any(Number),
      rotationDeg: expect.any(Number),
    });
    expect(normalizeCapturedMunchieCollection({ version: 1, items: expandedCollection }).items)
      .toHaveLength(10);
  });
});
