import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CAPTURE_MASK_AREA_MAX_PERCENT,
  CAPTURE_MASK_AREA_MIN_PERCENT,
  CAPTURE_SEGMENTATION_CENTER_POINT,
  CAPTURE_SEGMENTATION_DELEGATE,
  CAPTURE_SEGMENTATION_LONG_EDGE,
  captureSegmentationDecision,
  isUsableCaptureMaskArea,
} from './munchieCaptureSegmentation';

describe('Capture MediaPipe segmentation policy', () => {
  it('uses the pinned spike strategy with CPU, 720px and a center positive point', () => {
    expect(CAPTURE_SEGMENTATION_DELEGATE).toBe('CPU');
    expect(CAPTURE_SEGMENTATION_LONG_EDGE).toBe(720);
    expect(CAPTURE_SEGMENTATION_CENTER_POINT).toEqual({ x: 0.5, y: 0.5 });
  });

  it('rejects only obviously empty or near-full masks', () => {
    expect(CAPTURE_MASK_AREA_MIN_PERCENT).toBe(1);
    expect(CAPTURE_MASK_AREA_MAX_PERCENT).toBe(92);
    expect(isUsableCaptureMaskArea(0)).toBe(false);
    expect(isUsableCaptureMaskArea(0.99)).toBe(false);
    expect(isUsableCaptureMaskArea(1)).toBe(true);
    expect(isUsableCaptureMaskArea(45)).toBe(true);
    expect(isUsableCaptureMaskArea(92)).toBe(true);
    expect(isUsableCaptureMaskArea(92.01)).toBe(false);
    expect(isUsableCaptureMaskArea(Number.NaN)).toBe(false);
  });

  it('requests one manual retry after automatic failure and then uses the original fallback', () => {
    expect(captureSegmentationDecision('automatic', true)).toBe('use-cutout');
    expect(captureSegmentationDecision('automatic', false)).toBe('request-manual');
    expect(captureSegmentationDecision('manual', true)).toBe('use-cutout');
    expect(captureSegmentationDecision('manual', false)).toBe('use-original');
  });

  it('lazy-loads MediaPipe only through the shared pinned spike loader', () => {
    const spikeSource = readFileSync(
      join(process.cwd(), 'client', 'src', 'lib', 'munchieSegmentationSpike.ts'),
      'utf8',
    );
    const captureSource = readFileSync(
      join(process.cwd(), 'client', 'src', 'lib', 'munchieCaptureSegmentation.ts'),
      'utf8',
    );
    const spikePageSource = readFileSync(
      join(process.cwd(), 'client', 'src', 'pages', 'MunchieSegmentationTestPage.tsx'),
      'utf8',
    );

    expect(spikeSource).toContain("await import('@mediapipe/tasks-vision')");
    expect(captureSource).toContain('createPinnedInteractiveSegmenter(CAPTURE_SEGMENTATION_DELEGATE)');
    expect(captureSource).not.toContain("import('@mediapipe/tasks-vision')");
    expect(spikePageSource).toContain('createPinnedInteractiveSegmenter(delegate)');
  });

  it('runs resize, segmentation and IndexedDB-backed collection write before Reveal', () => {
    const pageSource = readFileSync(
      join(process.cwd(), 'client', 'src', 'pages', 'MunchieCapturePrototypePage.tsx'),
      'utf8',
    );
    const captureStart = pageSource.indexOf('const handleFileChange');
    const manualStart = pageSource.indexOf('const retrySegmentationAtPoint');
    const captureFlow = pageSource.slice(captureStart, manualStart);

    const resize = captureFlow.indexOf('await fileToResizedDataUrl');
    const segmentation = captureFlow.indexOf('segmentCapturedMunchie');
    const write = captureFlow.indexOf('await persistCapturedMunchie');
    expect(resize).toBeGreaterThan(-1);
    expect(segmentation).toBeGreaterThan(resize);
    expect(write).toBeGreaterThan(segmentation);
    expect(captureFlow).toContain("setPhase('manualSegmentation')");
    expect(pageSource).toContain("captureSegmentationDecision('manual'");
    expect(pageSource).toContain('persistCapturedMunchie(source, undefined, requestId, true)');
  });
});
