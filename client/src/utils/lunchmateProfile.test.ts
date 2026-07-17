import { describe, expect, it } from 'vitest';
import {
  LUNCHMATE_ITEMS,
  LUNCHMATE_ITEMS_BY_ID,
  LUNCHMATE_STARTER_ITEM_IDS,
} from '../constants/lunchmateItems';
import {
  createLunchmateProfileLoadoutUpdate,
  lunchmateLoadoutFromProfile,
  normalizeLunchmateLoadout,
  normalizeLunchmateOwnedItemIds,
  normalizeLunchmateProfileLoadout,
  normalizeLunchmateRewardClaims,
  resolveLunchmateLevelRewardGrant,
} from './lunchmateProfile';

describe('lm_profile lunchmate reward claim compatibility', () => {
  const starterItemIds = [...LUNCHMATE_STARTER_ITEM_IDS];
  const stableSeedKey = 'user-test:lunchmate-level:2';

  it('uses an empty claim list for legacy and malformed values', () => {
    expect(normalizeLunchmateRewardClaims(undefined)).toEqual([]);
    expect(normalizeLunchmateRewardClaims({ level: 2, itemId: 'outfit_hoodie_coral' }))
      .toEqual([]);
  });

  it('removes malformed claims and keeps one valid claim per Level', () => {
    expect(normalizeLunchmateRewardClaims([
      { level: 3, itemId: 'headwear_beret_coral' },
      { level: 2, itemId: 'outfit_sailor_navy' },
      { level: 2, itemId: 'outfit_hoodie_coral' },
      { level: 1, itemId: 'outfit_hoodie_coral' },
      { level: 4.5, itemId: 'eyewear_round_black' },
      { level: 4, itemId: 'missing-item' },
      null,
    ])).toEqual([
      { level: 2, itemId: 'outfit_sailor_navy' },
      { level: 3, itemId: 'headwear_beret_coral' },
    ]);
  });

  it('adds exactly one owned item and one claim for a new Level Up', () => {
    const grant = resolveLunchmateLevelRewardGrant({
      targetLevel: 2,
      ownedItemIds: starterItemIds,
      rewardClaims: [],
      stableSeedKey,
    });

    expect(grant.item).not.toBeNull();
    expect(grant.ownedItemIds).toHaveLength(starterItemIds.length + 1);
    expect(grant.claims).toEqual([{ level: 2, itemId: grant.item?.id }]);
    expect(grant.shouldPersist).toBe(true);
    expect(grant.wasPreviouslyClaimed).toBe(false);
  });

  it('does not grant another item when the same Level is resolved again', () => {
    const firstGrant = resolveLunchmateLevelRewardGrant({
      targetLevel: 2,
      ownedItemIds: starterItemIds,
      rewardClaims: [],
      stableSeedKey,
    });
    const repeatedGrant = resolveLunchmateLevelRewardGrant({
      targetLevel: 2,
      ownedItemIds: firstGrant.ownedItemIds,
      rewardClaims: firstGrant.claims,
      stableSeedKey,
    });

    expect(repeatedGrant.item?.id).toBe(firstGrant.item?.id);
    expect(repeatedGrant.ownedItemIds).toEqual(firstGrant.ownedItemIds);
    expect(repeatedGrant.claims).toEqual(firstGrant.claims);
    expect(repeatedGrant.shouldPersist).toBe(false);
    expect(repeatedGrant.wasPreviouslyClaimed).toBe(true);
  });

  it('restores a claimed item that is missing from the owned list', () => {
    const grant = resolveLunchmateLevelRewardGrant({
      targetLevel: 2,
      ownedItemIds: starterItemIds,
      rewardClaims: [{ level: 2, itemId: 'outfit_sailor_navy' }],
      stableSeedKey,
    });

    expect(grant.item?.id).toBe('outfit_sailor_navy');
    expect(grant.ownedItemIds).toContain('outfit_sailor_navy');
    expect(grant.claims).toEqual([{ level: 2, itemId: 'outfit_sailor_navy' }]);
    expect(grant.shouldPersist).toBe(true);
  });

  it('does not select the starter hoodie as the Level 2 reward', () => {
    const grant = resolveLunchmateLevelRewardGrant({
      targetLevel: 2,
      ownedItemIds: starterItemIds,
      rewardClaims: [],
      stableSeedKey,
    });

    expect(grant.item?.slot).toBe('outfit');
    expect(grant.item?.id).not.toBe('outfit_hoodie_coral');
  });

  it('returns the completed state when every manifest item is owned', () => {
    const grant = resolveLunchmateLevelRewardGrant({
      targetLevel: 8,
      ownedItemIds: LUNCHMATE_ITEMS.map(item => item.id),
      rewardClaims: [],
      stableSeedKey: 'user-test:lunchmate-level:8',
    });

    expect(grant.item).toBeNull();
    expect(grant.claims).toEqual([]);
    expect(grant.shouldPersist).toBe(false);
  });
});

describe('lm_profile lunchmate owned item compatibility', () => {
  const sortedStarterItemIds = [...LUNCHMATE_STARTER_ITEM_IDS].sort();

  it('uses the four starter items when a legacy profile has no saved owned list', () => {
    expect(normalizeLunchmateOwnedItemIds(undefined)).toEqual(sortedStarterItemIds);
  });

  it('uses the four starter items for a malformed non-array value', () => {
    expect(normalizeLunchmateOwnedItemIds({ itemId: 'outfit_hoodie_coral' }))
      .toEqual(sortedStarterItemIds);
  });

  it('preserves an explicitly empty owned list', () => {
    expect(normalizeLunchmateOwnedItemIds([])).toEqual([]);
  });

  it('removes duplicate and unknown IDs', () => {
    expect(normalizeLunchmateOwnedItemIds([
      'outfit_hoodie_coral',
      'missing-item',
      'outfit_hoodie_coral',
      42,
    ])).toEqual(['outfit_hoodie_coral']);
  });

  it('sorts valid manifest IDs by ID', () => {
    expect(normalizeLunchmateOwnedItemIds([
      'outfit_hoodie_coral',
      'bag_backpack_green',
      'headwear_beret_coral',
      'eyewear_round_black',
    ])).toEqual(sortedStarterItemIds);
  });

  it('defines four real starter items with one item in each slot', () => {
    const starterItems = LUNCHMATE_STARTER_ITEM_IDS.map(
      itemId => LUNCHMATE_ITEMS_BY_ID[itemId],
    );

    expect(starterItems.every(Boolean)).toBe(true);
    expect(starterItems.map(item => item?.slot).sort()).toEqual([
      'bag',
      'eyewear',
      'headwear',
      'outfit',
    ]);
  });
});

describe('lm_profile lunchmate loadout compatibility', () => {
  it('uses an empty loadout when a legacy profile has no saved loadout', () => {
    expect(lunchmateLoadoutFromProfile(undefined)).toEqual({
      outfitId: null,
      headwearId: null,
      eyewearId: null,
      bagId: null,
    });
  });

  it('restores a valid four-slot loadout', () => {
    expect(lunchmateLoadoutFromProfile({
      outfit: 'outfit_hoodie_coral',
      headwear: 'headwear_beret_coral',
      eyewear: 'eyewear_round_black',
      bag: 'bag_backpack_green',
    })).toEqual({
      outfitId: 'outfit_hoodie_coral',
      headwearId: 'headwear_beret_coral',
      eyewearId: 'eyewear_round_black',
      bagId: 'bag_backpack_green',
    });
  });

  it('nulls only the slot containing an unknown item ID', () => {
    expect(normalizeLunchmateProfileLoadout({
      outfit: 'missing-outfit',
      headwear: 'headwear_beret_coral',
      eyewear: 'eyewear_round_black',
      bag: 'bag_backpack_green',
    })).toEqual({
      outfit: null,
      headwear: 'headwear_beret_coral',
      eyewear: 'eyewear_round_black',
      bag: 'bag_backpack_green',
    });
  });

  it('nulls only the slot containing an item from another slot', () => {
    expect(normalizeLunchmateProfileLoadout({
      outfit: 'headwear_beret_coral',
      headwear: 'headwear_beret_coral',
      eyewear: 'eyewear_round_black',
      bag: 'bag_backpack_green',
    })).toEqual({
      outfit: null,
      headwear: 'headwear_beret_coral',
      eyewear: 'eyewear_round_black',
      bag: 'bag_backpack_green',
    });
  });

  it('keeps loadout validation independent from the owned item list', () => {
    expect(normalizeLunchmateProfileLoadout({ outfit: 'outfit_sailor_navy' }).outfit)
      .toBe('outfit_sailor_navy');
  });

  it('creates only the lm_profile loadout update using the persisted field names', () => {
    expect(createLunchmateProfileLoadoutUpdate({
      outfitId: 'outfit_hoodie_coral',
      headwearId: null,
      eyewearId: 'eyewear_round_black',
      bagId: null,
    })).toEqual({
      lunchmateLoadout: {
        outfit: 'outfit_hoodie_coral',
        headwear: null,
        eyewear: 'eyewear_round_black',
        bag: null,
      },
    });
  });

  it('preserves existing foodieChar and foodieSkin through the profile merge', () => {
    const legacyProfile = {
      id: 'user-test',
      foodieChar: '🍞',
      foodieSkin: 'yellow-munchtray',
      name: '지민',
    };
    const merged = {
      ...legacyProfile,
      ...createLunchmateProfileLoadoutUpdate({
        outfitId: 'outfit_hoodie_coral',
        headwearId: null,
        eyewearId: null,
        bagId: null,
      }),
    };

    expect(merged.foodieChar).toBe('🍞');
    expect(merged.foodieSkin).toBe('yellow-munchtray');
    expect(merged.lunchmateLoadout.outfit).toBe('outfit_hoodie_coral');
  });

  it('restores the applied loadout after a refresh-style reinitialization', () => {
    const update = createLunchmateProfileLoadoutUpdate({
      outfitId: 'outfit_hoodie_coral',
      headwearId: 'headwear_beret_coral',
      eyewearId: null,
      bagId: 'bag_backpack_green',
    });

    expect(lunchmateLoadoutFromProfile(update.lunchmateLoadout)).toEqual({
      outfitId: 'outfit_hoodie_coral',
      headwearId: 'headwear_beret_coral',
      eyewearId: null,
      bagId: 'bag_backpack_green',
    });
  });

  it('persists all four null slots after applying a full clear', () => {
    const cleared = normalizeLunchmateLoadout({
      outfitId: null,
      headwearId: null,
      eyewearId: null,
      bagId: null,
    });
    expect(createLunchmateProfileLoadoutUpdate(cleared).lunchmateLoadout).toEqual({
      outfit: null,
      headwear: null,
      eyewear: null,
      bag: null,
    });
  });

  it('falls back safely for a damaged non-object saved value', () => {
    expect(normalizeLunchmateProfileLoadout('{broken-json')).toEqual({
      outfit: null,
      headwear: null,
      eyewear: null,
      bag: null,
    });
  });
});
