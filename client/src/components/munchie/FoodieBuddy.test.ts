import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lunchmateChickenFaceAssets } from '../../constants/lunchmateAssets';
import {
  createLunchmateProfileTapInteractionController,
  type LunchmateProfileTapFace,
} from './FoodieBuddy';

function touch(pointerId: number, clientX: number, clientY: number) {
  return { pointerId, pointerType: 'touch', clientX, clientY };
}

function createHarness() {
  const faces: Array<LunchmateProfileTapFace | null> = [];
  const controller = createLunchmateProfileTapInteractionController((face) => {
    faces.push(face);
  });
  const faceSrc = () => lunchmateChickenFaceAssets[
    controller.getSnapshot().face ?? 'default'
  ].src;

  return { controller, faces, faceSrc };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('FoodieBuddy Profile touch face integration', () => {
  it('maps touch pointer taps through surprised, crying, and angry face srcs', () => {
    vi.useFakeTimers();
    const { controller, faceSrc } = createHarness();

    controller.pointerDown(touch(1, 100, 120), true);
    expect(controller.pointerMove(touch(1, 102, 121))).toBe(false);
    expect(controller.pointerUp(touch(1, 102, 121), {
      blocked: false,
      wasGrabbed: false,
    })).toBe('surprised');
    expect(faceSrc()).toBe(lunchmateChickenFaceAssets.surprised.src);

    controller.pointerDown(touch(2, 100, 120), true);
    controller.pointerUp(touch(2, 101, 121), {
      blocked: false,
      wasGrabbed: false,
    });
    expect(faceSrc()).toBe(lunchmateChickenFaceAssets.crying.src);

    controller.pointerDown(touch(3, 100, 120), true);
    controller.pointerUp(touch(3, 100, 121), {
      blocked: false,
      wasGrabbed: false,
    });
    expect(faceSrc()).toBe(lunchmateChickenFaceAssets.angry.src);
  });

  it('does not treat an 8px character movement or pointer cancellation as a tap', () => {
    const { controller, faces } = createHarness();

    controller.pointerDown(touch(1, 100, 120), true);
    expect(controller.pointerMove(touch(1, 108, 120))).toBe(true);
    expect(controller.pointerUp(touch(1, 108, 120), {
      blocked: false,
      wasGrabbed: false,
    })).toBeNull();

    controller.pointerDown(touch(2, 100, 120), true);
    controller.pointerCancel(2);
    expect(controller.pointerUp(touch(2, 101, 120), {
      blocked: false,
      wasGrabbed: false,
    })).toBeNull();
    expect(faces).toEqual([]);
  });

  it('allows a selected-food idle Profile tap and a just-closed Lunchbox tap, but blocks a real food drag', () => {
    const { controller, faceSrc } = createHarness();

    // selectedFood being visible is deliberately not an interaction block.
    controller.pointerDown(touch(1, 100, 120), true);
    controller.pointerUp(touch(1, 102, 121), {
      blocked: false,
      wasGrabbed: false,
    });
    expect(faceSrc()).toBe(lunchmateChickenFaceAssets.surprised.src);

    // Closing the Sheet returns isLunchboxOpen to false, which is also eligible.
    controller.clear(true);
    controller.pointerDown(touch(2, 100, 120), true);
    controller.pointerUp(touch(2, 102, 121), {
      blocked: false,
      wasGrabbed: false,
    });
    expect(faceSrc()).toBe(lunchmateChickenFaceAssets.surprised.src);

    controller.clear(true);
    controller.pointerDown(touch(3, 100, 120), false);
    controller.pointerUp(touch(3, 102, 121), {
      blocked: true,
      wasGrabbed: false,
    });
    expect(faceSrc()).toBe(lunchmateChickenFaceAssets.default.src);
  });

  it('returns to the default face after the two-second streak window', () => {
    vi.useFakeTimers();
    const { controller, faceSrc } = createHarness();

    controller.pointerDown(touch(1, 100, 120), true);
    controller.pointerUp(touch(1, 102, 120), {
      blocked: false,
      wasGrabbed: false,
    });
    expect(faceSrc()).toBe(lunchmateChickenFaceAssets.surprised.src);

    vi.advanceTimersByTime(2_000);
    expect(controller.getSnapshot()).toMatchObject({ face: null, streak: 0 });
    expect(faceSrc()).toBe(lunchmateChickenFaceAssets.default.src);
  });

  it('keeps touch pointer capture on the character wrapper until pointerup', () => {
    const source = readFileSync(join(process.cwd(), 'client', 'src', 'components', 'munchie', 'FoodieBuddy.tsx'), 'utf8');

    expect(source).toContain('event.currentTarget.setPointerCapture(event.pointerId)');
    expect(source).toContain('event.currentTarget.releasePointerCapture(event.pointerId)');
    expect(source).toContain('pointerType: event.pointerType');
    expect(source).not.toContain('event.buttons !== 1');
  });

  it('keeps the selected food enabled while its floating preview follows the pointer', () => {
    const source = readFileSync(join(process.cwd(), 'client', 'src', 'components', 'munchie', 'FoodieBuddy.tsx'), 'utf8');
    const eligibilityStart = source.indexOf('const canDragSelectedFood');
    const eligibilityEnd = source.indexOf('const clearProfileFoodDrag', eligibilityStart);

    expect(source.slice(eligibilityStart, eligibilityEnd)).not.toContain('&& !isFoodDragging');
    expect(source).toContain('setProfileFoodDragPreview(payload)');
    expect(source).toContain('data-profile-food-drag-preview="true"');
    expect(source).toContain('left: profileFoodDragPreview.clientX');
    expect(source).toContain('top: profileFoodDragPreview.clientY');
    expect(source).toContain("import { createPortal } from 'react-dom'");
    expect(source).toContain('document.body');
    expect(source).toContain('disabled={!canDragSelectedFood && !isProfileFoodPointerActive}');
  });
});
