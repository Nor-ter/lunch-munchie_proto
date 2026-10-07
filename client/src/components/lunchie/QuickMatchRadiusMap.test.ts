import { describe, expect, it } from 'vitest';
import type { Restaurant } from '@/contexts/AppContext';
import { quickMatchCategoryCounts, quickMatchRestaurantPins } from './QuickMatchRadiusMap';

function restaurant(id: string, name: string, lat: number, lng: number, category = 'Cafe'): Restaurant {
  return {
    id,
    name,
    category,
    tags: [],
    rating: 4.5,
    reviewCount: 120,
    distance: '',
    address: '',
    image: '/placeholder.png',
    lat,
    lng,
    priceRange: 2,
    openHours: '',
    dietary: [],
    description: '',
  };
}

describe('Quick Match radius map pins', () => {
  const center = { lat: -37.8136, lng: 144.9631 };
  const nearby = restaurant('nearby', 'Nearby Cafe', -37.8140, 144.9631);
  const farther = restaurant('farther', 'Farther Cafe', -37.8316, 144.9631);
  const outside = restaurant('outside', 'Outside Cafe', -37.8600, 144.9631);

  it('shows only restaurants inside the selected radius, nearest first', () => {
    const pins = quickMatchRestaurantPins([outside, farther, nearby], center, 3_000, true);

    expect(pins.map(pin => pin.restaurant.id)).toEqual(['nearby', 'farther']);
    expect(pins[0]!.distanceMetres).toBeLessThan(pins[1]!.distanceMetres);
  });

  it('keeps nearby pins visible when the radius limit is disabled', () => {
    const pins = quickMatchRestaurantPins([outside, nearby], center, 1_000, false);

    expect(pins.map(pin => pin.restaurant.id)).toEqual(['nearby', 'outside']);
  });

  it('does not discard restaurants when more than 24 are inside the radius', () => {
    const restaurants = Array.from({ length: 40 }, (_, index) => (
      restaurant(`restaurant-${index}`, `Restaurant ${index}`, center.lat + index * 0.00001, center.lng)
    ));

    const pins = quickMatchRestaurantPins(restaurants, center, 5_000, true);

    expect(pins).toHaveLength(40);
  });

  it('counts visible restaurants by category and lists the largest category first', () => {
    const pins = quickMatchRestaurantPins([
      restaurant('cafe-1', 'Cafe One', center.lat, center.lng, '카페'),
      restaurant('cafe-2', 'Cafe Two', center.lat + 0.0001, center.lng, 'Cafe'),
      restaurant('thai', 'Thai One', center.lat + 0.0002, center.lng, '타이'),
    ], center, 5_000, true);

    expect(quickMatchCategoryCounts(pins)).toEqual([
      { category: 'Cafe', count: 2 },
      { category: 'Thai', count: 1 },
    ]);
  });

  it('waits for a confirmed location before exposing restaurant pins', () => {
    expect(quickMatchRestaurantPins([nearby], null, 5_000, true)).toEqual([]);
  });
});
