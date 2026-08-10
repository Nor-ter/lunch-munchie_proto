import { describe, expect, it } from 'vitest';
import { app, type EnvBindings } from './[[path]]';

type FakeSession = {
  id: string;
  host_user_id: string;
  share_token: string;
  group_size: number;
  status: string;
  filter_budget: number;
  filter_categories: string;
  filter_dietary: string;
};

const HOST_KEY = 'host-key';
const GUEST_KEY = 'guest-key';
const HOST_KEY_HASH = '09f10e4bdc37a471382a5aa37101705b258c9b246fbcfa1e8727723214f1a738';
const GUEST_KEY_HASH = 'c23e1cb9ae13908a2ac9550851759b29591985211c12813483f20861be72d356';

class FakeD1 {
  session: FakeSession;
  members: Array<{ user_id: string; user_name: string; emoji: string; is_ready: number; preferences_json: string; member_secret_hash: string; joined_at: number }>;
  restaurantCount: number;
  restaurantMenus: string;

  constructor(overrides: Partial<FakeSession> = {}, restaurantCount = 0, restaurantMenus = '[]') {
    this.session = {
      id: 'session-test',
      host_user_id: 'host-user',
      share_token: 'ABC123',
      group_size: 2,
      status: 'WAITING',
      filter_budget: 2,
      filter_categories: '[]',
      filter_dietary: '[]',
      ...overrides,
    };
    this.members = [
      { user_id: 'host-user', user_name: 'Host', emoji: '😊', is_ready: 1, preferences_json: '[]', member_secret_hash: HOST_KEY_HASH, joined_at: 1 },
      { user_id: 'guest-user', user_name: 'Guest', emoji: '🍜', is_ready: 1, preferences_json: '[]', member_secret_hash: GUEST_KEY_HASH, joined_at: 2 },
    ];
    this.restaurantCount = restaurantCount;
    this.restaurantMenus = restaurantMenus;
  }

  prepare(sql: string) {
    const database = this;
    let values: unknown[] = [];
    return {
      bind(...bound: unknown[]) {
        values = bound;
        return this;
      },
      async first() {
        if (sql.includes('FROM sessions WHERE share_token')) return database.session;
        if (sql.includes('FROM session_members')) {
          return database.members.find(member => member.user_id === values[1]) ?? null;
        }
        return null;
      },
      async all() {
        if (sql.includes('FROM session_members')) return { results: database.members };
        if (sql.includes('FROM restaurants')) {
          return {
            results: Array.from({ length: database.restaurantCount }, (_, index) => ({
              id: `restaurant-${index}`,
              category: '한식',
              rating: 4,
              price_level: 2,
              dietary_options: '[]',
              menus: database.restaurantMenus,
            })),
          };
        }
        return { results: [] };
      },
      async run() {
        if (sql.includes("SET status = 'CANCELLED'")) database.session.status = 'CANCELLED';
        if (sql.includes('UPDATE sessions SET status = ?')) database.session.status = String(values[0]);
        if (sql.startsWith('DELETE FROM session_members')) {
          const before = database.members.length;
          database.members = database.members.filter(member => member.user_id !== values[1]);
          return { meta: { changes: before - database.members.length } };
        }
        return { meta: { changes: 1 } };
      },
    };
  }
}

function env(database: FakeD1): EnvBindings {
  return { DB: database } as unknown as EnvBindings;
}

async function post(database: FakeD1, path: string, body: Record<string, unknown>) {
  return app.request(`http://local.test${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, env(database));
}

describe('Quick Match session lifecycle API', () => {
  it('allows only the host to cancel and keeps cancellation idempotent', async () => {
    const database = new FakeD1();
    const denied = await post(database, '/api/sessions/ABC123/cancel', {
      userId: 'host-user',
      memberKey: GUEST_KEY,
    });
    expect(denied.status).toBe(403);
    expect(database.session.status).toBe('WAITING');

    const cancelled = await post(database, '/api/sessions/ABC123/cancel', { userId: 'host-user', memberKey: HOST_KEY });
    expect(cancelled.status).toBe(200);
    expect(database.session.status).toBe('CANCELLED');

    const repeated = await post(database, '/api/sessions/ABC123/cancel', { userId: 'host-user', memberKey: HOST_KEY });
    expect(repeated.status).toBe(200);
  });

  it('lets a participant leave without ending the host session', async () => {
    const database = new FakeD1();
    const response = await post(database, '/api/sessions/ABC123/leave', { userId: 'guest-user', memberKey: GUEST_KEY });
    expect(response.status).toBe(200);
    expect(database.members.map(member => member.user_id)).toEqual(['host-user']);
    expect(database.session.status).toBe('WAITING');
  });

  it('requires the host to cancel instead of leaving', async () => {
    const database = new FakeD1();
    const response = await post(database, '/api/sessions/ABC123/leave', { userId: 'host-user', memberKey: HOST_KEY });
    expect(response.status).toBe(409);
    expect(database.members).toHaveLength(2);
  });

  it('returns a distinct empty-catalogue code without starting the session', async () => {
    const database = new FakeD1({}, 0);
    const response = await post(database, '/api/sessions/ABC123/status', {
      status: 'SWIPING_1',
      deadlineMinutes: 10,
      userId: 'host-user',
      memberKey: HOST_KEY,
    });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: 'CATALOG_EMPTY' });
    expect(database.session.status).toBe('WAITING');
  });

  it('starts with best-effort candidates when diet-style evidence is unavailable', async () => {
    const database = new FakeD1({ filter_dietary: '["VEGAN"]' }, 3);
    const response = await post(database, '/api/sessions/ABC123/status', {
      status: 'SWIPING_1',
      deadlineMinutes: 10,
      userId: 'host-user',
      memberKey: HOST_KEY,
    });
    expect(response.status).toBe(200);
    expect(database.session.status).toBe('SWIPING_1');
  });

  it('does not relax an ingredient exclusion when every venue conflicts', async () => {
    const database = new FakeD1(
      { filter_dietary: '["NO_DAIRY"]' },
      3,
      '[{"name":"Cream pasta"}]',
    );
    const response = await post(database, '/api/sessions/ABC123/status', {
      status: 'SWIPING_1',
      deadlineMinutes: 10,
      userId: 'host-user',
      memberKey: HOST_KEY,
    });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: 'NO_MATCHES' });
    expect(database.session.status).toBe('WAITING');
  });

  it('starts with a non-empty default-price catalogue', async () => {
    const database = new FakeD1({}, 3);
    const response = await post(database, '/api/sessions/ABC123/status', {
      status: 'SWIPING_1',
      deadlineMinutes: 10,
      userId: 'host-user',
      memberKey: HOST_KEY,
    });
    expect(response.status).toBe(200);
    expect(database.session.status).toBe('SWIPING_1');
  });
});
