import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  calculateLunchboxSheetLayout,
  canDragLunchboxFood,
  isLunchboxDragGesture,
  isPointInsideLunchboxDropTarget,
  LUNCHBOX_DROP_TARGET_GAP_PX,
  type LunchboxFoodItem,
} from './LunchboxBottomSheet';

const COMPONENT_ROOT = join(process.cwd(), 'client', 'src', 'components', 'munchie');
const SHEET_SOURCE = readFileSync(join(COMPONENT_ROOT, 'LunchboxBottomSheet.tsx'), 'utf8');
const FOODIE_BUDDY_SOURCE = readFileSync(join(COMPONENT_ROOT, 'FoodieBuddy.tsx'), 'utf8');
const PROFILE_SOURCE = readFileSync(
  join(process.cwd(), 'client', 'src', 'pages', 'ProfilePage.tsx'),
  'utf8',
);
const FLOW_SOURCE = readFileSync(
  join(process.cwd(), 'client', 'src', 'hooks', 'useLunchmateFlow.ts'),
  'utf8',
);

const AVAILABLE_FOOD: LunchboxFoodItem = {
  id: 'preview-onigiri',
  name: '참치마요 주먹밥',
  placeholder: '🍙',
  quantity: 2,
  unseenQuantity: 1,
  sourceLabel: '코스 기록 완료 보상',
  xpPreview: 5,
};

describe('Lunchbox pointer feeding helpers', () => {
  it('allows only available food while a submission is not running', () => {
    expect(canDragLunchboxFood(AVAILABLE_FOOD, 'selectingFood')).toBe(true);
    expect(canDragLunchboxFood({ ...AVAILABLE_FOOD, quantity: 0 }, 'selectingFood')).toBe(false);
    expect(canDragLunchboxFood(AVAILABLE_FOOD, 'submitting')).toBe(false);
  });

  it('separates a short tap from a real pointer drag', () => {
    expect(isLunchboxDragGesture(
      { clientX: 20, clientY: 20 },
      { clientX: 24, clientY: 24 },
    )).toBe(false);
    expect(isLunchboxDragGesture(
      { clientX: 20, clientY: 20 },
      { clientX: 20, clientY: 29 },
    )).toBe(true);
  });

  it('accepts a drop only inside the character target bounds', () => {
    const bounds = { left: 100, right: 216, top: 40, bottom: 130 };
    expect(isPointInsideLunchboxDropTarget({ clientX: 158, clientY: 90 }, bounds)).toBe(true);
    expect(isPointInsideLunchboxDropTarget({ clientX: 99, clientY: 90 }, bounds)).toBe(false);
    expect(isPointInsideLunchboxDropTarget({ clientX: 158, clientY: 131 }, bounds)).toBe(false);
  });
});

describe('Lunchbox visual viewport layout', () => {
  it('places the mobile Sheet at least 12px below the character target', () => {
    const characterBottom = 300;
    const layout = calculateLunchboxSheetLayout({
      viewportWidth: 390,
      innerHeight: 844,
      visualViewportHeight: 650,
      visualViewportOffsetTop: 50,
      characterBottom,
    });

    expect(layout.top - characterBottom).toBe(LUNCHBOX_DROP_TARGET_GAP_PX);
    expect(layout.height).toBe(388);
    expect(layout.bottomOffset).toBe(144);
  });

  it('falls back to innerHeight when visualViewport is unavailable', () => {
    const characterBottom = 250;
    const layout = calculateLunchboxSheetLayout({
      viewportWidth: 390,
      innerHeight: 700,
      characterBottom,
    });

    expect(layout.visibleHeight).toBe(700);
    expect(layout.top - characterBottom).toBe(LUNCHBOX_DROP_TARGET_GAP_PX);
    expect(layout.bottomOffset).toBe(0);
  });

  it('keeps the existing 72 percent and 560px cap on desktop', () => {
    const layout = calculateLunchboxSheetLayout({
      viewportWidth: 800,
      innerHeight: 900,
      characterBottom: 300,
    });

    expect(layout.height).toBe(560);
    expect(layout.top).toBe(340);
    expect(layout.bottomOffset).toBe(0);
  });

  it('uses the character boundary on a wide but unusually short viewport', () => {
    const characterBottom = 200;
    const layout = calculateLunchboxSheetLayout({
      viewportWidth: 800,
      innerHeight: 400,
      characterBottom,
    });

    expect(layout.top - characterBottom).toBe(LUNCHBOX_DROP_TARGET_GAP_PX);
    expect(layout.height).toBe(188);
  });
});

describe('Lunchbox pointer feeding integration contract', () => {
  it('keeps the Bottom Sheet to a short tap selection before returning to Profile', () => {
    expect(SHEET_SOURCE).toContain('setSelectedId(item.id)');
    expect(SHEET_SOURCE).toContain('onFoodSelect(item)');
    expect(SHEET_SOURCE).toContain('window.setTimeout');
    expect(SHEET_SOURCE).toContain('180');
    expect(SHEET_SOURCE).toContain("data-lunchbox-food-selectable={selectable ? 'true' : 'false'}");
    expect(SHEET_SOURCE).not.toContain('onShare:');
    expect(SHEET_SOURCE).not.toContain('handleFoodPointerDown');
  });

  it('renders the selected food on Profile and shares only after a valid Profile drop', () => {
    const dropStart = PROFILE_SOURCE.indexOf('const handleFoodDrop');
    const dropEnd = PROFILE_SOURCE.indexOf('const openLunchbox', dropStart);
    const dropHandler = PROFILE_SOURCE.slice(dropStart, dropEnd);

    expect(dropHandler.indexOf('lunchmateFlow.selectFood(payload.item)'))
      .toBeLessThan(dropHandler.indexOf('submitLunchmateFood(payload.item)'));
    expect(dropHandler).toContain('feedingDropGuardRef.current');
    expect(dropHandler).toContain('isOverFoodieDropTarget(payload)');
    expect(dropHandler).toContain('lunchmateFlow.selectedFood?.id !== payload.item.id');
    expect(PROFILE_SOURCE).toContain('selectedFood={lunchmateFlow.isBusy ? null : lunchmateFlow.selectedFood}');
    expect(PROFILE_SOURCE).toContain('onFoodDrop={handleFoodDrop}');
    // 86px character + 15px 여유씩인 116px target이 drop hit area 역할을 한다.
    expect(FOODIE_BUDDY_SOURCE).toContain('w-[116px]');
    expect(FOODIE_BUDDY_SOURCE).toContain('w-[86px]');
    expect(FOODIE_BUDDY_SOURCE).toContain('data-profile-food-drag-handle="true"');
    expect(FOODIE_BUDDY_SOURCE).toContain('setPointerCapture(event.pointerId)');
    expect(FOODIE_BUDDY_SOURCE).toContain('isLunchboxDragGesture(');
    expect(FOODIE_BUDDY_SOURCE).toContain('onFoodDrop?.({');
  });

  it('uses the banner handle guidance for selected food, drop, feeding, success, and error', () => {
    expect(FOODIE_BUDDY_SOURCE).toContain('나에게 끌어다 줘!');
    expect(FOODIE_BUDDY_SOURCE).toContain('여기에 놓아주세요!');
    expect(FOODIE_BUDDY_SOURCE).toContain('맛있게 먹는 중…');
    expect(FOODIE_BUDDY_SOURCE).toContain("effectiveUiState === 'error'");
    expect(FOODIE_BUDDY_SOURCE).toContain("resultMessage ?? '맛있는 한입 고마워! 😋'");
  });

  it('keeps fixture quantities and the preview-only flow immutable', () => {
    expect(PROFILE_SOURCE).toContain("id: 'preview-onigiri'");
    expect(PROFILE_SOURCE).toContain('quantity: 2');
    expect(PROFILE_SOURCE).toContain("id: 'preview-strawberry-cake'");
    expect(PROFILE_SOURCE).toContain('quantity: 1');
    expect(PROFILE_SOURCE).toContain("id: 'preview-ramen'");
    expect(PROFILE_SOURCE).toContain('quantity: 0');
    expect(FLOW_SOURCE).not.toContain('quantity -');
    expect(FLOW_SOURCE).not.toContain('localStorage');
    expect(FLOW_SOURCE).toContain('setPreviewXp(nextXp)');
  });

  it('remeasures on visual viewport changes and cleans up every observer', () => {
    expect(SHEET_SOURCE).toContain("visualViewport?.addEventListener('resize', scheduleMeasure)");
    expect(SHEET_SOURCE).toContain("window.addEventListener('orientationchange', scheduleMeasure)");
    expect(SHEET_SOURCE).toContain("visualViewport?.removeEventListener('resize', scheduleMeasure)");
    expect(SHEET_SOURCE).toContain("window.removeEventListener('orientationchange', scheduleMeasure)");
    expect(SHEET_SOURCE).toContain('new ResizeObserver(scheduleMeasure)');
    expect(SHEET_SOURCE).toContain('resizeObserver?.disconnect()');
    expect(PROFILE_SOURCE).toContain('dropTargetRef={foodieDropTargetRef}');
  });

  it('keeps only the food list scrollable with sticky header and selection feedback', () => {
    expect(SHEET_SOURCE).toContain('className="sticky top-0 z-10 shrink-0 bg-white px-5 pt-4"');
    expect(SHEET_SOURCE).toContain('className="min-h-0 flex-1 touch-pan-y overflow-y-auto');
    expect(SHEET_SOURCE).toContain('className="sticky bottom-0 z-10 shrink-0 border-t');
    expect(SHEET_SOURCE).toContain('env(safe-area-inset-bottom,0px)');
  });

  it('renders the fixed drag preview from Profile instead of inside the Sheet', () => {
    expect(SHEET_SOURCE).not.toContain('data-lunchbox-drag-preview="true"');
    expect(FOODIE_BUDDY_SOURCE).toContain('pointer-events-none fixed z-[120]');
    expect(FOODIE_BUDDY_SOURCE).toContain('h-[70px] w-[70px]');
    expect(FOODIE_BUDDY_SOURCE).toContain('data-profile-food-drag-preview="true"');
  });

  it('presents selected food as food on a plate rather than another white action tile', () => {
    expect(FOODIE_BUDDY_SOURCE).toContain('data-profile-food-drag-handle="true"');
    expect(FOODIE_BUDDY_SOURCE).toContain('bg-transparent p-0');
    expect(FOODIE_BUDDY_SOURCE).toContain('h-[68px] w-[68px]');
    expect(FOODIE_BUDDY_SOURCE).toContain('rounded-[50%] border border-white/70 bg-[#FFF7ED]/90');
    expect(FOODIE_BUDDY_SOURCE).not.toContain('data-profile-food-drag-hint="true"');
    expect(FOODIE_BUDDY_SOURCE).toContain('profileFoodDragPreview ? 0 : 1');
  });

  it('keeps the selection guidance in the Sheet without an in-Sheet drag backdrop', () => {
    expect(SHEET_SOURCE).toContain(
      '음식을 선택하면 프로필에서 런치메이트에게 직접 전해줄 수 있어요.',
    );
    expect(SHEET_SOURCE).toContain('bg-black/40');
    expect(SHEET_SOURCE).not.toContain('dragPreview ?');
  });
});
