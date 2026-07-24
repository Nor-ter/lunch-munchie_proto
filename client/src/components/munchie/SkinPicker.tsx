import { useState } from 'react';
import { Check, CircleOff } from 'lucide-react';
import {
  LUNCHMATE_ROOM_FLOORS,
  LUNCHMATE_ROOM_FURNITURE,
  LUNCHMATE_ROOM_PROPS,
  LUNCHMATE_ROOM_THEMES,
  LUNCHMATE_ROOM_WALLPAPERS,
  type LunchmateRoomCategoryItem,
  type LunchmateRoomTheme,
} from '@/constants/lunchmateRoomThemes';
import type { LunchmateRoomLoadout } from '@/types/lunchmateCustomization';

type PickerCategory = 'presets' | 'wallpaper' | 'floor' | 'furniture' | 'props';

const CATEGORY_TABS: readonly { id: PickerCategory; label: string }[] = [
  { id: 'presets', label: '추천 테마' },
  { id: 'wallpaper', label: '벽지' },
  { id: 'floor', label: '바닥' },
  { id: 'furniture', label: '가구' },
  { id: 'props', label: '소품' },
];

function SelectionFrame({
  selected,
  children,
}: {
  selected: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-[#F7EEE8]"
      style={{
        outline: selected ? '3px solid #E85053' : '1px solid #E9DDD6',
        outlineOffset: selected ? 1 : 0,
      }}
    >
      {children}
      {selected && (
        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#E85053] text-white shadow">
          <Check size={14} strokeWidth={3} aria-hidden="true" />
        </span>
      )}
    </div>
  );
}

function ThemeCard({
  theme,
  selected,
  onSelect,
}: {
  theme: LunchmateRoomTheme;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${theme.labelKo} 추천 테마 선택`}
      className="min-w-0 rounded-2xl text-left transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85053] focus-visible:ring-offset-2"
    >
      <SelectionFrame selected={selected}>
        <img
          src={theme.thumbnail.src}
          srcSet={theme.thumbnail.srcSet}
          alt=""
          className="pointer-events-none h-full w-full object-cover"
          draggable={false}
        />
      </SelectionFrame>
      <p className={`mt-2 truncate text-center text-[12px] ${selected ? 'font-black text-[#E85053]' : 'font-bold text-[#4A4A4A]'}`}>
        {theme.labelKo}
      </p>
    </button>
  );
}

function ItemCard({
  item,
  categoryLabel,
  selected,
  onSelect,
}: {
  item: LunchmateRoomCategoryItem;
  categoryLabel: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${item.labelKo} ${categoryLabel} 선택`}
      className="min-w-0 rounded-2xl text-left transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85053] focus-visible:ring-offset-2"
    >
      <SelectionFrame selected={selected}>
        <img
          src={item.thumbnail}
          alt=""
          className="pointer-events-none h-full w-full object-cover"
          draggable={false}
        />
      </SelectionFrame>
      <p className={`mt-2 truncate text-center text-[12px] ${selected ? 'font-black text-[#E85053]' : 'font-bold text-[#4A4A4A]'}`}>
        {item.labelKo}
      </p>
    </button>
  );
}

function NoneCard({
  categoryLabel,
  selected,
  onSelect,
}: {
  categoryLabel: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${categoryLabel} 없음 선택`}
      className="min-w-0 rounded-2xl text-left transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85053] focus-visible:ring-offset-2"
    >
      <SelectionFrame selected={selected}>
        <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-[#A18C80]">
          <CircleOff size={25} strokeWidth={1.8} aria-hidden="true" />
          <span className="text-[11px] font-bold">없음</span>
        </span>
      </SelectionFrame>
      <p className={`mt-2 text-center text-[12px] ${selected ? 'font-black text-[#E85053]' : 'font-bold text-[#4A4A4A]'}`}>
        없음
      </p>
    </button>
  );
}

export default function SkinPicker({
  skinId,
  loadout,
  onPresetChange,
  onCategoryChange,
}: {
  skinId: string;
  loadout: LunchmateRoomLoadout;
  onPresetChange: (skinId: string) => void;
  onCategoryChange: (field: keyof LunchmateRoomLoadout, value: string | null) => void;
}) {
  const [category, setCategory] = useState<PickerCategory>('presets');

  const itemConfig = category === 'wallpaper'
    ? { items: LUNCHMATE_ROOM_WALLPAPERS, field: 'wallpaperId' as const, label: '벽지' }
    : category === 'floor'
      ? { items: LUNCHMATE_ROOM_FLOORS, field: 'floorId' as const, label: '바닥' }
      : category === 'furniture'
        ? { items: LUNCHMATE_ROOM_FURNITURE, field: 'furnitureId' as const, label: '가구' }
        : category === 'props'
          ? { items: LUNCHMATE_ROOM_PROPS, field: 'propsId' as const, label: '소품' }
          : null;

  return (
    <div className="min-w-0">
      <div
        className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="방 꾸미기 카테고리"
      >
        {CATEGORY_TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={category === tab.id}
            onClick={() => setCategory(tab.id)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-[11px] font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85053] ${
              category === tab.id
                ? 'bg-[#E85053] text-white'
                : 'bg-[#F4EAE4] text-[#806D63]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4">
        {category === 'presets' && LUNCHMATE_ROOM_THEMES.map(theme => (
          <ThemeCard
            key={theme.skinId}
            theme={theme}
            selected={skinId === theme.skinId
              && Object.entries(theme.loadout).every(([field, value]) => (
                loadout[field as keyof LunchmateRoomLoadout] === value
              ))}
            onSelect={() => onPresetChange(theme.skinId)}
          />
        ))}

        {itemConfig && (itemConfig.field === 'furnitureId' || itemConfig.field === 'propsId') && (
          <NoneCard
            categoryLabel={itemConfig.label}
            selected={loadout[itemConfig.field] === null}
            onSelect={() => onCategoryChange(itemConfig.field, null)}
          />
        )}

        {itemConfig && itemConfig.items.map(item => (
          <ItemCard
            key={item.id}
            item={item}
            categoryLabel={itemConfig.label}
            selected={loadout[itemConfig.field] === item.id}
            onSelect={() => onCategoryChange(itemConfig.field, item.id)}
          />
        ))}
      </div>
    </div>
  );
}
