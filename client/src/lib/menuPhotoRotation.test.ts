import { describe, expect, it, vi } from 'vitest';
import { beginMenuPhotoRotation, completeMenuPhotoRotation } from './menuPhotoRotation';

describe('menu photo rotation gate', () => {
  it('accepts only the first tap until the active rotation completes', () => {
    const lock = { current: false };
    const advance = vi.fn();

    expect(beginMenuPhotoRotation(lock, 1, advance)).toBe(true);
    expect(beginMenuPhotoRotation(lock, 1, advance)).toBe(false);
    expect(beginMenuPhotoRotation(lock, -1, advance)).toBe(false);
    expect(advance).toHaveBeenCalledTimes(1);
    expect(advance).toHaveBeenCalledWith(1);
  });

  it('accepts the next tap after animation completion releases the lock', () => {
    const lock = { current: false };
    const advance = vi.fn();

    beginMenuPhotoRotation(lock, 1, advance);
    completeMenuPhotoRotation(lock);

    expect(beginMenuPhotoRotation(lock, -1, advance)).toBe(true);
    expect(advance).toHaveBeenNthCalledWith(2, -1);
  });
});
