import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, LockKeyhole, X } from 'lucide-react';
import type { FoodieBuddyUiState } from '@/components/munchie/FoodieBuddy';

export interface LunchboxFoodItem {
  id: string;
  name: string;
  image?: string;
  placeholder?: string;
  quantity: number;
  unseenQuantity: number;
  sourceLabel: string;
  xpPreview: number;
}

export interface LunchboxFoodDragPayload {
  item: LunchboxFoodItem;
  clientX: number;
  clientY: number;
}

export interface LunchboxDropTargetBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export const LUNCHBOX_DRAG_THRESHOLD_PX = 8;
export const LUNCHBOX_DROP_TARGET_GAP_PX = 12;
export const LUNCHBOX_MOBILE_MIN_HEIGHT_PX = 220;
export const LUNCHBOX_DESKTOP_BREAKPOINT_PX = 450;
export const LUNCHBOX_DESKTOP_MAX_HEIGHT_PX = 560;
export const LUNCHBOX_VIEWPORT_HEIGHT_RATIO = 0.72;

export interface LunchboxSheetLayoutInput {
  viewportWidth: number;
  innerHeight: number;
  visualViewportHeight?: number;
  visualViewportOffsetTop?: number;
  characterBottom?: number;
}

export interface LunchboxSheetLayout {
  height: number;
  top: number;
  bottomOffset: number;
  visibleHeight: number;
}

export function calculateLunchboxSheetLayout({
  viewportWidth,
  innerHeight,
  visualViewportHeight,
  visualViewportOffsetTop = 0,
  characterBottom,
}: LunchboxSheetLayoutInput): LunchboxSheetLayout {
  const visibleHeight = Math.max(0, visualViewportHeight ?? innerHeight);
  const visibleTop = visualViewportHeight === undefined ? 0 : visualViewportOffsetTop;
  const visibleBottom = visibleTop + visibleHeight;
  const preferredHeight = Math.min(
    visibleHeight * LUNCHBOX_VIEWPORT_HEIGHT_RATIO,
    LUNCHBOX_DESKTOP_MAX_HEIGHT_PX,
  );
  const bottomOffset = Math.max(0, innerHeight - visibleBottom);

  const preferredTop = visibleBottom - preferredHeight;
  const wideViewportCanKeepDesktopLayout = viewportWidth >= LUNCHBOX_DESKTOP_BREAKPOINT_PX
    && (
      characterBottom === undefined
      || preferredTop >= characterBottom + LUNCHBOX_DROP_TARGET_GAP_PX
    );

  if (wideViewportCanKeepDesktopLayout || characterBottom === undefined) {
    return {
      height: preferredHeight,
      top: preferredTop,
      bottomOffset,
      visibleHeight,
    };
  }

  const availableHeight = Math.max(
    0,
    visibleBottom - characterBottom - LUNCHBOX_DROP_TARGET_GAP_PX,
  );
  const safeMinimumHeight = Math.min(
    LUNCHBOX_MOBILE_MIN_HEIGHT_PX,
    availableHeight,
  );
  const height = Math.max(
    safeMinimumHeight,
    Math.min(preferredHeight, availableHeight),
  );

  return {
    height,
    top: visibleBottom - height,
    bottomOffset,
    visibleHeight,
  };
}

export function canDragLunchboxFood(
  item: LunchboxFoodItem,
  flowState: FoodieBuddyUiState,
) {
  return item.quantity > 0 && flowState !== 'submitting';
}

export function isLunchboxDragGesture(
  start: { clientX: number; clientY: number },
  current: { clientX: number; clientY: number },
) {
  return Math.hypot(
    current.clientX - start.clientX,
    current.clientY - start.clientY,
  ) >= LUNCHBOX_DRAG_THRESHOLD_PX;
}

export function isPointInsideLunchboxDropTarget(
  point: Pick<LunchboxFoodDragPayload, 'clientX' | 'clientY'>,
  bounds: LunchboxDropTargetBounds,
) {
  return point.clientX >= bounds.left
    && point.clientX <= bounds.right
    && point.clientY >= bounds.top
    && point.clientY <= bounds.bottom;
}

interface LunchboxBottomSheetProps {
  open: boolean;
  items: readonly LunchboxFoodItem[];
  flowState: FoodieBuddyUiState;
  errorMessage?: string;
  onFoodSelect: (item: LunchboxFoodItem) => void;
  dropTargetRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  onAfterClose?: () => void;
}

export default function LunchboxBottomSheet({
  open,
  items,
  flowState,
  errorMessage,
  onFoodSelect,
  dropTargetRef,
  onClose,
  onAfterClose,
}: LunchboxBottomSheetProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetLayout, setSheetLayout] = useState<LunchboxSheetLayout | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const selectionTimeoutRef = useRef<number | null>(null);
  const isSubmitting = flowState === 'submitting';

  const selectFoodForProfileDrag = (item: LunchboxFoodItem) => {
    if (!canDragLunchboxFood(item, flowState)) return;

    setSelectedId(item.id);
    if (selectionTimeoutRef.current !== null) {
      window.clearTimeout(selectionTimeoutRef.current);
    }
    // 선택 상태를 짧게 보여준 뒤 Sheet를 닫는다. 실제 feeding은 Profile 배너의
    // 음식 handle을 캐릭터 위로 drop했을 때만 실행된다.
    selectionTimeoutRef.current = window.setTimeout(() => {
      selectionTimeoutRef.current = null;
      onFoodSelect(item);
    }, 180);
  };

  useEffect(() => () => {
    if (selectionTimeoutRef.current !== null) {
      window.clearTimeout(selectionTimeoutRef.current);
    }
  }, []);

  useLayoutEffect(() => {
    if (!open || typeof window === 'undefined') {
      setSheetLayout(null);
      return;
    }

    const visualViewport = window.visualViewport;
    let animationFrame = 0;

    const measureSheet = () => {
      const characterBounds = dropTargetRef?.current?.getBoundingClientRect();
      setSheetLayout(calculateLunchboxSheetLayout({
        viewportWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        visualViewportHeight: visualViewport?.height,
        visualViewportOffsetTop: visualViewport?.offsetTop,
        characterBottom: characterBounds?.bottom,
      }));
    };
    const scheduleMeasure = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(measureSheet);
    };

    scheduleMeasure();
    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('orientationchange', scheduleMeasure);
    visualViewport?.addEventListener('resize', scheduleMeasure);
    visualViewport?.addEventListener('scroll', scheduleMeasure);

    const resizeObserver = typeof ResizeObserver === 'undefined' || !dropTargetRef?.current
      ? null
      : new ResizeObserver(scheduleMeasure);
    if (resizeObserver && dropTargetRef?.current) {
      resizeObserver.observe(dropTargetRef.current);
    }

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('orientationchange', scheduleMeasure);
      visualViewport?.removeEventListener('resize', scheduleMeasure);
      visualViewport?.removeEventListener('scroll', scheduleMeasure);
      resizeObserver?.disconnect();
    };
  }, [dropTargetRef, open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const appShell = document.querySelector<HTMLElement>('.app-shell');
    const appShellWasInert = appShell?.hasAttribute('inert') ?? false;
    document.body.style.overflow = 'hidden';
    appShell?.setAttribute('inert', '');
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusableElements = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      const focusIsOutsidePanel = !panelRef.current.contains(activeElement);

      if (event.shiftKey && (activeElement === firstElement || focusIsOutsidePanel)) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && (activeElement === lastElement || focusIsOutsidePanel)) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (!appShellWasInert) appShell?.removeAttribute('inert');
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence
      onExitComplete={() => {
        setSelectedId(null);
        onAfterClose?.();
      }}
    >
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[100] h-[100dvh] w-screen bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.section
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lunchbox-sheet-title"
            className="fixed bottom-0 left-0 right-0 z-[101] mx-auto flex w-full max-w-[430px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl"
            style={{
              bottom: sheetLayout ? sheetLayout.bottomOffset : 0,
              height: sheetLayout ? sheetLayout.height : 'min(72dvh, 560px)',
              maxHeight: sheetLayout ? sheetLayout.visibleHeight : '100dvh',
            }}
            data-lunchbox-sheet-layout={sheetLayout ? 'measured' : 'css-fallback'}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
          >
            <div className="sticky top-0 z-10 shrink-0 bg-white px-5 pt-4">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
              <div className="flex items-start justify-between gap-3 pb-3">
                <div>
                  <h2 id="lunchbox-sheet-title" className="text-[18px] font-black text-[#2F211B]">
                    나의 런치박스 🍱
                  </h2>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#9B8376]">
                    음식을 선택하면 프로필에서 런치메이트에게 직접 전해줄 수 있어요.
                  </p>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F7F1EC] text-[#8A756A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85053]"
                  aria-label="런치박스 닫기"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {items.length > 0 ? (
              <>
                <div
                  className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 py-3"
                  role="radiogroup"
                  aria-label="한입 나누기 음식 선택"
                >
                  <div className="space-y-2.5">
                    {items.map(item => {
                      const selected = selectedId === item.id;
                      const unavailable = item.quantity <= 0;
                      const selectable = canDragLunchboxFood(item, flowState);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          aria-label={unavailable
                            ? `${item.name}, 품절`
                            : `${item.name}, 탭하여 프로필에서 런치메이트에게 전하기`}
                          disabled={unavailable || isSubmitting}
                          onClick={() => selectFoodForProfileDrag(item)}
                          data-lunchbox-food-selectable={selectable ? 'true' : 'false'}
                          className={`relative flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85053] ${
                            selected
                              ? 'border-[#E85053] bg-[#FFF4F2] shadow-sm'
                              : 'border-[#EFE4DB] bg-[#FDFAF7]'
                          } ${unavailable ? 'cursor-not-allowed opacity-50' : 'active:scale-[0.99]'}`}
                        >
                          <span
                            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#F5E7DC] text-[30px]"
                            aria-hidden="true"
                          >
                            {item.image ? (
                              <img src={item.image} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span aria-hidden="true">{item.placeholder ?? '🍽️'}</span>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-[14px] font-black text-[#362720]">{item.name}</span>
                              {item.unseenQuantity > 0 && (
                                <span className="shrink-0 rounded-full bg-[#E85053] px-1.5 py-0.5 text-[9px] font-black leading-none text-white">
                                  NEW {item.unseenQuantity}
                                </span>
                              )}
                            </span>
                            <span className="mt-1 block truncate text-[11px] text-[#8C776C]">
                              {item.sourceLabel}
                            </span>
                            <span className="mt-1 flex items-center gap-2 text-[10px] font-bold">
                              <span className={unavailable ? 'text-[#A99A91]' : 'text-[#5F4B40]'}>
                                {unavailable ? '품절' : `보유 ${item.quantity}개`}
                              </span>
                              <span className="text-[#D78B42]">XP 미리보기 +{item.xpPreview}</span>
                            </span>
                          </span>
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                              selected
                                ? 'border-[#E85053] bg-[#E85053] text-white'
                                : 'border-[#DCCFC5] bg-white text-transparent'
                            }`}
                            aria-hidden="true"
                          >
                            {unavailable ? <LockKeyhole size={11} className="text-[#A99A91]" /> : <Check size={13} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <footer className="sticky bottom-0 z-10 shrink-0 border-t border-[#F1E7E0] bg-white px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3">
                  <AnimatePresence initial={false}>
                    {flowState === 'error' && errorMessage && (
                      <motion.p
                        role="alert"
                        className="mb-2 rounded-xl bg-[#FFF0EE] px-3 py-2 text-[11px] font-semibold leading-relaxed text-[#C93F43]"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                      >
                        {errorMessage}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <p className="text-center text-[10px] text-[#B09D92]" aria-live="polite">
                    {selectedId
                      ? '선택했어요. 프로필 배너에서 캐릭터에게 끌어다 주세요!'
                      : '저장되지 않는 맛추억 미리보기예요.'}
                  </p>
                </footer>
              </>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-9 text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[30px] border-2 border-dashed border-[#E5D6CB] bg-[#FBF5F0] text-[46px]" aria-hidden="true">
                  🍽️
                </div>
                <p className="mt-5 text-[16px] font-black text-[#3A2B24]">새로운 한입이 아직 없어요</p>
                <p className="mx-auto mt-2 max-w-[270px] text-[12px] leading-relaxed text-[#9B8376]">
                  맛있는 기록을 만들면 런치박스에 새로운 음식이 생겨요.
                </p>
                <p className="mt-3 text-[10px] font-semibold text-[#C3AFA4]">
                  기록 화면으로 이동하는 기능은 다음 단계에서 연결돼요.
                </p>
              </div>
            )}
          </motion.section>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
