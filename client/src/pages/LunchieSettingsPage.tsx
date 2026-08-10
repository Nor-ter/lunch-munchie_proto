/**
 * Lunchie Quick Match — compact settings and session entry.
 * Session persistence remains server-first through AppContext.
 */

import { useEffect, useMemo, useRef, useState, type Dispatch, type PointerEvent as ReactPointerEvent, type ReactNode, type SetStateAction } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useSearch } from 'wouter';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Ruler,
  Sparkles,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import LunchmateCharacterRenderer from '@/components/munchie/LunchmateCharacterRenderer';
import { FOOD_TAGS } from '@/constants/foodTags';
import { lunchmateLoadoutFromProfile } from '@/utils/lunchmateProfile';
import { toast } from 'sonner';
import type { Intent } from '@shared/intent';
import type { LunchmateLoadout } from '@/types/lunchmateCustomization';
import { logSessionCreated } from '@/lib/eventLogger';
import SessionManagementMenu from '@/components/lunchie/SessionManagementMenu';
import {
  DEFAULT_QUICK_MATCH_SETTINGS,
  DIETARY_REQUIREMENTS,
  INGREDIENT_AVOIDANCES,
  QUICK_MATCH_SETTINGS_STORAGE_KEY,
  isActiveQuickMatchStatus,
  normalizeDietaryPreferences,
  normalizeQuickMatchSettings,
} from '@/lib/quickMatch';

const PREFERENCE_CARDS: { value: Intent | null; label: string; image?: string; color: string }[] = [
  { value: 'cafe', label: 'COFFEE', image: '/assets/characters/quick-match/coffee.png', color: '#FFF0E7' },
  { value: 'meal', label: 'FOODIE', image: '/assets/characters/quick-match/rice.png', color: '#FFE9E4' },
  { value: 'dessert', label: 'DESSERT', image: '/assets/characters/quick-match/dessert.png', color: '#FFE7EC' },
  { value: null, label: 'RANDOM', color: '#FFF4D9' },
];

const DEADLINE_OPTIONS = [5, 10, 15];
const RADIUS_OPTIONS = [1000, 2000, 3000, 4000, 5000];
const GROUP_SIZE_OPTIONS = Array.from({ length: 11 }, (_, index) => index + 2);
const TAG_META: Record<string, { icon: string; hint: string }> = {
  맛집: { icon: '🍽️', hint: '검증된 인기 메뉴' },
  데이트코스: { icon: '💞', hint: '분위기 좋은 곳' },
  혼밥: { icon: '🙋', hint: '혼자서도 편하게' },
  카페: { icon: '☕', hint: '커피와 여유' },
  펍나이트: { icon: '🍻', hint: '퇴근 후 한잔' },
  브런치: { icon: '🥐', hint: '느긋한 한 끼' },
  디저트: { icon: '🍰', hint: '달콤한 마무리' },
  가성비: { icon: '✨', hint: '가격까지 만족' },
};
const tapSpring = { type: 'spring' as const, stiffness: 500, damping: 30 };

function formatRadius(radius: number): string {
  return radius >= 5000 ? '5km+' : `${radius / 1000}km`;
}

function Card({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-[22px] bg-white p-4 shadow-[0_2px_10px_rgba(180,140,130,0.10)]">
      {children}
    </section>
  );
}

function CardTitle({ icon, children, badge }: { icon: ReactNode; children: ReactNode; badge?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-[#26232A]">
      <span className="text-[#F4515E]">{icon}</span>
      <span>{children}</span>
      {badge && <span className="ml-auto rounded-full bg-[#FFE4E3] px-2.5 py-1 text-[11px] text-[#DB3C49]">{badge}</span>}
    </div>
  );
}

function ChoiceChip({ selected, onClick, children, className = '' }: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.93 }}
      transition={tapSpring}
      className={`min-h-9 rounded-xl px-3 text-[12px] font-bold transition-colors ${
        selected ? 'bg-[#F4515E] text-white' : 'bg-[#F4F2F2] text-[#6E686C]'
      } ${className}`}
    >
      {children}
    </motion.button>
  );
}

function DeadlineDial({ minutes, onChange }: { minutes: number; onChange: (minutes: number) => void }) {
  const radius = 70;
  const center = 88;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(minutes, 15) / 15;
  const updateFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    let angle = Math.atan2(y, x) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;
    const ratio = angle / (Math.PI * 2);
    onChange(ratio < 0.025 ? 15 : Math.max(1, Math.min(15, Math.ceil(ratio * 15))));
  };
  const handleAngle = progress * Math.PI * 2 - Math.PI / 2;
  const handleX = center + radius * Math.cos(handleAngle);
  const handleY = center + radius * Math.sin(handleAngle);
  return (
    <div
      className="relative size-44 shrink-0 cursor-grab touch-none select-none rounded-full outline-none active:cursor-grabbing focus-visible:ring-4 focus-visible:ring-[#F4515E]/25"
      role="slider"
      tabIndex={0}
      aria-label="마감 시간"
      aria-valuemin={1}
      aria-valuemax={15}
      aria-valuenow={minutes}
      aria-valuetext={`${minutes}분`}
      onPointerDown={event => {
        event.currentTarget.setPointerCapture(event.pointerId);
        updateFromPointer(event);
      }}
      onPointerMove={event => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) updateFromPointer(event);
      }}
      onPointerUp={event => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onKeyDown={event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
          event.preventDefault();
          onChange(Math.min(15, minutes + 1));
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
          event.preventDefault();
          onChange(Math.max(1, minutes - 1));
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
          stroke="#F4515E"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${center} ${center})`}
          className="transition-[stroke-dashoffset] duration-200"
        />
        <circle cx={handleX} cy={handleY} r="9" fill="white" stroke="#F4515E" strokeWidth="5" />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <strong className="text-[30px] leading-none text-[#26232A]">{minutes} <span className="text-[17px]">min</span></strong>
        <span className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#A6A0A3]">Deadline</span>
      </div>
    </div>
  );
}

function GroupSizeRuler({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const stepWidth = 48;
  const selectedIndex = Math.max(0, GROUP_SIZE_OPTIONS.indexOf(value));
  const dragRef = useRef<{ pointerId: number; startX: number; startIndex: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rawIndex = drag.startIndex - (event.clientX - drag.startX) / stepWidth;
    const nextIndex = Math.max(0, Math.min(GROUP_SIZE_OPTIONS.length - 1, Math.round(rawIndex)));
    onChange(GROUP_SIZE_OPTIONS[nextIndex]!);
    setDragOffset(0);
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div>
      <p className="text-center text-[28px] font-black tracking-[-0.6px] text-[#F4515E]">{value} people</p>
      <div
        className="relative mt-3 h-[106px] w-full touch-none overflow-hidden rounded-[18px] bg-[#FFF8F6] outline-none focus-visible:ring-2 focus-visible:ring-[#F4515E] focus-visible:ring-offset-2"
        role="slider"
        tabIndex={0}
        aria-label="Group size"
        aria-valuemin={2}
        aria-valuemax={12}
        aria-valuenow={value}
        aria-valuetext={`${value} people`}
        onKeyDown={event => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            event.preventDefault();
            onChange(Math.min(12, value + 1));
          }
          if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            event.preventDefault();
            onChange(Math.max(2, value - 1));
          }
        }}
        onPointerDown={event => {
          if (event.target instanceof HTMLElement && event.target.closest('button')) return;
          dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startIndex: selectedIndex };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          const minOffset = -(GROUP_SIZE_OPTIONS.length - 1 - drag.startIndex) * stepWidth;
          const maxOffset = drag.startIndex * stepWidth;
          setDragOffset(Math.max(minOffset, Math.min(maxOffset, event.clientX - drag.startX)));
        }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center" aria-hidden="true">
          <span className="h-5 w-0.5 bg-[#F4515E]" />
          <span className="h-0 w-0 border-x-[6px] border-t-[7px] border-x-transparent border-t-[#F4515E]" />
        </div>
        <div
          className={`absolute left-1/2 top-7 flex ${dragRef.current ? '' : 'transition-transform duration-200 ease-out'}`}
          style={{ transform: `translate3d(${-(selectedIndex * stepWidth + stepWidth / 2) + dragOffset}px, 0, 0)` }}
        >
          {GROUP_SIZE_OPTIONS.map(option => (
            <button
              key={option}
              type="button"
              onClick={event => {
                event.stopPropagation();
                onChange(option);
              }}
              className="flex w-12 shrink-0 flex-col items-center gap-1.5 pt-2"
              tabIndex={-1}
              aria-label={`${option} people`}
            >
              <span className={`h-6 w-0.5 rounded-full ${option === value ? 'bg-[#F4515E]' : 'bg-[#D9CECA]'}`} />
              <span className={`text-[14px] font-black ${option === value ? 'text-[#F4515E]' : 'text-[#857B7F]'}`}>{option}</span>
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-[#FFF8F6] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#FFF8F6] to-transparent" />
      </div>
      <p className="mt-2 text-center text-[10px] font-semibold text-[#A6A0A3]">Drag the ruler, tap a number, or use the arrow keys.</p>
    </div>
  );
}

function DeadlineMinuteInput({ minutes, onChange }: { minutes: number; onChange: (minutes: number) => void }) {
  const [draft, setDraft] = useState(String(minutes));

  useEffect(() => setDraft(String(minutes)), [minutes]);

  const commit = () => {
    const parsed = Number.parseInt(draft, 10);
    const next = Number.isFinite(parsed) ? Math.max(1, Math.min(15, parsed)) : minutes;
    onChange(next);
    setDraft(String(next));
  };

  return (
    <label className="mt-2 flex min-h-10 items-center rounded-[14px] bg-[#F5F3F3] px-3">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={15}
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={event => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          className="min-w-0 flex-1 bg-transparent text-left text-[12px] font-extrabold text-[#403A3D] outline-none"
          aria-label="마감 분 직접 입력"
        />
        <span className="text-[10px] font-bold text-[#AAA3A6]">분 직접입력</span>
    </label>
  );
}

function IngredientAvoidancePicker({ selected, onToggle }: { selected: string[]; onToggle: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const selectedLabels = INGREDIENT_AVOIDANCES.filter(option => selected.includes(option.value)).map(option => option.label);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
        aria-controls="dietary-exclusion-menu"
        className={`flex min-h-11 w-full items-center rounded-[12px] border px-3 text-left transition-colors ${selectedLabels.length ? 'border-[#55A964] bg-[#EDF8EE]' : 'border-transparent bg-[#F8F5F3]'}`}
      >
        <span className="mr-2 text-base">🚫</span>
        <strong className="text-[11px] text-[#514A4D]">Ingredients to avoid</strong>
        <span className="ml-2 min-w-0 flex-1 truncate text-[10px] font-semibold text-[#7B7276]">
          {selectedLabels.length ? selectedLabels.join(', ') : 'No ingredients selected'}
        </span>
        {selectedLabels.length > 0 && <span className="mr-2 rounded-full bg-[#55A964] px-1.5 py-0.5 text-[9px] font-bold text-white">{selectedLabels.length}</span>}
        <ChevronDown size={15} className={`shrink-0 text-[#8A8084] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id="dietary-exclusion-menu" className="mt-1 max-h-[156px] overflow-y-auto rounded-[14px] border border-[#E8DFDC] bg-white p-1.5 shadow-[0_10px_24px_rgba(92,69,62,0.14)]">
          {INGREDIENT_AVOIDANCES.map(option => {
            const isSelected = selected.includes(option.value);
            return (
              <button
                key={option.label}
                type="button"
                onClick={() => onToggle(option.value)}
                aria-pressed={isSelected}
                className={`flex min-h-10 w-full items-center rounded-[10px] px-2.5 text-left ${isSelected ? 'bg-[#EDF8EE]' : 'hover:bg-[#F8F5F3]'}`}
              >
                <span className="mr-2 text-base">{option.icon}</span>
                <span className="text-[11px] font-bold text-[#514A4D]">{option.label}</span>
                <span className={`ml-auto flex size-4 items-center justify-center rounded border ${isSelected ? 'border-[#55A964] bg-[#55A964] text-white' : 'border-[#D8CFCC] text-transparent'}`}><Check size={10} strokeWidth={3} /></span>
              </button>
            );
          })}
        </div>
      )}
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
      className={`relative min-w-0 overflow-hidden rounded-[18px] border-2 px-2 pb-3 pt-2 transition-all ${
        selected
          ? 'border-[#F4515E] bg-white shadow-[0_8px_20px_rgba(244,81,94,0.18)]'
          : 'border-transparent bg-[#FAF7F5]'
      }`}
      aria-pressed={selected}
    >
      {selected && (
        <span className="absolute right-2 top-2 z-10 flex size-5 items-center justify-center rounded-full bg-[#F4515E] text-white">
          <Check size={13} strokeWidth={3} />
        </span>
      )}
      <span className="relative mx-auto flex aspect-square w-full max-w-[76px] items-center justify-center rounded-[16px]" style={{ background: option.color }}>
        {option.image ? (
          <img src={option.image} alt="" className="h-[72px] w-[72px] object-contain" draggable={false} />
        ) : (
          <span className="flex size-14 items-center justify-center rounded-full border-2 border-dashed border-[#F2B944] bg-white/80 text-[#E7A71E]">
            <CircleHelp size={34} strokeWidth={2.4} />
          </span>
        )}
      </span>
      <span className="relative z-10 mt-1.5 block text-[10px] font-black tracking-[0.8px] text-[#F4515E]">{option.label}</span>
      {selected && <span className="absolute bottom-1.5 left-[18%] z-0 h-2 w-[64%] -rotate-2 rounded-full bg-[#FFD5D1] opacity-80" />}
    </motion.button>
  );
}

function DistanceRuler({ radius, onChange, loadout }: { radius: number; onChange: (value: number) => void; loadout: LunchmateLoadout }) {
  const selectedIndex = RADIUS_OPTIONS.indexOf(radius);
  const progress = selectedIndex / (RADIUS_OPTIONS.length - 1) * 100;
  const previousIndexRef = useRef(selectedIndex);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const walkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [walkDirection, setWalkDirection] = useState<'left' | 'right' | null>(null);
  const [walkFrame, setWalkFrame] = useState<1 | 2>(1);

  useEffect(() => {
    const previousIndex = previousIndexRef.current;
    previousIndexRef.current = selectedIndex;
    if (previousIndex === selectedIndex) return;

    setWalkDirection(selectedIndex > previousIndex ? 'right' : 'left');
    setWalkFrame(frame => frame === 1 ? 2 : 1);
    if (walkTimerRef.current) clearInterval(walkTimerRef.current);
    walkTimerRef.current = setInterval(() => setWalkFrame(frame => frame === 1 ? 2 : 1), 140);
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => {
      if (walkTimerRef.current) clearInterval(walkTimerRef.current);
      walkTimerRef.current = null;
      setWalkDirection(null);
      setWalkFrame(1);
    }, 520);
  }, [selectedIndex]);

  useEffect(() => () => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    if (walkTimerRef.current) clearInterval(walkTimerRef.current);
  }, []);

  const chickenAsset = walkDirection
    ? `side-walk-${walkDirection}-${walkFrame}` as const
    : 'idle' as const;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-[13px] font-extrabold text-[#26232A]">
        <Ruler size={17} className="text-[#F4515E]" />
        거리
        <strong className="ml-auto text-[15px] text-[#F4515E]">{formatRadius(radius)}</strong>
      </div>
      <div className="relative mx-1 h-[100px] rounded-[18px] bg-[#FFF8F6] px-6 pt-4">
        <div className="absolute left-5 right-5 top-[54px] h-1 rounded-full bg-[#E9DEDA]" />
        <div className="absolute left-5 top-[54px] h-1 rounded-full bg-[#F4515E] transition-[width]" style={{ width: `calc((100% - 40px) * ${progress / 100})` }} />
        <div className="absolute left-5 right-5 top-[47px] flex justify-between" aria-hidden="true">
          {Array.from({ length: 17 }, (_, index) => (
            <span key={index} className={`w-[2px] rounded-full bg-[#CBBDB8] ${index % 4 === 0 ? 'h-4' : 'h-2.5 opacity-75'}`} />
          ))}
        </div>
        <motion.span
          className="pointer-events-none absolute top-[2px] z-10 flex -translate-x-1/2 flex-col items-center"
          animate={{ left: `calc(20px + (100% - 40px) * ${progress / 100})` }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          aria-hidden="true"
        >
          <span className="flex size-12 items-center justify-center overflow-hidden rounded-full border-2 border-[#F4515E] bg-white shadow-[0_4px_12px_rgba(244,81,94,0.22)]">
            <LunchmateCharacterRenderer
              flowState="idle"
              loadout={loadout}
              size={42}
              renderSize="compact"
              artwork="chicken"
              chickenAssetKeyOverride={chickenAsset}
              chickenFaceSystem={!walkDirection}
              animated={false}
              alt={`검색 거리 ${formatRadius(radius)}를 가리키는 런치킨`}
            />
          </span>
          <span className="h-3 w-0.5 bg-[#F4515E]" />
        </motion.span>
        <input
          type="range"
          min={0}
          max={RADIUS_OPTIONS.length - 1}
          step={1}
          value={selectedIndex}
          onChange={event => onChange(RADIUS_OPTIONS[Number(event.target.value)]!)}
          className="lunchie-distance-range absolute inset-x-5 top-[27px] z-20 h-14 opacity-[0.01]"
          aria-label="검색 거리"
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
              {formatRadius(option)}
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
  const { createSession, startSession, fetchSession, currentSession, setCurrentSession, restaurants, profile } = useApp();
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
  const [partySize, setPartySize] = useState(storedSettings.partySize);
  const [togetherPartySize, setTogetherPartySize] = useState(storedSettings.togetherPartySize);
  const [radius, setRadius] = useState(storedSettings.radius);
  const [intent, setIntent] = useState<Intent | null>(initialIntent ?? storedSettings.intent);
  const [tags, setTags] = useState<string[]>(storedSettings.tags);
  const [dietary, setDietary] = useState<string[]>(storedSettings.dietary);
  const [isCreating, setIsCreating] = useState(false);
  const creationLockRef = useRef(false);
  const [activeSessionVerified, setActiveSessionVerified] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(currentSession?.inviteCode));
  const [sessionCheckFailed, setSessionCheckFailed] = useState(false);
  const [sessionCheckAttempt, setSessionCheckAttempt] = useState(0);
  const lunchmateLoadout = useMemo(
    () => lunchmateLoadoutFromProfile(profile.lunchmateLoadout),
    [profile.lunchmateLoadout],
  );

  const isSolo = partySize === 1;
  const budget = 2 as const;
  const chosenCount = tags.length + dietary.length + 1;
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
      partySize,
      togetherPartySize,
      radius,
      intent,
      tags,
      dietary: normalizeDietaryPreferences(dietary),
    }));
  }, [deadlineMin, partySize, togetherPartySize, radius, intent, tags, dietary]);

  useEffect(() => {
    const token = currentSession?.inviteCode;
    if (!token) {
      setActiveSessionVerified(false);
      setIsCheckingSession(false);
      setSessionCheckFailed(false);
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
  }, [currentSession?.inviteCode, fetchSession, sessionCheckAttempt, setCurrentSession]);

  const toggleMany = (value: string, setter: Dispatch<SetStateAction<string[]>>) => {
    setter(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  };

  const selectSolo = () => {
    if (partySize > 1) setTogetherPartySize(partySize);
    setPartySize(1);
  };

  const selectTogether = () => setPartySize(Math.max(2, togetherPartySize));

  const setGroupSize = (next: number) => {
    const normalized = Math.max(2, Math.min(12, Math.round(next)));
    setPartySize(normalized);
    setTogetherPartySize(normalized);
  };

  const handleStart = async () => {
    if (creationLockRef.current || isCheckingSession || sessionCheckFailed) return;
    creationLockRef.current = true;
    if (hasActiveSession && currentSession) {
      setIsCreating(true);
      try {
        const activeSession = await fetchSession(currentSession.inviteCode);
        if (activeSession.membershipActive !== false && isActiveQuickMatchStatus(activeSession.status)) {
          const isWaiting = activeSession.status === 'waiting';
          toast.info(isWaiting ? '진행 중인 대기방으로 이동합니다.' : '진행 중인 투표로 이동합니다.');
          navigate(isWaiting ? '/session/lobby' : '/lunchie/swipe');
          creationLockRef.current = false;
          return;
        }
        // A locally cached session can outlive its server record. Clear only
        // that stale cache before creating a replacement session.
        setCurrentSession(null);
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status !== 404 && status !== 410) {
          toast.error('We could not verify the current Quick Match. Please try again.');
          setIsCreating(false);
          creationLockRef.current = false;
          return;
        }
        setCurrentSession(null);
      }
    }

    setIsCreating(true);
    try {
      const categories = tags.filter(tag => realCategories.has(tag));
      const hostName = profile.name && profile.name !== '사용자' ? profile.name : '호스트';
      const session = await createSession(
        `${hostName}의 점심 세션`,
        { partySize, dietary, budget, radius, categories, intent: intent ?? undefined },
        hostName,
        profile.emoji,
        deadlineMin,
      );

      logSessionCreated(session.id, {
        intent: intent ?? 'auto',
        party_size: partySize,
        radius_m: radius,
        budget,
        dietary_count: dietary.length,
        category_count: categories.length,
        deadline_minutes: deadlineMin,
      });

      if (isSolo) {
        await startSession(session.inviteCode, deadlineMin);
        toast.success('Quick Match를 시작합니다.');
        navigate('/lunchie/swipe');
      } else {
        toast.success('세션이 만들어졌어요. 친구를 초대해 보세요.');
        navigate('/session/lobby');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '세션 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
      creationLockRef.current = false;
    }
  };

  return (
    <div className="min-h-dvh bg-[#FFF6F2] pb-6">
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-[#FFF6F2]/95 px-5 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur">
        <motion.button
          type="button"
          onClick={() => navigate('/')}
          whileTap={{ scale: 0.9 }}
          className="flex size-9 items-center justify-center rounded-full bg-white shadow-sm"
          aria-label="홈으로 돌아가기"
        >
          <ArrowLeft size={17} />
        </motion.button>
        <div>
          <h1 className="text-[19px] font-extrabold leading-none tracking-[-0.4px] text-[#F4515E]">Lunchie</h1>
          <p className="mt-1 text-[10px] font-bold tracking-[0.7px] text-[#9B959A]">QUICK MATCH</p>
        </div>
        <div className="ml-auto flex rounded-full bg-white p-[3px] shadow-sm" aria-label="식사 인원 모드">
          <button type="button" onClick={selectSolo} className={`rounded-full px-4 py-1.5 text-[13px] font-bold ${isSolo ? 'bg-[#F4515E] text-white' : 'text-[#9B959A]'}`}>혼자</button>
          <button type="button" onClick={selectTogether} className={`rounded-full px-4 py-1.5 text-[13px] font-bold ${!isSolo ? 'bg-[#F4515E] text-white' : 'text-[#9B959A]'}`}>같이</button>
        </div>
      </header>

      <main className="mx-auto max-w-[480px] space-y-3 px-4 pb-32">
        {sessionCheckFailed && currentSession && (
          <section role="alert" className="rounded-[20px] border border-[#F2C6C1] bg-white p-4 shadow-sm">
            <h2 className="text-[14px] font-black text-[#302B2E]">We couldn’t check your Quick Match</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-[#7C7276]">Your saved session is still here. Retry before creating another one.</p>
            <button type="button" onClick={() => setSessionCheckAttempt(attempt => attempt + 1)} className="mt-3 min-h-10 rounded-xl bg-[#F4515E] px-4 text-[12px] font-bold text-white">Try again</button>
          </section>
        )}
        {hasActiveSession && currentSession && (
          <section className="rounded-[22px] border border-[#F5B8B4] bg-[#FFFCFA] p-4 shadow-[0_8px_24px_rgba(180,100,90,0.10)]" aria-label="Quick Match in progress">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[15px] font-black text-[#26232A]">Quick Match in progress</h2>
                  <span className="rounded-full bg-[#FFF0EE] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#D83D49]">
                    {currentSession.status === 'waiting' ? 'Waiting' : currentSession.status === 'choosing' ? 'Choosing' : 'Voting'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-semibold text-[#8A8084]">Server-verified and ready to resume.</p>
              </div>
              <SessionManagementMenu onEnded={() => navigate('/lunchie/settings')} className="text-[#6F6468]" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <span className="rounded-xl bg-[#FFF6F2] px-3 py-2 font-bold text-[#645A5E]">👥 {currentSession.members.length}/{currentSession.filters.partySize} people</span>
              <span className="rounded-xl bg-[#FFF6F2] px-3 py-2 font-bold text-[#645A5E]">⏱ {currentSession.deadlineMinutes ?? deadlineMin} min</span>
              <span className="rounded-xl bg-[#FFF6F2] px-3 py-2 font-bold text-[#645A5E]">📍 {formatRadius(currentSession.filters.radius)}</span>
              <span className="rounded-xl bg-[#FFF6F2] px-3 py-2 font-bold text-[#645A5E]">{currentSession.filters.partySize === 1 ? '🙋 Solo' : '🤝 Group'}</span>
            </div>
            <button
              type="button"
              onClick={() => navigate(currentSession.status === 'waiting' ? '/session/lobby' : '/lunchie/swipe')}
              className="mt-3 min-h-11 w-full rounded-[14px] bg-[#F4515E] px-4 text-[13px] font-black text-white outline-none transition-transform active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#F4515E] focus-visible:ring-offset-2"
            >
              {currentSession.status === 'waiting' ? 'Return to lobby' : 'Continue Quick Match'}
            </button>
          </section>
        )}

        <Card>
          <CardTitle icon={<Clock3 size={16} />}>마감</CardTitle>
          <div className="flex flex-col items-center">
            <DeadlineDial minutes={deadlineMin} onChange={setDeadlineMin} />
            <div className="mt-4 w-full max-w-[330px] min-w-0">
              <div className="grid grid-cols-3 gap-1.5">
                {DEADLINE_OPTIONS.map(minutes => (
                  <ChoiceChip key={minutes} selected={deadlineMin === minutes} onClick={() => setDeadlineMin(minutes)} className="min-h-10 px-1">{minutes} min</ChoiceChip>
                ))}
              </div>
              <DeadlineMinuteInput minutes={deadlineMin} onChange={setDeadlineMin} />
            </div>
          </div>
          <p className="mt-2 text-center text-[9px] font-semibold text-[#A6A0A3]">다이얼을 돌리거나 1–15분 사이로 직접 입력해요</p>
        </Card>

        {!isSolo && (
          <Card>
            <div className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-[#26232A]">
              <Users size={17} className="text-[#F4515E]" />
              <span>인원</span>
              <span className="ml-auto text-[10px] font-bold text-[#9B959A]">함께 먹을 정원</span>
            </div>
            <GroupSizeRuler value={partySize} onChange={setGroupSize} />
          </Card>
        )}

        <Card>
          <DistanceRuler radius={radius} onChange={setRadius} loadout={lunchmateLoadout} />
        </Card>

        <Card>
          <CardTitle icon={<UtensilsCrossed size={16} />} badge={`${chosenCount} 선택`}>오늘의 Quick Match</CardTitle>
          <p className="-mt-1 mb-3 text-[11px] font-semibold text-[#A6A0A3]">끌리는 카드를 한 장 골라주세요</p>
          <div className="grid grid-cols-4 gap-2">
            {PREFERENCE_CARDS.map(option => (
              <PreferenceCard key={option.label} option={option} selected={intent === option.value} onClick={() => setIntent(option.value)} />
            ))}
          </div>

          <div className="my-4 h-px bg-[#F0EAE8]" />
          <div className="mb-2 flex items-center gap-2">
            <Sparkles size={15} className="text-[#F4515E]" />
            <p className="text-[12px] font-extrabold text-[#524B4F]">어떤 분위기인가요?</p>
            <span className="ml-auto text-[10px] font-bold text-[#A6A0A3]">여러 개 선택 가능</span>
          </div>
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
                  className={`flex min-h-[58px] items-center gap-2 rounded-[15px] border px-3 text-left transition-all ${selected ? 'border-[#F4515E] bg-[#FFF0EE]' : 'border-[#EEE7E4] bg-white'}`}
                >
                  <span className="text-xl">{meta?.icon}</span>
                  <span className="min-w-0">
                    <strong className="block text-[12px] text-[#3E373B]">{tag}</strong>
                    <span className="block truncate text-[9px] font-semibold text-[#A39A9E]">{meta?.hint}</span>
                  </span>
                  <span className={`ml-auto flex size-4 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-[#F4515E] bg-[#F4515E] text-white' : 'border-[#D9D0CD] text-transparent'}`}><Check size={10} strokeWidth={3} /></span>
                </motion.button>
              );
            })}
          </div>

          <div className="my-3 h-px bg-[#F0EAE8]" />
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[12px] font-extrabold text-[#524B4F]">Dietary requirements</p>
            <button
              type="button"
              onClick={() => setDietary(current => current.filter(value => !DIETARY_REQUIREMENTS.some(option => option.value === value)))}
              className="min-h-9 rounded-lg px-2 text-[10px] font-bold text-[#C43B47] outline-none focus-visible:ring-2 focus-visible:ring-[#F4515E]"
            >
              Clear requirements
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {DIETARY_REQUIREMENTS.map(option => {
              const selected = dietary.includes(option.value);
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => toggleMany(option.value, setDietary)}
                  aria-pressed={selected}
                  className={`flex min-h-11 w-full items-center rounded-[12px] px-2.5 text-left transition-colors ${selected ? 'bg-[#EDF8EE]' : 'bg-[#F8F5F3] hover:bg-[#F1ECE9]'}`}
                >
                  <span className="mr-2 text-base">{option.icon}</span>
                  <span className="truncate text-[11px] font-bold text-[#514A4D]">{option.label}</span>
                  <span className={`ml-auto flex size-4 shrink-0 items-center justify-center rounded border ${selected ? 'border-[#55A964] bg-[#55A964] text-white' : 'border-[#D8CFCC] bg-white text-transparent'}`}><Check size={10} strokeWidth={3} /></span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 border-t border-[#F0EAE8] pt-3">
            <IngredientAvoidancePicker selected={dietary} onToggle={value => toggleMany(value, setDietary)} />
            <p className="mt-2 px-1 text-[9px] font-semibold leading-relaxed text-[#9A9094]">
              Menu data helps filter choices. For severe allergies, please confirm ingredients and cross-contamination with the venue.
            </p>
          </div>
        </Card>

        <div className="pb-3 pt-1">
          <motion.button
            type="button"
            onClick={() => void handleStart()}
            disabled={isCreating || isCheckingSession || sessionCheckFailed}
            whileTap={{ scale: 0.98 }}
            className="lunchie-session-primary-action w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCheckingSession
              ? 'Checking current session…'
              : isCreating
              ? '준비하는 중…'
              : hasActiveSession && currentSession
                ? currentSession.status === 'waiting' ? '대기방으로 돌아가기' : '투표 계속하기'
                : isSolo ? 'Swipe 시작하기' : '세션 만들고 초대하기'}
          </motion.button>
        </div>
      </main>
    </div>
  );
}
