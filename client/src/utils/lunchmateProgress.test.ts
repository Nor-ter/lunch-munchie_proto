import { describe, expect, it } from 'vitest';
import {
  createLunchmateProgressUpdate,
  getLunchmateLevelUpEvents,
  getLunchmateProgressSnapshot,
  getTotalXpRequiredForLunchmateLevel,
  getXpRequiredForNextLunchmateLevel,
  normalizeLunchmateTotalXp,
} from './lunchmateProgress';
import { resolveLunchmateLevelRewardGrant } from './lunchmateProfile';
import { LUNCHMATE_STARTER_ITEM_IDS } from '../constants/lunchmateItems';

describe('unbounded Lunchmate progress', () => {
  it.each([
    [19, 1, 19, 20],
    [20, 2, 0, 30],
    [50, 3, 0, 40],
    [55, 3, 5, 40],
    [90, 4, 0, 50],
    [140, 5, 0, 60],
  ])('maps %s total XP to Lv.%s with %s/%s XP', (
    totalXp,
    expectedLevel,
    expectedCurrentXp,
    expectedRequiredXp,
  ) => {
    const snapshot = getLunchmateProgressSnapshot(totalXp);
    expect(snapshot).toMatchObject({
      level: expectedLevel,
      xpIntoCurrentLevel: expectedCurrentXp,
      xpRequiredForNextLevel: expectedRequiredXp,
      isMaxLevel: false,
    });
  });

  it('caps each high-level requirement at 100 XP without capping the level', () => {
    expect(getXpRequiredForNextLunchmateLevel(9)).toBe(100);
    expect(getXpRequiredForNextLunchmateLevel(500)).toBe(100);
    expect(getLunchmateProgressSnapshot(10_000).level).toBeGreaterThan(50);
  });

  it('returns every crossed level in order and preserves remainder XP', () => {
    expect(getLunchmateLevelUpEvents(0, 55).map(event => event.newLevel)).toEqual([2, 3]);
    expect(getLunchmateProgressSnapshot(55)).toMatchObject({
      level: 3,
      xpIntoCurrentLevel: 5,
    });
  });

  it('checks rewards for every crossed level while preserving earlier claims', () => {
    const result = getLunchmateLevelUpEvents(0, 55).reduce((state, event) => {
      const grant = resolveLunchmateLevelRewardGrant({
        targetLevel: event.newLevel,
        ownedItemIds: state.ownedItemIds,
        rewardClaims: state.claims,
        stableSeedKey: `progress-test:${event.newLevel}`,
      });
      return {
        ownedItemIds: grant.ownedItemIds,
        claims: grant.claims,
      };
    }, {
      ownedItemIds: [...LUNCHMATE_STARTER_ITEM_IDS] as string[],
      claims: [] as { level: number; itemId: string }[],
    });

    expect(result.claims.map(claim => claim.level)).toEqual([2, 3]);
    expect(new Set(result.ownedItemIds).size).toBe(result.ownedItemIds.length);
  });

  it('normalizes invalid totals without looping', () => {
    expect(getLunchmateProgressSnapshot(-10).totalXp).toBe(0);
    expect(getLunchmateProgressSnapshot(Number.NaN).totalXp).toBe(0);
    expect(getLunchmateProgressSnapshot(Number.POSITIVE_INFINITY).totalXp).toBe(0);
  });

  it.each([
    [undefined, 0],
    [-1, 0],
    ['55', 0],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
    [Number.NEGATIVE_INFINITY, 0],
    [55.9, 55],
    [{ totalXp: 55 }, 0],
  ])('normalizes stored total XP %j to %s', (value, expected) => {
    expect(normalizeLunchmateTotalXp(value)).toBe(expected);
  });

  it('computes the cumulative XP at a level start from the shared requirement rule', () => {
    expect(getTotalXpRequiredForLunchmateLevel(1)).toBe(0);
    expect(getTotalXpRequiredForLunchmateLevel(4)).toBe(90);
    expect(getTotalXpRequiredForLunchmateLevel(10)).toBe(540);
  });

  it('continues sequential updates from the latest persisted total without losing XP', () => {
    const first = createLunchmateProgressUpdate(15, 10);
    const second = createLunchmateProgressUpdate(first.nextTotalXp, 10);
    expect(first.nextTotalXp).toBe(25);
    expect(second.nextTotalXp).toBe(35);
  });

  it('creates events only for newly crossed levels after restoring saved XP', () => {
    expect(createLunchmateProgressUpdate(55, 0).levelUpEvents).toEqual([]);
    expect(createLunchmateProgressUpdate(55, 40).levelUpEvents.map(event => event.newLevel))
      .toEqual([4]);
  });
});
