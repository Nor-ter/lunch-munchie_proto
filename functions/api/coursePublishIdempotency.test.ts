import { describe, expect, it } from 'vitest';
import { onRequest } from './[[path]]';

const encoder = new TextEncoder();
const base64Url = (value: Uint8Array | string) => {
  const raw = typeof value === 'string' ? value : String.fromCharCode(...value);
  return btoa(raw).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
};

async function sessionCookie(secret: string, sub: string) {
  const payload = base64Url(JSON.stringify({
    sub,
    email: `${sub}@example.test`,
    exp: Date.now() + 60_000,
  }));
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = base64Url(new Uint8Array(
    await crypto.subtle.sign('HMAC', key, encoder.encode(payload)),
  ));
  return `lm_session=${payload}.${signature}`;
}

function publicationDatabase(
  sourceVisible = true,
  concurrentPayloadHash: string | null = null,
) {
  const publications = new Map<string, {
    id: string;
    author_id: string;
    created_at: number;
    publish_payload_hash: string;
  }>();
  const insertedCourses: unknown[][] = [];

  return {
    insertedCourses,
    prepare(sql: string) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      let values: unknown[] = [];
      const statement = {
        sql: normalized,
        bind(...bound: unknown[]) {
          values = bound;
          return statement;
        },
        async first() {
          if (normalized.startsWith('SELECT id, author_id, created_at, publish_payload_hash FROM courses WHERE author_id')) {
            return publications.get(`${String(values[0])}:${String(values[1])}`) ?? null;
          }
          if (normalized.startsWith('SELECT c.id FROM courses c')) {
            return sourceVisible && values[1] === 'source-course' ? { id: 'source-course' } : null;
          }
          return null;
        },
        async all() {
          if (normalized.startsWith('SELECT id, name, category, address, photos FROM restaurants')) {
            return {
              results: values.map(id => ({
                id,
                name: 'Source Restaurant',
                category: 'Korean',
                address: '1 Lunchie Lane',
                photos: '[]',
              })),
            };
          }
          return { results: [] };
        },
        async run() {
          if (normalized.startsWith('INSERT INTO courses')) {
            insertedCourses.push(values.slice());
            const [id, authorId] = values;
            const idempotencyKey = values[16];
            const payloadHash = String(values[17]);
            const createdAt = Number(values[18]);
            if (idempotencyKey) {
              publications.set(`${String(authorId)}:${String(idempotencyKey)}`, {
                id: String(id),
                author_id: String(authorId),
                created_at: createdAt,
                publish_payload_hash: concurrentPayloadHash ?? payloadHash,
              });
            }
            if (concurrentPayloadHash) throw new Error('UNIQUE constraint failed');
          }
          return { success: true };
        },
      };
      return statement;
    },
    async batch(statements: Array<{ run(): Promise<unknown> }>) {
      return Promise.all(statements.map(statement => statement.run()));
    },
  };
}

async function publish(
  db: ReturnType<typeof publicationDatabase>,
  idempotencyKey: string | null,
  description = 'Visited today',
) {
  const secret = 'course-publish-secret';
  const photo = '/photos/uploads/publisher/meal.jpg';
  return onRequest({
    request: new Request('https://example.test/api/courses', {
      method: 'POST',
      headers: {
        cookie: await sessionCookie(secret, 'publisher'),
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify({
        title: 'Lunch journal',
        description,
        sourceCourseId: 'source-course',
        stops: [{ placeId: 'restaurant-one' }],
        feedPhotos: [photo],
        feedDecor: [{ id: 'photo-one', src: photo, x: 50, y: 50, w: 40, h: 40, rotate: 0 }],
        photoAttributions: [{
          r2Path: photo,
          classification: 'restaurant',
          restaurantId: 'restaurant-one',
          source: 'user_selected',
        }],
      }),
    }),
    env: {
      DB: db,
      AUTH_SESSION_SECRET: secret,
    },
  } as any);
}

describe('course journal publication', () => {
  it('stores source lineage and returns the same course for a retried request', async () => {
    const db = publicationDatabase();
    const first = await publish(db, 'journal-attempt-one');
    const firstPayload = await first.json() as { id: string; idempotent?: boolean };
    const retried = await publish(db, 'journal-attempt-one');
    const retriedPayload = await retried.json() as { id: string; idempotent?: boolean };

    expect(first.status).toBe(201);
    expect(retried.status).toBe(200);
    expect(retriedPayload).toMatchObject({ id: firstPayload.id, idempotent: true });
    expect(db.insertedCourses).toHaveLength(1);
    expect(db.insertedCourses[0]?.[14]).toBe('source-course');
    expect(JSON.parse(String(db.insertedCourses[0]?.[15]))).toEqual([{
      placeId: 'restaurant-one',
      order: 1,
      name: 'Source Restaurant',
      category: 'Korean',
      address: '1 Lunchie Lane',
    }]);
  });

  it('rejects a source course the signed-in user cannot access', async () => {
    const response = await publish(publicationDatabase(false), 'journal-no-access');
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: '원본 코스를 사용할 권한이 없습니다.',
    });
  });

  it('requires an idempotency key for every publication', async () => {
    const response = await publish(publicationDatabase(), null);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: 'IDEMPOTENCY_KEY_REQUIRED',
    });
  });

  it('rejects reuse of an idempotency key for a different payload', async () => {
    const db = publicationDatabase();
    expect((await publish(db, 'reused-key', 'First journal')).status).toBe(201);
    const response = await publish(db, 'reused-key', 'Different journal');

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: 'IDEMPOTENCY_KEY_REUSED',
    });
    expect(db.insertedCourses).toHaveLength(1);
  });

  it('returns 409 when a different payload wins the same-key insert race', async () => {
    const db = publicationDatabase(true, 'different-concurrent-payload-hash');
    const response = await publish(db, 'racing-key');

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: 'IDEMPOTENCY_KEY_REUSED',
    });
  });
});
