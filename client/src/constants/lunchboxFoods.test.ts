import { describe, expect, it } from 'vitest';
import {
  consumeLunchboxFood,
  getLunchboxFoodItems,
  grantRandomLunchboxFood,
  LUNCHBOX_FOOD_CATALOG,
  markLunchboxFoodSeen,
  mergeLegacyRiceballCount,
  normalizeLunchboxInventory,
} from './lunchboxFoods';

describe('lunchbox inventory', () => {
  it('grants the selected random food and increments its owned and unseen counts', () => {
    const first = grantRandomLunchboxFood({}, () => 0);
    const last = grantRandomLunchboxFood(first.inventory, () => 0.999999);

    expect(first.food).toBe(LUNCHBOX_FOOD_CATALOG[0]);
    expect(first.quantity).toBe(1);
    expect(last.food).toBe(LUNCHBOX_FOOD_CATALOG.at(-1));
    expect(last.inventory[last.food.id]).toEqual({ quantity: 1, unseenQuantity: 1 });
  });

  it('normalizes invalid counts and renders every catalog item', () => {
    const inventory = normalizeLunchboxInventory({
      onigiri: { quantity: -3, unseenQuantity: 20 },
    });
    const items = getLunchboxFoodItems(inventory);

    expect(items).toHaveLength(LUNCHBOX_FOOD_CATALOG.length);
    expect(items.find(item => item.id === 'onigiri')).toMatchObject({ quantity: 0, unseenQuantity: 0 });
  });

  it('clears new badges without changing owned quantities', () => {
    const granted = grantRandomLunchboxFood({}, () => 0);
    expect(markLunchboxFoodSeen(granted.inventory).onigiri).toEqual({ quantity: 1, unseenQuantity: 0 });
  });

  it('consumes exactly one food and never drops below zero', () => {
    const first = consumeLunchboxFood({
      onigiri: { quantity: 2, unseenQuantity: 2 },
    }, 'onigiri');
    const second = consumeLunchboxFood(first.inventory, 'onigiri');
    const empty = consumeLunchboxFood(second.inventory, 'onigiri');

    expect(first).toMatchObject({ consumed: true, quantity: 1 });
    expect(first.inventory.onigiri).toEqual({ quantity: 1, unseenQuantity: 1 });
    expect(second).toMatchObject({ consumed: true, quantity: 0 });
    expect(empty).toMatchObject({ consumed: false, quantity: 0 });
  });

  it('migrates a larger legacy riceball count without reducing current inventory', () => {
    expect(mergeLegacyRiceballCount(undefined, '24').onigiri.quantity).toBe(24);
    expect(mergeLegacyRiceballCount({ onigiri: { quantity: 30, unseenQuantity: 1 } }, '24').onigiri)
      .toEqual({ quantity: 30, unseenQuantity: 1 });
  });
});
