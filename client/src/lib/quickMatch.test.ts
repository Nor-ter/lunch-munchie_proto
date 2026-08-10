import { describe, expect, it } from 'vitest';
import {
  DIETARY_REQUIREMENTS,
  INGREDIENT_AVOIDANCES,
  isActiveQuickMatchStatus,
  normalizeDietaryPreferences,
  normalizeQuickMatchSettings,
  normalizeQuickMatchStatus,
} from './quickMatch';

describe('Quick Match state normalization', () => {
  it('maps server phases to the active client contract', () => {
    expect(normalizeQuickMatchStatus('WAITING')).toBe('waiting');
    expect(normalizeQuickMatchStatus('SWIPING_1')).toBe('voting');
    expect(normalizeQuickMatchStatus('FINAL')).toBe('choosing');
    expect(isActiveQuickMatchStatus('SWIPING_1')).toBe(true);
    expect(isActiveQuickMatchStatus('CANCELLED')).toBe(false);
    expect(isActiveQuickMatchStatus('COMPLETED')).toBe(false);
  });

  it('enables every visible dietary control and normalizes its legacy aliases', () => {
    expect([...DIETARY_REQUIREMENTS, ...INGREDIENT_AVOIDANCES].every(option => option.supported)).toBe(true);
    expect(normalizeDietaryPreferences([
      '비건',
      'Gluten-Free',
      '해산물 제외',
      'Pescetarian',
      'No Beef',
      '견과류 제외',
      'Dairy Free',
      'Egg Free',
      'Carnivore',
      'Small Appetite',
      'Buffet',
      'Asian',
    ])).toEqual([
      'VEGAN',
      'GLUTEN_FREE',
      'NO_SEAFOOD',
      'PESCATARIAN',
      'NO_BEEF',
      'NO_NUTS',
      'NO_DAIRY',
      'NO_EGGS',
    ]);
  });

  it('restores the unified people count and clamps stale settings to product limits', () => {
    expect(normalizeQuickMatchSettings({ partySize: 1, togetherPartySize: 11, deadlineMinutes: 99 })).toMatchObject({
      partySize: 1,
      deadlineMinutes: 15,
    });
    expect(normalizeQuickMatchSettings({ partySize: 40, togetherPartySize: 40, deadlineMinutes: -2 })).toMatchObject({
      partySize: 12,
      deadlineMinutes: 1,
    });
  });
});
