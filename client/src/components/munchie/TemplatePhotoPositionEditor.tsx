import { useRef, useState, type ChangeEvent, type Dispatch, type PointerEvent, type SetStateAction } from 'react';
import { Plus, RotateCcw, RotateCw, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import type { CoursemapTemplate } from '@/constants/coursemapTemplates';
import { MAX_MUNCHIE_FEED_PHOTOS, type PlacedPhoto } from '@/lib/coursemapDecor';
import { fileToResizedDataUrl } from '@/lib/imageUtils';
import { TemplateBackgroundLayer, TemplateFrameLayer } from '@/components/munchie/TemplateLayers';

export function createTemplatePhotoPlacement(
  src: string,
  index: number,
  template: CoursemapTemplate,
): PlacedPhoto {
  const slot = template.slots[index % Math.max(template.slots.length, 1)];
  return {
    id: `placed_${Date.now()}_${index}_${Math.round(Math.random() * 999)}`,
    src,
    originalSrc: src,
    x: slot ? slot.left + slot.width / 2 : 38 + index * 12,
    y: slot ? slot.top + slot.height / 2 : 30 + index * 16,
    w: slot?.width ?? 36,
    h: slot?.height ?? 27,
    zoom: 1,
    rotate: slot?.rotate ?? (index % 2 === 0 ? -2 : 2),
  };
}

export default function TemplatePhotoPositionEditor({
  template,
  placed,
  setPlaced,
  photoPool,
}: {
  template: CoursemapTemplate;
  placed: PlacedPhoto[];
  setPlaced: Dispatch<SetStateAction<PlacedPhoto[]>>;
  photoPool: string[];
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ id: string; pointerId: number; offsetX: number; offsetY: number } | null>(null);
  const pointersRef = useRef(new Map<number, { id: string; x: number; y: number }>());
  const pinchRef = useRef<{ id: string; distance: number; angle: number; w: number; h: number; rotate: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(placed[0]?.id ?? null);
  const [hiddenSources, setHiddenSources] = useState<string[]>([]);
  const selected = placed.find(photo => photo.id === selectedId) ?? null;
  const visiblePhotoPool = photoPool.filter(src => !hiddenSources.includes(src));

  const selectAndBringToFront = (id: string) => {
    setSelectedId(id);
    setPlaced(current => {
      const selectedPhoto = current.find(photo => photo.id === id);
      return selectedPhoto ? [...current.filter(photo => photo.id !== id), selectedPhoto] : current;
    });
  };

  const addPhoto = (src: string) => {
    const existing = placed.find(photo => photo.src === src);
    if (existing) {
      selectAndBringToFront(existing.id);
      return;
    }
    if (placed.length >= MAX_MUNCHIE_FEED_PHOTOS) {
      toast.info(`사진은 최대 ${MAX_MUNCHIE_FEED_PHOTOS}장까지 배치할 수 있어요.`);
      return;
    }
    const next = createTemplatePhotoPlacement(src, placed.length, template);
    setPlaced(current => [...current, next]);
    setSelectedId(next.id);
  };

  const updateSelected = (patch: Partial<PlacedPhoto>) => {
    if (!selectedId) return;
    setPlaced(current => current.map(photo => photo.id === selectedId ? { ...photo, ...patch } : photo));
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const trackedPointer = pointersRef.current.get(event.pointerId);
    if (trackedPointer) {
      pointersRef.current.set(event.pointerId, { ...trackedPointer, x: event.clientX, y: event.clientY });
      const pinch = pinchRef.current;
      const pinchPointers = Array.from(pointersRef.current.values()).filter(pointer => pointer.id === pinch?.id);
      if (pinch && pinchPointers.length >= 2) {
        event.preventDefault();
        const [first, second] = pinchPointers;
        const distance = Math.hypot(second.x - first.x, second.y - first.y);
        const scale = Math.max(0.45, Math.min(2.35, distance / Math.max(pinch.distance, 1)));
        const angle = Math.atan2(second.y - first.y, second.x - first.x) * 180 / Math.PI;
        setPlaced(current => current.map(photo => photo.id === pinch.id ? {
          ...photo,
          w: Math.max(14, Math.min(88, pinch.w * scale)),
          h: Math.max(10, Math.min(88, pinch.h * scale)),
          rotate: pinch.rotate + angle - pinch.angle,
        } : photo));
        return;
      }
    }
    const drag = dragRef.current;
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!drag || !bounds || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100 + drag.offsetX;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100 + drag.offsetY;
    setPlaced(current => current.map(photo => photo.id === drag.id ? {
      ...photo,
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y)),
    } : photo));
  };

  const uploadPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, Math.max(0, MAX_MUNCHIE_FEED_PHOTOS - placed.length));
    event.target.value = '';
    const uploaded: string[] = [];
    for (const file of files) {
      try {
        const src = await fileToResizedDataUrl(file, 900, 0.8);
        uploaded.push(src);
      } catch {
        toast.error('사진을 불러오지 못했어요.');
      }
    }
    const existing = new Set(placed.map(photo => photo.src));
    const additions = uploaded
      .filter(src => !existing.has(src))
      .slice(0, MAX_MUNCHIE_FEED_PHOTOS - placed.length)
      .map((src, index) => createTemplatePhotoPlacement(src, placed.length + index, template));
    if (additions.length > 0) {
      setPlaced(current => [...current, ...additions].slice(0, MAX_MUNCHIE_FEED_PHOTOS));
      setSelectedId(additions.at(-1)?.id ?? null);
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-end justify-between">
        <div>
          <p className="text-[13px] font-black text-[#3B2A22]">템플릿에서 바로 편집</p>
        </div>
      </div>

      <div
        ref={canvasRef}
        data-ui="template-position-editor"
        className="relative isolate mx-auto w-full max-w-[350px] touch-none select-none overflow-hidden rounded-[22px] border border-[#E9D6CC] bg-[#F1E7DE] shadow-[0_12px_30px_rgba(91,57,42,0.12)]"
        style={{ aspectRatio: '3 / 4' }}
        onPointerMove={handlePointerMove}
        onPointerUp={event => { pointersRef.current.delete(event.pointerId); if (pointersRef.current.size < 2) pinchRef.current = null; dragRef.current = null; }}
        onPointerCancel={event => { pointersRef.current.delete(event.pointerId); pinchRef.current = null; dragRef.current = null; }}
        onClick={() => setSelectedId(null)}
      >
        <TemplateBackgroundLayer template={template} loading="eager" />
        {placed.map(photo => (
          <div
            key={photo.id}
            className="absolute cursor-grab active:cursor-grabbing"
            style={{
              left: `${photo.x}%`,
              top: `${photo.y}%`,
              width: `${photo.w}%`,
              height: `${photo.h ?? photo.w}%`,
              transform: `translate(-50%, -50%) rotate(${photo.rotate}deg)`,
              zIndex: 10,
            }}
            onPointerDown={event => {
              if (event.button !== 0) return;
              event.preventDefault();
              event.stopPropagation();
              selectAndBringToFront(photo.id);
              pointersRef.current.set(event.pointerId, { id: photo.id, x: event.clientX, y: event.clientY });
              const samePhotoPointers = Array.from(pointersRef.current.values()).filter(pointer => pointer.id === photo.id);
              if (samePhotoPointers.length >= 2) {
                const [first, second] = samePhotoPointers;
                pinchRef.current = {
                  id: photo.id,
                  distance: Math.hypot(second.x - first.x, second.y - first.y),
                  angle: Math.atan2(second.y - first.y, second.x - first.x) * 180 / Math.PI,
                  w: photo.w,
                  h: photo.h ?? photo.w,
                  rotate: photo.rotate,
                };
                dragRef.current = null;
                event.currentTarget.setPointerCapture?.(event.pointerId);
                return;
              }
              const bounds = canvasRef.current?.getBoundingClientRect();
              if (!bounds) return;
              const pointerX = ((event.clientX - bounds.left) / bounds.width) * 100;
              const pointerY = ((event.clientY - bounds.top) / bounds.height) * 100;
              dragRef.current = {
                id: photo.id,
                pointerId: event.pointerId,
                offsetX: photo.x - pointerX,
                offsetY: photo.y - pointerY,
              };
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onClick={event => event.stopPropagation()}
          >
            <div className={`h-full w-full overflow-hidden rounded-[9px] bg-transparent shadow-[0_6px_16px_rgba(63,38,24,0.2)] ${photo.id === selectedId ? 'ring-2 ring-[#EB5053]' : ''}`}>
              <img src={photo.src} alt="" className="h-full w-full object-cover" style={{ transform: `scale(${photo.zoom ?? 1})` }} draggable={false} />
            </div>
          </div>
        ))}
        {placed.length === 0 && (
          <button
            type="button"
            onClick={event => { event.stopPropagation(); uploadRef.current?.click(); }}
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-2xl bg-white/85 px-5 py-4 text-[#D94D52] shadow backdrop-blur"
          >
            <Upload size={22} />
            <span className="text-[11px] font-black">첫 사진 올리기</span>
          </button>
        )}
        <TemplateFrameLayer template={template} loading="eager" />
      </div>

      {selected && (
        <div className="mx-auto mt-3 w-full max-w-[350px] rounded-2xl border border-[#EFE3D8] bg-white px-3 py-2.5 shadow-sm">
          <div className="flex items-center justify-center gap-1.5">
            <button type="button" onClick={() => updateSelected({ rotate: selected.rotate - 8 })} aria-label="사진 반시계 방향 회전" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF4EF] active:scale-90"><RotateCcw size={14} /></button>
            <button type="button" onClick={() => updateSelected({ rotate: selected.rotate + 8 })} aria-label="사진 시계 방향 회전" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF4EF] active:scale-90"><RotateCw size={14} /></button>
            <button type="button" onClick={() => { setPlaced(current => current.filter(photo => photo.id !== selected.id)); setSelectedId(null); }} aria-label="사진 삭제" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF0F0] text-[#D94447] active:scale-90"><Trash2 size={14} /></button>
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1.5 scrollbar-hide">
        {visiblePhotoPool.map(src => {
          const active = placed.some(photo => photo.src === src);
          return (
            <div key={src.slice(0, 90)} className="relative h-16 w-16 shrink-0">
            <button
              type="button"
              onClick={() => addPhoto(src)}
              aria-label={active ? '배치된 사진 선택' : '사진을 템플릿에 추가'}
              className={`h-full w-full overflow-hidden rounded-xl border-2 active:scale-95 ${active ? 'border-[#EB5053]' : 'border-[#EFE3D8]'}`}
            >
              <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
            </button>
            <button type="button" onClick={() => { setHiddenSources(current => [...current, src]); setPlaced(current => current.filter(photo => photo.src !== src)); }} aria-label="사진 목록에서 삭제" className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/80 bg-[#D94447] text-white shadow"><X size={11} /></button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => uploadRef.current?.click()}
          className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-dashed border-[#E0D2C6] text-[#B0A090] active:scale-95"
          aria-label="새 사진 업로드"
        >
          <Plus size={18} />
          <span className="text-[8px] font-bold">사진 추가</span>
        </button>
        <input ref={uploadRef} type="file" accept="image/*" multiple className="hidden" onChange={uploadPhotos} />
      </div>
    </div>
  );
}
