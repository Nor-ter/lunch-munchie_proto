import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

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
});
