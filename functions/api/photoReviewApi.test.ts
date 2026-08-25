import { describe, expect, it } from 'vitest';
import { onRequest } from './[[path]]';

const encoder = new TextEncoder();
const base64Url = (value: Uint8Array | string) => {
  const raw = typeof value === 'string' ? value : String.fromCharCode(...value);
  return btoa(raw).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
};

async function adminCookie(secret: string) {
  const payload = base64Url(JSON.stringify({ sub: 'admin-user', email: 'admin@example.com', exp: Date.now() + 60_000 }));
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = base64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payload))));
  return `lm_session=${payload}.${signature}`;
}

function database() {
  const updates: unknown[][] = [];
  return {
    updates,
    prepare(sql: string) {
      let bindings: unknown[] = [];
      const statement = {
        bind(...values: unknown[]) { bindings = values; return statement; },
        async all() {
          if (sql.includes('SELECT rp.id, rp.restaurant_id')) return { results: [{
            id: 'photo-1', restaurant_id: 'restaurant-1', restaurant_name: 'Test Kitchen',
            restaurant_category: '한식', restaurant_address: 'Melbourne', r2_key: 'test/food.jpg',
            kind: 'dish', dishes: '["비빔밥"]', vibe_tags: '[]', quality: 0.9, has_person: 0,
            source: 'drive', review_status: 'pending', review_notes: null, created_at: 1_700_000_000_000,
            reviewed_at: null,
          }] };
          if (sql.includes('GROUP BY review_status')) return { results: [{ status: 'pending', count: 1, restaurants: 1 }] };
          return { results: [] };
        },
        async first() {
          if (sql.includes('COUNT(*) AS photos')) return { photos: 1, restaurants: 1 };
          if (sql.includes('COUNT(*) AS count')) return { count: 1 };
          if (sql.includes('SELECT review_status, kind')) return { review_status: 'pending', kind: 'dish', has_person: 0, quality: 0.9, review_notes: null };
          return null;
        },
        async run() { updates.push(bindings); return { success: true, meta: { changes: 1 } }; },
      };
      return statement;
    },
  };
}

describe('administrator restaurant photo API', () => {
  const secret = 'photo-review-test-secret';

  it('returns restaurant-groupable photo records and review totals', async () => {
    const db = database();
    const response = await onRequest({
      request: new Request('https://example.test/api/admin/photos?status=pending', { headers: { cookie: await adminCookie(secret) } }),
      env: { DB: db, AUTH_SESSION_SECRET: secret, ADMIN_EMAILS: 'admin@example.com' },
    } as any);
    expect(response.status).toBe(200);
    const payload = await response.json() as any;
    expect(payload.photos[0]).toMatchObject({ restaurantName: 'Test Kitchen', reviewStatus: 'pending', url: '/photos/test/food.jpg' });
    expect(payload.summary).toMatchObject({ all: { photos: 1, restaurants: 1 }, pending: { photos: 1, restaurants: 1 } });
  });

  it('records an authenticated exclusion without deleting the R2 object', async () => {
    const db = database();
    const response = await onRequest({
      request: new Request('https://example.test/api/admin/photos/photo-1', {
        method: 'PATCH',
        headers: { cookie: await adminCookie(secret), 'content-type': 'application/json' },
        body: JSON.stringify({ reviewStatus: 'rejected', reviewNotes: '인물 중심 사진' }),
      }),
      env: { DB: db, AUTH_SESSION_SECRET: secret, ADMIN_EMAILS: 'admin@example.com' },
    } as any);
    expect(response.status).toBe(200);
    expect(db.updates).toHaveLength(1);
    expect(db.updates[0][0]).toBe('rejected');
    expect(db.updates[0][4]).toBe('인물 중심 사진');
  });
});
