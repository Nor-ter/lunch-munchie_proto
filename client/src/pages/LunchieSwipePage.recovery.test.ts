import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'LunchieSwipePage.tsx'), 'utf8');

describe('Lunchie Quick Match recovery UI', () => {
  it('does not leave a blank page when the active session is missing', () => {
    expect(source).not.toContain('if (!currentSession) return null');
    expect(source).toContain("Start a new Quick Match");
    expect(source).toContain("navigate('/lunchie/settings')");
  });

  it('renders progress feedback while finalists are being prepared', () => {
    expect(source).not.toContain('return null; // 효과가 듀얼/우승 구성 중');
    expect(source).toContain("Getting Round 2 ready");
    expect(source).toContain('role="status"');
  });
});
