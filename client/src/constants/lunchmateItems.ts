import {
  lunchmateLayerAssetSource,
  type LunchmateAssetSource,
  type LunchmateStateAssetKey,
} from './lunchmateAssets';
import type {
  LunchmateLayerItem,
  LunchmateLayerPart,
  LunchmateLoadout,
  LunchmateSlot,
} from '../types/lunchmateCustomization';

function layerPart(relativePath: string): LunchmateLayerPart {
  return { default: lunchmateLayerAssetSource(relativePath) };
}

export const LUNCHMATE_ITEMS = [
  {
    id: 'outfit_hoodie_coral',
    slot: 'outfit',
    name: '코랄 후드티',
    rarity: 'common',
    front: layerPart('outfit/hoodie'),
    back: layerPart('outfit/hoodie_back'),
  },
  {
    id: 'outfit_sailor_navy',
    slot: 'outfit',
    name: '네이비 세일러복',
    rarity: 'common',
    front: layerPart('outfit/sailor_navy'),
  },
  {
    id: 'outfit_overalls_denim',
    slot: 'outfit',
    name: '데님 멜빵바지',
    rarity: 'common',
    front: layerPart('outfit/overalls_denim'),
  },
  {
    id: 'outfit_chef_coat',
    slot: 'outfit',
    name: '꼬마 셰프 코트',
    rarity: 'common',
    front: layerPart('outfit/chef_coat'),
  },
  {
    id: 'outfit_varsity_coral',
    slot: 'outfit',
    name: '코랄 바시티 재킷',
    rarity: 'rare',
    front: layerPart('outfit/varsity_coral'),
  },
  {
    id: 'outfit_striped_sweater_mint',
    slot: 'outfit',
    name: '민트 줄무늬 스웨터',
    rarity: 'common',
    front: layerPart('outfit/striped_sweater_mint'),
  },
  {
    id: 'outfit_raincoat_yellow',
    slot: 'outfit',
    name: '노랑 레인코트',
    rarity: 'rare',
    front: layerPart('outfit/raincoat_yellow'),
    back: layerPart('outfit/raincoat_yellow_back'),
  },
  {
    id: 'outfit_cardigan_picnic',
    slot: 'outfit',
    name: '피크닉 가디건',
    rarity: 'rare',
    front: layerPart('outfit/cardigan_picnic'),
  },
  {
    id: 'headwear_beret_coral',
    slot: 'headwear',
    name: '코랄 베레모',
    rarity: 'common',
    front: layerPart('headwear/beret'),
  },
  {
    id: 'headwear_cap_green',
    slot: 'headwear',
    name: '초록 캡모자',
    rarity: 'common',
    front: layerPart('headwear/cap_green'),
  },
  {
    id: 'headwear_bucket_hat_yellow',
    slot: 'headwear',
    name: '노랑 버킷햇',
    rarity: 'common',
    front: layerPart('headwear/bucket_hat_yellow'),
  },
  {
    id: 'headwear_chef_hat_white',
    slot: 'headwear',
    name: '셰프 모자',
    rarity: 'common',
    front: layerPart('headwear/chef_hat'),
  },
  {
    id: 'headwear_beanie_mint',
    slot: 'headwear',
    name: '민트 비니',
    rarity: 'common',
    front: layerPart('headwear/beanie_mint'),
  },
  {
    id: 'headwear_crown_star_gold',
    slot: 'headwear',
    name: '별 왕관',
    rarity: 'special',
    front: layerPart('headwear/crown_star'),
  },
  {
    id: 'headwear_flower_headband_pink',
    slot: 'headwear',
    name: '꽃 헤드밴드',
    rarity: 'rare',
    front: layerPart('headwear/flower_headband'),
  },
  {
    id: 'headwear_bunny_ears_pink',
    slot: 'headwear',
    name: '토끼 귀',
    rarity: 'rare',
    front: layerPart('headwear/bunny_ears'),
  },
  {
    id: 'headwear_newsboy_cap_lavender',
    slot: 'headwear',
    name: '라벤더 헌팅캡',
    rarity: 'rare',
    front: layerPart('headwear/newsboy_cap_lavender'),
  },
  {
    id: 'eyewear_round_black',
    slot: 'eyewear',
    name: '검정 동그란 안경',
    rarity: 'common',
    front: layerPart('eyewear/round_glasses'),
  },
  {
    id: 'eyewear_square_brown',
    slot: 'eyewear',
    name: '브라운 사각 안경',
    rarity: 'common',
    front: layerPart('eyewear/square_brown'),
  },
  {
    id: 'eyewear_heart_coral',
    slot: 'eyewear',
    name: '코랄 하트 안경',
    rarity: 'rare',
    front: layerPart('eyewear/heart_coral'),
  },
  {
    id: 'eyewear_aviator_gold',
    slot: 'eyewear',
    name: '골드 보잉 선글라스',
    rarity: 'rare',
    front: layerPart('eyewear/aviator_gold'),
  },
  {
    id: 'eyewear_star_yellow',
    slot: 'eyewear',
    name: '노랑 별 안경',
    rarity: 'special',
    front: layerPart('eyewear/star_yellow'),
  },
  {
    id: 'eyewear_cateye_pink',
    slot: 'eyewear',
    name: '핑크 캣아이 안경',
    rarity: 'common',
    front: layerPart('eyewear/cateye_pink'),
  },
  {
    id: 'eyewear_halfmoon_blue',
    slot: 'eyewear',
    name: '블루 반달 안경',
    rarity: 'common',
    front: layerPart('eyewear/halfmoon_blue'),
  },
  {
    id: 'bag_backpack_green',
    slot: 'bag',
    name: '초록 백팩',
    rarity: 'common',
    front: layerPart('bag/backpack_straps'),
    back: layerPart('bag/backpack_back'),
  },
  {
    id: 'bag_satchel_brown',
    slot: 'bag',
    name: '브라운 사첼백',
    rarity: 'common',
    front: layerPart('bag/satchel_brown_front'),
    back: layerPart('bag/satchel_brown_back'),
  },
  {
    id: 'bag_tote_pink',
    slot: 'bag',
    name: '핑크 토트백',
    rarity: 'common',
    front: layerPart('bag/tote_pink_front'),
    back: layerPart('bag/tote_pink_back'),
  },
  {
    id: 'bag_camera_blue',
    slot: 'bag',
    name: '블루 카메라백',
    rarity: 'rare',
    front: layerPart('bag/camera_blue_front'),
    back: layerPart('bag/camera_blue_back'),
  },
  {
    id: 'bag_bear_backpack_brown',
    slot: 'bag',
    name: '곰돌이 백팩',
    rarity: 'special',
    front: layerPart('bag/bear_backpack_front'),
    back: layerPart('bag/bear_backpack_back'),
  },
  {
    id: 'bag_lunchbox_yellow',
    slot: 'bag',
    name: '노랑 런치박스백',
    rarity: 'rare',
    front: layerPart('bag/lunchbox_yellow_front'),
    back: layerPart('bag/lunchbox_yellow_back'),
  },
  {
    id: 'bag_drawstring_mint',
    slot: 'bag',
    name: '민트 조리개백',
    rarity: 'common',
    front: layerPart('bag/drawstring_mint_front'),
    back: layerPart('bag/drawstring_mint_back'),
  },
] as const satisfies readonly LunchmateLayerItem[];

export const LUNCHMATE_ITEMS_BY_ID = Object.fromEntries(
  LUNCHMATE_ITEMS.map(item => [item.id, item]),
) as Readonly<Partial<Record<string, LunchmateLayerItem>>>;

export const LUNCHMATE_ITEMS_BY_SLOT = {
  outfit: LUNCHMATE_ITEMS.filter(item => item.slot === 'outfit'),
  headwear: LUNCHMATE_ITEMS.filter(item => item.slot === 'headwear'),
  eyewear: LUNCHMATE_ITEMS.filter(item => item.slot === 'eyewear'),
  bag: LUNCHMATE_ITEMS.filter(item => item.slot === 'bag'),
} satisfies Readonly<Record<LunchmateSlot, readonly LunchmateLayerItem[]>>;

export const EMPTY_LUNCHMATE_LOADOUT: Readonly<LunchmateLoadout> = Object.freeze({
  outfitId: null,
  headwearId: null,
  eyewearId: null,
  bagId: null,
});

/** Phase 2B의 Room 합성 확인 전용 fixture. 저장 상태와 연결하지 않는다. */
export const LAYER_PREVIEW_LOADOUT: Readonly<LunchmateLoadout> = Object.freeze({
  outfitId: 'outfit_hoodie_coral',
  headwearId: 'headwear_beret_coral',
  eyewearId: 'eyewear_round_black',
  bagId: 'bag_backpack_green',
});

export type LunchmateAccessoryLayerName =
  | 'bag-back'
  | 'outfit-back'
  | 'outfit-front'
  | 'bag-front'
  | 'eyewear'
  | 'headwear';

export type LunchmateResolvedLayer =
  | { layerName: 'base' }
  | { layerName: LunchmateAccessoryLayerName; source: LunchmateAssetSource };

export const LUNCHMATE_LAYER_ORDER = [
  'bag-back',
  'outfit-back',
  'base',
  'outfit-front',
  'bag-front',
  'eyewear',
  'headwear',
] as const;

function resolveLoadoutItem(
  itemId: string | null,
  expectedSlot: LunchmateSlot,
): LunchmateLayerItem | undefined {
  if (!itemId) return undefined;
  const item = LUNCHMATE_ITEMS_BY_ID[itemId];
  return item?.slot === expectedSlot ? item : undefined;
}

export function resolveLunchmateLayerSource(
  part: LunchmateLayerPart | undefined,
  visualState: LunchmateStateAssetKey,
): LunchmateAssetSource | undefined {
  if (!part) return undefined;
  return part.stateOverrides?.[visualState] ?? part.default;
}

export function resolveLunchmateRenderLayers(
  loadout: LunchmateLoadout,
  visualState: LunchmateStateAssetKey,
): LunchmateResolvedLayer[] {
  const outfit = resolveLoadoutItem(loadout.outfitId, 'outfit');
  const headwear = resolveLoadoutItem(loadout.headwearId, 'headwear');
  const eyewear = resolveLoadoutItem(loadout.eyewearId, 'eyewear');
  const bag = resolveLoadoutItem(loadout.bagId, 'bag');
  const layers: LunchmateResolvedLayer[] = [];

  const bagBack = resolveLunchmateLayerSource(bag?.back, visualState);
  const outfitBack = resolveLunchmateLayerSource(outfit?.back, visualState);
  const outfitFront = resolveLunchmateLayerSource(outfit?.front, visualState);
  const bagFront = resolveLunchmateLayerSource(bag?.front, visualState);
  const eyewearFront = resolveLunchmateLayerSource(eyewear?.front, visualState);
  const headwearFront = resolveLunchmateLayerSource(headwear?.front, visualState);

  if (bagBack) layers.push({ layerName: 'bag-back', source: bagBack });
  if (outfitBack) layers.push({ layerName: 'outfit-back', source: outfitBack });
  layers.push({ layerName: 'base' });
  if (outfitFront) layers.push({ layerName: 'outfit-front', source: outfitFront });
  if (bagFront) layers.push({ layerName: 'bag-front', source: bagFront });
  if (eyewearFront) layers.push({ layerName: 'eyewear', source: eyewearFront });
  if (headwearFront) layers.push({ layerName: 'headwear', source: headwearFront });

  return layers;
}
