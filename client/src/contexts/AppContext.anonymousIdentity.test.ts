import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./AppContext.tsx', import.meta.url), 'utf8');

describe('anonymous profile identity', () => {
  it('uses a neutral name and never impersonates a demo account', () => {
    const profileBlock = source.slice(
      source.indexOf('const DEFAULT_PROFILE'),
      source.indexOf('// ─── Context'),
    );
    expect(profileBlock).toContain("name: '사용자'");
    expect(profileBlock).not.toContain("name: '지민'");
  });
});
