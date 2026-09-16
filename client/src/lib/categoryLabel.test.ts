import { describe, expect, it } from 'vitest';
import { categoryLabel } from './categoryLabel';

describe('category display labels', () => {
  it('translates known catalogue labels without changing the source data', () => {
    const restaurant = { name: '손이에요 식당', category: '이탈리안' };
    expect(categoryLabel(restaurant.category)).toBe('Italian');
    expect(restaurant).toEqual({ name: '손이에요 식당', category: '이탈리안' });
  });
  it('preserves unknown and existing English categories', () => {
    expect(categoryLabel('Italian')).toBe('Italian');
    expect(categoryLabel('사용자 분류')).toBe('사용자 분류');
    expect(categoryLabel(null)).toBe('');
  });
});
