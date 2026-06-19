/**
 * Lunchie Munchie — Lunchie Mode / Quick Match (Invitation & Settings)
 * UI: sj_branch quick-match 설정 화면을 그대로 재현
 * Logic: merge1_v3 — createSession(...) 후 /session/lobby 로 이동
 */

import { useState, type ReactNode, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { ArrowLeft, Clock, SlidersHorizontal, Users, Minus, Plus, X } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

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
  '취향': ['카페', '맛집', '데이트 코스', '혼자 여행', '전시/문화', '가성비'],
  '평점': ['4.0 이상', '4.5 이상', '4.8 이상'],
};

const RADIUS_OPTIONS = [500, 1000, 2000, 3000, 5000];

function formatRadius(r: number): string {
  return r >= 1000 ? `${r / 1000}km` : `${r}m`;
}

const tapSpring = { type: "spring" as const, stiffness: 500, damping: 30 };

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
  const { createSession, restaurants, profile } = useApp();

  const [deadlineMin, setDeadlineMin] = useState(10);
  const [partySize, setPartySize] = useState(4);
  const [radius, setRadius] = useState(1000);
  const [activeFilters, setActiveFilters] = useState<string[]>(['취향', '평점']);
  const [details, setDetails] = useState<Record<string, string[]>>({
    '취향': ['맛집'],
    '평점': ['4.0 이상'],
  });
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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

      const session = await createSession(
        sessionName,
        { partySize, dietary, budget, radius, categories },
        hostName,
        profile.emoji,
        deadlineMin,
      );
      toast.success(`"${session.name}" 세션이 생성되었습니다! 🎉`);
      navigate('/session/lobby');
    } catch {
      toast.error('세션 생성에 실패했습니다.');
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

          {/* 인원수 */}
          <div className="bg-[#F5F5F5] rounded-xl p-3 mb-2">
            <p className="text-[11px] text-[#9B9B9B] mb-2">인원수</p>
            <div className="flex items-center gap-4">
              <IconButton
                onClick={() => setPartySize(p => Math.max(2, p - 1))}
                className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center disabled:opacity-40"
                disabled={partySize <= 2}
              >
                <Minus size={16} color="#1A1A1A" />
              </IconButton>
              <p className="font-black text-[20px] text-[#EB5053] w-12 text-center">{partySize}명</p>
              <IconButton
                onClick={() => setPartySize(p => Math.min(12, p + 1))}
                className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center disabled:opacity-40"
                disabled={partySize >= 12}
              >
                <Plus size={16} color="#1A1A1A" />
              </IconButton>
            </div>
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
          className="w-full py-4 rounded-2xl font-black text-white text-[16px] disabled:opacity-60"
          style={{ background: '#EB5053' }}
        >
          {isCreating ? '세션 만드는 중...' : 'Swipe 시작하기 🍱'}
        </ActionButton>
      </div>
    </div>
  );
}
