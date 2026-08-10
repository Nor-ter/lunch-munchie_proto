import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { escapeUserSearchTerm, normalizePublicHandle } from './[[path]]';

const migration = readFileSync(join(import.meta.dirname, '..', '..', 'migrations', '0008_user_handles.sql'), 'utf8');
const apiSource = readFileSync(join(import.meta.dirname, '[[path]].ts'), 'utf8');

describe('D1 public handles and user search', () => {
  it('normalizes valid public handles without accepting spaces or punctuation', () => {
    expect(normalizePublicHandle('@Lunchie_88')).toBe('lunchie_88');
    expect(normalizePublicHandle('ab')).toBeNull();
    expect(normalizePublicHandle('lunchie-id')).toBeNull();
    expect(normalizePublicHandle('a'.repeat(21))).toBeNull();
  });

  it('escapes SQLite LIKE wildcard input', () => {
    expect(escapeUserSearchTerm('a%_b\\c')).toBe('a\\%\\_b\\\\c');
  });

  it('adds a unique case-insensitive handle and keeps search login-only', () => {
    expect(migration).toContain('ALTER TABLE users ADD COLUMN handle TEXT');
    expect(migration).toContain('CREATE UNIQUE INDEX');
    expect(migration).toContain('COLLATE NOCASE');
    expect(apiSource).toContain('app.get("/api/users/search"');
    expect(apiSource).toContain('const session = await requireGoogleSession(c)');
    expect(apiSource).toContain('LIMIT 20');
    expect(apiSource).toContain('await c.env.DB.batch(statements)');
  });
});
