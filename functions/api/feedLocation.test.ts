import { describe, expect, it } from 'vitest';
import { feedItemMatchesLocation, parseFeedLocationFilter } from './feedLocation';

describe('Munchie feed location filter', () => {
  it('keeps the filter disabled when no location query is present', () => {
    expect(parseFeedLocationFilter(() => undefined)).toBeNull();
  });

  it('accepts bounded coordinates and radius values', () => {
    const values: Record<string, string> = {
      latitude: '-37.8136', longitude: '144.9631', radiusKm: '5',
    };
    expect(parseFeedLocationFilter(key => values[key])).toEqual({
      latitude: -37.8136, longitude: 144.9631, radiusKm: 5,
    });
  });

  it('rejects incomplete, invalid, or excessive radius filters', () => {
    expect(() => parseFeedLocationFilter(key => ({ latitude: '-37.8' })[key])).toThrow();
    expect(() => parseFeedLocationFilter(key => ({ latitude: '91', longitude: '144', radiusKm: '5' })[key])).toThrow();
    expect(() => parseFeedLocationFilter(key => ({ latitude: '-37', longitude: '144', radiusKm: '51' })[key])).toThrow();
  });

  it('matches a feed when any course stop lies inside the selected radius', () => {
    const filter = { latitude: -37.8136, longitude: 144.9631, radiusKm: 2 };
    expect(feedItemMatchesLocation({ stops: [
      { latitude: -37.9, longitude: 145.1 },
      { restaurant: { latitude: -37.8128, longitude: 144.9614 } },
    ] }, filter)).toBe(true);
    expect(feedItemMatchesLocation({ stops: [
      { latitude: -37.9, longitude: 145.1 },
    ] }, filter)).toBe(false);
    expect(feedItemMatchesLocation({ stops: [] }, filter)).toBe(false);
  });
});
