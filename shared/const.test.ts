import { describe, expect, it } from 'vitest';
import {
  isIngredientAvoidance,
  normalizeDiet,
  restaurantSatisfiesDietRestriction,
  type DietRestriction,
} from './const';

const restaurant = (
  category: string,
  menuItems: Array<{ name: string; description?: string; dietary?: string[] }>,
  dietaryOptions: string[] = [],
) => ({ category, menuItems, dietaryOptions });

describe('restaurant dietary evidence matching', () => {
  it('separates ingredient exclusions from diet-style requirements', () => {
    expect(isIngredientAvoidance('NO_DAIRY')).toBe(true);
    expect(isIngredientAvoidance('NO_EGGS')).toBe(true);
    expect(isIngredientAvoidance('VEGETARIAN')).toBe(false);
    expect(isIngredientAvoidance('GLUTEN_FREE')).toBe(false);
  });

  it('normalizes every newly enabled canonical restriction', () => {
    expect([
      'PESCATARIAN', 'NO_PORK', 'NO_BEEF', 'NO_LAMB', 'NO_SHELLFISH',
      'NO_NUTS', 'NO_DAIRY', 'NO_EGGS',
    ].map(normalizeDiet)).toEqual([
      'PESCATARIAN', 'NO_PORK', 'NO_BEEF', 'NO_LAMB', 'NO_SHELLFISH',
      'NO_NUTS', 'NO_DAIRY', 'NO_EGGS',
    ]);
  });

  it('accepts pescatarian, vegetarian, and vegan evidence without accepting land meat menus', () => {
    expect(restaurantSatisfiesDietRestriction(
      restaurant('Sushi', [{ name: 'Salmon sashimi' }]),
      'PESCATARIAN',
    )).toBe(true);
    expect(restaurantSatisfiesDietRestriction(
      restaurant('Grill', [{ name: 'Wagyu steak and prawns' }]),
      'PESCATARIAN',
    )).toBe(false);
    expect(restaurantSatisfiesDietRestriction(
      restaurant('Cafe', [], ['비건 옵션']),
      'PESCATARIAN',
    )).toBe(true);
  });

  it.each<[DietRestriction, string]>([
    ['NO_PORK', 'Bacon sandwich'],
    ['NO_BEEF', 'Wagyu steak'],
    ['NO_LAMB', 'Lamb shoulder'],
    ['NO_SEAFOOD', 'Salmon sashimi'],
    ['NO_SHELLFISH', 'Garlic prawns'],
    ['NO_NUTS', 'Cashew pesto'],
    ['NO_DAIRY', 'Parmesan cream pasta'],
    ['NO_EGGS', 'Egg aioli roll'],
  ])('rejects menu evidence for %s', (restriction, menuName) => {
    expect(restaurantSatisfiesDietRestriction(
      restaurant('Restaurant', [{ name: menuName }]),
      restriction,
    )).toBe(false);
    expect(restaurantSatisfiesDietRestriction(
      restaurant('Restaurant', [{ name: 'Tomato salad' }]),
      restriction,
    )).toBe(true);
  });

  it('honours an explicit safe tag before scanning descriptive text', () => {
    expect(restaurantSatisfiesDietRestriction(
      restaurant('Bakery', [{ name: 'Nut-free brownie' }], ['nut free']),
      'NO_NUTS',
    )).toBe(true);
  });
});
