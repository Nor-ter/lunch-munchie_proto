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

function deletionDatabase(
  authorId = 'post-author',
  mediaPaths: string[] = [],
  legacyPhotoPaths: string[] = [],
  r2Failures = 0,
  r2ReferenceCounts: number[] = [],
) {
  const batches: string[][] = [];
  const queued = new Map<string, string>();
  const deletedR2Keys: string[] = [];
  let courseExists = true;
  let remainingR2Failures = r2Failures;
  return {
    batches,
    deletedR2Keys,
    prepare(sql: string) {
      let values: unknown[] = [];
      const statement = {
        sql,
        bind(...bound: unknown[]) { values = bound; return statement; },
        async first() {
          if (sql.includes('SELECT id, author_id, hero_image, feed_photos, feed_decor FROM courses')) {
            return courseExists ? {
              id: 'course-admin-delete',
              author_id: authorId,
              hero_image: legacyPhotoPaths[0] ?? null,
              feed_photos: JSON.stringify(legacyPhotoPaths),
              feed_decor: JSON.stringify(legacyPhotoPaths.map((src, index) => ({ src, x: 50, y: 50 + index }))),
            } : null;
          }
          if (sql.includes('SELECT COUNT(*) AS count FROM r2_media_deletions')) {
            return { count: queued.size };
          }
          if (sql.includes('AS count')) return { count: r2ReferenceCounts.shift() ?? 0 };
          return null;
        },
        async all() {
          if (sql.includes('SELECT r2_path FROM course_media')) {
            return { results: mediaPaths.map(r2_path => ({ r2_path })) };
          }
          if (sql.includes('SELECT r2_path, owner_id FROM r2_media_deletions')) {
            const entries = Array.from(queued, ([r2_path, owner_id]) => ({ r2_path, owner_id }));
            return {
              results: sql.includes('WHERE r2_path IN')
                ? entries.filter(({ r2_path }) => values.includes(r2_path))
                : entries.slice(0, 25),
            };
          }
          return { results: [] };
        },
        async run() {
          if (sql.startsWith('INSERT OR IGNORE INTO r2_media_deletions')) {
            queued.set(String(values[0]), String(values[1]));
          }
          if (sql.startsWith('DELETE FROM r2_media_deletions')) queued.delete(String(values[0]));
          if (sql.startsWith('DELETE FROM courses')) courseExists = false;
          return { success: true };
        },
      };
      return statement;
    },
    async batch(statements: Array<{ sql: string; run(): Promise<unknown> }>) {
      batches.push(statements.map((statement) => statement.sql));
      return Promise.all(statements.map((statement) => statement.run()));
    },
    async deleteR2(key: string) {
      if (remainingR2Failures > 0) {
        remainingR2Failures -= 1;
        throw new Error('temporary R2 failure');
      }
      deletedR2Keys.push(key);
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
      PHOTOS_R2: { delete: (key: string) => db.deleteR2(key) },
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

  it('deletes only the removed author post media from R2 after the D1 batch', async () => {
    const db = deletionDatabase('owner-sub', [
      '/photos/uploads/owner-sub/post.jpg',
      '/photos/uploads/someone-else/not-owned.jpg',
    ]);
    const response = await deleteRequest('owner@example.com', 'owner-sub', db);

    expect(response.status, await response.clone().text()).toBe(200);
    expect(db.deletedR2Keys).toEqual(['photos/uploads/owner-sub/post.jpg']);
    await expect(response.json()).resolves.toMatchObject({ mediaCleanupPending: 0 });
  });

  it('drains every media path for a post even when it exceeds the backlog batch size', async () => {
    const photos = Array.from(
      { length: 31 },
      (_, index) => `/photos/uploads/owner-sub/post-${index}.jpg`,
    );
    const db = deletionDatabase('owner-sub', photos);
    const response = await deleteRequest('owner@example.com', 'owner-sub', db);

    expect(response.status).toBe(200);
    expect(db.deletedR2Keys).toHaveLength(31);
    await expect(response.json()).resolves.toMatchObject({ mediaCleanupPending: 0 });
  });

  it('treats a repeated delete as an idempotent success', async () => {
    const db = deletionDatabase('owner-sub');
    const first = await deleteRequest('owner@example.com', 'owner-sub', db);
    const retried = await deleteRequest('owner@example.com', 'owner-sub', db);

    expect(first.status).toBe(200);
    expect(retried.status).toBe(200);
    await expect(retried.json()).resolves.toMatchObject({
      ok: true,
      deletedCourseId: 'course-admin-delete',
      alreadyDeleted: true,
    });
    expect(db.batches).toHaveLength(1);
  });

  it('deletes author-owned legacy JSON-only media', async () => {
    const legacyPath = '/photos/uploads/owner-sub/legacy-only.jpg';
    const db = deletionDatabase('owner-sub', [], [legacyPath]);
    const response = await deleteRequest('owner@example.com', 'owner-sub', db);

    expect(response.status).toBe(200);
    expect(db.deletedR2Keys).toEqual(['photos/uploads/owner-sub/legacy-only.jpg']);
  });

  it('retries a failed R2 deletion when the idempotent delete is repeated', async () => {
    const photo = '/photos/uploads/owner-sub/retry.jpg';
    const db = deletionDatabase('owner-sub', [photo], [], 1);
    const first = await deleteRequest('owner@example.com', 'owner-sub', db);
    const retried = await deleteRequest('owner@example.com', 'owner-sub', db);

    await expect(first.json()).resolves.toMatchObject({ mediaCleanupPending: 1 });
    await expect(retried.json()).resolves.toMatchObject({
      alreadyDeleted: true,
      mediaCleanupPending: 0,
    });
    expect(db.deletedR2Keys).toEqual(['photos/uploads/owner-sub/retry.jpg']);
  });

  it('keeps a shared-asset tombstone until its final reference is gone', async () => {
    const photo = '/photos/uploads/owner-sub/shared.jpg';
    const db = deletionDatabase('owner-sub', [photo], [], 0, [1, 0]);
    const first = await deleteRequest('owner@example.com', 'owner-sub', db);
    const retried = await deleteRequest('owner@example.com', 'owner-sub', db);

    await expect(first.json()).resolves.toMatchObject({ mediaCleanupPending: 1 });
    await expect(retried.json()).resolves.toMatchObject({ mediaCleanupPending: 0 });
    expect(db.deletedR2Keys).toEqual(['photos/uploads/owner-sub/shared.jpg']);
  });
});
