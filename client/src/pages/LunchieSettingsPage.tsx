/**
 * Lunchie Quick Match — compact settings and session entry.
 * Session persistence remains server-first through AppContext.
 */

import { useEffect, useId, useMemo, useRef, useState, type Dispatch, type PointerEvent as ReactPointerEvent, type ReactNode, type SetStateAction } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useSearch } from 'wouter';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Clock3,
  Minus,
  Plus,
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

const PREFERENCE_CARDS: { value: Intent | null; label: string; image?: string; color: string }[] = [
  { value: 'cafe', label: 'COFFEE', image: '/assets/characters/quick-match/coffee.png', color: '#FFF0E7' },
  { value: 'meal', label: 'FOODIE', image: '/assets/characters/quick-match/rice.png', color: '#FFE9E4' },
  { value: 'dessert', label: 'DESSERT', image: '/assets/characters/quick-match/dessert.png', color: '#FFE7EC' },
  { value: null, label: 'RANDOM', color: '#FFF4D9' },
];

const DEADLINE_OPTIONS = [5, 10, 15];
const RADIUS_OPTIONS = [1000, 2000, 3000, 4000, 5000];
const DIETARY_OPTIONS = [
  { label: 'Vegan', value: '비건', icon: '🌱' },
  { label: 'Vegetarian', value: '채식', icon: '🥬' },
  { label: 'Gluten-Free', value: '글루텐프리', icon: '🌾' },
  { label: 'Halal', value: '할랄', icon: '🌙' },
  { label: 'Carnivore', value: '육식', icon: '🥩' },
  { label: 'Small Appetite', value: 'Small Appetite', icon: '🍽️' },
  { label: 'Buffet', value: 'Buffet', icon: '♨️' },
  { label: 'Asian', value: 'Asian', icon: '🥢' },
];
const DIETARY_EXCLUSIONS = [
  { label: 'Beef', value: 'No Beef', icon: '🐄' },
  { label: 'Seafood', value: '해산물 제외', icon: '🐟' },
  { label: 'Lamb', value: 'No Lamb', icon: '🐑' },
  { label: 'Pork', value: 'No Pork', icon: '🐖' },
  { label: 'Nuts', value: 'No Nuts', icon: '🥜' },
];
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
  const gradientId = useId();
  const [now, setNow] = useState(() => Date.now());
  const [draftMinutes, setDraftMinutes] = useState(String(minutes));
  const radius = 96;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(minutes, 15) / 15;

  useEffect(() => {
    const updateClock = () => setNow(Date.now());
    window.addEventListener('focus', updateClock);
    const interval = window.setInterval(updateClock, 30_000);
    return () => {
      window.removeEventListener('focus', updateClock);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => setDraftMinutes(String(minutes)), [minutes]);

  const commitDraftMinutes = () => {
    const parsed = Number.parseInt(draftMinutes, 10);
    const next = Number.isFinite(parsed) ? Math.max(1, Math.min(15, parsed)) : minutes;
    onChange(next);
    setDraftMinutes(String(next));
  };

  const deadlineLabel = useMemo(() => {
    const deadline = new Date(now + minutes * 60_000);
    return deadline.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }, [minutes, now]);

  const updateFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    let angle = Math.atan2(y, x) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;
    const ratio = angle / (Math.PI * 2);
    onChange(Math.max(1, Math.min(15, Math.ceil(ratio * 15))));
  };

  return (
    <div className="flex w-full flex-col items-center">
      <div className="text-center" aria-live="polite">
        <div className="flex items-baseline justify-center text-[#211E20]">
          <strong className="text-[58px] font-medium leading-[0.95] tracking-[-4px] tabular-nums">{minutes}</strong>
          <span className="ml-1 text-[34px] font-medium leading-none">분</span>
        </div>
        <div className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-[13px] bg-[#F5F3F3] px-4 text-[#4F494C]">
          <Clock3 size={17} strokeWidth={2.4} aria-hidden="true" />
          <span className="text-[13px] font-extrabold tabular-nums">{deadlineLabel} 종료</span>
        </div>
      </div>

      <div
        className="relative mt-3 size-[236px] shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
        role="slider"
        tabIndex={0}
        aria-label="마감 시간"
        aria-valuemin={1}
        aria-valuemax={15}
        aria-valuenow={minutes}
        aria-valuetext={`${minutes}분, ${deadlineLabel} 종료`}
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
        onPointerCancel={event => {
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
          if (event.key === 'Home') onChange(1);
          if (event.key === 'End') onChange(15);
        }}
      >
        <svg viewBox="0 0 236 236" className="size-full drop-shadow-[0_8px_14px_rgba(72,47,55,0.08)]" aria-hidden="true">
          <defs>
            <linearGradient id={gradientId} x1="34" y1="24" x2="207" y2="74" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8F297F" />
              <stop offset="0.52" stopColor="#D93687" />
              <stop offset="1" stopColor="#FF5B78" />
            </linearGradient>
          </defs>
          <circle cx="118" cy="118" r={radius} fill="#FFFFFF" stroke="#F1EEEE" strokeWidth="10" />
          <circle
            cx="118"
            cy="118"
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            transform="rotate(-90 118 118)"
            className="transition-[stroke-dashoffset] duration-200"
          />
          {Array.from({ length: 30 }, (_, index) => {
            const angle = (index / 30) * Math.PI * 2 - Math.PI / 2;
            const innerRadius = index % 5 === 0 ? 70 : 76;
            const outerRadius = 84;
            return (
              <line
                key={index}
                x1={118 + Math.cos(angle) * innerRadius}
                y1={118 + Math.sin(angle) * innerRadius}
                x2={118 + Math.cos(angle) * outerRadius}
                y2={118 + Math.sin(angle) * outerRadius}
                stroke="#2D292B"
                strokeWidth={index % 5 === 0 ? 4 : 3}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="pointer-events-auto flex min-h-14 w-[130px] items-stretch overflow-hidden rounded-[17px] bg-[#F5F3F3] shadow-[inset_0_0_0_1px_rgba(70,55,60,0.03)]"
            onPointerDown={event => event.stopPropagation()}
          >
            <label className="flex min-w-0 flex-1 items-center pl-4">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={15}
                step={1}
                value={draftMinutes}
                onChange={event => {
                  const value = event.target.value;
                  setDraftMinutes(value);
                  const parsed = Number.parseInt(value, 10);
                  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 15) onChange(parsed);
                }}
                onBlur={commitDraftMinutes}
                onKeyDown={event => {
                  event.stopPropagation();
                  if (event.key === 'Enter') event.currentTarget.blur();
                }}
                className="w-10 appearance-none bg-transparent text-center text-[24px] font-black leading-none tabular-nums text-[#2D292B] outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                aria-label="마감 분 직접 입력"
              />
              <span className="ml-1 text-[12px] font-extrabold text-[#91898D]">분</span>
            </label>
            <div className="flex w-9 shrink-0 flex-col border-l border-[#E7E1E3]">
              <button
                type="button"
                onClick={() => onChange(Math.min(15, minutes + 1))}
                disabled={minutes >= 15}
                className="flex flex-1 items-center justify-center text-[#5D565A] transition-colors hover:bg-white/70 disabled:text-[#CFC8CB]"
                aria-label="마감 시간 1분 늘리기"
              >
                <ChevronUp size={15} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => onChange(Math.max(1, minutes - 1))}
                disabled={minutes <= 1}
                className="flex flex-1 items-center justify-center border-t border-[#E7E1E3] text-[#5D565A] transition-colors hover:bg-white/70 disabled:text-[#CFC8CB]"
                aria-label="마감 시간 1분 줄이기"
              >
                <ChevronDown size={15} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
        <span
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-[#FF5B78] shadow-[0_2px_6px_rgba(143,41,127,0.35)] transition-[left,top] duration-200"
          style={{
            left: 118 + Math.sin(progress * Math.PI * 2) * radius,
            top: 118 - Math.cos(progress * Math.PI * 2) * radius,
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

function DietaryExclusionPicker({ selected, onToggle }: { selected: string[]; onToggle: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const selectedLabels = DIETARY_EXCLUSIONS.filter(option => selected.includes(option.value)).map(option => option.label);

  return (
    <div className="relative col-span-2">
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
        aria-controls="dietary-exclusion-menu"
        className={`flex min-h-11 w-full items-center rounded-[12px] border px-3 text-left transition-colors ${selectedLabels.length ? 'border-[#55A964] bg-[#EDF8EE]' : 'border-transparent bg-[#F8F5F3]'}`}
      >
        <span className="mr-2 text-base">🚫</span>
        <strong className="text-[11px] text-[#514A4D]">No</strong>
        <span className="ml-2 min-w-0 flex-1 truncate text-[10px] font-semibold text-[#7B7276]">
          {selectedLabels.length ? selectedLabels.join(', ') : 'Select ingredients'}
        </span>
        {selectedLabels.length > 0 && <span className="mr-2 rounded-full bg-[#55A964] px-1.5 py-0.5 text-[9px] font-bold text-white">{selectedLabels.length}</span>}
        <ChevronDown size={15} className={`shrink-0 text-[#8A8084] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id="dietary-exclusion-menu" className="mt-1 max-h-[156px] overflow-y-auto rounded-[14px] border border-[#E8DFDC] bg-white p-1.5 shadow-[0_10px_24px_rgba(92,69,62,0.14)]">
          {DIETARY_EXCLUSIONS.map(option => {
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

  const [deadlineMin, setDeadlineMin] = useState(10);
  const [partySize, setPartySize] = useState(4);
  const [togetherPartySize, setTogetherPartySize] = useState(4);
  const [radius, setRadius] = useState(1000);
  const [intent, setIntent] = useState<Intent | null>(initialIntent);
  const [tags, setTags] = useState<string[]>(['맛집']);
  const [dietary, setDietary] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const lunchmateLoadout = useMemo(
    () => lunchmateLoadoutFromProfile(profile.lunchmateLoadout),
    [profile.lunchmateLoadout],
  );

  const isSolo = partySize === 1;
  const budget = 2 as const;
  const chosenCount = tags.length + dietary.length + 1;
  const hasActiveSession = currentSession?.status === 'waiting' || currentSession?.status === 'voting';
  const realCategories = useMemo(() => new Set(restaurants.map(restaurant => restaurant.category)), [restaurants]);

  const toggleMany = (value: string, setter: Dispatch<SetStateAction<string[]>>) => {
    setter(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  };

  const selectSolo = () => {
    if (partySize > 1) setTogetherPartySize(partySize);
    setPartySize(1);
  };

  const selectTogether = () => setPartySize(Math.max(2, togetherPartySize));

  const handleStart = async () => {
    if (hasActiveSession) {
      setIsCreating(true);
      try {
        const activeSession = await fetchSession(currentSession.inviteCode);
        const isWaiting = activeSession.status === 'waiting';
        toast.info(isWaiting ? '진행 중인 대기방으로 이동합니다.' : '진행 중인 투표로 이동합니다.');
        navigate(isWaiting ? '/session/lobby' : '/lunchie/swipe');
        return;
      } catch {
        // A locally cached session can outlive its server record. Clear only
        // that stale cache before creating a replacement session.
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
        {hasActiveSession && (
          <button
            type="button"
            onClick={() => navigate(currentSession.status === 'waiting' ? '/session/lobby' : '/lunchie/swipe')}
            className="flex w-full items-center justify-between rounded-2xl bg-[#2B3440] px-4 py-3 text-left text-white"
          >
            <span>
              <strong className="block text-[13px]">진행 중인 Quick Match</strong>
              <span className="text-[11px] text-[#AEB9C7]">새 세션을 만들지 않고 이어서 진행해요</span>
            </span>
            <span className="text-[12px] font-bold text-[#FF7A83]">{currentSession.status === 'waiting' ? '대기방' : '투표'} ›</span>
          </button>
        )}

        <Card>
          <CardTitle icon={<Clock3 size={16} />}>마감</CardTitle>
          <DeadlineDial minutes={deadlineMin} onChange={setDeadlineMin} />
          <div className="mx-auto mt-4 w-full max-w-[320px]">
            <div className="grid grid-cols-3 gap-1.5">
              {DEADLINE_OPTIONS.map(minutes => (
                <ChoiceChip key={minutes} selected={deadlineMin === minutes} onClick={() => setDeadlineMin(minutes)} className="min-h-9 px-1">{minutes}분</ChoiceChip>
              ))}
            </div>
          </div>
        </Card>

        {!isSolo && (
          <Card>
            <div className="mb-3 flex items-center gap-2 text-[14px] font-extrabold text-[#26232A]">
              <Users size={17} className="text-[#F4515E]" />
              <span>인원</span>
              <span className="ml-auto text-[10px] font-bold text-[#9B959A]">함께 먹을 정원</span>
            </div>
            <div className="flex min-h-[66px] items-center rounded-[18px] bg-[#FFF8F6] px-2.5">
              <button
                type="button"
                onClick={() => {
                  const next = Math.max(2, partySize - 1);
                  setPartySize(next);
                  setTogetherPartySize(next);
                }}
                disabled={partySize <= 2}
                className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-[#645D61] shadow-sm disabled:opacity-30"
                aria-label="초대 인원 줄이기"
              >
                <Minus size={17} />
              </button>
              <div className="flex min-w-0 flex-1 flex-col items-center justify-center">
                <div className="flex items-center justify-center -space-x-1 text-[#F4515E]" aria-hidden="true">
                  {Array.from({ length: Math.min(partySize, 6) }, (_, index) => (
                    <span key={index} className="flex size-6 items-center justify-center rounded-full border-2 border-[#FFF8F6] bg-[#FFE4E3]">
                      <Users size={12} />
                    </span>
                  ))}
                </div>
                <strong className="mt-1 text-[18px] leading-none text-[#F4515E]">{partySize}명</strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = Math.min(8, partySize + 1);
                  setPartySize(next);
                  setTogetherPartySize(next);
                }}
                disabled={partySize >= 8}
                className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-[#645D61] shadow-sm disabled:opacity-30"
                aria-label="초대 인원 늘리기"
              >
                <Plus size={17} />
              </button>
            </div>
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
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-extrabold text-[#524B4F]">Dietary preferences</p>
            <span className="text-[9px] font-bold text-[#A6A0A3]">Select all that apply</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {DIETARY_OPTIONS.map(option => {
              const selected = dietary.includes(option.value);
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => toggleMany(option.value, setDietary)}
                  aria-pressed={selected}
                  className={`flex min-h-10 w-full items-center rounded-[12px] px-2.5 text-left transition-colors ${selected ? 'bg-[#EDF8EE]' : 'bg-[#F8F5F3]'}`}
                >
                  <span className="mr-2 text-base">{option.icon}</span>
                  <span className="truncate text-[11px] font-bold text-[#514A4D]">{option.label}</span>
                  <span className={`ml-auto flex size-4 shrink-0 items-center justify-center rounded border ${selected ? 'border-[#55A964] bg-[#55A964] text-white' : 'border-[#D8CFCC] bg-white text-transparent'}`}><Check size={10} strokeWidth={3} /></span>
                </button>
              );
            })}
            <DietaryExclusionPicker selected={dietary} onToggle={value => toggleMany(value, setDietary)} />
          </div>
        </Card>

        <div className="pb-3 pt-1">
          <motion.button
            type="button"
            onClick={() => void handleStart()}
            disabled={isCreating}
            whileTap={{ scale: 0.98 }}
            className="lunchie-session-primary-action w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating
              ? '준비하는 중…'
              : hasActiveSession
                ? currentSession.status === 'waiting' ? '대기방으로 돌아가기' : '투표 계속하기'
                : isSolo ? 'Swipe 시작하기' : '세션 만들고 초대하기'}
          </motion.button>
        </div>
      </main>
    </div>
  );
}
