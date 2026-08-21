import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./FeedRadiusMap.tsx', import.meta.url), 'utf8');

describe('FeedRadiusMap camera', () => {
  it('pans the map when a searched location changes the filter center', () => {
    expect(source).toContain('const map = useMap()');
    expect(source).toContain('map.panTo(center)');
    expect(source).toContain('<RecenterMap center={center} />');
  });
});
