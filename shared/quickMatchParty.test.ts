import { describe, expect, it } from 'vitest';
import {
  QUICK_MATCH_PARTY_SIZE_MAX,
  normalizeQuickMatchPartySize,
} from './quickMatchParty';

describe('Quick Match party-size contract', () => {
  it('supports one to thirty people and clamps stale or hostile values', () => {
    expect(QUICK_MATCH_PARTY_SIZE_MAX).toBe(30);
    expect(normalizeQuickMatchPartySize(1)).toBe(1);
    expect(normalizeQuickMatchPartySize(30)).toBe(30);
    expect(normalizeQuickMatchPartySize(31)).toBe(30);
    expect(normalizeQuickMatchPartySize(-4)).toBe(1);
    expect(normalizeQuickMatchPartySize(null)).toBe(4);
    expect(normalizeQuickMatchPartySize('not-a-number')).toBe(4);
  });
});
