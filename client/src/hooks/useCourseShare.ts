import { RefObject } from 'react';
import html2canvas from 'html2canvas';

export function useCourseShare() {
  const captureCard = async (ref: RefObject<HTMLDivElement | null>): Promise<string> => {
    if (!ref.current) throw new Error('ref is null');
    const canvas = await html2canvas(ref.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
    });
    return canvas.toDataURL('image/png');
  };

  const downloadImage = (dataUrl: string, filename = 'course.png'): void => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  const copyLink = async (courseId: string): Promise<void> => {
    await navigator.clipboard.writeText(`${window.location.origin}/courses/${courseId}`);
  };

  return { captureCard, downloadImage, copyLink };
}
