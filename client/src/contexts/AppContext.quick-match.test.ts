import { describe, expect, it } from 'vitest';
import { buildDeck, type Restaurant } from './AppContext';

function venue(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 'venue-1',
    name: 'Lunch Kitchen',
    category: '한식',
    tags: [],
    rating: 4.5,
    reviewCount: 10,
    distance: '300m',
    address: 'Sydney',
    image: '',
    lat: -33.86,
    lng: 151.21,
    priceRange: 2,
    openHours: '11:00 - 21:00',
    dietary: [],
    description: '',
    menuItems: [{ name: 'Tomato rice', price: 12 }],
    ...overrides,
  };
}

const filters = {
  partySize: 1,
  dietary: [] as string[],
  budget: 2 as const,
  radius: 2000,
  categories: [] as string[],
};

const offlineRecommendation = {
  resolveRequestAuth: async () => ({ status: 'cookie-session' as const }),
  request: async () => ({ ok: false } as Response),
};

describe('Quick Match dietary candidate fallback', () => {
  it('keeps ingredient exclusions hard while offering best-effort diet-style matches', async () => {
    const result = await buildDeck(
      { ...filters, dietary: ['VEGETARIAN', 'GLUTEN_FREE', 'NO_DAIRY', 'NO_EGGS'] },
      [venue()],
      'solo-user',
      offlineRecommendation,
    );

    expect(result.restaurants.map(restaurant => restaurant.id)).toEqual(['venue-1']);
    expect(result.dietaryBestEffort).toBe(true);
  });

  it('does not relax an ingredient exclusion when it alone removes every venue', async () => {
    const result = await buildDeck(
      { ...filters, dietary: ['NO_DAIRY'] },
      [venue({ menuItems: [{ name: 'Cream pasta', price: 18 }] })],
      'solo-user',
      offlineRecommendation,
    );

    expect(result.restaurants).toEqual([]);
    expect(result.dietaryBestEffort).toBe(false);
  });
});
