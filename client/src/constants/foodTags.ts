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

export const FOOD_FILTER_TAGS: { label: string; value: TagType | 'all' }[] = [
  { label: '전체', value: 'all' },
  ...FOOD_TAGS.map(tag => ({ label: tag, value: tag })),
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
