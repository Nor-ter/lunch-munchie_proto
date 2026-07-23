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

/**
 * 피드에 저장하는 가벼운 배치 정보. 사진 원본(data URL)은 FeedPost.photos에 이미
 * 있으므로 중복 저장하지 않고 배열 인덱스로 연결한다.
 */
export type FeedPhotoPlacement = Omit<PlacedPhoto, 'src' | 'originalSrc'> & {
  photoIndex: number;
};

export function toFeedPhotoPlacements(placed: PlacedPhoto[]): FeedPhotoPlacement[] {
  return placed.slice(0, MAX_MUNCHIE_FEED_PHOTOS).map(({ src: _src, originalSrc: _originalSrc, ...photo }, photoIndex) => ({
    ...photo,
    photoIndex,
  }));
}

export function fromFeedPhotoPlacements(
  placements: FeedPhotoPlacement[] | undefined,
  photos: string[],
): PlacedPhoto[] | null {
  if (!placements?.length) return null;
  const hydrated = placements.slice(0, MAX_MUNCHIE_FEED_PHOTOS).flatMap(({ photoIndex, ...placement }) => {
    const src = photos[photoIndex];
    return src ? [{ ...placement, src }] : [];
  });
  return hydrated.length > 0 ? hydrated : null;
}

export interface CoursemapCanvasStroke {
  id: string;
  color: string;
  width: number;
  opacity?: number;
  points: { x: number; y: number }[];
}

interface StoredCoursemapDecor {
  /** 구버전 저장 형식 */
  photos?: PlacedPhoto[];
  /** data URL을 중복하지 않는 현재 저장 형식 */
  photoPlacements?: FeedPhotoPlacement[];
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

export function getCoursemapDecor(courseId: string, photoSources: string[] = []): PlacedPhoto[] | null {
  const decor = readAll()[courseId];
  if (!Array.isArray(decor) && decor?.photoPlacements) {
    return fromFeedPhotoPlacements(decor.photoPlacements, photoSources);
  }
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
      photoPlacements: toFeedPhotoPlacements(placed),
      strokes: strokes ?? currentStrokes,
    };
    localStorage.setItem(DECOR_KEY, JSON.stringify(all));
  } catch {
    /* 대용량 dataURL로 저장 실패해도 게시 흐름은 계속 진행 */
  }
}
