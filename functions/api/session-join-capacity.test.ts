import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { onRequest } from './[[path]]';

const source = readFileSync(new URL('./[[path]].ts', import.meta.url), 'utf8');

describe('session invite capacity contract', () => {
  it('enforces the member count in the insert statement rather than count-then-insert', () => {
    expect(source).toContain(
      'SELECT ?, ?, ?, ?, ?, 0, ?, ?, ? WHERE (SELECT COUNT(*) FROM session_members WHERE session_id = ?) < ?',
    );
    expect(source).toContain('preferences_json, member_secret_hash, joined_at');
    expect(source).toContain('if ((inserted.meta?.changes ?? 0) === 0)');
  });

  it('allows an existing member to refresh their session profile at full capacity', () => {
    expect(source).toContain(
      'UPDATE session_members SET user_name = ?, emoji = ?, preferences_json = ? WHERE session_id = ? AND user_id = ?',
    );
  });

  it('creates a session with a hard maximum of thirty participants', async () => {
    const batched: Array<{ query: string; args: unknown[] }> = [];
    const db = {
      prepare(query: string) {
        return {
          bind(...args: unknown[]) {
            return { query, args };
          },
        };
      },
      async batch(statements: Array<{ query: string; args: unknown[] }>) {
        batched.push(...statements);
        return statements.map(() => ({ meta: { changes: 1 } }));
      },
    };

    const response = await onRequest({
      request: new Request('https://example.test/api/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId: 'host', hostName: 'Host', groupSize: 99, distanceEnabled: false }),
      }),
      env: { DB: db, AUTH_SESSION_SECRET: 'test' },
    } as any);
    const payload = await response.json() as { session: { group_size: number } };
    const sessionInsert = batched.find(statement => statement.query.includes('INSERT INTO sessions'));

    expect(response.status).toBe(201);
    expect(payload.session.group_size).toBe(30);
    expect(sessionInsert?.args[3]).toBe(30);
  });
});
