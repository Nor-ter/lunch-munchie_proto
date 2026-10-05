import { englishText } from '@shared/englishCopy';
/**
 * Lunchie Munchie — Quick Match Page
 * Design: Soft Coral (Option 8) + Pubfish Reference
 * Flow: 음식 종류 → 추천/비추천 → TOP 2 → 만족도
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, useMotionValue, useTransform, useMotionTemplate, useAnimation, AnimatePresence, type MotionValue, type PanInfo } from 'framer-motion';
import { useLocation } from 'wouter';
import { Heart, X, Minus, Star, MapPin, Clock, Phone, Navigation, Share2, Download, Link2, Home, Bookmark, RotateCcw, Loader2, RefreshCw, SlidersHorizontal, Info, LockKeyhole, MessageCircleHeart, Sparkles, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useApp, type Restaurant, type MenuItem, type GroupSession } from '@/contexts/AppContext';
import { useCourseShare } from '@/hooks/useCourseShare';
import WinnerShareCard from '@/components/lunchie/WinnerShareCard';
import FoodImage from '@/components/FoodImage';
import MenuItemDetail from '@/components/MenuItemDetail';
import { logSwipe, logWinner, logNavigate, logEvent, flushEvents } from '@/lib/eventLogger';
import { lunchmateLoadoutFromProfile } from '@/utils/lunchmateProfile';
import { intentForCategory } from '@shared/intent';
import { completeSoloSessionChoice, persistSessionSwipe } from '@/services/sessionApi';
import { classifySwipeAvailability, type SwipeAvailability } from '@/lib/swipeAvailability';
import { isActiveQuickMatchStatus } from '@/lib/quickMatch';
import { beginMenuPhotoRotation, completeMenuPhotoRotation } from '@/lib/menuPhotoRotation';
import { normalizeRestaurantPayload } from '@shared/restaurantContract';
import SessionManagementMenu from '@/components/lunchie/SessionManagementMenu';
import BackButton from '@/components/ui/BackButton';
import QuickMatchRestaurantDetailSheet from '@/components/lunchie/QuickMatchRestaurantDetailSheet';
import { restaurantSummary, restaurantRatingLabel, restaurantPriceLabel } from '@/lib/restaurantPresentation';
import { LUNCHIE_CUISINE_CHOICES, prioritizeRestaurantsForCuisine, type LunchieCuisineChoice } from '@/lib/lunchieGame';
import { cuisineSignal, mealRatingSignal, satisfactionSignal } from '@shared/lunchieRoundStats';
import { lunchieSwipeExit, resolveLunchieSwipeGesture } from '@/lib/lunchieSwipeGesture';

// ─── Types ────────────────────────────────────────────────────────────────────

type SwipeAction = 'like' | 'dislike' | 'neutral';

type RoundStatItem = {
  id: string;
  label: string;
  value: number;
  color: string;
  emoji?: string;
};

type LunchieRoundStatsPayload = {
  totalMembers?: number;
  isExpired?: boolean;
  cuisineTally?: Record<LunchieCuisineChoice, number>;
  cuisineVotedCount?: number;
  satisfactionResponseCount?: number;
  satisfactionAverage?: number | null;
  satisfactionBuckets?: { low: number; medium: number; high: number };
  visitedCount?: number;
  mealRatingAverage?: number | null;
  mealRatingDistribution?: Record<1 | 2 | 3 | 4 | 5, number>;
};

function GameStageRail({ current }: { current: 1 | 2 | 3 | 4 }) {
  const stages = ["Cuisine", "Recommendation Vote", 'TOP 2', "Satisfaction"];
  return (
    <div className="mx-auto flex w-full max-w-[350px] items-center" aria-label={`Stage ${current}: ${stages[current - 1]}`}>
      {stages.map((stage, index) => {
        const step = index + 1;
        const active = step === current;
        const complete = step < current;
        return (
          <div key={stage} className="contents">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className={`flex size-6 items-center justify-center rounded-full text-[10px] font-semibold ${active ? 'bg-[#AA1A0D] text-white' : complete ? 'bg-[#FBECE9] text-[#80140A]' : 'bg-[#F5F4F5] text-[#858185]'}`}>
                {englishText(complete ? '✓' : step)}
              </span>
              <span className={`truncate text-[9px] font-semibold ${active ? 'text-[#AA1A0D]' : 'text-[#858185]'}`}>{englishText(stage)}</span>
            </div>
            {index < stages.length - 1 && <span className={`mb-4 h-0.5 w-3 rounded-full ${complete ? 'bg-[#FBECE9]' : 'bg-[#E8E6E7]'}`} aria-hidden="true" />}
          </div>
        );
      })}
    </div>
  );
}

function RoundStatisticsScreen({
  round,
  eyebrow,
  title,
  description,
  items,
  completed,
  total,
  ready = true,
  onContinue,
  continueLabel,
  summaryLabel,
}: {
  round: 1 | 2 | 3 | 4;
  eyebrow: string;
  title: string;
  description: string;
  items: RoundStatItem[];
  completed: number;
  total: number;
  ready?: boolean;
  onContinue?: () => void;
  continueLabel?: string;
  summaryLabel?: string;
}) {
  const safeTotal = Math.max(total, 1);
  const maxValue = Math.max(1, ...items.map(item => item.value));

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-dvh bg-[#FCFCFC] px-5 pb-8 pt-[max(18px,env(safe-area-inset-top))] text-[#171717]"
      aria-label={englishText(`${round} round results`)}
    >
      <GameStageRail current={round} />
      <div className="mx-auto mt-9 max-w-[380px] text-center">
        <span className="inline-flex rounded-full bg-[#FBECE9] px-3 py-1 text-[10px] font-black tracking-[0.8px] text-[#80140A]">{englishText(eyebrow)}</span>
        <h1 className="mt-4 text-[24px] font-bold leading-tight">{englishText(ready ? title : "Waiting for Everyone")}</h1>
        <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#858185]">
          {englishText(ready ? description : "Individual choices stay private. Results appear together when everyone finishes.")}
        </p>

        {!ready ? (
          <div className="mt-8 border-y border-[#E8E6E7] py-6 text-left">
            <p className="text-[11px] font-black text-[#858185]">ANSWERS LOCKED</p>
            <p className="mt-2 text-[38px] font-black tabular-nums">{completed}<span className="mx-2 text-xl text-[#BDBABD]">/</span>{safeTotal}</p>
            <p className="text-[11px] font-bold text-[#858185]"> people finished</p>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#E8E6E7]">
              <motion.div
                className="h-full rounded-full bg-[#AA1A0D]"
                animate={{ width: `${Math.min(100, (completed / safeTotal) * 100)}%` }}
              />
            </div>
            <p className="mt-4 text-center text-[10px] font-bold text-[#AA1A0D]">🔒 Names and individual choices stay private</p>
          </div>
        ) : (
          <div className="mt-7 space-y-4 border-y border-[#E8E6E7] py-5 text-left">
            {items.map(item => {
              const percent = Math.round((item.value / safeTotal) * 100);
              return (
                <div key={item.id} className="py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-[13px] font-black">{englishText(item.emoji && <span className="mr-1.5" aria-hidden="true">{englishText(item.emoji)}</span>)}{englishText(item.label)}</span>
                    <span className="shrink-0 text-[13px] font-black tabular-nums text-[#AA1A0D]">{item.value} · {percent}%</span>
                  </div>
                  <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-[#E8E6E7]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(item.value > 0 ? 8 : 0, (item.value / maxValue) * 100)}%` }}
                      transition={{ duration: 0.55, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                </div>
              );
            })}
            <p className="pt-1 text-center text-[10px] font-bold text-[#858185]">Anonymous results ·  {englishText(summaryLabel ?? `Total:  ${safeTotal} participants`)}</p>
          </div>
        )}

        {ready && onContinue && (
          <button
            type="button"
            onClick={onContinue}
            className="mt-6 min-h-12 w-full rounded-lg bg-[#AA1A0D] px-4 text-[14px] font-semibold text-white active:bg-[#80140A] active:scale-[0.98]"
          >
            {englishText(continueLabel ?? "Next Round →")}
          </button>
        )}
      </div>
    </motion.main>
  );
}

function CuisineStatisticsScreen({
  inviteCode,
  choices,
  isSolo,
  memberCount,
  onContinue,
}: {
  inviteCode: string;
  choices: LunchieCuisineChoice[];
  isSolo: boolean;
  memberCount: number;
  onContinue: () => void;
}) {
  const [stats, setStats] = useState<LunchieRoundStatsPayload>(() => ({
    cuisineTally: {
      korean: choices.includes('korean') ? 1 : 0,
      asian: choices.includes('asian') ? 1 : 0,
      western: choices.includes('western') ? 1 : 0,
      surprise: choices.includes('surprise') ? 1 : 0,
    },
    cuisineVotedCount: isSolo ? 1 : 0,
  }));

  useEffect(() => {
    if (isSolo) return;
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/sessions/${inviteCode}/results`);
        if (!response.ok) return;
        const payload = await response.json() as LunchieRoundStatsPayload;
        if (!cancelled) setStats(payload);
      } catch { /* 다음 폴링에서 다시 시도 */ }
    };
    void load();
    const timer = window.setInterval(() => void load(), 1200);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [inviteCode, isSolo]);

  const completed = isSolo ? 1 : stats.cuisineVotedCount ?? 0;
  const effectiveTotal = isSolo ? 1 : stats.totalMembers ?? memberCount;
  const ready = isSolo || completed >= effectiveTotal || stats.isExpired === true;
  const tally = stats.cuisineTally ?? { korean: 0, asian: 0, western: 0, surprise: 0 };
  const items = LUNCHIE_CUISINE_CHOICES.map(option => ({
    id: option.id,
    label: option.label,
    value: tally[option.id] ?? 0,
    color: option.color,
    emoji: option.emoji,
  }));

  return (
    <RoundStatisticsScreen
      round={1}
      eyebrow="ROUND 1 RESULT"
      title="Today's Cravings"
      description="Everyone's cuisine choices, combined anonymously."
      items={items}
      completed={completed}
      total={effectiveTotal}
      ready={ready}
      onContinue={onContinue}
      continueLabel="Start Recommendation Vote →"
    />
  );
}

function CuisineChoiceScreen({
  isSolo,
  memberCount,
  isSubmitting,
  onSubmit,
}: {
  isSolo: boolean;
  memberCount: number;
  isSubmitting: boolean;
  onSubmit: (choices: LunchieCuisineChoice[]) => void;
}) {
  const [selected, setSelected] = useState<LunchieCuisineChoice[]>([]);
  const toggleChoice = (choice: LunchieCuisineChoice) => {
    setSelected(current => {
      if (choice === 'surprise') return current.includes('surprise') ? [] : ['surprise'];
      const withoutSurprise = current.filter(item => item !== 'surprise');
      return withoutSurprise.includes(choice)
        ? withoutSurprise.filter(item => item !== choice)
        : [...withoutSurprise, choice];
    });
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-dvh bg-[#FCFCFC] px-5 pb-8 pt-[max(18px,env(safe-area-inset-top))] text-[#171717]"
    >
      <GameStageRail current={1} />
      <div className="mx-auto mt-10 max-w-[380px] text-center">
        <span className="inline-flex rounded-full bg-[#FBECE9] px-3 py-1 text-[10px] font-black tracking-[0.9px] text-[#AA1A0D]">ROUND 1 · PICK A TYPE</span>
        <h1 className="mt-4 text-[24px] font-bold leading-tight">What are you craving?</h1>
        <p className="mt-2 text-[13px] font-semibold leading-relaxed text-[#858185]">

          Choose all the cuisines you like, then confirm.
        </p>

        <div className="mt-7 grid grid-cols-2 gap-3" role="group" aria-label="Choose Cuisines">
          {LUNCHIE_CUISINE_CHOICES.map((choice, index) => {
            const isSelected = selected.includes(choice.id);
            return (
              <motion.button
                key={choice.id}
                type="button"
                onClick={() => toggleChoice(choice.id)}
                disabled={isSubmitting}
                className={`relative min-h-[146px] rounded-lg border-2 p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#AA1A0D]/20 disabled:opacity-55 ${isSelected ? 'border-[#AA1A0D]' : 'border-[#E8E6E7]'}`}
                style={{ background: isSelected ? '#FBECE9' : '#FFFFFF' }}
                whileTap={{ scale: 0.96 }}
                aria-label={englishText(`${choice.label}: ${choice.hint}`)}
                aria-pressed={isSelected}
              >
                <span className="text-[11px] font-black text-[#858185]">{englishText(String.fromCharCode(65 + index))}</span>
                {isSelected && <span className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-[#AA1A0D] text-sm font-black text-white" aria-hidden="true">✓</span>}
                <span className="mt-1 block text-4xl" aria-hidden="true">{englishText(choice.emoji)}</span>
                <span className="mt-3 block text-[16px] font-black">{englishText(choice.label)}</span>
                <span className="mt-0.5 block text-[10px] font-bold text-[#858185]">{englishText(choice.hint)}</span>
              </motion.button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onSubmit(selected)}
          disabled={selected.length === 0 || isSubmitting}
          className="mt-5 min-h-12 w-full rounded-lg bg-[#AA1A0D] px-4 text-[14px] font-semibold text-white active:bg-[#80140A] disabled:bg-[#E8E6E7] disabled:text-[#858185]"
        >
          {englishText(isSubmitting ? "Saving choices…" : `${selected.length || 0} selected →`)}
        </button>

        <div className="mt-6 rounded-2xl border border-[#ECC1BB] bg-[#FBECE9] px-4 py-3">
          <p className="text-[11px] font-black text-[#AA1A0D]">🔒 PRIVATE PICK</p>
          <p className="mt-1 text-[11px] font-semibold text-[#858185]">
            {englishText(isSolo ? "Choose multiple cuisines. Results appear after confirmation." : `Other  ${Math.max(0, memberCount - 1)} participants' choices stay private. Only completion totals are shown.`)}
          </p>
        </div>
      </div>
    </motion.main>
  );
}

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
      title: "Preparing Finalists",
      description: "Preparing Quick Match and restaurant options…",
    },
    'api-error': {
      title: "Couldn't Load Quick Match",
      description: "Check your connection and try again.",
    },
    'catalog-empty': {
      title: "No Restaurants Available Yet",
      description: "Couldn't load restaurants for this Quick Match.",
    },
    'no-matches': {
      title: "No Matching Restaurants",
      description: "Try a wider radius or adjust your preferences.",
    },
    'session-missing': {
      title: "Let's Start a New Quick Match",
      description: "No active Quick Match. Start a new one from settings.",
    },
    'session-invalid': {
      title: "This Quick Match Is Unavailable",
      description: "The session may have ended, expired or been cancelled, or you may have left it.",
    },
    'session-not-started': {
      title: "Quick Match Hasn't Started",
      description: "Return to the lobby and wait for the host to start.",
    },
  }[state];
  const canRetry = state === 'api-error' || state === 'catalog-empty';
  const primaryLabel = state === 'no-matches'
    ? "Adjust Preferences"
    : state === 'session-not-started'
      ? "Back to Lobby"
      : "Back to Settings";
  const primaryPath = state === 'session-not-started' ? '/session/lobby' : '/lunchie/settings';

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#FCFCFC] px-5 py-10">
      <section role={state === 'loading' ? 'status' : 'alert'} aria-live="polite" className="w-full max-w-[390px] rounded-[26px] border border-[#E8E6E7] bg-white p-6 text-center shadow-[0_16px_44px_rgba(137,89,79,0.12)]">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#FBECE9] text-[#AA1A0D]">
          {state === 'loading'
            ? <Loader2 size={30} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            : state === 'no-matches'
              ? <SlidersHorizontal size={28} aria-hidden="true" />
              : <span className="text-3xl" aria-hidden="true">🍽️</span>}
        </div>
        <h1 className="mt-4 text-[20px] font-black tracking-[-0.3px] text-[#171717]">{englishText(content.title)}</h1>
        <p className="mx-auto mt-2 max-w-[300px] text-[13px] leading-relaxed text-[#858185]">{englishText(content.description)}</p>
        {state === 'loading' ? (
          <div className="mt-6 space-y-2" aria-hidden="true">
            <div className="h-3 animate-pulse rounded-full bg-[#F5F4F5] motion-reduce:animate-none" />
            <div className="mx-auto h-3 w-3/4 animate-pulse rounded-full bg-[#F5F4F5] motion-reduce:animate-none" />
          </div>
        ) : (
          <div className="mt-6 space-y-2">
            <button type="button" onClick={() => navigate(primaryPath)} className="min-h-12 w-full rounded-2xl bg-[#AA1A0D] px-4 text-[14px] font-black text-white outline-none focus-visible:ring-2 focus-visible:ring-[#AA1A0D] focus-visible:ring-offset-2">
              {englishText(primaryLabel)}
            </button>
            {canRetry && onRetry && (
              <button type="button" onClick={onRetry} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#E8E6E7] bg-[#FCFCFC] px-4 text-[13px] font-bold text-[#858185] outline-none focus-visible:ring-2 focus-visible:ring-[#AA1A0D]">
                <RefreshCw size={15} aria-hidden="true" />  Try Again
              </button>
            )}
            {currentSession && (state === 'catalog-empty' || state === 'no-matches' || state === 'session-not-started') && (
              <div className="flex items-center justify-center gap-1 pt-2 text-[11px] font-semibold text-[#858185]">

                Manage Session
                <SessionManagementMenu onEnded={() => navigate('/lunchie/settings')} className="text-[#858185]" />
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
    const key = it.category || "Menu";
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
  isTop,
  stackIndex,
  progress,
  total,
  onOpenRestaurantDetails,
  onSwipe,
  interactionDisabled,
  requestedSwipe,
  onRequestedSwipeHandled,
}: {
  restaurant: any;
  isTop: boolean;
  stackIndex: number;
  progress: number;
  total: number;
  onOpenRestaurantDetails: (restaurant: Restaurant) => void;
  onSwipe: (action: SwipeAction) => Promise<boolean>;
  interactionDisabled: boolean;
  requestedSwipe: { id: number; action: SwipeAction; restaurantId: string } | null;
  onRequestedSwipeHandled: (requestId: number) => void;
}) {
  const [isRevealed, setIsRevealed] = useState(false);
  // 큐브 회전 단계(단조). photoIndex는 foodPhotos 길이로 파생 — 도트/사진 순번 표시에 사용.
  const [photoStep, setPhotoStep] = useState(0);
  const photoRotationLock = useRef(false);
  const [isPhotoRotating, setIsPhotoRotating] = useState(false);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const [isSwipeCommitting, setIsSwipeCommitting] = useState(false);
  const swipeCommitRef = useRef(false);
  const controls = useAnimation();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-16, 16]);
  const likeOp = useTransform(x, [12, 82], [0, 1]);
  const nopeOp = useTransform(x, [-82, -12], [1, 0]);
  const neutralOp = useTransform(y, [12, 82], [0, 1]);
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
    ? "No Food Photos Available"
    : `Menu Photos ${photoIndex + 1} / ${foodPhotos.length}`;
  const photoProgressAriaLabel = foodPhotos.length > 0
    ? `All Menu Photos ${foodPhotos.length} photos ·  ${photoIndex + 1}`
    : undefined;

  const commitSwipeWithAnimation = useCallback(async (action: SwipeAction) => {
    if (swipeCommitRef.current) return false;
    swipeCommitRef.current = true;
    setIsSwipeCommitting(true);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(12);
    const exit = lunchieSwipeExit(action);
    await controls.start({ ...exit, transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] } });
    const saved = await onSwipe(action);
    if (!saved) {
      await controls.start({ x: 0, y: 0, transition: { type: 'spring', stiffness: 360, damping: 28 } });
      setIsSwipeCommitting(false);
      swipeCommitRef.current = false;
    }
    return saved;
  }, [controls, onSwipe]);

  const finishSwipeGesture = useCallback(async (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const action = resolveLunchieSwipeGesture({
      offsetX: info.offset.x,
      offsetY: info.offset.y,
      velocityX: info.velocity.x,
      velocityY: info.velocity.y,
    });

    if (!action) {
      await controls.start({ x: 0, y: 0, transition: { type: 'spring', stiffness: 440, damping: 32 } });
      return;
    }

    await commitSwipeWithAnimation(action);
  }, [commitSwipeWithAnimation, controls]);

  useEffect(() => {
    if (!isTop || !requestedSwipe) return;
    void commitSwipeWithAnimation(requestedSwipe.action)
      .finally(() => onRequestedSwipeHandled(requestedSwipe.id));
  }, [commitSwipeWithAnimation, isTop, onRequestedSwipeHandled, requestedSwipe]);

  if (!isTop) {
    return (
      <div
        className="absolute inset-0 rounded-3xl overflow-hidden"
        style={{
          transform: `scale(${1 - stackIndex * 0.04}) translateY(${stackIndex * 14}px)`,
          zIndex: 10 - stackIndex,
          background: stackIndex === 1 ? '#F5F4F5' : '#F5F4F5',
          opacity: 1 - stackIndex * 0.15,
        }}
      />
    );
  }

  return (
    <motion.div
      className="absolute inset-0"
      data-ui="quick-match-swipe-card"
      animate={controls}
      style={{
        x,
        y,
        rotate,
        touchAction: isRevealed ? 'auto' : 'none',
        zIndex: 20,
        // Swipe rotateZ must not flatten the menu flip; keep a 3D containing block.
        transformStyle: 'preserve-3d',
        WebkitTransformStyle: 'preserve-3d',
      }}
      drag={!isRevealed && !interactionDisabled && !isSwipeCommitting}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.62}
      dragMomentum={false}
      onDragEnd={finishSwipeGesture}
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
            aria-label={englishText(`All ${total} options ·  ${progress} restaurant`)}
            className="inline-flex min-h-7 min-w-[64px] items-center justify-center rounded-md bg-black/45 px-3 py-1 text-[13px] font-black tabular-nums text-white shadow-sm backdrop-blur-sm"
          >
            {progress} / {total}
          </span>
        </div>

        {/* Touch hint */}
        {!isRevealed && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="bg-black/30 text-white text-[11px] font-semibold px-3 py-1.5 rounded-full opacity-70">

              Tap to view · ← Dislike · ↓ Neutral · Like →
            </div>
          </div>
        )}

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {englishText((restaurant.tags || []).slice(0, 2).map((t: string) => (
              <span key={t} className="text-[10px] font-bold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
                {englishText(t)}
              </span>
            )))}
          </div>
          <h2 className="text-white font-black text-[24px] leading-tight">{englishText(restaurant.name)}</h2>
          <button
            type="button"
            data-ui="quick-match-detail-trigger"
            aria-label={englishText(`${restaurant.name} View Details`)}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onOpenRestaurantDetails(restaurant);
            }}
            className="mt-2 flex min-h-9 w-full items-center justify-between gap-2 rounded-xl bg-black/25 px-3 py-2 text-left outline-none transition-colors active:bg-black/40 focus-visible:ring-2 focus-visible:ring-white/80"
          >
            <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-white/75">{englishText(detailSummary)}</span>
            <span className="shrink-0 text-[11px] font-black text-white">Details ›</span>
          </button>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
            <div className="flex items-center gap-1">
              <Star size={12} fill="#AA1A0D" color="#AA1A0D" />
              <span className="text-white text-[12px] font-semibold">{englishText(restaurantRatingLabel(restaurant.rating))}</span>
            </div>
            {englishText(restaurant.distance?.trim() && <div className="flex items-center gap-1">
              <MapPin size={11} color="rgba(255,255,255,0.6)" />
              <span className="text-white/70 text-[11px]">{englishText(restaurant.distance)}</span>
            </div>)}
            {englishText(restaurantPriceLabel(restaurant) && <span className="text-white/70 text-[11px]">{englishText(restaurantPriceLabel(restaurant))}</span>)}
            <span className="text-white/60 text-[10px] bg-white/15 px-2 py-0.5 rounded-full">
              {englishText(restaurant.category)}
            </span>
          </div>
        </div>

        {/* LIKE overlay */}
        <motion.div
          className="absolute top-8 left-5 rounded-2xl border-[3px] border-[#16A34A] bg-[#DCFCE7]/90 px-4 py-2"
          style={{ opacity: likeOp, rotate: -12 }}
        >
          <span className="text-[#15803D] font-black text-[18px]">Like ♥</span>
        </motion.div>

        {/* NOPE overlay */}
        <motion.div
          className="absolute top-8 right-5 rounded-2xl border-[3px] border-[#DC2626] bg-[#FEE2E2]/90 px-4 py-2"
          style={{ opacity: nopeOp, rotate: 12 }}
        >
          <span className="text-[#B91C1C] font-black text-[18px]">Dislike ✕</span>
        </motion.div>
        <motion.div
          className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-2xl border-[3px] border-[#EAB308] bg-[#FEF9C3]/90 px-4 py-2"
          style={{ opacity: neutralOp }}
        >
          <span className="whitespace-nowrap text-[#A16207] font-black text-[18px]">Neutral −</span>
        </motion.div>
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{ opacity: likeOp, boxShadow: 'inset 0 0 80px 28px rgba(34,197,94,0.58)' }}
        />
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{ opacity: nopeOp, boxShadow: 'inset 0 0 80px 28px rgba(239,68,68,0.58)' }}
        />
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{ opacity: neutralOp, boxShadow: 'inset 0 0 80px 28px rgba(234,179,8,0.62)' }}
        />
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
                <p className="font-black text-[17px] text-white truncate">{englishText(restaurant.name)}</p>
                <p className="text-[11px] text-white/50 truncate">{englishText(restaurant.category)}  · Browse Menu</p>
              </div>
              <button
                onClick={() => setIsRevealed(false)}
                aria-label="Close Menu"
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
              aria-label={englishText(`${restaurant.name} Restaurant Details`)}
              className="mx-5 mb-2 flex min-h-10 flex-shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-[13px] font-bold text-white outline-none transition-colors active:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <Info size={16} aria-hidden="true" />

              Restaurant Details
            </button>

            {restaurant.menuItems && restaurant.menuItems.length > 0 ? (
              /* 실제 메뉴리스트 — 소스 카테고리 구조로 섹션 나눔, 탭하면 상세 화면 */
              <div className="flex-1 px-5 pb-4 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto -mx-1 px-1">
                  {groupByCategory(restaurant.menuItems).map(([cat, items]) => (
                    <div key={cat} className="mb-1">
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wide pt-3 pb-1.5">{englishText(cat)}</p>
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
                            <p className="text-white text-[13.5px] font-semibold truncate">{englishText(item.name)}</p>
                            {englishText(item.description && (
                              <p className="text-white/45 text-[11px] truncate mt-0.5">{englishText(item.description)}</p>
                            ))}
                            {item.dietary && item.dietary.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {item.dietary.map((d: string) => (
                                  <span key={d} className="text-[9px] font-bold bg-[#AA1A0D]/25 text-[#AA1A0D] px-1.5 py-0.5 rounded-full">
                                    {englishText(d)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-white/90 text-[13px] font-bold flex-shrink-0 tabular-nums">
                            {englishText(item.price != null ? `$${item.price}` : '')}
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
                            aria-label="Previous Photo"
                          />
                          <button
                            className="absolute inset-y-0 right-0 w-1/2"
                            disabled={isPhotoRotating}
                            onClick={(e) => {
                              e.stopPropagation();
                              rotateMenuPhoto(1);
                            }}
                            aria-label="Next Photo"
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
                    aria-label={englishText(photoProgressAriaLabel)}
                    className="font-bold text-[16px] text-white"
                  >
                    {englishText(photoLabel)}
                  </p>
                  <p className="text-[12px] text-white/50 mt-0.5">{englishText(restaurant.description)}</p>
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
    return `${days} days ${remainingHours} hours`;
  }
  if (diffHours >= 1) {
    const remainingMins = diffMins % 60;
    return `${diffHours} hours ${remainingMins} min`;
  }
  const mins = diffMins % 60;
  const secs = diffSecs % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ─── Winner Screen ────────────────────────────────────────────────────────────

export function WinnerScreen({ selectedWinner, onReset, resultSession, savedResult = false }: {
  selectedWinner?: Restaurant | null;
  onReset: () => void;
  resultSession?: GroupSession | null;
  savedResult?: boolean;
}) {
  const [, navigate] = useLocation();
  const { currentSession: activeSession, restaurants, profile, savedLunchPicks, saveLunchPick } = useApp();
  const currentSession = resultSession === undefined ? activeSession : resultSession;
  const { captureCard, downloadImage } = useCourseShare();
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [showShare, setShowShare] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const [satisfaction, setSatisfaction] = useState(70);
  const [satisfactionSubmitted, setSatisfactionSubmitted] = useState(false);
  const [isSubmittingSatisfaction, setIsSubmittingSatisfaction] = useState(false);
  const [mealRating, setMealRating] = useState(0);
  const [mealRatingSubmitted, setMealRatingSubmitted] = useState(false);
  const [isSubmittingMealRating, setIsSubmittingMealRating] = useState(false);
  const lunchmateLoadout = lunchmateLoadoutFromProfile(profile.lunchmateLoadout);
  const winnerEventKeyRef = useRef<string | null>(null);
  const [liveResults, setLiveResults] = useState<{
    results: { restaurantId: string; score: number; likeCount: number; dislikeCount: number; neutralCount?: number }[];
    winnerId?: string | null;
    satisfactionResponseCount?: number;
    satisfactionAverage?: number | null;
    satisfactionBuckets?: { low: number; medium: number; high: number };
    visitedCount?: number;
    mealRatingAverage?: number | null;
    mealRatingDistribution?: Record<1 | 2 | 3 | 4 | 5, number>;
  }>({ results: [], winnerId: null, satisfactionResponseCount: 0, satisfactionAverage: null });

  // Keep both the decision survey and the after-meal visit aggregate current.
  useEffect(() => {
    if (!currentSession) return;

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
  }, [currentSession, satisfactionSubmitted, mealRatingSubmitted]);

  const winnerId = liveResults.winnerId || liveResults.results[0]?.restaurantId;
  const winner = selectedWinner || restaurants.find(r => r.id === winnerId) || currentSession?.restaurants[0];
  const isSoloSession = (currentSession?.members.length ?? 1) <= 1;
  const saved = savedLunchPicks.some(pick => pick.restaurant.id === winner?.id);

  useEffect(() => {
    if (winner && !savedResult) {
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
  }, [winner?.id, savedResult]);

  if (!winner) return <SwipeStateScreen state="loading" />;

  // 실제 사진만. 없으면 이모지 플레이스홀더.
  const foodPhotos = (winner.photos ?? []).slice(0, 4);

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(winner.address);
    toast.success("Address copied! 📋");
  };

  const handleSaveImage = async () => {
    setIsCapturing(true);
    try {
      const dataUrl = await captureCard(shareCardRef);
      await downloadImage(dataUrl, `lunchie-${winner.name}.png`);
      toast.success("Image saved! 🎉");
    } catch (e) {
      console.error('Failed to save share card:', e);
      toast.error("Couldn't save the image");
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
          text: `Today's lunch is  ${winner.name}! 🍽️`,
        });
      } else {
        await downloadImage(dataUrl, `lunchie-${winner.name}.png`);
        toast.success("Image saved. Share it from your gallery! 📤");
      }
    } catch (e) {
      console.error('Failed to share card:', e);
      toast.error("Couldn't share");
    } finally {
      setIsCapturing(false);
    }
  };

  const shareSatisfaction = async () => {
    if (satisfactionSubmitted || isSubmittingSatisfaction) return;
    setIsSubmittingSatisfaction(true);
    try {
      if (currentSession) {
        await persistSessionSwipe({
          id: `satisfaction_${currentSession.id}_${profile.id}`,
          sessionId: currentSession.id,
          userId: profile.id,
          restaurantId: satisfactionSignal(satisfaction),
          round: 1,
          action: 'SYSTEM',
        });
      }
      const action = satisfaction >= 70 ? 'POS' : satisfaction >= 40 ? 'NEU' : 'NEG';
      setSatisfactionSubmitted(true);
      setLiveResults(previous => {
        const previousCount = previous.satisfactionResponseCount ?? 0;
        const previousAverage = previous.satisfactionAverage ?? 0;
        const previousBuckets = previous.satisfactionBuckets ?? { low: 0, medium: 0, high: 0 };
        return {
          ...previous,
          satisfactionResponseCount: previousCount + 1,
          satisfactionAverage: Math.round(((previousAverage * previousCount) + satisfaction) / (previousCount + 1)),
          satisfactionBuckets: {
            low: previousBuckets.low + (satisfaction < 40 ? 1 : 0),
            medium: previousBuckets.medium + (satisfaction >= 40 && satisfaction < 70 ? 1 : 0),
            high: previousBuckets.high + (satisfaction >= 70 ? 1 : 0),
          },
        };
      });
      logEvent({
        event_type: 'SURVEY',
        action,
        user_id: profile.id,
        session_id: currentSession?.id ?? null,
        restaurant_id: winner.id,
        score: satisfaction / 100,
        context: { moment: 'shared_session_reveal', satisfaction_score: satisfaction },
      });
      flushEvents();
      toast.success("Feedback submitted!");
    } catch (error) {
      console.error('만족도 저장 실패', error);
      toast.error("Couldn't save your feedback. Please try again.");
    } finally {
      setIsSubmittingSatisfaction(false);
    }
  };

  const shareMealRating = async () => {
    if (!currentSession || mealRating < 1 || mealRatingSubmitted || isSubmittingMealRating) return;
    setIsSubmittingMealRating(true);
    try {
      await persistSessionSwipe({
        id: `meal_rating_${currentSession.id}_${profile.id}`,
        sessionId: currentSession.id,
        userId: profile.id,
        restaurantId: mealRatingSignal(mealRating),
        round: 1,
        action: 'SYSTEM',
      });
      setMealRatingSubmitted(true);
      setLiveResults(previous => {
        const previousCount = previous.visitedCount ?? 0;
        const previousAverage = previous.mealRatingAverage ?? 0;
        const previousDistribution = previous.mealRatingDistribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        return {
          ...previous,
          visitedCount: previousCount + 1,
          mealRatingAverage: Math.round((((previousAverage * previousCount) + mealRating) / (previousCount + 1)) * 10) / 10,
          mealRatingDistribution: {
            ...previousDistribution,
            [mealRating]: (previousDistribution[mealRating as 1 | 2 | 3 | 4 | 5] ?? 0) + 1,
          },
        };
      });
      logEvent({
        event_type: 'SURVEY',
        action: mealRating >= 4 ? 'POS' : mealRating === 3 ? 'NEU' : 'NEG',
        user_id: profile.id,
        session_id: currentSession.id,
        restaurant_id: winner.id,
        score: mealRating / 5,
        context: { moment: 'after_meal', meal_rating: mealRating, visited: true },
      });
      flushEvents();
      toast.success("Meal rating submitted!");
    } catch (error) {
      console.error('식사 후 별점 저장 실패', error);
      toast.error("Couldn't save your rating. Please try again.");
    } finally {
      setIsSubmittingMealRating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-dvh bg-[#FCFCFC] pb-10"
    >
      {/* Hero */}
      <div className="border-b border-[#E8E6E7] px-5 py-3"><GameStageRail current={4} /></div>
      <div className="relative w-full" style={{ aspectRatio: '16/9', maxHeight: '300px' }}>
        <FoodImage src={winner.image || winner.photos?.[0]} name={winner.name} category={winner.category} className="w-full h-full object-cover" emojiClass="text-[80px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        {savedResult && <BackButton className="absolute left-4 top-4 z-10 bg-white" onClick={() => navigate('/saved')} aria-label="Back to Saved" />}
        <div className="absolute inset-x-0 bottom-0 px-5 pb-5 text-center">
          <span className="inline-block text-[11px] font-semibold text-white bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 mb-1.5">
            {englishText(isSoloSession ? '🏆 SOLO WINNER!' : "Today's Lunch Pick!")}
          </span>
          <h1 className="break-words text-white font-bold text-[24px] leading-tight">{englishText(winner.name)}</h1>
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="space-y-4">

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-[#FBECE9] rounded-full px-2.5 py-1">
              <Star size={12} fill="#AA1A0D" color="#AA1A0D" />
              <span className="text-[12px] font-bold text-[#AA1A0D]">{englishText(restaurantRatingLabel(winner.rating))}</span>
            </div>
            {englishText(winner.distance?.trim() && <span className="flex items-center gap-1 text-[12px] font-bold text-[#AA1A0D] bg-[#FBECE9] rounded-full px-2.5 py-1">
              <MapPin size={12} aria-hidden="true" /> {englishText(winner.distance)}
            </span>)}
            {englishText(restaurantPriceLabel(winner) && <span className="text-[12px] font-bold text-[#AA1A0D] bg-[#FBECE9] rounded-full px-2.5 py-1">
              {englishText(restaurantPriceLabel(winner))}
            </span>)}
            <span className="text-[12px] font-bold text-[#AA1A0D] bg-[#FBECE9] rounded-full px-2.5 py-1">
              {englishText(winner.category)}
            </span>
          </div>

          {/* Address */}
          <div className="flex items-start gap-1.5">
            <MapPin size={14} className="text-[#9B9B9B] mt-0.5 flex-shrink-0" />
            <p className="text-[13px] text-[#565256]">{englishText(winner.address)}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => toast.info("Reservations are coming soon.")}
              className="min-w-0 flex-1 min-h-11 py-3 rounded-lg font-bold text-[13px] flex items-center justify-center gap-1.5 border border-[#E8E6E7] text-[#565256] active:scale-[0.98] transition-all"
            >
              <Phone size={15} />  Reserve
            </button>
            <button
              onClick={() => { logNavigate(winner.id, { user_id: profile.id, session_id: currentSession?.id ?? null }); navigate(`/lunchie/map?id=${winner.id}`); }}
              className="min-w-0 flex-1 min-h-11 py-3 rounded-lg font-bold text-[13px] flex items-center justify-center gap-1.5 border border-[#E8E6E7] bg-white text-[#565256] active:scale-[0.98] transition-all"
            >
              <Navigation size={15} />  Directions
            </button>
          </div>

          {/* 저장(강한 취향 신호 COURSE_SAVE) · 다시 고르기(REROLL) */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (saved) { navigate('/saved'); return; }
                try {
                  saveLunchPick(winner, currentSession ?? null);
                  logEvent({ event_type: 'COURSE_SAVE', user_id: profile.id, session_id: currentSession?.id ?? null, restaurant_id: winner.id });
                  toast.success("Added to your Lunchie picks.");
                } catch {
                  toast.error("Couldn't save your Lunchie pick. Please try again.");
                }
              }}
              className="min-w-0 flex-1 min-h-11 py-3 rounded-lg font-bold text-[13px] flex items-center justify-center gap-1.5 border active:scale-[0.98] transition-all"
              style={{ borderColor: '#AA1A0D', color: saved ? '#AA1A0D' : 'white', background: saved ? '#FBECE9' : '#AA1A0D' }}
            >
              <Bookmark size={15} fill={saved ? '#AA1A0D' : 'none'} /> {englishText(saved ? "Lunchie Pick Saved" : "Save Lunchie Pick")}
            </button>
            <button
              onClick={onReset}
              className="min-w-0 flex-1 min-h-11 py-3 rounded-lg font-bold text-[13px] flex items-center justify-center gap-1.5 border border-[#E8E6E7] text-[#565256] active:scale-[0.98] transition-all"
            >
              <RotateCcw size={15} />  Choose Again
            </button>
          </div>

          {/* Tags */}
          <div className="flex gap-1.5 flex-wrap">
            {winner.tags.map(tag => (
              <span key={tag} className="tag tag-hash">#{englishText(tag)}</span>
            ))}
          </div>

          {/* Description */}
          <p className="text-[13px] text-[#565256] leading-relaxed">{englishText(winner.description)}</p>

          {/* Menu — 실제 메뉴리스트(소스 카테고리 구조) 있으면 우선, 없으면 사진 그리드 폴백 */}
          {winner.menuItems && winner.menuItems.length > 0 ? (
            <div>
              <p className="text-[12px] font-bold text-[#9B9B9B] mb-2">Menu ({winner.menuItems.length})</p>
              <div className="max-h-[320px] overflow-y-auto rounded-2xl border border-[#E8E6E7]">
                {groupByCategory(winner.menuItems).map(([cat, items]) => (
                  <div key={cat}>
                    <p className="text-[10px] font-bold text-[#BDBABD] uppercase tracking-wide px-3 pt-3 pb-1 bg-[#F5F4F5]">{englishText(cat)}</p>
                    {items.map((item, i) => (
                      <div
                        key={i}
                        className="w-full flex items-center gap-3 px-3 py-2.5 border-b border-[#E8E6E7] last:border-b-0 text-left"
                      >
                        {item.image ? (
                          <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-[#F5F4F5]" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[#F5F4F5] flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-[#2A2A2A] truncate">{englishText(item.name)}</p>
                          {englishText(item.description && (
                            <p className="text-[11px] text-[#9B9B9B] truncate mt-0.5">{englishText(item.description)}</p>
                          ))}
                          {item.dietary && item.dietary.length > 0 && (
                            <div className="flex gap-1 mt-0.5 flex-wrap">
                              {item.dietary.map((d) => (
                                <span key={d} className="text-[9px] font-bold bg-[#FBECE9] text-[#AA1A0D] px-1.5 py-0.5 rounded-full">{englishText(d)}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-[12.5px] font-bold text-[#565256] flex-shrink-0 tabular-nums">
                          {englishText(item.price != null ? `$${item.price}` : '')}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[12px] font-bold text-[#9B9B9B] mb-2">Menu Photos</p>
              <div className="grid grid-cols-4 gap-2">
                {foodPhotos.map((url, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden bg-[#F5F4F5]">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-[#E8E6E7] py-6 text-center text-[#171717]" aria-labelledby="result-satisfaction-title">
            <div className="mx-auto flex size-9 items-center justify-center rounded-xl bg-white text-[#171717]">
              <MessageCircleHeart size={19} aria-hidden="true" />
            </div>
            <p id="result-satisfaction-title" className="mt-2 text-[16px] font-semibold">How happy are you with this choice?</p>
            <p className="mt-0.5 text-[10px] font-semibold text-[#858185]">Your score stays private.</p>
            <div className="mt-4 px-1 py-4">
              <div className="flex items-center justify-between text-[10px] font-semibold text-[#858185]">
                <span>Not Quite</span>
                <output htmlFor="lunchie-satisfaction" className="rounded-full bg-[#FBECE9] px-2.5 py-1 text-[13px] font-semibold text-[#80140A]">{satisfaction}%</output>
                <span>Love It</span>
              </div>
              <input
                id="lunchie-satisfaction"
                type="range"
                min="0"
                max="100"
                step="5"
                value={satisfaction}
                onChange={event => setSatisfaction(Number(event.target.value))}
                disabled={satisfactionSubmitted}
                aria-label="Choice Satisfaction"
                className="mt-4 w-full accent-[#AA1A0D]"
              />
            </div>
            <button
              type="button"
              onClick={shareSatisfaction}
              disabled={satisfactionSubmitted || isSubmittingSatisfaction}
              className="mt-3 min-h-11 w-full rounded-lg bg-[#AA1A0D] px-4 text-[12px] font-semibold text-white active:bg-[#80140A] disabled:bg-[#E8E6E7] disabled:text-[#858185]"
            >
              {englishText(satisfactionSubmitted ? "Feedback Submitted ✓" : isSubmittingSatisfaction ? "Calculating…" : "Submit Feedback")}
            </button>
            {satisfactionSubmitted && <p className="mt-2 text-[10px] font-bold text-[#AA1A0D]" role="status">Your feedback helps with future recommendations.</p>}
            {satisfactionSubmitted && (
              <div className="mt-4 border-t border-[#E8E6E7] pt-4 text-left" aria-label="Round 4 Results">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-semibold tracking-[0.7px] text-[#AA1A0D]">ROUND 4 RESULT</p>
                    <p className="mt-1 text-[12px] font-semibold">Average Satisfaction</p>
                  </div>
                  <p className="text-[30px] font-semibold text-[#AA1A0D]">{liveResults.satisfactionAverage ?? satisfaction}<span className="text-sm">%</span></p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[9px] font-semibold">
                  <div className="rounded-xl bg-white/10 px-1 py-2"><span className="block text-lg">{liveResults.satisfactionBuckets?.low ?? (satisfaction < 40 ? 1 : 0)}</span>Disappointed</div>
                  <div className="rounded-xl bg-white/10 px-1 py-2"><span className="block text-lg">{liveResults.satisfactionBuckets?.medium ?? (satisfaction >= 40 && satisfaction < 70 ? 1 : 0)}</span>Okay</div>
                  <div className="rounded-xl bg-white/10 px-1 py-2"><span className="block text-lg">{liveResults.satisfactionBuckets?.high ?? (satisfaction >= 70 ? 1 : 0)}</span>Happy</div>
                </div>
                <p className="mt-3 text-center text-[9px] font-bold text-[#858185]">Anonymous responses {Math.max(1, liveResults.satisfactionResponseCount ?? 0)} people</p>
              </div>
            )}
          </div>

          <div className="border-t border-[#E8E6E7] py-6 text-center" aria-labelledby="after-meal-rating-title">
            <span className="inline-flex rounded-full bg-[#FBECE9] px-3 py-1 text-[9px] font-semibold tracking-[0.7px] text-[#AA1A0D]">AFTER THE MEAL</span>
            <p id="after-meal-rating-title" className="mt-3 text-[17px] font-semibold text-[#171717]">Have you visited?</p>
            <p className="mt-1 text-[11px] font-semibold leading-relaxed text-[#858185]">Rate your actual meal separately from your satisfaction with the choice.</p>

            <div className="mt-4 flex justify-center gap-1.5" role="group" aria-label="Rate Your Meal">
              {([1, 2, 3, 4, 5] as const).map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setMealRating(star)}
                  disabled={mealRatingSubmitted}
                  aria-label={englishText(`${star} points`)}
                  aria-pressed={mealRating === star}
                  className="rounded-xl p-1 outline-none focus-visible:ring-4 focus-visible:ring-[#AA1A0D]/25 disabled:cursor-default"
                >
                  <Star
                    size={34}
                    fill={star <= mealRating ? '#AA1A0D' : 'transparent'}
                    color={star <= mealRating ? '#AA1A0D' : '#BDBABD'}
                    strokeWidth={2.4}
                  />
                </button>
              ))}
            </div>
            <p className="mt-1 min-h-5 text-[11px] font-semibold text-[#AA1A0D]">
              {englishText(mealRating > 0 ? `${mealRating} stars · visited` : "Choose a star rating after your visit")}
            </p>
            <button
              type="button"
              onClick={shareMealRating}
              disabled={mealRating < 1 || mealRatingSubmitted || isSubmittingMealRating}
              className="mt-3 min-h-11 w-full rounded-lg bg-[#AA1A0D] px-4 text-[12px] font-semibold text-white disabled:bg-[#F5F4F5] disabled:text-[#BDBABD]"
            >
              {englishText(mealRatingSubmitted ? "Meal Rating Submitted ✓" : isSubmittingMealRating ? "Calculating ratings…" : "I've Visited · Submit Rating")}
            </button>

            <div className="mt-4 border-t border-[#E8E6E7] pt-4 text-left" aria-label="Meal Rating Results">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[9px] font-semibold tracking-[0.7px] text-[#AA1A0D]">VISIT STATISTICS</p>
                  <p className="mt-1 text-[13px] font-semibold text-[#171717]">{liveResults.visitedCount ?? 0} people visited</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-[#858185]">Average meal rating</p>
                  <p className="text-[26px] font-semibold text-[#AA1A0D]">{englishText(liveResults.mealRatingAverage ?? '—')}<span className="text-xs"> / 5</span></p>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {([5, 4, 3, 2, 1] as const).map(star => {
                  const count = liveResults.mealRatingDistribution?.[star] ?? 0;
                  const totalRatings = Math.max(1, liveResults.visitedCount ?? 0);
                  return (
                    <div key={star} className="flex items-center gap-2 text-[9px] font-semibold text-[#858185]">
                      <span className="w-6">{star}★</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F5F4F5]">
                        <motion.div
                          className="h-full rounded-full bg-[#AA1A0D]"
                          animate={{ width: `${(count / totalRatings) * 100}%` }}
                        />
                      </div>
                      <span className="w-4 text-right tabular-nums">{count}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-center text-[9px] font-bold text-[#858185]">Individual ratings stay private. Only anonymous totals are shown.</p>
            </div>
          </div>

          <div className="mt-3 rounded-xl px-3 py-2.5 text-[12px] leading-relaxed"
               style={{ background: '#FBECE9', color: '#565256' }}>

            🌱 After your meal —  <b>Coffee & Dessert</b> are nearby too.
            <br /><b>Quick Match</b>: choose coffee or dessert to explore again.
          </div>

          {/* Share Card Button */}
          <button
            onClick={() => setShowShare(true)}
            className="w-full min-h-11 py-3 rounded-lg border border-[#E8E6E7] bg-white font-semibold text-[#565256] text-[13px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <Share2 size={16} />  Create Share Card
          </button>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="px-5 mt-3 flex gap-2">
        <button
          onClick={handleCopyAddress}
          className="flex-1 py-3 rounded-2xl font-bold text-[13px] flex items-center justify-center gap-1.5 bg-white border border-[#E8E6E7] text-[#565256] active:scale-[0.98] transition-all"
        >
          <Link2 size={14} />  Copy Address
        </button>
        <button
          onClick={() => navigate('/lunchie/settings')}
          className="flex-1 py-3 rounded-2xl font-bold text-[13px] flex items-center justify-center gap-1.5 bg-white border border-[#E8E6E7] text-[#565256] active:scale-[0.98] transition-all"
        >
          <Home size={14} />  Quick Match
        </button>
      </div>

      {/* Share Overlay */}
      <AnimatePresence>
        {showShare && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#FCFCFC]/95 backdrop-blur-sm flex flex-col items-center justify-center px-6 py-10 overflow-y-auto"
          >
            <WinnerShareCard ref={shareCardRef} restaurant={winner} loadout={lunchmateLoadout} participants={currentSession?.members ?? []} />

            <div className="flex gap-3 mt-6 w-full max-w-[300px]">
              <button
                onClick={handleSaveImage}
                disabled={isCapturing}
                className="flex-1 py-3.5 rounded-2xl border border-[#ECC1BB] font-bold text-[14px] flex items-center justify-center gap-1.5 bg-white text-[#565256] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Download size={16} />  Save
              </button>
              <button
                onClick={handleShareImage}
                disabled={isCapturing}
                className="flex-1 py-3.5 rounded-2xl font-bold text-[14px] flex items-center justify-center gap-1.5 text-white active:scale-[0.98] transition-all disabled:opacity-50"
                style={{ background: '#AA1A0D' }}
              >
                <Share2 size={16} />  Share Image
              </button>
            </div>

            <button
              onClick={() => setShowShare(false)}
              className="mt-5 text-[#858185] text-[13px] font-semibold active:scale-95"
            >

              Close
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
  isSubmitting = false,
}: {
  finalist1: any;
  finalist2: any | null;
  onContinue: (winner?: any) => void;
  onRejectBoth?: () => void;
  logSelection?: boolean;
  isSubmitting?: boolean;
}) {
  const finalActionSizeClass = 'flex w-full items-center justify-center rounded-2xl py-4 text-[15px] font-bold';
  const [selected, setSelected] = useState<1 | 2 | null>(null);
  const { currentSession, profile } = useApp();
  const isSoloSession = (currentSession?.members.length ?? 1) <= 1;
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
        className={`min-h-dvh flex flex-col ${isSoloSession ? 'bg-[#FCFCFC]' : 'bg-[#FCFCFC]'}`}
      >
        <div className="border-b border-[#E8E6E7] bg-[#F5F4F5] px-5 pb-3 pt-[max(14px,env(safe-area-inset-top))]">
          <GameStageRail current={3} />
        </div>
        <div className="px-5 pt-12 pb-4 text-center">
          {isSoloSession && <span className="rounded-full bg-[#AA1A0D] px-3 py-1 text-[10px] font-black tracking-[0.8px] text-white">SOLO FINAL</span>}
          <p className="mt-3 font-black text-[#171717] text-[22px]">{englishText(isSoloSession ? "Last Contender! 🏆" : "How About This Place? 🤔")}</p>
          <p className="mt-1 text-[13px] text-[#858185]">Your last liked option · get new recommendations if it isn't right</p>
        </div>
        <div className="flex-1 flex items-center justify-center px-5">
          <div className="w-full max-w-[360px] rounded-3xl overflow-hidden relative" style={{ aspectRatio: '4/5' }}>
            <FoodImage src={finalist1.image || finalist1.photos?.[0]} name={finalist1.name} category={finalist1.category} className="w-full h-full object-cover" emojiClass="text-[88px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5">
              <span className="inline-block bg-[#AA1A0D] text-[#1A1A1A] text-[11px] font-black px-3 py-1 rounded-full mb-2">🏆 Only Contender</span>
              <p className="text-white font-black text-[22px] leading-tight">{englishText(finalist1.name)}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Star size={13} fill="#AA1A0D" color="#AA1A0D" />
                <span className="text-white/85 text-[13px]">{englishText(finalist1.rating)}</span>
                <span className="text-white/60 text-[12px]">{englishText(finalist1.distance)}</span>
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
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className={`${finalActionSizeClass} text-white active:scale-[0.98] shadow-xl transition-opacity disabled:opacity-50`}
            style={{ background: '#AA1A0D' }}
          >
            {englishText(isSubmitting ? "Saving final choice…" : "Choose This Restaurant!")}
          </button>
          {onRejectBoth && (
            <button
              onClick={onRejectBoth}
              disabled={isSubmitting}
              className={`${finalActionSizeClass} mt-2.5 border border-[#ECC1BB] bg-white text-[#565256] active:scale-[0.98] transition-all disabled:opacity-50`}
            >

              Not for Me · Get New Options
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
      className={`min-h-dvh flex flex-col ${isSoloSession ? 'bg-[#FCFCFC]' : 'bg-[#FCFCFC]'}`}
    >
      <div className="border-b border-[#E8E6E7] bg-[#F5F4F5] px-5 pb-3 pt-[max(14px,env(safe-area-inset-top))]">
        <GameStageRail current={3} />
      </div>
      {/* Header */}
      <div className="px-5 pt-12 pb-4 text-center">
        {isSoloSession && <span className="rounded-full bg-[#AA1A0D] px-3 py-1 text-[10px] font-black tracking-[0.8px] text-white">SOLO SHOWDOWN</span>}
        <p className="mt-3 font-black text-[#171717] text-[22px]">{englishText(isSoloSession ? "My Final Showdown 🏆" : "Final Showdown 🏆")}</p>
        <p className="mt-1 text-[13px] text-[#858185]">{englishText(isSoloSession ? "My Top 2 · choose the winner" : "Our Top 2 · choose your favorite")}</p>
      </div>

      {/* Diagonal split layout */}
      <div className="flex-1 relative overflow-hidden">
        {/* tl_branch: 선택하면 삼각형이 전체화면으로 펼쳐지고, 다시 누르면 반반 구도로 복귀 */}
        <motion.button
          onClick={() => setSelected(previous => (previous === 1 ? null : 1))}
          disabled={isSubmitting}
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
              animate={{ boxShadow: 'inset 0 0 0 4px #AA1A0D' }}
              transition={{ delay: 0.3, duration: 0.25 }}
            />
          )}
          <div className="absolute top-6 left-5 right-20 text-left">
            {selected === 1 && (
              <span className="inline-block bg-[#AA1A0D] text-white text-[11px] font-black px-3 py-1 rounded-full mb-2">

                ✓ Selected
              </span>
            )}
            <p className="text-white font-black text-[19px] leading-tight">{englishText(finalist1.name)}</p>
            <div className="flex items-center gap-2 mt-1">
              <Star size={12} fill="#AA1A0D" color="#AA1A0D" />
              <span className="text-white/85 text-[12px]">{englishText(finalist1.rating)}</span>
              <span className="text-white/60 text-[11px]">{englishText(finalist1.distance)}</span>
            </div>
            {selected === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.35 }}
                className="mt-3 max-w-[80%]"
              >
                <p className="text-white/75 text-[12px] leading-relaxed">{englishText(finalist1.description)}</p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {englishText((finalist1.tags || []).slice(0, 3).map((tag: string) => (
                    <span key={tag} className="text-[10px] font-bold bg-white/20 text-white px-2.5 py-1 rounded-full">{englishText(tag)}</span>
                  )))}
                </div>
              </motion.div>
            )}
          </div>
        </motion.button>

        <motion.button
          onClick={() => setSelected(previous => (previous === 2 ? null : 2))}
          disabled={isSubmitting}
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
              animate={{ boxShadow: 'inset 0 0 0 4px #AA1A0D' }}
              transition={{ delay: 0.3, duration: 0.25 }}
            />
          )}
          <div className="absolute bottom-6 right-5 left-20 text-right">
            {selected === 2 && (
              <span className="inline-block bg-[#AA1A0D] text-white text-[11px] font-black px-3 py-1 rounded-full mb-2">

                ✓ Selected
              </span>
            )}
            <p className="text-white font-black text-[19px] leading-tight">{englishText(finalist2.name)}</p>
            <div className="flex items-center gap-2 mt-1 justify-end">
              <Star size={12} fill="#AA1A0D" color="#AA1A0D" />
              <span className="text-white/85 text-[12px]">{englishText(finalist2.rating)}</span>
              <span className="text-white/60 text-[11px]">{englishText(finalist2.distance)}</span>
            </div>
            {selected === 2 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.35 }}
                className="mt-3 max-w-[80%] ml-auto"
              >
                <p className="text-white/75 text-[12px] leading-relaxed">{englishText(finalist2.description)}</p>
                <div className="flex gap-1.5 mt-2 flex-wrap justify-end">
                  {englishText((finalist2.tags || []).slice(0, 3).map((tag: string) => (
                    <span key={tag} className="text-[10px] font-bold bg-white/20 text-white px-2.5 py-1 rounded-full">{englishText(tag)}</span>
                  )))}
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
          <div className={`w-14 h-14 rounded-full border-[3px] border-white flex items-center justify-center shadow-2xl bg-[#AA1A0D]`}>
            <span className="font-black text-white text-[15px]">{englishText(isSoloSession ? 'VS' : "Showdown")}</span>
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
          disabled={selected === null || isSubmitting}
          aria-busy={isSubmitting}
          className={`${finalActionSizeClass} text-white active:scale-[0.98] shadow-xl transition-opacity disabled:opacity-40`}
          style={{ background: '#AA1A0D' }}
        >
          {englishText(isSubmitting ? "Saving final choice…" : selected === null ? "Choose a Restaurant" : "Choose This Restaurant!")}
        </button>
        {onRejectBoth && (
          <button
            onClick={onRejectBoth}
            disabled={isSubmitting}
            className={`${finalActionSizeClass} mt-2.5 border border-[#ECC1BB] bg-white text-[#565256] active:scale-[0.98] transition-all disabled:opacity-50`}
          >

            Neither Works!
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
  const REJECT = '__reject__';
  const [liveResults, setLiveResults] = useState<{
    completedCount: number;
    totalMembers: number;
    memberCompletion: { id: string; name: string; emoji: string; completed: boolean; swipeCount: number; targetCount: number }[];
    results: { restaurantId: string; score: number; likeCount: number; dislikeCount: number; neutralCount?: number }[];
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
  const [prelimStatsAcknowledged, setPrelimStatsAcknowledged] = useState(false);

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
      toast.error("Couldn't save your final choice. Please try again.");
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
  const prelimLikeCount = liveResults.results.reduce((sum, result) => sum + result.likeCount, 0);
  const prelimDislikeCount = liveResults.results.reduce((sum, result) => sum + result.dislikeCount, 0);
  const prelimNeutralCount = liveResults.results.reduce((sum, result) => sum + (result.neutralCount ?? 0), 0);
  const prelimAnswerCount = Math.max(1, prelimLikeCount + prelimDislikeCount + prelimNeutralCount);

  // NO_CONSENSUS → 합의 실패 안내 (reroll 상한 초과)
  if (phase === 'NO_CONSENSUS') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="min-h-dvh flex flex-col justify-between px-5 py-8"
        style={{ background: '#FCFCFC' }}>
        <div className="flex-1 flex flex-col justify-center text-center">
          <div className="text-6xl mb-3">🤷</div>
          <h2 className="text-[#171717] font-bold text-[24px] mb-2">We Couldn't Agree</h2>
          <p className="text-[#858185] text-[13px] leading-relaxed">We tried several options but couldn't find a place everyone liked.<br />Try another neighborhood or come back later.</p>
        </div>
        <button onClick={() => navigate('/')}
          className="w-full max-w-[340px] py-4 rounded-2xl font-bold text-[#565256] text-[15px] bg-white active:scale-[0.98] transition-all shadow-md mx-auto block">Home</button>
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
          style={{ background: '#FCFCFC' }}>
          <div className="flex-1 flex flex-col justify-center text-center">
            <div className="text-6xl mb-3">🤔</div>
            <h2 className="text-[#171717] font-bold text-[24px] mb-2">Neither Round Worked Out</h2>
            <p className="text-[#858185] text-[13px] leading-relaxed">One more round will be the last attempt.<br />You can also start again from scratch.</p>
          </div>
          <div className="space-y-2">
            <button onClick={() => onReroll(liveResults.excludeIds ?? [])}
              className="w-full max-w-[340px] py-4 rounded-2xl font-bold text-white text-[15px] bg-[#AA1A0D] active:scale-[0.98] transition-all shadow-md mx-auto block">One Last Try →</button>
            <button onClick={() => navigate('/')}
              className="w-full max-w-[340px] py-4 rounded-lg border border-[#E8E6E7] font-semibold text-[#565256] text-[14px] bg-white active:scale-[0.98] transition-all mx-auto block">Start Over</button>
          </div>
        </motion.div>
      );
    }
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="min-h-dvh flex flex-col justify-between px-5 py-8"
        style={{ background: '#FCFCFC' }}>
        <div className="flex-1 flex flex-col justify-center text-center">
          <div className="text-6xl mb-3">🔄</div>
          <h2 className="text-[#171717] font-bold text-[24px] mb-2">Let's Try Other Places</h2>
          <p className="text-[#858185] text-[13px] leading-relaxed">Most people chose neither option.<br />We've brought new places, excluding the previous options.</p>
        </div>
        <button onClick={() => onReroll(liveResults.excludeIds ?? [])}
          className="w-full max-w-[340px] py-4 rounded-2xl font-bold text-white text-[15px] bg-[#AA1A0D] active:scale-[0.98] transition-all shadow-md mx-auto block">Choose Again →</button>
      </motion.div>
    );
  }

  if ((phase === 'FINAL' || phase === 'DONE') && !prelimStatsAcknowledged) {
    return (
      <RoundStatisticsScreen
        round={2}
        eyebrow="ROUND 2 RESULT"
        title="Group Recommendation Results"
        description="Individual choices stay private. Only total responses are shown."
        items={[
          { id: 'like', label: "Recommend", value: prelimLikeCount, color: '#AA1A0D', emoji: '♥' },
          { id: 'dislike', label: "Not Recommended", value: prelimDislikeCount, color: '#ECC1BB', emoji: '✕' },
          { id: 'neutral', label: "Neutral", value: prelimNeutralCount, color: '#858185', emoji: '-' },
        ]}
        completed={liveResults.completedCount}
        total={prelimAnswerCount}
        onContinue={() => setPrelimStatsAcknowledged(true)}
        continueLabel={phase === 'FINAL' ? "View Top 2 →" : "View Final Results →"}
        summaryLabel={`Total:  ${prelimAnswerCount} ratings`}
      />
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
        isSubmitting={isVoting}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-dvh flex flex-col justify-between px-5 py-8"
      style={{ background: '#FCFCFC' }}
    >
      <div className="flex-1 flex flex-col justify-center text-center">
        {isAllCompleted ? (
          // Decided state (Everyone finished!)
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="space-y-6 animate-fade-in"
          >
            <div>
              <h2 className="mb-1 text-[28px] font-black text-[#171717]">It's Decided!</h2>
              <p className="text-[13px] font-semibold text-[#858185]">Everyone has finished voting</p>
            </div>

            <div className="mx-auto w-full max-w-[340px] rounded-3xl bg-[#AA1A0D] p-5 text-left text-white shadow-[0_14px_40px_rgba(218,80,83,0.18)]" aria-label="Round 3 Results">
              <p className="text-[10px] font-black tracking-[0.8px] text-[#FBECE9]">ROUND 3 RESULT</p>
              <p className="mt-1 text-[18px] font-black">Top 2 Final Votes</p>
              <div className="mt-4 space-y-3">
                {(finalistRs.length ? finalistRs : winner ? [winner] : []).map(restaurant => {
                  const votes = liveResults.finalTally?.[restaurant.id]
                    ?? (restaurant.id === liveResults.winnerId ? displayedTotal : 0);
                  const percent = Math.round((votes / Math.max(1, liveResults.finalVotedCount ?? displayedTotal)) * 100);
                  return (
                    <div key={restaurant.id}>
                      <div className="flex items-center justify-between gap-2 text-[12px] font-black">
                        <span className="truncate">{englishText(restaurant.id === liveResults.winnerId ? '🏆 ' : '')}{englishText(restaurant.name)}</span>
                        <span className="text-[#FBECE9]">{votes} votes ·  {percent}%</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/20">
                        <div className="h-full rounded-full bg-[#FBECE9]" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
                {(liveResults.finalTally?.[REJECT] ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-[11px] font-bold text-white/65">
                    <span>Neither</span><span>{liveResults.finalTally?.[REJECT]} votes</span>
                  </div>
                )}
              </div>
              <p className="mt-3 text-center text-[9px] font-bold text-white/45">Anonymous totals · individual choices stay private</p>
            </div>
            
            {winner && (
              <div className="mx-auto max-w-[340px] space-y-3 rounded-3xl border border-[#E8E6E7] bg-white p-5 text-center shadow-[0_14px_40px_rgba(102,68,54,0.1)]">
                <div className="mx-auto size-20 overflow-hidden rounded-full border-2 border-[#E8E6E7] bg-[#FBECE9]">
                  <FoodImage
                    src={winner.image || winner.photos?.[0]}
                    name={winner.name}
                    category={winner.category}
                    className="h-full w-full object-cover"
                    emojiClass="text-[34px]"
                  />
                </div>
                <div>
                  <span className="rounded-full bg-[#FBECE9] px-2 py-0.5 text-[10px] font-bold text-[#AA1A0D]">{englishText(winner.category)}</span>
                  <p className="mt-1 text-[18px] font-black text-[#171717]">{englishText(winner.name)}</p>
                  <p className="mt-0.5 truncate text-[11px] text-[#858185]">{englishText(winner.address)}</p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-1 text-[11px] text-[#858185]">
                  <span>⭐ {englishText(restaurantRatingLabel(winner.rating))}</span>
                  {englishText(winner.distance?.trim() && <span>📍 {englishText(winner.distance)}</span>)}
                  {englishText(restaurantPriceLabel(winner) && <span>{englishText(restaurantPriceLabel(winner))}</span>)}
                </div>
              </div>
            )}
            
            <button onClick={() => onContinue(winner)}
              className="mx-auto block w-full max-w-[340px] rounded-2xl bg-[#AA1A0D] py-4 text-[15px] font-bold text-white shadow-md transition-all active:scale-[0.98]">

              See Results 🎉
            </button>
          </motion.div>
        ) : (
          // Waiting state (Others still voting)
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative mx-auto w-full max-w-[360px]"
          >
            <span className="inline-flex rounded-full bg-[#FBECE9] px-3 py-1 text-[10px] font-black tracking-[0.7px] text-[#AA1A0D]">
              {englishText(phase === 'FINAL' ? 'FINAL CHOICE' : 'ANSWERS LOCKED')}
            </span>
            <h2 className="mt-3 text-[24px] font-black tracking-[-0.7px] text-[#171717]">

              Your Choice Is Locked!
            </h2>
            <p className="mt-1 text-[12px] font-semibold text-[#858185]">

              Everyone else's choices stay private. Once everyone finishes,  {englishText(phase === 'FINAL' ? "the final results " : "the finalists ")}  will appear together.
            </p>

            <div className="mt-4 flex items-center justify-center gap-2" aria-label="Fair Choices">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FBECE9] px-2.5 py-1 text-[9px] font-black text-[#AA1A0D]"><LockKeyhole size={11} />  Independent Choices</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FBECE9] px-2.5 py-1 text-[9px] font-black text-[#AA1A0D]"><Users size={11} />  Shared Reveal</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FBECE9] px-2.5 py-1 text-[9px] font-black text-[#565256]"><Sparkles size={11} />  Everyone Counts</span>
            </div>

            <div
              className="mt-6 rounded-[26px] border border-[#E8E6E7] bg-white p-5 text-left shadow-[0_14px_40px_rgba(102,68,54,0.08)]"
              aria-label={englishText(`${displayedCompleted}/${displayedTotal} people ${phase === 'FINAL' ? "Vote Complete" : "Choice Complete"}`)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-black text-[#858185]">{englishText(phase === 'FINAL' ? "Final Vote Progress" : "Preliminary Vote Progress")}</p>
                  <p className="mt-1 text-[28px] font-black tracking-[-1px] text-[#171717]">
                    {displayedCompleted}<span className="mx-1 text-[16px] text-[#BDBABD]">/</span>{displayedTotal}
                    <span className="ml-1.5 text-[12px] font-bold text-[#858185]"> people {englishText(phase === 'FINAL' ? "Vote" : "Complete")}</span>
                  </p>
                </div>
                {englishText(timeLeft && (
                  <div className="rounded-xl bg-[#FBECE9] px-3 py-2 text-right">
                    <p className="text-[9px] font-bold text-[#858185]">Time Left</p>
                    <p className="font-mono text-[14px] font-black tabular-nums text-[#AA1A0D]">{englishText(timeLeft)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[#F5F4F5]">
                <motion.div
                  className="h-full rounded-full bg-[#AA1A0D]"
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercent}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              {resultsConnection === 'offline' && (
                <p className="mt-3 rounded-xl bg-[#FBECE9] px-3 py-2 text-[10px] font-bold text-[#565256]" role="status">

                  Reconnecting. Your completion signal will retry automatically.
                </p>
              )}
            </div>

            <div className="mt-3 rounded-2xl border border-[#ECC1BB] bg-[#FCFCFC] px-4 py-3 text-center">
              <p className="text-[11px] font-black text-[#AA1A0D]">🔒 Individual choices stay private</p>
              <p className="mt-1 text-[10px] font-semibold text-[#858185]">We don't reveal who chose what or how many cards they selected.</p>
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
          className="mb-3 mx-auto block w-full max-w-[340px] rounded-2xl border border-[#ECC1BB] bg-white py-3 text-[13px] font-black text-[#AA1A0D] shadow-sm transition-all active:scale-[0.98]">

          Continue Now · Host
        </button>
      )}

      <button onClick={() => navigate('/')}
        className="mx-auto mt-1 block text-center text-[12px] font-bold text-[#858185] active:scale-95">

        Home
      </button>
    </motion.div>
  );
}

// ─── Main Quick Match Page ────────────────────────────────────────────────────

type Phase = 'swipe' | 'decided' | 'final-stats' | 'results';

function parseSavedCuisineChoices(value: string | null): LunchieCuisineChoice[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((choice): choice is LunchieCuisineChoice =>
        LUNCHIE_CUISINE_CHOICES.some(option => option.id === choice));
    }
  } catch { /* 기존 단일 선택 문자열과 호환 */ }
  return LUNCHIE_CUISINE_CHOICES.some(choice => choice.id === value)
    ? [value as LunchieCuisineChoice]
    : [];
}

function QuickMatchExperience() {
  const [, navigate] = useLocation();
  const { currentSession, addSwipe, swipeRecords, profile, rerollSession } = useApp();
  const [phase, setPhase] = useState<Phase>('swipe');
  const sessionRestaurants = currentSession?.restaurants || [];
  const cuisineStorageKey = `lm_lunchie_cuisine:${currentSession?.id ?? 'none'}:${profile.id}`;
  const cuisineStatsSeenKey = `${cuisineStorageKey}:stats_seen`;
  const [cuisineChoices, setCuisineChoices] = useState<LunchieCuisineChoice[]>(
    () => parseSavedCuisineChoices(localStorage.getItem(cuisineStorageKey)),
  );
  const [cuisineStatsAcknowledged, setCuisineStatsAcknowledged] = useState(
    () => localStorage.getItem(cuisineStatsSeenKey) === '1',
  );
  const [isSubmittingCuisine, setIsSubmittingCuisine] = useState(false);
  const [roundTwoStatsAcknowledged, setRoundTwoStatsAcknowledged] = useState(false);
  const targetRestaurants = useMemo(
    () => prioritizeRestaurantsForCuisine(sessionRestaurants, cuisineChoices),
    [sessionRestaurants, cuisineChoices],
  );
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
  const [activeSwipeAction, setActiveSwipeAction] = useState<SwipeAction | null>(null);
  const [requestedSwipe, setRequestedSwipe] = useState<{ id: number; action: SwipeAction; restaurantId: string } | null>(null);
  const requestedSwipeIdRef = useRef(0);
  const [isSubmittingFinalChoice, setIsSubmittingFinalChoice] = useState(false);
  const [detailRestaurant, setDetailRestaurant] = useState<Restaurant | null>(null);
  const submittingSwipeRef = useRef(false);
  const submittingFinalChoiceRef = useRef(false);
  const [remainingMs, setRemainingMs] = useState(() => {
    if (!currentSession?.deadline) return 0;
    return Math.max(0, new Date(currentSession.deadline).getTime() - Date.now());
  });

  const chooseCuisine = useCallback(async (choices: LunchieCuisineChoice[]) => {
    if (!currentSession || isSubmittingCuisine || choices.length === 0) return;
    setIsSubmittingCuisine(true);
    try {
      await persistSessionSwipe({
        id: `cuisine_${currentSession.id}_${profile.id}`,
        sessionId: currentSession.id,
        userId: profile.id,
        restaurantId: cuisineSignal(choices),
        round: 1,
        action: 'SYSTEM',
      });
      localStorage.setItem(cuisineStorageKey, JSON.stringify(choices));
      localStorage.removeItem(cuisineStatsSeenKey);
      setCuisineChoices(choices);
      setCuisineStatsAcknowledged(false);
      setCurrentIndex(0);
      setShowIntro(true);
    } catch (error) {
      console.error('음식 종류 선택 저장 실패', error);
      toast.error("Couldn't save your cuisine choices. Please try again.");
    } finally {
      setIsSubmittingCuisine(false);
    }
  }, [currentSession, cuisineStatsSeenKey, cuisineStorageKey, isSubmittingCuisine, profile.id]);

  const resetCuisineRound = useCallback(() => {
    localStorage.removeItem(cuisineStorageKey);
    localStorage.removeItem(cuisineStatsSeenKey);
    setCuisineChoices([]);
    setCuisineStatsAcknowledged(false);
    setRoundTwoStatsAcknowledged(false);
    setShowIntro(false);
  }, [cuisineStatsSeenKey, cuisineStorageKey]);

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

  const handleAction = useCallback(async (action: SwipeAction): Promise<boolean> => {
    if (submittingSwipeRef.current) return false;
    const restaurant = targetRestaurants[currentIndex];
    if (!restaurant) return false;

    submittingSwipeRef.current = true;
    setIsSubmittingSwipe(true);
    setActiveSwipeAction(action);
    try {
      await addSwipe(restaurant.id, action === 'dislike' ? 'skip' : action);
    } catch (error) {
      console.error('빠른 매칭 선택 저장 실패', error);
      toast.error("Couldn't save your choice. Please try again.");
      submittingSwipeRef.current = false;
      setIsSubmittingSwipe(false);
      setActiveSwipeAction(null);
      return false;
    }
    const meta = currentSession?.recMeta?.[restaurant.id];
    const dwell = Date.now() - cardShownAtRef.current; // 이 카드를 본 시간
    cardShownAtRef.current = Date.now(); // 다음 카드 노출 시점 리셋
    // 서버 세션은 /api/swipes가 선택과 추천 근거를 원자적으로 기록한다.
    // 세션이 없는 레거시 단독 흐름만 best-effort 브라우저 로그를 사용한다.
    if (!currentSession) {
      logSwipe(restaurant.id, action === 'like' ? 'LIKE' : action === 'neutral' ? 'NEUTRAL' : 'NOPE', {
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
    setActiveSwipeAction(null);
    return true;
  }, [currentIndex, targetRestaurants, addSwipe, total, currentSession, profile.id]);

  const requestButtonSwipe = useCallback((action: SwipeAction) => {
    if (submittingSwipeRef.current || requestedSwipe) return;
    const restaurant = targetRestaurants[currentIndex];
    if (!restaurant) return;
    requestedSwipeIdRef.current += 1;
    setActiveSwipeAction(action);
    setRequestedSwipe({ id: requestedSwipeIdRef.current, action, restaurantId: restaurant.id });
  }, [currentIndex, requestedSwipe, targetRestaurants]);

  const handleRequestedSwipeHandled = useCallback((requestId: number) => {
    setRequestedSwipe(current => current?.id === requestId ? null : current);
  }, []);

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

  // 솔로 결정(통일): 서버의 least-misery 동점 규칙(ID 순)과 같은 top-2 듀얼 1번.
  // 분기 없음 — 좋아요 1개든 7개든 같은 모델. 그룹은 WaitingOrDecidedScreen이 처리.
  useEffect(() => {
    if (phase !== 'decided' || duel || selectedWinner) return;
    const isSolo = (currentSession?.members?.length ?? 1) <= 1;
    if (!isSolo) return;
    const byServerRank = (list: any[]) => [...list].sort((a, b) => a.id.localeCompare(b.id));
    const currentRunLikes = swipeData.filter(s => s.action === 'like').map(s => s.restaurant);
    const restoredLikes = targetRestaurants.filter(restaurant => currentSessionSwipes.some(
      swipe => swipe.restaurantId === restaurant.id && (swipe.action === 'like' || swipe.action === 'save'),
    ));
    const pool = byServerRank(currentRunLikes.length > 0 ? currentRunLikes : restoredLikes);
    if (pool.length === 1) setDuel({ a: pool[0], b: null });                            // 후보 1 → 확인 화면(자동 확정 X)
    else if (pool.length >= 2) setDuel({ a: pool[0], b: pool[1] });                       // 서버와 동일한 top-2 듀얼
    else { setSelectedWinner(null); setPhase('results'); }                                // 후보 없음(예외)
  }, [phase]);

  const topPick = swipeData.find(s => s.action === 'like')?.restaurant || targetRestaurants[0];

  if (!currentSession) return <SwipeStateScreen state="session-missing" />;
  const isSoloSession = currentSession.members.length <= 1;

  if (phase === 'swipe' && cuisineChoices.length === 0) {
    return (
      <CuisineChoiceScreen
        isSolo={isSoloSession}
        memberCount={currentSession.members.length}
        isSubmitting={isSubmittingCuisine}
        onSubmit={chooseCuisine}
      />
    );
  }

  if (phase === 'swipe' && cuisineChoices.length > 0 && !cuisineStatsAcknowledged) {
    return (
      <CuisineStatisticsScreen
        inviteCode={currentSession.inviteCode}
        choices={cuisineChoices}
        isSolo={isSoloSession}
        memberCount={currentSession.members.length}
        onContinue={() => {
          localStorage.setItem(cuisineStatsSeenKey, '1');
          setCuisineStatsAcknowledged(true);
        }}
      />
    );
  }

  // 새 추천으로 재시작. 같은 덱(targetRestaurants)은 이미 swipeRecords에 다 기록돼 있어서,
  // rerollSession으로 새 덱을 먼저 받아온 뒤에 phase를 'swipe'로 돌려야 한다 — 순서를 바꾸면
  // "전부 스와이프 완료" 감지 effect(위)가 옛 덱 그대로 즉시 'decided'로 되돌려 무한 루프가 난다.
  const handleReset = async () => {
    logEvent({ event_type: 'REROLL', user_id: profile.id, session_id: currentSession?.id ?? null, slate_id: currentSession?.slateId ?? null });
    rejectedRef.current.clear();
    await rerollSession(targetRestaurants.map(r => r.id));
    resetCuisineRound();
    setCurrentIndex(0); setSwipeData([]); setSelectedWinner(null); setDuel(null); setRoundTwoStatsAcknowledged(false); setPhase('swipe');
  };
  // 듀얼 선택 → 우승 확정 (1번 비교, 이론 권장).
  const handleDuelChoice = async (chosen?: Restaurant) => {
    if (!chosen || !currentSession || submittingFinalChoiceRef.current) return;
    submittingFinalChoiceRef.current = true;
    setIsSubmittingFinalChoice(true);
    const round = 2 * (currentSession.generation ?? 1);
    try {
      await completeSoloSessionChoice({
        id: `vote_${currentSession.id}_${profile.id}_${round}`,
        sessionId: currentSession.id,
        userId: profile.id,
        restaurantId: chosen.id,
        round,
        action: 'LIKE',
      }, currentSession.inviteCode);
      setSelectedWinner(chosen);
      setPhase('final-stats');
    } catch (error) {
      console.error('빠른 매칭 최종 선택 저장 실패', error);
      toast.error("Couldn't save your final choice. Please try again.");
    } finally {
      submittingFinalChoiceRef.current = false;
      setIsSubmittingFinalChoice(false);
    }
  };
  // "둘 다 별로" → 두 후보 거절(NOPE FINAL = head-to-head 부정) → 남은 좋아요로 다른 듀얼, 없으면 새 추천.
  const handleRejectBoth = () => {
    if (!duel) return;
    [duel.a, duel.b].forEach((f) => {
      if (f?.id) {
        logEvent({ event_type: 'SWIPE', action: 'NOPE', slate_id: currentSession?.slateId ?? null, slate_type: 'FINAL', restaurant_id: f.id, round: 2, user_id: profile.id, session_id: currentSession?.id ?? null });
        rejectedRef.current.add(f.id);
      }
    });
    const byServerRank = (list: any[]) => [...list].sort((x, y) => x.id.localeCompare(y.id));
    const currentRunLikes = swipeData.filter(s => s.action === 'like').map(s => s.restaurant);
    const restoredLikes = targetRestaurants.filter(restaurant => currentSessionSwipes.some(
      swipe => swipe.restaurantId === restaurant.id && (swipe.action === 'like' || swipe.action === 'save'),
    ));
    const remaining = byServerRank((currentRunLikes.length > 0 ? currentRunLikes : restoredLikes).filter((r: any) => !rejectedRef.current.has(r.id)));
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
      if (!roundTwoStatsAcknowledged) {
        const likedCount = swipeData.length
          ? swipeData.filter(item => item.action === 'like').length
          : currentSessionSwipes.filter(item => item.action === 'like' || item.action === 'save').length;
        const dislikedCount = swipeData.length
          ? swipeData.filter(item => item.action === 'dislike').length
          : currentSessionSwipes.filter(item => item.action === 'skip').length;
        const neutralCount = swipeData.length
          ? swipeData.filter(item => item.action === 'neutral').length
          : currentSessionSwipes.filter(item => item.action === 'neutral').length;
        const answerCount = Math.max(1, likedCount + dislikedCount + neutralCount);
        return (
          <RoundStatisticsScreen
            round={2}
            eyebrow="ROUND 2 RESULT"
            title="Recommendation Vote Results"
            description="Your restaurant ratings are combined. Your Top 2 are next."
            items={[
              { id: 'like', label: "Recommend", value: likedCount, color: '#AA1A0D', emoji: '♥' },
              { id: 'dislike', label: "Not Recommended", value: dislikedCount, color: '#ECC1BB', emoji: '✕' },
              { id: 'neutral', label: "Neutral", value: neutralCount, color: '#858185', emoji: '-' },
            ]}
            completed={answerCount}
            total={answerCount}
            onContinue={() => setRoundTwoStatsAcknowledged(true)}
            continueLabel="View Top 2 →"
            summaryLabel={`Total:  ${answerCount} ratings`}
          />
        );
      }
      // 마지막 기회 안내 — 그룹의 REROLL "isLastChance" 화면과 동일한 안내 메시지·버튼.
      if (rerollPrompt === 'lastChance') {
        return (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="min-h-dvh flex flex-col justify-between px-5 py-8"
            style={{ background: '#FCFCFC' }}>
            <div className="flex-1 flex flex-col justify-center text-center">
              <div className="text-6xl mb-3">🤔</div>
              <h2 className="text-[#171717] font-bold text-[24px] mb-2">These Options Didn't Work Out</h2>
              <p className="text-[#858185] text-[13px] leading-relaxed">One more round will be the last attempt.<br />You can also start again from scratch.</p>
            </div>
            <div className="space-y-2">
              <button onClick={() => { rejectRoundRef.current += 1; setRerollPrompt('none'); handleReset(); }}
                className="w-full max-w-[340px] py-4 rounded-2xl font-bold text-white text-[15px] bg-[#AA1A0D] active:scale-[0.98] transition-all shadow-md mx-auto block">One Last Try →</button>
              <button onClick={() => navigate('/')}
                className="w-full max-w-[340px] py-4 rounded-lg border border-[#E8E6E7] font-semibold text-[#565256] text-[14px] bg-white active:scale-[0.98] transition-all mx-auto block">Start Over</button>
            </div>
          </motion.div>
        );
      }
      // 상한 도달 — 그룹의 NO_CONSENSUS 화면과 동일한 포기 안내(자동 재추천 없음).
      if (rerollPrompt === 'exhausted') {
        return (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="min-h-dvh flex flex-col justify-between px-5 py-8"
            style={{ background: '#FCFCFC' }}>
            <div className="flex-1 flex flex-col justify-center text-center">
              <div className="text-6xl mb-3">🤷</div>
              <h2 className="text-[#171717] font-bold text-[24px] mb-2">No Favorite Found</h2>
              <p className="text-[#858185] text-[13px] leading-relaxed">We tried several rounds, but none felt right.<br />Try another neighborhood or come back later.</p>
            </div>
            <button onClick={() => navigate('/')}
              className="w-full max-w-[340px] py-4 rounded-2xl font-bold text-[#565256] text-[15px] bg-white active:scale-[0.98] transition-all shadow-md mx-auto block">Home</button>
          </motion.div>
        );
      }
      // 솔로: 좋아요 수로 구성된 듀얼. 확정은 서버 저장과 세션 종료 후에만 진행.
      if (duel) return <FinalBattleResultScreen key={(duel.a?.id ?? '') + (duel.b?.id ?? '')} finalist1={duel.a} finalist2={duel.b} onContinue={handleDuelChoice} onRejectBoth={handleRejectBoth} isSubmitting={isSubmittingFinalChoice} />;
      return <SwipeStateScreen state="loading" />; // 효과가 듀얼/우승 구성 중
    }
    return <WaitingOrDecidedScreen
      onContinue={(w) => { if (w) setSelectedWinner(w); setPhase('results'); }}
      onReroll={async (excludeIds) => { await rerollSession(excludeIds); resetCuisineRound(); setSwipeData([]); setCurrentIndex(0); setSelectedWinner(null); setDuel(null); setRoundTwoStatsAcknowledged(false); setPhase('swipe'); }}
    />; // 그룹: 멤버 투표 폴링 + REROLL시 새 세대 재스와이프
  }
  if (phase === 'final-stats') {
    const opponent = duel?.a?.id === selectedWinner?.id ? duel?.b : duel?.a;
    return (
      <RoundStatisticsScreen
        round={3}
        eyebrow="ROUND 3 RESULT"
        title="Top 2 Final Results"
        description="Final choices are counted. Here's the winning restaurant."
        items={[
          { id: selectedWinner?.id ?? 'winner', label: selectedWinner?.name ?? "Selected Restaurant", value: 1, color: '#AA1A0D', emoji: '🏆' },
          ...(opponent ? [{ id: opponent.id, label: opponent.name, value: 0, color: '#F5F4F5', emoji: '🍽️' }] : []),
        ]}
        completed={1}
        total={1}
        onContinue={() => setPhase('results')}
        continueLabel="View Winner &amp; Feedback →"
        summaryLabel="1 final vote"
      />
    );
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
    <div className="min-h-dvh bg-[#FCFCFC] relative">
      <div className="border-b border-[#E8E6E7] bg-[#F5F4F5] px-5 pb-3 pt-[max(14px,env(safe-area-inset-top))]">
        <GameStageRail current={2} />
      </div>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-3 pt-3">
        <BackButton
          onClick={() => { logAbandon('back'); navigate('/lunchie/settings'); }}
          aria-label="Back to Quick Match Settings"
        />
        <div className="text-center">
          <span className="inline-flex rounded-full bg-[#FBECE9] px-2 py-0.5 text-[8px] font-black tracking-[0.7px] text-[#AA1A0D]">ROUND 2 · RECOMMENDATION VOTE</span>
          <p className="font-bold text-[16px] text-[#1A1A1A]">Would you recommend this restaurant?</p>
          <p className="text-[11px] text-[#9B9B9B]">Rate each restaurant ·  {progress}/{total}</p>
        </div>
        {currentSession?.deadline ? (
          <motion.div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
            style={{ background: urgent ? '#AA1A0D' : '#FBECE9' }}
            animate={urgent ? { scale: [1, 1.08, 1] } : {}}
            transition={{ duration: 1, repeat: urgent ? Infinity : 0 }}
          >
            <Clock size={14} color={urgent ? 'white' : '#AA1A0D'} />
            <span className="font-black text-[13px] tabular-nums" style={{ color: urgent ? 'white' : '#AA1A0D' }}>
              {englishText(mm)}:{englishText(ss)}
            </span>
          </motion.div>
        ) : (
          <div className="w-10 flex-shrink-0" />
        )}
      </div>

      {currentSession.dietaryBestEffort && (
        <div role="note" className="mx-5 mb-2 rounded-2xl border border-[#ECC1BB] bg-[#FBECE9] px-4 py-3 text-center">
          <p className="text-[12px] font-black text-[#565256]">Closest to Your Location</p>
          <p className="mt-1 text-[10px] font-semibold leading-relaxed text-[#858185]">

            Restaurants may not meet every dietary preference. Ingredient exclusions were applied, but please confirm with the restaurant before ordering.
          </p>
        </div>
      )}

      {/* Intro overlay */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            role="status"
            aria-live="polite"
            aria-label="Preparing Quick Match Restaurants"
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#FCFCFC] px-6 text-center"
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
          >
            <div className="max-w-[280px]">
              {isSoloSession && <span className="mb-3 inline-flex rounded-full bg-[#FBECE9] px-3 py-1 text-[10px] font-semibold text-[#AA1A0D]">SOLO LUNCH GAME</span>}
              <p className="text-[22px] font-bold text-[#171717]">Getting the Vote Ready!</p>
              <p className="mt-2 text-[14px] leading-relaxed text-[#858185]">

                Other choices stay private · choose what feels right to you
              </p>
            </div>

            <div aria-hidden="true" className="mt-6 flex h-3 items-center justify-center gap-2">
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  className="size-2 rounded-full bg-[#AA1A0D]"
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
                isTop={i === 0}
                stackIndex={i}
                progress={progress}
                total={total}
                onOpenRestaurantDetails={openRestaurantDetails}
                onSwipe={handleAction}
                interactionDisabled={isSubmittingSwipe || requestedSwipe !== null}
                requestedSwipe={i === 0 && requestedSwipe?.restaurantId === restaurant.id ? requestedSwipe : null}
                onRequestedSwipeHandled={handleRequestedSwipeHandled}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 px-5 pb-10 pt-4">
        <motion.button
          data-action="dislike"
          onClick={() => requestButtonSwipe('dislike')}
          disabled={isSubmittingSwipe || requestedSwipe !== null}
          aria-label="Not Recommended"
          className={`h-[84px] min-w-0 rounded-lg border-2 px-2 text-center outline-none transition-[transform,background-color,color,box-shadow] focus-visible:ring-2 focus-visible:ring-[#DC2626] disabled:cursor-wait disabled:opacity-70 ${activeSwipeAction === 'dislike' ? 'border-[#DC2626] bg-[#DC2626] text-white shadow-[0_0_0_4px_rgba(220,38,38,0.20)]' : 'border-[#F87171] bg-[#FEE2E2] text-[#B91C1C] shadow-sm'}`}
          animate={activeSwipeAction === 'dislike' ? { scale: [1, 0.92, 1.04] } : { scale: 1 }}
          transition={{ duration: 0.24 }}
          whileTap={{ scale: 0.92, backgroundColor: '#DC2626', borderColor: '#DC2626', color: '#FFFFFF' }}
        >
          <X size={24} className="mx-auto" strokeWidth={2} />
          <span className="mt-1 block text-[13px] font-semibold">Dislike</span>
        </motion.button>
        <motion.button
          data-action="neutral"
          onClick={() => requestButtonSwipe('neutral')}
          disabled={isSubmittingSwipe || requestedSwipe !== null}
          aria-label="Neutral"
          className={`h-[84px] min-w-0 rounded-lg border-2 px-2 text-center outline-none transition-[transform,background-color,color,box-shadow] focus-visible:ring-2 focus-visible:ring-[#EAB308] disabled:cursor-wait disabled:opacity-70 ${activeSwipeAction === 'neutral' ? 'border-[#EAB308] bg-[#FACC15] text-[#422006] shadow-[0_0_0_4px_rgba(234,179,8,0.22)]' : 'border-[#FACC15] bg-[#FEF9C3] text-[#854D0E] shadow-sm'}`}
          animate={activeSwipeAction === 'neutral' ? { scale: [1, 0.92, 1.04] } : { scale: 1 }}
          transition={{ duration: 0.24 }}
          whileTap={{ scale: 0.92, backgroundColor: '#FACC15', borderColor: '#EAB308', color: '#422006' }}
        >
          <Minus size={24} className="mx-auto" strokeWidth={2} />
          <span className="mt-1 block text-[13px] font-semibold">Neutral</span>
        </motion.button>
        <motion.button
          data-action="like"
          onClick={() => requestButtonSwipe('like')}
          disabled={isSubmittingSwipe || requestedSwipe !== null}
          aria-label="Recommend"
          className={`h-[84px] min-w-0 rounded-lg border-2 px-2 text-center outline-none transition-[transform,background-color,color,box-shadow] focus-visible:ring-2 focus-visible:ring-[#16A34A] disabled:cursor-wait disabled:opacity-70 ${activeSwipeAction === 'like' ? 'border-[#16A34A] bg-[#16A34A] text-white shadow-[0_0_0_4px_rgba(22,163,74,0.20)]' : 'border-[#4ADE80] bg-[#DCFCE7] text-[#15803D] shadow-sm'}`}
          animate={activeSwipeAction === 'like' ? { scale: [1, 0.92, 1.04] } : { scale: 1 }}
          transition={{ duration: 0.24 }}
          whileTap={{ scale: 0.92, backgroundColor: '#16A34A', borderColor: '#16A34A', color: '#FFFFFF' }}
        >
          <Heart size={24} className="mx-auto" strokeWidth={2} />
          <span className="mt-1 block text-[13px] font-semibold">Like</span>
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
