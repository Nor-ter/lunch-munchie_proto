import { describe, expect, it } from 'vitest';
import { formatRestaurantReviewCount, normalizeRestaurantPayload } from './restaurantContract';

const baseRestaurant = {
  id: 'restaurant-1',
  name: 'Contract Cafe',
  category: '카페',
  address: 'Melbourne',
};

describe('restaurant API and screen model contract', () => {
  it('maps normal snake_case numeric data to the canonical screen fields', () => {
    const restaurant = normalizeRestaurantPayload({
      ...baseRestaurant,
      rating: 4.6,
      review_count: 1234,
      price_level: 3,
      latitude: -37.81,
      longitude: 144.96,
    });

    expect(restaurant).toMatchObject({
      rating: 4.6,
      reviewCount: 1234,
      priceRange: 3,
      lat: -37.81,
      lng: 144.96,
    });
    expect(formatRestaurantReviewCount(restaurant.reviewCount)).toBe('1,234');
  });

  it.each([
    ['missing', {}],
    ['undefined', { review_count: undefined }],
    ['null', { review_count: null }],
  ])('defaults %s review data to a safe numeric zero', (_label, reviewData) => {
    const restaurant = normalizeRestaurantPayload({ ...baseRestaurant, ...reviewData });
    expect(restaurant.reviewCount).toBe(0);
    expect(formatRestaurantReviewCount(restaurant.reviewCount)).toBe('0');
  });

  it('preserves an explicit zero instead of treating it as missing', () => {
    const restaurant = normalizeRestaurantPayload({ ...baseRestaurant, reviewCount: 0 });
    expect(restaurant.reviewCount).toBe(0);
    expect(formatRestaurantReviewCount(0)).toBe('0');
  });

  it('keeps the formatter safe for a malformed legacy screen model', () => {
    expect(formatRestaurantReviewCount(undefined)).toBe('0');
    expect(formatRestaurantReviewCount(null)).toBe('0');
  });
});
