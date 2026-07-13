/**
 * 코스맵 템플릿 — 디자이너 에셋(public/templates/*.jpg, 1080×1920 기준)의
 * 빈 포토슬롯 좌표(%)에 유저가 올린 식당 사진을 채워 넣는다.
 * 좌표는 원본 이미지 대비 퍼센트라 카드 크기와 무관하게 유지된다.
 */

export interface TemplateSlot {
  left: number;
  top: number;
  width: number;
  height: number;
  /** 슬롯 회전(도) — 비스듬히 붙은 폴라로이드/티켓용 */
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
  slots: TemplateSlot[];
  /** 원본에 박혀 있는 "코스맵 이름/날짜" 플레이스홀더를 덮는 라벨 스티커 위치 */
  label?: {
    left: number;
    top: number;
    width: number;
    height: number;
    color: string;
    bg?: string;
    rotate?: number;
  };
}

export const COURSEMAP_TEMPLATES: CoursemapTemplate[] = [
  {
    id: 'fourcut',
    name: '네컷',
    image: '/templates/fourcut-01.jpg',
    description: '하루의 인상적인 장면을 네 장의 사진으로 또렷하게 기록하는 포토 프레임이에요.',
    bestFor: '데이트 · 카페 투어 · 하루 기록',
    slots: [
      { left: 10.6, top: 22.1, width: 34.8, height: 30.3 },
      { left: 54.0, top: 22.1, width: 34.8, height: 30.3 },
      { left: 10.6, top: 60.9, width: 34.8, height: 30.3 },
      { left: 54.0, top: 60.9, width: 34.8, height: 30.3 },
    ],
  },
  {
    id: 'roadmap',
    name: '로드맵',
    image: '/templates/roadmap-01.jpg',
    description: '장소를 따라 움직이는 코스의 흐름을 한눈에 보여주는 여행 지도 스타일이에요.',
    bestFor: '동네 산책 · 미식 투어 · 여행 코스',
    slots: [
      { left: 35.9, top: 19.2, width: 14.3, height: 8.0 },
      { left: 64.2, top: 26.7, width: 14.3, height: 8.0 },
      { left: 35.9, top: 40.6, width: 14.3, height: 8.0 },
      { left: 41.2, top: 60.1, width: 14.3, height: 8.0 },
    ],
    label: { left: 22, top: 75.2, width: 56, height: 11.8, color: '#4A3B2E', bg: '#F3ECDC' },
  },
  {
    id: 'tray',
    name: '먼치트레이',
    image: '/templates/tray-01.jpg',
    description: '다양한 메뉴와 장소를 한 상 가득 차려낸 듯 보여주는 런치 트레이 디자인이에요.',
    bestFor: '맛집 투어 · 메뉴 모음 · 여러 스팟',
    slots: [
      { left: 11.5, top: 38.8, width: 20.5, height: 14.7, radius: '16%' },
      { left: 37.0, top: 38.5, width: 26.0, height: 15.2, radius: '14%' },
      { left: 67.5, top: 38.8, width: 20.5, height: 14.7, radius: '16%' },
      { left: 11.5, top: 56.0, width: 34.5, height: 14.0, radius: '12%' },
      { left: 50.0, top: 56.0, width: 38.5, height: 14.0, radius: '12%' },
    ],
    label: { left: 6, top: 87.5, width: 55, height: 6.5, color: '#5A4A3A', bg: 'rgba(255,253,246,0.92)' },
  },
  {
    id: 'cd',
    name: '씨디 케이스',
    image: '/templates/cd-01.jpg',
    description: '좋아하는 장소를 플레이리스트처럼 모아두는 레트로 앨범 커버 스타일이에요.',
    bestFor: '감성 코스 · 야간 투어 · 취향 기록',
    slots: [
      { left: 43.5, top: 29.8, width: 21.5, height: 8.8 },
      { left: 17.1, top: 38.8, width: 24.1, height: 12.8, rotate: -2 },
      { left: 65.9, top: 41.7, width: 22.0, height: 15.6, rotate: 2 },
      { left: 18.1, top: 54.2, width: 24.5, height: 13.5, rotate: -2 },
      { left: 43.5, top: 58.8, width: 23.3, height: 12.8 },
    ],
  },
  {
    id: 'ticket',
    name: '티켓',
    image: '/templates/ticket-01.jpg',
    description: '다녀온 하루를 오래 간직할 수 있는 한 장의 기념 티켓으로 만드는 디자인이에요.',
    bestFor: '특별한 날 · 여행 · 데이트 코스',
    slots: [
      { left: 39.8, top: 32.0, width: 34.3, height: 12.5, radius: '50%', rotate: -2 },
      { left: 38.9, top: 44.6, width: 34.3, height: 11.5, radius: '50%', rotate: -2 },
      { left: 38.0, top: 56.5, width: 34.3, height: 11.5, radius: '50%', rotate: -2 },
      { left: 37.0, top: 69.2, width: 34.3, height: 11.5, radius: '50%', rotate: -2 },
    ],
    label: { left: 30, top: 82.3, width: 43, height: 8, color: '#6B2F2A', bg: '#F5E9DC', rotate: -2 },
  },
];

export function getTemplateByIndex(index: number): CoursemapTemplate {
  return COURSEMAP_TEMPLATES[index % COURSEMAP_TEMPLATES.length]!;
}

export function getTemplateById(id?: string): CoursemapTemplate | undefined {
  return COURSEMAP_TEMPLATES.find((template) => template.id === id);
}
