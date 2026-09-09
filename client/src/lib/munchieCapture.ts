import type {
  CapturedMunchie,
  CapturedMunchieCollectionV1,
  CapturedMunchiePlacement,
} from '@/types/munchieCapture';
import { createMunchieTankPlacement } from '@/lib/munchieTankPlacement';

export const MUNCHIE_CAPTURE_STORAGE_KEY_PREFIX = 'lm_munchie_capture_prototype_v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function optionalNonNegativeInteger(value: unknown): number | undefined {
  const number = finiteNumber(value);
  return number === null || number < 0 ? undefined : Math.floor(number);
}

export function normalizeCapturedMunchiePlacement(value: unknown): CapturedMunchiePlacement | null {
  if (!isRecord(value)) return null;
  const xPercent = finiteNumber(value.xPercent);
  const bottomPercent = finiteNumber(value.bottomPercent);
  const sizePx = finiteNumber(value.sizePx);
  const rotationDeg = finiteNumber(value.rotationDeg);
  if (xPercent === null || bottomPercent === null || sizePx === null || rotationDeg === null) {
    return null;
  }
  return {
    xPercent: clamp(xPercent, 10, 90),
    bottomPercent: clamp(bottomPercent, 3, 78),
    sizePx: clamp(sizePx, 64, 108),
    rotationDeg: clamp(rotationDeg, -12, 12),
  };
}

export function normalizeCapturedMunchie(value: unknown): CapturedMunchie | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string'
    || typeof value.originalImage !== 'string'
    || !value.originalImage.startsWith('data:image/')
    || typeof value.createdAt !== 'number'
    || !Number.isFinite(value.createdAt)
  ) return null;
  const placement = normalizeCapturedMunchiePlacement(value.placement);
  if (!placement) return null;
  const cutoutImage = typeof value.cutoutImage === 'string' && value.cutoutImage.startsWith('data:image/')
    ? value.cutoutImage
    : undefined;
  const fedAt = optionalNonNegativeInteger(value.fedAt);
  const xpGranted = optionalNonNegativeInteger(value.xpGranted);
  const sourcePhotoId = typeof value.sourcePhotoId === 'string' ? value.sourcePhotoId : undefined;
  const sourceCourseId = typeof value.sourceCourseId === 'string' ? value.sourceCourseId : undefined;
  const sourcePlaceId = typeof value.sourcePlaceId === 'string' ? value.sourcePlaceId : undefined;
  const sourcePlaceName = typeof value.sourcePlaceName === 'string' ? value.sourcePlaceName : undefined;
  return {
    id: value.id,
    originalImage: value.originalImage,
    ...(cutoutImage ? { cutoutImage } : {}),
    createdAt: value.createdAt,
    placement,
    ...(fedAt !== undefined ? { fedAt } : {}),
    ...(xpGranted !== undefined ? { xpGranted } : {}),
    ...(sourcePhotoId ? { sourcePhotoId } : {}),
    ...(sourceCourseId ? { sourceCourseId } : {}),
    ...(sourcePlaceId ? { sourcePlaceId } : {}),
    ...(sourcePlaceName ? { sourcePlaceName } : {}),
  };
}

export function storageKeyForCapturedMunchies(profileId: string) {
  return `${MUNCHIE_CAPTURE_STORAGE_KEY_PREFIX}:${profileId}`;
}

export function normalizeCapturedMunchieCollection(value: unknown): CapturedMunchieCollectionV1 {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.items)) {
    return { version: 1, items: [] };
  }
  const seenIds = new Set<string>();
  const items = value.items.flatMap((item) => {
    const normalized = normalizeCapturedMunchie(item);
    if (!normalized || seenIds.has(normalized.id)) return [];
    seenIds.add(normalized.id);
    return [normalized];
  });
  return { version: 1, items };
}

export function createCapturedMunchie(
  originalImage: string,
  existingCount: number,
  cutoutImage?: string,
): CapturedMunchie {
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `capture_${crypto.randomUUID()}`
    : `capture_${Date.now()}_${Math.round(Math.random() * 1_000_000)}`;
  return {
    id,
    originalImage,
    ...(cutoutImage ? { cutoutImage } : {}),
    createdAt: Date.now(),
    placement: createMunchieTankPlacement(id, existingCount),
  };
}

export function displayImageForCapturedMunchie(munchie: CapturedMunchie) {
  return munchie.cutoutImage ?? munchie.originalImage;
}

export interface MarkCapturedMunchieFedResult {
  items: CapturedMunchie[];
  item: CapturedMunchie | null;
  updated: boolean;
  reason?: 'not-found' | 'already-fed';
}

export interface UpdateCapturedMunchiePlacementResult {
  items: CapturedMunchie[];
  item: CapturedMunchie | null;
  updated: boolean;
  reason?: 'not-found' | 'invalid-placement';
}

export function updateCapturedMunchiePlacementInCollection(
  items: readonly CapturedMunchie[],
  id: string,
  placement: CapturedMunchiePlacement,
): UpdateCapturedMunchiePlacementResult {
  const existing = items.find(item => item.id === id);
  if (!existing) {
    return { items: [...items], item: null, updated: false, reason: 'not-found' };
  }

  const normalizedPlacement = normalizeCapturedMunchiePlacement(placement);
  if (!normalizedPlacement) {
    return { items: [...items], item: existing, updated: false, reason: 'invalid-placement' };
  }

  const nextItem: CapturedMunchie = {
    ...existing,
    placement: normalizedPlacement,
  };
  return {
    items: items.map(item => item.id === id ? nextItem : item),
    item: nextItem,
    updated: true,
  };
}

export function markCapturedMunchieFedInCollection(
  items: readonly CapturedMunchie[],
  id: string,
  xpGranted: number,
  fedAt = Date.now(),
): MarkCapturedMunchieFedResult {
  const existing = items.find(item => item.id === id);
  if (!existing) {
    return { items: [...items], item: null, updated: false, reason: 'not-found' };
  }
  if (existing.fedAt !== undefined) {
    return { items: [...items], item: existing, updated: false, reason: 'already-fed' };
  }

  const nextItem: CapturedMunchie = {
    ...existing,
    fedAt: Math.max(0, Math.floor(fedAt)),
    xpGranted: Math.max(0, Math.floor(xpGranted)),
  };
  return {
    items: items.map(item => item.id === id ? nextItem : item),
    item: nextItem,
    updated: true,
  };
}
