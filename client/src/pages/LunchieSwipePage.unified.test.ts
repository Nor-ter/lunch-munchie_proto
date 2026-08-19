import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const swipeSource = readFileSync(join(import.meta.dirname, 'LunchieSwipePage.tsx'), 'utf8');
const shareCardSource = readFileSync(join(import.meta.dirname, '..', 'components', 'lunchie', 'WinnerShareCard.tsx'), 'utf8');
const themeSource = readFileSync(join(import.meta.dirname, '..', 'contexts', 'ThemeContext.tsx'), 'utf8');

describe('unified Lunchie group flow', () => {
  it('uses the solo diagonal battle component for group finals', () => {
    expect(swipeSource).toContain('finalist1={finalistRs[0]}');
    expect(swipeSource).toContain('finalist2={finalistRs[1] ?? null}');
    expect(swipeSource).not.toContain('결승! 어디로 갈까요?');
  });

  it('uses the personalized chicken on waiting, result, and share surfaces', () => {
    expect(swipeSource).toContain('loadout={lunchmateLoadout}');
    expect(swipeSource).not.toContain('/assets/lunchie-wordmark.png');
    expect(shareCardSource).toContain('<LunchmateCharacterRenderer');
    expect(shareCardSource).not.toContain('src="/assets/lunchie-wordmark.png"');
  });

  it('builds the reject effect from staged glass fracture layers', () => {
    expect(swipeSource).toContain('primaryCrackOp');
    expect(swipeSource).toContain('branchCrackOp');
    expect(swipeSource).toContain('microCrackOp');
    expect(swipeSource).toContain('/assets/effects/cracking-glass.png');
    expect(swipeSource).toContain("mixBlendMode: 'screen'");
  });

  it('advertises a light-only browser color scheme', () => {
    expect(themeSource).toContain('only light');
  });
});
