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
  it('keeps tap selection and CTA sharing while adding touch-safe pointer handlers', () => {
    expect(SHEET_SOURCE).toContain('setPointerCapture(event.pointerId)');
    expect(SHEET_SOURCE).toContain('touch-none');
    expect(SHEET_SOURCE).toContain('onPointerMove');
    expect(SHEET_SOURCE).toContain('onPointerUp');
    expect(SHEET_SOURCE).toContain('setSelectedId(item.id)');
    expect(SHEET_SOURCE).toContain('onFoodSelect(item)');
    expect(SHEET_SOURCE).toContain('selectedItem && onShare(selectedItem)');
    expect(SHEET_SOURCE).toContain("data-lunchbox-food-draggable={draggable ? 'true' : 'false'}");
    expect(SHEET_SOURCE).toContain('data-lunchbox-bento-tray="true"');
    expect(SHEET_SOURCE).toContain('data-lunchbox-bento-compartment="true"');
    expect(SHEET_SOURCE).toContain('handleFoodPointerDown(event, item, selected)');
    expect(SHEET_SOURCE).toContain("event.pointerType === 'touch' && !allowTouchDrag");
    expect(SHEET_SOURCE).toContain("data-lunchbox-touch-mode={selected ? 'drag' : 'scroll'}");
    expect(SHEET_SOURCE).toContain('data-lunchbox-scroll-region="true"');
  });

  it('stages the first drop and feeds only after the staged food is dropped again', () => {
    const stageStart = PROFILE_SOURCE.indexOf('const handleLunchboxFoodDrop');
    const feedStart = PROFILE_SOURCE.indexOf('const handleStagedFoodDrop', stageStart);
    const openStart = PROFILE_SOURCE.indexOf('const openLunchbox', feedStart);
    const stageHandler = PROFILE_SOURCE.slice(stageStart, feedStart);
    const feedHandler = PROFILE_SOURCE.slice(feedStart, openStart);

    expect(stageHandler).toContain('lunchmateFlow.selectFood(payload.item)');
    expect(stageHandler).toContain('closeActiveSheet()');
    expect(stageHandler).not.toContain('submitLunchmateFood(payload.item)');
    expect(feedHandler).toContain('feedingDropGuardRef.current');
    expect(feedHandler).toContain('submitLunchmateFood(payload.item)');
    expect(PROFILE_SOURCE).toContain('onShare={stageLunchmateFood}');
    expect(PROFILE_SOURCE).toContain('onFoodDrop={handleLunchboxFoodDrop}');
    expect(PROFILE_SOURCE).toContain('onFoodDrop={handleStagedFoodDrop}');
  });

  it('shows the selected food prompt, drag-over, feeding, success, and error states', () => {
    expect(FOODIE_BUDDY_SOURCE).toContain('을 나에게 끌어다 줘!');
    expect(FOODIE_BUDDY_SOURCE).toContain('여기에 놓아주세요!');
    expect(FOODIE_BUDDY_SOURCE).toContain('맛있게 먹는 중…');
    expect(FOODIE_BUDDY_SOURCE).toContain("effectiveUiState === 'error'");
    expect(FOODIE_BUDDY_SOURCE).toContain("resultMessage ?? '맛있는 한입 고마워! 😋'");
  });

  it('uses canonical inventory and consumes one item only after a successful feed', () => {
    expect(PROFILE_SOURCE).toContain('items={lunchboxFoodItems}');
    expect(PROFILE_SOURCE).toContain('normalizeLunchboxInventory(profile.lunchboxInventory)');
    expect(PROFILE_SOURCE).toContain('consumeLunchboxFood(profile.lunchboxInventory, item.id)');
    expect(PROFILE_SOURCE).toContain('initialTotalXp: lunchmateTotalXp');
    expect(PROFILE_SOURCE).toContain('onTotalXpChange: persistLunchmateTotalXp');
    expect(PROFILE_SOURCE).toContain('onFoodConsumed: persistConsumedFood');
    expect(PROFILE_SOURCE).toContain('updateProfile({ lunchmateTotalXp: nextTotalXp })');
    expect(FLOW_SOURCE.indexOf('await shareBiteMock(item, attempt, controller.signal)'))
      .toBeLessThan(FLOW_SOURCE.indexOf('onFoodConsumed(item)'));
    expect(FLOW_SOURCE).not.toContain('localStorage');
    expect(FLOW_SOURCE).toContain('setPreviewXp(progressUpdate.nextTotalXp)');
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

  it('keeps only the food list scrollable with sticky header and CTA', () => {
    expect(SHEET_SOURCE).toContain('className="sticky top-0 z-10 shrink-0 bg-white px-5 pt-4"');
    expect(SHEET_SOURCE).toContain('className="min-h-0 flex-1 touch-pan-y overflow-y-auto');
    expect(SHEET_SOURCE).toContain('className="sticky bottom-0 z-10 shrink-0 border-t');
    expect(SHEET_SOURCE).toContain('env(safe-area-inset-bottom,0px)');
  });

  it('renders the fixed drag preview outside the overflow-hidden Sheet panel', () => {
    const panelEnd = SHEET_SOURCE.indexOf('</motion.section>');
    const previewStart = SHEET_SOURCE.indexOf('{dragPreview && (');
    const previewSource = SHEET_SOURCE.slice(previewStart);

    expect(previewStart).toBeGreaterThan(panelEnd);
    expect(previewSource).toContain('pointer-events-none fixed z-[103]');
    expect(previewSource).toContain('h-14 w-14');
    expect(previewSource).toContain('data-lunchbox-drag-preview="true"');
  });

  it('keeps the feeding guidance and lowers only the backdrop contrast while dragging', () => {
    expect(SHEET_SOURCE).toContain(
      '위아래로 밀어 메뉴를 보고, 탭한 음식은 통째로 끌어주세요.',
    );
    expect(SHEET_SOURCE).toContain("dragPreview ? 'bg-black/[0.32]' : 'bg-black/40'");
  });
});
