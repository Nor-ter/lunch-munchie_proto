import { RefObject } from 'react';
import { toPng } from 'html-to-image';

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
  const captureCard = async (ref: RefObject<HTMLDivElement | null>): Promise<string> => {
    if (!ref.current) throw new Error('ref is null');

    return toPng(ref.current, {
      pixelRatio: 2,
      cacheBust: true,
      skipAutoScale: false,
      // Ignore elements outside the card (like Sonner toasts)
      filter: (node) => {
        if (node instanceof HTMLElement) {
          if (node.getAttribute('data-sonner-toaster') != null) return false;
          if (node.getAttribute('data-radix-popper-content-wrapper') != null) return false;
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

    if (
      options?.preferNativeShare &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
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
