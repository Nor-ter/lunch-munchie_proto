import { SHARE_TEMPLATES } from '@/constants/shareTemplates';

/**
 * 코스맵 템플릿 — 4:3 규격(화면에는 세로로 세워 3:4로 노출).
 * templates4_3 스크랩북 프레임(temp1~6)을 배경으로 깔고,
 * 중앙 종이 영역 안에 최대 3개의 포토슬롯 + 과일 캐릭터(키위/사과/딸기)를 얹는다.
 * 슬롯 좌표는 3:4 캔버스 대비 퍼센트라 카드 크기와 무관하게 유지된다.
 * 테두리 장식을 가리지 않도록 슬롯은 항상 중앙 종이 영역 안쪽에만 배치한다.
 */

export interface TemplateSlot {
  left: number;
  top: number;
  width: number;
  height: number;
  /** 슬롯 회전(도) — 비스듬히 붙은 폴라로이드용 */
  rotate?: number;
  /** CSS border-radius (오벌 슬롯은 '50%') */
  radius?: string;
}

export interface CoursemapTemplate {
  id: string;
  name: string;
  image: string;
  description: string;
  bestFor: string;
  /** 최대 3개 — 코스 1·2·3번 장소가 순서대로 채워진다 */
  slots: TemplateSlot[];
  /** 완전 불투명 프레임에서 중앙 사진 영역만 뚫기 위한 안쪽 경계(%) */
  frameInset: { top: number; right: number; bottom: number; left: number };
}

const ORIGINAL_COURSEMAP_TEMPLATES: CoursemapTemplate[] = [
  {
    id: 'lucky-green',
    name: '럭키 그린',
    image: '/templates4_3/temp1.jpg',
    description: '네잎클로버와 무지개가 가득한 lucky day 스크랩북 프레임이에요.',
    bestFor: '데이트 · 소풍 · 기분 좋은 하루',
    frameInset: { top: 18, right: 22, bottom: 16, left: 24 },
    slots: [
      { left: 22, top: 15, width: 40, height: 22, rotate: -3 },
      { left: 42, top: 40, width: 40, height: 22, rotate: 2 },
      { left: 24, top: 64, width: 40, height: 22, rotate: -2 },
    ],
  },
  {
    id: 'sweet-strawberry',
    name: '스위트 스트로베리',
    image: '/templates4_3/temp2.jpg',
    description: '딸기잼과 체리 라벨이 붙은 새콤달콤 컨트리 프레임이에요.',
    bestFor: '디저트 투어 · 카페 · 달콤한 코스',
    frameInset: { top: 17, right: 20, bottom: 18, left: 21 },
    slots: [
      { left: 24, top: 14, width: 40, height: 22, rotate: 2 },
      { left: 40, top: 39, width: 40, height: 22, rotate: -3 },
      { left: 25, top: 63, width: 40, height: 22, rotate: 2 },
    ],
  },
  {
    id: 'vintage-picnic',
    name: '빈티지 피크닉',
    image: '/templates4_3/temp3.jpg',
    description: '체크 식탁보 위에 단추와 리본을 수놓은 빈티지 피크닉 프레임이에요.',
    bestFor: '맛집 투어 · 브런치 · 레트로 감성',
    frameInset: { top: 16, right: 18, bottom: 17, left: 18 },
    slots: [
      { left: 25, top: 15, width: 40, height: 22, rotate: -2 },
      { left: 41, top: 40, width: 40, height: 22, rotate: 3 },
      { left: 26, top: 64, width: 40, height: 22, rotate: -2 },
    ],
  },
  {
    id: 'denim-blue',
    name: '데님 블루',
    image: '/templates4_3/temp4.jpg',
    description: 'GOOD DAY 티켓과 데님 패치가 붙은 차분한 블루 프레임이에요.',
    bestFor: '혼자 여행 · 전시 · 시티 투어',
    frameInset: { top: 17, right: 19, bottom: 17, left: 18 },
    slots: [
      { left: 22, top: 13, width: 40, height: 22, rotate: 2 },
      { left: 40, top: 38, width: 40, height: 22, rotate: -2 },
      { left: 23, top: 62, width: 40, height: 22, rotate: 2 },
    ],
  },
  {
    id: 'lavender-note',
    name: '라벤더 노트',
    image: '/templates4_3/temp5.jpg',
    description: 'Collect beautiful moments — 잔잔한 라벤더 기록장 프레임이에요.',
    bestFor: '감성 코스 · 북카페 · 조용한 하루',
    frameInset: { top: 18, right: 18, bottom: 18, left: 18 },
    slots: [
      { left: 23, top: 17, width: 40, height: 22, rotate: -2 },
      { left: 40, top: 41, width: 40, height: 22, rotate: 2 },
      { left: 24, top: 65, width: 40, height: 22, rotate: -3 },
    ],
  },
  {
    id: 'happy-pink',
    name: '해피 핑크',
    image: '/templates4_3/temp6.jpg',
    description: 'Be happy! 스마일과 별이 톡톡 튀는 팝 핑크 프레임이에요.',
    bestFor: '액티비티 · 생일 · 신나는 코스',
    frameInset: { top: 18, right: 20, bottom: 18, left: 21 },
    slots: [
      { left: 23, top: 13, width: 40, height: 22, rotate: 3 },
      { left: 40, top: 38, width: 40, height: 22, rotate: -2 },
      { left: 24, top: 62, width: 40, height: 22, rotate: 2 },
    ],
  },
];

const STORY_GRID_SLOTS: TemplateSlot[] = [
  { left: 12, top: 8, width: 35, height: 35, rotate: -1 },
  { left: 54, top: 8, width: 35, height: 35, rotate: 1 },
  { left: 12, top: 54, width: 35, height: 34, rotate: 1 },
];

const STORY_ROUTE_SLOTS: TemplateSlot[] = [
  { left: 35, top: 4, width: 18, height: 16, rotate: -1 },
  { left: 63, top: 17, width: 18, height: 16, rotate: 1 },
  { left: 35, top: 35, width: 18, height: 16, rotate: -1 },
];

const STORY_RECEIPT_SLOTS: TemplateSlot[] = [
  { left: 18, top: 24, width: 30, height: 22, rotate: -3 },
  { left: 53, top: 36, width: 30, height: 22, rotate: 3 },
  { left: 24, top: 59, width: 30, height: 22, rotate: -2 },
];

const STORY_TRAY_SLOTS: TemplateSlot[] = [
  { left: 13, top: 34, width: 34, height: 19, radius: '12px' },
  { left: 52, top: 34, width: 34, height: 19, radius: '12px' },
  { left: 14, top: 58, width: 39, height: 23, radius: '12px' },
];

const STORY_CD_SLOTS: TemplateSlot[] = [
  { left: 18, top: 22, width: 30, height: 23, rotate: -8 },
  { left: 53, top: 18, width: 30, height: 23, rotate: 7 },
  { left: 31, top: 52, width: 30, height: 23, rotate: -4 },
];

const STORY_TICKET_SLOTS: TemplateSlot[] = [
  { left: 35, top: 24, width: 31, height: 16, radius: '50%' },
  { left: 35, top: 44, width: 31, height: 16, radius: '50%' },
  { left: 35, top: 64, width: 31, height: 16, radius: '50%' },
];

function getStoryFeedSlots(index: number): TemplateSlot[] {
  if (index <= 2) return STORY_GRID_SLOTS;
  if (index === 3 || (index >= 5 && index <= 7)) return STORY_ROUTE_SLOTS;
  if (index >= 8 && index <= 10) return STORY_TRAY_SLOTS;
  if (index >= 11 && index <= 13) return STORY_CD_SLOTS;
  if (index >= 17) return STORY_TICKET_SLOTS;
  return STORY_RECEIPT_SLOTS;
}

/** 기존 9:16 스토리 디자인을 원본 픽셀 그대로 중앙 크롭한 3:4 Munchie 피드 템플릿. */
export const STORY_FEED_TEMPLATES: CoursemapTemplate[] = SHARE_TEMPLATES.map((template, index) => ({
  id: `story-feed-${String(index + 1).padStart(2, '0')}`,
  name: template.name,
  image: `/templates4_3/story-converted/template-${String(index + 1).padStart(2, '0')}.jpg`,
  description: `${template.name} 스토리 디자인을 4:3 맛집 피드에 맞게 재구성했어요.`,
  bestFor: '맛집 기록 · 사진 앨범 · Munchie 피드',
  slots: getStoryFeedSlots(index).map(slot => ({ ...slot })),
  frameInset: { top: 6, right: 6, bottom: 6, left: 6 },
}));

export const COURSEMAP_TEMPLATES: CoursemapTemplate[] = [
  ...ORIGINAL_COURSEMAP_TEMPLATES,
  ...STORY_FEED_TEMPLATES,
];

export function getTemplateByIndex(index: number): CoursemapTemplate {
  return COURSEMAP_TEMPLATES[index % COURSEMAP_TEMPLATES.length]!;
}

export function getTemplateById(id?: string): CoursemapTemplate | undefined {
  return COURSEMAP_TEMPLATES.find((template) => template.id === id);
}

// ── 코스별 템플릿 선택 저장 ───────────────────────────────────────────────────
// 코스맵 만들기 플로우에서 유저가 고른 템플릿을 코스에 고정해,
// 홈/피드/뷰어/에디터 어디에서든 같은 코스는 같은 코스맵으로 보이게 한다.

const TEMPLATE_CHOICE_KEY = 'lm_course_template_choice';

function readChoices(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(TEMPLATE_CHOICE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function setTemplateForCourse(courseId: string, templateId: string) {
  try {
    const choices = readChoices();
    choices[courseId] = templateId;
    localStorage.setItem(TEMPLATE_CHOICE_KEY, JSON.stringify(choices));
  } catch {
    /* 저장 실패 시에도 화면 흐름은 계속 진행 */
  }
}

/** 유저가 고른 템플릿 → 없으면 코스 인덱스 기반 기본 템플릿 */
export function getTemplateForCourse(
  courseId: string,
  fallbackIndex = 0,
): CoursemapTemplate {
  const chosen = getTemplateById(readChoices()[courseId]);
  return chosen ?? getTemplateByIndex(fallbackIndex);
}
