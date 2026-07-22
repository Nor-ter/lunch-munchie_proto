import { useRef, useState, type ChangeEvent, type Dispatch, type PointerEvent, type SetStateAction } from 'react';
import { Minus, Plus, RotateCcw, RotateCw, Trash2, Upload } from 'lucide-react';
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
    x: slot ? slot.left + slot.width / 2 : 38 + index * 12,
    y: slot ? slot.top + slot.height / 2 : 30 + index * 16,
    w: slot?.width ?? 36,
    h: slot?.height ?? 27,
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
  const dragRef = useRef<{ id: string; pointerId: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(placed[0]?.id ?? null);
  const selected = placed.find(photo => photo.id === selectedId) ?? null;

  const addPhoto = (src: string) => {
    const existing = placed.find(photo => photo.src === src);
    if (existing) {
      setSelectedId(existing.id);
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
    const drag = dragRef.current;
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!drag || !bounds || event.pointerId !== drag.pointerId) return;
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
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
          <p className="mt-0.5 text-[10px] text-[#9A8579]">사진을 터치해서 선택하고 끌어서 위치를 옮겨보세요.</p>
        </div>
        <span className="text-[10px] font-bold text-[#D76A68]">{placed.length}/{MAX_MUNCHIE_FEED_PHOTOS}</span>
      </div>

      <div
        ref={canvasRef}
        data-ui="template-position-editor"
        className="relative isolate mx-auto w-full max-w-[350px] touch-none select-none overflow-hidden rounded-[22px] border border-[#E9D6CC] bg-[#F1E7DE] shadow-[0_12px_30px_rgba(91,57,42,0.12)]"
        style={{ aspectRatio: '3 / 4' }}
        onPointerMove={handlePointerMove}
        onPointerUp={() => { dragRef.current = null; }}
        onPointerCancel={() => { dragRef.current = null; }}
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
              zIndex: photo.id === selectedId ? 20 : 10,
            }}
            onPointerDown={event => {
              event.stopPropagation();
              setSelectedId(photo.id);
              dragRef.current = { id: photo.id, pointerId: event.pointerId };
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onClick={event => event.stopPropagation()}
          >
            <div
              className="h-full w-full overflow-hidden rounded-[9px] border-[3px] bg-white shadow-[0_6px_16px_rgba(63,38,24,0.2)]"
              style={{ borderColor: photo.id === selectedId ? '#EB5053' : '#FFFFFF' }}
            >
              <img src={photo.src} alt="" className="h-full w-full object-cover" draggable={false} />
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
        <div className="mx-auto mt-3 flex w-fit items-center gap-1.5 rounded-full border border-[#EFE3D8] bg-white px-2 py-1.5 shadow-sm">
          <button type="button" onClick={() => updateSelected({ w: Math.max(16, selected.w - 4), h: Math.max(12, (selected.h ?? selected.w) - 3) })} aria-label="사진 작게" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF4EF] active:scale-90"><Minus size={14} /></button>
          <button type="button" onClick={() => updateSelected({ w: Math.min(78, selected.w + 4), h: Math.min(78, (selected.h ?? selected.w) + 3) })} aria-label="사진 크게" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF4EF] active:scale-90"><Plus size={14} /></button>
          <button type="button" onClick={() => updateSelected({ rotate: selected.rotate - 8 })} aria-label="사진 반시계 방향 회전" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF4EF] active:scale-90"><RotateCcw size={14} /></button>
          <button type="button" onClick={() => updateSelected({ rotate: selected.rotate + 8 })} aria-label="사진 시계 방향 회전" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF4EF] active:scale-90"><RotateCw size={14} /></button>
          <button
            type="button"
            onClick={() => {
              setPlaced(current => current.filter(photo => photo.id !== selected.id));
              setSelectedId(null);
            }}
            aria-label="사진 삭제"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF0F0] text-[#D94447] active:scale-90"
          ><Trash2 size={14} /></button>
        </div>
      )}

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1.5 scrollbar-hide">
        {photoPool.map(src => {
          const active = placed.some(photo => photo.src === src);
          return (
            <button
              key={src.slice(0, 90)}
              type="button"
              onClick={() => addPhoto(src)}
              aria-label={active ? '배치된 사진 선택' : '사진을 템플릿에 추가'}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 active:scale-95 ${active ? 'border-[#EB5053]' : 'border-[#EFE3D8]'}`}
            >
              <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
            </button>
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
