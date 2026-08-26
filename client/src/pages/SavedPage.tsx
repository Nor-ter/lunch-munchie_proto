/**
 * Lunchie Munchie — 저장 목록 (전면 개편)
 * 두 소스를 한 페이지에서: ① Munchie Mode — 다른 사람이 만든 코스맵을 저장한 목록
 *                         ② Lunchie Mode — Quick Match에서 확정한 런치픽 여정
 */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useSearch } from 'wouter';
import { MapPin, Bookmark, Zap, Map as MapIcon, LayoutList, X } from 'lucide-react';
import { useApp, TagType } from '@/contexts/AppContext';
import { getCourseTagStyle } from '@/constants/courseTheme';
import { FOOD_FILTER_TAGS, hasFoodTag } from '@/constants/foodTags';
import UnifiedMunchieCard, { SAVED_BOOKMARK_BUTTON_CLASS } from '@/components/munchie/UnifiedMunchieCard';
import { SavedMunchieMap } from '@/components/saved/SavedMunchieMap';
import { useSavedFeedMapPoints } from '@/hooks/useSavedFeedMapPoints';
import { getSavedViewFromSearch, type SavedViewMode } from '@/lib/savedNavigation';
import { useAuthStatus } from '@/hooks/useAuthStatus';

type Tab = 'coursemaps' | 'restaurants';

export function getSavedTabFromSearch(search: string): Tab {
  return new URLSearchParams(search).get('tab') === 'restaurants' ? 'restaurants' : 'coursemaps';
}

type JourneyStop = { restaurant_id: string; name: string; category: string | null; at: number };
type JourneyDay = { key: string; label: string; stops: JourneyStop[] };

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
  const search = useSearch();
  const {
    feedPosts, savedCourseIds, unsaveCourse,
  } = useApp();
  const auth = useAuthStatus();
  const [tab, setTab] = useState<Tab>(() => getSavedTabFromSearch(search));
  const [activeFilter, setActiveFilter] = useState<TagType | 'all'>('all');
  const [munchieView, setMunchieView] = useState<SavedViewMode>(
    () => getSavedViewFromSearch(search),
  );
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
  const filteredPosts = activeFilter === 'all'
    ? savedPosts
    : savedPosts.filter(post => hasFoodTag(post.tags, activeFilter as TagType));
  const savedFeedMapPoints = useSavedFeedMapPoints(filteredPosts);
  const journeyDays = useMemo(() => groupJourneyByDay(journeyStops), [journeyStops]);
  const selectedMapFeedId = munchieView === 'map'
    ? new URLSearchParams(search).get('selectedFeed')
    : null;
  const selectMunchieView = (view: SavedViewMode) => {
    setMunchieView(view);
    navigate(`/saved?view=${view}`, { replace: true });
  };
  const selectSavedMapFeed = (feedId: string | null) => {
    const selectedFeedQuery = feedId ? `&selectedFeed=${encodeURIComponent(feedId)}` : '';
    navigate(`/saved?view=map${selectedFeedQuery}`, { replace: true });
  };
  const confirmUnsave = () => {
    if (!pendingUnsaveCourseId) return;
    unsaveCourse(pendingUnsaveCourseId);
    setPendingUnsaveCourseId(null);
  };

  return (
    <div className="min-h-dvh bg-[#FCF4EE] pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="font-bold text-[22px] text-[#1A1A1A] mb-1">저장 목록 🔖</h1>
        <p className="text-[12px] text-[#9B9B9B] mb-4">
          {tab === 'coursemaps' ? '마음에 든 한줄평과 코스맵을 함께 모아봤어요' : 'Quick Match에서 확정한 런치픽 여정이에요'}
        </p>

        {/* 모드 세그먼트 */}
        <div className="flex rounded-full bg-[#F5F0EA] p-1" role="group" aria-label="저장 목록 탭">
          {([
            ['coursemaps', 'Munchie 먼치픽', MapIcon, savedPosts.length],
            ['restaurants', 'Lunchie 런치픽', Zap, journeyStops.length],
          ] as const).map(([key, label, Icon, count]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              aria-pressed={tab === key}
              className="relative flex-1 h-10 rounded-full text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5"
              style={{ color: tab === key ? '#FFFFFF' : '#8A7A6C' }}
            >
              {tab === key && (
                <motion.span
                  layoutId="saved-seg"
                  className="absolute inset-0 rounded-full"
                  style={{ background: '#EB5053' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon size={13} /> {label}
                <span
                  className="rounded-full px-1.5 text-[10px] font-black"
                  style={{ background: tab === key ? '#FF8A80' : '#E8DED8' }}
                >
                  {count}
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* Munchie 템플릿 필터 */}
        {tab === 'coursemaps' && (
          <div className="flex gap-2 overflow-x-auto pb-1 pt-3 scrollbar-hide -mx-5 px-5">
            {FOOD_FILTER_TAGS.map(f => (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className="flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-semibold transition-all active:scale-95"
                style={f.value === 'all'
                  ? activeFilter === f.value
                    ? { background: '#1A1A1A', color: '#FFFFFF' }
                    : { background: '#F5F5F5', color: '#4A4A4A' }
                  : getCourseTagStyle(f.value, activeFilter === f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Munchie 먼치픽 탭 ─────────────────────────────────────────────── */}
      {tab === 'coursemaps' && (
        <div className="px-3">
          {filteredPosts.length > 0 ? (
            <AnimatePresence mode="wait" initial={false}>
              {munchieView === 'list' ? (
                <motion.div
                  key="saved-list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-2 items-start gap-3 pb-16"
                >
                  {filteredPosts.map(post => (
                    <div key={post.id} className="relative min-w-0">
                      <UnifiedMunchieCard post={post} compact homeSummary detailOrigin="saved" />
                      <button
                        type="button"
                        onClick={() => setPendingUnsaveCourseId(post.courseId)}
                        className={`absolute bottom-1.5 right-1.5 origin-bottom-right scale-[0.8] shadow-sm ${SAVED_BOOKMARK_BUTTON_CLASS}`}
                        aria-label="먼치픽 저장 취소"
                      >
                        <Bookmark size={20} strokeWidth={2} fill="currentColor" />
                      </button>
                    </div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="saved-map"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-[calc(100dvh-275px)] min-h-[440px] pb-14"
                >
                  <SavedMunchieMap
                    points={savedFeedMapPoints}
                    selectedFeedId={selectedMapFeedId}
                    onSelectedFeedIdChange={selectSavedMapFeed}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
              <div className="text-5xl mb-3">🔖</div>
              <p className="font-bold text-[16px] text-[#1A1A1A] mb-1">
                {activeFilter === 'all' ? '아직 저장한 먼치픽이 없어요!' : '해당 카테고리 먼치픽이 없어요'}
              </p>
              <p className="text-[13px] text-[#9B9B9B] mb-6">
                {activeFilter === 'all' ? 'Munchie Feed에서 마음에 드는 한줄평과 코스맵을 저장해보세요' : '다른 필터를 선택해보세요'}
              </p>
              {activeFilter === 'all' && (
                <button onClick={() => navigate('/feed')} className="lm-btn-primary px-6 inline-flex items-center justify-center">
                  Munchie Feed 둘러보기
                </button>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* ── Lunchie 런치픽 탭 ─────────────────────────────────────────────── */}
      {tab === 'restaurants' && (
        <div className="px-5 space-y-3">
          {journeyDays.map(day => (
            <section key={day.key}>
              <p className="mb-2 text-[12px] font-black text-[#B26A62]">{day.label} · {day.stops.length}곳</p>
              <div className="space-y-2">
                {day.stops.map((stop, index) => (
                  <button
                    type="button"
                    key={`${stop.restaurant_id}-${stop.at}`}
                    onClick={() => navigate(`/lunchie/map?id=${stop.restaurant_id}`)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-[#F0E8E0] bg-white p-3 text-left active:scale-[0.98]"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F6B5AC] text-[11px] font-black text-white">{day.stops.length - index}</span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-[#1A1A1A]">{stop.name}</span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-[#9B9B9B]"><MapPin size={11} />{stop.category ?? '맛집'}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}

          {!journeyLoading && journeyStops.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
              <div className="text-5xl mb-3">⚡</div>
              <p className="font-bold text-[16px] text-[#1A1A1A] mb-1">아직 확정한 런치픽이 없어요!</p>
              <p className="text-[13px] text-[#9B9B9B] mb-6">
                Quick Match로 점심을 정하면 날짜별 여정으로 자동 기록돼요
              </p>
              <button onClick={() => navigate('/lunchie/settings')} className="lm-btn-primary px-6 inline-flex items-center justify-center">
                Quick Match 시작하기
              </button>
            </motion.div>
          )}
        </div>
      )}

      {tab === 'coursemaps' && savedPosts.length > 0 && createPortal(
        <div
          className="fixed z-50 flex h-12 items-center rounded-full border border-[#E1D0C6] bg-[#FFFDFC]/95 p-1 shadow-[0_10px_26px_rgba(72,43,31,0.2)] backdrop-blur"
          style={{
            left: '50%',
            bottom: 'calc(var(--lm-tab-bar-height) + 12px)',
            transform: 'translateX(-50%)',
          }}
          role="group"
          aria-label="저장 먼치픽 보기 방식"
        >
          {([
            ['map', 'Map', MapIcon],
            ['list', 'List', LayoutList],
          ] as const).map(([mode, label, Icon]) => {
            const selected = munchieView === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => selectMunchieView(mode)}
                aria-pressed={selected}
                className="relative flex h-10 min-w-[78px] items-center justify-center gap-1.5 rounded-full px-4 text-[12px] font-black transition-colors"
                style={{ color: selected ? '#FFFFFF' : '#765E53' }}
              >
                {selected && (
                  <motion.span
                    layoutId="saved-view-toggle"
                    className="absolute inset-0 rounded-full bg-[#3F3029]"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon size={14} /> {label}
                </span>
              </button>
            );
          })}
        </div>,
        document.body,
      )}

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {pendingUnsaveCourseId && (
            <motion.div className="fixed inset-0 z-[100] flex items-center justify-center px-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button type="button" aria-label="저장 취소 확인 닫기" className="absolute inset-0 bg-[#2A1A14]/40" onClick={() => setPendingUnsaveCourseId(null)} />
              <motion.section role="dialog" aria-modal="true" aria-labelledby="unsave-confirm-title" className="relative w-full max-w-[320px] rounded-[24px] bg-white p-5 shadow-[0_20px_50px_rgba(48,28,20,0.24)]" initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 12 }}>
                <button type="button" aria-label="저장 취소 확인 닫기" onClick={() => setPendingUnsaveCourseId(null)} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#F8ECE6] text-[#876E63]"><X size={16} /></button>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFE8E3] text-[#D94E55]"><Bookmark size={21} fill="currentColor" /></span>
                <h2 id="unsave-confirm-title" className="mt-3 text-[17px] font-black text-[#30221C]">저장을 취소할까요?</h2>
                <p className="mt-1.5 text-[12px] font-semibold leading-5 text-[#8A746A]">저장 목록에서 이 먼치픽이 사라져요.</p>
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
