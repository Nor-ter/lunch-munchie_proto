import { describe, expect, it, vi } from 'vitest';
import { app, type EnvBindings } from './[[path]]';

function createEnv(): EnvBindings {
  const db = {
    prepare: vi.fn((query: string) => {
      const statement = {
        bind: vi.fn(() => statement),
        first: vi.fn(async () => query.startsWith('SELECT * FROM restaurants WHERE id = ?') ? {
          id: 'osm_node_622311421',
          name: 'Pho La Que Basil Leaf',
          category: 'Vietnamese',
          address: '369 Brunswick Street Fitzroy 3065',
          latitude: -37.796131,
          longitude: 144.978655,
          rating: 4.2,
          review_count: 12,
          price_level: 2,
          tags: '["restaurant","vietnamese"]',
          dietary_options: '[]',
          menus: '[]',
        } : null),
        all: vi.fn(async () => ({ results: [] })),
      };
      return statement;
    }),
  };
  return {
    DB: db,
    PHOTOS_R2: {},
    USER_DO: {},
    SESSION_DO: {},
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    AUTH_SESSION_SECRET: 'test-session-secret',
  };
}

describe('GET /api/restaurants/:id', () => {
  it('restores the exact restaurant referenced by a saved Lunchie journey', async () => {
    const response = await app.request(
      'http://localhost/api/restaurants/osm_node_622311421',
      {},
      createEnv(),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'osm_node_622311421',
      latitude: -37.796131,
      longitude: 144.978655,
      tags: ['restaurant', 'vietnamese'],
    });
  });

  it('returns 404 when the saved restaurant no longer exists', async () => {
    const env = createEnv();
    env.DB.prepare = vi.fn(() => {
      const statement = {
        bind: vi.fn(() => statement),
        first: vi.fn(async () => null),
      };
      return statement;
    });
    const response = await app.request('http://localhost/api/restaurants/missing', {}, env);
    expect(response.status).toBe(404);
  });
});
