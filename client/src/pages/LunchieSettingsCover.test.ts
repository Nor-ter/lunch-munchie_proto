import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'LunchieSettingsPage.tsx'), 'utf8');

describe('Quick Match cover', () => {
  it('uses the Lunchie palette and official chick artwork', () => {
    expect(source).toContain('data-ui="quick-match-cover"');
    expect(source).toContain('bg-[#AA1A0D]');
    expect(source).toContain('/assets/lunchmate/chicken/chicken-happy.png');
    expect(source).toContain('Lunchie Munchie chick ready for Quick Match');
  });

  it('keeps only distance visible as a pre-game setting', () => {
    expect(source).toContain('aria-label="Current Quick Match settings"');
    expect(source).toContain('Search distance');
    expect(source).toContain("distanceEnabled ? formatRadius(radius) : 'No limit'");
    expect(source).toContain('Cuisine, mood and the final pick happen together during the game.');
    expect(source).not.toContain('<PreferenceCard key=');
    expect(source).not.toContain('<CollapsibleOptionPanel');
    expect(source).not.toContain('<DeadlineDial minutes=');
  });
});
