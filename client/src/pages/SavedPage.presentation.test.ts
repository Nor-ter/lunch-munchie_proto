import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const savedSource = readFileSync(join(import.meta.dirname, 'SavedPage.tsx'), 'utf8');
describe('SavedPage Food Journey presentation', () => {
  it('uses Food Journey as the only saved surface', () => {
    expect(savedSource).toContain('Food Journey');
    expect(savedSource).toContain('Your Lunchie decisions and after-meal memories.');
    expect(savedSource).not.toContain('Saved Courses');
    expect(savedSource).not.toContain('coursemaps');
    expect(savedSource).not.toContain('role="tablist"');
    expect(savedSource).not.toContain('SavedMunchieMap');
    expect(savedSource).not.toContain('UnifiedMunchieCard');
  });

  it('lets people add or update an after-meal rating from each decision', () => {
    expect(savedSource).toContain("fetch('/api/journey-rating'");
    expect(savedSource).toContain('Tap a star to update it');
    expect(savedSource).toContain('rateJourneyStop(stop, star)');
  });
});
