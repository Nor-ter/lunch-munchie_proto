import { describe, expect, it } from 'vitest';
import { classifySwipeAvailability } from './swipeAvailability';

const readyBase = {
  loading: false,
  hasSession: true,
  isMember: true,
  status: 'voting' as const,
  catalogLoaded: true,
  catalogCount: 12,
  candidateCount: 7,
};

describe('Swipe availability', () => {
  it('never treats an absent session as a ready swipe deck', () => {
    expect(classifySwipeAvailability({ ...readyBase, hasSession: false })).toBe('session-missing');
  });

  it('separates a missing catalogue from preference-only zero matches', () => {
    expect(classifySwipeAvailability({ ...readyBase, catalogCount: 0, candidateCount: 0 })).toBe('catalog-empty');
    expect(classifySwipeAvailability({ ...readyBase, candidateCount: 0 })).toBe('no-matches');
  });

  it('rejects terminal, cancelled, and non-member restores', () => {
    expect(classifySwipeAvailability({ ...readyBase, status: 'cancelled' })).toBe('session-invalid');
    expect(classifySwipeAvailability({ ...readyBase, status: 'expired' })).toBe('session-invalid');
    expect(classifySwipeAvailability({ ...readyBase, isMember: false })).toBe('session-invalid');
  });

  it('keeps a waiting room out of the swipe experience', () => {
    expect(classifySwipeAvailability({ ...readyBase, status: 'waiting' })).toBe('session-not-started');
  });
});
