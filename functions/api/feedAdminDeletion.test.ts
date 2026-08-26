import { describe, expect, it } from 'vitest';
import { onRequest } from './[[path]]';

const encoder = new TextEncoder();
const base64Url = (value: Uint8Array | string) => {
  const raw = typeof value === 'string' ? value : String.fromCharCode(...value);
  return btoa(raw).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
};

async function sessionCookie(secret: string, sub: string, email: string) {
  const payload = base64Url(JSON.stringify({ sub, email, exp: Date.now() + 60_000 }));
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = base64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payload))));
  return `lm_session=${payload}.${signature}`;
}

function deletionDatabase(authorId = 'post-author') {
  const batches: string[][] = [];
  return {
    batches,
    prepare(sql: string) {
      const statement = {
        sql,
        bind() { return statement; },
        async first() {
          if (sql.includes('SELECT id, author_id FROM courses')) {
            return { id: 'course-admin-delete', author_id: authorId };
          }
          return null;
        },
        async all() { return { results: [] }; },
        async run() { return { success: true }; },
      };
      return statement;
    },
    async batch(statements: Array<{ sql: string }>) {
      batches.push(statements.map((statement) => statement.sql));
      return statements.map(() => ({ success: true }));
    },
  };
}

async function deleteRequest(
  email: string,
  sub: string,
  db: ReturnType<typeof deletionDatabase>,
) {
  const secret = 'feed-admin-delete-secret';
  return onRequest({
    request: new Request('https://example.test/api/feed-post?courseId=course-admin-delete', {
      method: 'DELETE',
      headers: { cookie: await sessionCookie(secret, sub, email) },
    }),
    env: {
      DB: db,
      AUTH_SESSION_SECRET: secret,
      ADMIN_EMAILS: 'pjh5635@gmail.com',
    },
  } as any);
}

describe('administrator feed deletion boundary', () => {
  it('builds a session cookie accepted by existing administrator routes', async () => {
    const secret = 'feed-admin-delete-secret';
    const cookie = await sessionCookie(secret, 'admin-sub', 'pjh5635@gmail.com');
    const response = await onRequest({
      request: new Request('https://example.test/api/admin/photos', { headers: { cookie } }),
      env: { DB: deletionDatabase(), AUTH_SESSION_SECRET: secret, ADMIN_EMAILS: 'pjh5635@gmail.com' },
    } as any);
    expect(response.status).not.toBe(401);
  });

  it('allows the configured administrator to delete another author post', async () => {
    const db = deletionDatabase();
    const response = await deleteRequest('PJH5635@gmail.com', 'admin-sub', db);

    expect(response.status, await response.clone().text()).toBe(200);
    expect(db.batches).toHaveLength(1);
    expect(db.batches[0]).toContain('DELETE FROM courses WHERE id = ?');
  });

  it('continues to reject a non-admin deleting another author post', async () => {
    const db = deletionDatabase();
    const response = await deleteRequest('member@example.com', 'member-sub', db);

    expect(response.status).toBe(403);
    expect(db.batches).toHaveLength(0);
  });

  it('continues to allow a normal author to delete their own post', async () => {
    const db = deletionDatabase('owner-sub');
    const response = await deleteRequest('owner@example.com', 'owner-sub', db);

    expect(response.status, await response.clone().text()).toBe(200);
    expect(db.batches).toHaveLength(1);
  });
});
