import {
  getLunchmateRoomItem,
  normalizeLunchmateRoomLoadout,
  type LunchmateRoomRenderVariant,
} from '@/constants/lunchmateRoomThemes';
import type { LunchmateRoomLoadout } from '@/types/lunchmateCustomization';

export interface LunchmateRoomRendererProps {
  foodieSkin?: string | null;
  loadout?: LunchmateRoomLoadout | null;
  variant: LunchmateRoomRenderVariant;
}

/** Shared background stack. Character and interaction UI remain owned by the caller. */
export default function LunchmateRoomRenderer({
  foodieSkin,
  loadout,
  variant,
}: LunchmateRoomRendererProps) {
  const normalized = normalizeLunchmateRoomLoadout(loadout, foodieSkin);
  const layers = [
    ['wallpaper', getLunchmateRoomItem('wallpapers', normalized.wallpaperId)],
    ['floor', getLunchmateRoomItem('floors', normalized.floorId)],
    ['furniture', normalized.furnitureId
      ? getLunchmateRoomItem('furniture', normalized.furnitureId)
      : undefined],
    ['props', normalized.propsId ? getLunchmateRoomItem('props', normalized.propsId) : undefined],
  ] as const;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      data-lunchmate-room-background={variant}
      aria-hidden="true"
    >
      {layers.map(([layerName, item]) => item ? (
        <img
          key={layerName}
          src={item[variant].src}
          srcSet={item[variant].srcSet}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          data-lunchmate-room-layer={layerName}
          draggable={false}
        />
      ) : null)}
    </div>
  );
}
