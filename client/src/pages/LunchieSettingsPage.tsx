import { englishText } from '@shared/englishCopy';
/**
 * Lunchie Quick Match — compact settings and session entry.
 * Session persistence remains server-first through AppContext.
 */

import { useEffect, useMemo, useRef, useState, type Dispatch, type PointerEvent as ReactPointerEvent, type ReactNode, type SetStateAction } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useSearch } from 'wouter';
import {
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Navigation,
  Ruler,
  Sparkles,
  Triangle,
  UtensilsCrossed,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { FOOD_TAGS } from '@/constants/foodTags';
import { toast } from 'sonner';
import type { Intent } from '@shared/intent';
import { localityForCoordinate } from '@shared/melbourneLocality';
import { QUICK_MATCH_PARTY_SIZE_MAX } from '@shared/quickMatchParty';
import { categoryFiltersForOccasions } from '@shared/occasionFilters';
import { logSessionCreated } from '@/lib/eventLogger';
import SessionManagementMenu from '@/components/lunchie/SessionManagementMenu';
import {
  DEFAULT_QUICK_MATCH_SETTINGS,
  QUICK_MATCH_SETTINGS_STORAGE_KEY,
  isActiveQuickMatchStatus,
  normalizeDietaryPreferences,
  normalizeQuickMatchSettings,
} from '@/lib/quickMatch';

const PREFERENCE_CARDS: { value: Intent | null; label: string; image?: string }[] = [
  { value: 'cafe', label: "Coffee", image: '/assets/characters/quick-match/coffee.png' },
  { value: 'meal', label: "Meals", image: '/assets/characters/quick-match/rice.png' },
  { value: 'dessert', label: "Dessert", image: '/assets/characters/quick-match/dessert.png' },
  { value: null, label: "Surprise Me" },
];

const RADIUS_OPTIONS = [1000, 2000, 3000, 4000, 5000];
const TAG_META: Record<string, { icon: string; hint: string }> = {
  맛집: { icon: '🍽️', hint: "Popular Favorites" },
  데이트코스: { icon: '💞', hint: "Great Atmosphere" },
  혼밥: { icon: '🙋', hint: "Solo Friendly" },
  카페: { icon: '☕', hint: "Coffee Break" },
  펍나이트: { icon: '🍻', hint: "After-work Drinks" },
  브런치: { icon: '🥐', hint: "A Relaxed Meal" },
  디저트: { icon: '🍰', hint: "Something Sweet" },
  가성비: { icon: '✨', hint: "Great Value" },
};

function formatRadius(radius: number): string {
  return radius >= 5000 ? '5km+' : `${radius / 1000}km`;
}

type LocationFix = { latitude: number; longitude: number; accuracy: number };

function currentPosition(): Promise<LocationFix> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error("Location is unavailable in this browser."));
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
      error => reject(new Error(
        error.code === error.PERMISSION_DENIED
          ? "Location permission is off. Enable it in your browser's site settings and try again."
          : "Couldn't find your location. Please try again shortly.",
      )),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  });
}

function Card({ children }: { children: ReactNode }) {
  return (
    <section className="border-b border-[#E8E6E7] bg-[#FCFCFC] px-1 py-5">
      {englishText(children)}
    </section>
  );
}

function CardTitle({ icon, children, badge }: { icon: ReactNode; children: ReactNode; badge?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2.5 text-[15px] font-bold text-[#171717]">
      <span className="text-[#AA1A0D]">{englishText(icon)}</span>
      <span>{englishText(children)}</span>
      {englishText(badge && <span className="ml-auto rounded-full bg-[#FBECE9] px-2.5 py-1 text-[11px] font-semibold text-[#AA1A0D]">{englishText(badge)}</span>)}
    </div>
  );
}

function CollapsibleOptionPanel({
  title,
  icon,
  summary,
  open,
  onToggle,
  controlsId,
  children,
}: {
  title: string;
  icon: ReactNode;
  summary: string;
  open: boolean;
  onToggle: () => void;
  controlsId: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-[#E8E6E7] bg-[#FCFCFC] py-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={controlsId}
        className="flex min-h-[68px] w-full items-center gap-3 px-1 text-left active:bg-[#F8F7F8]"
      >
        <span className="flex size-8 shrink-0 items-center justify-center text-[#AA1A0D]">{englishText(icon)}</span>
        <span className="min-w-0 flex-1">
          <strong className="block text-[14px] font-semibold text-[#171717]">{englishText(title)}</strong>
          <span className="mt-1 block truncate text-[12px] text-[#858185]">{englishText(summary)}</span>
        </span>
        <ChevronDown size={17} className={`shrink-0 text-[#858185] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id={controlsId} className="border-t border-[#EEECEE] pb-4 pt-3">
          {englishText(children)}
        </div>
      )}
    </section>
  );
}

function DeadlineDial({ minutes, onChange }: { minutes: number; onChange: (minutes: number) => void }) {
  const radius = 70;
  const center = 88;
  const circumference = 2 * Math.PI * radius;
  const minProgress = 1 / 15;
  const dragRef = useRef<{
    pointerId: number;
    lastAngle: number;
    progress: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [visualProgress, setVisualProgress] = useState(() => Math.max(minProgress, Math.min(1, minutes / 15)));

  useEffect(() => {
    if (dragRef.current) return;
    setVisualProgress(Math.max(minProgress, Math.min(1, minutes / 15)));
  }, [minutes]);

  const pointerAngle = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    return Math.atan2(y, x);
  };

  const shortestDelta = (from: number, to: number) => {
    let delta = to - from;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return delta;
  };

  const commitProgress = (progress: number) => {
    const clamped = Math.max(minProgress, Math.min(1, progress));
    // Snap the ring to whole minutes so dragging ticks 1→2→3 instead of sliding.
    const nextMinutes = Math.max(1, Math.min(15, Math.round(clamped * 15)));
    setVisualProgress(nextMinutes / 15);
    onChange(nextMinutes);
  };

  const endDrag = (pointerId: number, currentTarget: HTMLDivElement) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (currentTarget.hasPointerCapture(pointerId)) currentTarget.releasePointerCapture(pointerId);
    commitProgress(drag.progress);
  };

  const handleAngle = visualProgress * Math.PI * 2 - Math.PI / 2;
  const handleX = center + radius * Math.cos(handleAngle);
  const handleY = center + radius * Math.sin(handleAngle);

  return (
    <div
      className="relative size-44 shrink-0 cursor-grab touch-none select-none rounded-full outline-none active:cursor-grabbing focus-visible:ring-4 focus-visible:ring-[#AA1A0D]/20"
      role="slider"
      tabIndex={0}
      aria-label="Time Limit"
      aria-valuemin={1}
      aria-valuemax={15}
      aria-valuenow={minutes}
      aria-valuetext={`${minutes} min`}
      onPointerDown={event => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        event.preventDefault();
        const progress = Math.max(minProgress, Math.min(1, minutes / 15));
        dragRef.current = {
          pointerId: event.pointerId,
          lastAngle: pointerAngle(event),
          progress,
        };
        setDragging(true);
        setVisualProgress(progress);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const angle = pointerAngle(event);
        const delta = shortestDelta(drag.lastAngle, angle);
        drag.lastAngle = angle;
        // Clamp progress — never wrap past 15 into 1 (or 1 into 15).
        drag.progress = Math.max(minProgress, Math.min(1, drag.progress + delta / (Math.PI * 2)));
        commitProgress(drag.progress);
      }}
      onPointerUp={event => endDrag(event.pointerId, event.currentTarget)}
      onPointerCancel={event => endDrag(event.pointerId, event.currentTarget)}
      onLostPointerCapture={event => endDrag(event.pointerId, event.currentTarget)}
      onKeyDown={event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
          event.preventDefault();
          onChange(Math.min(15, minutes + 1));
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
          event.preventDefault();
          onChange(Math.max(1, minutes - 1));
        }
        if (event.key === 'Home') {
          event.preventDefault();
          onChange(1);
        }
        if (event.key === 'End') {
          event.preventDefault();
          onChange(15);
        }
      }}
    >
      <svg width="176" height="176" className="drop-shadow-[0_8px_18px_rgba(244,81,94,0.10)]" aria-hidden="true">
        <circle cx={center} cy={center} r={radius} fill="#FFFBF8" stroke="#F0E9E6" strokeWidth="12" />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#AA1A0D"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - visualProgress)}
          transform={`rotate(-90 ${center} ${center})`}
          style={{ transition: dragging ? 'stroke-dashoffset 55ms cubic-bezier(0.2, 0.85, 0.25, 1)' : 'stroke-dashoffset 160ms ease-out' }}
        />
        <g
          style={{
            transform: `translate(${handleX}px, ${handleY}px)`,
            transition: dragging ? 'transform 55ms cubic-bezier(0.2, 0.85, 0.25, 1)' : 'transform 160ms ease-out',
          }}
        >
          <circle cx={0} cy={0} r="9" fill="white" stroke="#AA1A0D" strokeWidth="5" />
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <strong className="text-[30px] leading-none text-[#26232A] tabular-nums">{minutes} <span className="text-[17px]"> min</span></strong>
      </div>
    </div>
  );
}

function PreferenceCard({ option, selected, onClick }: {
  option: (typeof PREFERENCE_CARDS)[number];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      className={`relative min-w-0 overflow-hidden rounded-[10px] border px-2 pb-3 pt-2 transition-colors ${
        selected
          ? 'border-[#AA1A0D] bg-white'
          : 'border-[#E8E6E7] bg-white'
      }`}
      aria-pressed={selected}
    >
      {selected && (
        <span className="absolute right-2 top-2 z-10 flex size-5 items-center justify-center rounded-full bg-[#AA1A0D] text-white">
          <Check size={13} strokeWidth={3} />
        </span>
      )}
      <span className="relative mx-auto flex aspect-square w-full max-w-[72px] items-center justify-center bg-transparent">
        {option.image ? (
          <img src={option.image} alt="" className="h-[72px] w-[72px] object-contain" draggable={false} />
        ) : (
          <span className="flex size-14 items-center justify-center rounded-full border border-dashed border-[#F0B8AE] bg-white text-[#AA1A0D] shadow-[0_8px_18px_rgba(170,26,13,0.08)]">
            <CircleHelp size={34} strokeWidth={2.4} />
          </span>
        )}
      </span>
      <span className={`relative z-10 mt-2 block text-[11px] font-semibold ${selected ? 'text-[#AA1A0D]' : 'text-[#565256]'}`}>{englishText(option.label)}</span>
    </motion.button>
  );
}

function DistanceRuler({ radius, onChange }: { radius: number; onChange: (value: number) => void }) {
  const selectedIndex = RADIUS_OPTIONS.indexOf(radius);
  const progress = selectedIndex / (RADIUS_OPTIONS.length - 1) * 100;

  return (
    <div>
      <div className="mb-2 mr-1 flex items-center gap-2 text-[13px] font-extrabold text-[#26232A]">
        <Ruler size={17} className="text-[#AA1A0D]" />

        Distance
        <strong className="ml-auto text-[15px] text-[#AA1A0D]">{englishText(formatRadius(radius))}</strong>
      </div>
      <div className="relative mx-1 h-[100px] rounded-[10px] bg-[#F5F4F5] px-6 pt-4">
        <div className="absolute left-5 right-5 top-[54px] h-1 rounded-full bg-[#E9DEDA]" />
        <div className="absolute left-5 top-[54px] h-1 rounded-full bg-[#AA1A0D] transition-[width]" style={{ width: `calc((100% - 40px) * ${progress / 100})` }} />
        <div className="absolute left-5 right-5 top-[47px] flex justify-between" aria-hidden="true">
          {Array.from({ length: 17 }, (_, index) => (
            <span key={index} className={`w-[2px] rounded-full bg-[#CBBDB8] ${index % 4 === 0 ? 'h-4' : 'h-2.5 opacity-75'}`} />
          ))}
        </div>
        <motion.span
          className="pointer-events-none absolute top-[22px] z-10 flex size-8 -translate-x-1/2 items-center justify-center text-[#AA1A0D]"
          animate={{ left: `calc(20px + (100% - 40px) * ${progress / 100})` }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          aria-hidden="true"
        >
          <Triangle size={24} fill="currentColor" strokeWidth={0} className="rotate-180" />
        </motion.span>
        <input
          type="range"
          min={0}
          max={RADIUS_OPTIONS.length - 1}
          step={1}
          value={selectedIndex}
          onChange={event => onChange(RADIUS_OPTIONS[Number(event.target.value)]!)}
          className="lunchie-distance-range absolute inset-x-5 top-[27px] z-20 h-14 opacity-[0.01]"
          aria-label="Search Radius"
          aria-valuetext={formatRadius(radius)}
        />
        <div className="absolute inset-x-5 bottom-5 text-[9px] font-bold text-[#A69B96]">
          {RADIUS_OPTIONS.map((option, index) => (
            <span
              key={option}
              className="absolute whitespace-nowrap"
              style={{
                left: `${index / (RADIUS_OPTIONS.length - 1) * 100}%`,
                transform: index === 0 ? 'translateX(0)' : index === RADIUS_OPTIONS.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
              }}
            >
              {englishText(formatRadius(option))}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LunchieSettingsPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const {
    createSession,
    fetchSession,
    currentSession,
    setCurrentSession,
    restaurants,
    profile,
  } = useApp();
  const urlIntent = new URLSearchParams(search).get('intent');
  const initialIntent: Intent | null = urlIntent === 'meal' || urlIntent === 'cafe' || urlIntent === 'dessert' ? urlIntent : null;
  const [storedSettings] = useState(() => {
    try {
      return normalizeQuickMatchSettings(JSON.parse(localStorage.getItem(QUICK_MATCH_SETTINGS_STORAGE_KEY) ?? 'null'));
    } catch {
      return DEFAULT_QUICK_MATCH_SETTINGS;
    }
  });

  const [deadlineMin, setDeadlineMin] = useState(storedSettings.deadlineMinutes);
  const [radius, setRadius] = useState(storedSettings.radius);
  const [distanceEnabled, setDistanceEnabled] = useState(storedSettings.distanceEnabled);
  const [intent, setIntent] = useState<Intent | null>(initialIntent ?? storedSettings.intent);
  const [tags, setTags] = useState<string[]>(storedSettings.tags);
  const [moodOptionsOpen, setMoodOptionsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [origin, setOrigin] = useState<LocationFix | null>(null);
  const [originLabel, setOriginLabel] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const creationLockRef = useRef(false);
  const [activeSessionVerified, setActiveSessionVerified] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(currentSession?.inviteCode));
  const [sessionCheckFailed, setSessionCheckFailed] = useState(false);
  const [sessionCheckAttempt, setSessionCheckAttempt] = useState(0);
  const dietary = useMemo(
    () => normalizeDietaryPreferences(profile.dietary),
    [profile.dietary],
  );

  const budget = 2 as const;
  const selectedPreferenceLabel = PREFERENCE_CARDS.find(option => option.value === intent)?.label ?? "Surprise Me";
  const hasActiveSession = Boolean(
    activeSessionVerified
    && currentSession
    && currentSession.membershipActive !== false
    && isActiveQuickMatchStatus(currentSession.status),
  );
  const realCategories = useMemo(() => new Set(restaurants.map(restaurant => restaurant.category)), [restaurants]);

  useEffect(() => {
    localStorage.setItem(QUICK_MATCH_SETTINGS_STORAGE_KEY, JSON.stringify({
      deadlineMinutes: deadlineMin,
      // Kept in the legacy settings shape as the room capacity. The actual
      // party size is whoever is in the lobby when the host starts.
      partySize: QUICK_MATCH_PARTY_SIZE_MAX,
      radius,
      distanceEnabled,
      intent,
      tags,
      dietary: normalizeDietaryPreferences(dietary),
    }));
  }, [deadlineMin, radius, distanceEnabled, intent, tags, dietary]);

  useEffect(() => {
    const token = currentSession?.inviteCode;
    if (!token) {
      setActiveSessionVerified(false);
      setIsCheckingSession(false);
      setSessionCheckFailed(false);
      return;
    }
    // Resume/cancel need a private memberKey. Old local caches without one
    // only block Start — clear them instead of showing a stuck progress card.
    if (!currentSession.memberKey) {
      setActiveSessionVerified(false);
      setIsCheckingSession(false);
      setSessionCheckFailed(false);
      setCurrentSession(null);
      return;
    }
    let active = true;
    setIsCheckingSession(true);
    setSessionCheckFailed(false);
    void fetchSession(token)
      .then(session => {
        if (!active) return;
        const valid = session.membershipActive !== false && isActiveQuickMatchStatus(session.status);
        setActiveSessionVerified(valid);
        if (!valid) setCurrentSession(null);
      })
      .catch(error => {
        if (!active) return;
        const status = (error as { status?: number }).status;
        if (status === 404 || status === 410) setCurrentSession(null);
        else setSessionCheckFailed(true);
        setActiveSessionVerified(false);
      })
      .finally(() => {
        if (active) setIsCheckingSession(false);
      });
    return () => { active = false; };
  }, [currentSession?.inviteCode, currentSession?.memberKey, fetchSession, sessionCheckAttempt, setCurrentSession]);

  const toggleMany = (value: string, setter: Dispatch<SetStateAction<string[]>>) => {
    setter(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  };

  const confirmCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const fix = await currentPosition();
      const label = localityForCoordinate(fix.latitude, fix.longitude);
      setOrigin(fix);
      setOriginLabel(label);
      toast.success(`Your location is  ${label}.`);
      return fix;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't find your location.");
      throw error;
    } finally {
      setIsLocating(false);
    }
  };

  const selectRadius = (nextRadius: number) => {
    setRadius(nextRadius);
    setDistanceEnabled(true);
    if (!origin && !isLocating) void confirmCurrentLocation().catch(() => undefined);
  };

  const createAndEnterSession = async () => {
    const categories = categoryFiltersForOccasions(tags, realCategories);
    const hostName = profile.name && !["User", 'User'].includes(profile.name) ? profile.name : "Host";
    const currentOrigin = distanceEnabled
      ? origin ?? await currentPosition()
      : null;
    const session = await createSession(
      `${hostName}'s Lunch Session`,
      {
        // `partySize` is the join capacity in the existing API contract. It is
        // no longer a headcount the user must choose before creating a lobby.
        partySize: QUICK_MATCH_PARTY_SIZE_MAX,
        dietary,
        budget,
        radius,
        distanceEnabled,
        originLatitude: currentOrigin?.latitude,
        originLongitude: currentOrigin?.longitude,
        categories,
        intent: intent ?? undefined,
      },
      hostName,
      profile.emoji,
      deadlineMin,
    );

    logSessionCreated(session.id, {
      intent: intent ?? 'auto',
      party_size: session.members.length,
      lobby_capacity: QUICK_MATCH_PARTY_SIZE_MAX,
      radius_m: distanceEnabled ? radius : null,
      budget,
      dietary_count: dietary.length,
      category_count: categories.length,
      deadline_minutes: deadlineMin,
    });

    toast.success("Lobby created. Invite friends or start solo!");
    navigate('/session/lobby');
  };

  const handleStart = async () => {
    if (creationLockRef.current || isCheckingSession || sessionCheckFailed) return;

    creationLockRef.current = true;
    setIsCreating(true);
    try {
      if (hasActiveSession && currentSession) {
        try {
          const activeSession = await fetchSession(currentSession.inviteCode);
          if (activeSession.membershipActive !== false && isActiveQuickMatchStatus(activeSession.status)) {
            const isWaiting = activeSession.status === 'waiting';
            toast.info(isWaiting ? "Returning to your active lobby." : "Returning to your active vote.");
            navigate(isWaiting ? '/session/lobby' : '/lunchie/swipe');
            return;
          }
          // A locally cached session can outlive its server record. Clear only
          // that stale cache before creating a replacement session.
          setCurrentSession(null);
        } catch (error) {
          const status = (error as { status?: number }).status;
          if (status !== 404 && status !== 410) {
            toast.error("Couldn't check your active Quick Match. Please try again.");
            return;
          }
          setCurrentSession(null);
        }
      }

      await createAndEnterSession();
    } catch (error) {
      console.error('빠른 매칭 세션 생성 실패', error);
      toast.error("Couldn't create a session. Please try again shortly.");
    } finally {
      setIsCreating(false);
      creationLockRef.current = false;
    }
  };

  return (
    <div className="min-h-dvh bg-[#FCFCFC] pb-6 text-[#171717]">
      <header className="sticky top-0 z-20 border-b border-[#E8E6E7] bg-[#FCFCFC]/95 px-5 pb-4 pt-[max(16px,env(safe-area-inset-top))] backdrop-blur">
        <div className="text-center">
          <h1 className="text-[18px] font-bold leading-none text-[#171717]">Quick Match</h1>
          <p className="mt-1.5 text-[11px] font-medium text-[#858185]">What are you craving today?</p>
        </div>
      </header>

      <main className="mx-auto max-w-[480px] px-5 pb-24">
        {sessionCheckFailed && currentSession && (
          <section role="alert" className="my-4 rounded-[10px] border border-[#ECC1BB] bg-[#FDF6F4] p-4">
            <h2 className="text-[14px] font-black text-[#302B2E]">Couldn't check your active Quick Match</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-[#7C7276]">Your saved session is still available. Check it again before creating a new session.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setSessionCheckAttempt(attempt => attempt + 1)} className="min-h-10 rounded-lg bg-[#AA1A0D] px-4 text-[12px] font-bold text-white">Try Again</button>
              <button type="button" onClick={() => setCurrentSession(null)} className="min-h-10 rounded-lg border border-[#ECC1BB] bg-white px-4 text-[12px] font-bold text-[#AA1A0D]">Clear Saved Session</button>
            </div>
          </section>
        )}
        {hasActiveSession && currentSession && (
          <section className="my-4 rounded-[10px] border border-[#ECC1BB] bg-[#FDF6F4] p-4" aria-label="Active Quick Match">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[15px] font-black text-[#26232A]">Active Quick Match</h2>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase text-[#AA1A0D]">
                    {englishText(currentSession.status === 'waiting' ? "Waiting" : currentSession.status === 'choosing' ? "Final Choice" : "Voting")}
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-[#8A8084]">Continue your active session.</p>
              </div>
              <SessionManagementMenu onEnded={() => navigate('/lunchie/settings')} className="text-[#6F6468]" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <span className="rounded-lg bg-white px-3 py-2 font-semibold text-[#565256]">
                👥 {currentSession.members.length} {currentSession.members.length === 1 ? 'person' : 'people'}
              </span>
              <span className="rounded-lg bg-white px-3 py-2 font-semibold text-[#565256]">⏱ {currentSession.deadlineMinutes ?? deadlineMin} min</span>
              <span className="rounded-lg bg-white px-3 py-2 font-semibold text-[#565256]">📍 {englishText(formatRadius(currentSession.filters.radius))}</span>
              <span className="rounded-lg bg-white px-3 py-2 font-semibold text-[#565256]">{englishText(currentSession.members.length === 1 ? "🙋 Ready for Solo" : "🤝 Together")}</span>
            </div>
            <button
              type="button"
              onClick={() => navigate(currentSession.status === 'waiting' ? '/session/lobby' : '/lunchie/swipe')}
              className="mt-3 min-h-11 w-full rounded-lg bg-[#AA1A0D] px-4 text-[13px] font-bold text-white outline-none transition-transform active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#AA1A0D] focus-visible:ring-offset-2"
            >
              {englishText(currentSession.status === 'waiting' ? "Back to Lobby" : "Continue Quick Match")}
            </button>
          </section>
        )}

        <Card>
          <CardTitle icon={<UtensilsCrossed size={16} />} badge={selectedPreferenceLabel}>Today's Quick Match</CardTitle>
          <div className="grid grid-cols-4 gap-2">
            {PREFERENCE_CARDS.map(option => (
              <PreferenceCard key={option.label} option={option} selected={intent === option.value} onClick={() => setIntent(option.value)} />
            ))}
          </div>
        </Card>

        <CollapsibleOptionPanel
          title="What's the occasion?"
          icon={<Sparkles size={15} />}
          summary={tags.length ? tags.map(englishText).join(', ') : "No Preference"}
          open={moodOptionsOpen}
          onToggle={() => setMoodOptionsOpen(current => !current)}
          controlsId="quick-match-mood-options"
        >
          <div className="grid grid-cols-2 gap-2">
            {FOOD_TAGS.map(tag => {
              const selected = tags.includes(tag);
              const meta = TAG_META[tag];
              return (
                <motion.button
                  key={tag}
                  type="button"
                  onClick={() => toggleMany(tag, setTags)}
                  whileTap={{ scale: 0.97 }}
                  aria-pressed={selected}
                  className={`flex min-h-[54px] items-center gap-2 rounded-[8px] border px-3 text-left transition-colors ${selected ? 'border-[#AA1A0D] bg-[#FBECE9]' : 'border-[#E8E6E7] bg-white'}`}
                >
                  <span className="text-xl">{englishText(meta?.icon)}</span>
                  <span className="min-w-0">
                    <strong className="block text-[12px] text-[#3E373B]">{englishText(tag)}</strong>
                    <span className="block truncate text-[9px] font-semibold text-[#A39A9E]">{englishText(meta?.hint)}</span>
                  </span>
                  <span className={`ml-auto flex size-4 shrink-0 items-center justify-center rounded-sm border ${selected ? 'border-[#AA1A0D] bg-[#AA1A0D] text-white' : 'border-[#C9C6C8] text-transparent'}`}><Check size={10} strokeWidth={3} /></span>
                </motion.button>
              );
            })}
          </div>
        </CollapsibleOptionPanel>

        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setDistanceEnabled(false)}
              aria-pressed={!distanceEnabled}
              className={`min-h-9 rounded-full px-3 text-[10px] font-bold ${!distanceEnabled ? 'bg-[#AA1A0D] text-white' : 'bg-[#FBECE9] text-[#AA1A0D]'}`}
            >

              No Radius Limit
            </button>
            <button
              type="button"
              onClick={() => void confirmCurrentLocation().catch(() => undefined)}
              disabled={isLocating}
              className="flex min-h-9 items-center gap-1 rounded-full px-2 text-[10px] font-bold text-[#AA1A0D] disabled:opacity-50"
            >
              <Navigation size={12} /> {englishText(isLocating ? "Checking…" : origin ? "Refresh Location" : "Find My Location")}
            </button>
          </div>
          <DistanceRuler radius={radius} onChange={selectRadius} />
          <div className="mt-3 rounded-[8px] bg-[#F5F4F5] px-3 py-2 text-[10px] font-semibold leading-relaxed text-[#706B6F]">
            {englishText(origin
              ? `Current location ·  ${originLabel ?? "Near your location"}${distanceEnabled ? ` · ${formatRadius(radius)}  radius` : " · No radius limit"}`
              : distanceEnabled
                ? "Enable location to use your selected radius."
                : "Get recommendations without location permission.")}
          </div>
        </Card>

        <Card>
          <CardTitle icon={<Clock3 size={16} />}>Deadline</CardTitle>
          <div className="flex flex-col items-center">
            <DeadlineDial minutes={deadlineMin} onChange={setDeadlineMin} />
          </div>
        </Card>

        <div className="pb-1 pt-5">
          <motion.button
            type="button"
            onClick={() => void handleStart()}
            disabled={isCreating || isCheckingSession || sessionCheckFailed}
            whileTap={{ scale: 0.98 }}
            className="lunchie-session-primary-action w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {englishText(isCheckingSession
              ? "Checking active session…"
              : isCreating
              ? "Preparing…"
              : hasActiveSession && currentSession
                ? currentSession.status === 'waiting' ? "Back to Lobby" : "Continue Voting"
                : "Create Lobby & Invite")}
          </motion.button>
        </div>

      </main>

    </div>
  );
}
