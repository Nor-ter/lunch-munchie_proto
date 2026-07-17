import {
  EMPTY_LUNCHMATE_LOADOUT,
  LAYER_PREVIEW_LOADOUT,
  LUNCHMATE_ITEMS_BY_ID,
} from '../../constants/lunchmateItems';
import type { LunchmateLoadout, LunchmateSlot } from '../../types/lunchmateCustomization';

export const PREVIEW_INITIAL_LOADOUT: Readonly<LunchmateLoadout> = Object.freeze({
  ...LAYER_PREVIEW_LOADOUT,
});

export const LUNCHMATE_SLOT_LOADOUT_KEYS = {
  outfit: 'outfitId',
  headwear: 'headwearId',
  eyewear: 'eyewearId',
  bag: 'bagId',
} as const satisfies Record<LunchmateSlot, keyof LunchmateLoadout>;

export function getWardrobeSlotItemId(
  loadout: LunchmateLoadout,
  slot: LunchmateSlot,
): string | null {
  return loadout[LUNCHMATE_SLOT_LOADOUT_KEYS[slot]];
}

export function createWardrobeCandidateLoadout(
  loadout: LunchmateLoadout,
  slot: LunchmateSlot,
  itemId: string | null,
): LunchmateLoadout {
  if (itemId !== null) {
    const item = LUNCHMATE_ITEMS_BY_ID[itemId];
    if (!item || item.slot !== slot) return loadout;
  }

  return {
    ...loadout,
    [LUNCHMATE_SLOT_LOADOUT_KEYS[slot]]: itemId,
  };
}

export function selectPreviewWardrobeItem(
  loadout: LunchmateLoadout,
  slot: LunchmateSlot,
  itemId: string | null,
  ownedItemIds: ReadonlySet<string>,
): LunchmateLoadout {
  if (itemId !== null && !ownedItemIds.has(itemId)) return loadout;
  return createWardrobeCandidateLoadout(loadout, slot, itemId);
}

export function clearPreviewLoadout(): LunchmateLoadout {
  return { ...EMPTY_LUNCHMATE_LOADOUT };
}

export function areLunchmateLoadoutsEqual(
  first: LunchmateLoadout,
  second: LunchmateLoadout,
): boolean {
  return first.outfitId === second.outfitId
    && first.headwearId === second.headwearId
    && first.eyewearId === second.eyewearId
    && first.bagId === second.bagId;
}
