/**
 * Lunchie Munchie — Lunchie Mode / Quick Match (Invitation & Settings)
 * UI: sj_branch quick-match 설정 화면을 그대로 재현
 * Logic: merge1_v3 — createSession(...) 후 /session/lobby 로 이동
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { ArrowLeft, Clock, SlidersHorizontal, X } from 'lucide-react';
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

function distanceToMeters(d: string): number {
  return d.includes('km') ? parseFloat(d) * 1000 : parseFloat(d);
}

// ─── Lunchie Settings Page ────────────────────────────────────────────────────

export default function LunchieSettingsPage() {
  const [, navigate] = useLocation();
  const { createSession, restaurants, profile } = useApp();

  const [deadlineMin, setDeadlineMin] = useState(10);
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
      const distSel = sel('거리');
      const radius = distSel.length ? Math.max(...distSel.map(distanceToMeters)) : 1000;
      const budgetSel = sel('예산');
      const budget = (budgetSel[0]?.length || 2) as 1 | 2 | 3 | 4;
      // '취향' 값 중 실제 식당 카테고리와 일치하는 것만 필터로 사용 (빈 세션 방지)
      const realCats = new Set(restaurants.map(r => r.category));
      const categories = sel('취향').filter(t => realCats.has(t));
      const partySize = 4;

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
    <div className="min-h-dvh" style={{ background: '#FFF8F2' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-5">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm active:scale-95"
        >
          <ArrowLeft size={18} color="#1A1A1A" />
        </button>
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
              <button
                key={d.min}
                onClick={() => setDeadlineMin(d.min)}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all active:scale-95"
                style={
                  deadlineMin === d.min
                    ? { background: '#EB5053', color: 'white' }
                    : { background: '#F5F5F5', color: '#4A4A4A' }
                }
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Options */}
        <div className="rounded-2xl p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={15} color="#EB5053" />
              <p className="text-[13px] font-bold text-[#1A1A1A]">옵션</p>
            </div>
            <button
              onClick={() => setShowDetailModal(true)}
              className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full active:scale-95"
              style={{ background: '#FFF5F5', color: '#EB5053' }}
            >
              상세 설정 {totalDetailCount > 0 && `· ${totalDetailCount}`}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map(f => (
              <button
                key={f}
                onClick={() => toggleFilter(f)}
                className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95"
                style={
                  activeFilters.includes(f)
                    ? { background: '#EB5053', color: 'white' }
                    : { background: '#F5F5F5', color: '#4A4A4A' }
                }
              >
                {f}
              </button>
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
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="w-9 h-9 rounded-full bg-[#F5F5F5] flex items-center justify-center active:scale-90"
                  >
                    <X size={16} color="#4A4A4A" />
                  </button>
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
                            <button
                              key={value}
                              onClick={() => toggleDetail(filter, value)}
                              className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95"
                              style={
                                on
                                  ? { background: '#EB5053', color: 'white' }
                                  : { background: '#F5F5F5', color: '#4A4A4A' }
                              }
                            >
                              {value}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="sticky bottom-0 bg-white px-5 py-4 border-t border-[#F0F0F0]">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="w-full py-3.5 rounded-2xl font-bold text-white text-[14px] active:scale-[0.98]"
                    style={{ background: '#EB5053' }}
                  >
                    적용하기 {totalDetailCount > 0 && `(${totalDetailCount})`}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start */}
        <motion.button
          onClick={handleStart}
          disabled={isCreating}
          className="w-full py-4 rounded-2xl font-black text-white text-[16px] disabled:opacity-60"
          style={{ background: '#EB5053' }}
          whileTap={{ scale: 0.97 }}
        >
          {isCreating ? '세션 만드는 중...' : 'Swipe 시작하기 🍱'}
        </motion.button>
      </div>
    </div>
  );
}
