import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./LunchieSwipePage.tsx', import.meta.url), 'utf8');

function sliceBetween(startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('Lunchie swipe card menu flip', () => {
  it('keeps overflow clipping on faces so 3D backface hiding stays intact mid-flip', () => {
    const flipper = sliceBetween(
      'data-ui="quick-match-card-flipper"',
      'data-ui="quick-match-card-face-back"',
    );
    const front = sliceBetween(
      'data-ui="quick-match-card-face-front"',
      'data-ui="quick-match-card-face-back"',
    );
    const backStart = source.indexOf('data-ui="quick-match-card-face-back"');
    const back = source.slice(backStart, backStart + 700);

    // Outer swipe shell must not clip — that flattens preserve-3d on WebKit/Blink.
    expect(source).toContain("data-ui=\"quick-match-card-flipper\"");
    expect(source).toMatch(
      /className="absolute inset-0"\s*\n\s*style=\{\{\s*\n\s*x,\s*\n\s*rotate,/,
    );

    expect(front).toContain('rounded-3xl overflow-hidden');
    expect(front).toContain("backfaceVisibility: 'hidden'");
    expect(front).toContain("WebkitBackfaceVisibility: 'hidden'");
    expect(front).toContain("transformStyle: 'flat'");
    expect(front).toContain("transform: 'rotateY(0deg) translateZ(1px)'");

    expect(back).toContain('rounded-3xl overflow-hidden');
    expect(back).toContain("transform: 'rotateY(180deg) translateZ(1px)'");
    expect(back).toContain("backfaceVisibility: 'hidden'");

    expect(flipper).toContain("transformStyle: 'preserve-3d'");
    expect(flipper).toContain('animate={{ rotateY: isRevealed ? 180 : 0 }}');
  });
});
