import { describe, expect, it } from 'vitest';
import type { Restaurant } from '@/contexts/AppContext';
import { mergeCanonicalRestaurantPresentation, restaurantSummary } from './restaurantPresentation';

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
  it('uses the stored description and falls back to honest DB fields when absent', () => {
    expect(restaurantSummary({ ...baseRestaurant, description: 'A neighbourhood favourite.' }))
      .toBe('A neighbourhood favourite.');
    expect(restaurantSummary({ ...baseRestaurant, category: 'Vietnamese', address: 'Fitzroy' }))
      .toBe('Vietnamese · Fitzroy');
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
