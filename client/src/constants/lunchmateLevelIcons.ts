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
    label: '새싹',
    color: '#4F8A5B',
    background: '#EAF6EA',
  },
  2: {
    Icon: UtensilsCrossed,
    label: '맛 탐험',
    color: '#D96A4C',
    background: '#FFF0E7',
  },
  3: {
    Icon: ChefHat,
    label: '한상 수집',
    color: '#B16F42',
    background: '#FFF4D9',
  },
  4: {
    Icon: Crown,
    label: '맛추억 마스터',
    color: '#A45A8A',
    background: '#F8EAF4',
  },
};

export const LUNCHMATE_LEVEL_ICON_FALLBACK: LunchmateLevelIconDefinition = {
  Icon: Star,
  label: '런치메이트 성장',
  color: '#D87756',
  background: '#FFF0E8',
};

export function getLunchmateLevelIcon(level: number): LunchmateLevelIconDefinition {
  return LUNCHMATE_LEVEL_ICON_CONFIG[level] ?? LUNCHMATE_LEVEL_ICON_FALLBACK;
}
