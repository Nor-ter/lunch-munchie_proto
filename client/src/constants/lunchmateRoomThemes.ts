import type { LunchmateRoomLoadout } from '@/types/lunchmateCustomization';

export type LunchmateRoomThemeAssetKey =
  | 'pink-picnic'
  | 'yellow-lunch-tray'
  | 'vintage-frame'
  | 'blue-note'
  | 'flower-garden'
  | 'modern-minimal';

export type LunchmateRoomCategory = 'wallpapers' | 'floors' | 'furniture' | 'props';
export type LunchmateRoomRenderVariant = 'stage' | 'profile';

export interface LunchmateRoomAssetSource {
  src: string;
  srcSet: string;
}

export interface LunchmateRoomCategoryItem {
  id: string;
  labelKo: string;
  assetKey: LunchmateRoomThemeAssetKey;
  stage: LunchmateRoomAssetSource;
  profile: LunchmateRoomAssetSource;
  thumbnail: string;
}

export interface LunchmateRoomTheme {
  /** Existing lm_profile.foodieSkin value. This is the persistence contract. */
  skinId: string;
  assetKey: LunchmateRoomThemeAssetKey;
  labelKo: string;
  accent: string;
  loadout: LunchmateRoomLoadout;
  thumbnail: LunchmateRoomAssetSource;
}

const ASSET_ROOT = '/assets/lunchmate/room-customization';
const PRESET_ASSET_ROOT = '/assets/lunchmate/lunchmate-room-themes-v1';

function responsiveLayerAsset(
  category: LunchmateRoomCategory,
  assetKey: LunchmateRoomThemeAssetKey,
  variant: LunchmateRoomRenderVariant,
): LunchmateRoomAssetSource {
  const oneXFolder = variant === 'profile' ? 'profile-1x' : '1x';
  const twoXFolder = variant === 'profile' ? 'profile-2x' : '2x';
  const src = `${ASSET_ROOT}/${category}/${oneXFolder}/${assetKey}.png`;
  return {
    src,
    srcSet: `${src} 1x, ${ASSET_ROOT}/${category}/${twoXFolder}/${assetKey}.png 2x`,
  };
}

function categoryItem(
  category: LunchmateRoomCategory,
  id: string,
  labelKo: string,
  assetKey: LunchmateRoomThemeAssetKey,
): LunchmateRoomCategoryItem {
  return {
    id,
    labelKo,
    assetKey,
    stage: responsiveLayerAsset(category, assetKey, 'stage'),
    profile: responsiveLayerAsset(category, assetKey, 'profile'),
    thumbnail: `${ASSET_ROOT}/thumbnails/${category}/${assetKey}.png`,
  };
}

export const LUNCHMATE_ROOM_WALLPAPERS = [
  categoryItem('wallpapers', 'wallpaper_pink_blush', '블러시 핑크', 'pink-picnic'),
  categoryItem('wallpapers', 'wallpaper_butter_tile', '버터 타일', 'yellow-lunch-tray'),
  categoryItem('wallpapers', 'wallpaper_vintage_pin_dot', '빈티지 핀도트', 'vintage-frame'),
  categoryItem('wallpapers', 'wallpaper_blue_note', '파우더 블루', 'blue-note'),
  categoryItem('wallpapers', 'wallpaper_garden_ivory', '가든 아이보리', 'flower-garden'),
  categoryItem('wallpapers', 'wallpaper_modern_lilac', '모던 라일락', 'modern-minimal'),
] as const;

export const LUNCHMATE_ROOM_FLOORS = [
  categoryItem('floors', 'floor_pale_wood', '피치 우드', 'pink-picnic'),
  categoryItem('floors', 'floor_honey_wood', '허니 우드', 'yellow-lunch-tray'),
  categoryItem('floors', 'floor_walnut', '월넛 우드', 'vintage-frame'),
  categoryItem('floors', 'floor_light_wood', '라이트 우드', 'blue-note'),
  categoryItem('floors', 'floor_sunroom_stone', '선룸 스톤', 'flower-garden'),
  categoryItem('floors', 'floor_minimal_wood', '크림 우드', 'modern-minimal'),
] as const;

export const LUNCHMATE_ROOM_FURNITURE = [
  categoryItem('furniture', 'furniture_picnic_cabinet', '피크닉 수납장', 'pink-picnic'),
  categoryItem('furniture', 'furniture_yellow_kitchenette', '미니 키친', 'yellow-lunch-tray'),
  categoryItem('furniture', 'furniture_vintage_record_cabinet', '레코드 수납장', 'vintage-frame'),
  categoryItem('furniture', 'furniture_blue_study_desk', '블루 공부책상', 'blue-note'),
  categoryItem('furniture', 'furniture_garden_shelf_chair', '가든 쉼터', 'flower-garden'),
  categoryItem('furniture', 'furniture_minimal_console', '미니멀 콘솔', 'modern-minimal'),
] as const;

export const LUNCHMATE_ROOM_PROPS = [
  categoryItem('props', 'props_pink_picnic', '핑크 피크닉', 'pink-picnic'),
  categoryItem('props', 'props_yellow_lunch', '옐로우 런치', 'yellow-lunch-tray'),
  categoryItem('props', 'props_vintage_frames', '빈티지 프레임', 'vintage-frame'),
  categoryItem('props', 'props_blue_note', '블루 노트', 'blue-note'),
  categoryItem('props', 'props_flower_garden', '플라워 가든', 'flower-garden'),
  categoryItem('props', 'props_modern_minimal', '모던 미니멀', 'modern-minimal'),
] as const;

function presetThumbnail(assetKey: LunchmateRoomThemeAssetKey): LunchmateRoomAssetSource {
  const src = `${PRESET_ASSET_ROOT}/thumbnails/1x/${assetKey}.png`;
  return {
    src,
    srcSet: `${src} 1x, ${PRESET_ASSET_ROOT}/thumbnails/2x/${assetKey}.png 2x`,
  };
}

function roomTheme(
  skinId: string,
  assetKey: LunchmateRoomThemeAssetKey,
  labelKo: string,
  accent: string,
  loadout: LunchmateRoomLoadout,
): LunchmateRoomTheme {
  return { skinId, assetKey, labelKo, accent, loadout, thumbnail: presetThumbnail(assetKey) };
}

/** Existing foodieSkin IDs intentionally stay separate from customization asset keys. */
export const LUNCHMATE_ROOM_THEMES: readonly LunchmateRoomTheme[] = [
  roomTheme('pink-picnic', 'pink-picnic', '핑크 피크닉', '#F46B72', {
    wallpaperId: 'wallpaper_pink_blush',
    floorId: 'floor_pale_wood',
    furnitureId: 'furniture_picnic_cabinet',
    propsId: 'props_pink_picnic',
  }),
  roomTheme('yellow-munchtray', 'yellow-lunch-tray', '옐로우 런치트레이', '#F0B94E', {
    wallpaperId: 'wallpaper_butter_tile',
    floorId: 'floor_honey_wood',
    furnitureId: 'furniture_yellow_kitchenette',
    propsId: 'props_yellow_lunch',
  }),
  roomTheme('vintage-frame', 'vintage-frame', '빈티지 프레임', '#8C5A3A', {
    wallpaperId: 'wallpaper_vintage_pin_dot',
    floorId: 'floor_walnut',
    furnitureId: 'furniture_vintage_record_cabinet',
    propsId: 'props_vintage_frames',
  }),
  roomTheme('blue-note', 'blue-note', '블루 노트', '#6C98C7', {
    wallpaperId: 'wallpaper_blue_note',
    floorId: 'floor_light_wood',
    furnitureId: 'furniture_blue_study_desk',
    propsId: 'props_blue_note',
  }),
  roomTheme('flower-garden', 'flower-garden', '플라워 가든', '#7FA66C', {
    wallpaperId: 'wallpaper_garden_ivory',
    floorId: 'floor_sunroom_stone',
    furnitureId: 'furniture_garden_shelf_chair',
    propsId: 'props_flower_garden',
  }),
  roomTheme('modern-minimal', 'modern-minimal', '모던 미니멀', '#A991BD', {
    wallpaperId: 'wallpaper_modern_lilac',
    floorId: 'floor_minimal_wood',
    furnitureId: 'furniture_minimal_console',
    propsId: 'props_modern_minimal',
  }),
];

export const LUNCHMATE_ROOM_ITEMS = {
  wallpapers: LUNCHMATE_ROOM_WALLPAPERS,
  floors: LUNCHMATE_ROOM_FLOORS,
  furniture: LUNCHMATE_ROOM_FURNITURE,
  props: LUNCHMATE_ROOM_PROPS,
} as const;

const WALLPAPER_BY_ID = new Map(LUNCHMATE_ROOM_WALLPAPERS.map(item => [item.id, item]));
const FLOOR_BY_ID = new Map(LUNCHMATE_ROOM_FLOORS.map(item => [item.id, item]));
const FURNITURE_BY_ID = new Map(LUNCHMATE_ROOM_FURNITURE.map(item => [item.id, item]));
const PROPS_BY_ID = new Map(LUNCHMATE_ROOM_PROPS.map(item => [item.id, item]));

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function getLunchmateRoomTheme(skinId?: string | null): LunchmateRoomTheme {
  return LUNCHMATE_ROOM_THEMES.find(theme => theme.skinId === skinId)
    ?? LUNCHMATE_ROOM_THEMES[0];
}

export function normalizeLunchmateRoomLoadout(
  value: unknown,
  foodieSkin?: string | null,
): LunchmateRoomLoadout {
  const preset = getLunchmateRoomTheme(foodieSkin).loadout;
  const candidate = isRecord(value) ? value : {};
  return {
    wallpaperId: typeof candidate.wallpaperId === 'string' && WALLPAPER_BY_ID.has(candidate.wallpaperId)
      ? candidate.wallpaperId
      : preset.wallpaperId,
    floorId: typeof candidate.floorId === 'string' && FLOOR_BY_ID.has(candidate.floorId)
      ? candidate.floorId
      : preset.floorId,
    furnitureId: candidate.furnitureId === null
      ? null
      : typeof candidate.furnitureId === 'string' && FURNITURE_BY_ID.has(candidate.furnitureId)
        ? candidate.furnitureId
        : preset.furnitureId,
    propsId: candidate.propsId === null
      ? null
      : typeof candidate.propsId === 'string' && PROPS_BY_ID.has(candidate.propsId)
        ? candidate.propsId
        : preset.propsId,
  };
}

export function getLunchmateRoomItem(
  category: LunchmateRoomCategory,
  id: string,
): LunchmateRoomCategoryItem | undefined {
  return LUNCHMATE_ROOM_ITEMS[category].find(item => item.id === id);
}

export function createLunchmateRoomPresetUpdate(skinId: string): {
  foodieSkin: string;
  lunchmateRoomLoadout: LunchmateRoomLoadout;
} {
  const theme = getLunchmateRoomTheme(skinId);
  return {
    foodieSkin: theme.skinId,
    lunchmateRoomLoadout: { ...theme.loadout },
  };
}

export function createLunchmateRoomCategoryUpdate(
  current: unknown,
  foodieSkin: string | null | undefined,
  field: keyof LunchmateRoomLoadout,
  value: string | null,
): { lunchmateRoomLoadout: LunchmateRoomLoadout } {
  const normalized = normalizeLunchmateRoomLoadout(current, foodieSkin);
  const candidate = { ...normalized, [field]: value };
  return {
    lunchmateRoomLoadout: normalizeLunchmateRoomLoadout(candidate, foodieSkin),
  };
}
