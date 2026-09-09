import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { displayImageForCapturedMunchie } from '@/lib/munchieCapture';
import {
  expandInteractionRect,
  isMunchieDrag,
  isPointInsideRect,
} from '@/lib/munchieTankInteraction';
import { getMunchieTankPresentation } from '@/lib/munchieTankPlacement';
import type { CapturedMunchie } from '@/types/munchieCapture';

interface MunchieCaptureContainerProps {
  items: readonly CapturedMunchie[];
  activeMunchieId?: string | null;
  entrancePhase?: 'reveal' | 'dropping' | 'settled';
  highlightedMunchieId?: string | null;
  selectedMunchieId?: string | null;
  queuedMunchieIds?: readonly string[];
  interactionDisabled?: boolean;
  onMunchieSelect?: (munchie: CapturedMunchie, element: HTMLButtonElement) => void;
  getHatchBounds?: () => DOMRect | null;
  onHatchProximityChange?: (active: boolean) => void;
  onMunchieDropOnHatch?: (munchie: CapturedMunchie, element: HTMLElement) => boolean;
  onRevealComplete?: () => void;
  onDropComplete?: () => void;
}

interface TapReaction {
  sourceId: string;
  sequence: number;
}

interface TankDragGesture {
  munchieId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  dragging: boolean;
  overHatch: boolean;
}

interface TankDragPresentation {
  munchie: CapturedMunchie;
  left: number;
  top: number;
  width: number;
  deltaX: number;
  deltaY: number;
  returning: boolean;
}

function nearestMunchieIds(items: readonly CapturedMunchie[], sourceId: string) {
  const source = items.find(item => item.id === sourceId);
  if (!source) return new Set<string>();

  return new Set(items
    .filter(item => item.id !== sourceId)
    .map(item => ({
      id: item.id,
      distance: Math.hypot(
        item.placement.xPercent - source.placement.xPercent,
        (item.placement.bottomPercent - source.placement.bottomPercent) * 1.2,
      ),
    }))
    .filter(item => item.distance <= 46)
    .sort((left, right) => left.distance - right.distance || left.id.localeCompare(right.id))
    .slice(0, 3)
    .map(item => item.id));
}

export function CapturedMunchieVisual({ munchie }: { munchie: CapturedMunchie }) {
  if (munchie.cutoutImage) {
    return (
      <div className="flex aspect-square w-full items-center justify-center drop-shadow-[0_9px_7px_rgba(83,48,36,0.24)]">
        <img src={munchie.cutoutImage} alt="Captured Munchie" draggable={false} className="h-full w-full object-contain" />
      </div>
    );
  }

  const shapeIndex = Array.from(munchie.id).reduce((total, character) => (
    total + character.charCodeAt(0)
  ), 0) % 3;
  const borderRadius = [
    '31% 37% 33% 39% / 36% 31% 39% 34%',
    '38% 30% 40% 32% / 31% 39% 33% 37%',
    '34% 41% 30% 37% / 40% 33% 38% 30%',
  ][shapeIndex];

  return (
    <div
      className="aspect-square w-full overflow-hidden border border-white/80 bg-[#FFF9F2] p-[2px] shadow-[0_9px_16px_rgba(83,48,36,0.22)]"
      style={{ borderRadius }}
    >
      <img
        src={displayImageForCapturedMunchie(munchie)}
        alt="Captured Munchie"
        draggable={false}
        className="h-full w-full object-cover"
        style={{ borderRadius }}
      />
    </div>
  );
}

export default function MunchieCaptureContainer({
  items,
  activeMunchieId,
  entrancePhase = 'settled',
  highlightedMunchieId,
  selectedMunchieId,
  queuedMunchieIds = [],
  interactionDisabled = false,
  onMunchieSelect,
  getHatchBounds,
  onHatchProximityChange,
  onMunchieDropOnHatch,
  onRevealComplete,
  onDropComplete,
}: MunchieCaptureContainerProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [tapReaction, setTapReaction] = useState<TapReaction | null>(null);
  const [tankDrag, setTankDrag] = useState<TankDragPresentation | null>(null);
  const tankDragGestureRef = useRef<TankDragGesture | null>(null);
  const tankDragOverlayRef = useRef<HTMLDivElement>(null);
  const suppressedClickMunchieIdRef = useRef<string | null>(null);
  const activeMunchie = items.find(item => item.id === activeMunchieId) ?? null;
  const settledItems = items.filter(item => (
    item.id !== activeMunchieId || entrancePhase === 'settled'
  ));
  const tankPresentations = useMemo(() => new Map(items.map((munchie, index) => [
    munchie.id,
    getMunchieTankPresentation(munchie, index, items.length),
  ])), [items]);
  const activePresentation = activeMunchie
    ? tankPresentations.get(activeMunchie.id) ?? null
    : null;
  const neighbourIds = useMemo(
    () => nearestMunchieIds(items, tapReaction?.sourceId ?? ''),
    [items, tapReaction],
  );
  const queuedMunchieIdSet = useMemo(() => new Set(queuedMunchieIds), [queuedMunchieIds]);

  const clearTankDrag = () => {
    if (tankDragGestureRef.current?.overHatch) onHatchProximityChange?.(false);
    tankDragGestureRef.current = null;
    setTankDrag(null);
  };

  const returnTankDragToOrigin = () => {
    if (tankDragGestureRef.current?.overHatch) onHatchProximityChange?.(false);
    tankDragGestureRef.current = null;
    setTankDrag(current => current ? {
      ...current,
      deltaX: 0,
      deltaY: 0,
      returning: true,
    } : null);
  };

  const activeAnimate = activeMunchie && activePresentation && entrancePhase === 'dropping'
    ? {
        left: `${activePresentation.xPercent}%`,
        bottom: `${activePresentation.bottomPercent}%`,
        width: activePresentation.sizePx,
        rotate: activePresentation.rotationDeg,
        opacity: 1,
        scaleX: shouldReduceMotion ? 1 : [1, 1, 1.1, 0.98, 1],
        scaleY: shouldReduceMotion ? 1 : [1, 1, 0.88, 1.04, 1],
        y: shouldReduceMotion ? 0 : [0, 0, 7, -2, 0],
      }
    : {
        left: '50%',
        bottom: 'calc(100% + 22px)',
        width: 118,
        rotate: 0,
        opacity: 1,
        scaleX: shouldReduceMotion ? 1 : [0.72, 1.08, 1],
        scaleY: shouldReduceMotion ? 1 : [0.72, 1.08, 1],
        y: 0,
      };

  return (
    <>
    <section className="mx-auto w-full max-w-[430px] pt-20" aria-label="Munchie collection container">
      <div className="relative h-[clamp(370px,55dvh,540px)]">
        <div className="pointer-events-none absolute inset-x-[7%] bottom-[-12px] h-10 rounded-[50%] bg-[#9B5847]/16 blur-xl" />
        <div className="pointer-events-none absolute inset-x-1.5 bottom-3 top-4 rounded-[38px_38px_76px_76px] border-[3px] border-white/80 bg-[linear-gradient(105deg,rgba(255,255,255,0.62),rgba(255,245,237,0.22)_42%,rgba(235,164,148,0.2)_100%)] shadow-[inset_12px_8px_22px_rgba(255,255,255,0.78),inset_-13px_-10px_26px_rgba(206,111,91,0.13),0_24px_48px_rgba(107,68,52,0.14)] backdrop-blur-md" />
        <div className="pointer-events-none absolute inset-x-[9%] top-0 h-11 rounded-[50%] border-[3px] border-white/90 bg-[linear-gradient(180deg,rgba(194,116,99,0.24),rgba(255,252,247,0.5))] shadow-[inset_0_7px_10px_rgba(142,78,65,0.13),0_4px_10px_rgba(104,60,45,0.1)]" />
        <div className="pointer-events-none absolute left-7 top-14 h-[72%] w-[10px] rounded-full bg-white/68 blur-[0.5px]" />
        <div className="pointer-events-none absolute right-7 top-20 h-[58%] w-[6px] rounded-full bg-white/38 blur-[0.5px]" />
        <div className="pointer-events-none absolute inset-x-7 bottom-6 h-8 rounded-[50%] border-b-2 border-white/60 bg-[#D98872]/10 blur-[0.5px]" />

        <div className="absolute inset-x-3 bottom-6 top-6 overflow-hidden rounded-[34px_34px_68px_68px]">
          {settledItems.map((munchie) => {
            const presentation = tankPresentations.get(munchie.id) ?? {
              ...munchie.placement,
              depth: 0,
              zIndex: 10,
            };
            const highlighted = highlightedMunchieId === munchie.id;
            const queued = queuedMunchieIdSet.has(munchie.id);
            const selected = !queued && selectedMunchieId === munchie.id;
            const tapped = tapReaction?.sourceId === munchie.id;
            const neighbour = neighbourIds.has(munchie.id);
            const source = items.find(item => item.id === tapReaction?.sourceId);
            const reactionDirection = munchie.placement.xPercent < (source?.placement.xPercent ?? 50) ? -1 : 1;
            const isNearbyAutoDrop = activeMunchie
              && entrancePhase === 'dropping'
              && Math.abs(munchie.placement.xPercent - activeMunchie.placement.xPercent) <= 34
              && Math.abs(munchie.placement.bottomPercent - activeMunchie.placement.bottomPercent) <= 30;
            const isTankDragging = tankDrag?.munchie.id === munchie.id;

            const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
              if (interactionDisabled || queued || event.button !== 0) return;
              suppressedClickMunchieIdRef.current = null;
              tankDragGestureRef.current = {
                munchieId: munchie.id,
                pointerId: event.pointerId,
                startClientX: event.clientX,
                startClientY: event.clientY,
                dragging: false,
                overHatch: false,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            };

            const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
              const gesture = tankDragGestureRef.current;
              if (!gesture || gesture.munchieId !== munchie.id || gesture.pointerId !== event.pointerId) return;
              const deltaX = event.clientX - gesture.startClientX;
              const deltaY = event.clientY - gesture.startClientY;
              const dragging = gesture.dragging || isMunchieDrag(deltaX, deltaY);
              if (!dragging) return;

              event.preventDefault();
              const hatchBounds = getHatchBounds?.();
              const overHatch = hatchBounds
                ? isPointInsideRect(
                    { x: event.clientX, y: event.clientY },
                    expandInteractionRect(hatchBounds, 30),
                  )
                : false;
              if (overHatch !== gesture.overHatch) onHatchProximityChange?.(overHatch);
              tankDragGestureRef.current = { ...gesture, dragging: true, overHatch };

              const bounds = event.currentTarget.getBoundingClientRect();
              setTankDrag(current => ({
                munchie,
                left: current?.munchie.id === munchie.id ? current.left : bounds.left,
                top: current?.munchie.id === munchie.id ? current.top : bounds.top,
                width: current?.munchie.id === munchie.id ? current.width : bounds.width,
                deltaX,
                deltaY,
                returning: false,
              }));
            };

            const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
              const gesture = tankDragGestureRef.current;
              if (!gesture || gesture.munchieId !== munchie.id || gesture.pointerId !== event.pointerId) return;
              const deltaX = event.clientX - gesture.startClientX;
              const deltaY = event.clientY - gesture.startClientY;
              const dragged = gesture.dragging || isMunchieDrag(deltaX, deltaY);
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }

              if (!dragged) {
                tankDragGestureRef.current = null;
                return;
              }

              suppressedClickMunchieIdRef.current = munchie.id;
              const hatchBounds = getHatchBounds?.();
              const droppedOnHatch = hatchBounds
                ? isPointInsideRect(
                    { x: event.clientX, y: event.clientY },
                    expandInteractionRect(hatchBounds, 30),
                  )
                : false;
              if (droppedOnHatch) {
                const enteredSnackTime = onMunchieDropOnHatch?.(
                  munchie,
                  tankDragOverlayRef.current ?? event.currentTarget,
                ) ?? false;
                if (enteredSnackTime) {
                  clearTankDrag();
                  return;
                }
              }
              returnTankDragToOrigin();
            };

            return (
              <div
                key={munchie.id}
                className="absolute"
                style={{
                  left: `${presentation.xPercent}%`,
                  bottom: `${presentation.bottomPercent}%`,
                  width: presentation.sizePx,
                  zIndex: presentation.zIndex,
                  transform: `translateX(-50%) rotate(${presentation.rotationDeg}deg)`,
                }}
              >
                <motion.div
                  className="relative"
                  initial={false}
                  animate={queued
                    ? { opacity: 0.2, scale: 0.92, x: 0, y: 0, rotate: 0, filter: 'saturate(0.45) brightness(1.08)' }
                    : isTankDragging
                    ? { opacity: 0 }
                    : tapped
                    ? shouldReduceMotion
                      ? { scale: [1, 1.025, 1], filter: ['brightness(1)', 'brightness(1.08)', 'brightness(1)'] }
                      : {
                          y: [0, -14, 2, 0],
                          scale: [1, 1.06, 0.98, 1],
                          rotate: [0, reactionDirection * 4, -reactionDirection, 0],
                        }
                    : neighbour && !shouldReduceMotion
                      ? {
                          x: [0, reactionDirection * 4, -reactionDirection, 0],
                          y: [0, -3, 1, 0],
                          scale: [1, 1.02, 0.995, 1],
                          rotate: [0, reactionDirection * 2, 0],
                        }
                      : isNearbyAutoDrop && !shouldReduceMotion
                        ? { x: [0, reactionDirection * 3, 0], y: [0, -2, 0], rotate: [0, reactionDirection * 1.5, 0] }
                        : highlighted && !shouldReduceMotion
                          ? { scale: [1, 1.07, 1], y: [0, -4, 0] }
                          : { scale: 1, x: 0, y: 0, rotate: 0, filter: 'brightness(1)' }}
                  transition={queued
                    ? { duration: shouldReduceMotion ? 0.1 : 0.26, ease: 'easeOut' }
                    : isTankDragging
                    ? { duration: 0.04 }
                    : tapped
                    ? { duration: shouldReduceMotion ? 0.2 : 0.46, ease: [0.22, 0.75, 0.24, 1] }
                    : neighbour
                      ? { duration: 0.38, delay: 0.035, ease: 'easeOut' }
                      : isNearbyAutoDrop
                        ? { duration: 0.3, delay: 0.44, ease: 'easeInOut' }
                        : highlighted
                          ? { duration: 0.7, repeat: shouldReduceMotion ? 0 : 1, ease: 'easeInOut' }
                          : { duration: 0.16 }}
                >
                  <button
                    type="button"
                    disabled={interactionDisabled || !onMunchieSelect || queued}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={() => {
                      if (tankDragGestureRef.current?.dragging) returnTankDragToOrigin();
                      else clearTankDrag();
                    }}
                    onClick={(event) => {
                      if (suppressedClickMunchieIdRef.current === munchie.id) {
                        suppressedClickMunchieIdRef.current = null;
                        return;
                      }
                      setTapReaction(current => ({
                        sourceId: munchie.id,
                        sequence: (current?.sequence ?? 0) + 1,
                      }));
                      onMunchieSelect?.(munchie, event.currentTarget);
                    }}
                    aria-label={queued
                      ? 'Hatch Queue에서 기다리는 Munchie'
                      : munchie.fedAt === undefined
                        ? 'Munchie를 톡 건드리고 Hatch Queue용으로 선택'
                        : 'Lunchmate가 이미 먹은 Munchie를 톡 건드리기'}
                    aria-pressed={selected}
                    className={`relative block w-full select-none border-0 bg-transparent p-0 text-left outline-none focus-visible:rounded-[34%] focus-visible:ring-4 focus-visible:ring-[#ED565B]/45 disabled:cursor-default ${selected ? 'drop-shadow-[0_0_10px_rgba(237,86,91,0.42)]' : ''}`}
                    style={{ touchAction: 'none' }}
                  >
                    <CapturedMunchieVisual munchie={munchie} />
                    {munchie.fedAt !== undefined && (
                      <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full border border-white/90 bg-[#FFF1E9]/92 text-[11px] font-black text-[#D96A6D] shadow-sm" aria-hidden="true">
                        ♡
                      </span>
                    )}
                  </button>

                  {selected && (
                    <motion.span
                      className="pointer-events-none absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#F09A79] text-white shadow-lg"
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={shouldReduceMotion ? { opacity: 1, scale: 1 } : { opacity: 1, scale: [1, 1.12, 1], rotate: [0, 8, 0] }}
                      transition={{ duration: 0.8, repeat: shouldReduceMotion ? 0 : Infinity, repeatDelay: 0.8 }}
                      aria-hidden="true"
                    >
                      <Sparkles size={14} />
                    </motion.span>
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>

        <div className="pointer-events-none absolute inset-x-3 bottom-6 top-6 z-20">
          {activeMunchie && entrancePhase !== 'settled' && (
            <motion.div
              key={activeMunchie.id}
              className="absolute"
              style={{ x: '-50%' }}
              initial={{ left: '50%', bottom: 'calc(100% + 22px)', width: 118, rotate: 0, opacity: 0, scaleX: 0.72, scaleY: 0.72 }}
              animate={activeAnimate}
              transition={entrancePhase === 'reveal'
                ? { duration: shouldReduceMotion ? 0.18 : 0.44, times: [0, 0.72, 1], ease: 'easeOut' }
                : { duration: shouldReduceMotion ? 0.2 : 0.7, times: [0, 0.72, 0.82, 0.91, 1], ease: [0.32, 0.72, 0, 1] }}
              onAnimationComplete={() => {
                if (entrancePhase === 'reveal') onRevealComplete?.();
                if (entrancePhase === 'dropping') onDropComplete?.();
              }}
            >
              <CapturedMunchieVisual munchie={activeMunchie} />
            </motion.div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-[9%] top-0 z-40 h-11 rounded-[50%] border-x-[3px] border-b-[5px] border-white/80 shadow-[0_5px_8px_rgba(148,82,67,0.11)]" />

        {items.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center">
            <span className="text-4xl" aria-hidden="true">✨</span>
            <p className="mt-3 text-sm font-bold text-[#A58678]">첫 Munchie를 담아보세요 ✨</p>
          </div>
        )}
      </div>
      <div className="mx-auto -mt-2 h-5 w-[86%] rounded-[50%] border border-white/70 bg-[#E6AB9B]/28 shadow-[0_8px_16px_rgba(95,57,44,0.13)]" aria-hidden="true" />
    </section>
    {tankDrag && typeof document !== 'undefined' && createPortal(
      <motion.div
        ref={tankDragOverlayRef}
        className="pointer-events-none fixed z-[90]"
        style={{ left: tankDrag.left, top: tankDrag.top, width: tankDrag.width }}
        initial={false}
        animate={{
          x: tankDrag.deltaX,
          y: tankDrag.deltaY,
          scale: tankDrag.returning || shouldReduceMotion ? 1 : 1.06,
          rotate: tankDrag.returning || shouldReduceMotion ? 0 : (tankDrag.deltaX >= 0 ? 3 : -3),
          filter: tankDrag.returning
            ? 'drop-shadow(0 0 0 rgba(83,48,36,0))'
            : 'drop-shadow(0 14px 11px rgba(83,48,36,0.34))',
        }}
        transition={tankDrag.returning
          ? { type: 'spring', stiffness: 430, damping: 28 }
          : { duration: 0 }}
        onAnimationComplete={() => {
          if (tankDrag.returning) setTankDrag(null);
        }}
        aria-hidden="true"
      >
        <CapturedMunchieVisual munchie={tankDrag.munchie} />
      </motion.div>,
      document.body,
    )}
    </>
  );
}
