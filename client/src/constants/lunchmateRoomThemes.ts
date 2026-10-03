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
  categoryItem('wallpapers', 'wallpaper_pink_blush', "Blush Pink", 'pink-picnic'),
  categoryItem('wallpapers', 'wallpaper_butter_tile', "Butter Tile", 'yellow-lunch-tray'),
  categoryItem('wallpapers', 'wallpaper_vintage_pin_dot', "Vintage Pin Dot", 'vintage-frame'),
  categoryItem('wallpapers', 'wallpaper_blue_note', "Powder Blue", 'blue-note'),
  categoryItem('wallpapers', 'wallpaper_garden_ivory', "Garden Ivory", 'flower-garden'),
  categoryItem('wallpapers', 'wallpaper_modern_lilac', "Modern Lilac", 'modern-minimal'),
] as const;

export const LUNCHMATE_ROOM_FLOORS = [
  categoryItem('floors', 'floor_pale_wood', "Peach Wood", 'pink-picnic'),
  categoryItem('floors', 'floor_honey_wood', "Honey Wood", 'yellow-lunch-tray'),
  categoryItem('floors', 'floor_walnut', "Walnut Wood", 'vintage-frame'),
  categoryItem('floors', 'floor_light_wood', "Light Wood", 'blue-note'),
  categoryItem('floors', 'floor_sunroom_stone', "Sunroom Stone", 'flower-garden'),
  categoryItem('floors', 'floor_minimal_wood', "Cream Wood", 'modern-minimal'),
] as const;

export const LUNCHMATE_ROOM_FURNITURE = [
  categoryItem('furniture', 'furniture_picnic_cabinet', "Picnic Cabinet", 'pink-picnic'),
  categoryItem('furniture', 'furniture_yellow_kitchenette', "Mini Kitchen", 'yellow-lunch-tray'),
  categoryItem('furniture', 'furniture_vintage_record_cabinet', "Record Cabinet", 'vintage-frame'),
  categoryItem('furniture', 'furniture_blue_study_desk', "Blue Study Desk", 'blue-note'),
  categoryItem('furniture', 'furniture_garden_shelf_chair', "Garden Retreat", 'flower-garden'),
  categoryItem('furniture', 'furniture_minimal_console', "Minimal Console", 'modern-minimal'),
] as const;

export const LUNCHMATE_ROOM_PROPS = [
  categoryItem('props', 'props_pink_picnic', "Pink Picnic", 'pink-picnic'),
  categoryItem('props', 'props_yellow_lunch', "Yellow Lunch", 'yellow-lunch-tray'),
  categoryItem('props', 'props_vintage_frames', "Vintage Frame", 'vintage-frame'),
  categoryItem('props', 'props_blue_note', "Blue Note", 'blue-note'),
  categoryItem('props', 'props_flower_garden', "Flower Garden", 'flower-garden'),
  categoryItem('props', 'props_modern_minimal', "Modern Minimal", 'modern-minimal'),
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
  roomTheme('modern-minimal', 'modern-minimal', '모던 미니멀', '#C46A62', {
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
