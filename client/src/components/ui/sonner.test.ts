import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./sonner.tsx', import.meta.url), 'utf8');

describe('global toast placement', () => {
  it('keeps transient messages away from bottom actions and mobile safe areas', () => {
    expect(source).toContain('position="top-center"');
    expect(source).toContain('visibleToasts={1}');
    expect(source).toContain('duration={2200}');
    expect(source).toContain('env(safe-area-inset-top)');
    expect(source).toContain('swipeDirections={["top"]}');
  });
});
