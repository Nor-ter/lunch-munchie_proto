import { LUNCHMATE_ITEMS, LUNCHMATE_ITEMS_BY_ID } from '../constants/lunchmateItems';
import type {
  LunchmateLayerItem,
  LunchmateRarity,
  LunchmateSlot,
} from '../types/lunchmateCustomization';

export interface LunchmateRewardInput {
  targetLevel: number;
  ownedItemIds: readonly string[];
  stableSeedKey: string;
}

export type LunchmateRewardReason =
  | 'level-slot'
  | 'level-slot-rarity-priority'
  | 'all-slots'
  | 'all-slots-rarity-priority'
  | 'fallback-all-slots'
  | 'fallback-all-slots-rarity-priority';

export interface LunchmateLevelReward {
  targetLevel: number;
  itemId: string;
  slot: LunchmateSlot;
  rarity: LunchmateRarity;
  reason: LunchmateRewardReason;
}

const LEVEL_REWARD_SLOT: Readonly<Partial<Record<number, LunchmateSlot>>> = {
  2: 'outfit',
  3: 'headwear',
  4: 'eyewear',
  5: 'bag',
};

const RARITY_PRIORITY: Readonly<Record<LunchmateRarity, number>> = {
  common: 1,
  rare: 2,
  special: 3,
};

const SORTED_LUNCHMATE_ITEMS: LunchmateLayerItem[] = [...LUNCHMATE_ITEMS].sort((left, right) => (
  left.id.localeCompare(right.id)
));

function stableHash(value: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

function highestRarityCandidates(
  candidates: readonly LunchmateLayerItem[],
): LunchmateLayerItem[] {
  const highestPriority = Math.max(
    ...candidates.map(item => RARITY_PRIORITY[item.rarity]),
  );

  return candidates.filter(item => RARITY_PRIORITY[item.rarity] === highestPriority);
}

/**
 * Client-only deterministic preview rule.
 * The selected item is not a trusted reward grant or a server-side security authority.
 */
export function getLunchmateLevelReward({
  targetLevel,
  ownedItemIds,
  stableSeedKey,
}: LunchmateRewardInput): LunchmateLevelReward | null {
  if (!Number.isInteger(targetLevel) || targetLevel <= 1) return null;

  const normalizedOwnedItemIds = Array.from(new Set(ownedItemIds))
    .filter(itemId => Boolean(LUNCHMATE_ITEMS_BY_ID[itemId]))
    .sort((left, right) => left.localeCompare(right));
  const ownedItemIdSet = new Set(normalizedOwnedItemIds);
  const allUnownedItems = SORTED_LUNCHMATE_ITEMS.filter(item => !ownedItemIdSet.has(item.id));

  if (allUnownedItems.length === 0) return null;

  const targetSlot = LEVEL_REWARD_SLOT[targetLevel];
  let usedFallback = false;
  let candidates = targetSlot
    ? allUnownedItems.filter(item => item.slot === targetSlot)
    : allUnownedItems;

  if (candidates.length === 0) {
    candidates = allUnownedItems;
    usedFallback = true;
  }

  const prioritizesRarity = targetLevel % 5 === 0;
  if (prioritizesRarity) {
    candidates = highestRarityCandidates(candidates);
  }

  const candidateIds = candidates.map(item => item.id);
  const selectionSeed = [
    targetLevel,
    stableSeedKey,
    normalizedOwnedItemIds.join(','),
    candidateIds.join(','),
  ].join('|');
  const selectedItem = candidates[stableHash(selectionSeed) % candidates.length];
  const reason: LunchmateRewardReason = usedFallback
    ? prioritizesRarity
      ? 'fallback-all-slots-rarity-priority'
      : 'fallback-all-slots'
    : targetSlot
      ? prioritizesRarity
        ? 'level-slot-rarity-priority'
        : 'level-slot'
      : prioritizesRarity
        ? 'all-slots-rarity-priority'
        : 'all-slots';

  return {
    targetLevel,
    itemId: selectedItem.id,
    slot: selectedItem.slot,
    rarity: selectedItem.rarity,
    reason,
  };
}
