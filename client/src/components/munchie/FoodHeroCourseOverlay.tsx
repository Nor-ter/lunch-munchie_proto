import React, { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ChevronLeft, ChevronRight, ImageOff, Route } from 'lucide-react';
import {
  resolveFeedStorySlides,
  type FeedStoryOverlay,
  type FeedStorySlide,
} from '@/lib/feedStory';

export interface FoodHeroCourseStop {
  id: string;
  name?: string | null;
  category?: string | null;
  address?: string | null;
}

interface FoodHeroCourseOverlayProps {
  /** 작성자가 이 게시물에 직접 업로드한 사진만 전달한다. */
  photos?: Array<string | null | undefined>;
  /** 사진별로 서버에 보존한 정보 오버레이. photos 밖의 경로는 렌더링하지 않는다. */
  slides?: FeedStorySlide[] | null;
  /** photos와 같은 순서의 명시적 식당 귀속. 없는 값은 임의 식당으로 대체하지 않는다. */
  photoRestaurantIds?: Array<string | null | undefined>;
  title?: string | null;
  caption?: string | null;
  stops?: FoodHeroCourseStop[];
  placeCount?: number | null;
  distanceKm?: number | null;
  durationMinutes?: number | null;
  compact?: boolean;
  eager?: boolean;
  className?: string;
  /** Compact cards use the carousel itself as the accessible detail action. */
  onActivate?: () => void;
}

const cleanText = (value: string | null | undefined) => {
  const cleaned = value?.trim();
  return cleaned || undefined;
};

const positiveNumber = (value: number | null | undefined) => (
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
);

export function getAuthorPhotoSources(photos: FoodHeroCourseOverlayProps['photos'] = []) {
  return Array.from(new Set(
    photos
      .map(cleanText)
      .filter((source): source is string => Boolean(source)),
  ));
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${Math.round(minutes)}분`;
  const hours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes % 60);
  return remainder ? `${hours}시간 ${remainder}분` : `${hours}시간`;
}

const toneClasses: Record<FeedStoryOverlay['tone'], string> = {
  light: 'text-white [text-shadow:0_2px_9px_rgba(0,0,0,0.8)]',
  dark: 'rounded-xl border border-white/10 bg-black/55 px-3 py-2 text-white shadow-lg backdrop-blur-sm',
  accent: 'rounded-xl border border-white/15 bg-[#F25055]/90 px-3 py-2 text-white shadow-lg backdrop-blur-sm',
};

const sizeClasses: Record<FeedStoryOverlay['size'], string> = {
  sm: 'text-[10px] leading-snug',
  md: 'text-[13px] leading-snug',
  lg: 'text-[22px] leading-tight',
};

function CourseMapSchematic({ stops, compact }: { stops: FoodHeroCourseStop[]; compact: boolean }) {
  const visibleStops = stops.slice(0, 3);
  const points = visibleStops.map((_, index) => {
    if (visibleStops.length === 1) return { x: 50, y: 14 };
    return {
      x: 10 + (index * 80) / (visibleStops.length - 1),
      y: index % 2 === 0 ? 10 : 22,
    };
  });
  const line = points.map(point => `${point.x},${point.y}`).join(' ');

  return (
    <div data-overlay-content="course-map" className="w-full">
      <svg viewBox="0 0 100 32" className={`${compact ? 'h-7' : 'h-10'} w-full overflow-visible`} aria-hidden="true">
        {points.length > 1 && (
          <>
            <polyline points={line} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {points.map((point, index) => (
          <g key={visibleStops[index]?.id ?? index}>
            <circle cx={point.x} cy={point.y} r="4.5" fill="currentColor" stroke="white" strokeWidth="1.5" />
            <text x={point.x} y={point.y + 1.8} textAnchor="middle" fontSize="4.5" fontWeight="900" fill="#30211B">
              {index + 1}
            </text>
          </g>
        ))}
      </svg>
      <ol className="flex min-w-0 items-center gap-1 overflow-hidden" aria-label="코스 순서">
        {visibleStops.map((stop, index) => (
          <li key={stop.id} className="min-w-0 max-w-[46%] truncate text-[9px] font-black">
            {index + 1}. {cleanText(stop.name) ?? '장소'}
          </li>
        ))}
        {stops.length > visibleStops.length && (
          <li className="shrink-0 text-[9px] font-black">+{stops.length - visibleStops.length}</li>
        )}
      </ol>
    </div>
  );
}

function StoryOverlayItem({
  overlay,
  stops,
  compact,
}: {
  overlay: FeedStoryOverlay;
  stops: FoodHeroCourseStop[];
  compact: boolean;
}) {
  const referencedRestaurant = overlay.restaurantId
    ? stops.find(stop => stop.id === overlay.restaurantId)
    : undefined;
  const text = cleanText(overlay.text) ?? (
    overlay.kind === 'restaurant_name' ? cleanText(referencedRestaurant?.name) : undefined
  );
  if (overlay.kind === 'course_map' && stops.length === 0) return null;
  if (overlay.kind !== 'course_map' && !text) return null;

  return (
    <div
      data-overlay-kind={overlay.kind}
      className={`pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 break-words font-black ${toneClasses[overlay.tone]} ${compact ? 'max-h-[28%] overflow-hidden' : ''} ${sizeClasses[compact && overlay.size === 'lg' ? 'md' : overlay.size]}`}
      style={{
        left: `${overlay.x}%`,
        top: `${overlay.y}%`,
        width: `${overlay.width}%`,
        textAlign: overlay.align,
      }}
    >
      {overlay.kind === 'course_map'
        ? <CourseMapSchematic stops={stops} compact={compact} />
        : <span className={overlay.kind === 'review' ? 'border-l-2 border-[#FF8D82] pl-2' : undefined}>{text}</span>}
    </div>
  );
}

function slideAlt(slide: FeedStorySlide, fallbackTitle: string) {
  const label = slide.overlays.find(overlay => (
    overlay.kind === 'food_name' || overlay.kind === 'restaurant_name'
  ))?.text;
  return `${cleanText(label) ?? fallbackTitle} 음식 사진`;
}

/**
 * Munchie Feed의 사진 중심, 사진별 정보 오버레이 비주얼.
 *
 * 사진 후보는 게시물 작성자 업로드만 사용한다. 실패한 슬라이드는 같은 위치에서
 * 명시적인 빈 상태를 보여 주며 다른 사진이나 식당 대표 사진으로 대체하지 않는다.
 */
export default function FoodHeroCourseOverlay({
  photos = [],
  slides,
  photoRestaurantIds,
  title,
  caption,
  stops = [],
  placeCount,
  distanceKm,
  durationMinutes,
  compact = false,
  eager = false,
  className = '',
  onActivate,
}: FoodHeroCourseOverlayProps) {
  const photoSources = useMemo(() => getAuthorPhotoSources(photos), [photos]);
  const resolvedPhotoRestaurantIds = useMemo(() => {
    if (!photoRestaurantIds?.length) return undefined;
    const firstRestaurantByPhoto = new Map<string, string | null | undefined>();
    photos.forEach((rawPhoto, index) => {
      const photo = cleanText(rawPhoto);
      if (photo && !firstRestaurantByPhoto.has(photo)) {
        firstRestaurantByPhoto.set(photo, photoRestaurantIds[index]);
      }
    });
    return photoSources.map(photo => firstRestaurantByPhoto.get(photo));
  }, [photoRestaurantIds, photoSources, photos]);
  const resolvedDistance = positiveNumber(distanceKm);
  const resolvedDuration = positiveNumber(durationMinutes);
  const storySlides = useMemo(() => resolveFeedStorySlides(slides, photoSources, {
    title,
    caption,
    stops,
    distanceKm: resolvedDistance,
    durationLabel: resolvedDuration ? formatDuration(resolvedDuration) : undefined,
    ...(resolvedPhotoRestaurantIds ? { photoRestaurantIds: resolvedPhotoRestaurantIds } : {}),
  }), [caption, photoSources, resolvedDistance, resolvedDuration, resolvedPhotoRestaurantIds, slides, stops, title]);
  const storyKey = storySlides.map(slide => `${slide.id}:${slide.photo}`).join('\n');
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedSlideIds, setFailedSlideIds] = useState<string[]>([]);
  const pointerStartRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    setActiveIndex(0);
    setFailedSlideIds([]);
  }, [storyKey]);

  const safeIndex = Math.min(activeIndex, Math.max(0, storySlides.length - 1));
  const activeSlide = storySlides[safeIndex];
  const slideFailed = activeSlide ? failedSlideIds.includes(activeSlide.id) : false;
  const stopNames = stops.map(stop => cleanText(stop.name)).filter((name): name is string => Boolean(name));
  const resolvedPlaceCount = stops.length || positiveNumber(placeCount);
  const cleanedTitle = cleanText(title);
  const displayTitle = resolvedPlaceCount === 1
    ? stopNames[0] ?? cleanedTitle ?? '한 곳을 담은 코스'
    : cleanedTitle
      ?? (stopNames[0] && resolvedPlaceCount && resolvedPlaceCount > 1
        ? `${stopNames[0]} 외 ${resolvedPlaceCount - 1}곳`
        : '나만의 Munchie 코스');
  const hasPrevious = safeIndex > 0;
  const hasNext = safeIndex < storySlides.length - 1;

  const showPrevious = () => setActiveIndex(index => Math.max(0, index - 1));
  const showNext = () => setActiveIndex(index => Math.min(storySlides.length - 1, index + 1));

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    pointerStartRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start || start.id !== event.pointerId) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const horizontalSwipe = Math.abs(deltaX) >= 44 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
    if (!horizontalSwipe) return;

    // UnifiedMunchieCard listens for pointer-up to detect a double-like. A real
    // slide gesture must end here so swiping never mutates the like state.
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = true;
    globalThis.setTimeout(() => { suppressClickRef.current = false; }, 0);
    if (deltaX < 0) showNext();
    else showPrevious();
  };

  const handleClickCapture = (event: React.MouseEvent<HTMLElement>) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <section
      data-ui="munchie-food-hero"
      data-state={activeSlide && !slideFailed ? 'photo' : 'empty'}
      data-slide-index={safeIndex}
      className={`relative aspect-[4/5] w-full touch-pan-y select-none overflow-hidden bg-[#30211B] text-white outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white/90 ${className}`}
      aria-label={`${displayTitle} 사진 슬라이드${onActivate ? '. Enter 키로 피드 상세 보기' : ''}`}
      aria-roledescription="carousel"
      aria-keyshortcuts={onActivate ? 'ArrowLeft ArrowRight Enter Space' : 'ArrowLeft ArrowRight'}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { pointerStartRef.current = null; }}
      onClickCapture={handleClickCapture}
      onClick={event => {
        if (!event.defaultPrevented) onActivate?.();
      }}
      onKeyDown={event => {
        if (event.key === 'ArrowLeft' && hasPrevious) {
          event.preventDefault();
          showPrevious();
        }
        if (event.key === 'ArrowRight' && hasNext) {
          event.preventDefault();
          showNext();
        }
        if (onActivate && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          event.stopPropagation();
          onActivate();
        }
      }}
    >
      {activeSlide ? (
        <div key={activeSlide.id} role="group" aria-roledescription="slide" aria-label={`${safeIndex + 1} / ${storySlides.length}`} className="absolute inset-0">
          {!slideFailed ? (
            <>
              <img
                src={activeSlide.photo}
                alt={slideAlt(activeSlide, displayTitle)}
                loading={eager && safeIndex === 0 ? 'eager' : 'lazy'}
                fetchPriority={eager && safeIndex === 0 ? 'high' : 'auto'}
                onError={() => setFailedSlideIds(current => (
                  current.includes(activeSlide.id) ? current : [...current, activeSlide.id]
                ))}
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/45" />
              {activeSlide.overlays.map(overlay => (
                <StoryOverlayItem key={overlay.id} overlay={overlay} stops={stops} compact={compact} />
              ))}
            </>
          ) : (
            <div role="status" aria-live="polite" aria-atomic="true" className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_35%,#6C5146_0%,#3A2922_52%,#261A16_100%)] px-8 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10">
                <ImageOff size={28} aria-hidden="true" />
              </span>
              <strong className="mt-4 text-[15px] font-black">이 음식 사진을 표시할 수 없어요</strong>
              <span className="mt-1 text-[11px] font-semibold text-white/65">다른 사진으로 자동 대체하지 않아요</span>
            </div>
          )}
        </div>
      ) : (
        <div role="status" aria-live="polite" aria-atomic="true" className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_35%,#6C5146_0%,#3A2922_52%,#261A16_100%)] px-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10">
            <ImageOff size={28} aria-hidden="true" />
          </span>
          <strong className="mt-4 text-[15px] font-black">작성자가 등록한 음식 사진이 없어요</strong>
          <span className="mt-2 max-w-full truncate text-[13px] font-black text-white/90">{displayTitle}</span>
          <span className="mt-1 text-[11px] font-semibold text-white/65">코스 정보만 확인할 수 있어요</span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 p-3">
        {resolvedPlaceCount ? (
          <span className="flex h-7 items-center gap-1 rounded-full border border-white/15 bg-black/35 px-2.5 text-[10px] font-black backdrop-blur-sm">
            <Route size={12} aria-hidden="true" />
            {resolvedPlaceCount}곳 코스
          </span>
        ) : <span />}
        {storySlides.length > 1 && (
          <span aria-live="polite" aria-atomic="true" className="rounded-full border border-white/15 bg-black/35 px-2.5 py-1.5 text-[10px] font-black backdrop-blur-sm">
            {safeIndex + 1} / {storySlides.length}
          </span>
        )}
      </div>

      {!compact && storySlides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="이전 음식 사진"
            disabled={!hasPrevious}
            onPointerUp={event => event.stopPropagation()}
            onClick={event => { event.stopPropagation(); showPrevious(); }}
            className="absolute left-2 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-sm disabled:opacity-25"
          >
            <ChevronLeft size={19} />
          </button>
          <button
            type="button"
            aria-label="다음 음식 사진"
            disabled={!hasNext}
            onPointerUp={event => event.stopPropagation()}
            onClick={event => { event.stopPropagation(); showNext(); }}
            className="absolute right-2 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-sm disabled:opacity-25"
          >
            <ChevronRight size={19} />
          </button>
          <div className="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center gap-1.5" aria-hidden="true">
            {storySlides.map((slide, index) => (
              <span key={slide.id} className={`h-1.5 rounded-full bg-white shadow ${index === safeIndex ? 'w-5' : 'w-1.5 opacity-55'}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
