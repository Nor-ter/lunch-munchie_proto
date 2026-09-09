import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  calculateInferenceDimensions,
  calculateMaskAreaPercent,
  confidenceToAlpha,
  describeSegmentationSpeed,
  INFERENCE_LONG_EDGE_OPTIONS,
  MAGIC_TOUCH_MODEL_URL,
  maskIndexForOutputPixel,
  MEDIAPIPE_TASKS_VISION_VERSION,
  MEDIAPIPE_WASM_BASE_URL,
  normalizedPointFromClient,
  POSITIVE_BRUSH_MODE,
} from './munchieSegmentationSpike';

describe('Munchie segmentation spike configuration', () => {
  it('pins the package, WASM and MagicTouch model versions', () => {
    expect(MEDIAPIPE_TASKS_VISION_VERSION).toBe('1.0.1');
    expect(MEDIAPIPE_WASM_BASE_URL).toContain('@mediapipe/tasks-vision@1.0.1/wasm');
    expect(MAGIC_TOUCH_MODEL_URL).toContain('/magic_touch/int8/1/');
    expect(`${MEDIAPIPE_WASM_BASE_URL}${MAGIC_TOUCH_MODEL_URL}`).not.toContain('@latest');
    expect(`${MEDIAPIPE_WASM_BASE_URL}${MAGIC_TOUCH_MODEL_URL}`).not.toContain('/latest/');
    expect(POSITIVE_BRUSH_MODE).toBe(1);
    const source = readFileSync(
      join(process.cwd(), 'client', 'src', 'lib', 'munchieSegmentationSpike.ts'),
      'utf8',
    );
    expect(source).toContain('InteractiveSegmenter.createFromOptions');
    expect(source).toContain('createTransparentSegmentationDataUrl');
    expect(source).toContain("canvas.toBlob((webpBlob)");
    expect(source).toContain("'image/png'");
  });

  it('converts and clamps clicks to normalized image coordinates', () => {
    const bounds = { left: 100, top: 50, width: 400, height: 200 };
    expect(normalizedPointFromClient(300, 150, bounds)).toEqual({ x: 0.5, y: 0.5 });
    expect(normalizedPointFromClient(20, 400, bounds)).toEqual({ x: 0, y: 1 });
  });

  it('creates long-edge working dimensions without upscaling the source', () => {
    expect(INFERENCE_LONG_EDGE_OPTIONS).toEqual([720, 512, 384]);
    expect(calculateInferenceDimensions(4032, 3024, 720)).toEqual({ width: 720, height: 540 });
    expect(calculateInferenceDimensions(3024, 4032, 512)).toEqual({ width: 384, height: 512 });
    expect(calculateInferenceDimensions(300, 200, 384)).toEqual({ width: 300, height: 200 });
  });

  it('maps a small inference mask across the output image resolution', () => {
    expect(maskIndexForOutputPixel(0, 0, 1200, 900, 256, 192)).toBe(0);
    expect(maskIndexForOutputPixel(1199, 899, 1200, 900, 256, 192)).toBe(256 * 192 - 1);
  });

  it('classifies segment time using the prototype feasibility thresholds', () => {
    expect(describeSegmentationSpeed(1500)).toBe('Main flow candidate');
    expect(describeSegmentationSpeed(3000)).toBe('Acceptable with Processing animation');
    expect(describeSegmentationSpeed(5000)).toBe('Fallback / supporting feature only');
    expect(describeSegmentationSpeed(5001)).toBe('Do not use in the automatic Saturday demo flow');
  });

  it('measures selected mask area and preserves a feathered confidence edge', () => {
    expect(calculateMaskAreaPercent(new Float32Array([0.1, 0.5, 0.8, 0.49]))).toBe(50);
    expect(confidenceToAlpha(0.1)).toBe(0);
    expect(confidenceToAlpha(0.5)).toBeGreaterThan(0);
    expect(confidenceToAlpha(0.5)).toBeLessThan(255);
    expect(confidenceToAlpha(0.9)).toBe(255);
  });
});
