import { RefObject } from 'react';
import { toPng } from 'html-to-image';
import { calculateTargetPixelRatio, chooseShareDelivery } from '@/lib/lunchieShare';

interface CaptureCardOptions {
  /** Render to this output width while preserving the element's CSS aspect ratio. */
  targetWidth?: number;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function useCourseShare() {
  /**
   * Capture a card element to a PNG data URL.
   * Uses html-to-image (SVG foreignObject approach) instead of html2canvas
   * because html2canvas 1.x cannot parse modern CSS color functions (oklch, lab, etc.)
   * that Tailwind v4 generates.
   */
  const captureCard = async (
    ref: RefObject<HTMLDivElement | null>,
    options?: CaptureCardOptions,
  ): Promise<string> => {
    if (!ref.current) throw new Error('ref is null');

    // 배경·코스 사진이 모두 로드된 뒤 캡처해야 빈 이미지나 저장 실패가 발생하지 않는다.
    const images = Array.from(ref.current.querySelectorAll('img'));
    await Promise.all(images.map(async image => {
      if (image.complete && image.naturalWidth > 0) return;
      if (image.complete) throw new Error(`image load failed: ${image.src}`);
      try {
        await image.decode();
      } catch {
        if (image.complete) {
          if (image.naturalWidth > 0) return;
          throw new Error(`image load failed: ${image.src}`);
        }
        await new Promise<void>((resolve, reject) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => reject(new Error(`image load failed: ${image.src}`)), { once: true });
        });
      }
    }));

    const cssWidth = ref.current.getBoundingClientRect().width || ref.current.offsetWidth;
    const targetWidth = options?.targetWidth;
    const pixelRatio = typeof targetWidth === 'number'
      ? calculateTargetPixelRatio(cssWidth, targetWidth)
      : 2;

    return toPng(ref.current, {
      pixelRatio,
      cacheBust: true,
      skipAutoScale: false,
      // Ignore elements outside the card (like Sonner toasts)
      filter: (node) => {
        if (node instanceof HTMLElement) {
          if (node.getAttribute('data-sonner-toaster') != null) return false;
          if (node.getAttribute('data-radix-popper-content-wrapper') != null) return false;
          if (node.getAttribute('data-share-editor-control') != null) return false;
        }
        return true;
      },
    });
  };

  const downloadImage = async (dataUrl: string, filename = 'course.png'): Promise<void> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    downloadBlob(blob, filename);
  };

  /**
   * Capture + save to the user's device.
   * On mobile (Web Share API), opens native share sheet.
   * On desktop, triggers direct file download.
   */
  const saveImageToDevice = async (
    ref: RefObject<HTMLDivElement | null>,
    filename = 'lunchie-course.png',
    options?: { preferNativeShare?: boolean }
  ): Promise<'download' | 'share'> => {
    const dataUrl = await captureCard(ref);
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], filename, { type: 'image/png' });

    const canShareFiles = Boolean(
      options?.preferNativeShare &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    );

    if (chooseShareDelivery(canShareFiles) === 'share') {
      await navigator.share({ files: [file], title: 'Lunchie Munchie' });
      return 'share';
    }

    downloadBlob(blob, filename);
    return 'download';
  };

  const copyLink = async (courseId: string): Promise<void> => {
    await navigator.clipboard.writeText(`${window.location.origin}/course/${courseId}`);
  };

  return { captureCard, downloadImage, saveImageToDevice, copyLink };
}
