/** 업로드한 이미지 파일을 지정한 최대 변 길이로 줄여 JPEG data URL로 반환 — localStorage quota 보호 */
export function fileToResizedDataUrl(
  file: File,
  maxDim = 800,
  quality = 0.8,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas
        .getContext("2d")!
        .drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export interface ImageSize {
  width: number;
  height: number;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CropHandle =
  | "move"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "nw";

/** object-contain으로 표시한 이미지가 stage 안에서 차지하는 실제 영역을 계산한다. */
export function getContainedImageBounds(
  image: ImageSize,
  stage: ImageSize,
): CropArea {
  const scale = Math.min(
    stage.width / image.width,
    stage.height / image.height,
  );
  const width = image.width * scale;
  const height = image.height * scale;
  return {
    x: (stage.width - width) / 2,
    y: (stage.height - height) / 2,
    width,
    height,
  };
}

/**
 * 선택한 crop 영역이 stage 안에 최대한 크게 보이도록 원본 이미지의 표시 영역을 계산한다.
 * 원본 좌표는 유지하므로 확대된 상태에서도 crop을 다시 넓히거나 원본으로 복원할 수 있다.
 */
export function getCropViewportImageBounds(
  image: ImageSize,
  stage: ImageSize,
  focus: CropArea,
  padding = 18,
): CropArea {
  const availableWidth = Math.max(1, stage.width - padding * 2);
  const availableHeight = Math.max(1, stage.height - padding * 2);
  const focusWidth = Math.max(1, focus.width * image.width);
  const focusHeight = Math.max(1, focus.height * image.height);
  const scale = Math.min(
    availableWidth / focusWidth,
    availableHeight / focusHeight,
  );
  const width = image.width * scale;
  const height = image.height * scale;
  const renderedFocusWidth = focus.width * width;
  const renderedFocusHeight = focus.height * height;
  const focusLeft = (stage.width - renderedFocusWidth) / 2;
  const focusTop = (stage.height - renderedFocusHeight) / 2;

  return {
    x: focusLeft - focus.x * width,
    y: focusTop - focus.y * height,
    width,
    height,
  };
}

/** 0~1 정규화 좌표의 crop 박스를 이동하거나 자유 비율로 resize한다. */
export function updateCropArea(
  crop: CropArea,
  handle: CropHandle,
  delta: { x: number; y: number },
  minimum: { width: number; height: number },
): CropArea {
  if (handle === "move") {
    return {
      ...crop,
      x: Math.min(1 - crop.width, Math.max(0, crop.x + delta.x)),
      y: Math.min(1 - crop.height, Math.max(0, crop.y + delta.y)),
    };
  }

  let left = crop.x;
  let top = crop.y;
  let right = crop.x + crop.width;
  let bottom = crop.y + crop.height;

  if (handle.includes("w"))
    left = Math.min(right - minimum.width, Math.max(0, left + delta.x));
  if (handle.includes("e"))
    right = Math.max(left + minimum.width, Math.min(1, right + delta.x));
  if (handle.includes("n"))
    top = Math.min(bottom - minimum.height, Math.max(0, top + delta.y));
  if (handle.includes("s"))
    bottom = Math.max(top + minimum.height, Math.min(1, bottom + delta.y));

  return { x: left, y: top, width: right - left, height: bottom - top };
}

function loadCanvasImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // 외부 코스 사진도 canvas로 내보낼 수 있도록 CORS 허용 이미지로 요청한다.
    if (!src.startsWith("data:") && !src.startsWith("blob:"))
      image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("이미지를 편집용으로 불러오지 못했습니다."));
    image.src = src;
  });
}

/** 자유 비율 crop 영역을 그 비율 그대로 JPEG data URL로 만든다. */
export async function cropImageToDataUrl(
  src: string,
  crop: CropArea,
  maxOutputDimension = 800,
  quality = 0.82,
): Promise<string> {
  const image = await loadCanvasImage(src);
  const source = {
    x: crop.x * image.naturalWidth,
    y: crop.y * image.naturalHeight,
    width: crop.width * image.naturalWidth,
    height: crop.height * image.naturalHeight,
  };
  const outputScale = Math.min(
    1,
    maxOutputDimension / Math.max(source.width, source.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * outputScale));
  canvas.height = Math.max(1, Math.round(source.height * outputScale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("사진 편집을 지원하지 않는 브라우저입니다.");
  context.drawImage(
    image,
    source.x,
    source.y,
    source.width,
    source.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  return canvas.toDataURL("image/jpeg", quality);
}
