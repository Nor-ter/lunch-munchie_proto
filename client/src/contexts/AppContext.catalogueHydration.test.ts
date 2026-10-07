import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./AppContext.tsx', import.meta.url), 'utf8');

describe('catalogue hydration', () => {
  it('hydrates restaurants without waiting for course and feed requests', () => {
    expect(source).toContain("const restaurantRequest = fetch('/api/restaurants')");
    expect(source).toContain('void restaurantRequest.then(resData => {');
    expect(source).toContain('Promise.allSettled([restaurantRequest, courseRequest, feedRequest])');
    expect(source).not.toContain('Promise.all([\n      fetch(\'/api/restaurants\')');
  });
});
