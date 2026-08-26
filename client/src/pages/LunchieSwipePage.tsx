/**
 * Lunchie Munchie — Quick Match Page
 * Design: Soft Coral (Option 8) + Pubfish Reference
 * Flow: 스와이프 → 결과 발표
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, useMotionTemplate, AnimatePresence, type MotionValue } from 'framer-motion';
import { useLocation } from 'wouter';
import { Heart, X, Star, MapPin, Clock, Phone, Navigation, Share2, Download, Link2, Home, Bookmark, RotateCcw, Loader2, RefreshCw, SlidersHorizontal, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useApp, type Restaurant, type MenuItem } from '@/contexts/AppContext';
import { useCourseShare } from '@/hooks/useCourseShare';
import WinnerShareCard from '@/components/lunchie/WinnerShareCard';
import LunchmateCharacterRenderer from '@/components/munchie/LunchmateCharacterRenderer';
import { activateLunchieWaitingCompanion } from '@/components/lunchie/LunchieWaitingCompanion';
import FoodImage from '@/components/FoodImage';
import MenuItemDetail from '@/components/MenuItemDetail';
import { logSwipe, logWinner, logNavigate, logEvent, flushEvents } from '@/lib/eventLogger';
import { lunchmateLoadoutFromProfile } from '@/utils/lunchmateProfile';
import { intentForCategory } from '@shared/intent';
import { persistSessionSwipe } from '@/services/sessionApi';
import { classifySwipeAvailability, type SwipeAvailability } from '@/lib/swipeAvailability';
import { isActiveQuickMatchStatus } from '@/lib/quickMatch';
import { beginMenuPhotoRotation, completeMenuPhotoRotation } from '@/lib/menuPhotoRotation';
import { normalizeRestaurantPayload } from '@shared/restaurantContract';
import SessionManagementMenu from '@/components/lunchie/SessionManagementMenu';
import BackButton from '@/components/ui/BackButton';
import QuickMatchRestaurantDetailSheet from '@/components/lunchie/QuickMatchRestaurantDetailSheet';
import { restaurantSummary } from '@/lib/restaurantPresentation';

// ─── Types ────────────────────────────────────────────────────────────────────

type SwipeAction = 'like' | 'dislike';

function SwipeStateScreen({
  state,
  onRetry,
}: {
  state: Exclude<SwipeAvailability, 'ready'>;
  onRetry?: () => void;
}) {
  const [, navigate] = useLocation();
  const { currentSession } = useApp();
  const content = {
    loading: {
      title: '결승 후보를 준비하고 있어요',
      description: '빠른 매칭과 식당 후보를 준비하고 있어요…',
    },
    'api-error': {
      title: '빠른 매칭을 불러오지 못했어요',
      description: '인터넷 연결을 확인하고 다시 시도해 주세요.',
    },
    'catalog-empty': {
      title: '아직 추천할 식당이 없어요',
      description: '이 빠른 매칭에 맞는 식당 후보를 불러오지 못했어요.',
    },
    'no-matches': {
      title: '조건에 맞는 식당이 없어요',
      description: '검색 거리를 늘리거나 취향 조건을 조정해 보세요.',
    },
    'session-missing': {
      title: '빠른 매칭을 다시 준비할게요',
      description: '진행 중인 빠른 매칭이 없어요. 설정에서 새로 시작해 주세요.',
    },
    'session-invalid': {
      title: '더 이상 참여할 수 없는 빠른 매칭이에요',
      description: '이미 종료·만료·취소됐거나 대기방에서 나간 세션일 수 있어요.',
    },
    'session-not-started': {
      title: '아직 빠른 매칭이 시작되지 않았어요',
      description: '대기방으로 돌아가 호스트가 시작할 때까지 기다려 주세요.',
    },
  }[state];
  const canRetry = state === 'api-error' || state === 'catalog-empty';
  const primaryLabel = state === 'no-matches'
    ? '조건 수정하기'
    : state === 'session-not-started'
      ? '대기방으로 돌아가기'
      : '설정으로 돌아가기';
  const primaryPath = state === 'session-not-started' ? '/session/lobby' : '/lunchie/settings';

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#FFF6F2] px-5 py-10">
      <section role={state === 'loading' ? 'status' : 'alert'} aria-live="polite" className="w-full max-w-[390px] rounded-[26px] border border-[#F2DDD8] bg-white p-6 text-center shadow-[0_16px_44px_rgba(137,89,79,0.12)]">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#FFF0EE] text-[#F4515E]">
          {state === 'loading'
            ? <Loader2 size={30} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            : state === 'no-matches'
              ? <SlidersHorizontal size={28} aria-hidden="true" />
              : <span className="text-3xl" aria-hidden="true">🍽️</span>}
        </div>
        <h1 className="mt-4 text-[20px] font-black tracking-[-0.3px] text-[#26232A]">{content.title}</h1>
        <p className="mx-auto mt-2 max-w-[300px] text-[13px] leading-relaxed text-[#776E72]">{content.description}</p>
        {state === 'loading' ? (
          <div className="mt-6 space-y-2" aria-hidden="true">
            <div className="h-3 animate-pulse rounded-full bg-[#F4ECE9] motion-reduce:animate-none" />
            <div className="mx-auto h-3 w-3/4 animate-pulse rounded-full bg-[#F4ECE9] motion-reduce:animate-none" />
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            <button type="button" onClick={() => navigate(primaryPath)} className="min-h-12 w-full rounded-2xl bg-[#F4515E] px-4 text-[14px] font-black text-white outline-none focus-visible:ring-2 focus-visible:ring-[#F4515E] focus-visible:ring-offset-2">
              {primaryLabel}
            </button>
            {canRetry && onRetry && (
              <button type="button" onClick={onRetry} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#E9D8D3] bg-[#FFF9F6] px-4 text-[13px] font-bold text-[#5E5559] outline-none focus-visible:ring-2 focus-visible:ring-[#F4515E]">
                <RefreshCw size={15} aria-hidden="true" /> 다시 시도
              </button>
            )}
            {currentSession && (state === 'catalog-empty' || state === 'no-matches' || state === 'session-not-started') && (
              <div className="flex items-center justify-center gap-1 pt-2 text-[11px] font-semibold text-[#81767A]">
                이 세션 관리
                <SessionManagementMenu onEnded={() => navigate('/lunchie/settings')} className="text-[#81767A]" />
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// 소스 메뉴판의 섹션 구조 그대로 유지 — 등장 순서대로 그룹핑(알파벳 재정렬 X).
function groupByCategory(items: MenuItem[]): [string, MenuItem[]][] {
  const order: string[] = [];
  const map = new Map<string, MenuItem[]>();
  for (const it of items) {
    const key = it.category || '메뉴';
    if (!map.has(key)) { map.set(key, []); order.push(key); }
    map.get(key)!.push(it);
  }
  return order.map((k) => [k, map.get(k)!]);
}

// 큐브 회전 이징 — 참고 슬라이더의 cubic-bezier(0.5,-0.75,0.2,1.5)처럼 살짝 오버슈트하는 탄성감.
const CUBE_EASE = [0.5, -0.4, 0.2, 1.4] as const;
const CUBE_DURATION = 0.7;

// 메뉴 사진들을 정육면체의 네 옆면에 배치하고, 좌/우 탭 시 큐브를 Y축으로 90도씩 굴려
// 다음/이전 사진을 보여주는 진짜 3D 큐브 슬라이더(tl_revise 애니메이션 UI). step: 단조 증가/감소
// 정수(다음 +1, 이전 -1). 90도 도는 동안 실제 보이는 면은 나가는 면+들어오는 면 둘뿐이라 네 면만으로
// 임의 개수 사진을 끊김 없이 굴린다.
function MenuCube({ photos, step, onPhotoError, onRotationComplete }: {
  photos: string[];
  step: number;
  onPhotoError?: (src: string) => void;
  onRotationComplete?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [depth, setDepth] = useState(160);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setDepth(el.clientWidth / 2);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = photos.length || 1;
  const photoIndex = ((step % n) + n) % n;
  const front = ((step % 4) + 4) % 4;

  // 처음 열릴 때 모든 면을 첫 사진으로 채우면, 옆면이 보이는 순간 첫
  // 메뉴 사진이 중복으로 튀어나온다. 각 면을 순서대로 준비해 둔 뒤,
  // 회전 직전에 들어올 면만 다음 사진으로 교체한다.
  const faceState = useRef<{ photoKey: string; faces: number[] } | null>(null);
  const photoKey = photos.join("\u0000");
  if (!faceState.current || faceState.current.photoKey !== photoKey) {
    faceState.current = {
      photoKey,
      faces: Array.from({ length: 4 }, (_, face) => face % n),
    };
  }
  faceState.current.faces[front] = photoIndex;
  const faces = faceState.current.faces;

  return (
    <div ref={ref} className="absolute inset-0 pointer-events-none" style={{ perspective: 1000 }}>
      <div className="w-full h-full" style={{ transformStyle: 'preserve-3d', transform: `translateZ(-${depth}px)` }}>
        <motion.div
          className="w-full h-full relative"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: -90 * step }}
          transition={{ duration: CUBE_DURATION, ease: CUBE_EASE }}
          onAnimationComplete={onRotationComplete}
        >
          {[0, 1, 2, 3].map(f => (
            <div
              key={f}
              className="absolute inset-0 overflow-hidden"
              style={{
                transform: `rotateY(${90 * f}deg) translateZ(${depth}px)`,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              <img
                src={photos[faces[f]]}
                alt=""
                className="w-full h-full object-cover"
                draggable={false}
                onError={() => onPhotoError?.(photos[faces[f]])}
              />
              <motion.div
                className="absolute inset-0 bg-black"
                animate={{ opacity: f === front ? 0 : 0.45 }}
                transition={{ duration: CUBE_DURATION, ease: CUBE_EASE }}
              />
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// tl_branch: 좋아요 방향으로 끌 때 사방으로 퍼지는 빛 파티클.
function LikeSparkle({
  x, dx, dy, size, rotateTo, top, left,
}: {
  x: MotionValue<number>;
  dx: number;
  dy: number;
  size: number;
  rotateTo: number;
  top: string;
  left: string;
}) {
  const opacity = useTransform(x, [0, 25, 90, 210], [0, 1, 1, 0]);
  const translateX = useTransform(x, [0, 210], [0, dx]);
  const translateY = useTransform(x, [0, 210], [0, dy]);
  const rotate = useTransform(x, [0, 210], [0, rotateTo]);
  const scale = useTransform(x, [0, 25, 210], [0.1, 1.1, 1.5]);

  return (
    <motion.span
      className="absolute pointer-events-none select-none"
      style={{
        top,
        left,
        opacity,
        x: translateX,
        y: translateY,
        rotate,
        scale,
        fontSize: size,
        lineHeight: 1,
        color: '#FFFDF0',
        textShadow: '0 0 6px rgba(255,255,255,0.95), 0 0 16px rgba(255,221,130,0.9), 0 0 28px rgba(255,200,80,0.6)',
      }}
    >
      ✦
    </motion.span>
  );
}

// ─── Swipe Card ───────────────────────────────────────────────────────────────

function SwipeCard({
  restaurant,
  onAction,
  isTop,
  stackIndex,
  progress,
  total,
  isLocked,
  onOpenRestaurantDetails,
}: {
  restaurant: any;
  onAction: (a: SwipeAction) => void;
  isTop: boolean;
  stackIndex: number;
  progress: number;
  total: number;
  isLocked: boolean;
  onOpenRestaurantDetails: (restaurant: Restaurant) => void;
}) {
  const [isRevealed, setIsRevealed] = useState(false);
  // 큐브 회전 단계(단조). photoIndex는 foodPhotos 길이로 파생 — 도트/사진 순번 표시에 사용.
  const [photoStep, setPhotoStep] = useState(0);
  const photoRotationLock = useRef(false);
  const [isPhotoRotating, setIsPhotoRotating] = useState(false);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-16, 16]);
  const likeOp = useTransform(x, [0, 70], [0, 1]);
  const nopeOp = useTransform(x, [-70, 0], [1, 0]);
  const shineX = useTransform(x, [0, 220], ['-150%', '150%']);
  const shineX2 = useTransform(x, [0, 220], ['-80%', '220%']);
  const shineOp2 = useTransform(likeOp, value => value * 0.7);
  const flashOp = useTransform(x, [0, 40, 220], [0, 0.5, 0.18]);
  const crackScale = useTransform(x, [-220, 0], [0.985, 1]);
  const crackGray = useTransform(x, [-220, 0], [0.18, 0]);
  const crackDark = useTransform(x, [-220, 0], [0.88, 1]);
  const primaryCrackOp = useTransform(x, [-55, -18, 0], [1, 0.75, 0]);
  const branchCrackOp = useTransform(x, [-115, -62, -26, 0], [1, 0.9, 0.18, 0]);
  const microCrackOp = useTransform(x, [-220, -145, -80, 0], [1, 0.78, 0.08, 0]);
  const glassSheen = useTransform(x, [-220, -120, -35, 0], [0.38, 0.26, 0.08, 0]);
  const crackFilter = useMotionTemplate`grayscale(${crackGray}) brightness(${crackDark})`;
  // 그 식당의 실제 사진만 쓴다. 없으면 빈 배열 → FoodImage가 이모지 플레이스홀더를 보여준다.
  // 카테고리 스톡 사진 폴백은 제거했다(버거집에 피자가 뜨는 등 실제와 다른 사진은 거짓 정보다).
  const hasCanonicalPhotoList = Array.isArray(restaurant.photos);
  const candidatePhotoSources: string[] = Array.from(new Set<string>(
    (Array.isArray(restaurant.photos) ? restaurant.photos : [])
      .filter((photo: unknown): photo is string => typeof photo === 'string')
      .map((photo: string) => photo.trim())
      .filter(Boolean),
  ));
  const candidatePhotoKey = candidatePhotoSources.join("\u0000");
  const [failedPhotoSources, setFailedPhotoSources] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    setFailedPhotoSources(new Set());
  }, [restaurant.id, candidatePhotoKey]);
  const markPhotoFailed = useCallback((src: string) => {
    if (!src) return;
    setFailedPhotoSources((current) => {
      if (current.has(src)) return current;
      const next = new Set(current);
      next.add(src);
      return next;
    });
  }, []);
  const foodPhotos = candidatePhotoSources.filter((photo) => !failedPhotoSources.has(photo));
  const primaryPhoto = hasCanonicalPhotoList ? foodPhotos[0] : restaurant.image;
  const photoIndex = foodPhotos.length ? ((photoStep % foodPhotos.length) + foodPhotos.length) % foodPhotos.length : 0;
  const detailSummary = restaurantSummary(restaurant);
  const rotateMenuPhoto = useCallback((direction: -1 | 1) => {
    const accepted = beginMenuPhotoRotation(photoRotationLock, direction, delta => {
      setPhotoStep(step => step + delta);
    });
    if (accepted) setIsPhotoRotating(true);
  }, []);
  const finishMenuPhotoRotation = useCallback(() => {
    completeMenuPhotoRotation(photoRotationLock);
    setIsPhotoRotating(false);
  }, []);

  useEffect(() => {
    completeMenuPhotoRotation(photoRotationLock);
    setIsPhotoRotating(false);
  }, [restaurant.id, candidatePhotoKey]);
  const photoLabel = foodPhotos.length === 0
    ? '등록된 음식 사진이 없어요'
    : `메뉴 사진 ${photoIndex + 1} / ${foodPhotos.length}`;
  const photoProgressAriaLabel = foodPhotos.length > 0
    ? `메뉴 사진 전체 ${foodPhotos.length}장 중 ${photoIndex + 1}번째`
    : undefined;

  const handleDragEnd = useCallback((_: unknown, info: { offset: { x: number } }) => {
    if (isLocked) return;
    if (info.offset.x > 90) onAction('like');
    else if (info.offset.x < -90) onAction('dislike');
  }, [isLocked, onAction]);

  if (!isTop) {
    return (
      <div
        className="absolute inset-0 rounded-3xl overflow-hidden"
        style={{
          transform: `scale(${1 - stackIndex * 0.04}) translateY(${stackIndex * 14}px)`,
          zIndex: 10 - stackIndex,
          background: stackIndex === 1 ? '#e8c9a0' : '#d4a574',
          opacity: 1 - stackIndex * 0.15,
        }}
      />
    );
  }

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        x,
        rotate,
        zIndex: 20,
        // Swipe rotateZ must not flatten the menu flip; keep a 3D containing block.
        transformStyle: 'preserve-3d',
        WebkitTransformStyle: 'preserve-3d',
      }}
      drag={isRevealed || isLocked ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      whileDrag={{ cursor: 'grabbing' }}
      onTap={(event) => {
        const target = event.target;
        const openedDetail = target instanceof Element
          && Boolean(target.closest('[data-ui="quick-match-detail-trigger"]'));
        if (!openedDetail && !isRevealed) {
          setPhotoStep(0);
          setIsRevealed(true);
        }
      }}
    >
      {/* tl_branch: 식당 카드와 메뉴 패널을 동일한 3D 공간에서 뒤집는다.
          overflow/radius는 face에만 둔다 — 조상 overflow:hidden은 preserve-3d와
          backface-visibility를 깨뜨려 앞면이 뒤집힌 채로 보인다. */}
      <div
        className="w-full h-full relative"
        style={{
          perspective: 1600,
          transformStyle: 'preserve-3d',
          WebkitTransformStyle: 'preserve-3d',
        }}
      >
        <motion.div
          className="w-full h-full relative"
          data-ui="quick-match-card-flipper"
          style={{ transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d' }}
          animate={{ rotateY: isRevealed ? 180 : 0 }}
          transition={{ duration: 0.55, ease: [0.4, 0.0, 0.2, 1] }}
        >
          <div
            data-ui="quick-match-card-face-front"
            className="absolute inset-0 w-full h-full rounded-3xl overflow-hidden"
            style={{
              transform: 'rotateY(0deg) translateZ(1px)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              // Flatten face children into one plane so WebKit layer children
              // (filters / mix-blend) also respect backface hiding mid-flip.
              transformStyle: 'flat',
              WebkitTransformStyle: 'flat',
              pointerEvents: isRevealed ? 'none' : 'auto',
            }}
          >
      {/* Restaurant photo */}
      <motion.div className="w-full h-full relative cursor-grab" style={{ scale: crackScale, filter: crackFilter }}>
        <FoodImage
          // The server-backed photo list is canonical. `image` is a legacy
          // browser snapshot and may point to a stale asset after deployment.
          src={primaryPhoto}
          name={restaurant.name}
          category={restaurant.category}
          className="w-full h-full object-cover"
          emojiClass="text-[96px]"
          onLoadError={markPhotoFailed}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

        {/* Restaurant-card progress stays independent from the menu photo index. */}
        <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
          <span
            role="status"
            aria-live="polite"
            aria-label={`전체 ${total}개 중 ${progress}번째 음식점`}
            className="inline-flex min-h-7 min-w-[64px] items-center justify-center rounded-md bg-black/45 px-3 py-1 text-[13px] font-black tabular-nums text-white shadow-sm backdrop-blur-sm"
          >
            {progress} / {total}
          </span>
        </div>

        {/* Touch hint */}
        {!isRevealed && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="bg-black/30 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full opacity-70">
              탭 → 메뉴 보기
            </div>
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {(restaurant.tags || []).slice(0, 2).map((t: string) => (
              <span key={t} className="text-[10px] font-bold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
                {t}
              </span>
            ))}
          </div>
          <h2 className="text-white font-black text-[24px] leading-tight">{restaurant.name}</h2>
          <button
            type="button"
            data-ui="quick-match-detail-trigger"
            aria-label={`${restaurant.name} 상세정보 보기`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onOpenRestaurantDetails(restaurant);
            }}
            className="mt-2 flex min-h-9 w-full items-center justify-between gap-2 rounded-xl bg-black/25 px-3 py-2 text-left outline-none transition-colors active:bg-black/40 focus-visible:ring-2 focus-visible:ring-white/80"
          >
            <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-white/75">{detailSummary}</span>
            <span className="shrink-0 text-[11px] font-black text-white">상세보기 ›</span>
          </button>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <Star size={12} fill="#FFD700" color="#FFD700" />
              <span className="text-white text-[12px] font-bold">{restaurant.rating}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin size={11} color="rgba(255,255,255,0.6)" />
              <span className="text-white/70 text-[11px]">{restaurant.distance}</span>
            </div>
            <span className="text-white/70 text-[11px]">{'₩'.repeat(restaurant.priceRange || 1)}</span>
            <span className="text-white/60 text-[10px] bg-white/15 px-2 py-0.5 rounded-full">
              {restaurant.category}
            </span>
          </div>
        </div>

        {/* LIKE overlay */}
        <motion.div
          className="absolute top-8 left-5 border-[3px] border-[#3CBA44] rounded-2xl px-4 py-2"
          style={{ opacity: likeOp, rotate: -12 }}
        >
          <span className="text-[#3CBA44] font-black text-[18px]">좋아요 ♡</span>
        </motion.div>

        {/* NOPE overlay */}
        <motion.div
          className="absolute top-8 right-5 border-[3px] border-[#EB5053] rounded-2xl px-4 py-2"
          style={{ opacity: nopeOp, rotate: 12 }}
        >
          <span className="text-[#EB5053] font-black text-[18px]">패스 ✕</span>
        </motion.div>
        {/* 좋아요 샤이닝 효과 — 두 겹의 대각선 빛이 어긋나게 스치고, 전체 플래시 + 사방으로 빛 파티클이 튄다 */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: likeOp,
            x: shineX,
            background: 'linear-gradient(105deg, transparent 32%, rgba(255,255,255,1) 50%, transparent 68%)',
            mixBlendMode: 'overlay',
          }}
        />
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: shineOp2,
            x: shineX2,
            background: 'linear-gradient(105deg, transparent 42%, rgba(255,225,140,0.95) 50%, transparent 58%)',
            mixBlendMode: 'overlay',
          }}
        />
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ opacity: flashOp, background: 'white', mixBlendMode: 'overlay' }}
        />
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{ opacity: likeOp, boxShadow: 'inset 0 0 70px 22px rgba(255,255,255,0.85)' }}
        />
        {[
          { dx: -90, dy: -120, size: 22, rotateTo: 140, top: '40%', left: '50%' },
          { dx: 90, dy: -130, size: 16, rotateTo: -120, top: '38%', left: '46%' },
          { dx: -130, dy: 10, size: 14, rotateTo: 200, top: '46%', left: '52%' },
          { dx: 120, dy: 30, size: 20, rotateTo: -180, top: '44%', left: '48%' },
          { dx: -50, dy: 110, size: 12, rotateTo: 90, top: '42%', left: '54%' },
          { dx: 60, dy: 120, size: 18, rotateTo: -90, top: '40%', left: '50%' },
        ].map((s, i) => <LikeSparkle key={i} x={x} {...s} />)}

        {/* The supplied photographic fracture is revealed in three stages. Screen blending removes its black plate while preserving the real glass highlights. */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ opacity: glassSheen, background: 'linear-gradient(104deg, rgba(186,224,244,0.18), transparent 38%, rgba(255,255,255,0.16) 49%, transparent 58%)', mixBlendMode: 'screen' }}
        />
        {[{ opacity: primaryCrackOp, clipPath: 'circle(17% at 18% 48%)', blur: 0 }, { opacity: branchCrackOp, clipPath: 'circle(40% at 18% 48%)', blur: 0.15 }, { opacity: microCrackOp, clipPath: 'none', blur: 0.25 }].map((layer, index) => (
          <motion.img
            key={index}
            src="/assets/effects/cracking-glass.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full pointer-events-none select-none object-cover"
            draggable={false}
            style={{
              opacity: layer.opacity,
              clipPath: layer.clipPath,
              scaleX: -1,
              mixBlendMode: 'screen',
              filter: `contrast(1.32) brightness(1.28) blur(${layer.blur}px) drop-shadow(1px 1px 0 rgba(0,0,0,0.6))`,
            }}
          />
        ))}
        <motion.div className="absolute inset-0 pointer-events-none" style={{ opacity: nopeOp, background: 'radial-gradient(circle at 18% 48%, rgba(213,241,255,0.12) 0%, transparent 34%), linear-gradient(90deg, rgba(13,18,20,0.18) 0%, transparent 62%)' }} />

      </motion.div>
          </div>

          {/* 데이터 메뉴 UI는 유지하고, 표시 방식만 tl_branch의 카드 뒷면 flip으로 복구 */}
          <div
            data-ui="quick-match-card-face-back"
            className="absolute inset-0 w-full h-full flex flex-col rounded-3xl overflow-hidden"
            style={{
              background: 'rgba(20,16,14,0.92)',
              backdropFilter: 'blur(8px)',
              transform: 'rotateY(180deg) translateZ(1px)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transformStyle: 'flat',
              WebkitTransformStyle: 'flat',
              pointerEvents: isRevealed ? 'auto' : 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
              <div className="min-w-0">
                <p className="font-black text-[17px] text-white truncate">{restaurant.name}</p>
                <p className="text-[11px] text-white/50 truncate">{restaurant.category} · 메뉴 둘러보기</p>
              </div>
              <button
                onClick={() => setIsRevealed(false)}
                aria-label="메뉴 닫기"
                className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center active:scale-90 flex-shrink-0 ml-2">
                <X size={16} color="white" />
              </button>
            </div>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenRestaurantDetails(restaurant);
              }}
              aria-label={`${restaurant.name} 식당 상세보기`}
              className="mx-5 mb-2 flex min-h-10 flex-shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-[13px] font-bold text-white outline-none transition-colors active:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <Info size={16} aria-hidden="true" />
              식당 상세보기
            </button>

            {restaurant.menuItems && restaurant.menuItems.length > 0 ? (
              /* 실제 메뉴리스트 — 소스 카테고리 구조로 섹션 나눔, 탭하면 상세 화면 */
              <div className="flex-1 px-5 pb-4 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto -mx-1 px-1">
                  {groupByCategory(restaurant.menuItems).map(([cat, items]) => (
                    <div key={cat} className="mb-1">
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wide pt-3 pb-1.5">{cat}</p>
                      {items.map((item, idx) => (
                        <div
                          key={idx}
                          className="w-full flex items-center gap-3 py-2.5 border-b border-white/10 last:border-b-0 text-left"
                        >
                          {item.image ? (
                            <img src={item.image} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0 bg-white/10" />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-white/10 flex-shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-white text-[13.5px] font-semibold truncate">{item.name}</p>
                            {item.description && (
                              <p className="text-white/45 text-[11px] truncate mt-0.5">{item.description}</p>
                            )}
                            {item.dietary && item.dietary.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {item.dietary.map((d: string) => (
                                  <span key={d} className="text-[9px] font-bold bg-[#3CBA44]/25 text-[#7ee08a] px-1.5 py-0.5 rounded-full">
                                    {d}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-white/90 text-[13px] font-bold flex-shrink-0 tabular-nums">
                            {item.price != null ? `$${item.price}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* 실 데이터 없을 때 폴백 — 스톡 사진 3D 큐브 캐러셀(tl_revise 애니메이션) */
              <div className="flex-1 px-5 pb-4 flex flex-col min-h-0">
                <div className="rounded-2xl overflow-hidden relative flex-1">
                  {foodPhotos.length > 0 ? (
                    <>
                      {/* 좌/우 탭 시 큐브가 Y축으로 90도씩 굴러간다 */}
                      <MenuCube
                        photos={foodPhotos}
                        step={photoStep}
                        onPhotoError={markPhotoFailed}
                        onRotationComplete={finishMenuPhotoRotation}
                      />
                      {foodPhotos.length > 1 && (
                        <>
                          <button
                            className="absolute inset-y-0 left-0 w-1/2"
                            disabled={isPhotoRotating}
                            onClick={(e) => {
                              e.stopPropagation();
                              rotateMenuPhoto(-1);
                            }}
                            aria-label="이전 사진"
                          />
                          <button
                            className="absolute inset-y-0 right-0 w-1/2"
                            disabled={isPhotoRotating}
                            onClick={(e) => {
                              e.stopPropagation();
                              rotateMenuPhoto(1);
                            }}
                            aria-label="다음 사진"
                          />
                        </>
                      )}
                    </>
                  ) : (
                    <FoodImage
                      name={restaurant.name}
                      category={restaurant.category}
                      className="h-full w-full"
                      emojiClass="text-[80px]"
                    />
                  )}
                  <div
                    data-ui="menu-photo-progress"
                    data-photo-index={photoIndex + 1}
                    data-photo-count={foodPhotos.length}
                    aria-hidden="true"
                    className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none"
                  >
                    {foodPhotos.map((_: string, j: number) => (
                      <div key={j} className="w-1.5 h-1.5 rounded-full"
                        style={{ background: j === photoIndex ? 'white' : 'rgba(255,255,255,0.4)' }} />
                    ))}
                  </div>
                </div>
                <div className="pt-3 flex-shrink-0">
                  <p
                    role={photoProgressAriaLabel ? 'status' : undefined}
                    aria-live={photoProgressAriaLabel ? 'polite' : undefined}
                    aria-label={photoProgressAriaLabel}
                    className="font-bold text-[16px] text-white"
                  >
                    {photoLabel}
                  </p>
                  <p className="text-[12px] text-white/50 mt-0.5">{restaurant.description}</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <MenuItemDetail
        items={restaurant.menuItems || []}
        index={detailIndex}
        fallbackImage={primaryPhoto}
        restaurantCategory={restaurant.category}
        onClose={() => setDetailIndex(null)}
        onIndexChange={setDetailIndex}
      />
    </motion.div>
  );
}

function formatRemainingTime(deadlineStr: string | null): string {
  if (!deadlineStr) return '';
  const diffMs = new Date(deadlineStr).getTime() - Date.now();
  if (diffMs <= 0) return '00:00';
  
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffHours >= 24) {
    const days = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;
    return `${days}일 ${remainingHours}시간`;
  }
  if (diffHours >= 1) {
    const remainingMins = diffMins % 60;
    return `${diffHours}시간 ${remainingMins}분`;
  }
  const mins = diffMins % 60;
  const secs = diffSecs % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ─── Winner Screen ────────────────────────────────────────────────────────────

function WinnerScreen({ selectedWinner, onReset }: { selectedWinner?: Restaurant | null; onReset: () => void }) {
  const [, navigate] = useLocation();
  const { currentSession, restaurants, profile } = useApp();
  const { captureCard, downloadImage } = useCourseShare();
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [showShare, setShowShare] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const lunchmateLoadout = lunchmateLoadoutFromProfile(profile.lunchmateLoadout);
  const winnerEventKeyRef = useRef<string | null>(null);
  const [liveResults, setLiveResults] = useState<{
    results: { restaurantId: string; score: number; likeCount: number; dislikeCount: number }[];
    winnerId?: string | null;
  }>({ results: [], winnerId: null });

  // Poll server results to determine the winning restaurant (skipped once the user has picked one in the finals)
  useEffect(() => {
    if (!currentSession || selectedWinner) return;

    const fetchLiveResults = async () => {
      try {
        const res = await fetch(`/api/sessions/${currentSession.inviteCode}/results`);
        if (res.ok) {
          const data = await res.json();
          setLiveResults(data);
        }
      } catch (e) {
        console.error('Failed to fetch live session results:', e);
      }
    };

    fetchLiveResults();
    const interval = setInterval(fetchLiveResults, 3000);
    return () => clearInterval(interval);
  }, [currentSession, selectedWinner]);

  const winnerId = liveResults.winnerId || liveResults.results[0]?.restaurantId;
  const winner = selectedWinner || restaurants.find(r => r.id === winnerId) || currentSession?.restaurants[0];

  useEffect(() => {
    if (winner) {
      const idempotencyKey = winnerEventKeyRef.current ?? `winner:${currentSession?.id ?? crypto.randomUUID()}:${winner.id}`;
      winnerEventKeyRef.current = idempotencyKey;
      // WINNER의 정본은 바로 아래 journey-winner API가 멱등 키와 함께 저장한다.
      // eventLogger로도 보내면 같은 결정을 두 번 학습하게 된다.
      const journeyStop = { restaurant_id: winner.id, name: winner.name, category: winner.category, intent: intentForCategory(winner.category) ?? null, at: Date.now(), satisfaction: null };
      try {
        const legacy = JSON.parse(localStorage.getItem('lm_today_journey') ?? '[]') as typeof journeyStop[];
        const stored = JSON.parse(localStorage.getItem('lm_lunchie_journey') ?? JSON.stringify(legacy)) as typeof journeyStop[];
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        // 같은 세션 결과 화면이 다시 렌더되어도 한 번만 남긴다. 다른 날의 같은
        // 식당 선택은 실제 여정이므로 보존한다.
        const current = stored.filter(item => item.at >= thirtyDaysAgo && !(item.restaurant_id === winner.id && Math.abs(item.at - journeyStop.at) < 60_000));
        localStorage.setItem('lm_lunchie_journey', JSON.stringify([...current, journeyStop]));
        localStorage.setItem('lm_today_journey', JSON.stringify([...current, journeyStop].filter(item => new Date(item.at).toDateString() === new Date().toDateString())));
      } catch { /* 여정 저장 실패가 결과 화면을 막으면 안 된다. */ }
      void fetch('/api/journey-winner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restaurantId: winner.id, sessionId: currentSession?.id, intent: journeyStop.intent, idempotencyKey }) });
      // 회고 대기: 다음 홈 진입 시 "어땠어요?" 설문 → 만족 정답(SURVEY) 수집
      try { localStorage.setItem('lunchie_retro', JSON.stringify({ id: winner.id, name: winner.name, session: currentSession?.id ?? null, at: Date.now() })); } catch { /* noop */ }
    }
  }, [winner?.id]);

  if (!winner) return <SwipeStateScreen state="loading" />;

  // 실제 사진만. 없으면 이모지 플레이스홀더.
  const foodPhotos = (winner.photos ?? []).slice(0, 4);

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(winner.address);
    toast.success('주소가 복사됐어요! 📋');
  };

  const handleSaveImage = async () => {
    setIsCapturing(true);
    try {
      const dataUrl = await captureCard(shareCardRef);
      await downloadImage(dataUrl, `lunchie-${winner.name}.png`);
      toast.success('이미지가 저장됐어요! 🎉');
    } catch (e) {
      console.error('Failed to save share card:', e);
      toast.error('이미지 저장에 실패했어요');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleShareImage = async () => {
    setIsCapturing(true);
    try {
      const dataUrl = await captureCard(shareCardRef);
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `lunchie-${winner.name}.png`, { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Lunchie Munchie',
          text: `오늘의 점심은 ${winner.name}! 🍽️`,
        });
      } else {
        await downloadImage(dataUrl, `lunchie-${winner.name}.png`);
        toast.success('이미지가 저장됐어요. 갤러리에서 공유해보세요! 📤');
      }
    } catch (e) {
      console.error('Failed to share card:', e);
      toast.error('공유에 실패했어요');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-dvh bg-[#FCF4EE] pb-10"
    >
      {/* Hero */}
      <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
        <FoodImage src={winner.image || winner.photos?.[0]} name={winner.name} category={winner.category} className="w-full h-full object-cover" emojiClass="text-[80px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-5 pb-5 text-center">
          <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-full bg-white/95 shadow-lg">
            <LunchmateCharacterRenderer
              flowState="idle"
              artwork="chicken"
              chickenAssetKeyOverride="idle"
              chickenFaceSystem
              animated={false}
              loadout={lunchmateLoadout}
              size={58}
              renderSize="compact"
              alt="오늘의 선택을 축하하는 런치킨"
            />
          </div>
          <span className="inline-block text-[11px] font-black text-white bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 mb-1.5">
            오늘의 점심 당첨!
          </span>
          <h1 className="text-white font-black text-[24px] leading-tight">{winner.name}</h1>
        </div>
      </div>

      {/* Detail Card */}
      <div className="px-5 -mt-5 relative">
        <div className="bg-white rounded-3xl p-5 shadow-lg space-y-4">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-[#FFF5F5] rounded-full px-2.5 py-1">
              <Star size={12} fill="#EB5053" color="#EB5053" />
              <span className="text-[12px] font-bold text-[#EB5053]">{winner.rating}</span>
            </div>
            <span className="text-[12px] font-semibold text-[#4A4A4A] bg-[#F5F5F5] rounded-full px-2.5 py-1">
              📍 {winner.distance}
            </span>
            <span className="text-[12px] font-semibold text-[#4A4A4A] bg-[#F5F5F5] rounded-full px-2.5 py-1">
              {'₩'.repeat(winner.priceRange)}
            </span>
            <span className="text-[12px] font-semibold text-white rounded-full px-2.5 py-1" style={{ background: '#EB5053' }}>
              {winner.category}
            </span>
          </div>

          {/* Address */}
          <div className="flex items-start gap-1.5">
            <MapPin size={14} className="text-[#9B9B9B] mt-0.5 flex-shrink-0" />
            <p className="text-[13px] text-[#4A4A4A]">{winner.address}</p>
          </div>

          {/* Tags */}
          <div className="flex gap-1.5 flex-wrap">
            {winner.tags.map(tag => (
              <span key={tag} className="tag tag-hash">#{tag}</span>
            ))}
          </div>

          {/* Description */}
          <p className="text-[13px] text-[#4A4A4A] leading-relaxed">{winner.description}</p>

          {/* Menu — 실제 메뉴리스트(소스 카테고리 구조) 있으면 우선, 없으면 사진 그리드 폴백 */}
          {winner.menuItems && winner.menuItems.length > 0 ? (
            <div>
              <p className="text-[12px] font-bold text-[#9B9B9B] mb-2">메뉴 ({winner.menuItems.length})</p>
              <div className="max-h-[320px] overflow-y-auto rounded-2xl border border-[#EFEFEF]">
                {groupByCategory(winner.menuItems).map(([cat, items]) => (
                  <div key={cat}>
                    <p className="text-[10px] font-bold text-[#B0B0B0] uppercase tracking-wide px-3 pt-3 pb-1 bg-[#FAFAFA]">{cat}</p>
                    {items.map((item, i) => (
                      <div
                        key={i}
                        className="w-full flex items-center gap-3 px-3 py-2.5 border-b border-[#F0F0F0] last:border-b-0 text-left"
                      >
                        {item.image ? (
                          <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-[#F5F5F5]" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[#F5F5F5] flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-[#2A2A2A] truncate">{item.name}</p>
                          {item.description && (
                            <p className="text-[11px] text-[#9B9B9B] truncate mt-0.5">{item.description}</p>
                          )}
                          {item.dietary && item.dietary.length > 0 && (
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {item.dietary.map((d) => (
                                <span key={d} className="text-[9px] font-bold bg-[#E8F5E9] text-[#3CBA44] px-1.5 py-0.5 rounded-full">{d}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-[12.5px] font-bold text-[#4A4A4A] flex-shrink-0 tabular-nums">
                          {item.price != null ? `$${item.price}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[12px] font-bold text-[#9B9B9B] mb-2">메뉴 사진</p>
              <div className="grid grid-cols-4 gap-2">
                {foodPhotos.map((url, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden bg-[#F5F5F5]">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => toast.info('예약 기능은 준비 중이에요 🙏')}
              className="flex-1 py-3 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-1.5 border border-[#E5E5E5] text-[#4A4A4A] active:scale-[0.98] transition-all"
            >
              <Phone size={15} /> 예약하기
            </button>
            <button
              onClick={() => { logNavigate(winner.id, { user_id: profile.id, session_id: currentSession?.id ?? null }); navigate(`/lunchie/map?id=${winner.id}`); }}
              className="flex-1 py-3 rounded-2xl font-bold text-white text-[14px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
              style={{ background: '#EB5053' }}
            >
              <Navigation size={15} /> 길찾기
            </button>
          </div>

          {/* 저장(강한 취향 신호 COURSE_SAVE) · 다시 고르기(REROLL) */}
          <div className="flex gap-2">
            <button
              onClick={() => { if (!saved) { logEvent({ event_type: 'COURSE_SAVE', user_id: profile.id, session_id: currentSession?.id ?? null, restaurant_id: winner.id }); setSaved(true); toast.success('저장했어요 🔖'); } }}
              className="flex-1 py-3 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-1.5 border active:scale-[0.98] transition-all"
              style={{ borderColor: saved ? '#EB5053' : '#E5E5E5', color: saved ? '#EB5053' : '#4A4A4A', background: saved ? '#FFF5F5' : 'white' }}
            >
              <Bookmark size={15} fill={saved ? '#EB5053' : 'none'} /> {saved ? '저장됨' : '저장'}
            </button>
            <button
              onClick={onReset}
              className="flex-1 py-3 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-1.5 border border-[#E5E5E5] text-[#4A4A4A] active:scale-[0.98] transition-all"
            >
              <RotateCcw size={15} /> 다시 고르기
            </button>
          </div>

          {/* 하루 여정 씨앗 — 다음 스톱 '인지'만. 실제 결정은 이따 홈 '오늘의 여정'에서. */}
          <div className="mt-3 rounded-xl px-3 py-2.5 text-[12px] leading-relaxed"
               style={{ background: '#FFF3D6', color: '#8A5A0B' }}>
            🌱 다 드시고 나서 — <b>커피·디저트</b>도 근처에 있어요.
            <br />이따 홈 <b>'오늘의 여정'</b>에서 다음 코스를 골라요.
          </div>

          {/* Share Card Button */}
          <button
            onClick={() => setShowShare(true)}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg"
            style={{ background: 'linear-gradient(135deg, #F09D09 0%, #EB5053 100%)' }}
          >
            <Share2 size={16} /> 공유 카드 만들기
          </button>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="px-5 mt-3 flex gap-2">
        <button
          onClick={handleCopyAddress}
          className="flex-1 py-3 rounded-2xl font-bold text-[13px] flex items-center justify-center gap-1.5 bg-white border border-[#E5E5E5] text-[#4A4A4A] active:scale-[0.98] transition-all"
        >
          <Link2 size={14} /> 주소 복사
        </button>
        <button
          onClick={() => navigate('/')}
          className="flex-1 py-3 rounded-2xl font-bold text-[13px] flex items-center justify-center gap-1.5 bg-white border border-[#E5E5E5] text-[#4A4A4A] active:scale-[0.98] transition-all"
        >
          <Home size={14} /> 홈으로
        </button>
      </div>

      {/* Share Overlay */}
      <AnimatePresence>
        {showShare && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#FFF8F2]/95 backdrop-blur-sm flex flex-col items-center justify-center px-6 py-10 overflow-y-auto"
          >
            <WinnerShareCard ref={shareCardRef} restaurant={winner} loadout={lunchmateLoadout} participants={currentSession?.members ?? []} />

            <div className="flex gap-3 mt-6 w-full max-w-[300px]">
              <button
                onClick={handleSaveImage}
                disabled={isCapturing}
                className="flex-1 py-3.5 rounded-2xl border border-[#EFD8CF] font-bold text-[14px] flex items-center justify-center gap-1.5 bg-white text-[#5B4942] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Download size={16} /> 저장
              </button>
              <button
                onClick={handleShareImage}
                disabled={isCapturing}
                className="flex-1 py-3.5 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-1.5 text-white active:scale-[0.98] transition-all disabled:opacity-50"
                style={{ background: '#EB5053' }}
              >
                <Share2 size={16} /> 이미지 공유하기
              </button>
            </div>

            <button
              onClick={() => setShowShare(false)}
              className="mt-5 text-[#9A847B] text-[13px] font-semibold active:scale-95"
            >
              닫기
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <MenuItemDetail
        items={winner.menuItems || []}
        index={detailIndex}
        fallbackImage={winner.image}
        restaurantCategory={winner.category}
        onClose={() => setDetailIndex(null)}
        onIndexChange={setDetailIndex}
      />
    </motion.div>
  );
}

// ─── Finals (결승전) Screen ──────────────────────────────────────────────────

function FinalBattleResultScreen({
  finalist1,
  finalist2,
  onContinue,
  onRejectBoth,
  logSelection = true,
}: {
  finalist1: any;
  finalist2: any | null;
  onContinue: (winner?: any) => void;
  onRejectBoth?: () => void;
  logSelection?: boolean;
}) {
  const finalActionSizeClass = 'flex w-full items-center justify-center rounded-2xl py-4 text-[15px] font-bold';
  const [selected, setSelected] = useState<1 | 2 | null>(null);
  const { currentSession, profile } = useApp();
  const [finalSlateId] = useState(() => `final_${currentSession?.id ?? 'x'}_${Date.now()}`);
  const duelRound = 2; // 듀얼 = round 2 (예선=round 1)
  const mountAtRef = useRef(Date.now()); // 듀얼 노출 시각 → 결정 시간(신뢰도) 측정
  useEffect(() => {
    // 듀얼 = 크기 2 슬레이트. 두 후보를 노출로 기록 → CHOOSE 시 opponent 파생(pairwise A>B).
    [finalist1, finalist2].forEach((f, i) => {
      if (f) logEvent({ event_type: 'IMPRESSION', user_id: profile.id, slate_id: finalSlateId, slate_type: 'FINAL', restaurant_id: f.id, position: i, round: duelRound, session_id: currentSession?.id ?? null });
    });
  }, [finalSlateId]);

  // 후보가 하나뿐(마지막 남은 좋아요) — 그룹의 "여기 어때요?" 1인 투표 화면과 동일한 확인 단계.
  // 자동 확정하지 않고, 별로면 handleReset(새 추천)으로 보낸다.
  if (!finalist2) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-dvh flex flex-col bg-[#FFF8F2]"
      >
        <div className="px-5 pt-12 pb-4 text-center">
          <p className="font-black text-[#302927] text-[22px]">여기 어때요? 🤔</p>
          <p className="mt-1 text-[13px] text-[#917F77]">좋아요 중 마지막 후보예요 · 별로면 새로 추천받아요</p>
        </div>
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="w-full max-w-[360px] rounded-3xl overflow-hidden relative" style={{ aspectRatio: '4/5' }}>
            <FoodImage src={finalist1.image || finalist1.photos?.[0]} name={finalist1.name} category={finalist1.category} className="w-full h-full object-cover" emojiClass="text-[88px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5">
              <span className="inline-block bg-[#FFD700] text-[#1A1A1A] text-[11px] font-black px-3 py-1 rounded-full mb-2">🏆 유일한 후보</span>
              <p className="text-white font-black text-[22px] leading-tight">{finalist1.name}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Star size={13} fill="#FFD700" color="#FFD700" />
                <span className="text-white/85 text-[13px]">{finalist1.rating}</span>
                <span className="text-white/60 text-[12px]">{finalist1.distance}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="px-5 py-5">
          <button
            onClick={() => {
              if (logSelection) logEvent({ event_type: 'SWIPE', action: 'CHOOSE', user_id: profile.id, slate_id: finalSlateId, slate_type: 'FINAL', restaurant_id: finalist1.id, round: duelRound, session_id: currentSession?.id ?? null, context: { decision_ms: Date.now() - mountAtRef.current } });
              onContinue(finalist1);
            }}
            className={`${finalActionSizeClass} text-white active:scale-[0.98] shadow-xl transition-opacity`}
            style={{ background: '#EB5053' }}
          >
            이곳으로 결정!
          </button>
          {onRejectBoth && (
            <button
              onClick={onRejectBoth}
              className={`${finalActionSizeClass} mt-2.5 border border-[#EFD8CF] bg-white text-[#78665E] active:scale-[0.98] transition-all`}
            >
              별로예요 · 새로 추천받기
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-dvh flex flex-col bg-[#FFF8F2]"
    >
      {/* Header */}
      <div className="px-5 pt-12 pb-4 text-center">
        <p className="font-black text-[#302927] text-[22px]">결승전 🏆</p>
        <p className="mt-1 text-[13px] text-[#917F77]">친구들과 함께 고른 TOP 2 · 마음에 드는 한 곳을 선택해요</p>
      </div>

      {/* Diagonal split layout */}
      <div className="flex-1 relative overflow-hidden">
        {/* tl_branch: 선택하면 삼각형이 전체화면으로 펼쳐지고, 다시 누르면 반반 구도로 복귀 */}
        <motion.button
          onClick={() => setSelected(previous => (previous === 1 ? null : 1))}
          className="absolute inset-0 text-left"
          animate={{
            clipPath: selected === 1
              ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
              : 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 100%)',
          }}
          transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
          style={{ zIndex: selected === 1 ? 30 : selected === 2 ? 5 : 10 }}
        >
          <motion.div
            className="absolute inset-0"
            animate={selected === null ? { scale: [1, 1.07, 1] } : { scale: 1 }}
            transition={selected === null
              ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.4 }}
          >
            <FoodImage src={finalist1.image || finalist1.photos?.[0]} name={finalist1.name} category={finalist1.category} className="w-full h-full object-cover" emojiClass="text-[72px]" />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/45 to-black/70" />
          {selected !== null && (
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: selected === 1 ? 0 : 0.55 }}
              animate={{ opacity: selected === 1 ? 0 : 1 }}
              style={{ background: 'rgba(0,0,0,0.55)' }}
            />
          )}
          {selected === 1 && (
            <motion.div
              className="absolute inset-0 ring-4 ring-inset"
              initial={{ boxShadow: 'inset 0 0 0 4px rgba(240,157,9,0)' }}
              animate={{ boxShadow: 'inset 0 0 0 4px #EB5053' }}
              transition={{ delay: 0.3, duration: 0.25 }}
            />
          )}
          <div className="absolute top-6 left-5 right-20 text-left">
            {selected === 1 && (
              <span className="inline-block bg-[#EB5053] text-white text-[11px] font-black px-3 py-1 rounded-full mb-2">
                ✓ 선택됨
              </span>
            )}
            <p className="text-white font-black text-[19px] leading-tight">{finalist1.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Star size={12} fill="#FFD700" color="#FFD700" />
              <span className="text-white/85 text-[12px]">{finalist1.rating}</span>
              <span className="text-white/60 text-[11px]">{finalist1.distance}</span>
            </div>
            {selected === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.35 }}
                className="mt-3 max-w-[80%]"
              >
                <p className="text-white/75 text-[12px] leading-relaxed">{finalist1.description}</p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {(finalist1.tags || []).slice(0, 3).map((tag: string) => (
                    <span key={tag} className="text-[10px] font-bold bg-white/20 text-white px-2.5 py-1 rounded-full">{tag}</span>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </motion.button>

        <motion.button
          onClick={() => setSelected(previous => (previous === 2 ? null : 2))}
          className="absolute inset-0 text-right"
          animate={{
            clipPath: selected === 2
              ? 'polygon(100% 0%, 100% 100%, 0% 100%, 0% 0%)'
              : 'polygon(100% 0%, 100% 100%, 0% 100%, 100% 0%)',
            opacity: selected === 1 ? 0 : 1,
          }}
          transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
          style={{ zIndex: selected === 2 ? 30 : selected === 1 ? 5 : 10 }}
        >
          <motion.div
            className="absolute inset-0"
            animate={selected === null ? { scale: [1, 1.07, 1] } : { scale: 1 }}
            transition={selected === null
              ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }
              : { duration: 0.4 }}
          >
            <FoodImage src={finalist2.image || finalist2.photos?.[0]} name={finalist2.name} category={finalist2.category} className="w-full h-full object-cover" emojiClass="text-[72px]" />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/45 to-black/30" />
          {selected === 2 && (
            <motion.div
              className="absolute inset-0"
              initial={{ boxShadow: 'inset 0 0 0 4px rgba(240,157,9,0)' }}
              animate={{ boxShadow: 'inset 0 0 0 4px #EB5053' }}
              transition={{ delay: 0.3, duration: 0.25 }}
            />
          )}
          <div className="absolute bottom-6 right-5 left-20 text-right">
            {selected === 2 && (
              <span className="inline-block bg-[#EB5053] text-white text-[11px] font-black px-3 py-1 rounded-full mb-2">
                ✓ 선택됨
              </span>
            )}
            <p className="text-white font-black text-[19px] leading-tight">{finalist2.name}</p>
            <div className="flex items-center gap-2 mt-1 justify-end">
              <Star size={12} fill="#FFD700" color="#FFD700" />
              <span className="text-white/85 text-[12px]">{finalist2.rating}</span>
              <span className="text-white/60 text-[11px]">{finalist2.distance}</span>
            </div>
            {selected === 2 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.35 }}
                className="mt-3 max-w-[80%] ml-auto"
              >
                <p className="text-white/75 text-[12px] leading-relaxed">{finalist2.description}</p>
                <div className="flex gap-1.5 mt-2 flex-wrap justify-end">
                  {(finalist2.tags || []).slice(0, 3).map((tag: string) => (
                    <span key={tag} className="text-[10px] font-bold bg-white/20 text-white px-2.5 py-1 rounded-full">{tag}</span>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </motion.button>

        <motion.div
          className="absolute inset-0 pointer-events-none z-10"
          animate={{ opacity: selected === null ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <line x1="100" y1="0" x2="0" y2="100" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
          </svg>
        </motion.div>

        {/* VS badge center */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
          animate={selected === null
            ? { scale: [1, 1.12, 1], opacity: 1 }
            : { scale: 0.6, opacity: 0 }}
          transition={selected === null
            ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.25 }}
        >
          <div className="w-14 h-14 rounded-full bg-[#EB5053] border-[3px] border-white flex items-center justify-center shadow-2xl">
            <span className="font-black text-white text-[15px]">대결</span>
          </div>
        </motion.div>
      </div>

      {/* Continue */}
      <div className="px-5 py-5">
        <button
          onClick={() => {
            const winner = selected === 1 ? finalist1 : selected === 2 ? finalist2 : undefined;
            const opponent = selected === 1 ? finalist2 : finalist1; // 패자 → pairwise(A>B) 파생용
            if (winner && logSelection) logEvent({ event_type: 'SWIPE', action: 'CHOOSE', user_id: profile.id, slate_id: finalSlateId, slate_type: 'FINAL', restaurant_id: winner.id, round: duelRound, session_id: currentSession?.id ?? null, context: { opponent_id: opponent?.id, decision_ms: Date.now() - mountAtRef.current } });
            onContinue(winner);
          }}
          disabled={selected === null}
          className={`${finalActionSizeClass} text-white active:scale-[0.98] shadow-xl transition-opacity disabled:opacity-40`}
          style={{ background: '#EB5053' }}
        >
          {selected === null ? '음식점을 선택해주세요' : '이곳으로 결정!'}
        </button>
        {onRejectBoth && (
          <button
            onClick={onRejectBoth}
            className={`${finalActionSizeClass} mt-2.5 border border-[#EFD8CF] bg-white text-[#78665E] active:scale-[0.98] transition-all`}
          >
            둘 다 별로!
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Decided Screen ───────────────────────────────────────────────────────────

function WaitingOrDecidedScreen({ onContinue, onReroll }: { onContinue: (winner?: any) => void; onReroll: (excludeIds: string[]) => void }) {
  const [, navigate] = useLocation();
  const { currentSession, restaurants, profile } = useApp();
  const lunchmateLoadout = lunchmateLoadoutFromProfile(profile.lunchmateLoadout);
  const REJECT = '__reject__';
  const [liveResults, setLiveResults] = useState<{
    completedCount: number;
    totalMembers: number;
    memberCompletion: { id: string; name: string; emoji: string; completed: boolean; swipeCount: number; targetCount: number }[];
    results: { restaurantId: string; score: number; likeCount: number; dislikeCount: number }[];
    isExpired: boolean;
    deadlineAt: string | null;
    phase?: 'PRELIM' | 'FINAL' | 'REROLL' | 'NO_CONSENSUS' | 'DONE';
    finalists?: { restaurantId: string; score: number; likeCount: number; dislikeCount: number }[];
    finalTally?: Record<string, number>;
    finalVotedCount?: number;
    winnerId?: string | null;
    generation?: number;
    rerollCap?: number;
    rejectVotes?: number;
    excludeIds?: string[];
  }>({
    completedCount: currentSession ? 1 : 0,
    totalMembers: currentSession?.members.length || 1,
    memberCompletion: (currentSession?.members ?? []).map(member => ({
      id: member.id,
      name: member.name,
      emoji: member.emoji,
      completed: member.id === profile.id,
      swipeCount: member.id === profile.id ? Math.min(currentSession?.restaurants.length ?? 0, 7) : 0,
      targetCount: Math.min(currentSession?.restaurants.length ?? 0, 7),
    })),
    results: [],
    isExpired: false,
    deadlineAt: currentSession?.deadline || null,
    phase: 'PRELIM',
    finalists: [],
    finalVotedCount: 0,
    winnerId: null,
  });
  const [timeLeft, setTimeLeft] = useState('');
  const [voted, setVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [resultsConnection, setResultsConnection] = useState<'loading' | 'live' | 'offline'>('loading');

  // 결승 한 표(round=2G). restaurantId가 REJECT면 "둘 다 별로". 멤버당 1표로 서버가 중복 제거.
  const castVote = async (restaurantId: string) => {
    if (!currentSession || voted || isVoting) return;
    const round = 2 * (liveResults.generation ?? 1);
    const isReject = restaurantId === REJECT;
    setIsVoting(true);
    try {
      await persistSessionSwipe({
        id: `vote_${currentSession.id}_${profile.id}_${round}`,
        sessionId: currentSession.id,
        userId: profile.id,
        restaurantId,
        round,
        action: 'LIKE',
      });
      setVoted(true);
      // 신호: finalist 선택 = CHOOSE(pairwise), '둘 다 별로' = NOPE(명시 음성)
      logEvent({ event_type: 'SWIPE', action: isReject ? 'NOPE' : 'CHOOSE', slate_type: 'FINAL', restaurant_id: restaurantId, round, user_id: profile.id, session_id: currentSession?.id ?? null });
    } catch (error) {
      console.error('빠른 매칭 최종 선택 저장 실패', error);
      toast.error('최종 선택을 저장하지 못했어요. 다시 시도해 주세요.');
    } finally {
      setIsVoting(false);
    }
  };

  // Ticking effect for countdown
  useEffect(() => {
    const deadline = liveResults.deadlineAt || currentSession?.deadline || null;
    if (!deadline) return;
    
    const tick = () => {
      setTimeLeft(formatRemainingTime(deadline));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [liveResults.deadlineAt, currentSession?.deadline]);

  // Poll server results dynamically
  useEffect(() => {
    if (!currentSession) return;
    
    let cancelled = false;
    const fetchLiveResults = async () => {
      try {
        const res = await fetch(`/api/sessions/${currentSession.inviteCode}/results`);
        if (!res.ok) throw new Error(`results_${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        // This view mounts only after this device finished its preliminary
        // deck. Keep that known completion visible while its idempotent server
        // signal retries, rather than briefly regressing the UI to 0/N.
        if ((data.phase ?? 'PRELIM') === 'PRELIM') {
          const memberCompletion = data.memberCompletion.map((member: typeof liveResults.memberCompletion[number]) =>
            member.id === profile.id
              ? { ...member, completed: true, swipeCount: Math.max(member.swipeCount, member.targetCount) }
              : member
          );
          data.memberCompletion = memberCompletion;
          data.completedCount = Math.max(
            data.completedCount,
            memberCompletion.filter((member: typeof memberCompletion[number]) => member.completed).length,
          );
        }
        setLiveResults(data);
        setResultsConnection('live');
      } catch (e) {
        if (cancelled) return;
        setResultsConnection('offline');
        console.error('Failed to fetch live session results:', e);
      }
    };

    void fetchLiveResults();
    const interval = setInterval(() => void fetchLiveResults(), 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [currentSession?.inviteCode, profile.id]);

  // If this device refreshes after casting, derive the local view from the
  // server response instead of showing the final ballot again.
  useEffect(() => {
    if (liveResults.phase !== 'FINAL') return;
    setVoted(liveResults.memberCompletion.some(member => member.id === profile.id && member.completed));
  }, [liveResults.phase, liveResults.memberCompletion, profile.id]);

  // 합의 실패(NO_CONSENSUS) 1회 로깅 (음성 신호 G)
  const noConsensusLoggedRef = useRef(false);
  useEffect(() => {
    if (liveResults.phase === 'NO_CONSENSUS' && !noConsensusLoggedRef.current) {
      noConsensusLoggedRef.current = true;
      logEvent({ event_type: 'NO_CONSENSUS', user_id: profile.id, session_id: currentSession?.id ?? null, context: { generation: liveResults.generation ?? 1 } });
    }
  }, [liveResults.phase]);

  // 그룹 결정은 서버가 조율한다 (PRELIM → FINAL → DONE / REROLL / NO_CONSENSUS). 모두 같은 결과.
  const phase = liveResults.phase ?? 'PRELIM';
  const isAllCompleted = phase === 'DONE';
  const winner = restaurants.find(r => r.id === liveResults.winnerId) || currentSession?.restaurants[0];
  const finalistRs = (liveResults.finalists ?? [])
    .map(f => restaurants.find(r => r.id === f.restaurantId))
    .filter((r): r is Restaurant => !!r);
  const serverGen = liveResults.generation ?? 1;
  const myGen = currentSession?.generation ?? 1;
  const needReroll = phase === 'REROLL' || serverGen > myGen; // '둘 다 별로' 다수 → 새 세대 재스와이프
  const displayedCompleted = phase === 'FINAL'
    ? Math.max(liveResults.finalVotedCount ?? 0, voted ? 1 : 0)
    : liveResults.completedCount;
  const displayedTotal = Math.max(liveResults.totalMembers, 1);
  const completionPercent = Math.min(100, (displayedCompleted / displayedTotal) * 100);

  // NO_CONSENSUS → 합의 실패 안내 (reroll 상한 초과)
  if (phase === 'NO_CONSENSUS') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="min-h-dvh flex flex-col justify-between px-5 py-8"
        style={{ background: 'linear-gradient(160deg, #4A4A4A 0%, #2a2a2a 100%)' }}>
        <div className="flex-1 flex flex-col justify-center text-center">
          <div className="text-6xl mb-3">🤷</div>
          <h2 className="text-white font-black text-[24px] mb-2">합의가 어려웠어요</h2>
          <p className="text-white/70 text-[13px] leading-relaxed">여러 번 골라봤지만 모두 마음에 드는 곳을 못 찾았어요.<br />다른 동네로 넓히거나 나중에 다시 시도해볼까요?</p>
        </div>
        <button onClick={() => navigate('/')}
          className="w-full max-w-[340px] py-4 rounded-2xl font-bold text-[#4A4A4A] text-[15px] bg-white active:scale-[0.98] transition-all shadow-md mx-auto block">처음으로</button>
      </motion.div>
    );
  }

  // REROLL(또는 다른 멤버가 이미 다음 세대로) → 새로운 곳으로 다시 고르기
  if (needReroll) {
    const rerollCap = liveResults.rerollCap ?? 3;
    // 이번이 마지막 재시도(다음에 또 실패하면 자동으로 "합의 실패") → 조용히 진행하지 말고 먼저 물어봄.
    const isLastChance = serverGen === rerollCap - 1;
    if (isLastChance) {
      return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="min-h-dvh flex flex-col justify-between px-5 py-8"
          style={{ background: 'linear-gradient(160deg, #2C3E50 0%, #1a252f 100%)' }}>
          <div className="flex-1 flex flex-col justify-center text-center">
            <div className="text-6xl mb-3">🤔</div>
            <h2 className="text-white font-black text-[24px] mb-2">두 번 다 아쉬웠네요</h2>
            <p className="text-white/70 text-[13px] leading-relaxed">한 번 더 시도하면 마지막 기회예요.<br />여기서 처음부터 다시 시작할 수도 있어요.</p>
          </div>
          <div className="space-y-2">
            <button onClick={() => onReroll(liveResults.excludeIds ?? [])}
              className="w-full max-w-[340px] py-4 rounded-2xl font-bold text-white text-[15px] bg-[#EB5053] active:scale-[0.98] transition-all shadow-md mx-auto block">마지막으로 한 번 더 →</button>
            <button onClick={() => navigate('/')}
              className="w-full max-w-[340px] py-4 rounded-2xl font-bold text-white/80 text-[14px] bg-white/10 active:scale-[0.98] transition-all mx-auto block">처음부터 다시 시작</button>
          </div>
        </motion.div>
      );
    }
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="min-h-dvh flex flex-col justify-between px-5 py-8"
        style={{ background: 'linear-gradient(160deg, #2C3E50 0%, #1a252f 100%)' }}>
        <div className="flex-1 flex flex-col justify-center text-center">
          <div className="text-6xl mb-3">🔄</div>
          <h2 className="text-white font-black text-[24px] mb-2">다른 곳으로 다시 골라요</h2>
          <p className="text-white/70 text-[13px] leading-relaxed">‘둘 다 별로’가 많았어요.<br />방금 후보는 빼고 새로운 곳을 가져왔어요.</p>
        </div>
        <button onClick={() => onReroll(liveResults.excludeIds ?? [])}
          className="w-full max-w-[340px] py-4 rounded-2xl font-bold text-white text-[15px] bg-[#EB5053] active:scale-[0.98] transition-all shadow-md mx-auto block">다시 고르기 시작 →</button>
      </motion.div>
    );
  }

  // Group finals reuse the same diagonal duel used in solo mode. The server
  // still owns the tally; this component only provides the shared selection UI.
  if (phase === 'FINAL' && !voted && finalistRs.length >= 1) {
    return (
      <FinalBattleResultScreen
        finalist1={finalistRs[0]}
        finalist2={finalistRs[1] ?? null}
        onContinue={restaurant => { if (restaurant) void castVote(restaurant.id); }}
        onRejectBoth={() => void castVote(REJECT)}
        logSelection={false}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-dvh flex flex-col justify-between px-5 py-8"
      style={{ background: 'linear-gradient(180deg, #FFF8F2 0%, #FCEDE6 100%)' }}
    >
      <div className="flex-1 flex flex-col justify-center text-center">
        {isAllCompleted ? (
          // Decided state (Everyone finished!)
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="space-y-6 animate-fade-in"
          >
            <motion.div
              className="mx-auto flex size-28 items-center justify-center rounded-[34px] bg-white shadow-[0_18px_45px_rgba(218,82,78,0.16)]"
              animate={{ y: [0, -6, 0], rotate: [-1.5, 1.5, -1.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <LunchmateCharacterRenderer
                flowState="idle"
                artwork="chicken"
                chickenAssetKeyOverride="idle"
                chickenFaceSystem
                animated={false}
                loadout={lunchmateLoadout}
                size={104}
                renderSize="compact"
                alt="친구들과의 최종 선택을 축하하는 런치킨"
              />
            </motion.div>
            <div>
              <h2 className="mb-1 text-[28px] font-black text-[#312A28]">결정됐어요!</h2>
              <p className="text-[13px] font-semibold text-[#927F77]">모든 친구들이 투표를 완료했습니다</p>
            </div>
            
            {winner && (
              <div className="mx-auto max-w-[340px] space-y-3 rounded-3xl border border-[#F0DDD5] bg-white p-5 text-center shadow-[0_14px_40px_rgba(102,68,54,0.1)]">
                <div className="mx-auto size-20 overflow-hidden rounded-full border-2 border-[#F4E2DB] bg-[#FFF0EA]">
                  <FoodImage
                    src={winner.image || winner.photos?.[0]}
                    name={winner.name}
                    category={winner.category}
                    className="h-full w-full object-cover"
                    emojiClass="text-[34px]"
                  />
                </div>
                <div>
                  <span className="rounded-full bg-[#FFE7E1] px-2 py-0.5 text-[10px] font-bold text-[#D94B4E]">{winner.category}</span>
                  <p className="mt-1 text-[18px] font-black text-[#332B28]">{winner.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-[#94827A]">{winner.address}</p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-1 text-[11px] text-[#766761]">
                  <span>⭐ {winner.rating}</span>
                  <span>📍 {winner.distance || '500m'}</span>
                  <span>💰 {'₩'.repeat(winner.priceRange)}</span>
                </div>
              </div>
            )}
            
            <button onClick={() => onContinue(winner)}
              className="mx-auto block w-full max-w-[340px] rounded-2xl bg-[#EB5053] py-4 text-[15px] font-bold text-white shadow-md transition-all active:scale-[0.98]">
              결과 확인하기 🎉
            </button>
          </motion.div>
        ) : (
          // Waiting state (Others still voting)
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative mx-auto w-full max-w-[360px]"
          >
            <motion.div
              className="relative mx-auto mb-5 flex size-28 items-center justify-center rounded-[34px] bg-white shadow-[0_18px_44px_rgba(222,91,84,0.15)]"
              animate={{ y: [0, -6, 0], rotate: [-1, 1, -1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <LunchmateCharacterRenderer
                flowState="idle"
                artwork="chicken"
                chickenAssetKeyOverride="idle"
                chickenFaceSystem
                animated={false}
                loadout={lunchmateLoadout}
                size={104}
                renderSize="compact"
                alt="친구들의 선택을 기다리는 런치킨"
              />
              <span className="absolute -right-2 -top-2 flex size-9 items-center justify-center rounded-full bg-[#EB5053] text-base text-white shadow-md">♥</span>
            </motion.div>

            <button
              type="button"
              onClick={() => {
                if (!currentSession) return;
                activateLunchieWaitingCompanion(currentSession.id);
                navigate('/feed');
              }}
              className="relative mx-auto mb-4 block max-w-[285px] rounded-[20px] border border-[#EFD8CF] bg-white px-5 py-3 text-center shadow-[0_10px_28px_rgba(95,61,49,0.1)] transition-transform active:scale-[0.98]"
            >
              <span className="block text-[12px] font-black text-[#443833]">기다리는 동안 먼치피드 같이 둘러봐요</span>
              <span className="mt-1 block text-[10px] font-bold text-[#E05255]">런치킨이 투표 시간을 계속 알려드려요 →</span>
              <span className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rotate-45 border-l border-t border-[#EFD8CF] bg-white" aria-hidden="true" />
            </button>

            <span className="inline-flex rounded-full bg-[#FFE0DC] px-3 py-1 text-[10px] font-black tracking-[0.7px] text-[#D94B4E]">
              {phase === 'FINAL' ? 'FINAL CHOICE' : 'CHOICES IN'}
            </span>
            <h2 className="mt-3 text-[24px] font-black tracking-[-0.7px] text-[#312A28]">
              친구들의 선택을 모으는 중
            </h2>
            <p className="mt-1 text-[12px] font-semibold text-[#9A8880]">
              모두 끝나면 {phase === 'FINAL' ? '최종 결과가' : '결승 후보가'} 동시에 열려요.
            </p>

            <div className="mt-6 rounded-[26px] border border-[#F3E4DD] bg-white p-5 text-left shadow-[0_14px_40px_rgba(102,68,54,0.08)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-black text-[#A08D84]">{phase === 'FINAL' ? '결승 투표 현황' : '예선 투표 현황'}</p>
                  <p className="mt-1 text-[28px] font-black tracking-[-1px] text-[#302927]">
                    {displayedCompleted}<span className="mx-1 text-[16px] text-[#C4B5AE]">/</span>{displayedTotal}
                    <span className="ml-1.5 text-[12px] font-bold text-[#897A73]">명 {phase === 'FINAL' ? '투표' : '완료'}</span>
                  </p>
                </div>
                {timeLeft && (
                  <div className="rounded-xl bg-[#FFF1EC] px-3 py-2 text-right">
                    <p className="text-[9px] font-bold text-[#B3988D]">남은 시간</p>
                    <p className="font-mono text-[14px] font-black tabular-nums text-[#E15154]">{timeLeft}</p>
                  </div>
                )}
              </div>
              <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[#F4E8E2]">
                <motion.div
                  className="h-full rounded-full bg-[#EB5053]"
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercent}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              {resultsConnection === 'offline' && (
                <p className="mt-3 rounded-xl bg-[#FFF5DA] px-3 py-2 text-[10px] font-bold text-[#9A6C16]" role="status">
                  연결을 다시 확인하고 있어요. 완료 신호는 자동으로 재전송됩니다.
                </p>
              )}
            </div>

            <div className="mt-3 max-h-[190px] space-y-2 overflow-y-auto text-left">
              {liveResults.memberCompletion.map(member => {
                const memberDone = member.completed || (phase === 'FINAL' && voted && member.id === profile.id);
                return (
                <div key={member.id} className="flex items-center justify-between rounded-2xl border border-[#F1E4DE] bg-white/80 p-3 shadow-sm">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FFF0EA] text-xl">{member.emoji}</span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-black text-[#443A36]">{member.name}{member.id === profile.id ? ' · 나' : ''}</p>
                      {!memberDone && phase !== 'FINAL' && (
                        <p className="mt-0.5 text-[10px] font-semibold text-[#AA9890]">{member.swipeCount}/{member.targetCount} 카드 선택</p>
                      )}
                    </div>
                  </div>
                  {memberDone ? (
                    <span className="shrink-0 rounded-full bg-[#EAF7EC] px-2.5 py-1 text-[10px] font-black text-[#278836]">선택 완료 ✓</span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-[#FFF0EA] px-2.5 py-1 text-[10px] font-black text-[#DC6660]">고르는 중</span>
                  )}
                </div>
              ); })}
            </div>
          </motion.div>
        )}
      </div>

      {/* D: 호스트 '지금 진행' — 대기 중일 때만, 호스트에게만 */}
      {!isAllCompleted && currentSession?.hostId === profile.id && (
        <button
          onClick={async () => {
            const gen = liveResults.generation ?? 1;
            const round = phase === 'FINAL' ? 2 * gen : 2 * gen - 1;
            try {
              const response = await fetch(`/api/sessions/${currentSession.inviteCode}/force`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: profile.id, round }),
              });
              if (!response.ok) throw new Error('force_failed');
            } catch { /* 폴링으로 복구 */ }
          }}
          className="mb-3 mx-auto block w-full max-w-[340px] rounded-2xl border border-[#F0D9D1] bg-white py-3 text-[13px] font-black text-[#D94B4E] shadow-sm transition-all active:scale-[0.98]">
          기다리지 않고 지금 진행 · 호스트
        </button>
      )}

      <button onClick={() => navigate('/')}
        className="mx-auto mt-1 block text-center text-[12px] font-bold text-[#A38F86] active:scale-95">
        처음으로
      </button>
    </motion.div>
  );
}

// ─── Main Quick Match Page ────────────────────────────────────────────────────

type Phase = 'swipe' | 'decided' | 'results';

function QuickMatchExperience() {
  const [, navigate] = useLocation();
  const { currentSession, addSwipe, swipeRecords, profile, rerollSession } = useApp();
  const [phase, setPhase] = useState<Phase>('swipe');
  const lunchmateLoadout = lunchmateLoadoutFromProfile(profile.lunchmateLoadout);
  const targetRestaurants = currentSession?.restaurants || [];
  const currentSessionSwipes = swipeRecords.filter(s => s.sessionId === currentSession?.id);
  const [currentIndex, setCurrentIndex] = useState(() => {
    const initialIndex = targetRestaurants.findIndex(r => !currentSessionSwipes.some(s => s.restaurantId === r.id));
    return initialIndex === -1 ? 0 : initialIndex;
  });
  const [swipeData, setSwipeData] = useState<{ restaurant: any; action: SwipeAction }[]>([]);
  const [selectedWinner, setSelectedWinner] = useState<Restaurant | null>(null);
  // 듀얼 상태: 엔진 top-2 비교. "둘 다 별로"면 다음 후보 쌍으로. null=아직 미구성
  const [duel, setDuel] = useState<{ a: any; b: any } | null>(null);
  const cardShownAtRef = useRef(Date.now()); // 현재 카드 노출 시각 → dwell 측정
  const rejectedRef = useRef<Set<string>>(new Set()); // 듀얼에서 "둘 다 별로"로 거절된 후보
  // 솔로 "다 거절 → 새 추천" 라운드 카운트. 그룹의 generation/REROLL_CAP(3)과 동일한 규칙:
  // 1라운드는 조용히 재추천, 2라운드는 마지막 기회를 물어보고, 3라운드째도 다 거절이면 포기 안내.
  const rejectRoundRef = useRef(1);
  const SOLO_REROLL_CAP = 3;
  const [rerollPrompt, setRerollPrompt] = useState<'none' | 'lastChance' | 'exhausted'>('none');
  const [showIntro, setShowIntro] = useState(true);
  const [isSubmittingSwipe, setIsSubmittingSwipe] = useState(false);
  const [detailRestaurant, setDetailRestaurant] = useState<Restaurant | null>(null);
  const submittingSwipeRef = useRef(false);
  const [remainingMs, setRemainingMs] = useState(() => {
    if (!currentSession?.deadline) return 0;
    return Math.max(0, new Date(currentSession.deadline).getTime() - Date.now());
  });

  // Countdown ticker for the header badge
  useEffect(() => {
    if (!currentSession?.deadline) return;
    const deadlineTime = new Date(currentSession.deadline).getTime();
    const iv = setInterval(() => {
      setRemainingMs(Math.max(0, deadlineTime - Date.now()));
    }, 1000);
    return () => clearInterval(iv);
  }, [currentSession?.deadline]);

  // Expiry check — 예선(swipe) 중에만 만료로 강제 전환. 결정/결과 단계에선 되돌리지 않음.
  useEffect(() => {
    if (!currentSession?.deadline || phase !== 'swipe') return;
    const deadlineTime = new Date(currentSession.deadline).getTime();

    const checkExpiry = () => {
      if (Date.now() > deadlineTime) {
        setPhase('decided');
      }
    };

    checkExpiry();
    const timer = setInterval(checkExpiry, 1000);
    return () => clearInterval(timer);
  }, [currentSession?.deadline, phase]);

  const total = Math.min(targetRestaurants.length, 7); // 예선 = 엔진 top-7 (결정 플로우 ①)
  const visibleCards = targetRestaurants.slice(currentIndex, currentIndex + 3);
  const progress = Math.min(currentIndex + 1, total);
  const progressSignalRef = useRef(new Set<string>());

  useEffect(() => {
    const syncRestaurantDetailFromHistory = () => {
      const restaurantId = window.history.state?.lunchieQuickMatchDetail;
      setDetailRestaurant(
        typeof restaurantId === 'string'
          ? targetRestaurants.find(restaurant => restaurant.id === restaurantId) ?? null
          : null,
      );
    };
    window.addEventListener('popstate', syncRestaurantDetailFromHistory);
    return () => window.removeEventListener('popstate', syncRestaurantDetailFromHistory);
  }, [targetRestaurants]);

  const openRestaurantDetails = useCallback((restaurant: Restaurant) => {
    window.history.pushState(
      { ...window.history.state, lunchieQuickMatchDetail: restaurant.id },
      '',
      window.location.href,
    );
    setDetailRestaurant(restaurant);
  }, []);

  const closeRestaurantDetails = useCallback(() => {
    if (window.history.state?.lunchieQuickMatchDetail) {
      window.history.back();
      return;
    }
    setDetailRestaurant(null);
  }, []);

  // The server cannot infer a client-specific deck after recommendation
  // filtering. Announce the exact target once per generation so each member's
  // completion count stays correct on every device.
  useEffect(() => {
    if (!currentSession || total <= 0) return;
    const generation = currentSession.generation ?? 1;
    const round = generation * 2 - 1;
    const key = `${currentSession.id}:${profile.id}:${round}:deck`;
    if (progressSignalRef.current.has(key)) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const sendDeckSignal = async () => {
      try {
        await persistSessionSwipe({
          id: `deck_${currentSession.id}_${profile.id}_${round}`,
          sessionId: currentSession.id,
          userId: profile.id,
          restaurantId: `__deck_size__:${total}`,
          round,
          action: 'SYSTEM',
        });
        if (!cancelled) progressSignalRef.current.add(key);
      } catch {
        if (!cancelled) retryTimer = setTimeout(() => void sendDeckSignal(), 1200);
      }
    };
    void sendDeckSignal();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [currentSession?.id, currentSession?.generation, profile.id, total]);

  // Auto-transition to decided phase if all cards have been swiped — 예선(swipe) 중에만.
  // 결정/결과 단계에선 절대 되돌리지 않는다 (안 그러면 듀얼→결과가 'decided'로 튕겨 무한루프).
  useEffect(() => {
    if (phase !== 'swipe') return;
    const currentSessionSwipes = swipeRecords.filter(s => s.sessionId === currentSession?.id);
    const unswipedCount = targetRestaurants.filter(r => !currentSessionSwipes.some(s => s.restaurantId === r.id)).length;
    if (unswipedCount === 0 || currentIndex >= total) {
      setPhase('decided');
    }
  }, [phase, currentIndex, targetRestaurants, swipeRecords, total, currentSession?.id]);

  // Marking completion is idempotent and is deliberately separate from the
  // final swipe: a network retry cannot leave someone permanently "투표 중".
  useEffect(() => {
    if (phase !== 'decided' || !currentSession) return;
    const generation = currentSession.generation ?? 1;
    const round = generation * 2 - 1;
    const key = `${currentSession.id}:${profile.id}:${round}:done`;
    if (progressSignalRef.current.has(key)) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const sendDoneSignal = async () => {
      try {
        await persistSessionSwipe({
          id: `done_${currentSession.id}_${profile.id}_${round}`,
          sessionId: currentSession.id,
          userId: profile.id,
          restaurantId: '__prelim_done__',
          round,
          action: 'SYSTEM',
        });
        if (!cancelled) progressSignalRef.current.add(key);
      } catch {
        if (!cancelled) retryTimer = setTimeout(() => void sendDoneSignal(), 1200);
      }
    };
    void sendDoneSignal();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [phase, currentSession?.id, currentSession?.generation, profile.id]);

  useEffect(() => {
    if (!showIntro) return;
    const timer = window.setTimeout(() => setShowIntro(false), 2800);
    return () => window.clearTimeout(timer);
  }, [showIntro]);

  useEffect(() => {
    if (!showIntro) cardShownAtRef.current = Date.now();
  }, [showIntro]);

  const handleAction = useCallback(async (action: SwipeAction) => {
    if (submittingSwipeRef.current) return;
    const restaurant = targetRestaurants[currentIndex];
    if (!restaurant) return;

    submittingSwipeRef.current = true;
    setIsSubmittingSwipe(true);
    try {
      await addSwipe(restaurant.id, action === 'like' ? 'like' : 'skip');
    } catch (error) {
      console.error('빠른 매칭 선택 저장 실패', error);
      toast.error('선택을 저장하지 못했어요. 다시 눌러 주세요.');
      submittingSwipeRef.current = false;
      setIsSubmittingSwipe(false);
      return;
    }
    const meta = currentSession?.recMeta?.[restaurant.id];
    const dwell = Date.now() - cardShownAtRef.current; // 이 카드를 본 시간
    cardShownAtRef.current = Date.now(); // 다음 카드 노출 시점 리셋
    // 서버 세션은 /api/swipes가 선택과 추천 근거를 원자적으로 기록한다.
    // 세션이 없는 레거시 단독 흐름만 best-effort 브라우저 로그를 사용한다.
    if (!currentSession) {
      logSwipe(restaurant.id, action === 'like' ? 'LIKE' : 'NOPE', {
        user_id: profile.id,
        slate_type: 'PRELIM',
        round: 1,
        position: meta?.position ?? currentIndex,
        propensity: meta?.propensity ?? null,
        dwell_ms: dwell,
        model_version: 'v0-heuristic',
      });
    }
    setSwipeData(prev => [...prev, { restaurant, action }]);

    if (currentIndex + 1 >= total) {
      setPhase('decided');
    } else {
      setCurrentIndex(i => i + 1);
    }
    submittingSwipeRef.current = false;
    setIsSubmittingSwipe(false);
  }, [currentIndex, targetRestaurants, addSwipe, total, currentSession, profile.id]);

  // ── 중도 이탈(ABANDON): 예선 중 나가면 "어디서 몇 장 봤는지" 명시 로깅 ──
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  const swipeCountRef = useRef(0);
  useEffect(() => { swipeCountRef.current = swipeData.length; }, [swipeData]);
  const sessionRef = useRef(currentSession);
  useEffect(() => { sessionRef.current = currentSession; }, [currentSession]);
  const abandonLoggedRef = useRef(false);
  // 안정 콜백(deps 없음) — currentSession 변경에 재생성되지 않게 ref로 읽어, 클린업이 실제 언마운트 때만 동작.
  const logAbandon = useCallback((via: string) => {
    if (abandonLoggedRef.current || phaseRef.current !== 'swipe') return; // 예선 중 이탈만 (결정 후엔 이탈 아님), 1회
    abandonLoggedRef.current = true;
    const sess = sessionRef.current;
    logEvent({
      event_type: 'ABANDON', user_id: profile.id,
      session_id: sess?.id ?? null, slate_id: sess?.slateId ?? null, round: 1,
      context: { phase: 'swipe', swipes_done: swipeCountRef.current, via },
    });
    flushEvents();
  }, [profile.id]);
  useEffect(() => {
    const onHide = () => logAbandon('pagehide'); // 탭 닫기/백그라운드
    window.addEventListener('pagehide', onHide);
    return () => { window.removeEventListener('pagehide', onHide); logAbandon('unmount'); }; // 실제 라우트 이탈 시만
  }, [logAbandon]);

  // 솔로 결정(통일): 엔진 top-2 듀얼 1번 (이론 권장). 둘 다 별로면 다음 후보로 (handleRejectBoth).
  // 분기 없음 — 좋아요 1개든 7개든 같은 모델. 그룹은 WaitingOrDecidedScreen이 처리.
  useEffect(() => {
    if (phase !== 'decided' || duel || selectedWinner) return;
    const isSolo = (currentSession?.members?.length ?? 1) <= 1;
    if (!isSolo) return;
    const byEng = (list: any[]) => [...list].sort((a, b) => (currentSession?.recMeta?.[a.id]?.position ?? 999) - (currentSession?.recMeta?.[b.id]?.position ?? 999));
    const liked = byEng(swipeData.filter(s => s.action === 'like').map(s => s.restaurant));
    const pool = liked.length >= 1 ? liked : byEng(targetRestaurants.slice(0, total)); // 좋아요 없으면 엔진 top으로 완화
    if (pool.length === 1) setDuel({ a: pool[0], b: null });                            // 후보 1 → 확인 화면(자동 확정 X)
    else if (pool.length >= 2) setDuel({ a: pool[0], b: pool[1] });                       // 엔진 top-2 듀얼
    else { setSelectedWinner(null); setPhase('results'); }                                // 후보 없음(예외)
  }, [phase]);

  const topPick = swipeData.find(s => s.action === 'like')?.restaurant || targetRestaurants[0];

  if (!currentSession) return <SwipeStateScreen state="session-missing" />;

  // 새 추천으로 재시작. 같은 덱(targetRestaurants)은 이미 swipeRecords에 다 기록돼 있어서,
  // rerollSession으로 새 덱을 먼저 받아온 뒤에 phase를 'swipe'로 돌려야 한다 — 순서를 바꾸면
  // "전부 스와이프 완료" 감지 effect(위)가 옛 덱 그대로 즉시 'decided'로 되돌려 무한 루프가 난다.
  const handleReset = async () => {
    logEvent({ event_type: 'REROLL', user_id: profile.id, session_id: currentSession?.id ?? null, slate_id: currentSession?.slateId ?? null });
    rejectedRef.current.clear();
    await rerollSession(targetRestaurants.map(r => r.id));
    setCurrentIndex(0); setSwipeData([]); setSelectedWinner(null); setDuel(null); setPhase('swipe');
  };
  // 듀얼 선택 → 우승 확정 (1번 비교, 이론 권장).
  const handleDuelChoice = (chosen?: any) => { if (chosen) setSelectedWinner(chosen); setPhase('results'); };
  // "둘 다 별로" → 두 후보 거절(NOPE FINAL = head-to-head 부정) → 남은 좋아요로 다른 듀얼, 없으면 새 추천.
  const handleRejectBoth = () => {
    if (!duel) return;
    [duel.a, duel.b].forEach((f) => {
      if (f?.id) {
        logEvent({ event_type: 'SWIPE', action: 'NOPE', slate_id: currentSession?.slateId ?? null, slate_type: 'FINAL', restaurant_id: f.id, round: 2, user_id: profile.id, session_id: currentSession?.id ?? null });
        rejectedRef.current.add(f.id);
      }
    });
    const byEng = (list: any[]) => [...list].sort((x, y) => (currentSession?.recMeta?.[x.id]?.position ?? 999) - (currentSession?.recMeta?.[y.id]?.position ?? 999));
    const remaining = byEng(swipeData.filter(s => s.action === 'like').map(s => s.restaurant).filter((r: any) => !rejectedRef.current.has(r.id)));
    if (remaining.length >= 2) setDuel({ a: remaining[0], b: remaining[1] });                     // 다른 좋아요 쌍
    else if (remaining.length === 1) setDuel({ a: remaining[0], b: null });                       // 하나만 남음 → 확인 화면(자동 확정 X)
    else {
      // 다 거절 → 새 추천. 그룹과 동일하게 마지막 라운드 직전엔 물어보고, 상한 도달하면 포기 안내.
      const nextRound = rejectRoundRef.current + 1;
      if (rejectRoundRef.current >= SOLO_REROLL_CAP) setRerollPrompt('exhausted');
      else if (nextRound >= SOLO_REROLL_CAP) setRerollPrompt('lastChance');
      else { rejectRoundRef.current = nextRound; handleReset(); }
    }
  };

  if (phase === 'decided') {
    const isSolo = (currentSession?.members?.length ?? 1) <= 1;
    if (isSolo) {
      // 마지막 기회 안내 — 그룹의 REROLL "isLastChance" 화면과 동일한 안내 메시지·버튼.
      if (rerollPrompt === 'lastChance') {
        return (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="min-h-dvh flex flex-col justify-between px-5 py-8"
            style={{ background: 'linear-gradient(160deg, #2C3E50 0%, #1a252f 100%)' }}>
            <div className="flex-1 flex flex-col justify-center text-center">
              <div className="text-6xl mb-3">🤔</div>
              <h2 className="text-white font-black text-[24px] mb-2">계속 별로였네요</h2>
              <p className="text-white/70 text-[13px] leading-relaxed">한 번 더 시도하면 마지막 기회예요.<br />여기서 처음부터 다시 시작할 수도 있어요.</p>
            </div>
            <div className="space-y-2">
              <button onClick={() => { rejectRoundRef.current += 1; setRerollPrompt('none'); handleReset(); }}
                className="w-full max-w-[340px] py-4 rounded-2xl font-bold text-white text-[15px] bg-[#EB5053] active:scale-[0.98] transition-all shadow-md mx-auto block">마지막으로 한 번 더 →</button>
              <button onClick={() => navigate('/')}
                className="w-full max-w-[340px] py-4 rounded-2xl font-bold text-white/80 text-[14px] bg-white/10 active:scale-[0.98] transition-all mx-auto block">처음부터 다시 시작</button>
            </div>
          </motion.div>
        );
      }
      // 상한 도달 — 그룹의 NO_CONSENSUS 화면과 동일한 포기 안내(자동 재추천 없음).
      if (rerollPrompt === 'exhausted') {
        return (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="min-h-dvh flex flex-col justify-between px-5 py-8"
            style={{ background: 'linear-gradient(160deg, #4A4A4A 0%, #2a2a2a 100%)' }}>
            <div className="flex-1 flex flex-col justify-center text-center">
              <div className="text-6xl mb-3">🤷</div>
              <h2 className="text-white font-black text-[24px] mb-2">마음에 드는 곳을 못 찾았어요</h2>
              <p className="text-white/70 text-[13px] leading-relaxed">여러 번 골라봤지만 계속 별로였어요.<br />다른 동네로 넓히거나 나중에 다시 시도해볼까요?</p>
            </div>
            <button onClick={() => navigate('/')}
              className="w-full max-w-[340px] py-4 rounded-2xl font-bold text-[#4A4A4A] text-[15px] bg-white active:scale-[0.98] transition-all shadow-md mx-auto block">처음으로</button>
          </motion.div>
        );
      }
      // 솔로: 좋아요 수로 구성된 듀얼(준결승→결승). 로컬 즉시 — /results 폴링/플래시 없음.
      if (duel) return <FinalBattleResultScreen key={(duel.a?.id ?? '') + (duel.b?.id ?? '')} finalist1={duel.a} finalist2={duel.b} onContinue={handleDuelChoice} onRejectBoth={handleRejectBoth} />;
      return <SwipeStateScreen state="loading" />; // 효과가 듀얼/우승 구성 중
    }
    return <WaitingOrDecidedScreen
      onContinue={(w) => { if (w) setSelectedWinner(w); setPhase('results'); }}
      onReroll={async (excludeIds) => { await rerollSession(excludeIds); setSwipeData([]); setCurrentIndex(0); setSelectedWinner(null); setDuel(null); setPhase('swipe'); }}
    />; // 그룹: 멤버 투표 폴링 + REROLL시 새 세대 재스와이프
  }
  if (phase === 'results') {
    return <WinnerScreen selectedWinner={selectedWinner} onReset={handleReset} />;
  }

  // Countdown formatting for header badge
  const totalSec = Math.ceil(remainingMs / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  const urgent = remainingMs > 0 && remainingMs <= 30000;

  return (
    <div className="min-h-dvh bg-[#FCF4EE] relative">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
        <BackButton
          onClick={() => { logAbandon('back'); navigate('/lunchie/settings'); }}
          aria-label="빠른 매칭 설정으로 돌아가기"
        />
        <div className="text-center">
          <p className="font-black text-[16px] text-[#1A1A1A]">예선전 🍽️</p>
          <p className="text-[11px] text-[#9B9B9B]">마음에 드는 음식을 골라보세요</p>
        </div>
        {currentSession?.deadline ? (
          <motion.div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
            style={{ background: urgent ? '#F09D09' : '#FFF1E0' }}
            animate={urgent ? { scale: [1, 1.08, 1] } : {}}
            transition={{ duration: 1, repeat: urgent ? Infinity : 0 }}
          >
            <Clock size={14} color={urgent ? 'white' : '#F09D09'} />
            <span className="font-black text-[13px] tabular-nums" style={{ color: urgent ? 'white' : '#F09D09' }}>
              {mm}:{ss}
            </span>
          </motion.div>
        ) : (
          <div className="w-10 flex-shrink-0" />
        )}
      </div>

      {currentSession.dietaryBestEffort && (
        <div role="note" className="mx-5 mb-2 rounded-2xl border border-[#F3CFAE] bg-[#FFF7E8] px-4 py-3 text-center">
          <p className="text-[12px] font-black text-[#7A4B20]">현재 위치에서 가장 가까운 후보</p>
          <p className="mt-1 text-[10px] font-semibold leading-relaxed text-[#8A6747]">
            선택한 모든 식단 조건을 매장에서 보장하지는 않아요. 제외 재료는 반영했지만 주문 전에 매장에 다시 확인해 주세요.
          </p>
        </div>
      )}

      {/* Intro overlay */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            role="status"
            aria-live="polite"
            aria-label="Quick Match 음식점 후보를 준비하고 있어요"
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#1A1A1A] px-6 text-center"
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="flex items-center justify-center"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <LunchmateCharacterRenderer
                flowState="idle"
                artwork="chicken"
                chickenAssetKeyOverride="idle"
                chickenFaceSystem
                loadout={lunchmateLoadout}
                size={148}
                renderSize="compact"
                animated={false}
                alt="Quick Match를 준비하는 나의 런치킨"
              />
            </motion.div>

            <div className="mt-6 max-w-[280px]">
              <p className="text-[22px] font-black text-white">음식점 카드를 준비하고 있어요</p>
              <p className="mt-2 text-[14px] font-semibold leading-relaxed text-white/60">
                내 취향에 맞는 후보를 고르고 있어요
              </p>
            </div>

            <div aria-hidden="true" className="mt-6 flex h-3 items-center justify-center gap-2">
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  className="size-2 rounded-full bg-[#EB5053]"
                  animate={{ opacity: [0.35, 1, 0.35], scale: [0.85, 1, 0.85] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.18, ease: 'easeInOut' }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Card stack — 9:12 ratio */}
      <div className="px-5 py-2 relative flex items-center justify-center">
        <div className="relative w-full" style={{ aspectRatio: '9/12', maxHeight: '64dvh' }}>
          <AnimatePresence>
            {visibleCards.map((restaurant, i) => (
              <SwipeCard
                key={restaurant.id}
                restaurant={restaurant}
                onAction={handleAction}
                isTop={i === 0}
                stackIndex={i}
                progress={progress}
                total={total}
                isLocked={isSubmittingSwipe}
                onOpenRestaurantDetails={openRestaurantDetails}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-8 pb-10 pt-4 flex items-center justify-center gap-8">
        <motion.button
          onClick={() => handleAction('dislike')}
          disabled={isSubmittingSwipe}
          aria-label="싫어요"
          className="flex h-[75px] w-[75px] items-center justify-center rounded-full bg-white shadow-xl active:scale-90 disabled:cursor-wait disabled:opacity-50"
          whileTap={{ scale: 0.85 }}
        >
          <X size={30} color="#EB5053" strokeWidth={2.5} />
        </motion.button>
        <motion.button
          onClick={() => handleAction('like')}
          disabled={isSubmittingSwipe}
          aria-label="좋아요"
          className="flex h-[75px] w-[75px] items-center justify-center rounded-full shadow-xl active:scale-90 disabled:cursor-wait disabled:opacity-50"
          style={{ background: '#EB5053' }}
          whileTap={{ scale: 0.85 }}
        >
          <Heart size={30} color="white" fill="white" />
        </motion.button>
      </div>

      <AnimatePresence>
        {detailRestaurant && (
          <QuickMatchRestaurantDetailSheet
            open
            restaurant={detailRestaurant}
            onClose={closeRestaurantDetails}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function QuickMatchPage() {
  const { currentSession, fetchSession, registerRestaurants, profile } = useApp();
  const [availability, setAvailability] = useState<SwipeAvailability>('loading');
  const [retryAttempt, setRetryAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const token = currentSession?.inviteCode;
    if (!token) {
      setAvailability('session-missing');
      return () => { active = false; };
    }

    setAvailability('loading');
    void (async () => {
      try {
        const serverSession = await fetchSession(token, []);
        const baseState = classifySwipeAvailability({
          loading: false,
          hasSession: true,
          isMember: serverSession.membershipActive !== false && serverSession.members.some(member => member.id === profile.id),
          status: serverSession.status,
          catalogLoaded: false,
          catalogCount: 0,
          candidateCount: serverSession.restaurants.length,
        });
        if (baseState === 'session-invalid' || baseState === 'session-not-started') {
          if (active) setAvailability(baseState);
          return;
        }
        if (!isActiveQuickMatchStatus(serverSession.status)) {
          if (active) setAvailability('session-invalid');
          return;
        }

        const response = await fetch('/api/restaurants');
        if (!response.ok) throw Object.assign(new Error(`Restaurant request failed (${response.status})`), { status: response.status });
        const payload = await response.json();
        if (!Array.isArray(payload)) throw new Error('Restaurant response was not a list');
        const catalogue = payload.map((restaurant: Record<string, unknown>) => normalizeRestaurantPayload(restaurant) as Restaurant);
        if (catalogue.length > 0) registerRestaurants(catalogue);
        const refreshedSession = await fetchSession(token, catalogue);
        const nextState = classifySwipeAvailability({
          loading: false,
          hasSession: true,
          isMember: refreshedSession.membershipActive !== false && refreshedSession.members.some(member => member.id === profile.id),
          status: refreshedSession.status,
          catalogLoaded: true,
          catalogCount: catalogue.length,
          candidateCount: refreshedSession.restaurants.length,
        });
        if (active) setAvailability(nextState);
      } catch (error) {
        if (!active) return;
        const status = (error as { status?: number }).status;
        const code = (error as { code?: string }).code;
        if (status === 404 || status === 410 || code === 'SESSION_NOT_FOUND') {
          setAvailability('session-invalid');
          return;
        }
        console.error('Failed to prepare Quick Match', {
          status,
          code,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        setAvailability('api-error');
      }
    })();

    return () => { active = false; };
  }, [currentSession?.inviteCode, fetchSession, profile.id, registerRestaurants, retryAttempt]);

  if (availability !== 'ready') {
    return <SwipeStateScreen state={availability} onRetry={() => setRetryAttempt(attempt => attempt + 1)} />;
  }
  return <QuickMatchExperience />;
}
