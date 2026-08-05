/**
 * 코스맵 만들기 — 4단계 통합 플로우 (코스맵과 피드를 순차적으로 동시 작성)
 * ① 코스맵 정하기 — 해시태그·한줄평 + 숫자핀(최대 3) 지도검색 + 사진박스
 * ② 템플릿 선택·꾸미기 — 템플릿을 즉시 비교하며 사진 배치·크기·회전 조정
 * ③ 미리보기 — 게시 전 확인 (버튼 비활성)
 * ④ 포스팅 완료 — 랜덤 런치박스 음식 보상 지급
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useSearch } from 'wouter';
import {
  ChevronLeft, ChevronRight, Palette, Pencil, Plus,
  Eraser, Highlighter, MousePointer2, RotateCcw, RotateCw, Search, Share2,
  Trash2, Type, X, Wand2, Undo2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp, type Course, type FeedPost, type Restaurant } from '@/contexts/AppContext';
import {
  COURSEMAP_TEMPLATES,
  setTemplateForCourse,
  type CoursemapTemplate,
} from '@/constants/coursemapTemplates';
import {
  MAX_MUNCHIE_FEED_PHOTOS,
  saveCoursemapDecor,
  toFeedPhotoPlacements,
  type CoursemapCanvasStroke,
  type PlacedPhoto,
} from '@/lib/coursemapDecor';
import { getCourseMapPoints, getCurvedCourseSegments } from '@/lib/courseMapSync';
import CourseSequenceMarker from '@/components/course/CourseSequenceMarker';
import { fileToResizedDataUrl } from '@/lib/imageUtils';
import OneLineReviewBox from '@/components/munchie/OneLineReviewBox';
import UnifiedMunchieCard from '@/components/munchie/UnifiedMunchieCard';
import { TemplateBackgroundLayer, TemplateFrameLayer } from '@/components/munchie/TemplateLayers';
import {
  grantRandomLunchboxFood,
  type LunchboxFoodDefinition,
} from '@/constants/lunchboxFoods';
import { useAuthStatus } from '@/hooks/useAuthStatus';

const STEP_TITLES = [
  '코스맵을 정하세요',
  '템플릿을 선택하고 꾸며 보아요',
  '미리보기',
  '포스팅 완료!',
];

const MAX_PINS = 3;

const usesDarkToolbarIcon = (color: string) => {
  const normalized = color.toUpperCase();
  return normalized === '#FFFFFF' || normalized === '#FFE24A';
};

interface CoursePin {
  restaurant: Restaurant;
  /** null이면 사진 없이 진행 */
  photo: string | null;
}

// ── ① 코스맵 정하기 ───────────────────────────────────────────────────────────

function PinMap({ pins, activeBubble, onMarkerTap }: {
  pins: (CoursePin | null)[];
  activeBubble: number | null;
  onMarkerTap: (slot: number) => void;
}) {
  const filled = pins.filter((pin): pin is CoursePin => !!pin);
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
              onClick={() => onMarkerTap(slot)}
              className="block active:scale-90"
              aria-label={`${slot + 1}번 장소 마커`}
            >
              <CourseSequenceMarker index={slot} selected={activeBubble === slot} />
            </button>
            <span className="absolute left-1/2 top-full mt-0.5 max-w-[92px] -translate-x-1/2 truncate rounded-full bg-white/90 px-1.5 py-0.5 text-[8.5px] font-black text-[#3B2A22] shadow-sm">
              {pin.restaurant.name}
            </span>
          </div>
        );
      })}

      {filled.length === 0 && (
        <p className="absolute inset-x-4 top-1/2 -translate-y-1/2 text-center text-[12px] font-semibold text-[#B4A79A]">
          아래 숫자 마커를 눌러 말풍선에서
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
  pins: (CoursePin | null)[];
  setPins: React.Dispatch<React.SetStateAction<(CoursePin | null)[]>>;
  hashtags: string[];
  setHashtags: React.Dispatch<React.SetStateAction<string[]>>;
  caption: string;
  setCaption: (value: string) => void;
}) {
  const { restaurants } = useApp();
  const [bubbleSlot, setBubbleSlot] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [newTag, setNewTag] = useState('');

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
        <PinMap pins={pins} activeBubble={bubbleSlot} onMarkerTap={slot => setBubbleSlot(prev => prev === slot ? null : slot)} />
      </div>

      {/* 코스 순서 — 숫자핀 슬롯 (최대 3개) */}
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
                  <CourseSequenceMarker index={slot} selected={bubbleSlot === slot} />
                </button>

                {pin ? (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{pin.restaurant.name}</p>
                      <p className="truncate text-[11px] text-gray-400">{pin.restaurant.category} · {pin.restaurant.address}</p>
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
                    번호를 눌러 장소를 검색해보세요
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
    </div>
  );
}

// ── ② 템플릿 꾸미기 (drag & drop) ─────────────────────────────────────────────

export function DecorateStep({
  template, templateIndex, setTemplateIndex, placed, setPlaced, canvasStrokes, setCanvasStrokes, photoPool, onAddUpload, onRemoveFromPool, onEditPhoto,
}: {
  template: CoursemapTemplate;
  templateIndex: number;
  setTemplateIndex: React.Dispatch<React.SetStateAction<number>>;
  placed: PlacedPhoto[];
  setPlaced: React.Dispatch<React.SetStateAction<PlacedPhoto[]>>;
  canvasStrokes: CoursemapCanvasStroke[];
  setCanvasStrokes: React.Dispatch<React.SetStateAction<CoursemapCanvasStroke[]>>;
  photoPool: string[];
  onAddUpload: (url: string) => void;
  onRemoveFromPool: (url: string) => void;
  onEditPhoto: (id: string) => void;
}) {
  type CanvasTool = 'pointer' | 'pen' | 'highlight' | 'eraser';
  const canvasRef = useRef<HTMLDivElement>(null);
  const templateRailRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canvasTool, setCanvasTool] = useState<CanvasTool>('pointer');
  const [showTemplatePalette, setShowTemplatePalette] = useState(false);
  const [canvasSwipeFeedback, setCanvasSwipeFeedback] = useState<{ direction: number } | null>(null);
  const [canvasPenColor, setCanvasPenColor] = useState('#FF424B');
  const [canvasHighlightColor, setCanvasHighlightColor] = useState('#FFE24A');
  const uploadRef = useRef<HTMLInputElement>(null);
  const activeCanvasStrokeRef = useRef<string | null>(null);
  const canvasErasingRef = useRef(false);
  const templateSwipeRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const photoPointersRef = useRef(new Map<number, { id: string; x: number; y: number }>());
  const photoPinchRef = useRef<{ id: string; distance: number; zoom: number } | null>(null);
  const dragState = useRef<{
    id: string;
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const returnToPointerTool = () => {
    setCanvasTool('pointer');
    setShowTemplatePalette(false);
  };

  const handleTemplateSwipeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (canvasTool !== 'pointer' || event.target !== event.currentTarget) return;
    templateSwipeRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleTemplateSwipeEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const swipe = templateSwipeRef.current;
    templateSwipeRef.current = null;
    if (!swipe || swipe.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - swipe.x;
    const deltaY = event.clientY - swipe.y;
    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;
    setCanvasSwipeFeedback({ direction: deltaX < 0 ? -1 : 1 });
    setTemplateIndex(current => (current + (deltaX < 0 ? 1 : -1) + COURSEMAP_TEMPLATES.length) % COURSEMAP_TEMPLATES.length);
    setSelectedId(null);
  };

  const selectAndBringToFront = (id: string) => {
    setSelectedId(id);
    setPlaced(current => {
      const selectedPhoto = current.find(photo => photo.id === id);
      return selectedPhoto ? [...current.filter(photo => photo.id !== id), selectedPhoto] : current;
    });
  };

  const canvasPoint = (event: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const startCanvasStroke = (event: React.PointerEvent) => {
    const point = canvasPoint(event);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    if (canvasTool === 'eraser') {
      canvasErasingRef.current = true;
      setCanvasStrokes(current => current.filter(stroke => !stroke.points.some(strokePoint => Math.hypot(strokePoint.x - point.x, strokePoint.y - point.y) <= 7)));
      return;
    }
    if (canvasTool !== 'pen' && canvasTool !== 'highlight') return;
    const id = `canvas_stroke_${Date.now()}_${Math.round(Math.random() * 999)}`;
    activeCanvasStrokeRef.current = id;
    setCanvasStrokes(current => [...current, {
      id,
      color: canvasTool === 'highlight' ? canvasHighlightColor : canvasPenColor,
      width: canvasTool === 'highlight' ? 4.6 : 1.4,
      opacity: canvasTool === 'highlight' ? 0.42 : 1,
      points: [point],
    }]);
  };

  const moveCanvasStroke = (event: React.PointerEvent) => {
    if (canvasTool === 'eraser' && canvasErasingRef.current) {
      const point = canvasPoint(event);
      if (!point) return;
      event.preventDefault();
      setCanvasStrokes(current => current.filter(stroke => !stroke.points.some(strokePoint => Math.hypot(strokePoint.x - point.x, strokePoint.y - point.y) <= 7)));
      return;
    }
    const id = activeCanvasStrokeRef.current;
    if (!id) return;
    const point = canvasPoint(event);
    if (!point) return;
    event.preventDefault();
    setCanvasStrokes(current => current.map(stroke => stroke.id === id
      ? { ...stroke, points: [...stroke.points, point] }
      : stroke));
  };

  const addToCanvas = (src: string) => {
    returnToPointerTool();
    const existing = placed.find(photo => photo.src === src || photo.originalSrc === src);
    if (existing) {
      selectAndBringToFront(existing.id);
      return;
    }
    if (placed.length >= MAX_MUNCHIE_FEED_PHOTOS) {
      toast.info(`Munchie 피드 사진은 최대 ${MAX_MUNCHIE_FEED_PHOTOS}장까지 사용할 수 있어요`);
      return;
    }
    const id = `placed_${Date.now()}_${Math.round(Math.random() * 999)}`;
    setPlaced(prev => [...prev, {
      id, src, originalSrc: src,
      x: 38 + (prev.length % 3) * 12,
      y: 30 + (prev.length % 3) * 16,
      w: 36,
      h: 27,
      zoom: 1,
      rotate: (prev.length % 2 === 0 ? -1 : 1) * (2 + prev.length),
    }]);
    setSelectedId(id);
  };

  const updateSelected = (patch: (photo: PlacedPhoto) => Partial<PlacedPhoto>) => {
    if (!selectedId) return;
    setPlaced(prev => prev.map(photo => photo.id === selectedId ? { ...photo, ...patch(photo) } : photo));
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    const trackedPointer = photoPointersRef.current.get(event.pointerId);
    if (trackedPointer) {
      photoPointersRef.current.set(event.pointerId, { ...trackedPointer, x: event.clientX, y: event.clientY });
      const pinch = photoPinchRef.current;
      const pinchPointers = Array.from(photoPointersRef.current.values()).filter(pointer => pointer.id === pinch?.id);
      if (pinch && pinchPointers.length >= 2) {
        event.preventDefault();
        const [first, second] = pinchPointers;
        const distance = Math.hypot(second.x - first.x, second.y - first.y);
        const zoom = Math.max(1, Math.min(3, pinch.zoom * (distance / Math.max(pinch.distance, 1))));
        setPlaced(prev => prev.map(photo => photo.id === pinch.id ? { ...photo, zoom } : photo));
        return;
      }
    }
    const rect = canvasRef.current?.getBoundingClientRect();
    const drag = dragState.current;
    if (!drag || !rect || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    const x = ((event.clientX - rect.left) / rect.width) * 100 + drag.offsetX;
    const y = ((event.clientY - rect.top) / rect.height) * 100 + drag.offsetY;
    setPlaced(prev => prev.map(photo => photo.id === drag.id
      ? { ...photo, x: Math.max(6, Math.min(94, x)), y: Math.max(6, Math.min(94, y)) }
      : photo));
  };

  const handleCanvasPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    photoPointersRef.current.delete(event.pointerId);
    if (photoPointersRef.current.size < 2) photoPinchRef.current = null;
    dragState.current = null;
    handleTemplateSwipeEnd(event);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (event: WheelEvent) => {
      const photoElement = (event.target as Element | null)?.closest<HTMLElement>('[data-photo-id]');
      const photoId = photoElement?.dataset.photoId;
      if (!photoId || photoId !== selectedId) return;
      event.preventDefault();
      event.stopPropagation();
      const direction = event.deltaY < 0 ? 1 : -1;
      setPlaced(current => current.map(photo => photo.id === photoId
        ? { ...photo, zoom: Math.max(1, Math.min(3, (photo.zoom ?? 1) + direction * 0.12)) }
        : photo));
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [selectedId, setPlaced]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const knownPhotos = new Set(photoPool);
    const remainingSlots = Math.max(0, MAX_MUNCHIE_FEED_PHOTOS - knownPhotos.size);
    let addedCount = 0;
    let duplicateFound = false;
    event.target.value = '';
    for (const file of files) {
      if (addedCount >= remainingSlots) break;
      try {
        const url = await fileToResizedDataUrl(file, 900, 0.8);
        if (knownPhotos.has(url)) {
          duplicateFound = true;
          continue;
        }
        knownPhotos.add(url);
        addedCount += 1;
        onAddUpload(url);
        addToCanvas(url);
      } catch {
        toast.error('사진을 불러오지 못했어요');
      }
    }
    if (duplicateFound) toast.warning('사진이 이미 목록에 있습니다, 목록에서 추가해주세요');
  };

  const selected = placed.find(photo => photo.id === selectedId) ?? null;
  const previousTemplate = COURSEMAP_TEMPLATES[(templateIndex - 1 + COURSEMAP_TEMPLATES.length) % COURSEMAP_TEMPLATES.length]!;
  const nextTemplate = COURSEMAP_TEMPLATES[(templateIndex + 1) % COURSEMAP_TEMPLATES.length]!;
  const canvasPenIsWhite = canvasPenColor.toUpperCase() === '#FFFFFF';
  const canvasHighlightIsWhite = canvasHighlightColor.toUpperCase() === '#FFFFFF';
  const canvasPenUsesDarkIcon = usesDarkToolbarIcon(canvasPenColor);
  const canvasHighlightUsesDarkIcon = usesDarkToolbarIcon(canvasHighlightColor);

  useEffect(() => {
    if (!showTemplatePalette) return;
    const frame = requestAnimationFrame(() => {
      const rail = templateRailRef.current;
      if (!rail) return;
      const segmentWidth = rail.scrollWidth / 3;
      const itemWidth = segmentWidth / Math.max(COURSEMAP_TEMPLATES.length, 1);
      rail.scrollLeft = segmentWidth + templateIndex * itemWidth - Math.max(0, (rail.clientWidth - itemWidth) / 2);
    });
    return () => cancelAnimationFrame(frame);
    // Opening the rail recenters the current template; selection itself keeps the user's scroll position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTemplatePalette]);

  const normalizeTemplateRailPosition = () => {
    const rail = templateRailRef.current;
    if (!rail) return;
    const segmentWidth = rail.scrollWidth / 3;
    if (rail.scrollLeft < segmentWidth * 0.5) rail.scrollLeft += segmentWidth;
    else if (rail.scrollLeft > segmentWidth * 1.5) rail.scrollLeft -= segmentWidth;
  };

  useEffect(() => {
    if (!showTemplatePalette) return;
    const rail = templateRailRef.current;
    if (!rail) return;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    const handleScroll = () => {
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(normalizeTemplateRailPosition, 140);
    };
    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      rail.scrollLeft += event.deltaY;
    };
    rail.addEventListener('scroll', handleScroll, { passive: true });
    rail.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      if (settleTimer) clearTimeout(settleTimer);
      rail.removeEventListener('scroll', handleScroll);
      rail.removeEventListener('wheel', handleWheel);
    };
  }, [showTemplatePalette]);

  return (
    <div>
      <div className="mb-2 flex items-end justify-between px-1">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <p className="shrink-0 text-[13px] font-black text-[#3B2A22]">템플릿에서 바로 편집</p>
            <span className="truncate text-[11px] font-black text-[#EB5053]">{template.name}</span>
          </div>
          <p className="mt-0.5 text-[10px] text-[#9A8579]">빈 곳을 좌우로 스와이프해 템플릿을 바꾸고, 사진을 끌어 옮겨보세요.</p>
        </div>
        <span className="mr-1 shrink-0 rounded-full bg-[#FFF0EC] px-2.5 py-1 text-[13px] font-black text-[#D94D52]">{placed.length}/{MAX_MUNCHIE_FEED_PHOTOS}</span>
      </div>

      <div className="mx-auto mb-1 w-full max-w-[330px] rounded-2xl border border-[#EFE1D7] bg-white px-2 py-2 shadow-sm">
        <div className="flex items-center justify-center gap-2">
          <button type="button" title="사진 선택·이동" onClick={() => { setCanvasTool('pointer'); setShowTemplatePalette(false); }} aria-label="사진 선택 및 이동" aria-pressed={canvasTool === 'pointer' && !showTemplatePalette} className={`flex h-9 w-9 items-center justify-center rounded-full active:scale-90 ${canvasTool === 'pointer' && !showTemplatePalette ? 'bg-[#3B2A22] text-white' : 'bg-[#FFF2ED] text-[#D94D52]'}`}><MousePointer2 size={16} /></button>
          <button type="button" title="모든 템플릿" onClick={() => { setShowTemplatePalette(current => !current); setCanvasTool('pointer'); }} aria-label="모든 템플릿 보기" aria-expanded={showTemplatePalette} aria-pressed={showTemplatePalette} className={`flex h-9 w-9 items-center justify-center rounded-full active:scale-90 ${showTemplatePalette ? 'bg-[#3B2A22] text-white' : 'bg-[#FFF2ED] text-[#D94D52]'}`}><Palette size={16} /></button>
          <button type="button" title="그리기" onClick={() => { setCanvasTool('pen'); setShowTemplatePalette(false); setSelectedId(null); }} aria-label="템플릿 전체에 그리기" aria-pressed={canvasTool === 'pen'} className={`flex h-9 w-9 items-center justify-center rounded-full border-2 active:scale-90 ${canvasTool === 'pen' ? '' : 'border-transparent bg-[#FFF2ED] text-[#D94D52]'}`} style={canvasTool === 'pen' ? { backgroundColor: canvasPenColor, borderColor: canvasPenIsWhite ? '#111111' : canvasPenColor, color: canvasPenUsesDarkIcon ? '#111111' : '#FFFFFF' } : undefined}><Pencil size={16} /></button>
          <button type="button" title="하이라이터" onClick={() => { setCanvasTool('highlight'); setShowTemplatePalette(false); setSelectedId(null); }} aria-label="템플릿 하이라이터" aria-pressed={canvasTool === 'highlight'} className={`flex h-9 w-9 items-center justify-center rounded-full border-2 active:scale-90 ${canvasTool === 'highlight' ? '' : 'border-transparent bg-[#FFF2ED] text-[#D94D52]'}`} style={canvasTool === 'highlight' ? { backgroundColor: canvasHighlightColor, borderColor: canvasHighlightIsWhite ? '#111111' : canvasHighlightColor, color: canvasHighlightUsesDarkIcon ? '#111111' : '#FFFFFF' } : undefined}><Highlighter size={16} /></button>
          <button type="button" title="지우개" onClick={() => { setCanvasTool('eraser'); setShowTemplatePalette(false); setSelectedId(null); }} aria-label="템플릿 지우개" aria-pressed={canvasTool === 'eraser'} className={`flex h-9 w-9 items-center justify-center rounded-full active:scale-90 ${canvasTool === 'eraser' ? 'bg-[#3B2A22] text-white' : 'bg-[#FFF2ED] text-[#D94D52]'}`}><Eraser size={16} /></button>
          <button type="button" title="한 획 되돌리기" onClick={() => setCanvasStrokes(current => current.slice(0, -1))} aria-label="전체 그림 한 획 되돌리기" disabled={canvasStrokes.length === 0} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF2ED] text-[#6E5B50] active:scale-90 disabled:opacity-35"><Undo2 size={16} /></button>
        </div>
        {canvasTool === 'pen' && (
          <div className="mt-2 flex items-center justify-center gap-2" aria-label="템플릿 펜 색상 선택">
            {['#FF424B', '#2B211D', '#FFFFFF', '#2E8BFF', '#35B96F', '#FFE24A'].map(color => (
              <button key={color} type="button" onClick={() => setCanvasPenColor(color)} aria-label={`펜 색상 ${color}`} className={`h-6 w-6 rounded-full border-2 ${canvasPenColor === color ? 'scale-110 border-[#FF424B]' : 'border-[#E9D8CF]'}`} style={{ backgroundColor: color }} />
            ))}
          </div>
        )}
        {canvasTool === 'highlight' && (
          <div className="mt-2 flex items-center justify-center gap-2" aria-label="템플릿 하이라이터 색상 선택">
            {['#FFE24A', '#FF8FB1', '#8FE3B0', '#79C7FF', '#C6A0FF', '#FFAD66'].map(color => (
              <button key={color} type="button" onClick={() => setCanvasHighlightColor(color)} aria-label={`하이라이터 색상 ${color}`} className={`h-6 w-6 rounded-full border-2 ${canvasHighlightColor === color ? 'scale-110 border-[#D94D52]' : 'border-[#E9D8CF]'}`} style={{ backgroundColor: color }} />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showTemplatePalette && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mx-auto mb-2 w-full max-w-[330px] rounded-2xl border border-[#ECDDD3] bg-white p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-black text-[#3B2A22]">모든 템플릿</p>
              <span className="text-[9px] font-semibold text-[#9A8579]">눌러서 바로 적용</span>
            </div>
            <div ref={templateRailRef} data-ui="infinite-template-rail" className="flex cursor-grab touch-pan-x overflow-x-auto overscroll-x-contain pb-1 active:cursor-grabbing scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
              {[0, 1, 2].map(copyIndex => (
                <div key={copyIndex} data-template-segment={copyIndex} className="flex shrink-0 gap-2 pr-2">
                  {COURSEMAP_TEMPLATES.map((option, index) => (
                    <button key={`${copyIndex}_${option.id}`} type="button" data-template-copy={copyIndex} onClick={() => { setCanvasSwipeFeedback(null); setTemplateIndex(index); setSelectedId(null); }} aria-label={`${option.name} 템플릿 적용`} className={`w-[92px] shrink-0 overflow-hidden rounded-xl border-2 bg-[#F8F1EB] p-1 text-left ${index === templateIndex ? 'border-[#FF424B]' : 'border-transparent'}`}>
                      <span className="block aspect-[3/4] overflow-hidden rounded-lg"><img src={option.image} alt="" className="h-full w-full object-cover" draggable={false} /></span>
                      <span className={`mt-1 block truncate text-center text-[9px] font-black ${index === templateIndex ? 'text-[#D94D52]' : 'text-[#6E5B50]'}`}>{option.name}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 캔버스 — 템플릿 + 배치된 사진 */}
      <div className="relative mx-auto w-full max-w-[360px] overflow-visible py-2">
        <div data-template-peek="previous" aria-hidden="true" className="pointer-events-none absolute -left-2 bottom-5 top-5 z-0 w-[330px] max-w-[calc(100%_-_28px)] -rotate-2 overflow-hidden rounded-2xl border-2 border-white bg-[#F1E7DE] opacity-90 shadow-[0_8px_20px_rgba(75,46,32,0.22)]">
          <TemplateBackgroundLayer template={previousTemplate} loading="eager" />
        </div>
        <div data-template-peek="next" aria-hidden="true" className="pointer-events-none absolute -right-2 bottom-5 top-5 z-0 w-[330px] max-w-[calc(100%_-_28px)] rotate-2 overflow-hidden rounded-2xl border-2 border-white bg-[#F1E7DE] opacity-90 shadow-[0_8px_20px_rgba(75,46,32,0.22)]">
          <TemplateBackgroundLayer template={nextTemplate} loading="eager" />
        </div>
        <span aria-hidden="true" className="pointer-events-none absolute -left-1 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-[#F2D8CC] bg-white/95 text-[#E35355] shadow-md"><ChevronLeft size={16} /></span>
        <span aria-hidden="true" className="pointer-events-none absolute -right-1 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-[#F2D8CC] bg-white/95 text-[#E35355] shadow-md"><ChevronRight size={16} /></span>
        <motion.div
          key={template.id}
          ref={canvasRef}
          initial={canvasSwipeFeedback ? { x: canvasSwipeFeedback.direction * 8, rotate: canvasSwipeFeedback.direction * 0.35 } : false}
          animate={canvasSwipeFeedback
            ? { x: [canvasSwipeFeedback.direction * 8, canvasSwipeFeedback.direction * -2, 0], rotate: [canvasSwipeFeedback.direction * 0.35, canvasSwipeFeedback.direction * -0.1, 0] }
            : { x: 0, rotate: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onAnimationComplete={() => setCanvasSwipeFeedback(null)}
          className="relative isolate z-10 mx-auto w-[calc(100%_-_28px)] max-w-[330px] touch-none select-none overflow-hidden rounded-2xl border-2 border-white shadow-[0_10px_26px_rgba(75,46,32,0.24)]"
          style={{ aspectRatio: '3/4' }}
          aria-label="템플릿 편집 캔버스"
          data-template-index={templateIndex}
          data-swipe-feedback={canvasSwipeFeedback ? 'active' : 'idle'}
          onPointerDown={handleTemplateSwipeStart}
          onPointerMove={handlePointerMove}
          onPointerUp={handleCanvasPointerEnd}
          onPointerCancel={event => { photoPointersRef.current.delete(event.pointerId); photoPinchRef.current = null; dragState.current = null; templateSwipeRef.current = null; }}
          onClick={() => setSelectedId(null)}
        >
        <TemplateBackgroundLayer template={template} loading="eager" />
        {placed.map(photo => (
          <div
            key={photo.id}
            data-photo-id={photo.id}
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
              photoPointersRef.current.set(event.pointerId, { id: photo.id, x: event.clientX, y: event.clientY });
              const samePhotoPointers = Array.from(photoPointersRef.current.values()).filter(pointer => pointer.id === photo.id);
              if (samePhotoPointers.length >= 2) {
                const [first, second] = samePhotoPointers;
                photoPinchRef.current = {
                  id: photo.id,
                  distance: Math.hypot(second.x - first.x, second.y - first.y),
                  zoom: photo.zoom ?? 1,
                };
                dragState.current = null;
                event.currentTarget.setPointerCapture?.(event.pointerId);
                return;
              }
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect) return;
              const pointerX = ((event.clientX - rect.left) / rect.width) * 100;
              const pointerY = ((event.clientY - rect.top) / rect.height) * 100;
              dragState.current = {
                id: photo.id,
                pointerId: event.pointerId,
                offsetX: photo.x - pointerX,
                offsetY: photo.y - pointerY,
              };
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onClick={event => event.stopPropagation()}
          >
            <div className={`h-full w-full overflow-hidden rounded-[8px] bg-transparent shadow-[0_6px_16px_rgba(63,38,24,0.2)] ${photo.id === selectedId ? 'ring-2 ring-[#FF424B]' : ''}`}>
              <img src={photo.src} alt="" className="h-full w-full object-cover transition-transform duration-100" style={{ transform: `scale(${photo.zoom ?? 1})` }} draggable={false} />
            </div>
          </div>
        ))}
        {placed.length === 0 && (
          <p className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-xl bg-white/75 px-3 py-2.5 text-center text-[11.5px] font-semibold text-[#8D776C] backdrop-blur-sm">
            아래 사진을 눌러 템플릿 위에 올린 뒤<br />drag & drop으로 꾸며보세요
          </p>
        )}
        <TemplateFrameLayer template={template} loading="eager" />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-40 h-full w-full" aria-hidden="true">
          {canvasStrokes.map(stroke => (
            <polyline key={stroke.id} points={stroke.points.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke={stroke.color} opacity={stroke.opacity ?? 1} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </svg>
        {canvasTool !== 'pointer' && (
          <div
            className={`absolute inset-0 z-40 touch-none ${canvasTool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'}`}
            aria-label={canvasTool === 'eraser' ? '템플릿 그림 지우기 영역' : canvasTool === 'highlight' ? '템플릿 하이라이터 영역' : '템플릿 전체 그리기 영역'}
            onPointerDown={startCanvasStroke}
            onPointerMove={moveCanvasStroke}
            onPointerUp={() => { activeCanvasStrokeRef.current = null; canvasErasingRef.current = false; }}
            onPointerCancel={() => { activeCanvasStrokeRef.current = null; canvasErasingRef.current = false; }}
          />
        )}
        </motion.div>
      </div>

      {/* 선택된 사진 컨트롤 — 크기 조정 · 회전 · 에디터 · 삭제 */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="mx-auto mt-3 w-full max-w-[330px] rounded-2xl border border-[#EFE3D8] bg-white px-3 py-2.5 shadow-sm"
          >
            <div className="grid grid-cols-2 gap-3">
              <label className="min-w-0 text-[10px] font-bold text-[#6E5B50]">
                <span className="mb-1 block">가로</span>
                <input type="range" min="14" max="88" value={selected.w} onChange={event => updateSelected(() => ({ w: Number(event.target.value) }))} className="block w-full accent-[#FF424B]" />
              </label>
              <label className="min-w-0 text-[10px] font-bold text-[#6E5B50]">
                <span className="mb-1 block">세로</span>
                <input type="range" min="10" max="88" value={selected.h ?? selected.w} onChange={event => updateSelected(() => ({ h: Number(event.target.value) }))} className="block w-full accent-[#FF424B]" />
              </label>
            </div>
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <button type="button" onClick={() => updateSelected(p => ({ rotate: p.rotate - 15 }))} aria-label="사진 반시계 방향 회전" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF4EF] text-[#3B2A22] active:scale-90"><RotateCcw size={14} /></button>
              <button type="button" onClick={() => updateSelected(p => ({ rotate: p.rotate + 15 }))} aria-label="사진 시계 방향 회전" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF4EF] text-[#3B2A22] active:scale-90"><RotateCw size={14} /></button>
              <button type="button" onClick={() => onEditPhoto(selected.id)} className="flex h-8 items-center gap-1 rounded-full bg-[#FF424B] px-3 text-[11px] font-black text-white active:scale-95"><Wand2 size={12} /> 포토 에디터</button>
              <button type="button" onClick={() => { returnToPointerTool(); setPlaced(prev => prev.filter(p => p.id !== selected.id)); setSelectedId(null); }} aria-label="삭제" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF4EF] text-[#D94447] active:scale-90"><Trash2 size={14} /></button>
            </div>
            <p className="mt-1.5 text-center text-[9px] font-semibold text-[#9A8579]">선택한 사진 위에서 휠 또는 두 손가락으로 확대·축소 ({(selected.zoom ?? 1).toFixed(1)}×)</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 업로드한 사진목록 */}
      <p className="mt-4 mb-1.5 text-xs text-gray-400">업로드한 사진목록 — 눌러서 템플릿에 올리기 (최대 {MAX_MUNCHIE_FEED_PHOTOS}장)</p>
      <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-hide">
        {photoPool.map(src => (
          <div key={src.slice(0, 80)} className="relative h-16 w-16 shrink-0">
          <button
            type="button"
            onClick={() => { returnToPointerTool(); addToCanvas(src); }}
            className="h-full w-full overflow-hidden rounded-xl border border-[#EFE3D8] active:scale-95"
          >
            <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
          </button>
          <button type="button" onClick={() => { returnToPointerTool(); onRemoveFromPool(src); setPlaced(prev => prev.filter(photo => photo.src !== src && photo.originalSrc !== src)); }} aria-label="사진 목록에서 삭제" className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/80 bg-[#D94447] text-white shadow"><X size={11} /></button>
          </div>
        ))}
        {photoPool.length < MAX_MUNCHIE_FEED_PHOTOS && (
          <button
            type="button"
            onClick={() => { returnToPointerTool(); uploadRef.current?.click(); }}
            className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-dashed border-[#E0D2C6] text-[#B0A090] active:scale-95"
          >
            <Plus size={18} />
            <span className="text-[8px] font-bold">사진 추가</span>
          </button>
        )}
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

type EditorTool = 'pointer' | 'pen' | 'highlight' | 'text' | 'eraser';

interface EditorStroke {
  tool: 'pen' | 'highlight';
  color: string;
  points: { x: number; y: number }[];
}

interface EditorText {
  id: string;
  value: string;
  x: number;
  y: number;
}

export function photoFrameSizeForCropAspect(photo: PlacedPhoto, cropAspect: number) {
  const frameWidthToHeight = Math.max(0.2, Math.min(5, cropAspect)) * (4 / 3);
  let w = Math.max(14, Math.min(88, photo.w));
  let h = w / frameWidthToHeight;
  if (h > 88) { h = 88; w = h * frameWidthToHeight; }
  if (h < 10) { h = 10; w = h * frameWidthToHeight; }
  if (w > 88) { w = 88; h = w / frameWidthToHeight; }
  if (w < 14) { w = 14; h = w / frameWidthToHeight; }
  return { w, h };
}

export function PhotoEditorModal({ src, originalSrc, cropAspect, onSave, onBack }: {
  src: string;
  originalSrc: string;
  cropAspect: number;
  onSave: (dataUrl: string, cropAspect: number) => void;
  onBack: (cropAspect: number) => void;
}) {
  const initialSafeCropAspect = Math.max(0.2, Math.min(5, cropAspect));
  const initialCropGuide = initialSafeCropAspect >= 1
    ? { width: 100, height: 100 / initialSafeCropAspect }
    : { width: initialSafeCropAspect * 100, height: 100 };
  const [workingSrc, setWorkingSrc] = useState(src);
  const [filterId, setFilterId] = useState<(typeof FILTER_PRESETS)[number]['id']>('none');
  const [zoom, setZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropGuideOffset, setCropGuideOffset] = useState({ x: 0, y: 0 });
  const [cropGuide, setCropGuide] = useState(initialCropGuide);
  const [imageAspect, setImageAspect] = useState(1);
  const [tool, setTool] = useState<EditorTool>('pointer');
  const [penColor, setPenColor] = useState('#FF424B');
  const [highlightColor, setHighlightColor] = useState('#FFE24A');
  const [strokes, setStrokes] = useState<EditorStroke[]>([]);
  const [texts, setTexts] = useState<EditorText[]>([]);
  const [textDraft, setTextDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const zoomPointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const panRef = useRef<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const guideDragRef = useRef<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const guideResizeRef = useRef<{ pointerId: number; edge: 'top' | 'right' | 'bottom' | 'left'; left: number; right: number; top: number; bottom: number } | null>(null);
  const textDragRef = useRef<{ id: string; pointerId: number } | null>(null);

  const filter = FILTER_PRESETS.find(preset => preset.id === filterId)!;
  const penIsWhite = penColor.toUpperCase() === '#FFFFFF';
  const highlightIsWhite = highlightColor.toUpperCase() === '#FFFFFF';
  const penUsesDarkIcon = usesDarkToolbarIcon(penColor);
  const highlightUsesDarkIcon = usesDarkToolbarIcon(highlightColor);
  const safeCropAspect = Math.max(0.2, Math.min(5, cropGuide.width / Math.max(cropGuide.height, 0.001)));
  const clampGuideOffset = (offset: { x: number; y: number }) => ({
    x: Math.max(-(100 - cropGuide.width) / 2, Math.min((100 - cropGuide.width) / 2, offset.x)),
    y: Math.max(-(100 - cropGuide.height) / 2, Math.min((100 - cropGuide.height) / 2, offset.y)),
  });
  const clampZoom = (value: number) => Math.min(3, Math.max(1, value));
  const cropBounds = (targetZoom: number) => {
    const baseWidth = imageAspect >= 1 ? imageAspect : 1;
    const baseHeight = imageAspect >= 1 ? 1 : 1 / Math.max(imageAspect, 0.0001);
    return {
      x: Math.max(0, (baseWidth * targetZoom - 1) * 50),
      y: Math.max(0, (baseHeight * targetZoom - 1) * 50),
    };
  };
  const clampCropOffset = (offset: { x: number; y: number }, targetZoom: number) => {
    const bounds = cropBounds(targetZoom);
    return {
      x: Math.max(-bounds.x, Math.min(bounds.x, offset.x)),
      y: Math.max(-bounds.y, Math.min(bounds.y, offset.y)),
    };
  };
  const applyZoom = (value: number) => {
    const nextZoom = clampZoom(value);
    setZoom(nextZoom);
    setCropOffset(current => clampCropOffset(current, nextZoom));
  };
  const selectTool = (nextTool: EditorTool) => {
    setTool(nextTool);
    setTextDraft(nextTool === 'text' ? '' : null);
    drawingRef.current = false;
    zoomPointersRef.current.clear();
    pinchRef.current = null;
    panRef.current = null;
    guideDragRef.current = null;
    guideResizeRef.current = null;
  };
  const resetEdits = () => {
    setWorkingSrc(originalSrc);
    setFilterId('none');
    setZoom(1);
    setCropOffset({ x: 0, y: 0 });
    setCropGuideOffset({ x: 0, y: 0 });
    setCropGuide(initialCropGuide);
    setStrokes([]);
    setTexts([]);
    selectTool('pointer');
  };

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (tool !== 'pointer') return;
      const direction = event.deltaY < 0 ? 0.1 : -0.1;
      setZoom(current => {
        const nextZoom = clampZoom(current + direction);
        setCropOffset(offset => clampCropOffset(offset, nextZoom));
        return nextZoom;
      });
    };
    box.addEventListener('wheel', handleWheel, { passive: false });
    return () => box.removeEventListener('wheel', handleWheel);
  }, [imageAspect, tool]);

  const pointerDistance = () => {
    const points = Array.from(zoomPointersRef.current.values());
    if (points.length < 2) return 0;
    return Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y);
  };

  const pointFromEvent = (event: React.PointerEvent) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
    };
  };

  const startGuideResize = (event: React.PointerEvent<HTMLButtonElement>, edge: 'top' | 'right' | 'bottom' | 'left') => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const centerX = 50 + cropGuideOffset.x;
    const centerY = 50 + cropGuideOffset.y;
    guideResizeRef.current = {
      pointerId: event.pointerId,
      edge,
      left: centerX - cropGuide.width / 2,
      right: centerX + cropGuide.width / 2,
      top: centerY - cropGuide.height / 2,
      bottom: centerY + cropGuide.height / 2,
    };
  };

  const moveGuideResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    const resize = guideResizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    const point = pointFromEvent(event);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    let { left, right, top, bottom } = resize;
    if (resize.edge === 'left') left = Math.max(0, Math.min(right - 20, point.x));
    if (resize.edge === 'right') right = Math.min(100, Math.max(left + 20, point.x));
    if (resize.edge === 'top') top = Math.max(0, Math.min(bottom - 20, point.y));
    if (resize.edge === 'bottom') bottom = Math.min(100, Math.max(top + 20, point.y));
    setCropGuide({ width: right - left, height: bottom - top });
    setCropGuideOffset({ x: (left + right) / 2 - 50, y: (top + bottom) / 2 - 50 });
  };

  const endGuideResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    guideResizeRef.current = null;
  };

  const eraseAt = (point: { x: number; y: number }) => {
    const radius = 7;
    setStrokes(current => current.filter(stroke => !stroke.points.some(strokePoint => (
      Math.hypot(strokePoint.x - point.x, strokePoint.y - point.y) <= radius
    ))));
    setTexts(current => current.filter(text => Math.hypot(text.x - point.x, text.y - point.y) > radius + 2));
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    if (tool === 'pointer') {
      zoomPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (zoomPointersRef.current.size === 2) {
        pinchRef.current = { distance: pointerDistance(), zoom };
        panRef.current = null;
        guideDragRef.current = null;
      } else {
        const point = pointFromEvent(event);
        const guideCenterX = 50 + cropGuideOffset.x;
        const guideCenterY = 50 + cropGuideOffset.y;
        const insideGuide = !!point
          && Math.abs(point.x - guideCenterX) <= cropGuide.width / 2
          && Math.abs(point.y - guideCenterY) <= cropGuide.height / 2;
        if (insideGuide) {
          guideDragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, offsetX: cropGuideOffset.x, offsetY: cropGuideOffset.y };
          panRef.current = null;
        } else {
          panRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, offsetX: cropOffset.x, offsetY: cropOffset.y };
          guideDragRef.current = null;
        }
      }
      return;
    }
    const point = pointFromEvent(event);
    if (!point) return;
    if (tool === 'eraser') {
      drawingRef.current = true;
      eraseAt(point);
      return;
    }
    if (tool === 'text') return;
    drawingRef.current = true;
    setStrokes(prev => [...prev, {
      tool,
      color: tool === 'highlight' ? highlightColor : penColor,
      points: [point],
    }]);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (tool === 'pointer') {
      if (!zoomPointersRef.current.has(event.pointerId)) return;
      zoomPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const pinch = pinchRef.current;
      if (pinch && zoomPointersRef.current.size >= 2 && pinch.distance > 0) {
        applyZoom(pinch.zoom * (pointerDistance() / pinch.distance));
      } else if (guideDragRef.current?.pointerId === event.pointerId && boxRef.current) {
        const size = boxRef.current.getBoundingClientRect().width || 1;
        setCropGuideOffset(clampGuideOffset({
          x: guideDragRef.current.offsetX + ((event.clientX - guideDragRef.current.x) / size) * 100,
          y: guideDragRef.current.offsetY + ((event.clientY - guideDragRef.current.y) / size) * 100,
        }));
      } else if (panRef.current?.pointerId === event.pointerId && boxRef.current) {
        const size = boxRef.current.getBoundingClientRect().width || 1;
        setCropOffset(clampCropOffset({
          x: panRef.current.offsetX + ((event.clientX - panRef.current.x) / size) * 100,
          y: panRef.current.offsetY + ((event.clientY - panRef.current.y) / size) * 100,
        }, zoom));
      }
      return;
    }
    if (!drawingRef.current) return;
    const point = pointFromEvent(event);
    if (!point) return;
    if (tool === 'eraser') {
      eraseAt(point);
      return;
    }
    if (tool === 'text') return;
    setStrokes(prev => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last) last.points = [...last.points, point];
      return next;
    });
  };

  const handlePointerEnd = (event: React.PointerEvent) => {
    zoomPointersRef.current.delete(event.pointerId);
    if (zoomPointersRef.current.size < 2) pinchRef.current = null;
    if (panRef.current?.pointerId === event.pointerId) panRef.current = null;
    if (guideDragRef.current?.pointerId === event.pointerId) guideDragRef.current = null;
    drawingRef.current = false;
  };

  const moveText = (event: React.PointerEvent, id: string) => {
    if (textDragRef.current?.id !== id || textDragRef.current.pointerId !== event.pointerId) return;
    const point = pointFromEvent(event);
    if (!point) return;
    event.preventDefault();
    event.stopPropagation();
    setTexts(current => current.map(text => text.id === id ? {
      ...text,
      x: Math.max(4, Math.min(96, point.x)),
      y: Math.max(4, Math.min(96, point.y)),
    } : text));
  };

  const commitText = () => {
    const value = textDraft?.trim();
    if (value) {
      setTexts(prev => [...prev, { id: `text_${Date.now()}`, value, x: 50, y: 50 }]);
    }
    setTextDraft(null);
    setTool('pointer');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('image load failed'));
        image.src = workingSrc;
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
      ctx.drawImage(
        image,
        (SIZE - drawW) / 2 + (cropOffset.x / 100) * SIZE,
        (SIZE - drawH) / 2 + (cropOffset.y / 100) * SIZE,
        drawW,
        drawH,
      );
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

      const cropX = ((50 + cropGuideOffset.x - cropGuide.width / 2) / 100) * SIZE;
      const cropY = ((50 + cropGuideOffset.y - cropGuide.height / 2) / 100) * SIZE;
      const cropW = (cropGuide.width / 100) * SIZE;
      const cropH = (cropGuide.height / 100) * SIZE;
      const outputCanvas = document.createElement('canvas');
      if (safeCropAspect >= 1) {
        outputCanvas.width = SIZE;
        outputCanvas.height = Math.max(1, Math.round(SIZE / safeCropAspect));
      } else {
        outputCanvas.width = Math.max(1, Math.round(SIZE * safeCropAspect));
        outputCanvas.height = SIZE;
      }
      const outputContext = outputCanvas.getContext('2d')!;
      outputContext.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, outputCanvas.width, outputCanvas.height);
      onSave(outputCanvas.toDataURL('image/jpeg', 0.85), safeCropAspect);
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
      {/* 헤더 — Back / Reset / Save */}
      <div className="relative flex items-center justify-between px-4 pb-2 pt-11">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => onBack(safeCropAspect)} aria-label="사진 편집 뒤로가기" title="뒤로가기" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white/85 active:scale-90"><ChevronLeft size={18} /></button>
          <button type="button" onClick={resetEdits} aria-label="사진 편집 초기화" title="초기화" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white/85 active:scale-90"><RotateCcw size={16} /></button>
        </div>
        <p className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[13px] font-black text-white">사진 에디터</p>
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
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onDoubleClick={() => { applyZoom(1); setCropOffset({ x: 0, y: 0 }); }}
        >
          <img
            src={workingSrc}
            alt=""
            className="pointer-events-none absolute max-w-none select-none"
            style={{
              filter: filter.css === 'none' ? undefined : filter.css,
              left: `calc(50% + ${cropOffset.x}%)`,
              top: `calc(50% + ${cropOffset.y}%)`,
              width: imageAspect >= 1 ? `${imageAspect * 100}%` : '100%',
              height: imageAspect >= 1 ? '100%' : `${(1 / Math.max(imageAspect, 0.0001)) * 100}%`,
              transform: `translate(-50%, -50%) scale(${zoom})`,
            }}
            onLoad={event => {
              const nextAspect = event.currentTarget.naturalWidth / Math.max(event.currentTarget.naturalHeight, 1);
              setImageAspect(nextAspect);
              setCropOffset({ x: 0, y: 0 });
            }}
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
              role="button"
              tabIndex={0}
              aria-label={`${text.value} 텍스트 위치 이동`}
              className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 touch-none select-none text-[22px] font-black text-[#2B211D] ${tool === 'eraser' ? 'cursor-crosshair' : tool === 'pointer' ? 'cursor-move' : 'cursor-default'}`}
              style={{ left: `${text.x}%`, top: `${text.y}%`, textShadow: '0 0 6px white, 0 0 6px white' }}
              onPointerDown={event => {
                event.preventDefault();
                event.stopPropagation();
                if (tool === 'eraser') {
                  setTexts(current => current.filter(item => item.id !== text.id));
                  return;
                }
                if (tool !== 'pointer') return;
                textDragRef.current = { id: text.id, pointerId: event.pointerId };
                event.currentTarget.setPointerCapture?.(event.pointerId);
              }}
              onPointerMove={event => moveText(event, text.id)}
              onPointerUp={event => { event.stopPropagation(); textDragRef.current = null; }}
              onPointerCancel={() => { textDragRef.current = null; }}
            >
              {text.value}
            </span>
          ))}
          <div
            aria-label="템플릿에 표시되는 사진 영역"
            data-crop-aspect={safeCropAspect.toFixed(4)}
            className={`pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-[5px] border-2 border-white/90 ${tool === 'pointer' ? 'shadow-[0_0_0_1px_rgba(0,0,0,0.22)]' : ''}`}
            style={{
              left: `${50 + cropGuideOffset.x}%`,
              top: `${50 + cropGuideOffset.y}%`,
              width: `${cropGuide.width}%`,
              height: `${cropGuide.height}%`,
              boxShadow: '0 0 0 999px rgba(12, 9, 8, 0.62), 0 0 0 1px rgba(0, 0, 0, 0.22)',
            }}
          />
          {tool === 'pointer' && (
            <>
              <button type="button" aria-label="크롭 영역 위쪽 크기 조절" className="absolute z-50 h-3 w-12 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize touch-none rounded-full border-2 border-[#2B211D]/35 bg-white shadow" style={{ left: `${50 + cropGuideOffset.x}%`, top: `${50 + cropGuideOffset.y - cropGuide.height / 2}%` }} onPointerDown={event => startGuideResize(event, 'top')} onPointerMove={moveGuideResize} onPointerUp={endGuideResize} onPointerCancel={endGuideResize} />
              <button type="button" aria-label="크롭 영역 오른쪽 크기 조절" className="absolute z-50 h-12 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none rounded-full border-2 border-[#2B211D]/35 bg-white shadow" style={{ left: `${50 + cropGuideOffset.x + cropGuide.width / 2}%`, top: `${50 + cropGuideOffset.y}%` }} onPointerDown={event => startGuideResize(event, 'right')} onPointerMove={moveGuideResize} onPointerUp={endGuideResize} onPointerCancel={endGuideResize} />
              <button type="button" aria-label="크롭 영역 아래쪽 크기 조절" className="absolute z-50 h-3 w-12 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize touch-none rounded-full border-2 border-[#2B211D]/35 bg-white shadow" style={{ left: `${50 + cropGuideOffset.x}%`, top: `${50 + cropGuideOffset.y + cropGuide.height / 2}%` }} onPointerDown={event => startGuideResize(event, 'bottom')} onPointerMove={moveGuideResize} onPointerUp={endGuideResize} onPointerCancel={endGuideResize} />
              <button type="button" aria-label="크롭 영역 왼쪽 크기 조절" className="absolute z-50 h-12 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none rounded-full border-2 border-[#2B211D]/35 bg-white shadow" style={{ left: `${50 + cropGuideOffset.x - cropGuide.width / 2}%`, top: `${50 + cropGuideOffset.y}%` }} onPointerDown={event => startGuideResize(event, 'left')} onPointerMove={moveGuideResize} onPointerUp={endGuideResize} onPointerCancel={endGuideResize} />
            </>
          )}
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
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">사진 꾸미기</p>
          <p className="text-right text-[9.5px] font-semibold text-white/55">흰색 영역 드래그 · 휠/핀치 확대</p>
        </div>
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => selectTool('pointer')}
            className={`flex h-9 w-9 items-center justify-center rounded-xl active:scale-90 ${tool === 'pointer' ? 'bg-white text-[#2B211D]' : 'bg-white/12 text-white/75'}`}
            aria-label="사진 선택 및 이동"
            aria-pressed={tool === 'pointer'}
          >
            <MousePointer2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => selectTool(tool === 'pen' ? 'pointer' : 'pen')}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 active:scale-90 ${tool === 'pen' ? '' : 'border-transparent bg-white/12 text-white/75'}`}
            style={tool === 'pen' ? { backgroundColor: penColor, borderColor: penIsWhite ? '#111111' : penColor, color: penUsesDarkIcon ? '#111111' : '#FFFFFF' } : undefined}
            aria-label="그리기"
            aria-pressed={tool === 'pen'}
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={() => selectTool(tool === 'highlight' ? 'pointer' : 'highlight')}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 active:scale-90 ${tool === 'highlight' ? '' : 'border-transparent bg-white/12 text-white/75'}`}
            style={tool === 'highlight' ? { backgroundColor: highlightColor, borderColor: highlightIsWhite ? '#111111' : highlightColor, color: highlightUsesDarkIcon ? '#111111' : '#FFFFFF' } : undefined}
            aria-label="하이라이터"
            aria-pressed={tool === 'highlight'}
          >
            <Highlighter size={15} />
          </button>
          <button
            type="button"
            onClick={() => selectTool(tool === 'text' ? 'pointer' : 'text')}
            className={`flex h-9 w-9 items-center justify-center rounded-xl active:scale-90 ${tool === 'text' ? 'bg-white text-[#2B211D]' : 'bg-white/12 text-white/75'}`}
            aria-label="텍스트"
            aria-pressed={tool === 'text'}
          >
            <Type size={15} />
          </button>
          <button
            type="button"
            onClick={() => selectTool(tool === 'eraser' ? 'pointer' : 'eraser')}
            className={`flex h-9 w-9 items-center justify-center rounded-xl active:scale-90 ${tool === 'eraser' ? 'bg-white text-[#2B211D]' : 'bg-white/12 text-white/75'}`}
            aria-label="지우개"
            aria-pressed={tool === 'eraser'}
          >
            <Eraser size={15} />
          </button>
        </div>
        {tool === 'pen' && (
          <div className="mt-2 flex items-center justify-center gap-2" aria-label="펜 색상 선택">
            {['#FF424B', '#2B211D', '#FFFFFF', '#2E8BFF', '#35B96F', '#FFE24A'].map(color => (
              <button key={color} type="button" onClick={() => setPenColor(color)} aria-label={`펜 색상 ${color}`} className={`h-6 w-6 rounded-full border-2 ${penColor === color ? 'scale-110 border-[#FF424B]' : 'border-white/40'}`} style={{ backgroundColor: color }} />
            ))}
          </div>
        )}
        {tool === 'highlight' && (
          <div className="mt-2 flex items-center justify-center gap-2" aria-label="하이라이터 색상 선택">
            {['#FFE24A', '#FF8FB1', '#8FE3B0', '#79C7FF', '#C6A0FF', '#FFAD66'].map(color => (
              <button key={color} type="button" onClick={() => setHighlightColor(color)} aria-label={`하이라이터 색상 ${color}`} className={`h-6 w-6 rounded-full border-2 ${highlightColor === color ? 'scale-110 border-white' : 'border-white/40'}`} style={{ backgroundColor: color }} />
            ))}
          </div>
        )}
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
                <img src={workingSrc} alt="" className="h-full w-full object-cover" style={{ filter: preset.css === 'none' ? undefined : preset.css }} draggable={false} />
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

function CoursemapCreateContent() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const sourceCourseId = new URLSearchParams(search).get('course');
  const {
    profile, updateProfile, getCourseById, getRestaurantById, addCourse, refreshFeedPosts,
  } = useApp();

  // 복사해서 가져오기 — 기존 코스의 장소·해시태그를 초기값으로
  const sourceCourse = sourceCourseId ? getCourseById(sourceCourseId) : undefined;
  const initialPins = useMemo<(CoursePin | null)[]>(() => {
    const slots: (CoursePin | null)[] = [null, null, null];
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
  const [pins, setPins] = useState<(CoursePin | null)[]>(initialPins);
  const [hashtags, setHashtags] = useState<string[]>(
    sourceCourse ? sourceCourse.hashtags.map(tag => tag.replace(/^#/, '')) : [],
  );
  const [caption, setCaption] = useState('');
  const [templateIndex, setTemplateIndex] = useState(0);
  const [placed, setPlaced] = useState<PlacedPhoto[]>([]);
  const [canvasStrokes, setCanvasStrokes] = useState<CoursemapCanvasStroke[]>([]);
  const [uploads, setUploads] = useState<string[]>([]);
  const [hiddenPhotoSources, setHiddenPhotoSources] = useState<string[]>([]);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [reward, setReward] = useState<{
    food: LunchboxFoodDefinition;
    quantity: number;
  } | null>(null);
  const [publishedCourseId, setPublishedCourseId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const filledPins = pins.filter((pin): pin is CoursePin => !!pin);
  const template = COURSEMAP_TEMPLATES[templateIndex]!;
  const photoPool = useMemo(() => {
    const pinPhotos = filledPins.map(pin => pin.photo).filter((photo): photo is string => !!photo);
    return Array.from(new Set([...pinPhotos, ...uploads])).filter(photo => !hiddenPhotoSources.includes(photo));
  }, [hiddenPhotoSources, pins, uploads]);
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
    authorImage: profile.avatarPhoto,
    courseId: previewCourse.id,
    photos: placed.map(photo => photo.src),
    caption: caption.trim(),
    skinId: template.id,
    photoPlacements: toFeedPhotoPlacements(placed),
    canvasStrokes,
    likes: 0,
    dislikes: 0,
    saves: 0,
    comments: [],
    createdAt: new Date().toISOString(),
    tags: previewCourse.tags,
  };

  const canNext =
    step === 0 ? filledPins.length > 0 && caption.trim().length > 0 :
    step === 1 ? placed.length > 0 :
    true;

  const nextLabel =
    step === 0 ? '다음 →' :
    step === 1 ? '미리보기' :
    step === 2 ? '포스팅' : '';

  const nextHint =
    step === 0 && filledPins.length === 0 ? '장소를 1곳 이상 찍어주세요' :
    step === 0 && !caption.trim() ? '한줄평을 입력해주세요' :
    step === 1 && placed.length === 0 ? '사진을 1장 이상 올려주세요' :
    null;

  const publish = async () => {
    if (isPublishing) return;
    if (filledPins.length === 0 || placed.length === 0) {
      toast.error('장소와 사진을 확인한 뒤 다시 포스팅해주세요');
      return;
    }

    setIsPublishing(true);
    try {
      const linked = filledPins.map(pin => pin.restaurant);
      const tagPool = Array.from(new Set(linked.flatMap(restaurant => restaurant.tags)));
      const title = `${linked[0]!.name}${linked.length > 1 ? ` 외 ${linked.length - 1}곳` : ''} 코스`;
      const publishedPhotos = placed.slice(0, MAX_MUNCHIE_FEED_PHOTOS);
      const course: Course = {
        id: '',
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
        creatorId: '',
        savedCount: 0,
      };

      const persistPhoto = async (src: string) => {
        if (!src.startsWith('data:image/')) return src;
        const uploaded = await fetch('/api/uploads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataUrl: src }) });
        const payload = await uploaded.json() as { url?: string; error?: string };
        if (!uploaded.ok || !payload.url) throw new Error(payload.error ?? '사진을 업로드하지 못했어요.');
        return payload.url;
      };
      const serverPlaced = await Promise.all(publishedPhotos.map(async photo => ({ ...photo, src: await persistPhoto(photo.src) })));
      const serverPhotos = Array.from(new Set(serverPlaced.map(photo => photo.src)));
      const response = await fetch('/api/courses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: course.title, description: course.description, heroImage: serverPhotos[0] ?? course.heroImage,
          tags: course.tags, hashtags: course.hashtags, region: course.region,
          metadata: course.metadata, stops: course.stops, feedPhotos: serverPhotos,
          feedDecor: serverPlaced, templateId: template.id,
        }),
      });
      const saved = await response.json() as { id?: string; authorId?: string; error?: string; code?: string };
      if (response.status === 401 || saved.code === 'AUTH_REQUIRED') {
        toast.error('포스팅하려면 Google 로그인이 필요해요.');
        window.location.assign('/api/auth/google/start?next=%2Fcoursemap%2Fnew');
        return;
      }
      if (!response.ok || !saved.id) throw new Error(saved.error ?? '코스를 저장하지 못했어요.');
      const persistedCourse = { ...course, id: saved.id, creatorId: saved.authorId ?? profile.id };
      addCourse(persistedCourse);
      await refreshFeedPosts();
      setTemplateForCourse(saved.id, template.id);
      saveCoursemapDecor(saved.id, serverPlaced, canvasStrokes);

      // 보상은 프로필과 같은 인벤토리에 기록해 런치박스 보유 수량을 즉시 동기화한다.
      const grantedReward = grantRandomLunchboxFood(profile.lunchboxInventory);
      updateProfile({ lunchboxInventory: grantedReward.inventory });
      setReward({ food: grantedReward.food, quantity: grantedReward.quantity });
      setPublishedCourseId(saved.id);
      setStep(3);
    } catch (error) {
      console.error('[CoursemapCreatePage] 포스팅 실패', error);
      toast.error(error instanceof Error ? error.message : '포스팅에 실패했어요. 잠시 후 다시 시도해주세요');
    } finally {
      setIsPublishing(false);
    }
  };

  const goNext = () => {
    if (!canNext) {
      if (nextHint) toast.error(nextHint);
      return;
    }
    if (step === 2) { void publish(); return; }
    setStep(current => current + 1);
  };

  const goBack = () => {
    if (step === 0 || step === 3) navigate('/feed?tab=feed');
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
            {step === 3 ? <X size={18} /> : <ChevronLeft size={20} />}
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
            <DecorateStep
                template={template}
                templateIndex={templateIndex}
                setTemplateIndex={setTemplateIndex}
                placed={placed}
                setPlaced={setPlaced}
                canvasStrokes={canvasStrokes}
                setCanvasStrokes={setCanvasStrokes}
                photoPool={photoPool}
                onAddUpload={url => {
                  setHiddenPhotoSources(prev => prev.filter(photo => photo !== url));
                  setUploads(prev => prev.includes(url) ? prev : [...prev, url]);
                }}
                onRemoveFromPool={url => {
                  setHiddenPhotoSources(prev => prev.includes(url) ? prev : [...prev, url]);
                  setUploads(prev => prev.filter(photo => photo !== url));
                }}
                onEditPhoto={id => setEditingPhotoId(id)}
              />
          )}

          {step === 2 && (
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
                  strokesOverride={canvasStrokes}
                />
              </div>
            </div>
          )}

          {step === 3 && (
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

              {/* 보상 — 랜덤 음식 획득 */}
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
                  {reward?.food.placeholder ?? '🍱'}
                </motion.div>
                <p className="mt-2 text-[15px] font-black text-[#FF424B]">
                  {reward ? `${reward.food.name} +1 획득!` : '랜덤 음식 +1 획득!'}
                </p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-[#8D776C]">
                  프로필의 나의 런치박스에 바로 담았어요
                  {reward && <><br />보유 {reward.food.name} <b className="text-[#3B2A22]">{reward.quantity}개</b></>}
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
      {step < 3 && (
        <div className="page-bottom-bar fixed bottom-4 left-1/2 z-30 w-[calc(100%-32px)] max-w-[398px] -translate-x-1/2">
          <div className="flex w-full gap-2.5">
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
              whileTap={{ scale: canNext && !isPublishing ? 0.97 : 1 }}
              onClick={goNext}
              disabled={isPublishing}
              className="h-[52px] flex-[1.6] rounded-2xl text-[14px] font-black text-white shadow-lg transition-colors"
              style={{ background: canNext ? '#EB5053' : '#E5CFC5' }}
            >
              {isPublishing ? '저장 중…' : nextLabel}
            </motion.button>
          </div>
        </div>
      )}

      {/* 사진 에디터 모달 */}
      <AnimatePresence>
        {editingPhoto && (
          <PhotoEditorModal
            src={editingPhoto.src}
            originalSrc={editingPhoto.originalSrc ?? editingPhoto.src}
            cropAspect={(editingPhoto.w * 3) / ((editingPhoto.h ?? editingPhoto.w) * 4)}
            onBack={nextCropAspect => {
              setPlaced(prev => prev.map(photo => photo.id === editingPhoto.id
                ? { ...photo, ...photoFrameSizeForCropAspect(photo, nextCropAspect) }
                : photo));
              setEditingPhotoId(null);
            }}
            onSave={(dataUrl, nextCropAspect) => {
              setPlaced(prev => prev.map(photo => photo.id === editingPhoto.id
                ? { ...photo, src: dataUrl, zoom: 1, ...photoFrameSizeForCropAspect(photo, nextCropAspect) }
                : photo));
              setEditingPhotoId(null);
              toast.success('사진을 꾸몄어요 ✨');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// 공개 콘텐츠 작성은 서버 소유권 검증과 같은 Google 세션을 사용한다.
export default function CoursemapCreatePage() {
  const auth = useAuthStatus();
  const search = useSearch();
  const next = `/coursemap/new${search}`;

  useEffect(() => {
    if (auth.data?.isAnonymous) {
      window.location.replace(`/api/auth/google/start?next=${encodeURIComponent(next)}`);
    }
  }, [auth.data?.isAnonymous, next]);

  if (auth.isError) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#FCF4EE] px-6 text-center">
        <p className="text-sm font-bold text-[#8C7D74]">로그인 상태를 확인하지 못했어요.</p>
        <button type="button" className="lm-btn-primary px-5" onClick={() => auth.refetch()}>
          다시 시도
        </button>
      </main>
    );
  }

  if (auth.isLoading || !auth.data || auth.data.isAnonymous) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#FCF4EE] px-6 text-center">
        <p className="text-sm font-bold text-[#8C7D74]">로그인 확인 중…</p>
      </main>
    );
  }

  return <CoursemapCreateContent />;
}
