export const COURSE_THEME = {
  primary: '#E67E78',
  primaryLight: '#FCE8E2',
  mapBg: '#FBF7F1',
  mapGrid: '#EDE3D9',
  black: '#46352D',
} as const;

export const COURSE_MAP_ROUTE_STYLE = {
  borderColor: '#FFFFFF',
  borderWidth: 11,
  routeWidth: 7,
  centerLineColor: 'rgba(255,255,255,0.82)',
  centerLineWidth: 1.5,
  centerLineDash: '7 7',
  nodeRadius: 10,
  nodeSize: 24,
  nodeBorderWidth: 2,
  nodeLabelSize: 10,
} as const;

export const COURSE_COLOR_PALETTE = [
  {
    name: 'Red',
    dark: '#B95F5A',
    base: '#E67E78',
    light: '#EFA49E',
    lighter: '#F5C8C2',
    faint: '#FCEBE7',
    text: '#A9514D',
  },
  {
    name: 'Orange',
    dark: '#A47B47',
    base: '#D9AC6D',
    light: '#E4C08D',
    lighter: '#EFD8B8',
    faint: '#FBF3E5',
    text: '#8A663A',
  },
  {
    name: 'Pink',
    dark: '#AD747F',
    base: '#DFA1AA',
    light: '#E8BAC1',
    lighter: '#F0D4D8',
    faint: '#FCF1F3',
    text: '#925F68',
  },
  {
    name: 'Green',
    dark: '#567966',
    base: '#7FA18D',
    light: '#9FBAAA',
    lighter: '#C9D9CF',
    faint: '#EFF5F1',
    text: '#4F705E',
  },
  {
    name: 'Blue',
    dark: '#5D7180',
    base: '#849CAA',
    light: '#A5B7C1',
    lighter: '#CED9DF',
    faint: '#F0F4F6',
    text: '#536875',
  },
] as const;

export type CoursePaletteColor = (typeof COURSE_COLOR_PALETTE)[number];

export const COURSE_TAG_ORDER = [
  '맛집',
  '데이트코스',
  '혼밥',
  '카페',
  '펍나이트',
  '브런치',
  '디저트',
  '가성비',
] as const;

const COURSE_TAG_COLOR_MAP: Record<string, CoursePaletteColor> = COURSE_TAG_ORDER.reduce(
  (acc, tag, index) => {
    acc[tag] = COURSE_COLOR_PALETTE[index % COURSE_COLOR_PALETTE.length]!;
    return acc;
  },
  {} as Record<string, CoursePaletteColor>
);

COURSE_TAG_COLOR_MAP['데이트 코스'] = COURSE_TAG_COLOR_MAP['데이트코스']!;
COURSE_TAG_COLOR_MAP['혼자 여행'] = COURSE_TAG_COLOR_MAP['혼밥']!;
COURSE_TAG_COLOR_MAP['전시/문화'] = COURSE_TAG_COLOR_MAP['데이트코스']!;
COURSE_TAG_COLOR_MAP['액티비티'] = COURSE_TAG_COLOR_MAP['데이트코스']!;
COURSE_TAG_COLOR_MAP['맛집 투어'] = COURSE_TAG_COLOR_MAP['맛집']!;

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
