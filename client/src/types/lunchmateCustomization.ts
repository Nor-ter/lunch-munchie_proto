import type {
  LunchmateAssetSource,
  LunchmateStateAssetKey,
} from '../constants/lunchmateAssets';

export type LunchmateSlot = 'outfit' | 'headwear' | 'eyewear' | 'bag';

export type LunchmateRarity = 'common' | 'rare' | 'special';

export interface LunchmateLoadout {
  outfitId: string | null;
  headwearId: string | null;
  eyewearId: string | null;
  bagId: string | null;
}

/** lm_profile에 저장하는 장착 상태. 보유 목록이나 잠금 상태는 포함하지 않는다. */
export interface LunchmateProfileLoadout {
  outfit: string | null;
  headwear: string | null;
  eyewear: string | null;
  bag: string | null;
}

/** lm_profile에 선택적으로 저장하는 방 네 category 조합. */
export interface LunchmateRoomLoadout {
  wallpaperId: string;
  floorId: string;
  furnitureId: string | null;
  propsId: string | null;
}

export interface LunchmateLayerPart {
  default: LunchmateAssetSource;
  stateOverrides?: Partial<Record<LunchmateStateAssetKey, LunchmateAssetSource>>;
}

export interface LunchmateLayerItem {
  id: string;
  slot: LunchmateSlot;
  name: string;
  rarity: LunchmateRarity;
  front: LunchmateLayerPart;
  back?: LunchmateLayerPart;
}
