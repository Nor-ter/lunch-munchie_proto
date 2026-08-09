/**
 * Lunchie Munchie — Lunchie Mode / Quick Match (Invitation & Settings)
 * UI: sj_branch quick-match 설정 화면을 그대로 재현
 * Logic: merge1_v3 — createSession(...) 후 /session/lobby 로 이동
 */

import { useState, type ReactNode, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useSearch } from 'wouter';
import { ArrowLeft, Clock, SlidersHorizontal, Users, Minus, Plus, Navigation, X } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { FOOD_TAGS } from '@/constants/foodTags';
import { toast } from 'sonner';
import type { Intent } from '@shared/intent';
import { logSessionCreated } from '@/lib/eventLogger';

const INTENT_OPTIONS: { value: Intent | null; label: string; icon: string }[] = [
  { value: null, label: '자동', icon: '🕐' },
  { value: 'meal', label: '밥', icon: '🍚' },
  { value: 'cafe', label: '카페', icon: '☕' },
  { value: 'dessert', label: '디저트', icon: '🍰' },
];

// ─── Filter constants (sj_branch parity) ──────────────────────────────────────

const DEADLINE_OPTIONS = [
  { label: '5분', min: 5 },
  { label: '10분', min: 10 },
  { label: '15분', min: 15 },
];

const FILTER_OPTIONS = ['식단', '거리', '예산', '카드수', '취향', '평점'];

const DETAIL_OPTIONS: Record<string, string[]> = {
  '식단': ['비건', '채식', '육식', '글루텐프리', '할랄', '해산물 제외'],
  '거리': ['500m 이내', '1km 이내', '3km 이내', '5km 이내'],
  '예산': ['₩', '₩₩', '₩₩₩', '₩₩₩₩'],
  '카드수': ['5장', '7장', '10장', '15장'],
  '취향': [...FOOD_TAGS],
  '평점': ['4.0 이상', '4.5 이상', '4.8 이상'],
};

const RADIUS_OPTIONS = [500, 1000, 2000, 3000, 5000];

function formatRadius(r: number): string {
  return r >= 1000 ? `${r / 1000}km` : `${r}m`;
}

const tapSpring = { type: "spring" as const, stiffness: 500, damping: 30 };

type LocationFix = { latitude: number; longitude: number; accuracy: number };

function currentPosition(): Promise<LocationFix> {
  if (!navigator.geolocation)
    return Promise.reject(new Error('이 브라우저에서는 위치 정보를 사용할 수 없습니다.'));
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
      () => reject(new Error('현재 위치 권한이 필요합니다.')),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  });
}

function IconButton({
  onClick,
  disabled,
  className,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      whileTap={disabled ? undefined : { scale: 0.88 }}
      transition={tapSpring}
    >
      {children}
    </motion.button>
  );
}

function ChipButton({
  selected,
  onClick,
  children,
  className,
  unselectedBg = "#F5F5F5",
  unselectedColor = "#4A4A4A",
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  unselectedBg?: string;
  unselectedColor?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={className}
      animate={{
        backgroundColor: selected ? "#EB5053" : unselectedBg,
        color: selected ? "#FFFFFF" : unselectedColor,
      }}
      whileTap={{
        scale: 0.92,
        backgroundColor: selected ? "#D94447" : "#E0E0E0",
      }}
      transition={tapSpring}
    >
      {children}
    </motion.button>
  );
}

function ActionButton({
  onClick,
  disabled,
  children,
  className,
  style,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={style}
      whileTap={disabled ? undefined : { scale: 0.97, opacity: 0.88 }}
      transition={tapSpring}
    >
      {children}
    </motion.button>
  );
}

// ─── Lunchie Settings Page ────────────────────────────────────────────────────

export default function LunchieSettingsPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { createSession, restaurants, profile } = useApp();

  // "다음 여정" 카드 탭 시 ?intent=cafe 로 넘어옴 — 초기 선택값으로 반영.
  const urlIntent = new URLSearchParams(search).get('intent');
  const initialIntent: Intent | null = urlIntent === 'meal' || urlIntent === 'cafe' || urlIntent === 'dessert' ? urlIntent : null;

  const [deadlineMin, setDeadlineMin] = useState(10);
  const [partySize, setPartySize] = useState(4);
  const [radius, setRadius] = useState(1000);
  const [intent, setIntent] = useState<Intent | null>(initialIntent);
  const [activeFilters, setActiveFilters] = useState<string[]>(['취향', '평점']);
  const [details, setDetails] = useState<Record<string, string[]>>({
    '취향': ['맛집'],
    '평점': ['4.0 이상'],
  });
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [origin, setOrigin] = useState<LocationFix | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const confirmCurrentLocation = async () => {
    setIsLocating(true);
    try {
      setOrigin(await currentPosition());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '현재 위치를 확인하지 못했습니다.');
    } finally {
      setIsLocating(false);
    }
  };

  const toggleFilter = (f: string) => {
    setActiveFilters(prev => (prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]));
  };

  const toggleDetail = (filter: string, value: string) => {
    setDetails(prev => {
      const cur = prev[filter] || [];
      const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
      return { ...prev, [filter]: next };
    });
  };

  // sj 설정값 → merge1_v3 createSession 파라미터로 매핑
  const handleStart = async () => {
    setIsCreating(true);
    try {
      const sel = (f: string) => (activeFilters.includes(f) ? details[f] || [] : []);

      const dietary = sel('식단');
      const budgetSel = sel('예산');
      const budget = (budgetSel[0]?.length || 2) as 1 | 2 | 3 | 4;
      // '취향' 값 중 실제 식당 카테고리와 일치하는 것만 필터로 사용 (빈 세션 방지)
      const realCats = new Set(restaurants.map(r => r.category));
      const categories = sel('취향').filter(t => realCats.has(t));

      const hostName = profile.name && profile.name !== '사용자' ? profile.name : '호스트';
      const sessionName = `${hostName}의 점심 세션`;
      // The host supplies one location at creation; it becomes the shared
      // reference point, rather than collecting every participant's location.
      const currentOrigin = origin ?? await currentPosition();

      const session = await createSession(
        sessionName,
        {
          partySize,
          dietary,
          budget,
          radius,
          categories,
          intent: intent ?? undefined,
          originLatitude: currentOrigin.latitude,
          originLongitude: currentOrigin.longitude,
        },
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
      toast.success('점심 세션이 생성되었습니다', {
        position: 'top-center',
        style: { marginTop: 'calc(env(safe-area-inset-top, 0px) + 64px)' },
      });
      navigate('/session/lobby');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '세션 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  const totalDetailCount = activeFilters.reduce((sum, f) => sum + (details[f]?.length || 0), 0);

  return (
    <div className="min-h-dvh bg-[#FCF4EE]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-5">
        <IconButton
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"
        >
          <ArrowLeft size={18} color="#1A1A1A" />
        </IconButton>
        <div className="text-center">
          <p className="font-black text-[17px] text-[#1A1A1A]">Lunchie Mode</p>
          <p className="text-[11px] text-[#9B9B9B]">Quick Match</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="px-5 space-y-4 pb-8">
        {/* Deadline */}
        <div className="rounded-2xl p-4 bg-white">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={15} color="#EB5053" />
            <p className="text-[13px] font-bold text-[#1A1A1A]">마감 타이밍</p>
          </div>
          <p className="text-[11px] text-[#9B9B9B] mb-3">투표 시작 후 제한 시간 · 마감 후엔 참여 불가</p>
          <div className="flex gap-2">
            {DEADLINE_OPTIONS.map(d => (
              <ChipButton
                key={d.min}
                selected={deadlineMin === d.min}
                onClick={() => setDeadlineMin(d.min)}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold"
              >
                {d.label}
              </ChipButton>
            ))}
          </div>
        </div>

        {/* Session Settings */}
        <div className="rounded-2xl p-4 bg-white">
          <div className="flex items-center gap-2 mb-3">
            <Users size={15} color="#EB5053" />
            <p className="text-[13px] font-bold text-[#1A1A1A]">세션 설정</p>
          </div>

          {/* 누구랑 — 혼자 vs 같이(+정원) */}
          <div className="bg-[#F5F5F5] rounded-xl p-3 mb-2">
            <p className="text-[11px] text-[#9B9B9B] mb-2">누구랑 먹어요?</p>
            <div className="flex gap-2">
              {([['혼자', 1, '🧍'], ['같이', 4, '👥']] as const).map(([label, size, icon]) => (
                <ChipButton
                  key={label}
                  selected={size === 1 ? partySize === 1 : partySize > 1}
                  onClick={() => setPartySize(previous => (size === 1 ? 1 : (previous > 1 ? previous : 4)))}
                  unselectedBg="#FFFFFF"
                  className="flex-1 py-2.5 rounded-xl font-bold text-[14px]"
                >
                  {icon} {label}
                </ChipButton>
              ))}
            </div>
            {partySize > 1 && (
              <div className="flex items-center justify-center gap-4 mt-3">
                <IconButton
                  onClick={() => setPartySize(previous => Math.max(2, previous - 1))}
                  className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center disabled:opacity-40"
                  disabled={partySize <= 2}
                >
                  <Minus size={14} color="#1A1A1A" />
                </IconButton>
                <p className="font-black text-[17px] text-[#EB5053] w-16 text-center">{partySize}명 정원</p>
                <IconButton
                  onClick={() => setPartySize(previous => Math.min(12, previous + 1))}
                  className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center disabled:opacity-40"
                  disabled={partySize >= 12}
                >
                  <Plus size={14} color="#1A1A1A" />
                </IconButton>
              </div>
            )}
            <p className="text-[10px] text-[#B0B0B0] mt-1.5">
              {partySize > 1 ? '나눠먹기 좋은 곳 위주 · 정원만큼 모이면 마감' : '혼밥하기 편한 곳 위주로 추천해요'}
            </p>
          </div>

          {/* 무엇을 먹을까요 — 명시적 밥/카페/디저트 선택. 안 고르면 시간대로 자동 판정. */}
          <div className="bg-[#F5F5F5] rounded-xl p-3 mb-2">
            <p className="text-[11px] text-[#9B9B9B] mb-2">무엇을 먹을까요?</p>
            <div className="flex gap-1.5">
              {INTENT_OPTIONS.map(({ value, label, icon }) => (
                <button
                  key={label}
                  onClick={() => setIntent(value)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-[13px] active:scale-[0.98] transition-all"
                  style={{ background: intent === value ? '#EB5053' : 'white', color: intent === value ? 'white' : '#4A4A4A' }}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
            {intent === null && (
              <p className="text-[10px] text-[#B0B0B0] mt-1.5">지금 시간대({new Date().getHours()}시)에 맞춰 자동으로 골라요</p>
            )}
          </div>

          {/* 반경 */}
          <div className="bg-[#F5F5F5] rounded-xl p-3">
            <p className="text-[11px] text-[#9B9B9B] mb-2">검색 반경</p>
            <div className="flex gap-1.5">
              {RADIUS_OPTIONS.map(r => (
                <ChipButton
                  key={r}
                  selected={radius === r}
                  onClick={() => setRadius(r)}
                  unselectedBg="#FFFFFF"
                  className="flex-1 py-2 rounded-lg text-[12px] font-bold"
                >
                  {formatRadius(r)}
                </ChipButton>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              {origin ? (
                <p className="text-[10px] text-[#6B7A72] leading-relaxed">
                  <Navigation size={11} className="inline mr-1" />현재 위치 기준 · {origin.latitude.toFixed(4)}, {origin.longitude.toFixed(4)} · 정확도 약 {Math.round(origin.accuracy)}m
                </p>
              ) : (
                <p className="text-[10px] text-[#B0B0B0]">현재 위치를 확인하면 선택한 반경의 기준점을 보여드려요.</p>
              )}
              <button
                type="button"
                onClick={() => void confirmCurrentLocation()}
                disabled={isLocating}
                className="shrink-0 text-[10px] font-bold text-[#EB5053] disabled:opacity-50"
              >
                {isLocating ? '확인 중…' : origin ? '다시 확인' : '현재 위치 확인'}
              </button>
            </div>
            <p className="text-[10px] text-[#B0B0B0] mt-1.5">표시 거리는 현재 위치부터 식당까지의 직선거리예요. 위치는 세션 생성 시 한 번만 사용합니다.</p>
          </div>
        </div>

        {/* Filter Options */}
        <div className="rounded-2xl p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={15} color="#EB5053" />
              <p className="text-[13px] font-bold text-[#1A1A1A]">옵션</p>
            </div>
            <motion.button
              type="button"
              onClick={() => setShowDetailModal(true)}
              className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
              animate={{ backgroundColor: "#FFF5F5", color: "#EB5053" }}
              whileTap={{ scale: 0.94, backgroundColor: "#FFD6D6" }}
              transition={tapSpring}
            >
              상세 설정 {totalDetailCount > 0 && `· ${totalDetailCount}`}
            </motion.button>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map(f => (
              <ChipButton
                key={f}
                selected={activeFilters.includes(f)}
                onClick={() => toggleFilter(f)}
                className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
              >
                {f}
              </ChipButton>
            ))}
          </div>

          {/* Selected detail chips preview */}
          {totalDetailCount > 0 && (
            <div className="mt-3 pt-3 border-t border-[#F0F0F0] flex flex-wrap gap-1.5">
              {activeFilters.flatMap(f =>
                (details[f] || []).map(v => (
                  <span
                    key={`${f}-${v}`}
                    className="text-[10px] font-semibold bg-[#F5F5F5] text-[#4A4A4A] px-2 py-0.5 rounded-full"
                  >
                    {v}
                  </span>
                )),
              )}
            </div>
          )}
        </div>

        {/* Detail Settings Modal */}
        <AnimatePresence>
          {showDetailModal && (
            <motion.div
              className="fixed inset-0 z-[90] flex items-end justify-center"
              style={{ background: 'rgba(0,0,0,0.5)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetailModal(false)}
            >
              <motion.div
                className="w-full max-w-[480px] bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto scrollbar-hide"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 350, damping: 34 }}
                onClick={e => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-white px-5 pt-5 pb-3 flex items-center justify-between border-b border-[#F0F0F0]">
                  <div>
                    <p className="font-black text-[17px] text-[#1A1A1A]">상세 설정</p>
                    <p className="text-[11px] text-[#9B9B9B]">활성화된 옵션의 세부 태그를 골라주세요</p>
                  </div>
                  <IconButton
                    onClick={() => setShowDetailModal(false)}
                    className="w-9 h-9 rounded-full bg-[#F5F5F5] flex items-center justify-center"
                  >
                    <X size={16} color="#4A4A4A" />
                  </IconButton>
                </div>

                <div className="px-5 py-4 space-y-5">
                  {activeFilters.length === 0 && (
                    <p className="text-[13px] text-[#9B9B9B] text-center py-8">먼저 옵션에서 항목을 켜주세요</p>
                  )}
                  {activeFilters.map(filter => (
                    <div key={filter}>
                      <p className="text-[13px] font-bold text-[#1A1A1A] mb-2">{filter}</p>
                      <div className="flex flex-wrap gap-2">
                        {(DETAIL_OPTIONS[filter] || []).map(value => {
                          const on = (details[filter] || []).includes(value);
                          return (
                            <ChipButton
                              key={value}
                              selected={on}
                              onClick={() => toggleDetail(filter, value)}
                              className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
                            >
                              {value}
                            </ChipButton>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="sticky bottom-0 bg-white px-5 py-4 border-t border-[#F0F0F0]">
                  <ActionButton
                    onClick={() => setShowDetailModal(false)}
                    className="w-full py-3.5 rounded-2xl font-bold text-white text-[14px]"
                    style={{ background: '#EB5053' }}
                  >
                    적용하기 {totalDetailCount > 0 && `(${totalDetailCount})`}
                  </ActionButton>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start */}
        <ActionButton
          onClick={handleStart}
          disabled={isCreating}
          className="lunchie-session-primary-action"
        >
          {isCreating ? '세션 만드는 중...' : 'Swipe 시작하기'}
        </ActionButton>
      </div>
    </div>
  );
}
