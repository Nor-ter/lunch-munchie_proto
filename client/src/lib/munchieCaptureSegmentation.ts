import type { InteractiveSegmenter } from '@mediapipe/tasks-vision';
import {
  calculateInferenceDimensions,
  calculateMaskAreaPercent,
  createInferenceCanvas,
  createPinnedInteractiveSegmenter,
  createTransparentSegmentationDataUrl,
  POSITIVE_BRUSH_MODE,
  type InferenceLongEdge,
  type NormalizedSegmentationPoint,
} from '@/lib/munchieSegmentationSpike';

export const CAPTURE_SEGMENTATION_DELEGATE = 'CPU' as const;
export const CAPTURE_SEGMENTATION_LONG_EDGE: InferenceLongEdge = 720;
export const CAPTURE_SEGMENTATION_CENTER_POINT: NormalizedSegmentationPoint = { x: 0.5, y: 0.5 };
export const CAPTURE_MASK_AREA_MIN_PERCENT = 1;
export const CAPTURE_MASK_AREA_MAX_PERCENT = 92;

export interface CaptureSegmentationMetrics {
  delegate: typeof CAPTURE_SEGMENTATION_DELEGATE;
  inferenceWidth: number;
  inferenceHeight: number;
  modelInitializationMs: number;
  setImageMs: number;
  segmentMs: number;
  totalMs: number;
  maskAreaPercent: number;
}

export type CaptureSegmentationResult =
  | {
      status: 'success';
      cutoutImage: string;
      metrics: CaptureSegmentationMetrics;
    }
  | {
      status: 'failure';
      reason: 'mask-area';
      metrics: CaptureSegmentationMetrics;
    };

export type CaptureSegmentationAttempt = 'automatic' | 'manual';
export type CaptureSegmentationDecision = 'use-cutout' | 'request-manual' | 'use-original';

interface CaptureSegmenterState {
  segmenter: InteractiveSegmenter;
  encodedImageSource: string | null;
}

let captureSegmenterState: CaptureSegmenterState | null = null;
let captureSegmenterPromise: Promise<CaptureSegmenterState> | null = null;

function loadSegmentationImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The resized photo could not be loaded for segmentation.'));
    image.src = source;
  });
}

async function getCaptureSegmenter() {
  if (captureSegmenterState) return captureSegmenterState;
  if (captureSegmenterPromise) return captureSegmenterPromise;
  captureSegmenterPromise = createPinnedInteractiveSegmenter(CAPTURE_SEGMENTATION_DELEGATE)
    .then((segmenter) => {
      captureSegmenterState = { segmenter, encodedImageSource: null };
      return captureSegmenterState;
    })
    .catch((error) => {
      captureSegmenterPromise = null;
      throw error;
    });
  return captureSegmenterPromise;
}

export function isUsableCaptureMaskArea(maskAreaPercent: number) {
  return Number.isFinite(maskAreaPercent)
    && maskAreaPercent >= CAPTURE_MASK_AREA_MIN_PERCENT
    && maskAreaPercent <= CAPTURE_MASK_AREA_MAX_PERCENT;
}

export function captureSegmentationDecision(
  attempt: CaptureSegmentationAttempt,
  succeeded: boolean,
): CaptureSegmentationDecision {
  if (succeeded) return 'use-cutout';
  return attempt === 'automatic' ? 'request-manual' : 'use-original';
}

export async function segmentCapturedMunchie(
  source: string,
  point: NormalizedSegmentationPoint = CAPTURE_SEGMENTATION_CENTER_POINT,
): Promise<CaptureSegmentationResult> {
  const totalStartedAt = performance.now();
  const image = await loadSegmentationImage(source);
  const initializationStartedAt = performance.now();
  const segmenterAlreadyReady = captureSegmenterState !== null;
  const initialized = await getCaptureSegmenter();
  const modelInitializationMs = segmenterAlreadyReady
    ? 0
    : performance.now() - initializationStartedAt;
  const dimensions = calculateInferenceDimensions(
    image.naturalWidth,
    image.naturalHeight,
    CAPTURE_SEGMENTATION_LONG_EDGE,
  );

  let setImageMs = 0;
  if (initialized.encodedImageSource !== source) {
    const inferenceCanvas = createInferenceCanvas(image, CAPTURE_SEGMENTATION_LONG_EDGE);
    const setImageStartedAt = performance.now();
    initialized.segmenter.setImage(inferenceCanvas);
    setImageMs = performance.now() - setImageStartedAt;
    initialized.encodedImageSource = source;
  }

  const segmentStartedAt = performance.now();
  const mask = initialized.segmenter.segment([{
    brushMode: POSITIVE_BRUSH_MODE,
    point: [point],
    isCompleted: true,
  }]);
  const segmentMs = performance.now() - segmentStartedAt;
  const maskWidth = mask.width;
  const maskHeight = mask.height;
  const maskValues = new Float32Array(mask.getAsFloat32Array());
  mask.close();
  const maskAreaPercent = calculateMaskAreaPercent(maskValues);
  const baseMetrics = {
    delegate: CAPTURE_SEGMENTATION_DELEGATE,
    inferenceWidth: dimensions.width,
    inferenceHeight: dimensions.height,
    modelInitializationMs,
    setImageMs,
    segmentMs,
    maskAreaPercent,
  };

  if (!isUsableCaptureMaskArea(maskAreaPercent)) {
    return {
      status: 'failure',
      reason: 'mask-area',
      metrics: { ...baseMetrics, totalMs: performance.now() - totalStartedAt },
    };
  }

  const cutoutImage = await createTransparentSegmentationDataUrl(
    image,
    maskValues,
    maskWidth,
    maskHeight,
  );
  return {
    status: 'success',
    cutoutImage,
    metrics: { ...baseMetrics, totalMs: performance.now() - totalStartedAt },
  };
}
