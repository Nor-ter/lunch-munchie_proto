import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Gift, Sparkles } from 'lucide-react';
import LunchmateCharacterRenderer from '@/components/munchie/LunchmateCharacterRenderer';
import type {
  LunchmateLayerItem,
  LunchmateLoadout,
  LunchmateRarity,
  LunchmateSlot,
} from '@/types/lunchmateCustomization';
import type { LunchmateLevelUpEvent } from '@/utils/lunchmateProgress';

const SLOT_LABELS: Readonly<Record<LunchmateSlot, string>> = {
  outfit: '의상',
  headwear: '모자',
  eyewear: '안경',
  bag: '가방',
};

const RARITY_LABELS: Readonly<Record<LunchmateRarity, string>> = {
  common: '일반',
  rare: '레어',
  special: '스페셜',
};

const RARITY_STYLES: Readonly<Record<LunchmateRarity, string>> = {
  common: 'bg-[#F1E9E4] text-[#806F65]',
  rare: 'bg-[#FFE5DC] text-[#D45A55]',
  special: 'bg-[#FFF0BD] text-[#9A6A16]',
};

function createRewardPreviewLoadout(item: LunchmateLayerItem): LunchmateLoadout {
  return {
    outfitId: item.slot === 'outfit' ? item.id : null,
    headwearId: item.slot === 'headwear' ? item.id : null,
    eyewearId: item.slot === 'eyewear' ? item.id : null,
    bagId: item.slot === 'bag' ? item.id : null,
  };
}

interface LunchmateLevelUpModalProps {
  open: boolean;
  event: LunchmateLevelUpEvent | null;
  loadout?: LunchmateLoadout;
  rewardItem: LunchmateLayerItem | null;
  onClose: () => void;
  onAfterClose?: () => void;
}

export default function LunchmateLevelUpModal({
  open,
  event,
  loadout,
  rewardItem,
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
            className="w-full max-w-[360px] overflow-y-auto rounded-[28px] bg-white px-5 py-4 text-center shadow-2xl"
            initial={{ opacity: 0, scale: 0.88, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: 'spring', stiffness: 330, damping: 25 }}
            onClick={modalEvent => modalEvent.stopPropagation()}
          >
            <div
              className="mx-auto flex h-20 w-20 items-center justify-center overflow-visible rounded-[26px] bg-[#FFF0E9] text-[#E85053]"
            >
              <LunchmateCharacterRenderer
                flowState="idle"
                levelUpActive
                size={80}
                renderSize="compact"
                alt="레벨업을 기뻐하며 점프하는 런치메이트"
                loadout={loadout}
                fallback={<Sparkles size={35} aria-hidden="true" />}
              />
            </div>

            <h2
              id="lunchmate-level-up-title"
              className="mt-3 text-[19px] font-black tracking-[0.08em] text-[#E85053]"
            >
              LEVEL UP!
            </h2>

            <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[15px] font-black">
              <span className="rounded-full bg-[#F5EEE9] px-3 py-1.5 text-[#8F8179]">Lv.{event.previousLevel}</span>
              <span className="flex items-center self-stretch text-[#D98964]" aria-hidden="true">→</span>
              <span className="rounded-full bg-[#E85053] px-3 py-1.5 text-white">Lv.{event.newLevel}</span>
            </div>

            <div className="mt-3.5">
              <p className="text-[10px] font-bold tracking-[0.04em] text-[#A18C80]">새 칭호</p>
              <p className="mt-0.5 text-[20px] font-black text-[#31231D]">{event.levelName}</p>
            </div>

            {rewardItem ? (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#F0D6C8] bg-[#FFF7F2] px-3 py-2.5 text-left">
                <div className="flex h-[74px] w-[74px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">
                  <LunchmateCharacterRenderer
                    flowState="idle"
                    size={72}
                    renderSize="compact"
                    animated={false}
                    alt={`${rewardItem.name}을 착용한 런치메이트`}
                    loadout={createRewardPreviewLoadout(rewardItem)}
                    fallback={<Gift size={22} className="text-[#D8774D]" aria-hidden="true" />}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-bold tracking-[0.02em] text-[#B07D65]">이번 레벨 보상</p>
                  <p className="mt-0.5 truncate text-[14px] font-black text-[#49372E]">
                    {rewardItem.name}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-[#8F7C72]">
                      {SLOT_LABELS[rewardItem.slot]}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${RARITY_STYLES[rewardItem.rarity]}`}>
                      {RARITY_LABELS[rewardItem.rarity]}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[10px] text-[#8F7C72]">옷장에서 확인할 수 있어요</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#F0D6C8] bg-[#FFF7F2] px-3.5 py-3 text-left">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#D8774D] shadow-sm" aria-hidden="true">
                  <Gift size={19} />
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold tracking-[0.02em] text-[#B07D65]">이번 레벨 보상</p>
                  <p className="mt-0.5 text-[13px] font-black text-[#49372E]">
                    모든 꾸미기 아이템을 모았어요
                  </p>
                </div>
              </div>
            )}

            <p className="mt-2.5 text-[10px] leading-relaxed text-[#A99990]">
              현재 기기의 미리보기 보상으로 저장됐어요.
            </p>
            <button
              ref={confirmButtonRef}
              type="button"
              onClick={onClose}
              className="mt-4 h-11 w-full rounded-2xl bg-[#E85053] text-[14px] font-black text-white transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85053] focus-visible:ring-offset-2"
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
