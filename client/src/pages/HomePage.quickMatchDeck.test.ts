import { describe, expect, it } from 'vitest';
import { getQuickMatchIndexAfterSwipe } from './HomePage';

describe('Quick Match deck swipe direction', () => {
  it.each([
    { activeIndex: 0, nextIndex: 1 },
    { activeIndex: 1, nextIndex: 2 },
    { activeIndex: 2, nextIndex: 0 },
  ])('moves a left-swiped card into the left slot from index $activeIndex', ({ activeIndex, nextIndex }) => {
    expect(getQuickMatchIndexAfterSwipe(activeIndex, -46)).toBe(nextIndex);
  });

  it.each([
    { activeIndex: 0, nextIndex: 2 },
    { activeIndex: 1, nextIndex: 0 },
    { activeIndex: 2, nextIndex: 1 },
  ])('moves a right-swiped card into the right slot from index $activeIndex', ({ activeIndex, nextIndex }) => {
    expect(getQuickMatchIndexAfterSwipe(activeIndex, 46)).toBe(nextIndex);
  });

  it.each([-45, 0, 45])('keeps the selected card when the drag offset is %s pixels', offsetX => {
    expect(getQuickMatchIndexAfterSwipe(1, offsetX)).toBe(1);
  });
});
