import { countLabel } from '@/lib/displayCopy';
/** Lunchie Munchie MVP — 식당 한 곳도 하나의 코스로 보고 서버 저장 항목을 통합한다. */
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, List, LocateFixed, Map as MapIcon, RefreshCw, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation, useSearch } from 'wouter';
import { distanceMetres } from '@shared/geo';
import { useApp, type SavedCourseRecord } from '@/contexts/AppContext';
import UnifiedMunchieCard, { SAVED_BOOKMARK_BUTTON_CLASS } from '@/components/munchie/UnifiedMunchieCard';
import { SavedMunchieMap } from '@/components/saved/SavedMunchieMap';
import { buildSavedFeedMapPoints } from '@/lib/savedFeedMap';
import { getSavedViewFromSearch, type SavedViewMode } from '@/lib/savedNavigation';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import { startGoogleAuth } from '@/services/authApi';

type SavedSort = 'recent' | 'nearby';
type UserPosition = { latitude: number; longitude: number };

export function getCoursePlaceCount(stops: unknown[] | undefined): number {
  return stops?.length ?? 0;
}

export function savedCourseSearchText(record: SavedCourseRecord) {
  return [
    record.course.title,
    record.course.description,
    record.course.region,
    ...record.course.tags,
    ...record.restaurantNames,
  ].join(' ').toLocaleLowerCase('ko-KR');
}

export function savedCourseDistanceMetres(record: SavedCourseRecord, position: UserPosition | null) {
  if (!position || !record.firstLocation) return Number.POSITIVE_INFINITY;
  return distanceMetres(
    position.latitude,
    position.longitude,
    record.firstLocation.latitude,
    record.firstLocation.longitude,
  );
}

export function filterAndSortSavedCourses(
  records: SavedCourseRecord[],
  query: string,
  sort: SavedSort,
  position: UserPosition | null,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR');
  const filtered = normalizedQuery
    ? records.filter(record => savedCourseSearchText(record).includes(normalizedQuery))
    : records;
  return filtered.slice().sort((left, right) => sort === 'nearby'
    ? savedCourseDistanceMetres(left, position) - savedCourseDistanceMetres(right, position)
      || right.savedAt.localeCompare(left.savedAt)
    : right.savedAt.localeCompare(left.savedAt));
}

function formatStraightLineDistance(metres: number) {
  if (!Number.isFinite(metres)) return null;
  return metres < 1_000
    ? `${Math.round(metres / 10) * 10}m to first place (straight-line)`
    : `${(metres / 1_000).toFixed(metres < 10_000 ? 1 : 0)}km to first place (straight-line)`;
}

export default function SavedPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const {
    savedCourseRecords,
    isLoadingSavedCourses,
    savedCoursesError,
    refreshSavedCourses,
    unsaveCourse,
  } = useApp();
  const auth = useAuthStatus();
  const view = getSavedViewFromSearch(search);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SavedSort>('recent');
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(() => (
    new URLSearchParams(search).get('selectedFeed')
  ));
  const [pendingUnsaveCourseId, setPendingUnsaveCourseId] = useState<string | null>(null);

  const visibleRecords = useMemo(
    () => filterAndSortSavedCourses(savedCourseRecords, query, sort, position),
    [position, query, savedCourseRecords, sort],
  );
  const savedCourseById = useMemo(
    () => new Map(visibleRecords.map(record => [record.courseId, record.course])),
    [visibleRecords],
  );
  const savedRestaurantById = useMemo(
    () => new Map(visibleRecords.flatMap(record => record.restaurants).map(restaurant => [restaurant.id, restaurant])),
    [visibleRecords],
  );
  const mapPoints = useMemo(() => buildSavedFeedMapPoints({
    posts: visibleRecords.map(record => record.post),
    getCourseById: courseId => savedCourseById.get(courseId),
    getRestaurantById: restaurantId => savedRestaurantById.get(restaurantId),
  }), [savedCourseById, savedRestaurantById, visibleRecords]);

  const setView = (next: SavedViewMode) => {
    const selected = next === 'map' && selectedFeedId
      ? `&selectedFeed=${encodeURIComponent(selectedFeedId)}`
      : '';
    navigate(`/saved?view=${next}${selected}`, { replace: true });
  };

  const requestNearbySort = () => {
    if (position) {
      setSort('nearby');
      return;
    }
    if (!navigator.geolocation) {
      setLocationError("Location isn't available in this browser.");
      return;
    }
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ latitude: coords.latitude, longitude: coords.longitude });
        setSort('nearby');
      },
      () => setLocationError("Allow location access to sort by distance to the first place."),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 8_000 },
    );
  };

  const confirmUnsave = async () => {
    if (!pendingUnsaveCourseId) return;
    const removed = await unsaveCourse(pendingUnsaveCourseId);
    setPendingUnsaveCourseId(null);
    if (removed) toast.success("Removed from saved.");
    else toast.error("Couldn't unsave the course. Try again.");
  };

  const isAnonymous = auth.data?.isAnonymous === true;

  return (
    <div className="min-h-dvh bg-[#FCF4EE] pb-24">
      <div className="px-5 pb-4 pt-12" aria-hidden="true" />

      {!isAnonymous && (
        <section className="space-y-3 px-4 pb-4" aria-label="Search and sort saved courses">
          <label className="flex h-11 items-center gap-2 rounded-2xl border border-[#E8D8CF] bg-white px-3 shadow-sm">
            <Search size={16} className="text-[#B29B90]" aria-hidden="true" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search courses, restaurants or areas"
              className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-[#3A2922] outline-none placeholder:text-[#B6A59B]"
              aria-label="Search saved courses"
            />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X size={15} /></button>}
          </label>

          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setSort('recent')} aria-pressed={sort === 'recent'} className={`h-9 rounded-full px-3 text-[11px] font-black ${sort === 'recent' ? 'bg-[#E85053] text-white' : 'border border-[#E4D6CE] bg-white text-[#79655B]'}`}>Recently saved</button>
              <button type="button" onClick={requestNearbySort} aria-pressed={sort === 'nearby'} className={`flex h-9 items-center gap-1 rounded-full px-3 text-[11px] font-black ${sort === 'nearby' ? 'bg-[#E85053] text-white' : 'border border-[#E4D6CE] bg-white text-[#79655B]'}`}><LocateFixed size={13} />Nearest</button>
            </div>
            <div className="flex rounded-full border border-[#E4D6CE] bg-white p-1" aria-label="Saved view">
              <button type="button" onClick={() => setView('list')} aria-label="List view" aria-pressed={view === 'list'} className={`flex h-8 w-8 items-center justify-center rounded-full ${view === 'list' ? 'bg-[#FFE3DE] text-[#D94E55]' : 'text-[#9B8980]'}`}><List size={15} /></button>
              <button type="button" onClick={() => setView('map')} aria-label="Map view" aria-pressed={view === 'map'} className={`flex h-8 w-8 items-center justify-center rounded-full ${view === 'map' ? 'bg-[#FFE3DE] text-[#D94E55]' : 'text-[#9B8980]'}`}><MapIcon size={15} /></button>
            </div>
          </div>
          {locationError && <p role="alert" className="text-[11px] font-semibold text-[#C55B5B]">{locationError}</p>}
        </section>
      )}

      <main className="px-3 pb-10">
        {!isAnonymous && savedCoursesError && savedCourseRecords.length > 0 && (
          <div role="status" className="mx-2 mb-3 flex items-center justify-between gap-2 rounded-2xl border border-[#F0CCC5] bg-white px-3 py-2 text-[10px] font-bold text-[#A45B55]">
            <span>Showing your last saved list.</span>
            <button type="button" onClick={() => void refreshSavedCourses()} className="inline-flex items-center gap-1 rounded-full bg-[#FFE8E3] px-2 py-1"><RefreshCw size={11} />Refresh</button>
          </div>
        )}
        {isAnonymous ? (
          <section className="mx-2 mt-10 rounded-[28px] border border-[#E8D8CF] bg-white px-6 py-12 text-center shadow-sm">
            <div className="text-5xl">🔖</div>
            <h2 className="mt-4 text-[17px] font-black text-[#30221C]">Take your saved courses with you</h2>
            <p className="mt-2 text-[12px] font-semibold leading-5 text-[#9A8579]">Log in to keep your saved courses across devices.</p>
            <button type="button" onClick={() => startGoogleAuth('/saved')} className="lm-btn-primary mt-6 inline-flex px-6">Continue with Google</button>
          </section>
        ) : isLoadingSavedCourses ? (
          <div role="status" className="py-20 text-center text-[13px] font-bold text-[#9A8579]">Loading saved courses…</div>
        ) : savedCoursesError && savedCourseRecords.length === 0 ? (
          <section role="alert" className="mx-2 mt-8 rounded-[24px] border border-[#F0CCC5] bg-white p-6 text-center">
            <p className="text-[14px] font-black text-[#3A2922]">Couldn't load your saved courses</p>
            <p className="mt-1 text-[11px] font-semibold text-[#A47E73]">{savedCoursesError}</p>
            <button type="button" onClick={() => void refreshSavedCourses()} className="mt-4 inline-flex h-10 items-center gap-1 rounded-xl bg-[#E85053] px-4 text-[12px] font-black text-white"><RefreshCw size={14} />Try again</button>
          </section>
        ) : visibleRecords.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-16 text-center">
            <div className="mb-3 text-5xl">🔖</div>
            <p className="mb-1 text-[16px] font-bold text-[#1A1A1A]">{query ? "No results found" : "Save something for later"}</p>
            <p className="mb-6 text-[13px] text-[#9B9B9B]">{query ? "Try another restaurant or area" : "Find a post you love and tap Save."}</p>
            {!query && <button onClick={() => navigate('/feed')} className="lm-btn-primary inline-flex items-center justify-center px-6">Browse Munchie Feed</button>}
          </motion.div>
        ) : view === 'map' ? (
          <div className="h-[calc(100dvh-250px)] min-h-[430px] px-1">
            <SavedMunchieMap points={mapPoints} selectedFeedId={selectedFeedId} onSelectedFeedIdChange={setSelectedFeedId} />
          </div>
        ) : (
          <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 items-start gap-3">
            {visibleRecords.map(record => {
              const placeCount = getCoursePlaceCount(record.course.stops);
              const distanceLabel = sort === 'nearby'
                ? formatStraightLineDistance(savedCourseDistanceMetres(record, position))
                : null;
              return (
                <div key={record.courseId} className="relative min-w-0">
                  <span className="absolute left-2 top-2 z-20 rounded-full bg-[#30221C]/85 px-2 py-1 text-[9px] font-black text-white">{placeCount > 0 ? countLabel(placeCount, 'place') : "No place details"}</span>
                  {distanceLabel && <span className="absolute inset-x-2 bottom-1.5 z-20 truncate rounded-full bg-black/70 px-2 py-1 text-center text-[8px] font-black text-white">{distanceLabel}</span>}
                  <UnifiedMunchieCard post={record.post} courseOverride={record.course} restaurantOverrides={record.restaurants} compact homeSummary detailOrigin="saved" savedView="list" />
                  <button type="button" onClick={() => setPendingUnsaveCourseId(record.courseId)} className={`absolute bottom-1.5 right-1.5 z-30 origin-bottom-right scale-[0.8] shadow-sm ${SAVED_BOOKMARK_BUTTON_CLASS}`} aria-label="Unsave"><Bookmark size={20} strokeWidth={2} fill="currentColor" /></button>
                </div>
              );
            })}
          </motion.section>
        )}
      </main>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {pendingUnsaveCourseId && (
            <motion.div className="fixed inset-0 z-[100] flex items-center justify-center px-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button type="button" aria-label="Close unsave confirmation" className="absolute inset-0 bg-[#2A1A14]/40" onClick={() => setPendingUnsaveCourseId(null)} />
              <motion.section role="dialog" aria-modal="true" aria-labelledby="unsave-confirm-title" className="relative w-full max-w-[320px] rounded-[24px] bg-white p-5 shadow-[0_20px_50px_rgba(48,28,20,0.24)]" initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 12 }}>
                <button type="button" aria-label="Close unsave confirmation" onClick={() => setPendingUnsaveCourseId(null)} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#F8ECE6] text-[#876E63]"><X size={16} /></button>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFE8E3] text-[#D94E55]"><Bookmark size={21} fill="currentColor" /></span>
                <h2 id="unsave-confirm-title" className="mt-3 text-[17px] font-black text-[#30221C]">Unsave this course?</h2>
                <p className="mt-1.5 text-[12px] font-semibold leading-5 text-[#8A746A]">This removes it from your saved courses.</p>
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <button type="button" onClick={() => setPendingUnsaveCourseId(null)} className="h-11 rounded-[14px] border border-[#DFD0C8] bg-white text-[13px] font-black text-[#69564D]">Cancel</button>
                  <button type="button" onClick={() => void confirmUnsave()} className="h-11 rounded-[14px] bg-[#E85053] text-[13px] font-black text-white">Unsave</button>
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
