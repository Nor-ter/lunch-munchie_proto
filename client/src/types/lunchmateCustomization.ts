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
