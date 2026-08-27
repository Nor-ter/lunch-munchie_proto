import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { app, type EnvBindings } from './[[path]]';
import {
  normalizeLunchmatePatch,
  publicLunchmateProfileFromRow,
} from './publicLunchmateProfile';

type UserRow = Record<string, unknown> & { id: string };

function createDb(initialRows: UserRow[]) {
  const rows = new Map(initialRows.map((row) => [row.id, { ...row }]));
  const prepare = vi.fn((query: string) => {
    let bindings: unknown[] = [];
    const statement = {
      bind: vi.fn((...values: unknown[]) => {
        bindings = values;
        return statement;
      }),
      all: vi.fn(async () => query.startsWith('PRAGMA table_info(users)')
        ? { results: [
          'id', 'username', 'handle', 'profile_image_url', 'bio', 'location', 'created_at',
          'foodie_char', 'foodie_skin', 'lunchmate_loadout', 'lunchmate_room_loadout',
          'lunchmate_visibility',
        ].map((name) => ({ name })) }
        : { results: [] }),
      first: vi.fn(async () => {
        if (query.includes('COUNT(*) AS count')) return { count: 0 };
        if (query.includes('handle = ? COLLATE NOCASE')) return null;
        if (query.includes('FROM users WHERE id = ?')) return rows.get(String(bindings[0])) ?? null;
        return null;
      }),
      run: vi.fn(async () => {
        const update = query.match(/UPDATE users SET ([a-z_]+) = \? WHERE id = \?/);
        if (update) {
          const row = rows.get(String(bindings[1]));
          if (row) row[update[1]] = bindings[0];
        }
        return { success: true };
      }),
    };
    return statement;
  });
  return {
    rows,
    db: {
      prepare,
      batch: vi.fn(async (statements: Array<{ run: () => Promise<unknown> }>) => (
        Promise.all(statements.map((statement) => statement.run()))
      )),
    },
  };
}

function createEnv(db: unknown): EnvBindings {
  return {
    DB: db,
    PHOTOS_R2: {},
    USER_DO: {},
    SESSION_DO: {},
    GOOGLE_CLIENT_ID: 'client',
    GOOGLE_CLIENT_SECRET: 'secret',
    AUTH_SESSION_SECRET: 'session-secret',
  };
}

const publicRow = (id: string, visibility: 'public' | 'private' = 'public'): UserRow => ({
  id,
  username: `User ${id}`,
  handle: `user_${id}`,
  profile_image_url: null,
  bio: null,
  location: null,
  created_at: 1,
  foodie_char: '🐥',
  foodie_skin: 'blue-note',
  lunchmate_loadout: JSON.stringify({
    outfit: 'outfit_hoodie_coral', headwear: null, eyewear: null, bag: null,
  }),
  lunchmate_room_loadout: JSON.stringify({
    wallpaperId: 'wallpaper_blue_note', floorId: 'floor_light_wood',
    furnitureId: null, propsId: 'props_blue_note',
  }),
  lunchmate_visibility: visibility,
});

describe('Cloudflare D1 public Lunchmate profile contract', () => {
  it('rejects private client fields and strips private presentation on the server', () => {
    expect(normalizeLunchmatePatch({
      character: '🐥',
      inventory: ['secret-item'],
    })).toBeNull();
    expect(publicLunchmateProfileFromRow(publicRow('private', 'private'))).toEqual({
      visibility: 'private', character: null, skin: null, loadout: null, roomConfig: null,
    });
  });

  it('returns only the viewed D1 user public presentation', async () => {
    const { db } = createDb([publicRow('B')]);
    const response = await app.request('http://localhost/api/users/B', undefined, createEnv(db));
    const body = await response.json<Record<string, unknown>>();

    expect(response.status).toBe(200);
    expect(body.id).toBe('B');
    expect(body.lunchmate).toMatchObject({ visibility: 'public', skin: 'blue-note' });
    expect(JSON.stringify(body)).not.toContain('inventory');
    expect(JSON.stringify(body)).not.toContain('reward');
  });

  it('keeps every Lunchmate update bound to the signed session owner', () => {
    const source = readFileSync(join(import.meta.dirname, '[[path]].ts'), 'utf8');
    const start = source.indexOf('if (hasLunchmate)');
    const end = source.indexOf('\n  try {', start);
    const updateBlock = source.slice(start, end);
    expect(updateBlock).toContain('.bind(lunchmate.character, session.sub)');
    expect(updateBlock).toContain('.bind(lunchmate.skin, session.sub)');
    expect(updateBlock).toContain('session.sub)');
    expect(updateBlock).not.toContain('viewedUserId');
    expect(updateBlock).not.toContain('body.userId');
  });

  it('requires a signed Cloudflare session for Lunchmate updates', async () => {
    const { db } = createDb([publicRow('A')]);
    const response = await app.request('http://localhost/api/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lunchmate: { visibility: 'private' } }),
    }, createEnv(db));
    expect(response.status).toBe(401);
  });
});
