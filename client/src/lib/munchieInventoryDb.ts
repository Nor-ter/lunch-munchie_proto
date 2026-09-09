import { normalizeCapturedMunchieCollection } from '@/lib/munchieCapture';
import type {
  CapturedMunchie,
  StoredMunchieInventoryRecord,
} from '@/types/munchieCapture';

export const MUNCHIE_INVENTORY_DB_NAME = 'lm_munchie_inventory';
export const MUNCHIE_INVENTORY_DB_VERSION = 1;

const MUNCHIE_STORE = 'munchies';
const META_STORE = 'meta';
const PROFILE_INDEX = 'by-profile';
const LEGACY_MIGRATION_PREFIX = 'legacy-local-storage-v1';

interface MunchieInventoryMigrationMarker {
  key: string;
  profileId: string;
  legacyStorageKey: string;
  status: 'empty' | 'completed' | 'partial' | 'corrupt';
  sourceItemCount: number;
  migratedItemCount: number;
  skippedItemCount: number;
  migratedAt: number;
}

export interface LegacyMunchieConversionResult {
  status: MunchieInventoryMigrationMarker['status'];
  sourceItemCount: number;
  skippedItemCount: number;
  records: StoredMunchieInventoryRecord[];
}

export interface RuntimeMunchieResource {
  munchie: CapturedMunchie;
  objectUrls: string[];
  dispose: () => void;
}

export interface ObjectUrlApi {
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function transactionComplete(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'));
  });
}

function getIndexedDbFactory(factory?: IDBFactory) {
  if (factory) return factory;
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is not available in this browser.');
  }
  return indexedDB;
}

async function openMunchieInventoryDb(factory?: IDBFactory) {
  const request = getIndexedDbFactory(factory).open(
    MUNCHIE_INVENTORY_DB_NAME,
    MUNCHIE_INVENTORY_DB_VERSION,
  );
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(MUNCHIE_STORE)) {
      const store = database.createObjectStore(MUNCHIE_STORE, {
        keyPath: ['profileId', 'id'],
      });
      store.createIndex(PROFILE_INDEX, 'profileId', { unique: false });
    }
    if (!database.objectStoreNames.contains(META_STORE)) {
      database.createObjectStore(META_STORE, { keyPath: 'key' });
    }
  };
  return requestResult(request);
}

export function legacyMigrationMarkerKey(profileId: string) {
  return `${LEGACY_MIGRATION_PREFIX}:${profileId}`;
}

export function munchieInventoryRecordKey(profileId: string, id: string): [string, string] {
  return [profileId, id];
}

export function dataUrlToBlob(dataUrl: string) {
  const match = /^data:([^;,]+)?((?:;[^,]*)?),([\s\S]*)$/.exec(dataUrl);
  if (!match) throw new Error('Invalid image data URL.');

  const mimeType = match[1] || 'application/octet-stream';
  const metadata = match[2] ?? '';
  const payload = match[3] ?? '';
  const decoded = metadata.includes(';base64') ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

export async function capturedMunchieDataUrlsToStoredRecord(
  profileId: string,
  munchie: CapturedMunchie,
): Promise<StoredMunchieInventoryRecord> {
  return {
    profileId,
    id: munchie.id,
    originalImageBlob: dataUrlToBlob(munchie.originalImage),
    ...(munchie.cutoutImage ? { cutoutImageBlob: dataUrlToBlob(munchie.cutoutImage) } : {}),
    createdAt: munchie.createdAt,
    placement: munchie.placement,
    ...(munchie.fedAt !== undefined ? { fedAt: munchie.fedAt } : {}),
    ...(munchie.xpGranted !== undefined ? { xpGranted: munchie.xpGranted } : {}),
    ...(munchie.sourcePhotoId ? { sourcePhotoId: munchie.sourcePhotoId } : {}),
    ...(munchie.sourceCourseId ? { sourceCourseId: munchie.sourceCourseId } : {}),
    ...(munchie.sourcePlaceId ? { sourcePlaceId: munchie.sourcePlaceId } : {}),
    ...(munchie.sourcePlaceName ? { sourcePlaceName: munchie.sourcePlaceName } : {}),
  };
}

export async function legacyCollectionToStoredRecords(
  profileId: string,
  serializedCollection: string | null,
): Promise<LegacyMunchieConversionResult> {
  if (!serializedCollection) {
    return { status: 'empty', sourceItemCount: 0, skippedItemCount: 0, records: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(serializedCollection);
  } catch {
    return { status: 'corrupt', sourceItemCount: 0, skippedItemCount: 0, records: [] };
  }

  if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.items)) {
    return { status: 'corrupt', sourceItemCount: 0, skippedItemCount: 0, records: [] };
  }

  const sourceItemCount = parsed.items.length;
  const normalized = normalizeCapturedMunchieCollection(parsed);
  const records: StoredMunchieInventoryRecord[] = [];
  let skippedItemCount = sourceItemCount - normalized.items.length;

  for (const munchie of normalized.items) {
    try {
      records.push(await capturedMunchieDataUrlsToStoredRecord(profileId, munchie));
    } catch {
      skippedItemCount += 1;
    }
  }

  return {
    status: skippedItemCount > 0 ? 'partial' : 'completed',
    sourceItemCount,
    skippedItemCount,
    records,
  };
}

export function createRuntimeMunchieResource(
  record: StoredMunchieInventoryRecord,
  objectUrlApi: ObjectUrlApi = URL,
): RuntimeMunchieResource {
  const objectUrls: string[] = [];
  let disposed = false;
  try {
    const originalImage = objectUrlApi.createObjectURL(record.originalImageBlob);
    objectUrls.push(originalImage);
    const cutoutImage = record.cutoutImageBlob
      ? objectUrlApi.createObjectURL(record.cutoutImageBlob)
      : undefined;
    if (cutoutImage) objectUrls.push(cutoutImage);

    return {
      munchie: {
        id: record.id,
        originalImage,
        ...(cutoutImage ? { cutoutImage } : {}),
        createdAt: record.createdAt,
        placement: record.placement,
        ...(record.fedAt !== undefined ? { fedAt: record.fedAt } : {}),
        ...(record.xpGranted !== undefined ? { xpGranted: record.xpGranted } : {}),
        ...(record.sourcePhotoId ? { sourcePhotoId: record.sourcePhotoId } : {}),
        ...(record.sourceCourseId ? { sourceCourseId: record.sourceCourseId } : {}),
        ...(record.sourcePlaceId ? { sourcePlaceId: record.sourcePlaceId } : {}),
        ...(record.sourcePlaceName ? { sourcePlaceName: record.sourcePlaceName } : {}),
      },
      objectUrls,
      dispose: () => {
        if (disposed) return;
        disposed = true;
        objectUrls.forEach(url => objectUrlApi.revokeObjectURL(url));
      },
    };
  } catch (error) {
    objectUrls.forEach(url => objectUrlApi.revokeObjectURL(url));
    throw error;
  }
}

async function ensureLegacyMigration(
  profileId: string,
  legacyStorageKey: string,
  serializedCollection: string | null,
  factory?: IDBFactory,
) {
  const markerKey = legacyMigrationMarkerKey(profileId);
  const markerDatabase = await openMunchieInventoryDb(factory);
  try {
    const markerTransaction = markerDatabase.transaction(META_STORE, 'readonly');
    const markerCompletion = transactionComplete(markerTransaction);
    const existingMarker = await requestResult(
      markerTransaction.objectStore(META_STORE).get(markerKey),
    );
    await markerCompletion;
    if (existingMarker) return;
  } finally {
    markerDatabase.close();
  }

  const conversion = await legacyCollectionToStoredRecords(profileId, serializedCollection);
  const database = await openMunchieInventoryDb(factory);
  try {
    const transaction = database.transaction([MUNCHIE_STORE, META_STORE], 'readwrite');
    const completion = transactionComplete(transaction);
    const munchies = transaction.objectStore(MUNCHIE_STORE);
    const meta = transaction.objectStore(META_STORE);
    const markerRequest = meta.get(markerKey);

    markerRequest.onsuccess = () => {
      if (markerRequest.result) return;

      conversion.records.forEach((record) => {
        const existingRequest = munchies.get([profileId, record.id]);
        existingRequest.onsuccess = () => {
          if (!existingRequest.result) munchies.put(record);
        };
      });

      const marker: MunchieInventoryMigrationMarker = {
        key: markerKey,
        profileId,
        legacyStorageKey,
        status: conversion.status,
        sourceItemCount: conversion.sourceItemCount,
        migratedItemCount: conversion.records.length,
        skippedItemCount: conversion.skippedItemCount,
        migratedAt: Date.now(),
      };
      meta.put(marker);
    };

    await completion;
  } finally {
    database.close();
  }
}

export async function loadStoredMunchiesForProfile(
  profileId: string,
  factory?: IDBFactory,
) {
  const database = await openMunchieInventoryDb(factory);
  try {
    const transaction = database.transaction(MUNCHIE_STORE, 'readonly');
    const completion = transactionComplete(transaction);
    const records = await requestResult(
      transaction.objectStore(MUNCHIE_STORE).index(PROFILE_INDEX).getAll(profileId),
    ) as StoredMunchieInventoryRecord[];
    await completion;
    return records.sort((left, right) => left.createdAt - right.createdAt);
  } finally {
    database.close();
  }
}

export async function initializeMunchieInventory(
  profileId: string,
  legacyStorageKey: string,
  serializedCollection: string | null,
  factory?: IDBFactory,
) {
  await ensureLegacyMigration(profileId, legacyStorageKey, serializedCollection, factory);
  return loadStoredMunchiesForProfile(profileId, factory);
}

export async function putStoredMunchie(
  record: StoredMunchieInventoryRecord,
  factory?: IDBFactory,
) {
  const database = await openMunchieInventoryDb(factory);
  try {
    const transaction = database.transaction(MUNCHIE_STORE, 'readwrite');
    const completion = transactionComplete(transaction);
    transaction.objectStore(MUNCHIE_STORE).put(record);
    await completion;
  } finally {
    database.close();
  }
}

export async function removeStoredMunchie(
  profileId: string,
  id: string,
  factory?: IDBFactory,
) {
  const database = await openMunchieInventoryDb(factory);
  try {
    const transaction = database.transaction(MUNCHIE_STORE, 'readwrite');
    const completion = transactionComplete(transaction);
    const store = transaction.objectStore(MUNCHIE_STORE);
    const key = munchieInventoryRecordKey(profileId, id);
    const request = store.get(key);
    let removed = false;
    request.onsuccess = () => {
      if (request.result === undefined) return;
      store.delete(key);
      removed = true;
    };
    await completion;
    return removed;
  } finally {
    database.close();
  }
}

export async function updateStoredMunchie(
  profileId: string,
  id: string,
  update: (record: StoredMunchieInventoryRecord) => StoredMunchieInventoryRecord,
  factory?: IDBFactory,
) {
  const database = await openMunchieInventoryDb(factory);
  try {
    const transaction = database.transaction(MUNCHIE_STORE, 'readwrite');
    const completion = transactionComplete(transaction);
    const store = transaction.objectStore(MUNCHIE_STORE);
    const request = store.get([profileId, id]);
    let updated: StoredMunchieInventoryRecord | null = null;
    request.onsuccess = () => {
      const existing = request.result as StoredMunchieInventoryRecord | undefined;
      if (!existing) return;
      updated = update(existing);
      store.put(updated);
    };
    await completion;
    return updated;
  } finally {
    database.close();
  }
}
