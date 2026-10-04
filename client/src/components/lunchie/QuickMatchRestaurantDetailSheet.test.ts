import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./QuickMatchRestaurantDetailSheet.tsx', import.meta.url), 'utf8');

describe('QuickMatchRestaurantDetailSheet', () => {
  it('loads canonical D1 detail and presents it in an accessible rising sheet', () => {
    expect(source).toContain('getRestaurantById(restaurant.id)');
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain("initial={{ y: '100%' }}");
    expect(source).toContain('animate={{ y: 0 }}');
    expect(source).toContain('data-ui="quick-match-restaurant-detail-sheet"');
  });

  it('shows only available stored details without a direct Google client request', () => {
    expect(source).toContain('englishText(detail.address && (');
    expect(source).toContain('englishText(detail.openHours && (');
    expect(source).toContain('englishText(detail.phone && (');
    expect(source).not.toContain('places.googleapis.com');
  });
});
