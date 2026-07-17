import {
  LUNCHMATE_STARTER_ITEM_IDS,
  LUNCHMATE_ITEMS_BY_ID,
} from '../constants/lunchmateItems';
import type {
  LunchmateLayerItem,
  LunchmateLoadout,
  LunchmateProfileLoadout,
  LunchmateSlot,
} from '../types/lunchmateCustomization';
import { getLunchmateLevelReward } from './lunchmateRewards';

export interface LunchmateRewardClaim {
  level: number;
  itemId: string;
}

export interface LunchmateRewardGrantResolution {
  item: LunchmateLayerItem | null;
  ownedItemIds: string[];
  claims: LunchmateRewardClaim[];
  shouldPersist: boolean;
  wasPreviouslyClaimed: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateSlotItemId(value: unknown, expectedSlot: LunchmateSlot): string | null {
  if (typeof value !== 'string') return null;
  const item = LUNCHMATE_ITEMS_BY_ID[value];
  return item?.slot === expectedSlot ? value : null;
}

/**
 * lm_profile의 보유 ID만 정규화한다.
 * 필드가 없는 legacy 값과 배열이 아닌 손상 값은 starter 4개로 복구한다.
 */
export function normalizeLunchmateOwnedItemIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [...LUNCHMATE_STARTER_ITEM_IDS].sort();

  return [...new Set(
    value.filter((itemId): itemId is string => (
      typeof itemId === 'string' && Boolean(LUNCHMATE_ITEMS_BY_ID[itemId])
    )),
  )].sort((left, right) => left.localeCompare(right));
}

/** 브라우저 preview의 레벨별 지급 이력을 manifest 기준으로 복구한다. */
export function normalizeLunchmateRewardClaims(value: unknown): LunchmateRewardClaim[] {
  if (!Array.isArray(value)) return [];

  const claimsByLevel = new Map<number, LunchmateRewardClaim>();
  for (const claim of value) {
    if (!isRecord(claim)) continue;
    const level = claim.level;
    const itemId = claim.itemId;
    if (
      typeof level !== 'number'
      || !Number.isFinite(level)
      || !Number.isInteger(level)
      || level < 2
      || typeof itemId !== 'string'
      || !LUNCHMATE_ITEMS_BY_ID[itemId]
      || claimsByLevel.has(level)
    ) {
      continue;
    }
    claimsByLevel.set(level, { level, itemId });
  }

  return [...claimsByLevel.values()].sort((left, right) => left.level - right.level);
}

function stringArraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/**
 * Level Up Modal 표시 시 사용할 client-only preview 지급 결과를 계산한다.
 * 서버 경제 시스템의 권한으로 사용하지 않으며 호출부가 기존 lm_profile merge로 저장한다.
 */
export function resolveLunchmateLevelRewardGrant({
  targetLevel,
  ownedItemIds,
  rewardClaims,
  stableSeedKey,
}: {
  targetLevel: number;
  ownedItemIds: unknown;
  rewardClaims: unknown;
  stableSeedKey: string;
}): LunchmateRewardGrantResolution {
  const normalizedOwnedItemIds = normalizeLunchmateOwnedItemIds(ownedItemIds);
  const normalizedClaims = normalizeLunchmateRewardClaims(rewardClaims);
  const existingClaim = normalizedClaims.find(claim => claim.level === targetLevel);

  if (existingClaim) {
    const nextOwnedItemIds = normalizeLunchmateOwnedItemIds([
      ...normalizedOwnedItemIds,
      existingClaim.itemId,
    ]);
    return {
      item: LUNCHMATE_ITEMS_BY_ID[existingClaim.itemId] ?? null,
      ownedItemIds: nextOwnedItemIds,
      claims: normalizedClaims,
      shouldPersist: !stringArraysEqual(normalizedOwnedItemIds, nextOwnedItemIds),
      wasPreviouslyClaimed: true,
    };
  }

  const reward = getLunchmateLevelReward({
    targetLevel,
    ownedItemIds: normalizedOwnedItemIds,
    stableSeedKey,
  });
  if (!reward) {
    return {
      item: null,
      ownedItemIds: normalizedOwnedItemIds,
      claims: normalizedClaims,
      shouldPersist: false,
      wasPreviouslyClaimed: false,
    };
  }

  return {
    item: LUNCHMATE_ITEMS_BY_ID[reward.itemId] ?? null,
    ownedItemIds: normalizeLunchmateOwnedItemIds([
      ...normalizedOwnedItemIds,
      reward.itemId,
    ]),
    claims: normalizeLunchmateRewardClaims([
      ...normalizedClaims,
      { level: targetLevel, itemId: reward.itemId },
    ]),
    shouldPersist: true,
    wasPreviouslyClaimed: false,
  };
}

/** 손상되거나 과거 형식인 lm_profile 값은 slot별로 독립적으로 복구한다. */
export function normalizeLunchmateProfileLoadout(value: unknown): LunchmateProfileLoadout {
  const loadout = isRecord(value) ? value : undefined;
  return {
    outfit: validateSlotItemId(loadout?.outfit, 'outfit'),
    headwear: validateSlotItemId(loadout?.headwear, 'headwear'),
    eyewear: validateSlotItemId(loadout?.eyewear, 'eyewear'),
    bag: validateSlotItemId(loadout?.bag, 'bag'),
  };
}

/** 저장 구조를 Renderer가 사용하는 네 slot loadout으로 변환한다. */
export function lunchmateLoadoutFromProfile(value: unknown): LunchmateLoadout {
  const normalized = normalizeLunchmateProfileLoadout(value);
  return {
    outfitId: normalized.outfit,
    headwearId: normalized.headwear,
    eyewearId: normalized.eyewear,
    bagId: normalized.bag,
  };
}

/** UI에서 만든 loadout도 manifest와 slot을 다시 확인한 뒤 적용한다. */
export function normalizeLunchmateLoadout(value: unknown): LunchmateLoadout {
  const loadout = isRecord(value) ? value : undefined;
  return {
    outfitId: validateSlotItemId(loadout?.outfitId, 'outfit'),
    headwearId: validateSlotItemId(loadout?.headwearId, 'headwear'),
    eyewearId: validateSlotItemId(loadout?.eyewearId, 'eyewear'),
    bagId: validateSlotItemId(loadout?.bagId, 'bag'),
  };
}

export function lunchmateProfileLoadoutFromLoadout(value: unknown): LunchmateProfileLoadout {
  const normalized = normalizeLunchmateLoadout(value);
  return {
    outfit: normalized.outfitId,
    headwear: normalized.headwearId,
    eyewear: normalized.eyewearId,
    bag: normalized.bagId,
  };
}

/** 기존 updateProfile merge 경로에 전달할 최소 변경 객체만 만든다. */
export function createLunchmateProfileLoadoutUpdate(value: unknown): {
  lunchmateLoadout: LunchmateProfileLoadout;
} {
  return {
    lunchmateLoadout: lunchmateProfileLoadoutFromLoadout(value),
  };
}
