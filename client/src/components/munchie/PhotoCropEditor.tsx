import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Crop, RotateCcw, X } from "lucide-react";
import {
  cropImageToDataUrl,
  getCropViewportImageBounds,
  updateCropArea,
  type CropArea,
  type CropHandle,
  type ImageSize,
} from "@/lib/imageUtils";
import { acquireDocumentScrollLock } from "@/lib/documentScrollLock";

interface PhotoCropEditorProps {
  src: string;
  initialCrop?: CropArea;
  onCancel: () => void;
  onSave: (dataUrl: string, crop: CropArea) => void;
}

const INITIAL_CROP: CropArea = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
const FULL_CROP: CropArea = { x: 0, y: 0, width: 1, height: 1 };
const HANDLE_LABELS: Record<Exclude<CropHandle, "move">, string> = {
  n: "위쪽 크롭 경계 조절",
  ne: "오른쪽 위 크롭 모서리 조절",
  e: "오른쪽 크롭 경계 조절",
  se: "오른쪽 아래 크롭 모서리 조절",
  s: "아래쪽 크롭 경계 조절",
  sw: "왼쪽 아래 크롭 모서리 조절",
  w: "왼쪽 크롭 경계 조절",
  nw: "왼쪽 위 크롭 모서리 조절",
};

const HANDLE_STYLES: Record<Exclude<CropHandle, "move">, string> = {
  n: "left-1/2 top-0 h-3 w-10 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
  ne: "right-0 top-0 h-5 w-5 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
  e: "right-0 top-1/2 h-10 w-3 translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  se: "bottom-0 right-0 h-5 w-5 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
  s: "bottom-0 left-1/2 h-3 w-10 -translate-x-1/2 translate-y-1/2 cursor-ns-resize",
  sw: "bottom-0 left-0 h-5 w-5 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
  w: "left-0 top-1/2 h-10 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  nw: "left-0 top-0 h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
};

export default function PhotoCropEditor({
  src,
  initialCrop,
  onCancel,
  onSave,
}: PhotoCropEditorProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    crop: CropArea;
    handle: CropHandle;
    imageBounds: CropArea;
  } | null>(null);
  const initialCropRef = useRef<CropArea>(initialCrop ?? INITIAL_CROP);
  const latestCropRef = useRef<CropArea>(initialCropRef.current);
  const [stageSize, setStageSize] = useState<ImageSize>({
    width: 398,
    height: 400,
  });
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [crop, setCrop] = useState<CropArea>(initialCropRef.current);
  const [focusCrop, setFocusCrop] = useState<CropArea>(
    initialCrop ? initialCropRef.current : FULL_CROP,
  );
  const [isInteracting, setIsInteracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const releaseScrollLock = acquireDocumentScrollLock();
    const stage = stageRef.current;
    const updateSize = () => {
      const rect = stage?.getBoundingClientRect();
      if (rect) setStageSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const observer = stage ? new ResizeObserver(updateSize) : null;
    if (stage && observer) observer.observe(stage);
    return () => {
      releaseScrollLock();
      observer?.disconnect();
    };
  }, []);

  const imageBounds = useMemo(
    () =>
      imageSize
        ? getCropViewportImageBounds(imageSize, stageSize, focusCrop)
        : null,
    [focusCrop, imageSize, stageSize],
  );
  const cropStyle = imageBounds
    ? {
        left: imageBounds.x + crop.x * imageBounds.width,
        top: imageBounds.y + crop.y * imageBounds.height,
        width: crop.width * imageBounds.width,
        height: crop.height * imageBounds.height,
      }
    : undefined;
  const cropRatio = imageSize
    ? (crop.width * imageSize.width) / (crop.height * imageSize.height)
    : 1;

  const reset = () => {
    latestCropRef.current = FULL_CROP;
    setCrop(FULL_CROP);
    setFocusCrop(FULL_CROP);
    setIsInteracting(false);
    setError("");
  };

  const save = async () => {
    if (!imageSize || saving) return;
    setSaving(true);
    setError("");
    try {
      onSave(await cropImageToDataUrl(src, crop), crop);
    } catch {
      setError(
        "이 사진은 보안 설정 때문에 크롭 결과를 저장할 수 없어요. 직접 업로드한 사진을 사용해주세요.",
      );
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-crop-title"
    >
      <div className="w-full max-w-[430px] rounded-t-[28px] bg-[#FCF4EE] px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 shadow-2xl sm:rounded-[28px]">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            aria-label="사진 편집 취소"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#6E5B50] shadow-sm"
          >
            <X size={18} />
          </button>
          <div className="text-center">
            <p
              id="photo-crop-title"
              className="flex items-center gap-1.5 text-[16px] font-bold text-[#1A1A1A]"
            >
              <Crop size={16} /> 사진 크롭
            </p>
            <p className="mt-0.5 text-[11px] text-[#9B9B9B]">
              프레임을 놓으면 선택 영역이 확대돼요
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            aria-label="원본 크기로 되돌리기"
            className="flex h-9 items-center justify-center gap-1 rounded-full bg-white px-3 text-[11px] font-bold text-[#6E5B50] shadow-sm"
          >
            <RotateCcw size={14} /> 원본
          </button>
        </div>

        <div
          ref={stageRef}
          data-testid="crop-stage"
          className="relative h-[min(52vh,420px)] w-full touch-none select-none overflow-hidden rounded-2xl bg-[#171513]"
          onPointerDown={(event) => {
            if (!imageBounds) return;
            const action = (event.target as HTMLElement).closest<HTMLElement>(
              "[data-crop-action]",
            )?.dataset.cropAction as CropHandle | undefined;
            if (!action) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = {
              pointerId: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              crop,
              handle: action,
              imageBounds,
            };
            latestCropRef.current = crop;
            setIsInteracting(true);
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId)
              return;
            const nextCrop = updateCropArea(
              drag.crop,
              drag.handle,
              {
                x: (event.clientX - drag.x) / drag.imageBounds.width,
                y: (event.clientY - drag.y) / drag.imageBounds.height,
              },
              {
                width: 56 / drag.imageBounds.width,
                height: 56 / drag.imageBounds.height,
              },
            );
            latestCropRef.current = nextCrop;
            setCrop(nextCrop);
          }}
          onPointerUp={(event) => {
            if (dragRef.current?.pointerId === event.pointerId) {
              dragRef.current = null;
              setFocusCrop(latestCropRef.current);
              setIsInteracting(false);
            }
          }}
          onPointerCancel={() => {
            const drag = dragRef.current;
            if (drag) {
              latestCropRef.current = drag.crop;
              setCrop(drag.crop);
              setFocusCrop(drag.crop);
            }
            dragRef.current = null;
            setIsInteracting(false);
          }}
        >
          {imageBounds && (
            <img
              src={src}
              alt="크롭할 사진"
              draggable={false}
              data-testid="crop-image"
              className={`pointer-events-none absolute max-w-none ${isInteracting ? "" : "transition-[left,top,width,height] duration-300 ease-out"}`}
              style={{
                left: imageBounds.x,
                top: imageBounds.y,
                width: imageBounds.width,
                height: imageBounds.height,
              }}
            />
          )}
          <img
            src={src}
            alt=""
            draggable={false}
            onLoad={(event) =>
              setImageSize({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })
            }
            className="pointer-events-none absolute h-px w-px opacity-0"
          />
          {cropStyle && (
            <div
              data-crop-action="move"
              aria-label="크롭 영역 이동"
              className={`absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.58)] ${isInteracting ? "" : "transition-[left,top,width,height] duration-300 ease-out"}`}
              style={cropStyle}
            >
              <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                {Array.from({ length: 9 }).map((_, index) => (
                  <span
                    key={index}
                    className="border-[0.5px] border-white/45"
                  />
                ))}
              </div>
              {(
                Object.keys(HANDLE_LABELS) as Array<Exclude<CropHandle, "move">>
              ).map((handle) => (
                <button
                  key={handle}
                  type="button"
                  data-crop-action={handle}
                  aria-label={HANDLE_LABELS[handle]}
                  className={`absolute z-10 rounded-[2px] border border-[#6E5B50] bg-white shadow ${HANDLE_STYLES[handle]}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-[12px]">
          <span className="font-semibold text-[#6E5B50]">자유 비율</span>
          <span className="font-bold text-[#E85053]">
            {cropRatio.toFixed(2)} : 1
          </span>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-[#FFF0F0] px-3 py-2 text-[12px] leading-relaxed text-[#C43D40]"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={save}
          disabled={!imageSize || saving}
          className="mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#EB5053] text-[15px] font-bold text-white shadow-lg disabled:bg-[#E5CFC5]"
        >
          <Check size={18} strokeWidth={3} />{" "}
          {saving ? "사진 적용 중..." : "크롭 적용"}
        </button>
      </div>
    </div>
  );
}
