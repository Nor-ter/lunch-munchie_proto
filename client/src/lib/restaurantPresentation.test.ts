import { describe, expect, it } from 'vitest';
import type { Restaurant } from '@/contexts/AppContext';
import { mergeCanonicalRestaurantPresentation, restaurantSummary, restaurantRatingLabel, restaurantPriceLabel } from './restaurantPresentation';

const baseRestaurant: Restaurant = {
  id: 'r1',
  name: 'Session name',
  category: 'Restaurant',
  tags: [],
  rating: 0,
  reviewCount: 0,
  distance: '250m',
  address: '',
  image: 'legacy.jpg',
  photos: ['legacy.jpg'],
  menuItems: [],
  lat: 0,
  lng: 0,
  priceRange: 1,
  openHours: '',
  dietary: [],
  description: '',
};

describe('restaurant presentation data', () => {
  it('labels missing ratings honestly', () => {
    expect(restaurantRatingLabel(0)).toBe('Not Rated');
    expect(restaurantRatingLabel(NaN)).toBe('Not Rated');
    expect(restaurantRatingLabel(4.7)).toBe('4.7');
  });

  it('shows Australian dollar prices only when actual menu prices are available', () => {
    expect(restaurantPriceLabel(baseRestaurant)).toBeNull();
    expect(restaurantPriceLabel({ ...baseRestaurant, menuItems: [
      { name: 'Coffee', price: 5 }, { name: 'Lunch', price: 24.5 },
      { name: 'Unknown', price: null }, { name: 'Invalid', price: -1 },
    ] })).toBe('$5.00-$24.50');
    expect(restaurantPriceLabel({ ...baseRestaurant, menuItems: [{ name: 'Coffee', price: 5 }] })).toBe('$5.00');
  });
  it('uses the stored description and falls back to honest DB fields when absent', () => {
    expect(restaurantSummary({ ...baseRestaurant, description: 'A neighbourhood favourite.' }))
      .toBe('A neighbourhood favourite.');
    expect(restaurantSummary({ ...baseRestaurant, category: 'Vietnamese', address: 'Fitzroy' }))
      .toBe('Vietnamese · Fitzroy');
    expect(restaurantSummary({ ...baseRestaurant, category: '중식', address: 'Tim Ho Wan, Bourke Street' }))
      .toBe('Chinese · Tim Ho Wan, Bourke Street');
  });

  it('hydrates restored session cards with canonical D1 detail without changing distance', () => {
    const result = mergeCanonicalRestaurantPresentation(baseRestaurant, {
      ...baseRestaurant,
      name: 'Canonical name',
      rating: 4.7,
      reviewCount: 120,
      address: '369 Brunswick Street',
      photos: ['canonical.jpg'],
      image: 'canonical.jpg',
      openHours: 'Monday: 11:00–21:00',
      phone: '+61 3 9000 0000',
      description: 'Stored Google editorial summary.',
    });

    expect(result).toMatchObject({
      name: 'Canonical name',
      rating: 4.7,
      reviewCount: 120,
      distance: '250m',
      address: '369 Brunswick Street',
      image: 'canonical.jpg',
      openHours: 'Monday: 11:00–21:00',
      phone: '+61 3 9000 0000',
      description: 'Stored Google editorial summary.',
    });
  });
});
