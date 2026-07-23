import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { acquireDocumentScrollLock } from '@/lib/documentScrollLock';
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
  onShare: (item: LunchboxFoodItem) => void;
  onFoodDragStart?: (payload: LunchboxFoodDragPayload) => void;
  onFoodDragMove?: (payload: LunchboxFoodDragPayload) => void;
  onFoodDrop?: (payload: LunchboxFoodDragPayload) => void;
  onFoodDragCancel?: () => void;
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
  onShare,
  onFoodDragStart,
  onFoodDragMove,
  onFoodDrop,
  onFoodDragCancel,
  dropTargetRef,
  onClose,
  onAfterClose,
}: LunchboxBottomSheetProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<LunchboxFoodDragPayload | null>(null);
  const [sheetLayout, setSheetLayout] = useState<LunchboxSheetLayout | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const pointerDragRef = useRef<{
    pointerId: number;
    item: LunchboxFoodItem;
    startX: number;
    startY: number;
    dragging: boolean;
  } | null>(null);
  const suppressClickItemIdRef = useRef<string | null>(null);
  const selectedItem = items.find(item => item.id === selectedId && item.quantity > 0);
  const isSubmitting = flowState === 'submitting';

  const clearPointerDrag = () => {
    pointerDragRef.current = null;
    setDragPreview(null);
  };

  const handleFoodPointerDown = (
    event: ReactPointerEvent<HTMLElement>,
    item: LunchboxFoodItem,
    allowTouchDrag = true,
  ) => {
    if (!canDragLunchboxFood(item, flowState)) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    // 모바일에서는 선택 전 세로 제스처를 목록 스크롤에 양보한다.
    // 한 번 탭해 선택된 반찬칸만 touch drag를 시작할 수 있다.
    if (event.pointerType === 'touch' && !allowTouchDrag) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    pointerDragRef.current = {
      pointerId: event.pointerId,
      item,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
    };
  };

  const handleFoodPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const activeDrag = pointerDragRef.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;

    const payload: LunchboxFoodDragPayload = {
      item: activeDrag.item,
      clientX: event.clientX,
      clientY: event.clientY,
    };

    if (!activeDrag.dragging && isLunchboxDragGesture(
      { clientX: activeDrag.startX, clientY: activeDrag.startY },
      payload,
    )) {
      activeDrag.dragging = true;
      onFoodDragStart?.(payload);
    }

    if (!activeDrag.dragging) return;
    event.preventDefault();
    setDragPreview(payload);
    onFoodDragMove?.(payload);
  };

  const handleFoodPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const activeDrag = pointerDragRef.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;

    if (activeDrag.dragging) {
      suppressClickItemIdRef.current = activeDrag.item.id;
      window.setTimeout(() => {
        if (suppressClickItemIdRef.current === activeDrag.item.id) {
          suppressClickItemIdRef.current = null;
        }
      }, 0);
      onFoodDrop?.({
        item: activeDrag.item,
        clientX: event.clientX,
        clientY: event.clientY,
      });
    }
    clearPointerDrag();
  };

  const handleFoodPointerCancel = (event: ReactPointerEvent<HTMLElement>) => {
    if (pointerDragRef.current?.pointerId !== event.pointerId) return;
    if (pointerDragRef.current.dragging) onFoodDragCancel?.();
    clearPointerDrag();
  };

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

    const releaseScrollLock = acquireDocumentScrollLock({ inertSelector: '.app-shell' });
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
      releaseScrollLock();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) return;
    if (pointerDragRef.current?.dragging) onFoodDragCancel?.();
    pointerDragRef.current = null;
    setDragPreview(null);
  }, [onFoodDragCancel, open]);

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
            className={`fixed inset-0 z-[100] h-[100dvh] w-screen ${
              dragPreview ? 'bg-black/[0.32]' : 'bg-black/40'
            }`}
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
                    위아래로 밀어 메뉴를 보고, 탭한 음식은 통째로 끌어주세요.
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
                  className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 py-3 [-webkit-overflow-scrolling:touch]"
                  role="radiogroup"
                  aria-label="한입 나누기 음식 선택"
                  data-lunchbox-scroll-region="true"
                >
                  <div
                    className="relative overflow-hidden rounded-[28px] border-[5px] border-[#B52D32] bg-[#171313] p-2.5 shadow-[0_12px_24px_rgba(57,20,20,0.24)]"
                    data-lunchbox-bento-tray="true"
                  >
                    <div className="pointer-events-none absolute inset-[5px] rounded-[20px] border border-[#E1A25A]/45" />
                    <div className="mb-2 flex items-center justify-between px-1.5 text-[9px] font-black tracking-[0.18em] text-[#E9B66F]">
                      <span>MY BENTO</span>
                      <span className="tracking-normal text-[#F2DDD0]/55">お弁当</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {items.map(item => {
                        const selected = selectedId === item.id;
                        const unavailable = item.quantity <= 0;
                        const draggable = canDragLunchboxFood(item, flowState);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            aria-label={unavailable
                              ? `${item.name}, 품절`
                              : `${item.name}, 탭하여 선택하거나 런치메이트에게 드래그`}
                            disabled={unavailable || isSubmitting}
                            onClick={() => {
                              if (suppressClickItemIdRef.current === item.id) {
                                suppressClickItemIdRef.current = null;
                                return;
                              }
                              setSelectedId(item.id);
                              onFoodSelect(item);
                            }}
                            onPointerDown={draggable
                              ? event => handleFoodPointerDown(event, item, selected)
                              : undefined}
                            onPointerMove={draggable ? handleFoodPointerMove : undefined}
                            onPointerUp={draggable ? handleFoodPointerUp : undefined}
                            onPointerCancel={draggable ? handleFoodPointerCancel : undefined}
                            data-lunchbox-food-draggable={draggable ? 'true' : 'false'}
                            data-lunchbox-bento-compartment="true"
                            data-lunchbox-touch-mode={selected ? 'drag' : 'scroll'}
                            className={`relative flex min-h-[104px] flex-col items-center justify-center overflow-hidden rounded-[18px] border px-2 py-2.5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD18F] ${selected ? 'touch-none' : 'touch-pan-y'} ${
                              selected
                                ? 'border-[#FF5C62] bg-[#5A2023] shadow-[inset_0_0_0_2px_rgba(255,92,98,0.35)]'
                                : 'border-[#594747] bg-[#292020] shadow-[inset_0_0_12px_rgba(0,0,0,0.35)]'
                            } ${unavailable ? 'cursor-not-allowed opacity-45' : 'cursor-grab active:scale-[0.97] active:cursor-grabbing'}`}
                          >
                            <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F8E8D8] px-1 text-[9px] font-black text-[#6E292B]">
                              {unavailable ? <LockKeyhole size={10} /> : item.quantity}
                            </span>
                            {item.unseenQuantity > 0 && (
                              <span className="absolute left-2 top-2 rounded-full bg-[#E85053] px-1.5 py-0.5 text-[8px] font-black leading-none text-white">
                                NEW {item.unseenQuantity}
                              </span>
                            )}
                            <span className="flex h-12 w-12 items-center justify-center overflow-hidden text-[38px] drop-shadow-[0_3px_3px_rgba(0,0,0,0.45)]" aria-hidden="true">
                              {item.image ? (
                                <img src={item.image} alt="" className="h-full w-full object-contain" />
                              ) : (
                                item.placeholder ?? '🍽️'
                              )}
                            </span>
                            <span className="mt-1 max-w-full truncate text-[11px] font-black text-[#FFF5EC]">
                              {item.name}
                            </span>
                            <span className="mt-0.5 text-[9px] font-bold text-[#E9B66F]">
                              {unavailable ? '품절' : `보유 ${item.quantity}개 · +${item.xpPreview} XP`}
                            </span>
                            {selected && (
                              <span className="absolute bottom-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#F04F55] text-white" aria-hidden="true">
                                <Check size={12} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="pb-0.5 pt-2 text-center text-[9px] font-bold text-[#E9B66F]/75">
                      ↕ 위아래로 밀어 더 많은 음식을 확인하세요
                    </p>
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
                  <button
                    type="button"
                    disabled={!selectedItem || isSubmitting}
                    onClick={() => selectedItem && onShare(selectedItem)}
                    className="h-12 w-full rounded-2xl bg-[#E85053] text-[14px] font-black text-white transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#E6DED8] disabled:text-[#A99A91] disabled:active:scale-100"
                  >
                    {isSubmitting
                      ? '한입 준비 중…'
                      : flowState === 'error'
                        ? '다시 한입 나누기'
                        : selectedItem
                          ? `${selectedItem.name} 한입 나누기`
                          : '한입 나누기'}
                  </button>
                  <p className="mt-2 text-center text-[10px] text-[#B09D92]">
                    맛추억 XP는 미리보기이며, 나눈 음식은 1개 차감돼요.
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
          {dragPreview && (
            <div
              className="pointer-events-none fixed z-[103] flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-white bg-[#FFF4EA] text-[30px] shadow-xl"
              style={{
                left: dragPreview.clientX,
                top: dragPreview.clientY,
                transform: 'translate(-50%, -50%)',
              }}
              data-lunchbox-drag-preview="true"
              aria-hidden="true"
            >
              {dragPreview.item.image ? (
                <img src={dragPreview.item.image} alt="" className="h-full w-full rounded-2xl object-cover" />
              ) : (
                dragPreview.item.placeholder ?? '🍽️'
              )}
            </div>
          )}
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
