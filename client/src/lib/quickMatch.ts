import type { Intent } from '@shared/intent';
import { normalizeQuickMatchPartySize } from '@shared/quickMatchParty';

export type QuickMatchSessionStatus =
  | 'waiting'
  | 'voting'
  | 'choosing'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'left';

export const ACTIVE_QUICK_MATCH_STATUSES = new Set<QuickMatchSessionStatus>([
  'waiting',
  'voting',
  'choosing',
]);

export function normalizeQuickMatchStatus(value: unknown): QuickMatchSessionStatus {
  const status = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (status === 'WAITING') return 'waiting';
  if (status === 'SWIPING_1' || status === 'VOTING') return 'voting';
  if (status === 'FINAL' || status === 'CHOOSING') return 'choosing';
  if (status === 'CANCELLED' || status === 'CANCELED') return 'cancelled';
  if (status === 'EXPIRED') return 'expired';
  if (status === 'LEFT') return 'left';
  return 'completed';
}

export function isActiveQuickMatchStatus(value: unknown): boolean {
  return ACTIVE_QUICK_MATCH_STATUSES.has(normalizeQuickMatchStatus(value));
}

export type DietaryChoice = {
  label: string;
  value: string;
  icon: string;
  supported: boolean;
  unavailableReason?: string;
};

export const DIETARY_REQUIREMENTS: DietaryChoice[] = [
  { label: '채식', value: 'VEGETARIAN', icon: '🥬', supported: true },
  { label: '비건', value: 'VEGAN', icon: '🌱', supported: true },
  {
    label: '페스코 채식',
    value: 'PESCATARIAN',
    icon: '🐟',
    supported: true,
  },
  { label: '할랄', value: 'HALAL', icon: '🌙', supported: true },
  { label: '글루텐 프리', value: 'GLUTEN_FREE', icon: '🌾', supported: true },
];

export const INGREDIENT_AVOIDANCES: DietaryChoice[] = [
  { label: '돼지고기', value: 'NO_PORK', icon: '🐖', supported: true },
  { label: '소고기', value: 'NO_BEEF', icon: '🐄', supported: true },
  { label: '양고기', value: 'NO_LAMB', icon: '🐑', supported: true },
  { label: '해산물', value: 'NO_SEAFOOD', icon: '🐟', supported: true },
  { label: '갑각류·조개류', value: 'NO_SHELLFISH', icon: '🦐', supported: true },
  { label: '견과류', value: 'NO_NUTS', icon: '🥜', supported: true },
  { label: '유제품', value: 'NO_DAIRY', icon: '🥛', supported: true },
  { label: '달걀', value: 'NO_EGGS', icon: '🥚', supported: true },
];

const SUPPORTED_DIETARY_VALUES = new Set(
  [...DIETARY_REQUIREMENTS, ...INGREDIENT_AVOIDANCES]
    .filter(option => option.supported)
    .map(option => option.value),
);

const LEGACY_DIETARY_ALIASES: Record<string, string> = {
  vegan: 'VEGAN',
  '비건': 'VEGAN',
  '비건 옵션': 'VEGAN',
  vegetarian: 'VEGETARIAN',
  '채식': 'VEGETARIAN',
  '베지테리언': 'VEGETARIAN',
  pescatarian: 'PESCATARIAN',
  pescetarian: 'PESCATARIAN',
  '페스코': 'PESCATARIAN',
  '페스코테리언': 'PESCATARIAN',
  halal: 'HALAL',
  '할랄': 'HALAL',
  'gluten-free': 'GLUTEN_FREE',
  'gluten free': 'GLUTEN_FREE',
  gluten_free: 'GLUTEN_FREE',
  '글루텐프리': 'GLUTEN_FREE',
  '글루텐 프리': 'GLUTEN_FREE',
  'no seafood': 'NO_SEAFOOD',
  no_seafood: 'NO_SEAFOOD',
  '해산물 제외': 'NO_SEAFOOD',
  'no pork': 'NO_PORK',
  'pork free': 'NO_PORK',
  no_pork: 'NO_PORK',
  '돼지고기 제외': 'NO_PORK',
  'no beef': 'NO_BEEF',
  'beef free': 'NO_BEEF',
  no_beef: 'NO_BEEF',
  '소고기 제외': 'NO_BEEF',
  'no lamb': 'NO_LAMB',
  'lamb free': 'NO_LAMB',
  no_lamb: 'NO_LAMB',
  '양고기 제외': 'NO_LAMB',
  'no shellfish': 'NO_SHELLFISH',
  'shellfish free': 'NO_SHELLFISH',
  no_shellfish: 'NO_SHELLFISH',
  '갑각류 제외': 'NO_SHELLFISH',
  '조개류 제외': 'NO_SHELLFISH',
  'no nuts': 'NO_NUTS',
  'nut free': 'NO_NUTS',
  no_nuts: 'NO_NUTS',
  '견과류 제외': 'NO_NUTS',
  'no dairy': 'NO_DAIRY',
  'dairy free': 'NO_DAIRY',
  no_dairy: 'NO_DAIRY',
  '유제품 제외': 'NO_DAIRY',
  'no eggs': 'NO_EGGS',
  'egg free': 'NO_EGGS',
  no_eggs: 'NO_EGGS',
  '계란 제외': 'NO_EGGS',
  '달걀 제외': 'NO_EGGS',
};

export function normalizeDietaryPreferences(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .filter((item): item is string => typeof item === 'string')
    .map(item => LEGACY_DIETARY_ALIASES[item.trim().toLowerCase()] ?? item.trim().toUpperCase())
    .filter(item => SUPPORTED_DIETARY_VALUES.has(item));
  return Array.from(new Set(normalized));
}

export type QuickMatchSettingsSnapshot = {
  deadlineMinutes: number;
  partySize: number;
  radius: number;
  distanceEnabled: boolean;
  intent: Intent | null;
  tags: string[];
  dietary: string[];
};

export const DEFAULT_QUICK_MATCH_SETTINGS: QuickMatchSettingsSnapshot = {
  deadlineMinutes: 10,
  partySize: 4,
  radius: 1000,
  distanceEnabled: false,
  intent: null,
  tags: ['맛집'],
  dietary: [],
};

const RADIUS_VALUES = new Set([1000, 2000, 3000, 4000, 5000]);

export function normalizeQuickMatchSettings(value: unknown): QuickMatchSettingsSnapshot {
  if (!value || typeof value !== 'object') return DEFAULT_QUICK_MATCH_SETTINGS;
  const input = value as Record<string, unknown>;
  const partySize = normalizeQuickMatchPartySize(
    input.partySize,
    DEFAULT_QUICK_MATCH_SETTINGS.partySize,
  );
  const rawDeadline = Number(input.deadlineMinutes);
  const deadlineMinutes = Number.isFinite(rawDeadline)
    ? Math.max(1, Math.min(15, Math.round(rawDeadline)))
    : DEFAULT_QUICK_MATCH_SETTINGS.deadlineMinutes;
  const rawRadius = Number(input.radius);
  const radius = RADIUS_VALUES.has(rawRadius) ? rawRadius : DEFAULT_QUICK_MATCH_SETTINGS.radius;
  const intent = input.intent === 'meal' || input.intent === 'cafe' || input.intent === 'dessert'
    ? input.intent
    : null;
  const tags = Array.isArray(input.tags)
    ? input.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
    : DEFAULT_QUICK_MATCH_SETTINGS.tags;

  return {
    deadlineMinutes,
    partySize,
    radius,
    distanceEnabled: input.distanceEnabled === true,
    intent,
    tags: Array.from(new Set(tags)),
    dietary: normalizeDietaryPreferences(input.dietary),
  };
}

export const QUICK_MATCH_SETTINGS_STORAGE_KEY = 'lm_quick_match_settings_v2';
