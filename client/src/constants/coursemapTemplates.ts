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

export const COURSEMAP_TEMPLATES: CoursemapTemplate[] = [
  {
    id: 'nice-orange',
    name: '나이스 오렌지',
    image: '/templates4_3/munchie-01.png',
    frameImage: '/templates4_3/munchie-01.png',
    description: '오렌지 체크와 스마일 장식이 있는 먼치 프레임이에요.',
    bestFor: '데이트 · 소풍 · 기분 좋은 하루',
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
    name: '럭키 그린',
    image: '/templates4_3/munchie-02.png',
    frameImage: '/templates4_3/munchie-02.png',
    description: '네잎클로버와 무지개가 가득한 lucky day 프레임이에요.',
    bestFor: '데이트 · 소풍 · 기분 좋은 하루',
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
    name: '옐로우 노트',
    image: '/templates4_3/munchie-03.png',
    frameImage: '/templates4_3/munchie-03.png',
    description: '노란 패브릭과 종이 조각이 겹쳐진 포근한 프레임이에요.',
    bestFor: '브런치 · 카페 · 따뜻한 하루',
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
    name: '러블리 라벤더',
    image: '/templates4_3/munchie-04.png',
    frameImage: '/templates4_3/munchie-04.png',
    description: '라벤더 체크와 파스텔 리본이 있는 러블리 프레임이에요.',
    bestFor: '감성 코스 · 북카페 · 조용한 하루',
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
    name: '딸기 피크닉',
    image: '/templates4_3/munchie-05.png',
    frameImage: '/templates4_3/munchie-05.png',
    description: '딸기와 버튼 장식이 가득한 피크닉 프레임이에요.',
    bestFor: '디저트 투어 · 카페 · 달콤한 코스',
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
    name: '해피 핑크',
    image: '/templates4_3/munchie-06.png',
    frameImage: '/templates4_3/munchie-06.png',
    description: 'Be happy! 스마일과 별이 톡톡 튀는 팝 핑크 프레임이에요.',
    bestFor: '액티비티 · 생일 · 신나는 코스',
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
    name: '소프트 블루',
    image: '/templates4_3/munchie-07.png',
    frameImage: '/templates4_3/munchie-07.png',
    description: '파스텔 블루와 라벤더 조각이 섞인 기록장 프레임이에요.',
    bestFor: '혼자 여행 · 전시 · 시티 투어',
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
    name: '레드 체크',
    image: '/templates4_3/munchie-08.png',
    frameImage: '/templates4_3/munchie-08.png',
    description: '레드 체크와 리본, 클로버가 어우러진 피크닉 프레임이에요.',
    bestFor: '맛집 투어 · 브런치 · 레트로 감성',
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
    name: '굿데이 블루',
    image: '/templates4_3/munchie-09.png',
    frameImage: '/templates4_3/munchie-09.png',
    description: 'GOOD DAY 티켓과 데님 별 장식이 있는 차분한 블루 프레임이에요.',
    bestFor: '산책 · 기록 · 여유로운 하루',
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
    name: '프레시 레인보우',
    image: '/templates4_3/munchie-10.png',
    frameImage: '/templates4_3/munchie-10.png',
    description: '알록달록한 종이 조각과 스티커가 밝게 둘러진 먼치 프레임이에요.',
    bestFor: '친구 모임 · 생일 · 즐거운 기록',
    frameInset: { top: 11, right: 8, bottom: 9, left: 8 },
    transparentFrame: true,
    slots: [
      { left: 17, top: 12, width: 66, height: 25, rotate: -1 },
      { left: 17, top: 38, width: 66, height: 25, rotate: 1 },
      { left: 17, top: 64, width: 66, height: 25, rotate: -1 },
    ],
  },
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
