import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../migrations/0017_restore_catalogue_photo_metadata.sql', import.meta.url),
  'utf8',
);
const manifest = JSON.parse(
  readFileSync(new URL('../../server/data/drive_ingest.json', import.meta.url), 'utf8'),
) as { photos: Array<{ url?: string; kind?: string }> };

describe('production photo metadata restoration', () => {
  it('covers every classified R2 catalogue photo from the canonical manifest', () => {
    const photos = manifest.photos.filter(
      photo => photo.url?.startsWith('/photos/') && photo.kind,
    );
    expect(photos).toHaveLength(429);
    for (const photo of photos) {
      const key = photo.url!.slice('/photos/'.length).replaceAll("'", "''");
      expect(migration).toContain(`WHERE r2_key = '${key}' AND kind = 'unclassified'`);
    }
  });

  it('never overwrites already reviewed or manually corrected classifications', () => {
    const updates = migration.match(/^UPDATE restaurant_photos /gm) ?? [];
    expect(updates).toHaveLength(429);
    expect(migration).not.toContain('INSERT OR REPLACE');
    expect(migration).toContain("AND kind = 'unclassified'");
  });
});
