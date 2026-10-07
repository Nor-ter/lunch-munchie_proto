import { englishText } from '@shared/englishCopy';
/**
 * Lunchie Quick Match — compact settings and session entry.
 * Session persistence remains server-first through AppContext.
 */

import { useEffect, useMemo, useRef, useState, type Dispatch, type PointerEvent as ReactPointerEvent, type ReactNode, type SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import {
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  MapPin,
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
import QuickMatchRadiusMap from '@/components/lunchie/QuickMatchRadiusMap';
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

function QuickMatchCover() {
  return (
    <section
      data-ui="quick-match-cover"
      aria-label="Quick Match cover"
      className="relative -mx-5 overflow-hidden rounded-b-[32px] bg-[#AA1A0D] px-5 pb-5 pt-[max(18px,env(safe-area-inset-top))] text-white shadow-[0_16px_34px_rgba(112,25,17,0.22)]"
    >
      <span className="pointer-events-none absolute -right-12 top-10 size-56 rounded-full bg-[#FBECE9]/10" aria-hidden="true" />
      <span className="pointer-events-none absolute -left-20 bottom-5 size-44 rounded-full bg-[#FBECE9]/10" aria-hidden="true" />

      <div className="relative z-10 grid grid-cols-[minmax(0,1fr)_132px] items-center gap-1">
        <div className="min-w-0 pb-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F8C9C2]">Today's lunch game</p>
          <h1 className="mt-2 max-w-[235px] text-[34px] font-black leading-[0.98] tracking-[-0.045em]">
            What are we eating today?
          </h1>
        </div>

        <div className="relative flex h-[154px] items-end justify-center">
          <motion.span
            className="absolute right-0 top-0 rounded-[12px] bg-[#F4C54A] px-2.5 py-1.5 text-center text-[9px] font-black leading-tight text-[#5A321A] shadow-md"
            animate={{ rotate: [2, -1, 2], y: [0, -3, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            Let’s pick<br />together!
          </motion.span>
          <motion.img
            src="/assets/lunchmate/chicken/chicken-happy.png"
            alt="Lunchie Munchie chick ready for Quick Match"
            draggable={false}
            className="h-[132px] w-[132px] select-none object-contain drop-shadow-[0_12px_18px_rgba(61,18,12,0.24)]"
            animate={{ y: [0, -5, 0], rotate: [0, -1.5, 0, 1.5, 0] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>

    </section>
  );
}

export default function LunchieSettingsPage() {
  const [, navigate] = useLocation();
  const {
    createSession,
    fetchSession,
    currentSession,
    setCurrentSession,
    profile,
    restaurants,
    isLoading,
  } = useApp();
  const [storedSettings] = useState(() => {
    try {
      return normalizeQuickMatchSettings(JSON.parse(localStorage.getItem(QUICK_MATCH_SETTINGS_STORAGE_KEY) ?? 'null'));
    } catch {
      return DEFAULT_QUICK_MATCH_SETTINGS;
    }
  });

  const [radius, setRadius] = useState(storedSettings.radius);
  const [distanceEnabled, setDistanceEnabled] = useState(storedSettings.distanceEnabled);
  const [isCreating, setIsCreating] = useState(false);
  const [origin, setOrigin] = useState<LocationFix | null>(null);
  const [originLabel, setOriginLabel] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const creationLockRef = useRef(false);
  const locationWatchRef = useRef<number | null>(null);
  const [activeSessionVerified, setActiveSessionVerified] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(currentSession?.inviteCode));
  const [sessionCheckFailed, setSessionCheckFailed] = useState(false);
  const [sessionCheckAttempt, setSessionCheckAttempt] = useState(0);
  const dietary = useMemo(
    () => normalizeDietaryPreferences(profile.dietary),
    [profile.dietary],
  );

  const budget = 2 as const;
  const deadlineMin = DEFAULT_QUICK_MATCH_SETTINGS.deadlineMinutes;
  const hasActiveSession = Boolean(
    activeSessionVerified
    && currentSession
    && currentSession.membershipActive !== false
    && isActiveQuickMatchStatus(currentSession.status),
  );
  useEffect(() => {
    localStorage.setItem(QUICK_MATCH_SETTINGS_STORAGE_KEY, JSON.stringify({
      deadlineMinutes: deadlineMin,
      // Kept in the legacy settings shape as the room capacity. The actual
      // party size is whoever is in the lobby when the host starts.
      partySize: QUICK_MATCH_PARTY_SIZE_MAX,
      radius,
      distanceEnabled,
      intent: null,
      tags: [],
      dietary: normalizeDietaryPreferences(dietary),
    }));
  }, [deadlineMin, radius, distanceEnabled, dietary]);

  useEffect(() => () => {
    if (locationWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(locationWatchRef.current);
    }
  }, []);

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

  const applyLocationFix = (fix: LocationFix) => {
    setOrigin(fix);
    setOriginLabel(localityForCoordinate(fix.latitude, fix.longitude));
  };

  const beginLocationWatch = () => {
    if (!navigator.geolocation || locationWatchRef.current !== null) return;
    locationWatchRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => applyLocationFix({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      }),
      () => {
        if (locationWatchRef.current !== null) navigator.geolocation.clearWatch(locationWatchRef.current);
        locationWatchRef.current = null;
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 15_000 },
    );
  };

  const confirmCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const fix = await currentPosition();
      const label = localityForCoordinate(fix.latitude, fix.longitude);
      applyLocationFix(fix);
      beginLocationWatch();
      toast.success(`Live location is on · ${label}`);
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
    else beginLocationWatch();
  };

  const disableDistance = () => {
    setDistanceEnabled(false);
    if (locationWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
    }
  };

  const createAndEnterSession = async () => {
    const categories: string[] = [];
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
        intent: undefined,
      },
      hostName,
      profile.emoji,
      deadlineMin,
    );

    logSessionCreated(session.id, {
      intent: 'auto',
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
      <main className="mx-auto max-w-[480px] px-5 pb-36">
        <QuickMatchCover />

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
              <span className="rounded-lg bg-white px-3 py-2 font-semibold text-[#565256]">📍 {englishText(formatRadius(currentSession.filters.radius))}</span>
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
          <section
            aria-label="Quick Match search area"
            className="overflow-hidden rounded-[20px] border border-[#E4D7D3] bg-white shadow-[0_12px_30px_rgba(73,43,36,0.09)]"
          >
            <header className="flex items-center gap-3 px-4 py-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FBECE9] text-[#AA1A0D]">
                <MapPin size={17} strokeWidth={2.5} />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-[13px] font-black text-[#26232A]">Search Area</strong>
                <span className="mt-0.5 block truncate text-[10px] font-semibold text-[#8A8184]">
                  {originLabel ?? 'Set your live location'}
                </span>
              </span>
              <button
                type="button"
                onClick={disableDistance}
                aria-pressed={!distanceEnabled}
                className={`min-h-8 shrink-0 rounded-full border px-2.5 text-[9px] font-black transition-colors ${!distanceEnabled ? 'border-[#AA1A0D] bg-[#AA1A0D] text-white' : 'border-[#EACCC6] bg-[#FFF5F2] text-[#AA1A0D]'}`}
              >
                No Radius
              </button>
              <button
                type="button"
                onClick={() => void confirmCurrentLocation().catch(() => undefined)}
                disabled={isLocating}
                aria-label={origin ? 'Refresh Location' : 'Find My Location'}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#F5F4F5] text-[#AA1A0D] transition-colors active:bg-[#FBECE9] disabled:opacity-50"
              >
                <Navigation size={14} fill={origin ? 'currentColor' : 'none'} />
              </button>
            </header>

            <QuickMatchRadiusMap
              center={origin ? { lat: origin.latitude, lng: origin.longitude } : null}
              radiusMetres={radius}
              distanceEnabled={distanceEnabled}
              restaurants={restaurants}
              isLoadingRestaurants={isLoading && restaurants.length === 0}
              isLocating={isLocating}
              onRequestLocation={() => void confirmCurrentLocation().catch(() => undefined)}
              embedded
            />

            <div className="bg-white px-4 pb-4 pt-3.5">
              <DistanceRuler radius={radius} onChange={selectRadius} />
              <p className="mt-2 flex items-center gap-1.5 px-1 text-[10px] font-semibold leading-relaxed text-[#706B6F]">
                <span className={`size-1.5 shrink-0 rounded-full ${origin ? 'bg-[#39A96B]' : 'bg-[#C6BFC1]'}`} aria-hidden="true" />
                {englishText(origin
                  ? `Current location · ${originLabel ?? "Near your location"}${distanceEnabled ? ` · ${formatRadius(radius)} radius` : " · No radius limit"}`
                  : distanceEnabled
                    ? "Enable location to use your selected radius."
                    : "Get recommendations without location permission.")}
              </p>
            </div>
          </section>
        </Card>

      </main>

      {createPortal(
        <footer
          aria-label="Quick Match primary action"
          className="fixed bottom-[var(--lm-tab-bar-height)] left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-[#E8E6E7] bg-[#FCFCFC]/95 px-5 py-4 shadow-[0_-8px_24px_rgba(45,31,27,0.08)] backdrop-blur"
        >
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
        </footer>,
        document.body,
      )}

    </div>
  );
}
