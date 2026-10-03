import { englishText } from '@shared/englishCopy';
/**
 * Lunchie Munchie — 저장 목록 (전면 개편)
 * 두 소스를 한 페이지에서: ① Munchie Mode — 다른 사람이 만든 코스맵을 저장한 목록
 *                         ② Lunchie Mode — Quick Match에서 확정한 런치픽 여정
 */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useSearch } from 'wouter';
import { MapPin, Bookmark, Map as MapIcon, LayoutList, X } from 'lucide-react';
import { useApp, TagType } from '@/contexts/AppContext';
import { FOOD_FILTER_TAGS, hasFoodTag } from '@/constants/foodTags';
import UnifiedMunchieCard, { SAVED_BOOKMARK_BUTTON_CLASS } from '@/components/munchie/UnifiedMunchieCard';
import { SavedMunchieMap } from '@/components/saved/SavedMunchieMap';
import { useSavedFeedMapPoints } from '@/hooks/useSavedFeedMapPoints';
import { getSavedViewFromSearch, type SavedViewMode } from '@/lib/savedNavigation';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import FoodImage from '@/components/FoodImage';
import { intentForCategory } from '@shared/intent';
import { toast } from 'sonner';

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
    const label = date.toDateString() === today.toDateString() ? "Today's Lunchie Picks"
      : date.toDateString() === yesterday.toDateString() ? "Yesterday's Lunchie Picks"
        : new Intl.DateTimeFormat('en-AU', { month: 'long', day: 'numeric', weekday: 'short' }).format(date);
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
    feedPosts, savedCourseIds, unsaveCourse, savedLunchPicks, unsaveLunchPick,
  } = useApp();
  const auth = useAuthStatus();
  const [tab] = useState<Tab>(() => getSavedTabFromSearch(search));
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
  const filteredLunchPicks = savedLunchPicks.filter(({ restaurant }) => {
    if (activeFilter === 'all') return true;
    const intent = intentForCategory(restaurant.category);
    return hasFoodTag(restaurant.tags, activeFilter)
      || (activeFilter === '맛집' && intent === 'meal')
      || (activeFilter === '카페' && intent === 'cafe')
      || (activeFilter === '디저트' && intent === 'dessert');
  });
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
    <div className="saved-page min-h-dvh bg-[#FCFCFC] pb-24">
      {/* Header */}
      <div className="border-b border-[#E8E6E7] bg-[#F5F4F5] px-5 pt-12 pb-4">
        <h1 className="text-[22px] font-semibold text-[#1A1A1A]">Saved Lunchie Picks</h1>

        {/* Munchie 템플릿 필터 */}
        {tab === 'coursemaps' && (
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 pt-3 scrollbar-hide">
            {FOOD_FILTER_TAGS.map(f => (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                aria-pressed={activeFilter === f.value}
                className="shrink-0 rounded-[14px] px-4 py-2 text-[12px] font-semibold transition-colors active:scale-95"
                style={{
                  background: activeFilter === f.value ? '#AA1A0D' : '#FBECE9',
                  color: activeFilter === f.value ? '#FFFFFF' : '#AA1A0D',
                }}
              >
                {englishText(f.label)}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredLunchPicks.length > 0 && (
        <div className="grid grid-cols-2 gap-3 px-3 py-3">
          {filteredLunchPicks.map(({ restaurant }) => (
            <article key={restaurant.id} className="relative min-w-0 overflow-hidden rounded-lg border border-[var(--lm-divider)] bg-white">
              <button
                type="button"
                onClick={() => navigate(`/lunchie/results/${encodeURIComponent(restaurant.id)}`)}
                className="block w-full text-left"
                aria-label={englishText(`${restaurant.name} View Lunchie Pick`)}
              >
                <FoodImage src={restaurant.image || restaurant.photos?.[0]} name={restaurant.name} category={restaurant.category} className="aspect-[4/3] w-full object-cover" />
                <div className="p-3 pr-10">
                  <span className="text-[10px] font-bold text-[var(--lm-primary)]">Lunchie Picks</span>
                  <p className="mt-1 break-words text-[14px] font-bold text-[var(--lm-text)]">{englishText(restaurant.name)}</p>
                  <p className="mt-1 text-[11px] text-[var(--lm-sub)]">{englishText(restaurant.category)}</p>
                </div>
              </button>
              <button
                type="button"
                className="absolute bottom-3 right-2 flex size-8 items-center justify-center rounded-full bg-[var(--lm-card-warm)] text-[var(--lm-primary)]"
                aria-label={englishText(`${restaurant.name} Remove Saved Lunchie Pick`)}
                title="Remove Saved Lunchie Pick"
                onClick={() => {
                  try { unsaveLunchPick(restaurant.id); }
                  catch { toast.error("Couldn't remove this saved item. Please try again."); }
                }}
              >
                <Bookmark size={17} fill="currentColor" />
              </button>
            </article>
          ))}
        </div>
      )}

      {/* ── 코스맵 탭 ─────────────────────────────────────────────────────── */}
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
                        aria-label="Remove Saved Lunchie Pick"
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
          ) : filteredLunchPicks.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
              <div className="text-5xl mb-3">🔖</div>
              <p className="font-semibold text-[16px] text-[#1A1A1A]">
                {englishText(activeFilter === 'all' ? "No Saved Lunchie Picks Yet!" : "No Lunchie picks in this category")}
              </p>
              {activeFilter !== 'all' && (
                <p className="mt-1 text-[13px] text-[#9B9B9B]">Try a different filter</p>
              )}
            </motion.div>
          ) : null}
        </div>
      )}

      {/* ── Lunchie 런치픽 탭 ─────────────────────────────────────────────── */}
      {tab === 'restaurants' && (
        <div className="px-5 space-y-3">
          {journeyDays.map(day => (
            <section key={day.key}>
              <p className="mb-2 text-[12px] font-black text-[#B26A62]">{englishText(day.label)} · {day.stops.length} restaurants</p>
              <div className="space-y-2">
                {day.stops.map((stop, index) => (
                  <button
                    type="button"
                    key={`${stop.restaurant_id}-${stop.at}`}
                    onClick={() => navigate(savedLunchPicks.some(pick => pick.restaurant.id === stop.restaurant_id)
                      ? `/lunchie/results/${encodeURIComponent(stop.restaurant_id)}`
                      : `/lunchie/map?id=${stop.restaurant_id}`)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-[#F0E8E0] bg-white p-3 text-left active:scale-[0.98]"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F6B5AC] text-[11px] font-black text-white">{day.stops.length - index}</span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-[#1A1A1A]">{englishText(stop.name)}</span>
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-[#9B9B9B]"><MapPin size={11} />{englishText(stop.category ?? "Food Spots")}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}

          {!journeyLoading && journeyStops.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
              <div className="text-5xl mb-3">⚡</div>
              <p className="font-bold text-[16px] text-[#1A1A1A] mb-1">No Final Lunchie Picks Yet!</p>
              <p className="text-[13px] text-[#9B9B9B] mb-6">

                Quick Match choices are automatically added to your daily journey
              </p>
              <button onClick={() => navigate('/lunchie/settings')} className="lm-btn-primary px-6 inline-flex items-center justify-center">

                Start Quick Match
              </button>
            </motion.div>
          )}
        </div>
      )}

      {tab === 'coursemaps' && savedPosts.length > 0 && createPortal(
        <div
          className="fixed z-50 flex h-12 items-center rounded-full border border-[#ECC1BB] bg-[#FBECE9] p-1 shadow-[0_10px_26px_rgba(72,43,31,0.2)]"
          style={{
            left: '50%',
            bottom: 'calc(var(--lm-tab-bar-height) + 12px)',
            transform: 'translateX(-50%)',
          }}
          role="group"
          aria-label="Saved Pick View"
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
                style={{ background: selected ? '#80140A' : '#FBECE9', color: selected ? '#FFFFFF' : '#80140A' }}
              >
                {selected && (
                  <motion.span
                    layoutId="saved-view-toggle"
                    className="absolute inset-0 rounded-full bg-[#80140A]"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon size={14} /> {englishText(label)}
                </span>
              </button>
            );
          })}
        </div>,
        document.body,
      )}

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {englishText(pendingUnsaveCourseId && (
            <motion.div className="fixed inset-0 z-[100] flex items-center justify-center px-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button type="button" aria-label="Close Remove Confirmation" className="absolute inset-0 bg-[#2A1A14]/40" onClick={() => setPendingUnsaveCourseId(null)} />
              <motion.section role="dialog" aria-modal="true" aria-labelledby="unsave-confirm-title" className="relative w-full max-w-[320px] rounded-[24px] bg-white p-5 shadow-[0_20px_50px_rgba(48,28,20,0.24)]" initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 12 }}>
                <button type="button" aria-label="Close Remove Confirmation" onClick={() => setPendingUnsaveCourseId(null)} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#F8ECE6] text-[#876E63]"><X size={16} /></button>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFE8E3] text-[#D94E55]"><Bookmark size={21} fill="currentColor" /></span>
                <h2 id="unsave-confirm-title" className="mt-3 text-[17px] font-black text-[#30221C]">Remove this saved pick?</h2>
                <p className="mt-1.5 text-[12px] font-semibold leading-5 text-[#8A746A]">This Lunchie pick will be removed from Saved.</p>
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <button type="button" onClick={() => setPendingUnsaveCourseId(null)} className="h-11 rounded-[14px] border border-[#DFD0C8] bg-white text-[13px] font-black text-[#69564D]">Cancel</button>
                  <button type="button" onClick={confirmUnsave} className="h-11 rounded-[14px] bg-[#E85053] text-[13px] font-black text-white">Remove from Saved</button>
                </div>
              </motion.section>
            </motion.div>
          ))}
        </AnimatePresence>,
        document.body,
      )}

    </div>
  );
}
