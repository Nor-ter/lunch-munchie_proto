import { SHARE_TEMPLATES } from '@/constants/shareTemplates';

/**
 * 코스맵 템플릿 — 3:4 규격.
 * 새 먼치 템플릿은 투명 중앙 영역이 있는 프레임 PNG를 최상단에 얹고,
 * 업로드 사진은 그 아래 레이어에서 자유 배치한다.
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
  /** 템플릿 원본 이미지. 투명 프레임 템플릿에서는 미리보기에도 사용한다. */
  image: string;
  /** 투명 중앙 영역이 있는 최상단 프레임 원본. */
  frameImage?: string;
  description: string;
  bestFor: string;
  /** 최대 3개 — 코스 1·2·3번 장소가 순서대로 채워진다 */
  slots: TemplateSlot[];
  /** 완전 불투명 프레임에서 중앙 사진 영역만 뚫기 위한 안쪽 경계(%) */
  frameInset: { top: number; right: number; bottom: number; left: number };
  /** true면 image 원본을 사진 위의 투명 프레임 레이어로 그대로 사용한다. */
  transparentFrame?: boolean;
}

const ORIGINAL_COURSEMAP_TEMPLATES: CoursemapTemplate[] = [
  {
    id: 'nice-orange',
    name: "Nice orange",
    image: '/templates4_3/munchie-01.png',
    frameImage: '/templates4_3/munchie-01.png',
    description: "Orange checks and smiley details.",
    bestFor: "Dates · Picnics · Days out",
    frameInset: { top: 11, right: 10, bottom: 9, left: 10 },
    transparentFrame: true,
    slots: [
      { left: 18, top: 16, width: 64, height: 23, rotate: -2 },
      { left: 18, top: 40, width: 64, height: 23, rotate: 1 },
      { left: 18, top: 64, width: 64, height: 23, rotate: -1 },
    ],
  },
  {
    id: 'lucky-green',
    name: "Lucky green",
    image: '/templates4_3/munchie-02.png',
    frameImage: '/templates4_3/munchie-02.png',
    description: "Clovers and rainbows for a lucky day.",
    bestFor: "Dates · Picnics · Days out",
    frameInset: { top: 11, right: 10, bottom: 9, left: 10 },
    transparentFrame: true,
    slots: [
      { left: 18, top: 16, width: 64, height: 23, rotate: 2 },
      { left: 18, top: 40, width: 64, height: 23, rotate: -1 },
      { left: 18, top: 64, width: 64, height: 23, rotate: 1 },
    ],
  },
  {
    id: 'yellow-note',
    name: "Yellow notes",
    image: '/templates4_3/munchie-03.png',
    frameImage: '/templates4_3/munchie-03.png',
    description: "Warm yellow fabric and layered paper.",
    bestFor: "Brunch · Cafes · Cosy days",
    frameInset: { top: 11, right: 8, bottom: 9, left: 8 },
    transparentFrame: true,
    slots: [
      { left: 17, top: 12, width: 66, height: 25, rotate: -2 },
      { left: 17, top: 38, width: 66, height: 25, rotate: 1 },
      { left: 17, top: 64, width: 66, height: 25, rotate: -1 },
    ],
  },
  {
    id: 'lovely-lavender',
    name: "Lovely lavender",
    image: '/templates4_3/munchie-04.png',
    frameImage: '/templates4_3/munchie-04.png',
    description: "Lavender checks and pastel ribbons.",
    bestFor: "Book cafes · Quiet days",
    frameInset: { top: 11, right: 8, bottom: 9, left: 8 },
    transparentFrame: true,
    slots: [
      { left: 17, top: 12, width: 66, height: 25, rotate: 2 },
      { left: 17, top: 38, width: 66, height: 25, rotate: -1 },
      { left: 17, top: 64, width: 66, height: 25, rotate: 1 },
    ],
  },
  {
    id: 'strawberry-picnic',
    name: "Strawberry picnic",
    image: '/templates4_3/munchie-05.png',
    frameImage: '/templates4_3/munchie-05.png',
    description: "Strawberries and buttons for a picnic feel.",
    bestFor: "Desserts · Cafes · Sweet treats",
    frameInset: { top: 11, right: 8, bottom: 9, left: 8 },
    transparentFrame: true,
    slots: [
      { left: 17, top: 12, width: 66, height: 25, rotate: -2 },
      { left: 17, top: 38, width: 66, height: 25, rotate: 1 },
      { left: 17, top: 64, width: 66, height: 25, rotate: -1 },
    ],
  },
  {
    id: 'happy-pink',
    name: "Happy pink",
    image: '/templates4_3/munchie-06.png',
    frameImage: '/templates4_3/munchie-06.png',
    description: "Bright pink with smiles and stars.",
    bestFor: "Birthdays · Activities · Days out",
    frameInset: { top: 11, right: 10, bottom: 9, left: 10 },
    transparentFrame: true,
    slots: [
      { left: 18, top: 15, width: 64, height: 23, rotate: 2 },
      { left: 18, top: 39, width: 64, height: 23, rotate: -1 },
      { left: 18, top: 63, width: 64, height: 23, rotate: 1 },
    ],
  },
  {
    id: 'soft-blue-note',
    name: "Soft blue",
    image: '/templates4_3/munchie-07.png',
    frameImage: '/templates4_3/munchie-07.png',
    description: "A scrapbook of soft blue and lavender.",
    bestFor: "Solo trips · Galleries · City walks",
    frameInset: { top: 11, right: 8, bottom: 9, left: 8 },
    transparentFrame: true,
    slots: [
      { left: 17, top: 12, width: 66, height: 25, rotate: 1 },
      { left: 17, top: 38, width: 66, height: 25, rotate: -1 },
      { left: 17, top: 64, width: 66, height: 25, rotate: 1 },
    ],
  },
  {
    id: 'red-check-picnic',
    name: "Red gingham",
    image: '/templates4_3/munchie-08.png',
    frameImage: '/templates4_3/munchie-08.png',
    description: "Red checks, ribbons and clovers.",
    bestFor: "Food trails · Brunch · Retro style",
    frameInset: { top: 11, right: 8, bottom: 9, left: 8 },
    transparentFrame: true,
    slots: [
      { left: 17, top: 12, width: 66, height: 25, rotate: -1 },
      { left: 17, top: 38, width: 66, height: 25, rotate: 1 },
      { left: 17, top: 64, width: 66, height: 25, rotate: -1 },
    ],
  },
  {
    id: 'good-day-blue',
    name: "Good day blue",
    image: '/templates4_3/munchie-09.png',
    frameImage: '/templates4_3/munchie-09.png',
    description: "Blue tickets and denim stars.",
    bestFor: "Walks · Memories · Slow days",
    frameInset: { top: 11, right: 8, bottom: 9, left: 8 },
    transparentFrame: true,
    slots: [
      { left: 17, top: 12, width: 66, height: 25, rotate: 1 },
      { left: 17, top: 38, width: 66, height: 25, rotate: -1 },
      { left: 17, top: 64, width: 66, height: 25, rotate: 1 },
    ],
  },
  {
    id: 'fresh-rainbow',
    name: "Fresh rainbow",
    image: '/templates4_3/munchie-10.png',
    frameImage: '/templates4_3/munchie-10.png',
    description: "Colourful paper and playful stickers.",
    bestFor: "Friends · Birthdays · Good times",
    frameInset: { top: 11, right: 8, bottom: 9, left: 8 },
    transparentFrame: true,
    slots: [
      { left: 17, top: 12, width: 66, height: 25, rotate: -1 },
      { left: 17, top: 38, width: 66, height: 25, rotate: 1 },
      { left: 17, top: 64, width: 66, height: 25, rotate: -1 },
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
  description: `${template.name}, adapted for a 4:3 food post.`,
  bestFor: "Food photos · Albums · Munchie Feed",
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
