import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'HomePage.tsx'), 'utf8');

describe('HomePage presentation', () => {
  it('uses the profile lunchmate loadout and a blink-only sprite swap', () => {
    expect(source).toContain('lunchmateLoadoutFromProfile(profile.lunchmateLoadout)');
    expect(source).toContain('<HomeLunchmate loadout={homeLunchmateLoadout} />');
    expect(source).toContain("chickenAssetKeyOverride={blinking ? 'sleepy' : 'idle'}");
    expect(source).not.toContain('side-walk-left');
    expect(source).not.toContain('side-walk-right');
  });

  it('moves the Quick Match button upward by exactly ten pixels', () => {
    expect(source).toContain('mt-[-6px]');
    expect(source).not.toContain('className="relative z-10 mt-1 flex h-12');
  });
});
