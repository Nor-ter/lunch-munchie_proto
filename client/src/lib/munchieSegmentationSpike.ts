import type { BrushMode, InteractiveSegmenter } from '@mediapipe/tasks-vision';

export const MEDIAPIPE_TASKS_VISION_VERSION = '1.0.1';
export const MEDIAPIPE_WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_TASKS_VISION_VERSION}/wasm`;
export const MAGIC_TOUCH_MODEL_VERSION = '1';
export const MAGIC_TOUCH_MODEL_URL = `https://storage.googleapis.com/mediapipe-models/interactive_segmenter_v2/magic_touch/int8/${MAGIC_TOUCH_MODEL_VERSION}/interactive_segmentation.task`;
export const SEGMENTATION_DELEGATES = ['CPU', 'GPU'] as const;
export const INFERENCE_LONG_EDGE_OPTIONS = [720, 512, 384] as const;

export type SegmentationDelegate = typeof SEGMENTATION_DELEGATES[number];
export type InferenceLongEdge = typeof INFERENCE_LONG_EDGE_OPTIONS[number];

// tasks-vision 1.0.1 declares BrushMode in vision.d.ts but does not export it
// from its runtime ESM bundle. POSITIVE is protobuf enum value 1 in that release.
export const POSITIVE_BRUSH_MODE = 1 as BrushMode;

export interface NormalizedSegmentationPoint {
  x: number;
  y: number;
}

export interface InferenceDimensions {
  width: number;
  height: number;
}

export async function createPinnedInteractiveSegmenter(
  delegate: SegmentationDelegate,
): Promise<InteractiveSegmenter> {
  const mediaPipe = await import('@mediapipe/tasks-vision');
  const wasmFileset = await mediaPipe.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE_URL);
  return mediaPipe.InteractiveSegmenter.createFromOptions(wasmFileset, {
    baseOptions: {
      modelAssetPath: MAGIC_TOUCH_MODEL_URL,
      delegate,
    },
  });
}

const MAX_RESULT_DIMENSION = 1200;

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function calculateInferenceDimensions(
  sourceWidth: number,
  sourceHeight: number,
  longEdge: InferenceLongEdge,
): InferenceDimensions {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error('The image has invalid dimensions.');
  }
  const scale = Math.min(1, longEdge / Math.max(sourceWidth, sourceHeight));
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

export function createInferenceCanvas(
  image: HTMLImageElement,
  longEdge: InferenceLongEdge,
) {
  const dimensions = calculateInferenceDimensions(
    image.naturalWidth,
    image.naturalHeight,
    longEdge,
  );
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable in this browser.');
  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
  return canvas;
}

export function segmentationRunKey(
  delegate: SegmentationDelegate,
  longEdge: InferenceLongEdge,
) {
  return `${delegate}-${longEdge}` as const;
}

export function describeSegmentationSpeed(segmentMs: number) {
  if (segmentMs <= 1500) return 'Main flow candidate';
  if (segmentMs <= 3000) return 'Acceptable with Processing animation';
  if (segmentMs <= 5000) return 'Fallback / supporting feature only';
  return 'Do not use in the automatic Saturday demo flow';
}

export function normalizedPointFromClient(
  clientX: number,
  clientY: number,
  bounds: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
): NormalizedSegmentationPoint {
  if (bounds.width <= 0 || bounds.height <= 0) return { x: 0.5, y: 0.5 };
  return {
    x: clamp((clientX - bounds.left) / bounds.width),
    y: clamp((clientY - bounds.top) / bounds.height),
  };
}

export function calculateMaskAreaPercent(mask: Float32Array, threshold = 0.5) {
  if (mask.length === 0) return 0;
  let selectedPixels = 0;
  for (let index = 0; index < mask.length; index += 1) {
    if ((mask[index] ?? 0) >= threshold) selectedPixels += 1;
  }
  return selectedPixels / mask.length * 100;
}

export function confidenceToAlpha(confidence: number) {
  const normalized = clamp((confidence - 0.28) / 0.44);
  const smoothed = normalized * normalized * (3 - 2 * normalized);
  return Math.round(smoothed * 255);
}

export function maskIndexForOutputPixel(
  x: number,
  y: number,
  outputWidth: number,
  outputHeight: number,
  maskWidth: number,
  maskHeight: number,
) {
  const maskX = Math.min(maskWidth - 1, Math.floor(x / outputWidth * maskWidth));
  const maskY = Math.min(maskHeight - 1, Math.floor(y / outputHeight * maskHeight));
  return maskY * maskWidth + maskX;
}

function canvasToTransparentBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((webpBlob) => {
      if (webpBlob) {
        resolve(webpBlob);
        return;
      }
      canvas.toBlob((pngBlob) => {
        if (pngBlob) resolve(pngBlob);
        else reject(new Error('The browser could not export the transparent result.'));
      }, 'image/png');
    }, 'image/webp', 0.92);
  });
}

export async function createTransparentSegmentationBlob(
  image: HTMLImageElement,
  mask: Float32Array,
  maskWidth: number,
  maskHeight: number,
) {
  if (!image.naturalWidth || !image.naturalHeight || !maskWidth || !maskHeight) {
    throw new Error('The image or segmentation mask has invalid dimensions.');
  }
  if (mask.length < maskWidth * maskHeight) {
    throw new Error('The segmentation mask is incomplete.');
  }

  const scale = Math.min(
    1,
    MAX_RESULT_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas is unavailable in this browser.');

  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelOffset = (y * width + x) * 4;
      const maskConfidence = mask[
        maskIndexForOutputPixel(x, y, width, height, maskWidth, maskHeight)
      ] ?? 0;
      const sourceAlpha = pixels.data[pixelOffset + 3] ?? 255;
      pixels.data[pixelOffset + 3] = Math.round(
        sourceAlpha * confidenceToAlpha(maskConfidence) / 255,
      );
    }
  }
  context.putImageData(pixels, 0, 0);
  return canvasToTransparentBlob(canvas);
}

export async function createTransparentSegmentationResult(
  image: HTMLImageElement,
  mask: Float32Array,
  maskWidth: number,
  maskHeight: number,
) {
  return URL.createObjectURL(await createTransparentSegmentationBlob(
    image,
    mask,
    maskWidth,
    maskHeight,
  ));
}

export async function createTransparentSegmentationDataUrl(
  image: HTMLImageElement,
  mask: Float32Array,
  maskWidth: number,
  maskHeight: number,
) {
  const blob = await createTransparentSegmentationBlob(image, mask, maskWidth, maskHeight);
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('The transparent result could not be encoded.'));
    reader.onerror = () => reject(reader.error ?? new Error('The transparent result could not be read.'));
    reader.readAsDataURL(blob);
  });
}
