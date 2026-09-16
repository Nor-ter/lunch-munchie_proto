export const FOOD_TAGS = [
  '맛집',
  '데이트코스',
  '혼밥',
  '카페',
  '펍나이트',
  '브런치',
  '디저트',
  '가성비',
] as const;

export type TagType = (typeof FOOD_TAGS)[number];

const FOOD_TAG_LABELS: Record<TagType, string> = {
  '맛집': 'Good food',
  '데이트코스': 'Date spots',
  '혼밥': 'Dining for one',
  '카페': 'Café',
  '펍나이트': 'Pub night',
  '브런치': 'Brunch',
  '디저트': 'Dessert',
  '가성비': 'Budget bites',
};

// Display known catalogue tags in English; preserve custom user hashtags.
export function foodTagLabel(tag: string): string {
  return FOOD_TAG_LABELS[tag as TagType] ?? (LEGACY_TAG_MAP[tag] ? FOOD_TAG_LABELS[LEGACY_TAG_MAP[tag]] : tag);
}

export const FOOD_FILTER_TAGS: { label: string; value: TagType | 'all' }[] = [
  { label: 'All', value: 'all' },
  ...FOOD_TAGS.map(tag => ({ label: foodTagLabel(tag), value: tag })),
];

const LEGACY_TAG_MAP: Record<string, TagType> = {
  '데이트 코스': '데이트코스',
  '혼자 여행': '혼밥',
  '전시/문화': '데이트코스',
  '액티비티': '데이트코스',
  '맛집 투어': '맛집',
  '펍 나이트': '펍나이트',
};

export function normalizeFoodTag(tag: string): TagType {
  if ((FOOD_TAGS as readonly string[]).includes(tag)) return tag as TagType;
  return LEGACY_TAG_MAP[tag] ?? '맛집';
}

export function hasFoodTag(tags: readonly string[], filter: TagType): boolean {
  return tags.some(tag => normalizeFoodTag(tag) === filter);
}
