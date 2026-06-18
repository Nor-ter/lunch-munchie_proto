export const COURSE_THEME = {
  primary: '#E85053',
  primaryLight: '#FDE1E1',
  mapBg: '#F8F5F0',
  mapGrid: '#E8E3DC',
  black: '#1A1A1A',
} as const;

export const COURSE_COLOR_PALETTE = [
  {
    name: 'Red',
    dark: '#C62F32',
    base: '#E85053',
    light: '#F37D7F',
    lighter: '#F8B3B4',
    faint: '#FDE1E1',
    text: '#C62F32',
  },
  {
    name: 'Orange',
    dark: '#C37400',
    base: '#F09D09',
    light: '#F5B64A',
    lighter: '#F9D48D',
    faint: '#FDEED1',
    text: '#C37400',
  },
  {
    name: 'Pink',
    dark: '#D9B0B5',
    base: '#F39DA8',
    light: '#F5DDE0',
    lighter: '#F9ECEE',
    faint: '#FEF6F7',
    text: '#8B555E',
  },
  {
    name: 'Green',
    dark: '#2E8F35',
    base: '#3CBA44',
    light: '#6DDA73',
    lighter: '#B3E9B6',
    faint: '#E6F7E7',
    text: '#2E8F35',
  },
  {
    name: 'Blue',
    dark: '#2B5273',
    base: '#3E719B',
    light: '#6FA4C6',
    lighter: '#B3CEE0',
    faint: '#E6F0F6',
    text: '#2B5273',
  },
] as const;

export type CoursePaletteColor = (typeof COURSE_COLOR_PALETTE)[number];

export const COURSE_TAG_ORDER = [
  '데이트 코스',
  '맛집',
  '카페',
  '전시/문화',
  '액티비티',
] as const;

const COURSE_TAG_COLOR_MAP: Record<string, CoursePaletteColor> = COURSE_TAG_ORDER.reduce(
  (acc, tag, index) => {
    acc[tag] = COURSE_COLOR_PALETTE[index]!;
    return acc;
  },
  {} as Record<string, CoursePaletteColor>
);

COURSE_TAG_COLOR_MAP['맛집 투어'] = COURSE_TAG_COLOR_MAP['맛집']!;
COURSE_TAG_COLOR_MAP['가성비'] = COURSE_TAG_COLOR_MAP['액티비티']!;

export function getCourseSequenceColor(index: number): CoursePaletteColor {
  return COURSE_COLOR_PALETTE[index % COURSE_COLOR_PALETTE.length]!;
}

export function getCourseTagColor(tag: string): CoursePaletteColor | undefined {
  return COURSE_TAG_COLOR_MAP[tag];
}

export function getCourseTagStyle(tag: string, selected = true) {
  const color = getCourseTagColor(tag);
  if (!color) {
    return selected
      ? { background: '#F5F5F5', color: '#4A4A4A' }
      : { background: '#F5F5F5', color: '#4A4A4A', borderColor: '#E5E5E5' };
  }

  return selected
    ? { background: color.base, color: '#FFFFFF' }
    : { background: color.faint, color: color.text, borderColor: color.lighter };
}
