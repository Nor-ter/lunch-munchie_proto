/**
 * Munchie 템플릿 스킨 — 스크랩북 감성 프레임 정의
 * 피드 카드 / 코스맵 상세 / 홈 캐러셀에 공통 적용된다.
 * 패턴은 외부 에셋 없이 CSS gradient로만 그린다 (오프라인에서도 동일하게 보이도록).
 */

export interface MunchieSkin {
  id: string;
  name: string;
  emoji: string;
  /** 프레임(테두리 영역) CSS background */
  frame: string;
  /** 프레임 안쪽 종이 배경색 */
  paper: string;
  /** 제목·번호 등 포인트 컬러 */
  accent: string;
  text: string;
  sub: string;
  /** 프레임에 얹는 inset 장식 라인 (빈티지 등) */
  frameShadow?: string;
  /** 제목 폰트 오버라이드 (빈티지 serif 등) */
  titleFont?: string;
  /** 코너 장식 스티커 이모지 */
  stickers: [string, string];
}

/** 깅엄 체크: 가로+세로 반투명 스트라이프가 겹치며 교차점이 진해진다 */
const gingham = (color: string, size = 13, base = '#FFFFFF') =>
  `repeating-linear-gradient(0deg, ${color} 0 ${size}px, transparent ${size}px ${size * 2}px), ` +
  `repeating-linear-gradient(90deg, ${color} 0 ${size}px, transparent ${size}px ${size * 2}px), ${base}`;

export const MUNCHIE_SKINS: MunchieSkin[] = [
  {
    id: 'pink-picnic',
    name: '핑크 피크닉',
    emoji: '🍒',
    frame: gingham('rgba(244, 143, 160, 0.5)'),
    paper: '#FFF7F5',
    accent: '#E85053',
    text: '#3B2225',
    sub: '#B08589',
    stickers: ['🍒', '🌸'],
  },
  {
    id: 'yellow-munchtray',
    name: '옐로우 먼치트레이',
    emoji: '🌼',
    frame: gingham('rgba(240, 180, 60, 0.45)', 13, '#FFFDF2'),
    paper: '#FFFCF0',
    accent: '#DB9000',
    text: '#4A3A16',
    sub: '#B09A62',
    stickers: ['🌼', '🍯'],
  },
  {
    id: 'vintage-frame',
    name: '빈티지 프레임',
    emoji: '🎞️',
    frame: 'linear-gradient(160deg, #5E3026 0%, #46211A 55%, #63352A 100%)',
    frameShadow:
      'inset 0 0 0 3px rgba(201,162,39,0.8), inset 0 0 0 5px rgba(70,33,26,1), inset 0 0 0 6px rgba(255,235,200,0.35)',
    paper: '#FBF3E4',
    accent: '#7A3B2E',
    text: '#40291F',
    sub: '#9C7F6B',
    titleFont: "'Nanum Myeongjo', Georgia, 'Times New Roman', serif",
    stickers: ['🎞️', '🕰️'],
  },
  {
    id: 'blue-note',
    name: '블루 노트',
    emoji: '📘',
    frame: gingham('rgba(110, 152, 214, 0.42)', 12, '#F7FAFF'),
    paper: '#FDFEFF',
    accent: '#3E719B',
    text: '#243447',
    sub: '#8AA0B8',
    stickers: ['📘', '✨'],
  },
  {
    id: 'flower-garden',
    name: '플라워 가든',
    emoji: '🌷',
    frame: gingham('rgba(126, 190, 120, 0.42)', 13, '#F6FFF4'),
    paper: '#FCFFF9',
    accent: '#2E8F35',
    text: '#28401F',
    sub: '#8FAE87',
    stickers: ['🌷', '🍀'],
  },
  {
    id: 'modern-minimal',
    name: '모던 미니멀',
    emoji: '◻️',
    frame: 'linear-gradient(180deg, #F4F2EF 0%, #EAE7E2 100%)',
    frameShadow: 'inset 0 0 0 1.5px rgba(26,26,26,0.14)',
    paper: '#FFFFFF',
    accent: '#1A1A1A',
    text: '#1A1A1A',
    sub: '#9B9B9B',
    stickers: ['✦', '✧'],
  },
];

export function getSkinById(id?: string | null): MunchieSkin | undefined {
  if (!id) return undefined;
  return MUNCHIE_SKINS.find((s) => s.id === id);
}
