/**
 * 코스맵 만들기 — 6단계 통합 플로우 (코스맵과 피드를 순차적으로 동시 작성)
 * ① 코스맵 정하기 — 해시태그·한줄평 + 과일핀(최대 3) 지도검색 + 사진박스
 * ② 템플릿 선정 — 룰렛 스와이프, 가운데 템플릿이 자동 선정
 * ③ 템플릿 꾸미기 — 업로드한 사진을 drag & drop, 크기·회전 조정
 * ④ 사진 에디터 — crop(확대)·그리기·텍스트·하이라이터·필터
 * ⑤ 미리보기 — 게시 전 확인 (버튼 비활성)
 * ⑥ 포스팅 완료 — 주먹밥 보상 지급
 */
import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useSearch } from 'wouter';
import {
  Camera, ChevronLeft, ChevronRight, Minus, Pencil, Plus,
  RotateCw, Search, Share2, Trash2, Type, X, Highlighter, Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp, type Course, type FeedPost, type Restaurant } from '@/contexts/AppContext';
import {
  COURSEMAP_TEMPLATES,
  setTemplateForCourse,
  type CoursemapTemplate,
} from '@/constants/coursemapTemplates';
import { saveCoursemapDecor, type PlacedPhoto } from '@/lib/coursemapDecor';
import { getCourseMapPoints, getCurvedCourseSegments } from '@/lib/courseMapSync';
import FruitCharacter, { FRUIT_SEQUENCE, fruitForStop } from '@/components/munchie/FruitCharacter';
import { fileToResizedDataUrl } from '@/lib/imageUtils';
import OneLineReviewBox from '@/components/munchie/OneLineReviewBox';
import UnifiedMunchieCard from '@/components/munchie/UnifiedMunchieCard';

const STEP_TITLES = [
  '코스맵을 정하세요',
  '템플릿을 선택하세요',
  '이제 템플릿을 꾸며 보아요',
  '미리보기',
  '포스팅 완료!',
];

const MAX_PINS = 3;

interface FruitPin {
  restaurant: Restaurant;
  /** null이면 사진 없이 진행 */
  photo: string | null;
}

// ── ① 코스맵 정하기 ───────────────────────────────────────────────────────────

function PinMap({ pins, activeBubble, onFruitTap }: {
  pins: (FruitPin | null)[];
  activeBubble: number | null;
  onFruitTap: (slot: number) => void;
}) {
  const filled = pins.filter((pin): pin is FruitPin => !!pin);
  const points = getCourseMapPoints(filled.map(pin => pin.restaurant));
  const segments = getCurvedCourseSegments(points);
  // slot 인덱스 → 채워진 핀 순번
  let filledIdx = -1;

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[#E8DED4] bg-[#F8F5F0]">
      {/* 그리드 배경 */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(step => (
          <g key={step} stroke="#E8E3DC" strokeWidth="0.35">
            <line x1={step} y1="0" x2={step} y2="100" />
            <line x1="0" y1={step} x2="100" y2={step} />
          </g>
        ))}
        {segments.map((segment, i) => (
          <path
            key={i}
            d={segment.path}
            fill="none"
            stroke="#F25055"
            strokeWidth="1.4"
            strokeDasharray="1.5 3.5"
            strokeLinecap="round"
            opacity="0.8"
          />
        ))}
      </svg>
      <span className="absolute left-2.5 top-2 text-[10px] font-bold text-[#B4A79A]">MAP</span>

      {pins.map((pin, slot) => {
        if (!pin) return null;
        filledIdx += 1;
        const pt = points[filledIdx] ?? { x: 50, y: 50 };
        return (
          <div
            key={slot}
            className="absolute"
            style={{ left: `${pt.x}%`, top: `${pt.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            <button
              type="button"
              onClick={() => onFruitTap(slot)}
              className={`block active:scale-90 ${activeBubble === slot ? 'scale-110' : ''}`}
              aria-label={`${slot + 1}번 과일핀`}
            >
              <FruitCharacter kind={FRUIT_SEQUENCE[slot % FRUIT_SEQUENCE.length]!} size={36} />
            </button>
            <span className="absolute left-1/2 top-full mt-0.5 max-w-[92px] -translate-x-1/2 truncate rounded-full bg-white/90 px-1.5 py-0.5 text-[8.5px] font-black text-[#3B2A22] shadow-sm">
              {pin.restaurant.name}
            </span>
          </div>
        );
      })}

      {filled.length === 0 && (
        <p className="absolute inset-x-4 top-1/2 -translate-y-1/2 text-center text-[12px] font-semibold text-[#B4A79A]">
          아래 과일 캐릭터를 눌러 말풍선에서
          <br />
          지도검색으로 장소를 찍어보세요 🗺️
        </p>
      )}
    </div>
  );
}

function PinsStep({
  pins, setPins, hashtags, setHashtags, caption, setCaption,
}: {
  pins: (FruitPin | null)[];
  setPins: React.Dispatch<React.SetStateAction<(FruitPin | null)[]>>;
  hashtags: string[];
  setHashtags: React.Dispatch<React.SetStateAction<string[]>>;
  caption: string;
  setCaption: (value: string) => void;
}) {
  const { restaurants } = useApp();
  const [bubbleSlot, setBubbleSlot] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [newTag, setNewTag] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoTargetRef = useRef<number | null>(null);

  const results = query.trim().length >= 1
    ? restaurants.filter(r =>
        r.name.toLowerCase().includes(query.trim().toLowerCase()) ||
        r.address.toLowerCase().includes(query.trim().toLowerCase()),
      ).slice(0, 5)
    : [];

  const pickRestaurant = (slot: number, restaurant: Restaurant) => {
    if (pins.some((pin, i) => i !== slot && pin?.restaurant.id === restaurant.id)) {
      toast.info('이미 코스에 담긴 장소예요');
      return;
    }
    setPins(prev => prev.map((pin, i) =>
      i === slot ? { restaurant, photo: restaurant.image ?? null } : pin,
    ));
    setBubbleSlot(null);
    setQuery('');
  };

  const commitTag = () => {
    const trimmed = newTag.trim().replace(/^#/, '');
    if (trimmed && !hashtags.includes(trimmed)) setHashtags(prev => [...prev, trimmed]);
    setNewTag('');
  };

  const openPhotoUpload = (slot: number) => {
    photoTargetRef.current = slot;
    photoInputRef.current?.click();
  };

  const handlePhotoFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    const slot = photoTargetRef.current;
    if (!file || slot == null) return;
    try {
      const url = await fileToResizedDataUrl(file, 900, 0.8);
      setPins(prev => prev.map((pin, i) => (i === slot && pin ? { ...pin, photo: url } : pin)));
      toast.success('사진을 업로드했어요');
    } catch {
      toast.error('사진을 불러오지 못했어요');
    }
  };

  return (
    <div className="space-y-4">
      {/* 해시태그 */}
      <div>
        <p className="mb-1.5 text-xs text-gray-400">해시태그 <span className="text-[#E85053]">+ 추가</span></p>
        <div className="flex flex-wrap gap-1.5">
          {hashtags.map(tag => (
            <span key={tag} className="flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs">
              #{tag}
              <button type="button" onClick={() => setHashtags(prev => prev.filter(t => t !== tag))}>
                <X size={11} className="text-gray-400" />
              </button>
            </span>
          ))}
          <input
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && commitTag()}
            onBlur={commitTag}
            placeholder="#태그"
            className="w-20 rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs outline-none focus:border-[#E85053]"
          />
        </div>
      </div>

      {/* 한줄평 */}
      <div>
        <p className="mb-1.5 text-xs text-gray-400">한줄평</p>
        <OneLineReviewBox>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="한줄평 입력하기"
            rows={2}
            className="w-full resize-none bg-transparent text-[13px] font-semibold text-[#3B2A23] outline-none placeholder:text-[#C9ADA3]"
          />
        </OneLineReviewBox>
      </div>

      {/* 코스맵 지도 */}
      <div>
        <p className="mb-1.5 text-xs text-gray-400">코스맵</p>
        <PinMap pins={pins} activeBubble={bubbleSlot} onFruitTap={slot => setBubbleSlot(prev => prev === slot ? null : slot)} />
      </div>

      {/* 코스 순서 — 과일핀 슬롯 (최대 3개) */}
      <div>
        <p className="mb-2 text-xs text-gray-400">코스 순서 <span className="text-[10px]">(최대 {MAX_PINS}곳)</span></p>
        <div className="space-y-2">
          {pins.map((pin, slot) => (
            <div key={slot}>
              <div
                className="flex items-center gap-3 rounded-xl border bg-white p-2.5"
                style={{ borderColor: bubbleSlot === slot ? '#E85053' : '#F0E8E0' }}
              >
                <button
                  type="button"
                  onClick={() => setBubbleSlot(prev => prev === slot ? null : slot)}
                  className="shrink-0 active:scale-90"
                  aria-label={`${slot + 1}번 장소 검색`}
                >
                  <span className={pin ? '' : 'opacity-35 grayscale'}>
                    <FruitCharacter kind={FRUIT_SEQUENCE[slot % FRUIT_SEQUENCE.length]!} size={38} />
                  </span>
                </button>

                {pin ? (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{pin.restaurant.name}</p>
                      <p className="truncate text-[11px] text-gray-400">{pin.restaurant.category} · {pin.restaurant.address}</p>
                    </div>
                    {/* 사진 박스 — 업로드/교체/제거 */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => openPhotoUpload(slot)}
                        className="block h-12 w-12 overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50 active:scale-95"
                        aria-label="사진 업로드"
                      >
                        {pin.photo ? (
                          <img src={pin.photo} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-gray-300"><Camera size={16} /></span>
                        )}
                      </button>
                      {pin.photo && (
                        <button
                          type="button"
                          onClick={() => setPins(prev => prev.map((p, i) => i === slot && p ? { ...p, photo: null } : p))}
                          className="absolute -right-1.5 -top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#3B2A22] text-white"
                          aria-label="사진 제거"
                          style={{ width: 18, height: 18 }}
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPins(prev => prev.map((p, i) => i === slot ? null : p))}
                      className="shrink-0 text-gray-300"
                      aria-label="장소 삭제"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setBubbleSlot(slot)}
                    className="flex-1 py-1.5 text-left text-[12px] text-gray-400"
                  >
                    과일을 눌러 장소를 검색해보세요
                  </button>
                )}
              </div>

              {/* 말풍선 검색 */}
              <AnimatePresence>
                {bubbleSlot === slot && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="relative ml-5 mt-1.5 rounded-2xl border border-[#EAD9CE] bg-white p-3 shadow-[0_6px_16px_rgba(60,35,22,0.1)]">
                      <span className="absolute -top-2 left-6 h-4 w-4 rotate-45 border-l border-t border-[#EAD9CE] bg-white" />
                      <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 h-9">
                        <Search size={14} className="text-gray-400" />
                        <input
                          autoFocus
                          value={query}
                          onChange={e => setQuery(e.target.value)}
                          placeholder="지도검색 — 장소 이름"
                          className="flex-1 bg-transparent text-[13px] outline-none"
                        />
                      </div>
                      <div className="mt-2 space-y-1.5">
                        {results.map(r => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => pickRestaurant(slot, r)}
                            className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left active:bg-[#FFF6F2]"
                          >
                            <img src={r.image} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12.5px] font-semibold">{r.name}</span>
                              <span className="block truncate text-[10px] text-gray-400">{r.address}</span>
                            </span>
                            <Plus size={14} className="shrink-0 text-[#E85053]" />
                          </button>
                        ))}
                        {query.trim().length >= 1 && results.length === 0 && (
                          <p className="py-2 text-center text-[11px] text-gray-400">일치하는 장소가 없어요</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />
    </div>
  );
}

// ── ② 템플릿 룰렛 ─────────────────────────────────────────────────────────────

function TemplateRouletteStep({
  index, setIndex,
}: {
  index: number;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
}) {
  const count = COURSEMAP_TEMPLATES.length;
  const template = COURSEMAP_TEMPLATES[index]!;
  const prev = COURSEMAP_TEMPLATES[(index - 1 + count) % count]!;
  const next = COURSEMAP_TEMPLATES[(index + 1) % count]!;

  return (
    <div>
      <div className="relative flex h-[380px] items-center justify-center overflow-hidden">
        {/* 양옆 미리보기 */}
        <img
          src={prev.image} alt=""
          className="absolute left-[-72px] w-[150px] rounded-2xl opacity-45 shadow-md"
          style={{ aspectRatio: '3/4', objectFit: 'cover' }}
          draggable={false}
        />
        <img
          src={next.image} alt=""
          className="absolute right-[-72px] w-[150px] rounded-2xl opacity-45 shadow-md"
          style={{ aspectRatio: '3/4', objectFit: 'cover' }}
          draggable={false}
        />
        {/* 가운데 = 선정된 템플릿 (스와이프로 로테이션) */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={template.id}
            initial={{ opacity: 0, scale: 0.86, rotate: -3 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.86, rotate: 3 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            onDragEnd={(_, info) => {
              if (info.offset.x < -50) setIndex(i => (i + 1) % count);
              else if (info.offset.x > 50) setIndex(i => (i - 1 + count) % count);
            }}
            className="relative z-10 w-[248px] cursor-grab overflow-hidden rounded-3xl border-4 border-white shadow-[0_18px_44px_rgba(63,38,24,0.28)] active:cursor-grabbing"
            style={{ aspectRatio: '3/4' }}
          >
            <img src={template.image} alt={template.name} className="h-full w-full object-cover" draggable={false} />
            <span className="absolute left-1/2 top-2.5 -translate-x-1/2 rounded-full bg-[#FF424B] px-2.5 py-1 text-[9px] font-black text-white shadow-sm">
              선택됨
            </span>
          </motion.div>
        </AnimatePresence>

        {/* 좌우 화살표 */}
        <button
          type="button"
          onClick={() => setIndex(i => (i - 1 + count) % count)}
          className="absolute left-1 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md active:scale-90"
          aria-label="이전 템플릿"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => setIndex(i => (i + 1) % count)}
          className="absolute right-1 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md active:scale-90"
          aria-label="다음 템플릿"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mt-3 text-center">
        <p className="text-[16px] font-black text-[#2B211D]">{template.name}</p>
        <p className="mt-1 text-[11.5px] text-gray-400">{template.description}</p>
        <div className="mt-2.5 flex justify-center gap-1.5">
          {COURSEMAP_TEMPLATES.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${t.name} 선택`}
              className="h-1.5 rounded-full transition-all"
              style={{ width: i === index ? 18 : 6, background: i === index ? '#EB5053' : '#EDDCD2' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ③ 템플릿 꾸미기 (drag & drop) ─────────────────────────────────────────────

function DecorateStep({
  template, placed, setPlaced, photoPool, onAddUpload, onEditPhoto,
}: {
  template: CoursemapTemplate;
  placed: PlacedPhoto[];
  setPlaced: React.Dispatch<React.SetStateAction<PlacedPhoto[]>>;
  photoPool: string[];
  onAddUpload: (url: string) => void;
  onEditPhoto: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const dragState = useRef<{ id: string; pointerId: number } | null>(null);
  const resizeState = useRef<{
    id: string;
    pointerId: number;
    axis: 'x' | 'y';
    startClient: number;
    startSize: number;
  } | null>(null);

  const addToCanvas = (src: string) => {
    if (placed.length >= MAX_PINS) {
      toast.info(`코스맵 사진은 최대 ${MAX_PINS}장까지 사용할 수 있어요`);
      return;
    }
    const id = `placed_${Date.now()}_${Math.round(Math.random() * 999)}`;
    setPlaced(prev => [...prev, {
      id, src,
      x: 38 + (prev.length % 3) * 12,
      y: 30 + (prev.length % 3) * 16,
      w: 36,
      h: 27,
      rotate: (prev.length % 2 === 0 ? -1 : 1) * (2 + prev.length),
    }]);
    setSelectedId(id);
  };

  const updateSelected = (patch: (photo: PlacedPhoto) => Partial<PlacedPhoto>) => {
    if (!selectedId) return;
    setPlaced(prev => prev.map(photo => photo.id === selectedId ? { ...photo, ...patch(photo) } : photo));
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    const resize = resizeState.current;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (resize && rect && event.pointerId === resize.pointerId) {
      const delta = resize.axis === 'x'
        ? ((event.clientX - resize.startClient) / rect.width) * 200
        : ((event.clientY - resize.startClient) / rect.height) * 200;
      setPlaced(prev => prev.map(photo => photo.id === resize.id
        ? resize.axis === 'x'
          ? { ...photo, w: Math.max(14, Math.min(88, resize.startSize + delta)) }
          : { ...photo, h: Math.max(10, Math.min(88, resize.startSize + delta)) }
        : photo));
      return;
    }
    const drag = dragState.current;
    if (!drag || !rect || event.pointerId !== drag.pointerId) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setPlaced(prev => prev.map(photo => photo.id === drag.id
      ? { ...photo, x: Math.max(6, Math.min(94, x)), y: Math.max(6, Math.min(94, y)) }
      : photo));
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, Math.max(0, MAX_PINS - placed.length));
    event.target.value = '';
    for (const file of files) {
      try {
        const url = await fileToResizedDataUrl(file, 900, 0.8);
        onAddUpload(url);
      } catch {
        toast.error('사진을 불러오지 못했어요');
      }
    }
  };

  const selected = placed.find(photo => photo.id === selectedId) ?? null;

  return (
    <div>
      {/* 캔버스 — 템플릿 + 배치된 사진 */}
      <div
        ref={canvasRef}
        className="relative mx-auto w-full max-w-[330px] touch-none select-none overflow-hidden rounded-2xl border border-[#E8DED4] shadow-sm"
        style={{ aspectRatio: '3/4' }}
        onPointerMove={handlePointerMove}
        onPointerUp={() => { dragState.current = null; resizeState.current = null; }}
        onPointerLeave={() => { dragState.current = null; resizeState.current = null; }}
        onClick={() => setSelectedId(null)}
      >
        <img src={template.image} alt={template.name} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        {placed.map((photo, index) => (
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
              dragState.current = { id: photo.id, pointerId: event.pointerId };
              (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
            }}
            onClick={event => event.stopPropagation()}
          >
            <div
              className="overflow-hidden rounded-[8px] border-[3px] bg-white shadow-[0_6px_16px_rgba(63,38,24,0.2)]"
              style={{ borderColor: photo.id === selectedId ? '#FF424B' : 'white' }}
            >
              <img src={photo.src} alt="" className="h-full w-full object-cover" draggable={false} />
            </div>
            {index < 3 && (
              <span className="pointer-events-none absolute -top-3.5 left-1/2 z-10 -translate-x-1/2">
                <FruitCharacter kind={fruitForStop(index)} size={26} />
              </span>
            )}
            {photo.id === selectedId && (
              <>
                <button
                  type="button"
                  aria-label="사진 가로 크기 조정"
                  className="absolute -right-2 top-1/2 z-30 h-10 w-4 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-white bg-[#FF424B] shadow"
                  onPointerDown={event => {
                    event.stopPropagation();
                    resizeState.current = { id: photo.id, pointerId: event.pointerId, axis: 'x', startClient: event.clientX, startSize: photo.w };
                    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
                  }}
                />
                <button
                  type="button"
                  aria-label="사진 세로 크기 조정"
                  className="absolute -bottom-2 left-1/2 z-30 h-4 w-10 -translate-x-1/2 cursor-ns-resize rounded-full border-2 border-white bg-[#FF424B] shadow"
                  onPointerDown={event => {
                    event.stopPropagation();
                    resizeState.current = { id: photo.id, pointerId: event.pointerId, axis: 'y', startClient: event.clientY, startSize: photo.h ?? photo.w };
                    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
                  }}
                />
              </>
            )}
          </div>
        ))}
        {placed.length === 0 && (
          <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-xl bg-white/75 px-3 py-2.5 text-center text-[11.5px] font-semibold text-[#8D776C] backdrop-blur-sm">
            아래 사진을 눌러 템플릿 위에 올린 뒤<br />drag & drop으로 꾸며보세요
          </p>
        )}
      </div>

      {/* 선택된 사진 컨트롤 — 크기 조정 · 회전 · 에디터 · 삭제 */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="mx-auto mt-3 flex w-fit items-center gap-1.5 rounded-full border border-[#EFE3D8] bg-white px-2 py-1.5 shadow-sm"
          >
            <button type="button" onClick={() => updateSelected(p => ({ w: Math.max(16, p.w - 4) }))} aria-label="작게" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF4EF] text-[#3B2A22] active:scale-90"><Minus size={14} /></button>
            <button type="button" onClick={() => updateSelected(p => ({ w: Math.min(70, p.w + 4) }))} aria-label="크게" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF4EF] text-[#3B2A22] active:scale-90"><Plus size={14} /></button>
            <button type="button" onClick={() => updateSelected(p => ({ rotate: p.rotate + 15 }))} aria-label="회전" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF4EF] text-[#3B2A22] active:scale-90"><RotateCw size={14} /></button>
            <button
              type="button"
              onClick={() => onEditPhoto(selected.id)}
              className="flex h-8 items-center gap-1 rounded-full bg-[#FF424B] px-3 text-[11px] font-black text-white active:scale-95"
            >
              <Wand2 size={12} /> 사진 에디터
            </button>
            <button
              type="button"
              onClick={() => { setPlaced(prev => prev.filter(p => p.id !== selected.id)); setSelectedId(null); }}
              aria-label="삭제"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF4EF] text-[#D94447] active:scale-90"
            >
              <Trash2 size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 업로드한 사진목록 */}
      <p className="mt-4 mb-1.5 text-xs text-gray-400">업로드한 사진목록 — 눌러서 템플릿에 올리기</p>
      <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-hide">
        {photoPool.map(src => (
          <button
            key={src.slice(0, 80)}
            type="button"
            onClick={() => addToCanvas(src)}
            className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#EFE3D8] active:scale-95"
          >
            <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
          </button>
        ))}
        <button
          type="button"
          onClick={() => uploadRef.current?.click()}
          className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-dashed border-[#E0D2C6] text-[#B0A090] active:scale-95"
        >
          <Plus size={18} />
          <span className="text-[8px] font-bold">사진 추가</span>
        </button>
        <input ref={uploadRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
      </div>
      <p className="mt-1 text-[10px] text-gray-300">사진을 끌어 옮기고, 선택한 사진의 오른쪽·아래 edge를 끌어 가로·세로 크기를 자유롭게 바꿔보세요</p>
    </div>
  );
}

// ── ④ 사진 에디터 ─────────────────────────────────────────────────────────────

const FILTER_PRESETS = [
  { id: 'none', name: '원본', css: 'none' },
  { id: 'bright', name: '밝게', css: 'brightness(1.15) saturate(1.08)' },
  { id: 'vintage', name: '빈티지', css: 'sepia(0.38) contrast(0.95) brightness(1.02)' },
  { id: 'mono', name: '흑백', css: 'grayscale(1) contrast(1.05)' },
  { id: 'warm', name: '따뜻', css: 'sepia(0.2) saturate(1.25) brightness(1.05)' },
  { id: 'cool', name: '시원', css: 'hue-rotate(-12deg) saturate(1.1) brightness(1.04)' },
] as const;

type EditorTool = 'none' | 'pen' | 'highlight';

interface EditorStroke {
  tool: 'pen' | 'highlight';
  color: string;
  points: { x: number; y: number }[];
}

function PhotoEditorModal({ src, onSave, onClose }: {
  src: string;
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}) {
  const [filterId, setFilterId] = useState<(typeof FILTER_PRESETS)[number]['id']>('none');
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<EditorTool>('none');
  const [strokes, setStrokes] = useState<EditorStroke[]>([]);
  const [texts, setTexts] = useState<{ id: string; value: string; x: number; y: number }[]>([]);
  const [textDraft, setTextDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);

  const filter = FILTER_PRESETS.find(preset => preset.id === filterId)!;

  const pointFromEvent = (event: React.PointerEvent) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    if (tool === 'none') return;
    const point = pointFromEvent(event);
    if (!point) return;
    drawingRef.current = true;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    setStrokes(prev => [...prev, {
      tool,
      color: tool === 'highlight' ? '#FFE24A' : '#FF424B',
      points: [point],
    }]);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!drawingRef.current || tool === 'none') return;
    const point = pointFromEvent(event);
    if (!point) return;
    setStrokes(prev => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last) last.points = [...last.points, point];
      return next;
    });
  };

  const commitText = () => {
    const value = textDraft?.trim();
    if (value) {
      setTexts(prev => [...prev, { id: `text_${Date.now()}`, value, x: 50, y: 50 }]);
    }
    setTextDraft(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('image load failed'));
        image.src = src;
      });
      const SIZE = 800;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d')!;
      // cover + zoom (중앙 기준) — 화면 미리보기와 동일한 crop 결과
      ctx.filter = filter.css === 'none' ? 'none' : filter.css;
      const coverScale = (SIZE / Math.min(image.naturalWidth, image.naturalHeight)) * zoom;
      const drawW = image.naturalWidth * coverScale;
      const drawH = image.naturalHeight * coverScale;
      ctx.drawImage(image, (SIZE - drawW) / 2, (SIZE - drawH) / 2, drawW, drawH);
      ctx.filter = 'none';

      for (const stroke of strokes) {
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = stroke.tool === 'highlight' ? 0.45 : 1;
        ctx.lineWidth = stroke.tool === 'highlight' ? 34 : 9;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        stroke.points.forEach((point, index) => {
          const px = (point.x / 100) * SIZE;
          const py = (point.y / 100) * SIZE;
          if (index === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      for (const text of texts) {
        ctx.font = '900 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 8;
        ctx.strokeStyle = 'white';
        ctx.strokeText(text.value, (text.x / 100) * SIZE, (text.y / 100) * SIZE);
        ctx.fillStyle = '#2B211D';
        ctx.fillText(text.value, (text.x / 100) * SIZE, (text.y / 100) * SIZE);
      }

      onSave(canvas.toDataURL('image/jpeg', 0.85));
    } catch {
      toast.error('사진을 저장하지 못했어요');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex flex-col bg-[#171210]"
    >
      {/* 헤더 — Revert / Save */}
      <div className="flex items-center justify-between px-4 pb-2 pt-11">
        <button type="button" onClick={onClose} className="rounded-full border border-white/25 px-3.5 py-1.5 text-[12px] font-bold text-white/85 active:scale-95">
          Revert
        </button>
        <p className="text-[13px] font-black text-white">사진 에디터</p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-[#FF424B] px-4 py-1.5 text-[12px] font-black text-white active:scale-95 disabled:opacity-50"
        >
          {saving ? '저장 중…' : 'Save'}
        </button>
      </div>

      {/* 편집 캔버스 */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div
          ref={boxRef}
          className="relative w-full max-w-[340px] touch-none select-none overflow-hidden rounded-2xl bg-black"
          style={{ aspectRatio: '1/1' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={() => { drawingRef.current = false; }}
          onPointerLeave={() => { drawingRef.current = false; }}
        >
          <img
            src={src}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            style={{ filter: filter.css === 'none' ? undefined : filter.css, transform: `scale(${zoom})` }}
            draggable={false}
          />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
            {strokes.map((stroke, index) => (
              <polyline
                key={index}
                points={stroke.points.map(point => `${point.x},${point.y}`).join(' ')}
                fill="none"
                stroke={stroke.color}
                strokeWidth={stroke.tool === 'highlight' ? 4.4 : 1.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={stroke.tool === 'highlight' ? 0.45 : 1}
              />
            ))}
          </svg>
          {texts.map(text => (
            <span
              key={text.id}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-[22px] font-black text-[#2B211D]"
              style={{ left: `${text.x}%`, top: `${text.y}%`, textShadow: '0 0 6px white, 0 0 6px white' }}
            >
              {text.value}
            </span>
          ))}
        </div>
      </div>

      {/* 텍스트 입력 */}
      <AnimatePresence>
        {textDraft !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mx-6 mb-2 flex items-center gap-2 rounded-2xl bg-white/12 px-3 py-2"
          >
            <input
              autoFocus
              value={textDraft}
              onChange={event => setTextDraft(event.target.value)}
              onKeyDown={event => event.key === 'Enter' && commitText()}
              placeholder="텍스트 입력"
              className="flex-1 bg-transparent text-[14px] font-bold text-white outline-none placeholder:text-white/40"
            />
            <button type="button" onClick={commitText} className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#2B211D]">추가</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 사진 꾸미기 도구 */}
      <div className="px-6 pb-2">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/45">사진 꾸미기</p>
        <div className="flex gap-2">
          {/* Crop(확대) */}
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-white/12 px-3 py-2">
            <span className="text-[10px] font-black text-white/75">Crop</span>
            <input
              type="range" min="1" max="2" step="0.05" value={zoom}
              onChange={event => setZoom(Number(event.target.value))}
              className="flex-1 accent-[#FF424B]"
              aria-label="확대"
            />
          </div>
          <button
            type="button"
            onClick={() => setTool(prev => prev === 'pen' ? 'none' : 'pen')}
            className={`flex h-9 w-9 items-center justify-center rounded-xl active:scale-90 ${tool === 'pen' ? 'bg-[#FF424B] text-white' : 'bg-white/12 text-white/75'}`}
            aria-label="그리기"
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={() => setTool(prev => prev === 'highlight' ? 'none' : 'highlight')}
            className={`flex h-9 w-9 items-center justify-center rounded-xl active:scale-90 ${tool === 'highlight' ? 'bg-[#FFE24A] text-[#2B211D]' : 'bg-white/12 text-white/75'}`}
            aria-label="하이라이터"
          >
            <Highlighter size={15} />
          </button>
          <button
            type="button"
            onClick={() => setTextDraft(prev => prev === null ? '' : null)}
            className={`flex h-9 w-9 items-center justify-center rounded-xl active:scale-90 ${textDraft !== null ? 'bg-white text-[#2B211D]' : 'bg-white/12 text-white/75'}`}
            aria-label="텍스트"
          >
            <Type size={15} />
          </button>
          <button
            type="button"
            onClick={() => { setStrokes([]); setTexts([]); }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/12 text-white/75 active:scale-90"
            aria-label="지우기"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* 필터효과 */}
      <div className="px-6 pb-9">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/45">필터효과</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTER_PRESETS.map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setFilterId(preset.id)}
              className="shrink-0 text-center active:scale-95"
            >
              <span
                className="block h-14 w-14 overflow-hidden rounded-xl border-2"
                style={{ borderColor: filterId === preset.id ? '#FF424B' : 'transparent' }}
              >
                <img src={src} alt="" className="h-full w-full object-cover" style={{ filter: preset.css === 'none' ? undefined : preset.css }} draggable={false} />
              </span>
              <span className={`mt-0.5 block text-[9px] font-bold ${filterId === preset.id ? 'text-white' : 'text-white/50'}`}>
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function CoursemapCreatePage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const sourceCourseId = new URLSearchParams(search).get('course');
  const {
    profile, getCourseById, getRestaurantById, addCourse, addFeedPost,
  } = useApp();

  // 복사해서 가져오기 — 기존 코스의 장소·해시태그를 초기값으로
  const sourceCourse = sourceCourseId ? getCourseById(sourceCourseId) : undefined;
  const initialPins = useMemo<(FruitPin | null)[]>(() => {
    const slots: (FruitPin | null)[] = [null, null, null];
    if (sourceCourse) {
      [...sourceCourse.stops]
        .sort((a, b) => a.order - b.order)
        .slice(0, MAX_PINS)
        .forEach((stop, index) => {
          const restaurant = getRestaurantById(stop.placeId);
          if (restaurant) slots[index] = { restaurant, photo: restaurant.image ?? null };
        });
    }
    return slots;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceCourseId]);

  const [step, setStep] = useState(0);
  const [pins, setPins] = useState<(FruitPin | null)[]>(initialPins);
  const [hashtags, setHashtags] = useState<string[]>(
    sourceCourse ? sourceCourse.hashtags.map(tag => tag.replace(/^#/, '')) : [],
  );
  const [caption, setCaption] = useState('');
  const [templateIndex, setTemplateIndex] = useState(0);
  const [placed, setPlaced] = useState<PlacedPhoto[]>([]);
  const [uploads, setUploads] = useState<string[]>([]);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [rewardCount, setRewardCount] = useState<number | null>(null);
  const [publishedCourseId, setPublishedCourseId] = useState<string | null>(null);

  const filledPins = pins.filter((pin): pin is FruitPin => !!pin);
  const template = COURSEMAP_TEMPLATES[templateIndex]!;
  const photoPool = useMemo(() => {
    const pinPhotos = filledPins.map(pin => pin.photo).filter((photo): photo is string => !!photo);
    return Array.from(new Set([...pinPhotos, ...uploads]));
  }, [pins, uploads]);
  const previewCourse: Course = {
    id: '__munchie_preview__',
    title: caption.trim() || '새 먼치맵',
    description: caption.trim(),
    heroImage: photoPool[0] ?? filledPins[0]?.restaurant.image ?? '',
    tags: ['맛집'],
    hashtags,
    region: filledPins[0]?.restaurant.address ?? '',
    metadata: {
      distance: Math.round(filledPins.length * 0.5 * 10) / 10,
      duration: filledPins.length * 60,
      placeCount: filledPins.length,
    },
    stops: filledPins.map((pin, index) => ({
      placeId: pin.restaurant.id,
      order: index + 1,
      startTime: '',
      endTime: '',
      isBookmarked: false,
    })),
    createdAt: new Date().toISOString().slice(0, 10),
    isPublic: true,
    creatorId: profile.id,
    savedCount: 0,
  };
  const previewPost: FeedPost = {
    id: '__munchie_preview_post__',
    authorId: profile.id,
    authorName: profile.name,
    authorEmoji: profile.emoji,
    courseId: previewCourse.id,
    photos: placed.map(photo => photo.src),
    caption: caption.trim(),
    skinId: 'default',
    likes: 0,
    dislikes: 0,
    saves: 0,
    comments: [],
    createdAt: new Date().toISOString(),
    tags: previewCourse.tags,
  };

  const canNext =
    step === 0 ? filledPins.length > 0 && caption.trim().length > 0 :
    step === 2 ? placed.length > 0 :
    true;

  const nextLabel =
    step === 0 ? '다음 →' :
    step === 1 ? '다음 →' :
    step === 2 ? '미리보기' :
    step === 3 ? '포스팅' : '';

  const nextHint =
    step === 0 && filledPins.length === 0 ? '장소를 1곳 이상 찍어주세요' :
    step === 0 && !caption.trim() ? '한줄평을 입력해주세요' :
    step === 2 && placed.length === 0 ? '사진을 1장 이상 올려주세요' :
    null;

  const publish = () => {
    const newId = `course_${Date.now()}`;
    const linked = filledPins.map(pin => pin.restaurant);
    const tagPool = Array.from(new Set(linked.flatMap(restaurant => restaurant.tags)));
    const title = `${linked[0]!.name}${linked.length > 1 ? ` 외 ${linked.length - 1}곳` : ''} 코스`;
    const course: Course = {
      id: newId,
      title,
      description: caption.trim(),
      heroImage: photoPool[0] ?? linked[0]!.image ?? '',
      tags: (tagPool.length > 0 ? tagPool : ['맛집']).slice(0, 2) as Course['tags'],
      hashtags,
      region: linked[0]!.address.split(' ').slice(0, 2).join(' '),
      metadata: {
        distance: Math.round(linked.length * 0.5 * 10) / 10,
        duration: linked.length * 60,
        placeCount: linked.length,
      },
      stops: filledPins.map((pin, index) => ({
        placeId: pin.restaurant.id,
        order: index + 1,
        startTime: '',
        endTime: '',
        isBookmarked: false,
      })),
      createdAt: new Date().toISOString().slice(0, 10),
      isPublic: true,
      creatorId: profile.id,
      savedCount: 0,
    };

    addCourse(course);
    setTemplateForCourse(newId, template.id);
    saveCoursemapDecor(newId, placed.slice(0, MAX_PINS));
    addFeedPost({
      authorId: profile.id,
      authorName: profile.name,
      authorEmoji: profile.emoji,
      courseId: newId,
      photos: placed.slice(0, MAX_PINS).map(photo => photo.src),
      caption: caption.trim(),
      skinId: 'default',
      tags: course.tags,
    });

    // 보상 — 주먹밥 +1 (프로필 런치메이트 밥 주기용)
    let riceballs = 0;
    try {
      riceballs = Number(localStorage.getItem('lm_riceball_count') ?? '0') + 1;
      localStorage.setItem('lm_riceball_count', String(riceballs));
    } catch { riceballs = 1; }
    setRewardCount(riceballs);
    setPublishedCourseId(newId);
    setStep(4);
  };

  const goNext = () => {
    if (!canNext) {
      if (nextHint) toast.error(nextHint);
      return;
    }
    if (step === 3) { publish(); return; }
    setStep(current => current + 1);
  };

  const goBack = () => {
    if (step === 0 || step === 4) navigate('/feed?tab=feed');
    else setStep(current => current - 1);
  };

  const editingPhoto = placed.find(photo => photo.id === editingPhotoId) ?? null;

  return (
    <div className="min-h-dvh bg-[#FCF4EE] pb-32">
      {/* 헤더 */}
      <div className="sticky top-0 z-20 bg-[#FCF4EE]/95 px-4 pb-3 pt-10 backdrop-blur">
        <div className="flex items-center justify-between">
          <button
            onClick={goBack}
            aria-label="뒤로"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow"
          >
            {step === 4 ? <X size={18} /> : <ChevronLeft size={20} />}
          </button>
          <div className="text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#F25055]">Munchie 코스맵 만들기</p>
            <p className="mt-0.5 text-[15px] font-black text-[#1F1713]">{step + 1}. {STEP_TITLES[step]}</p>
          </div>
          <span className="w-9" />
        </div>
        <div className="mt-3 flex justify-center gap-1.5">
          {STEP_TITLES.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{ width: i === step ? 22 : 6, background: i <= step ? '#EB5053' : '#EDDCD2' }}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22 }}
          className="px-4 pt-4"
        >
          {step === 0 && (
            <PinsStep
              pins={pins} setPins={setPins}
              hashtags={hashtags} setHashtags={setHashtags}
              caption={caption} setCaption={setCaption}
            />
          )}

          {step === 1 && (
            <TemplateRouletteStep index={templateIndex} setIndex={setTemplateIndex} />
          )}

          {step === 2 && (
            <DecorateStep
              template={template}
              placed={placed}
              setPlaced={setPlaced}
              photoPool={photoPool}
              onAddUpload={url => setUploads(prev => [...prev, url])}
              onEditPhoto={id => setEditingPhotoId(id)}
            />
          )}

          {step === 3 && (
            <div>
              <div className="mb-4 text-center">
                <p className="text-[16px] font-black text-[#1A1A1A]">이대로 포스팅할까요?</p>
                <p className="mt-1 text-[11.5px] text-gray-400">피드에 이렇게 올라가요 · 미리보기에서는 버튼이 눌리지 않아요</p>
              </div>
              {/* 실제 게시물과 동일한 카드 — 미리보기에서는 상호작용만 비활성 */}
              <div className="pointer-events-none select-none">
                <UnifiedMunchieCard
                  post={previewPost}
                  courseOverride={previewCourse}
                  templateOverride={template}
                  decorOverride={placed}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="pt-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 15 }}
                className="text-6xl"
              >
                🎉
              </motion.div>
              <p className="mt-3 text-[20px] font-black text-[#1A1A1A]">포스팅 완료!</p>
              <p className="mt-1 text-[12.5px] text-gray-400">먼치 피드에 코스맵이 올라갔어요</p>

              {/* 보상 — 주먹밥 획득 */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="mx-auto mt-6 w-full max-w-[300px] rounded-3xl border border-[#F3DDD2] bg-white px-6 py-6 shadow-[0_12px_30px_rgba(73,44,30,0.1)]"
              >
                <motion.div
                  animate={{ y: [0, -7, 0], rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.8 }}
                  className="text-5xl"
                >
                  🍙
                </motion.div>
                <p className="mt-2 text-[15px] font-black text-[#FF424B]">주먹밥 +1 획득!</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-[#8D776C]">
                  프로필의 런치메이트에게 밥을 줄 수 있어요
                  {rewardCount != null && <><br />보유 주먹밥 <b className="text-[#3B2A22]">{rewardCount}개</b></>}
                </p>
              </motion.div>

              <div className="mx-auto mt-6 flex w-full max-w-[300px] gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/feed')}
                  className="h-12 flex-1 rounded-2xl border border-[#E8D8CF] bg-white text-[13px] font-black text-[#6E5B50] active:scale-95"
                >
                  먼치 홈으로
                </button>
                <button
                  type="button"
                  onClick={() => publishedCourseId && navigate(`/course/${publishedCourseId}/share?from=create`)}
                  disabled={!publishedCourseId}
                  className="h-12 flex-1 rounded-2xl bg-[#EB5053] text-[13px] font-black text-white active:scale-95"
                >
                  <span className="inline-flex items-center gap-1.5"><Share2 size={15} /> 공유하기</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 하단 CTA */}
      {step < 4 && (
        <div className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-32px)] max-w-[398px] -translate-x-1/2">
          <div className="flex gap-2.5">
            {step > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="h-[52px] flex-1 rounded-2xl border border-[#E8D8CF] bg-white text-[14px] font-bold text-[#6E5B50] active:scale-[0.98]"
              >
                ← 이전
              </button>
            )}
            <motion.button
              type="button"
              whileTap={{ scale: canNext ? 0.97 : 1 }}
              onClick={goNext}
              className="h-[52px] flex-[1.6] rounded-2xl text-[14px] font-black text-white shadow-lg transition-colors"
              style={{ background: canNext ? '#EB5053' : '#E5CFC5' }}
            >
              {nextLabel}
            </motion.button>
          </div>
        </div>
      )}

      {/* ④ 사진 에디터 모달 */}
      <AnimatePresence>
        {editingPhoto && (
          <PhotoEditorModal
            src={editingPhoto.src}
            onClose={() => setEditingPhotoId(null)}
            onSave={dataUrl => {
              setPlaced(prev => prev.map(photo => photo.id === editingPhoto.id ? { ...photo, src: dataUrl } : photo));
              setEditingPhotoId(null);
              toast.success('사진을 꾸몄어요 ✨');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
