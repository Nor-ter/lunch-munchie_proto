import {
  ChefHat,
  Crown,
  Sprout,
  Star,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

export interface LunchmateLevelIconDefinition {
  Icon: LucideIcon;
  label: string;
  color: string;
  background: string;
}

export const LUNCHMATE_LEVEL_ICON_CONFIG: Readonly<Record<number, LunchmateLevelIconDefinition>> = {
  1: {
    Icon: Sprout,
    label: "Seedling",
    color: '#4F8A5B',
    background: '#EAF6EA',
  },
  2: {
    Icon: UtensilsCrossed,
    label: "Food Explorer",
    color: '#D96A4C',
    background: '#FFF0E7',
  },
  3: {
    Icon: ChefHat,
    label: "Meal Collector",
    color: '#B16F42',
    background: '#FFF4D9',
  },
  4: {
    Icon: Crown,
    label: "Food Memory Master",
    color: '#B75147',
    background: '#FBECE9',
  },
};

export const LUNCHMATE_LEVEL_ICON_FALLBACK: LunchmateLevelIconDefinition = {
  Icon: Star,
  label: "Lunchmate Growth",
  color: '#D87756',
  background: '#FFF0E8',
};

export function getLunchmateLevelIcon(level: number): LunchmateLevelIconDefinition {
  return LUNCHMATE_LEVEL_ICON_CONFIG[level] ?? LUNCHMATE_LEVEL_ICON_FALLBACK;
}
