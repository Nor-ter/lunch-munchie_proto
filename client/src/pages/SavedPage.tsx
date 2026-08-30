/** Lunchie Munchie MVP — 식당 한 곳도 하나의 코스로 보고 저장 항목을 코스로 통합한다. */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { MapPin, Bookmark, X } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import UnifiedMunchieCard, { SAVED_BOOKMARK_BUTTON_CLASS } from '@/components/munchie/UnifiedMunchieCard';
import { useAuthStatus } from '@/hooks/useAuthStatus';

type JourneyStop = { restaurant_id: string; name: string; category: string | null; at: number };
type JourneyDay = { key: string; label: string; stops: JourneyStop[] };

export function getCoursePlaceCount(stops: unknown[] | undefined): number {
  return Math.max(stops?.length ?? 0, 1);
}

function groupJourneyByDay(stops: JourneyStop[]): JourneyDay[] {
  const days = new Map<string, JourneyDay>();
  [...stops].sort((a, b) => b.at - a.at).forEach(stop => {
    const date = new Date(stop.at);
    if (!Number.isFinite(date.getTime())) return;
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    const label = date.toDateString() === today.toDateString() ? '오늘의 런치픽'
      : date.toDateString() === yesterday.toDateString() ? '어제의 런치픽'
        : new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(date);
    const day = days.get(key) ?? { key, label, stops: [] };
    day.stops.push(stop);
    days.set(key, day);
  });
  return Array.from(days.values());
}

export default function SavedPage() {
  const [, navigate] = useLocation();
  const {
    feedPosts, savedCourseIds, unsaveCourse,
  } = useApp();
  const auth = useAuthStatus();
  const [journeyStops, setJourneyStops] = useState<JourneyStop[]>([]);
  const [journeyLoading, setJourneyLoading] = useState(true);
  const [pendingUnsaveCourseId, setPendingUnsaveCourseId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let localStops: JourneyStop[] = [];
    try {
      localStops = JSON.parse(localStorage.getItem('lm_lunchie_journey') ?? localStorage.getItem('lm_today_journey') ?? '[]');
    } catch { /* browser fallback is optional */ }
    if (auth.isError || auth.data?.isAnonymous) {
      setJourneyStops(localStops);
      setJourneyLoading(false);
      return;
    }
    if (!auth.data) return;
    fetch('/api/journey?days=30', { credentials: 'same-origin' })
      .then(response => response.ok ? response.json() : { stops: [] })
      .then((data: { stops?: JourneyStop[] }) => {
        if (!active) return;
        setJourneyStops(data.stops?.length ? data.stops : localStops);
        setJourneyLoading(false);
      })
      .catch(() => { if (active) { setJourneyStops(localStops); setJourneyLoading(false); } });
    return () => { active = false; };
  }, [auth.data?.isAnonymous, auth.isError]);

  const savedPosts = Array.from(
    feedPosts
      .filter(post => savedCourseIds.includes(post.courseId))
      .reduce((byCourse, post) => {
        if (!byCourse.has(post.courseId)) byCourse.set(post.courseId, post);
        return byCourse;
      }, new Map<string, (typeof feedPosts)[number]>())
      .values(),
  );
  const journeyDays = useMemo(() => groupJourneyByDay(journeyStops), [journeyStops]);
  const savedCourseCount = savedPosts.length + journeyStops.length;
  const hasSavedCourses = savedCourseCount > 0;
  const confirmUnsave = () => {
    if (!pendingUnsaveCourseId) return;
    unsaveCourse(pendingUnsaveCourseId);
    setPendingUnsaveCourseId(null);
  };

  return (
    <div className="min-h-dvh bg-[#FCF4EE] pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="mb-1 text-[22px] font-bold text-[#1A1A1A]">저장 🔖</h1>
        <p className="text-[12px] text-[#9B9B9B]">저장한 코스를 한곳에 모았어요 · {savedCourseCount}개</p>
      </div>

      <div className="space-y-5 px-3 pb-10">
        {savedPosts.length > 0 && (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="grid grid-cols-2 items-start gap-3">
              {savedPosts.map(post => (
                <div key={post.id} className="relative min-w-0">
                  <span className="absolute left-2 top-2 z-20 rounded-full bg-[#30221C]/85 px-2 py-1 text-[9px] font-black text-white">
                    {getCoursePlaceCount(post.stops)}곳 코스
                  </span>
                  <UnifiedMunchieCard post={post} compact homeSummary detailOrigin="saved" />
                  <button
                    type="button"
                    onClick={() => setPendingUnsaveCourseId(post.courseId)}
                    className={`absolute bottom-1.5 right-1.5 origin-bottom-right scale-[0.8] shadow-sm ${SAVED_BOOKMARK_BUTTON_CLASS}`}
                    aria-label="저장 취소"
                  >
                    <Bookmark size={20} strokeWidth={2} fill="currentColor" />
                  </button>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {journeyDays.length > 0 && (
          <div className="space-y-4 px-2">
          {journeyDays.map(day => (
            <section key={day.key}>
              <p className="mb-2 text-[12px] font-black text-[#B26A62]">{day.label} · 코스 {day.stops.length}개</p>
              <div className="space-y-2">
                {day.stops.map((stop, index) => (
                  <button
                    type="button"
                    key={`${stop.restaurant_id}-${stop.at}`}
                    onClick={() => navigate(`/lunchie/map?id=${stop.restaurant_id}`)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-[#F0E8E0] bg-white p-3 text-left active:scale-[0.98]"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F6B5AC] text-[11px] font-black text-white">{day.stops.length - index}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-bold text-[#1A1A1A]">{stop.name}</span>
                      <span className="mt-0.5 block text-[10px] font-black text-[#B26A62]">1곳 코스</span>
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-[#9B9B9B]"><MapPin size={11} />{stop.category ?? '맛집'}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
          </div>
        )}

        {!journeyLoading && !hasSavedCourses && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-16 text-center">
            <div className="mb-3 text-5xl">🔖</div>
            <p className="mb-1 text-[16px] font-bold text-[#1A1A1A]">
              아직 저장한 코스가 없어요
            </p>
            <p className="mb-6 text-[13px] text-[#9B9B9B]">
              발견에서 마음에 드는 코스를 저장해보세요
            </p>
            <button onClick={() => navigate('/feed')} className="lm-btn-primary inline-flex items-center justify-center px-6">
              발견으로 이동
            </button>
          </motion.div>
        )}
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {pendingUnsaveCourseId && (
            <motion.div className="fixed inset-0 z-[100] flex items-center justify-center px-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button type="button" aria-label="저장 취소 확인 닫기" className="absolute inset-0 bg-[#2A1A14]/40" onClick={() => setPendingUnsaveCourseId(null)} />
              <motion.section role="dialog" aria-modal="true" aria-labelledby="unsave-confirm-title" className="relative w-full max-w-[320px] rounded-[24px] bg-white p-5 shadow-[0_20px_50px_rgba(48,28,20,0.24)]" initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 12 }}>
                <button type="button" aria-label="저장 취소 확인 닫기" onClick={() => setPendingUnsaveCourseId(null)} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#F8ECE6] text-[#876E63]"><X size={16} /></button>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFE8E3] text-[#D94E55]"><Bookmark size={21} fill="currentColor" /></span>
                <h2 id="unsave-confirm-title" className="mt-3 text-[17px] font-black text-[#30221C]">저장을 취소할까요?</h2>
                <p className="mt-1.5 text-[12px] font-semibold leading-5 text-[#8A746A]">저장 목록에서 이 항목이 사라져요.</p>
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <button type="button" onClick={() => setPendingUnsaveCourseId(null)} className="h-11 rounded-[14px] border border-[#DFD0C8] bg-white text-[13px] font-black text-[#69564D]">취소</button>
                  <button type="button" onClick={confirmUnsave} className="h-11 rounded-[14px] bg-[#E85053] text-[13px] font-black text-white">저장 취소</button>
                </div>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

    </div>
  );
}
