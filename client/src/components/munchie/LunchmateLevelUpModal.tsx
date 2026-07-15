import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Gift, Sparkles } from 'lucide-react';
import type { LunchmateLevelUpEvent } from '@/utils/lunchmateProgress';

interface LunchmateLevelUpModalProps {
  open: boolean;
  event: LunchmateLevelUpEvent | null;
  onClose: () => void;
  onAfterClose?: () => void;
}

export default function LunchmateLevelUpModal({
  open,
  event,
  onClose,
  onAfterClose,
}: LunchmateLevelUpModalProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const appShell = document.querySelector<HTMLElement>('.app-shell');
    const appShellWasInert = appShell?.hasAttribute('inert') ?? false;
    document.body.style.overflow = 'hidden';
    appShell?.setAttribute('inert', '');
    const focusFrame = window.requestAnimationFrame(() => confirmButtonRef.current?.focus());

    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') {
        keyboardEvent.preventDefault();
        onClose();
        return;
      }

      if (keyboardEvent.key !== 'Tab' || !panelRef.current) return;
      keyboardEvent.preventDefault();
      confirmButtonRef.current?.focus();
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
    <AnimatePresence onExitComplete={onAfterClose}>
      {open && event && (
        <motion.div
          className="fixed inset-0 z-[110] flex h-[100dvh] w-screen items-center justify-center bg-black/45 px-5 py-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.section
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lunchmate-level-up-title"
            className="w-full max-w-[360px] overflow-y-auto rounded-[28px] bg-white p-5 text-center shadow-2xl"
            initial={{ opacity: 0, scale: 0.88, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: 'spring', stiffness: 330, damping: 25 }}
            onClick={modalEvent => modalEvent.stopPropagation()}
          >
            <motion.div
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-[#FFF0E9] text-[#E85053]"
              initial={{ rotate: -8, scale: 0.8 }}
              animate={{ rotate: [0, -5, 5, 0], scale: 1 }}
              transition={{ duration: 0.55 }}
              aria-hidden="true"
            >
              <Sparkles size={35} />
            </motion.div>

            <p className="mt-4 text-[11px] font-black tracking-[0.16em] text-[#D57B52]">PREVIEW LEVEL UP</p>
            <h2 id="lunchmate-level-up-title" className="mt-1 text-[23px] font-black text-[#31231D]">
              {event.levelName}
            </h2>
            <div className="mt-3 flex items-center justify-center gap-2 text-[15px] font-black">
              <span className="rounded-full bg-[#F5EEE9] px-3 py-1.5 text-[#9A887E]">Lv.{event.previousLevel}</span>
              <span className="text-[#D98964]" aria-hidden="true">→</span>
              <span className="rounded-full bg-[#E85053] px-3 py-1.5 text-white">Lv.{event.newLevel}</span>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-dashed border-[#E9CDBC] bg-[#FFF9F5] p-3 text-left">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#D8774D] shadow-sm" aria-hidden="true">
                <Gift size={19} />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-[#B38B76]">획득 아이템 PLACEHOLDER</p>
                <p className="mt-0.5 text-[12px] font-black text-[#49372E]">{event.rewardPlaceholder}</p>
              </div>
            </div>

            <p className="mt-3 text-[10px] leading-relaxed text-[#A18C80]">
              화면에서만 동작하는 mock 결과이며 실제 해금이나 저장은 되지 않아요.
            </p>
            <button
              ref={confirmButtonRef}
              type="button"
              onClick={onClose}
              className="mt-5 h-12 w-full rounded-2xl bg-[#E85053] text-[14px] font-black text-white transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85053] focus-visible:ring-offset-2"
            >
              확인
            </button>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
