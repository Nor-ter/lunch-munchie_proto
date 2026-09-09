const CUTOUT_MAX_DIMENSION = 420;
const CUTOUT_MAX_DATA_URL_LENGTH = 650_000;

type Rgb = readonly [number, number, number];

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load the resized image.'));
    image.src = source;
  });
}

function colorDistanceSquared(data: Uint8ClampedArray, offset: number, color: Rgb) {
  const red = data[offset]! - color[0];
  const green = data[offset + 1]! - color[1];
  const blue = data[offset + 2]! - color[2];
  return red * red + green * green + blue * blue;
}

function averageColor(data: Uint8ClampedArray, offsets: readonly number[]): Rgb {
  let red = 0;
  let green = 0;
  let blue = 0;
  for (const offset of offsets) {
    red += data[offset]!;
    green += data[offset + 1]!;
    blue += data[offset + 2]!;
  }
  const count = Math.max(1, offsets.length);
  return [red / count, green / count, blue / count];
}

function cornerSampleOffsets(width: number, height: number) {
  const patchWidth = Math.max(2, Math.round(width * 0.07));
  const patchHeight = Math.max(2, Math.round(height * 0.07));
  const step = Math.max(1, Math.round(Math.min(width, height) / 80));
  const offsets: number[] = [];
  const corners = [
    [0, 0],
    [width - patchWidth, 0],
    [0, height - patchHeight],
    [width - patchWidth, height - patchHeight],
  ] as const;

  for (const [startX, startY] of corners) {
    for (let y = startY; y < startY + patchHeight; y += step) {
      for (let x = startX; x < startX + patchWidth; x += step) {
        offsets.push((y * width + x) * 4);
      }
    }
  }
  return offsets;
}

function isUsableBackground(data: Uint8ClampedArray, offsets: readonly number[], background: Rgb) {
  if (offsets.length === 0) return false;
  let totalDistance = 0;
  let farSamples = 0;
  for (const offset of offsets) {
    const distance = Math.sqrt(colorDistanceSquared(data, offset, background));
    totalDistance += distance;
    if (distance > 78) farSamples += 1;
  }
  return totalDistance / offsets.length < 46 && farSamples / offsets.length < 0.16;
}

/**
 * Conservative, dependency-free prototype cutout for photos with a reasonably
 * consistent background touching the image edges. Ambiguous photos intentionally
 * return undefined so the original-image sticker fallback remains trustworthy.
 */
export async function createPrototypeFoodCutout(source: string): Promise<string | undefined> {
  const image = await loadImage(source);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (!width || !height) return undefined;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return undefined;
  context.drawImage(image, 0, 0, width, height);

  const imageData = context.getImageData(0, 0, width, height);
  const { data } = imageData;
  const sampleOffsets = cornerSampleOffsets(width, height);
  const background = averageColor(data, sampleOffsets);
  if (!isUsableBackground(data, sampleOffsets, background)) return undefined;

  let averageDeviation = 0;
  for (const offset of sampleOffsets) {
    averageDeviation += Math.sqrt(colorDistanceSquared(data, offset, background));
  }
  averageDeviation /= Math.max(1, sampleOffsets.length);
  const threshold = Math.min(72, Math.max(42, 30 + averageDeviation * 1.8));
  const thresholdSquared = threshold * threshold;
  const pixelCount = width * height;
  const backgroundMask = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let queueStart = 0;
  let queueEnd = 0;

  const enqueueIfBackground = (pixelIndex: number) => {
    if (backgroundMask[pixelIndex]) return;
    if (colorDistanceSquared(data, pixelIndex * 4, background) > thresholdSquared) return;
    backgroundMask[pixelIndex] = 1;
    queue[queueEnd] = pixelIndex;
    queueEnd += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueueIfBackground(x);
    enqueueIfBackground((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueueIfBackground(y * width);
    enqueueIfBackground(y * width + width - 1);
  }

  while (queueStart < queueEnd) {
    const pixelIndex = queue[queueStart]!;
    queueStart += 1;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    if (x > 0) enqueueIfBackground(pixelIndex - 1);
    if (x + 1 < width) enqueueIfBackground(pixelIndex + 1);
    if (y > 0) enqueueIfBackground(pixelIndex - width);
    if (y + 1 < height) enqueueIfBackground(pixelIndex + width);
  }

  const removedRatio = queueEnd / pixelCount;
  if (removedRatio < 0.1 || removedRatio > 0.86) return undefined;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const offset = pixelIndex * 4;
    if (backgroundMask[pixelIndex]) {
      data[offset + 3] = 0;
      continue;
    }
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    const touchesBackground = (
      (x > 0 && backgroundMask[pixelIndex - 1])
      || (x + 1 < width && backgroundMask[pixelIndex + 1])
      || (y > 0 && backgroundMask[pixelIndex - width])
      || (y + 1 < height && backgroundMask[pixelIndex + width])
    );
    if (touchesBackground) data[offset + 3] = Math.min(data[offset + 3]!, 210);
  }

  if (maxX < minX || maxY < minY) return undefined;
  const subjectWidth = maxX - minX + 1;
  const subjectHeight = maxY - minY + 1;
  if (subjectWidth < width * 0.16 || subjectHeight < height * 0.16) return undefined;

  context.putImageData(imageData, 0, 0);
  const padding = Math.max(5, Math.round(Math.max(subjectWidth, subjectHeight) * 0.04));
  const sourceX = Math.max(0, minX - padding);
  const sourceY = Math.max(0, minY - padding);
  const sourceWidth = Math.min(width - sourceX, subjectWidth + padding * 2);
  const sourceHeight = Math.min(height - sourceY, subjectHeight + padding * 2);
  const scale = Math.min(1, CUTOUT_MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));

  const output = document.createElement('canvas');
  output.width = Math.max(1, Math.round(sourceWidth * scale));
  output.height = Math.max(1, Math.round(sourceHeight * scale));
  const outputContext = output.getContext('2d');
  if (!outputContext) return undefined;
  outputContext.drawImage(
    canvas,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    output.width,
    output.height,
  );

  const result = output.toDataURL('image/webp', 0.9);
  return result.length <= CUTOUT_MAX_DATA_URL_LENGTH ? result : undefined;
}
