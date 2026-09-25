import { describe, expect, it } from 'vitest';
import { LUNCHIE_CUISINE_CHOICES, prioritizeRestaurantsForCuisine } from './lunchieGame';

describe('Lunchie game cuisine round', () => {
  const restaurants = [
    { id: 'italian', category: '이탈리안' },
    { id: 'korean', category: '한식' },
    { id: 'thai', category: 'Thai' },
    { id: 'cafe', category: '카페' },
  ];

  it('always offers four game choices', () => {
    expect(LUNCHIE_CUISINE_CHOICES).toHaveLength(4);
    expect(LUNCHIE_CUISINE_CHOICES.map(choice => choice.id)).toEqual([
      'korean',
      'asian',
      'western',
      'surprise',
    ]);
  });

  it('moves the selected cuisine to the front without removing shared candidates', () => {
    const ordered = prioritizeRestaurantsForCuisine(restaurants, ['asian']);
    expect(ordered.map(restaurant => restaurant.id)).toEqual(['thai', 'italian', 'korean', 'cafe']);
    expect(ordered).toHaveLength(restaurants.length);
  });

  it('moves matches for every selected cuisine to the front', () => {
    const ordered = prioritizeRestaurantsForCuisine(restaurants, ['asian', 'western']);
    expect(ordered.map(restaurant => restaurant.id)).toEqual(['italian', 'thai', 'cafe', 'korean']);
  });

  it('keeps the recommendation order for the random choice', () => {
    expect(prioritizeRestaurantsForCuisine(restaurants, ['surprise'])).toEqual(restaurants);
  });
});
