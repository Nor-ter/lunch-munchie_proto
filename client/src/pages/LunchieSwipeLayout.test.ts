import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./LunchieSwipePage.tsx', import.meta.url), 'utf8');

describe('recommendation vote viewport layout', () => {
  it('uses a compact header without the full stage rail on the card screen', () => {
    expect(source).not.toContain('<GameStageRail current={2} />');
    expect(source).toContain('Compact vote header');
    expect(source).toContain('Recommendation Vote</p>');
    expect(source).toContain('{progress} / {total}');
  });

  it('pins compact vote actions directly above the persistent tab bar', () => {
    expect(source).toContain("import { createPortal } from 'react-dom'");
    expect(source).toContain('aria-label="Recommendation vote actions"');
    expect(source).toContain('bottom-[var(--lm-tab-bar-height)]');
    expect(source).toContain('h-[72px]');
    expect(source).toContain("width: 'min(100%, calc(75dvh - 190px))'");
  });
});
