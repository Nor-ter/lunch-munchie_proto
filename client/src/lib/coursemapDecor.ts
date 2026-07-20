/**
 * 코스맵 만들기 플로우에서 유저가 템플릿 위에 직접 배치·꾸민 사진들을 저장한다.
 * 좌표·크기는 3:4 캔버스 대비 퍼센트라 카드 크기와 무관하게 재현된다.
 * TemplateArtwork가 이 데이터를 읽어 홈/피드/템플릿 상세 어디서든 같은 결과물을 그린다.
 */

export interface PlacedPhoto {
  id: string;
  src: string;
  /** 캔버스 좌상단 기준 중심 좌표 (%) */
  x: number;
  y: number;
  /** 캔버스 너비 대비 사진 너비 (%) */
  w: number;
  /** 캔버스 높이 대비 사진 높이 (%). 기존 데이터는 w를 사용한다. */
  h?: number;
  rotate: number;
}

const DECOR_KEY = 'lm_coursemap_decor';
const MAX_COURSEMAP_PHOTOS = 3;

function readAll(): Record<string, PlacedPhoto[]> {
  try {
    return JSON.parse(localStorage.getItem(DECOR_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function getCoursemapDecor(courseId: string): PlacedPhoto[] | null {
  const decor = readAll()[courseId];
  return decor && decor.length > 0 ? decor.slice(0, MAX_COURSEMAP_PHOTOS) : null;
}

export function saveCoursemapDecor(courseId: string, placed: PlacedPhoto[]) {
  try {
    const all = readAll();
    all[courseId] = placed.slice(0, MAX_COURSEMAP_PHOTOS);
    localStorage.setItem(DECOR_KEY, JSON.stringify(all));
  } catch {
    /* 대용량 dataURL로 저장 실패해도 게시 흐름은 계속 진행 */
  }
}
