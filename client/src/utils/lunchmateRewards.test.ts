import { describe, expect, it } from 'vitest';
import {
  LUNCHMATE_ITEMS,
  LUNCHMATE_ITEMS_BY_ID,
  LUNCHMATE_ITEMS_BY_SLOT,
} from '../constants/lunchmateItems';
import { getLunchmateLevelReward } from './lunchmateRewards';

const STABLE_SEED_KEY = 'preview-user-42';

function reward(targetLevel: number, ownedItemIds: readonly string[] = []) {
  return getLunchmateLevelReward({
    targetLevel,
    ownedItemIds,
    stableSeedKey: STABLE_SEED_KEY,
  });
}

describe('getLunchmateLevelReward', () => {
  it('returns no reward for Level 1', () => {
    expect(reward(1)).toBeNull();
  });

  it('selects an unowned outfit for Level 2', () => {
    expect(reward(2)).toMatchObject({
      targetLevel: 2,
      slot: 'outfit',
      reason: 'level-slot',
    });
  });

  it('selects an unowned headwear item for Level 3', () => {
    expect(reward(3)).toMatchObject({
      targetLevel: 3,
      slot: 'headwear',
      reason: 'level-slot',
    });
  });

  it('selects an unowned eyewear item for Level 4', () => {
    expect(reward(4)).toMatchObject({
      targetLevel: 4,
      slot: 'eyewear',
      reason: 'level-slot',
    });
  });

  it('selects a bag for Level 5', () => {
    expect(reward(5)).toMatchObject({
      targetLevel: 5,
      slot: 'bag',
      reason: 'level-slot-rarity-priority',
    });
  });

  it('selects from every slot for Level 6 and above', () => {
    const onlyRemainingItem = LUNCHMATE_ITEMS_BY_ID.eyewear_halfmoon_blue;
    expect(onlyRemainingItem).toBeDefined();
    const ownedItemIds = LUNCHMATE_ITEMS
      .filter(item => item.id !== onlyRemainingItem?.id)
      .map(item => item.id);

    expect(reward(6, ownedItemIds)).toMatchObject({
      itemId: onlyRemainingItem?.id,
      slot: 'eyewear',
      reason: 'all-slots',
    });
  });

  it('never selects an already owned item', () => {
    const firstReward = reward(2);
    expect(firstReward).not.toBeNull();

    const nextReward = reward(2, [firstReward!.itemId]);
    expect(nextReward).not.toBeNull();
    expect(nextReward?.itemId).not.toBe(firstReward?.itemId);
  });

  it('returns the same result for the same input', () => {
    const input = {
      targetLevel: 8,
      ownedItemIds: ['outfit_hoodie_coral', 'headwear_beret_coral'],
      stableSeedKey: 'same-preview-seed',
    } as const;

    expect(getLunchmateLevelReward(input)).toEqual(getLunchmateLevelReward(input));
  });

  it('is independent from ownedItemIds array order', () => {
    const ownedItemIds = [
      'outfit_hoodie_coral',
      'headwear_beret_coral',
      'eyewear_round_black',
      'bag_backpack_green',
    ];
    const reversedOwnedItemIds = [...ownedItemIds].reverse();

    expect(reward(9, ownedItemIds)).toEqual(reward(9, reversedOwnedItemIds));
  });

  it('falls back to all unowned items when the Level slot is exhausted', () => {
    const ownedOutfitIds = LUNCHMATE_ITEMS_BY_SLOT.outfit.map(item => item.id);
    const result = reward(2, ownedOutfitIds);

    expect(result).not.toBeNull();
    expect(result?.slot).not.toBe('outfit');
    expect(result?.reason).toBe('fallback-all-slots');
  });

  it('returns null when every manifest item is owned', () => {
    expect(reward(12, LUNCHMATE_ITEMS.map(item => item.id))).toBeNull();
  });

  it('prioritizes the highest available rarity on Levels divisible by 5', () => {
    expect(reward(10)).toMatchObject({
      rarity: 'special',
      reason: 'all-slots-rarity-priority',
    });

    const specialItemIds = LUNCHMATE_ITEMS
      .filter(item => item.rarity === 'special')
      .map(item => item.id);
    expect(reward(10, specialItemIds)).toMatchObject({
      rarity: 'rare',
      reason: 'all-slots-rarity-priority',
    });
  });

  it('ignores owned IDs that are not in the manifest', () => {
    expect(reward(7, ['missing-item-id'])).toEqual(reward(7));
  });

  it('only returns IDs and metadata from the current manifest', () => {
    const result = reward(15);
    expect(result).not.toBeNull();

    const manifestItem = result ? LUNCHMATE_ITEMS_BY_ID[result.itemId] : undefined;
    expect(manifestItem).toBeDefined();
    expect(result).toMatchObject({
      slot: manifestItem?.slot,
      rarity: manifestItem?.rarity,
    });
  });
});
