import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createCapturedMunchie,
  markCapturedMunchieFedInCollection,
  storageKeyForCapturedMunchies,
  updateCapturedMunchiePlacementInCollection,
} from '@/lib/munchieCapture';
import {
  capturedMunchieDataUrlsToStoredRecord,
  createRuntimeMunchieResource,
  initializeMunchieInventory,
  putStoredMunchie,
  removeStoredMunchie,
  updateStoredMunchie,
  type RuntimeMunchieResource,
} from '@/lib/munchieInventoryDb';
import type {
  CapturedMunchie,
  CapturedMunchiePlacement,
} from '@/types/munchieCapture';

export type AddCapturedMunchieResult =
  | { ok: true; item: CapturedMunchie }
  | { ok: false; message: string };

export type MarkCapturedMunchieFedStorageResult =
  | { ok: true; item: CapturedMunchie }
  | { ok: false; reason: 'not-found' | 'already-fed' | 'storage-error'; message: string };

export type UpdateCapturedMunchiePlacementStorageResult =
  | { ok: true; item: CapturedMunchie }
  | { ok: false; reason: 'not-found' | 'invalid-placement' | 'storage-error'; message: string };

export type RemoveCapturedMunchieStorageResult =
  | { ok: true; item: CapturedMunchie }
  | { ok: false; reason: 'not-found' | 'storage-error'; message: string };

function isQuotaExceeded(error: unknown) {
  return error instanceof DOMException
    && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
}

function storageErrorMessage(error: unknown) {
  return isQuotaExceeded(error)
    ? 'Not enough browser storage. Your existing collection is safe.'
    : 'Could not save this Munchie. Your existing collection is safe.';
}

function disposeResources(resources: Map<string, RuntimeMunchieResource>) {
  resources.forEach(resource => resource.dispose());
  resources.clear();
}

export function useCapturedMunchieCollection(profileId: string) {
  const storageKey = storageKeyForCapturedMunchies(profileId);
  const [items, setItems] = useState<CapturedMunchie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedProfileId, setLoadedProfileId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const itemsRef = useRef<CapturedMunchie[]>([]);
  const resourcesRef = useRef(new Map<string, RuntimeMunchieResource>());
  const removedResourcesRef = useRef(new Map<string, RuntimeMunchieResource>());
  const activeProfileIdRef = useRef(profileId);
  activeProfileIdRef.current = profileId;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadedProfileId(null);
    setStorageError(null);
    itemsRef.current = [];
    setItems([]);
    disposeResources(resourcesRef.current);
    disposeResources(removedResourcesRef.current);

    let legacyCollection: string | null = null;
    try {
      legacyCollection = localStorage.getItem(storageKey);
    } catch {
      // IndexedDB remains usable even when legacy localStorage cannot be read.
    }

    void initializeMunchieInventory(profileId, storageKey, legacyCollection)
      .then((records) => {
        if (cancelled) return;
        const nextResources = new Map<string, RuntimeMunchieResource>();
        try {
          records.forEach((record) => {
            const resource = createRuntimeMunchieResource(record);
            nextResources.set(record.id, resource);
          });
        } catch (error) {
          disposeResources(nextResources);
          throw error;
        }
        if (cancelled) {
          disposeResources(nextResources);
          return;
        }
        disposeResources(resourcesRef.current);
        resourcesRef.current = nextResources;
        const restoredItems = records.flatMap(record => {
          const resource = nextResources.get(record.id);
          return resource ? [resource.munchie] : [];
        });
        itemsRef.current = restoredItems;
        setItems(restoredItems);
      })
      .catch((error) => {
        if (!cancelled) setStorageError(storageErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) {
          setLoadedProfileId(profileId);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      disposeResources(resourcesRef.current);
      disposeResources(removedResourcesRef.current);
      itemsRef.current = [];
    };
  }, [profileId, storageKey]);

  const addCapturedMunchie = useCallback(async (
    originalImage: string,
    cutoutImage?: string,
  ): Promise<AddCapturedMunchieResult> => {
    const itemWithDataUrls = createCapturedMunchie(
      originalImage,
      itemsRef.current.length,
      cutoutImage,
    );
    try {
      const storedRecord = await capturedMunchieDataUrlsToStoredRecord(profileId, itemWithDataUrls);
      await putStoredMunchie(storedRecord);
      const resource = createRuntimeMunchieResource(storedRecord);
      if (activeProfileIdRef.current !== profileId) {
        resource.dispose();
        return { ok: false, message: 'The active profile changed before this Munchie was shown.' };
      }

      resourcesRef.current.set(resource.munchie.id, resource);
      const next = [...itemsRef.current, resource.munchie];
      itemsRef.current = next;
      setItems(next);
      setStorageError(null);
      return { ok: true, item: resource.munchie };
    } catch (error) {
      const message = storageErrorMessage(error);
      setStorageError(message);
      return { ok: false, message };
    }
  }, [profileId]);

  const markMunchieFed = useCallback((
    id: string,
    xpGranted: number,
  ): MarkCapturedMunchieFedStorageResult => {
    const result = markCapturedMunchieFedInCollection(itemsRef.current, id, xpGranted);
    if (!result.updated || !result.item) {
      const alreadyFed = result.reason === 'already-fed';
      return {
        ok: false,
        reason: result.reason ?? 'not-found',
        message: alreadyFed
          ? 'Lunchmate가 이미 맛있게 먹었어요 ♡'
          : '이 Munchie를 collection에서 찾을 수 없어요.',
      };
    }

    itemsRef.current = result.items;
    setItems(result.items);
    setStorageError(null);
    const fedItem = result.item;
    void updateStoredMunchie(profileId, id, stored => ({
      ...stored,
      fedAt: fedItem.fedAt,
      xpGranted: fedItem.xpGranted,
    })).then((updated) => {
      if (!updated && activeProfileIdRef.current === profileId) {
        setStorageError('Could not find this Munchie in browser storage.');
      }
    }).catch((error) => {
      if (activeProfileIdRef.current === profileId) setStorageError(storageErrorMessage(error));
    });
    return { ok: true, item: result.item };
  }, [profileId]);

  const removeMunchie = useCallback(async (
    id: string,
  ): Promise<RemoveCapturedMunchieStorageResult> => {
    const item = itemsRef.current.find(candidate => candidate.id === id);
    if (!item) {
      return {
        ok: false,
        reason: 'not-found',
        message: '이 Munchie를 collection에서 찾을 수 없어요.',
      };
    }

    try {
      const removed = await removeStoredMunchie(profileId, id);
      if (!removed) {
        return {
          ok: false,
          reason: 'not-found',
          message: '이 Munchie는 browser storage에 존재하지 않아요.',
        };
      }
      if (activeProfileIdRef.current === profileId) {
        const next = itemsRef.current.filter(candidate => candidate.id !== id);
        itemsRef.current = next;
        setItems(next);
        const resource = resourcesRef.current.get(id);
        if (resource) {
          resourcesRef.current.delete(id);
          removedResourcesRef.current.set(id, resource);
        }
        setStorageError(null);
      }
      return { ok: true, item };
    } catch (error) {
      const message = storageErrorMessage(error);
      if (activeProfileIdRef.current === profileId) setStorageError(message);
      return { ok: false, reason: 'storage-error', message };
    }
  }, [profileId]);

  const releaseRemovedMunchieResources = useCallback((ids: readonly string[]) => {
    ids.forEach((id) => {
      const resource = removedResourcesRef.current.get(id);
      if (!resource) return;
      removedResourcesRef.current.delete(id);
      resource.dispose();
    });
  }, []);

  const updateMunchiePlacement = useCallback((
    id: string,
    placement: CapturedMunchiePlacement,
  ): UpdateCapturedMunchiePlacementStorageResult => {
    const result = updateCapturedMunchiePlacementInCollection(itemsRef.current, id, placement);
    if (!result.updated || !result.item) {
      return {
        ok: false,
        reason: result.reason ?? 'not-found',
        message: result.reason === 'invalid-placement'
          ? 'Munchie 위치를 저장할 수 없어요.'
          : '이 Munchie를 collection에서 찾을 수 없어요.',
      };
    }

    itemsRef.current = result.items;
    setItems(result.items);
    setStorageError(null);
    const updatedItem = result.item;
    void updateStoredMunchie(profileId, id, stored => ({
      ...stored,
      placement: updatedItem.placement,
    })).then((updated) => {
      if (!updated && activeProfileIdRef.current === profileId) {
        setStorageError('Could not find this Munchie in browser storage.');
      }
    }).catch((error) => {
      if (activeProfileIdRef.current === profileId) setStorageError(storageErrorMessage(error));
    });
    return { ok: true, item: result.item };
  }, [profileId]);

  const clearStorageError = useCallback(() => setStorageError(null), []);

  return {
    items,
    storageKey,
    isLoading,
    loadedProfileId,
    storageError,
    addCapturedMunchie,
    updateMunchiePlacement,
    markMunchieFed,
    removeMunchie,
    releaseRemovedMunchieResources,
    clearStorageError,
  };
}
