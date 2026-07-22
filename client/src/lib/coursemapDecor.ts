/**
 * 코스맵 만들기 플로우에서 유저가 템플릿 위에 직접 배치·꾸민 사진들을 저장한다.
 * 좌표·크기는 3:4 캔버스 대비 퍼센트라 카드 크기와 무관하게 재현된다.
 * TemplateArtwork가 이 데이터를 읽어 홈/피드/템플릿 상세 어디서든 같은 결과물을 그린다.
 */

export interface PlacedPhoto {
  id: string;
  src: string;
  /** First uploaded source, retained so Photo Editor Reset can restore it. */
  originalSrc?: string;
  /** 캔버스 좌상단 기준 중심 좌표 (%) */
  x: number;
  y: number;
  /** 캔버스 너비 대비 사진 너비 (%) */
  w: number;
  /** 캔버스 높이 대비 사진 높이 (%). 기존 데이터는 w를 사용한다. */
  h?: number;
  /** Scale inside the photo frame. Legacy records default to 1. */
  zoom?: number;
  rotate: number;
}

export interface CoursemapCanvasStroke {
  id: string;
  color: string;
  width: number;
  opacity?: number;
  points: { x: number; y: number }[];
}

interface StoredCoursemapDecor {
  photos: PlacedPhoto[];
  strokes?: CoursemapCanvasStroke[];
}

const DECOR_KEY = 'lm_coursemap_decor';
export const MAX_MUNCHIE_FEED_PHOTOS = 6;

function readAll(): Record<string, PlacedPhoto[] | StoredCoursemapDecor> {
  try {
    return JSON.parse(localStorage.getItem(DECOR_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function getCoursemapDecor(courseId: string): PlacedPhoto[] | null {
  const decor = readAll()[courseId];
  const photos = Array.isArray(decor) ? decor : decor?.photos;
  return photos && photos.length > 0 ? photos.slice(0, MAX_MUNCHIE_FEED_PHOTOS) : null;
}

export function getCoursemapCanvasStrokes(courseId: string): CoursemapCanvasStroke[] {
  const decor = readAll()[courseId];
  return Array.isArray(decor) ? [] : (decor?.strokes ?? []);
}

export function saveCoursemapDecor(
  courseId: string,
  placed: PlacedPhoto[],
  strokes?: CoursemapCanvasStroke[],
) {
  try {
    const all = readAll();
    const current = all[courseId];
    const currentStrokes = Array.isArray(current) ? [] : (current?.strokes ?? []);
    all[courseId] = {
      photos: placed.slice(0, MAX_MUNCHIE_FEED_PHOTOS),
      strokes: strokes ?? currentStrokes,
    };
    localStorage.setItem(DECOR_KEY, JSON.stringify(all));
  } catch {
    /* 대용량 dataURL로 저장 실패해도 게시 흐름은 계속 진행 */
  }
}
