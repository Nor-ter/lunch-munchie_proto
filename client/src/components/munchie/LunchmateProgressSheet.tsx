import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Gift, X } from 'lucide-react';
import type { LunchmateProgressSnapshot } from '@/utils/lunchmateProgress';

interface LunchmateProgressSheetProps {
  open: boolean;
  snapshot: LunchmateProgressSnapshot;
  onClose: () => void;
  onAfterClose?: () => void;
}

export default function LunchmateProgressSheet({
  open,
  snapshot,
  onClose,
  onAfterClose,
}: LunchmateProgressSheetProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

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

  const progressPercent = snapshot.progressPercent;

  return createPortal(
    <AnimatePresence onExitComplete={onAfterClose}>
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
            aria-labelledby="lunchmate-progress-title"
            className="fixed bottom-0 left-0 right-0 z-[101] mx-auto flex max-h-[min(64dvh,480px)] w-full max-w-[430px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
          >
            <div className="shrink-0 bg-white px-5 pt-4">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
              <div className="flex items-start justify-between gap-3 pb-3">
                <div>
                  <h2 id="lunchmate-progress-title" className="text-[18px] font-black text-[#2F211B]">
                    맛추억 미리보기
                  </h2>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#9B8376]">
                    이 진행도는 현재 화면에서만 확인하는 mock 데이터예요.
                  </p>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F7F1EC] text-[#8A756A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85053]"
                  aria-label="맛추억 상세 닫기"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-2">
              <div className="rounded-[22px] border border-[#F0DDD2] bg-[#FFF8F4] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold text-[#C47B54]">PREVIEW LEVEL</p>
                    <p className="mt-0.5 text-[19px] font-black text-[#33251F]">
                      Lv.{snapshot.level} {snapshot.levelName}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm">
                    <p className="text-[10px] font-semibold text-[#A18C80]">누적 맛추억</p>
                    <p className="text-[16px] font-black text-[#E85053]">{snapshot.totalXp} XP</p>
                  </div>
                </div>

                <div className="mt-5 flex items-end justify-between gap-3">
                  <p className="text-[11px] font-bold text-[#6F5A4E]">
                    {snapshot.isMaxLevel ? 'Preview 최고 Level' : `다음 Level까지 ${snapshot.xpRemainingToNextLevel} XP`}
                  </p>
                  <p className="text-[10px] font-semibold text-[#A18C80]">
                    {snapshot.isMaxLevel
                      ? `${snapshot.totalXp} XP`
                      : `${snapshot.totalXp} / ${snapshot.nextLevelTotalXp} XP`}
                  </p>
                </div>
                <div
                  className="mt-2 h-3 overflow-hidden rounded-full bg-[#F1DFD5]"
                  role="progressbar"
                  aria-label="다음 preview Level 진행도"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progressPercent)}
                >
                  <motion.div
                    className="h-full rounded-full bg-[#E85053]"
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ type: 'tween', duration: 0.35, ease: 'easeOut' }}
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3 rounded-[20px] border border-dashed border-[#E8CDBD] bg-white p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0E8] text-[#D8774D]" aria-hidden="true">
                  <Gift size={21} />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-[#B1907E]">다음 보상 PLACEHOLDER</p>
                  <p className="mt-0.5 text-[13px] font-black text-[#49372E]">{snapshot.nextRewardPlaceholder}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#A18C80]">실제 아이템 지급이나 해금은 이루어지지 않아요.</p>
                </div>
              </div>
            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
