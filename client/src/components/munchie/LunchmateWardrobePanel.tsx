import { useMemo, useState, type KeyboardEvent } from 'react';
import {
  Backpack,
  Check,
  Crown,
  Glasses,
  LockKeyhole,
  Shirt,
  X,
} from 'lucide-react';
import LunchmateCharacterRenderer from '@/components/munchie/LunchmateCharacterRenderer';
import { LUNCHMATE_ITEMS_BY_SLOT } from '@/constants/lunchmateItems';
import type {
  LunchmateLayerItem,
  LunchmateLoadout,
  LunchmateRarity,
  LunchmateSlot,
} from '@/types/lunchmateCustomization';
import {
  areLunchmateLoadoutsEqual,
  clearPreviewLoadout,
  createWardrobeCandidateLoadout,
  getWardrobeSlotItemId,
  selectPreviewWardrobeItem,
} from '@/components/munchie/lunchmateWardrobeFixtures';

interface LunchmateWardrobePanelProps {
  draftLoadout: LunchmateLoadout;
  appliedLoadout: LunchmateLoadout;
  ownedItemIds: readonly string[];
  appliedNotice: boolean;
  onDraftChange: (loadout: LunchmateLoadout) => void;
  onApply: () => void;
}

const WARDROBE_SLOTS = [
  { id: 'outfit', label: '옷', Icon: Shirt },
  { id: 'headwear', label: '모자', Icon: Crown },
  { id: 'eyewear', label: '안경', Icon: Glasses },
  { id: 'bag', label: '가방', Icon: Backpack },
] as const satisfies readonly { id: LunchmateSlot; label: string; Icon: typeof Shirt }[];

const RARITY_LABELS: Record<LunchmateRarity, string> = {
  common: '일반',
  rare: '레어',
  special: '스페셜',
};

function WardrobeItemCard({
  item,
  activeSlot,
  draftLoadout,
  selected,
  locked,
  onSelect,
}: {
  item: LunchmateLayerItem | null;
  activeSlot: LunchmateSlot;
  draftLoadout: LunchmateLoadout;
  selected: boolean;
  locked: boolean;
  onSelect: () => void;
}) {
  const itemId = item?.id ?? null;
  const name = item?.name ?? '착용 안 함';
  const candidateLoadout = createWardrobeCandidateLoadout(draftLoadout, activeSlot, itemId);

  return (
    <button
      type="button"
      onClick={() => {
        if (!locked) onSelect();
      }}
      aria-pressed={selected}
      aria-disabled={locked}
      aria-label={`${name}, ${locked ? '레벨업으로 획득' : selected ? '선택됨' : '선택 가능'}`}
      className={`relative min-w-0 rounded-2xl border p-1.5 text-left transition-[border-color,background-color,opacity,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85053] focus-visible:ring-offset-2 ${
        selected
          ? 'border-[#E85053] bg-[#FFF4F1] shadow-sm'
          : 'border-[#EEE1DA] bg-[#FFFBF8]'
      } ${locked ? 'cursor-not-allowed opacity-55' : 'active:scale-[0.98]'}`}
    >
      <span className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-[#F8F1EC]">
        <LunchmateCharacterRenderer
          flowState="idle"
          size={74}
          alt=""
          loadout={candidateLoadout}
          animated={false}
          renderSize="compact"
          artwork="chicken"
        />
        {item === null && (
          <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-[#A18C80] shadow-sm" aria-hidden="true">
            <X size={12} />
          </span>
        )}
        {locked && (
          <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#5E514A]/85 text-white" aria-hidden="true">
            <LockKeyhole size={11} />
          </span>
        )}
        {selected && (
          <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E85053] text-white shadow-sm" aria-hidden="true">
            <Check size={12} strokeWidth={3} />
          </span>
        )}
      </span>

      <span className="mt-1.5 line-clamp-2 min-h-[2rem] text-[10px] font-black leading-4 text-[#49372E]">
        {name}
      </span>
      <span className={`mt-0.5 block text-[8px] font-semibold ${locked ? 'text-[#88766C]' : 'text-[#AF8E7D]'}`}>
        {locked ? '레벨업으로 획득' : item ? RARITY_LABELS[item.rarity] : '선택 가능'}
      </span>
    </button>
  );
}

export default function LunchmateWardrobePanel({
  draftLoadout,
  appliedLoadout,
  ownedItemIds,
  appliedNotice,
  onDraftChange,
  onApply,
}: LunchmateWardrobePanelProps) {
  const [activeSlot, setActiveSlot] = useState<LunchmateSlot>('outfit');
  const ownedItemIdSet = useMemo(() => new Set(ownedItemIds), [ownedItemIds]);
  const activeItemId = getWardrobeSlotItemId(draftLoadout, activeSlot);
  const hasChanges = !areLunchmateLoadoutsEqual(draftLoadout, appliedLoadout);

  const handleSlotKeyDown = (event: KeyboardEvent<HTMLButtonElement>, slotIndex: number) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (slotIndex + direction + WARDROBE_SLOTS.length) % WARDROBE_SLOTS.length;
    const nextSlot = WARDROBE_SLOTS[nextIndex];
    setActiveSlot(nextSlot.id);
    document.getElementById(`wardrobe-slot-${nextSlot.id}`)?.focus();
  };

  return (
    <div>
      <h2 className="text-[16px] font-black">옷장</h2>
      <p className="mt-1 text-[11px] leading-relaxed text-[#927E73]">
        보유한 아이템을 조합해 런치메이트를 꾸며보세요.
      </p>
      <p className="mt-1 text-[9px] font-semibold text-[#B09A8E]">
        선택 중에는 미리보기이며 적용하기를 눌러 저장해요.
      </p>

      <div
        role="tablist"
        aria-label="옷장 아이템 종류"
        className="mt-4 grid grid-cols-4 gap-1 rounded-2xl bg-[#F4EAE4] p-1"
      >
        {WARDROBE_SLOTS.map(({ id, label, Icon }, index) => {
          const selected = activeSlot === id;
          return (
            <button
              key={id}
              id={`wardrobe-slot-${id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="wardrobe-items-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveSlot(id)}
              onKeyDown={(event) => handleSlotKeyDown(event, index)}
              className={`flex min-h-11 items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85053] ${
                selected ? 'bg-white text-[#E85053] shadow-sm' : 'text-[#87756B]'
              }`}
            >
              <Icon size={14} aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      <div
        id="wardrobe-items-panel"
        role="tabpanel"
        aria-labelledby={`wardrobe-slot-${activeSlot}`}
        className="mt-3 grid grid-cols-3 gap-3 min-[450px]:grid-cols-4"
      >
        <WardrobeItemCard
          item={null}
          activeSlot={activeSlot}
          draftLoadout={draftLoadout}
          selected={activeItemId === null}
          locked={false}
          onSelect={() => onDraftChange(selectPreviewWardrobeItem(
            draftLoadout,
            activeSlot,
            null,
            ownedItemIdSet,
          ))}
        />
        {LUNCHMATE_ITEMS_BY_SLOT[activeSlot].map(item => {
          const locked = !ownedItemIdSet.has(item.id);
          return (
            <WardrobeItemCard
              key={item.id}
              item={item}
              activeSlot={activeSlot}
              draftLoadout={draftLoadout}
              selected={activeItemId === item.id}
              locked={locked}
              onSelect={() => onDraftChange(selectPreviewWardrobeItem(
                draftLoadout,
                activeSlot,
                item.id,
                ownedItemIdSet,
              ))}
            />
          );
        })}
      </div>

      <div className="mt-5 border-t border-[#F1E5DE] pt-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onDraftChange(clearPreviewLoadout())}
            className="h-11 flex-1 rounded-2xl border border-[#E8D8CF] bg-white text-[12px] font-bold text-[#735F54] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85053]"
          >
            전체 해제
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={!hasChanges}
            className="h-11 flex-[1.45] rounded-2xl bg-[#E85053] text-[12px] font-black text-white transition-opacity active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85053] focus-visible:ring-offset-2"
          >
            적용하기
          </button>
        </div>
        <p className="mt-2 text-center text-[9px] leading-relaxed text-[#A18C80]">
          적용하기를 누른 조합만 프로필에 저장돼요.
        </p>
        <p className="min-h-4 text-center text-[9px] font-bold text-[#D45A55]" aria-live="polite">
          {appliedNotice ? '프로필에 적용했어요.' : ''}
        </p>
      </div>
    </div>
  );
}
