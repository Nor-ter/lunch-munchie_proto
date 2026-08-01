/**
 * 스크랩북 공유 템플릿 공용 팔레트.
 * 코스에 적용된 먼치 스킨(courseSkins)이 있으면 그 색감을 따라가고,
 * 없으면 각 템플릿의 시그니처 컬러웨이를 쓴다. (외부 에셋 없이 CSS로만)
 */

export interface ScrapPalette {
  /** 깅엄 체크 스트라이프 색 (반투명) */
  check: string;
  /** 깅엄 바탕색 */
  checkBase: string;
  /** 종이/카드 배경 */
  paper: string;
  /** 포인트 컬러 */
  accent: string;
  /** 진한 톤 (프레임, 제목) */
  deep: string;
}

export const SCRAP_PALETTES: Record<string, ScrapPalette> = {
  pink: {
    check: 'rgba(244, 143, 160, 0.5)',
    checkBase: '#FFF3F1',
    paper: '#FFF9F6',
    accent: '#E85053',
    deep: '#B14A55',
  },
  yellow: {
    check: 'rgba(240, 180, 60, 0.45)',
    checkBase: '#FFFCEE',
    paper: '#FFFDF4',
    accent: '#DB9000',
    deep: '#8F6210',
  },
  blue: {
    check: 'rgba(110, 152, 214, 0.45)',
    checkBase: '#F5F9FF',
    paper: '#FDFEFF',
    accent: '#3E719B',
    deep: '#2B5273',
  },
  green: {
    check: 'rgba(126, 190, 120, 0.45)',
    checkBase: '#F4FFF2',
    paper: '#FCFFF8',
    accent: '#2E8F35',
    deep: '#1F6425',
  },
  vintage: {
    check: 'rgba(122, 59, 46, 0.35)',
    checkBase: '#F3E4CE',
    paper: '#F7EEDD',
    accent: '#7A3B2E',
    deep: '#46211A',
  },
  gray: {
    check: 'rgba(120, 120, 120, 0.22)',
    checkBase: '#F7F6F4',
    paper: '#FFFFFF',
    accent: '#1A1A1A',
    deep: '#333333',
  },
};

/** 먼치 스킨 id → 공유 템플릿 팔레트 */
const SKIN_TO_PALETTE: Record<string, keyof typeof SCRAP_PALETTES> = {
  'pink-picnic': 'pink',
  'yellow-munchtray': 'yellow',
  'vintage-frame': 'vintage',
  'blue-note': 'blue',
  'flower-garden': 'green',
  'modern-minimal': 'gray',
};

export function paletteFromSkin(skinId?: string | null): ScrapPalette | undefined {
  if (!skinId) return undefined;
  const key = SKIN_TO_PALETTE[skinId];
  return key ? SCRAP_PALETTES[key] : undefined;
}

/** 깅엄 체크 배경 (가로+세로 스트라이프 교차) */
export function gingham(p: ScrapPalette, size = 14): string {
  return (
    `repeating-linear-gradient(0deg, ${p.check} 0 ${size}px, transparent ${size}px ${size * 2}px), ` +
    `repeating-linear-gradient(90deg, ${p.check} 0 ${size}px, transparent ${size}px ${size * 2}px), ${p.checkBase}`
  );
}

/** 사진 없는 스팟용 플레이스홀더 스타일 */
export function photoFallback(p: ScrapPalette): React.CSSProperties {
  return {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(150deg, ${p.checkBase}, ${p.paper})`,
    color: p.accent,
  };
}
