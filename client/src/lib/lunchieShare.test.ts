import { describe, expect, it } from 'vitest';
import {
  calculateTargetPixelRatio,
  chooseShareDelivery,
  formatLunchieDateLabel,
  getLunchieLocationLabel,
  getLunchieParticipantLabel,
  getLunchieVoteLabel,
  getRepresentativeMenuLabel,
  sanitizeLunchieFilenamePart,
} from './lunchieShare';

describe('sanitizeLunchieFilenamePart', () => {
  it('removes portable-filename hazards while preserving readable text', () => {
    expect(sanitizeLunchieFilenamePart('  김Meal/라면: Today?  ')).toBe('김Meal-라면-Today');
    expect(sanitizeLunchieFilenamePart('CON')).toBe('CON-pick');
    expect(sanitizeLunchieFilenamePart(' \\ / : * ? " < > | ')).toBe('lunchie-pick');
  });

  it('caps a long filename segment', () => {
    const result = sanitizeLunchieFilenamePart('아주 긴 식당 이름 '.repeat(30));
    expect(Array.from(result).length).toBeLessThanOrEqual(80);
    expect(result).not.toBe('');
  });
});

describe('share-card fallbacks', () => {
  it('handles empty participants without inventing names', () => {
    expect(getLunchieParticipantLabel([])).toBe("Names unavailable");
  });

  it('selects the first usable menu name and has an explicit fallback', () => {
    expect(getRepresentativeMenuLabel([{ name: ' ' }, { name: 'Truffle Pasta' }])).toBe('Truffle Pasta');
    expect(getRepresentativeMenuLabel([])).toBe("Menu unavailable");
  });

  it('formats location and date labels with non-fabricated fallbacks', () => {
    expect(getLunchieLocationLabel('  Fitzroy, Melbourne  ')).toBe('Fitzroy, Melbourne');
    expect(getLunchieLocationLabel('')).toBe('Location unavailable');
    expect(formatLunchieDateLabel(new Date(2026, 6, 14))).toBe('2026.07.14');
    expect(formatLunchieDateLabel('not-a-date')).toBe('Date unavailable');
  });
});

describe('getLunchieVoteLabel', () => {
  it('prefers final tally over preliminary likes', () => {
    expect(getLunchieVoteLabel({
      winnerId: 'r1',
      finalTally: { r1: 3 },
      finalVotedCount: 4,
      likeCount: 4,
      totalMembers: 4,
    })).toBe('3 / 4 final votes');
  });

  it('falls back to preliminary likes when final votes are absent', () => {
    expect(getLunchieVoteLabel({ likeCount: 2, totalMembers: 3 })).toBe('2 / 3 likes');
  });

  it('uses honest nonnumeric labels when match data is absent or malformed', () => {
    expect(getLunchieVoteLabel({ isSolo: true })).toBe('My lunch choice');
    expect(getLunchieVoteLabel({ isSolo: false })).toBe('Our lunch choice');
    expect(getLunchieVoteLabel({ likeCount: 5, totalMembers: 2 })).toBe('Our lunch choice');
  });
});

describe('share delivery and export sizing', () => {
  it('chooses native share only when file sharing is supported', () => {
    expect(chooseShareDelivery(true)).toBe('share');
    expect(chooseShareDelivery(false)).toBe('download');
  });

  it('calculates a deterministic target-width ratio with safe validation', () => {
    expect(calculateTargetPixelRatio(360)).toBe(3);
    expect(calculateTargetPixelRatio(360, 720)).toBe(2);
    expect(calculateTargetPixelRatio(0)).toBe(2);
    expect(calculateTargetPixelRatio(100, 2000)).toBe(8);
  });
});
