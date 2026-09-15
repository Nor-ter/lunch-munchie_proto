import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'SessionJoinPage.tsx'), 'utf8');

describe('SessionJoinPage invitation UX', () => {
  it('keeps the invitation profile picker visible while only dietary settings collapse', () => {
    expect(source).toContain('Choose your character');
    expect(source).toContain('EMOJIS.slice(0, 16).map');
    expect(source).toContain('Your nickname');
    expect(source).not.toContain('profileEditorOpen');
    expect(source).not.toContain('현재 참여 정보');
    expect(source).toContain('dietaryOpen');
    expect(source).toContain('Optional');
    expect(source).toContain('selectedDietaryOptions.length');
  });

  it('keeps one clear join CTA and preserves the allergy warning', () => {
    expect(source).toContain("'Join match'");
    expect(source).not.toContain('비회원으로 세션 참가하기');
    expect(source).toContain('For severe allergies, always check ingredients and cross-contamination with the restaurant.');
  });
});
