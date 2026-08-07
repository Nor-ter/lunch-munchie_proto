import { useEffect, useState, type CSSProperties, type ImgHTMLAttributes } from 'react';
import type { CoursemapTemplate } from '@/constants/coursemapTemplates';

type LayerImageProps = Pick<ImgHTMLAttributes<HTMLImageElement>, 'loading'> & {
  template: CoursemapTemplate;
};

const frameOverlayCache = new Map<string, Promise<string | null>>();

function createFrameOverlay(template: CoursemapTemplate): Promise<string | null> {
  const cacheKey = `${template.image}:connected-paper-v2`;
  const cached = frameOverlayCache.get(cacheKey);
  if (cached) return cached;

  const pending = new Promise<string | null>((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        resolve(null);
        return;
      }

      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixelCount = canvas.width * canvas.height;
      const queued = new Uint8Array(pixelCount);
      const queue = new Int32Array(pixelCount);
      let head = 0;
      let tail = 0;

      const isConnectedPaper = (pixelIndex: number) => {
        const offset = pixelIndex * 4;
        const red = pixels.data[offset] ?? 0;
        const green = pixels.data[offset + 1] ?? 0;
        const blue = pixels.data[offset + 2] ?? 0;
        const lightness = (red + green + blue) / 3;
        const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
        return lightness > 138 && chroma < 74 && red > 138 && green > 126 && blue > 110;
      };

      const enqueue = (x: number, y: number) => {
        if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return;
        const pixelIndex = y * canvas.width + x;
        if (queued[pixelIndex]) return;
        queued[pixelIndex] = 1;
        queue[tail] = pixelIndex;
        tail += 1;
      };

      // 중앙 종이의 여러 지점에서 시작해 실제로 이어진 영역만 제거한다.
      // 프레임 장식은 색상 경계에서 탐색이 멈추므로 원래 윤곽 그대로 남는다.
      [0.38, 0.5, 0.62].forEach(yRatio => {
        [0.38, 0.5, 0.62].forEach(xRatio => {
          enqueue(Math.round(canvas.width * xRatio), Math.round(canvas.height * yRatio));
        });
      });

      while (head < tail) {
        const pixelIndex = queue[head] ?? 0;
        head += 1;
        if (!isConnectedPaper(pixelIndex)) continue;

        pixels.data[pixelIndex * 4 + 3] = 0;
        const x = pixelIndex % canvas.width;
        const y = Math.floor(pixelIndex / canvas.width);
        enqueue(x - 1, y);
        enqueue(x + 1, y);
        enqueue(x, y - 1);
        enqueue(x, y + 1);
      }

      context.putImageData(pixels, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => resolve(null);
    image.src = template.image;
  });

  frameOverlayCache.set(cacheKey, pending);
  return pending;
}

export function TemplateBackgroundLayer({ template, loading = 'lazy' }: LayerImageProps) {
  if (template.transparentFrame) {
    return (
      <div
        aria-hidden="true"
        data-template-layer="background"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none bg-white"
      />
    );
  }

  return (
    <img
      src={template.image}
      alt={`${template.name} Munchie 피드 배경`}
      data-template-layer="background"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-cover"
      draggable={false}
      loading={loading}
    />
  );
}

export function TemplateFrameLayer({ template, loading = 'lazy' }: LayerImageProps) {
  const [frameSource, setFrameSource] = useState<string | null>(null);
  const [directFrameFailed, setDirectFrameFailed] = useState(false);
  const { top, right, bottom, left } = template.frameInset;
  const frameMask: CSSProperties = {
    padding: `${top}% ${right}% ${bottom}% ${left}%`,
    WebkitMaskImage: 'linear-gradient(#000 0 0), linear-gradient(#000 0 0)',
    WebkitMaskOrigin: 'content-box, border-box',
    WebkitMaskClip: 'content-box, border-box',
    WebkitMaskComposite: 'xor',
    maskImage: 'linear-gradient(#000 0 0), linear-gradient(#000 0 0)',
    maskOrigin: 'content-box, border-box',
    maskClip: 'content-box, border-box',
    maskComposite: 'exclude',
  };

  useEffect(() => {
    setDirectFrameFailed(false);
    if (template.transparentFrame && template.frameImage) {
      setFrameSource(null);
      return;
    }
    let active = true;
    setFrameSource(null);
    createFrameOverlay(template).then(source => {
      if (active) setFrameSource(source);
    });
    return () => { active = false; };
  }, [template]);

  useEffect(() => {
    if (!template.transparentFrame || !template.frameImage || !directFrameFailed) return;
    let active = true;
    createFrameOverlay(template).then(source => {
      if (active) setFrameSource(source);
    });
    return () => { active = false; };
  }, [directFrameFailed, template]);

  const shouldUseDirectFrame = template.transparentFrame && template.frameImage && !directFrameFailed;

  return (
    <img
      src={shouldUseDirectFrame ? template.frameImage : frameSource ?? template.image}
      alt=""
      aria-hidden="true"
      data-template-layer="frame"
      data-frame-ready={shouldUseDirectFrame || frameSource ? 'true' : 'false'}
      className="pointer-events-none absolute inset-0 z-50 h-full w-full select-none object-cover"
      style={shouldUseDirectFrame || frameSource ? undefined : frameMask}
      onError={() => {
        if (shouldUseDirectFrame) setDirectFrameFailed(true);
      }}
      draggable={false}
      loading={loading}
    />
  );
}
