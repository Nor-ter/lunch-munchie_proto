export interface CapturedMunchiePlacement {
  xPercent: number;
  bottomPercent: number;
  sizePx: number;
  rotationDeg: number;
}

export interface CapturedMunchie {
  id: string;
  originalImage: string;
  cutoutImage?: string;
  createdAt: number;
  placement: CapturedMunchiePlacement;
  fedAt?: number;
  xpGranted?: number;
  sourcePhotoId?: string;
  sourceCourseId?: string;
  sourcePlaceId?: string;
  sourcePlaceName?: string;
}

export interface StoredMunchieInventoryRecord {
  profileId: string;
  id: string;
  originalImageBlob: Blob;
  cutoutImageBlob?: Blob;
  createdAt: number;
  placement: CapturedMunchiePlacement;
  fedAt?: number;
  xpGranted?: number;
  sourcePhotoId?: string;
  sourceCourseId?: string;
  sourcePlaceId?: string;
  sourcePlaceName?: string;
}

export type MunchieCapturePhase =
  | 'capture'
  | 'processing'
  | 'manualSegmentation'
  | 'reveal'
  | 'dropping'
  | 'collection'
  | 'snackTime'
  | 'error';

export interface CapturedMunchieCollectionV1 {
  version: 1;
  items: CapturedMunchie[];
}
