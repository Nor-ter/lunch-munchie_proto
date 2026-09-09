import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  capturedMunchieDataUrlsToStoredRecord,
  createRuntimeMunchieResource,
  dataUrlToBlob,
  legacyCollectionToStoredRecords,
  legacyMigrationMarkerKey,
  MUNCHIE_INVENTORY_DB_NAME,
  MUNCHIE_INVENTORY_DB_VERSION,
  munchieInventoryRecordKey,
} from './munchieInventoryDb';
import { createCapturedMunchie, displayImageForCapturedMunchie } from './munchieCapture';

const originalImage = 'data:image/jpeg;base64,b3JpZ2luYWw=';
const cutoutImage = 'data:image/webp;base64,Y3V0b3V0';

describe('Munchie IndexedDB records', () => {
  it('uses the pinned database identity and profile-specific migration markers', () => {
    expect(MUNCHIE_INVENTORY_DB_NAME).toBe('lm_munchie_inventory');
    expect(MUNCHIE_INVENTORY_DB_VERSION).toBe(1);
    expect(legacyMigrationMarkerKey('profile-a')).not.toBe(legacyMigrationMarkerKey('profile-b'));
    expect(munchieInventoryRecordKey('profile-a', 'munchie-1')).toEqual(['profile-a', 'munchie-1']);
    expect(munchieInventoryRecordKey('profile-b', 'munchie-1')).toEqual(['profile-b', 'munchie-1']);
  });

  it('converts image data URLs to binary Blobs', () => {
    const blob = dataUrlToBlob(originalImage);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/jpeg');
    expect(blob.size).toBe(8);
  });

  it('stores images as Blobs while preserving placement, feeding metadata, and provenance', async () => {
    const munchie = {
      ...createCapturedMunchie(originalImage, 0, cutoutImage),
      fedAt: 1_700_000_000_000,
      xpGranted: 20,
      sourcePhotoId: 'photo-1',
      sourceCourseId: 'course-1',
      sourcePlaceId: 'place-1',
      sourcePlaceName: 'Ramen House',
    };

    const stored = await capturedMunchieDataUrlsToStoredRecord('profile-a', munchie);

    expect(stored).toMatchObject({
      profileId: 'profile-a',
      id: munchie.id,
      createdAt: munchie.createdAt,
      placement: munchie.placement,
      fedAt: munchie.fedAt,
      xpGranted: 20,
      sourcePhotoId: 'photo-1',
      sourceCourseId: 'course-1',
      sourcePlaceId: 'place-1',
      sourcePlaceName: 'Ramen House',
    });
    expect(stored.originalImageBlob).toBeInstanceOf(Blob);
    expect(stored.cutoutImageBlob).toBeInstanceOf(Blob);
  });
});

describe('legacy localStorage migration conversion', () => {
  it('converts ten valid v1 items without applying the old six-item limit', async () => {
    const items = Array.from({ length: 10 }, (_, index) => ({
      ...createCapturedMunchie(originalImage, index, index % 2 === 0 ? cutoutImage : undefined),
      id: `legacy-${index}`,
      createdAt: 1_700_000_000_000 + index,
    }));

    const result = await legacyCollectionToStoredRecords(
      'profile-a',
      JSON.stringify({ version: 1, items }),
    );

    expect(result.status).toBe('completed');
    expect(result.records).toHaveLength(10);
    expect(result.records.every(record => record.profileId === 'profile-a')).toBe(true);
    expect(result.records.map(record => record.id)).toEqual(items.map(item => item.id));
    const serializedItems = JSON.parse(JSON.stringify(items)) as typeof items;
    expect(result.records.map(record => record.placement)).toEqual(
      serializedItems.map(item => item.placement),
    );
  });

  it('preserves fedAt and xpGranted instead of consuming a legacy fed item', async () => {
    const fed = {
      ...createCapturedMunchie(originalImage, 0, cutoutImage),
      fedAt: 1_700_000_123_456,
      xpGranted: 20,
    };

    const result = await legacyCollectionToStoredRecords(
      'profile-a',
      JSON.stringify({ version: 1, items: [fed] }),
    );

    expect(result.records[0]).toMatchObject({
      id: fed.id,
      fedAt: fed.fedAt,
      xpGranted: 20,
    });
  });

  it('reports corrupt legacy JSON without mutating the provided backup text', async () => {
    const legacyBackup = '{not-json';

    const result = await legacyCollectionToStoredRecords('profile-a', legacyBackup);

    expect(result).toEqual({
      status: 'corrupt',
      sourceItemCount: 0,
      skippedItemCount: 0,
      records: [],
    });
    expect(legacyBackup).toBe('{not-json');
  });

  it('uses profile IDs on every converted record so inventories remain isolated', async () => {
    const munchie = createCapturedMunchie(originalImage, 0);
    const serialized = JSON.stringify({ version: 1, items: [munchie] });

    const [profileA, profileB] = await Promise.all([
      legacyCollectionToStoredRecords('profile-a', serialized),
      legacyCollectionToStoredRecords('profile-b', serialized),
    ]);

    expect(profileA.records[0]?.profileId).toBe('profile-a');
    expect(profileB.records[0]?.profileId).toBe('profile-b');
  });
});

describe('runtime object URL lifecycle', () => {
  it('restores the existing image contract and revokes every URL exactly once', async () => {
    const stored = await capturedMunchieDataUrlsToStoredRecord(
      'profile-a',
      createCapturedMunchie(originalImage, 0, cutoutImage),
    );
    const createObjectURL = vi.fn()
      .mockReturnValueOnce('blob:original')
      .mockReturnValueOnce('blob:cutout');
    const revokeObjectURL = vi.fn();
    const resource = createRuntimeMunchieResource(stored, { createObjectURL, revokeObjectURL });

    expect(resource.munchie.originalImage).toBe('blob:original');
    expect(resource.munchie.cutoutImage).toBe('blob:cutout');
    expect(displayImageForCapturedMunchie(resource.munchie)).toBe('blob:cutout');

    resource.dispose();
    resource.dispose();
    expect(revokeObjectURL.mock.calls).toEqual([
      ['blob:original'],
      ['blob:cutout'],
    ]);
  });
});

describe('Stage 1 integration contract', () => {
  it('waits for the IndexedDB add before entering Reveal', () => {
    const pageSource = readFileSync(
      join(process.cwd(), 'client', 'src', 'pages', 'MunchieCapturePrototypePage.tsx'),
      'utf8',
    );
    const writeStart = pageSource.indexOf('await collection.addCapturedMunchie');
    const failureCheck = pageSource.indexOf('if (!result.ok)', writeStart);
    const reveal = pageSource.indexOf("setPhase('reveal')", writeStart);

    expect(writeStart).toBeGreaterThan(-1);
    expect(failureCheck).toBeGreaterThan(writeStart);
    expect(reveal).toBeGreaterThan(failureCheck);
    expect(pageSource).not.toContain('collection.isFull');
    expect(pageSource).not.toContain('MUNCHIE_CAPTURE_FULL_MESSAGE');
  });

  it('keeps legacy localStorage as a read-only migration backup', () => {
    const hookSource = readFileSync(
      join(process.cwd(), 'client', 'src', 'hooks', 'useCapturedMunchieCollection.ts'),
      'utf8',
    );

    expect(hookSource).toContain('localStorage.getItem(storageKey)');
    expect(hookSource).not.toContain('localStorage.setItem');
    expect(hookSource).not.toContain('localStorage.removeItem');
    expect(hookSource).toContain('await putStoredMunchie(storedRecord)');
    expect(hookSource.indexOf('await putStoredMunchie(storedRecord)'))
      .toBeLessThan(hookSource.indexOf('setItems(next)'));
  });

  it('keeps the shared Lunchmate flow compatible with synchronous and async consumers', () => {
    const hookSource = readFileSync(
      join(process.cwd(), 'client', 'src', 'hooks', 'useCapturedMunchieCollection.ts'),
      'utf8',
    );
    const lunchmateFlowSource = readFileSync(
      join(process.cwd(), 'client', 'src', 'hooks', 'useLunchmateFlow.ts'),
      'utf8',
    );

    expect(hookSource).toContain('markCapturedMunchieFedInCollection');
    expect(lunchmateFlowSource).toContain('await onFoodConsumed(item);');
    expect(lunchmateFlowSource).toContain('onTotalXpChange(progressUpdate.nextTotalXp);');
  });

  it('deletes with the profile-scoped compound key and confirms the record existed', () => {
    const repositorySource = readFileSync(
      join(process.cwd(), 'client', 'src', 'lib', 'munchieInventoryDb.ts'),
      'utf8',
    );
    const removeStart = repositorySource.indexOf('export async function removeStoredMunchie');
    const updateStart = repositorySource.indexOf('export async function updateStoredMunchie');
    const removeSource = repositorySource.slice(removeStart, updateStart);

    expect(removeSource).toContain('munchieInventoryRecordKey(profileId, id)');
    expect(removeSource).toContain('store.get(key)');
    expect(removeSource).toContain('store.delete(key)');
    expect(removeSource.indexOf('store.get(key)')).toBeLessThan(removeSource.indexOf('store.delete(key)'));
  });
});
