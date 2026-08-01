import type { LunchboxFoodItem } from '@/components/munchie/LunchboxBottomSheet';

export interface LunchboxInventoryEntry {
  quantity: number;
  unseenQuantity: number;
}

export type LunchboxInventory = Record<string, LunchboxInventoryEntry>;

export type LunchboxFoodDefinition = Omit<LunchboxFoodItem, 'quantity' | 'unseenQuantity'>;

export const LUNCHBOX_FOOD_CATALOG: readonly LunchboxFoodDefinition[] = [
  { id: 'onigiri', name: '참치마요 주먹밥', placeholder: '🍙', sourceLabel: '먼치 피드 기록 보상', xpPreview: 5 },
  { id: 'strawberry-cake', name: '딸기 한입 케이크', placeholder: '🍰', sourceLabel: '먼치 피드 기록 보상', xpPreview: 8 },
  { id: 'ramen', name: '따끈한 라멘', placeholder: '🍜', sourceLabel: '먼치 피드 기록 보상', xpPreview: 6 },
  { id: 'sushi', name: '알록달록 초밥', placeholder: '🍣', sourceLabel: '먼치 피드 기록 보상', xpPreview: 7 },
  { id: 'pizza', name: '치즈 듬뿍 피자', placeholder: '🍕', sourceLabel: '먼치 피드 기록 보상', xpPreview: 7 },
  { id: 'taco', name: '바삭한 타코', placeholder: '🌮', sourceLabel: '먼치 피드 기록 보상', xpPreview: 6 },
  { id: 'burger', name: '미니 치즈버거', placeholder: '🍔', sourceLabel: '먼치 피드 기록 보상', xpPreview: 7 },
  { id: 'salad', name: '싱그러운 샐러드', placeholder: '🥗', sourceLabel: '먼치 피드 기록 보상', xpPreview: 5 },
] as const;

const STARTER_INVENTORY: LunchboxInventory = {
  onigiri: { quantity: 2, unseenQuantity: 0 },
  'strawberry-cake': { quantity: 1, unseenQuantity: 0 },
};

function safeCount(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

export function normalizeLunchboxInventory(value: unknown): LunchboxInventory {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...STARTER_INVENTORY };
  }

  const source = value as Record<string, unknown>;
  return Object.fromEntries(LUNCHBOX_FOOD_CATALOG.map(food => {
    const rawEntry = source[food.id];
    const entry = rawEntry && typeof rawEntry === 'object' && !Array.isArray(rawEntry)
      ? rawEntry as Partial<LunchboxInventoryEntry>
      : {};
    const quantity = safeCount(entry.quantity);
    return [food.id, {
      quantity,
      unseenQuantity: Math.min(quantity, safeCount(entry.unseenQuantity)),
    }];
  }));
}

export function getLunchboxFoodItems(inventory: LunchboxInventory): LunchboxFoodItem[] {
  return LUNCHBOX_FOOD_CATALOG.map(food => ({
    ...food,
    quantity: inventory[food.id]?.quantity ?? 0,
    unseenQuantity: inventory[food.id]?.unseenQuantity ?? 0,
  }));
}

export function grantRandomLunchboxFood(
  inventoryValue: unknown,
  random: () => number = Math.random,
) {
  const inventory = normalizeLunchboxInventory(inventoryValue);
  const randomValue = Math.min(0.999999999, Math.max(0, random()));
  const food = LUNCHBOX_FOOD_CATALOG[Math.floor(randomValue * LUNCHBOX_FOOD_CATALOG.length)]!;
  const current = inventory[food.id] ?? { quantity: 0, unseenQuantity: 0 };
  const nextInventory = {
    ...inventory,
    [food.id]: {
      quantity: current.quantity + 1,
      unseenQuantity: current.unseenQuantity + 1,
    },
  };

  return { food, inventory: nextInventory, quantity: nextInventory[food.id]!.quantity };
}

export function markLunchboxFoodSeen(inventoryValue: unknown): LunchboxInventory {
  const inventory = normalizeLunchboxInventory(inventoryValue);
  return Object.fromEntries(Object.entries(inventory).map(([id, entry]) => [
    id,
    { ...entry, unseenQuantity: 0 },
  ]));
}

export function consumeLunchboxFood(
  inventoryValue: unknown,
  foodId: string,
) {
  const inventory = normalizeLunchboxInventory(inventoryValue);
  const current = inventory[foodId];
  if (!current || current.quantity <= 0) {
    return { inventory, consumed: false, quantity: 0 };
  }

  const nextQuantity = current.quantity - 1;
  return {
    inventory: {
      ...inventory,
      [foodId]: {
        quantity: nextQuantity,
        unseenQuantity: Math.min(nextQuantity, current.unseenQuantity),
      },
    },
    consumed: true,
    quantity: nextQuantity,
  };
}

/** 과거 완료 화면이 별도 키에 저장하던 주먹밥 보유 수량을 새 인벤토리로 흡수한다. */
export function mergeLegacyRiceballCount(
  inventoryValue: unknown,
  legacyValue: string | null,
): LunchboxInventory {
  const inventory = normalizeLunchboxInventory(inventoryValue);
  const legacyQuantity = safeCount(Number(legacyValue));
  const current = inventory.onigiri ?? { quantity: 0, unseenQuantity: 0 };
  if (legacyQuantity <= current.quantity) return inventory;

  return {
    ...inventory,
    onigiri: { ...current, quantity: legacyQuantity },
  };
}
