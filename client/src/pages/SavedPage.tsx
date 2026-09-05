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
    ? `첫 장소까지 직선거리 ${Math.round(metres / 10) * 10}m`
    : `첫 장소까지 직선거리 ${(metres / 1_000).toFixed(metres < 10_000 ? 1 : 0)}km`;
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
      setLocationError('이 브라우저에서는 현재 위치를 사용할 수 없어요.');
      return;
    }
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ latitude: coords.latitude, longitude: coords.longitude });
        setSort('nearby');
      },
      () => setLocationError('위치 권한을 허용하면 첫 장소까지의 직선거리로 정렬할 수 있어요.'),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 8_000 },
    );
  };

  const confirmUnsave = async () => {
    if (!pendingUnsaveCourseId) return;
    const removed = await unsaveCourse(pendingUnsaveCourseId);
    setPendingUnsaveCourseId(null);
    if (removed) toast.success('저장을 취소했어요.');
    else toast.error('저장을 취소하지 못했어요. 다시 시도해 주세요.');
  };

  const isAnonymous = auth.data?.isAnonymous === true;

  return (
    <div className="min-h-dvh bg-[#FCF4EE] pb-24">
      <div className="px-5 pb-4 pt-12" aria-hidden="true" />

      {!isAnonymous && (
        <section className="space-y-3 px-4 pb-4" aria-label="저장 코스 검색과 정렬">
          <label className="flex h-11 items-center gap-2 rounded-2xl border border-[#E8D8CF] bg-white px-3 shadow-sm">
            <Search size={16} className="text-[#B29B90]" aria-hidden="true" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="코스, 식당, 지역 검색"
              className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-[#3A2922] outline-none placeholder:text-[#B6A59B]"
              aria-label="저장 코스 검색"
            />
            {query && <button type="button" onClick={() => setQuery('')} aria-label="검색어 지우기"><X size={15} /></button>}
          </label>

          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setSort('recent')} aria-pressed={sort === 'recent'} className={`h-9 rounded-full px-3 text-[11px] font-black ${sort === 'recent' ? 'bg-[#E85053] text-white' : 'border border-[#E4D6CE] bg-white text-[#79655B]'}`}>최근 저장순</button>
              <button type="button" onClick={requestNearbySort} aria-pressed={sort === 'nearby'} className={`flex h-9 items-center gap-1 rounded-full px-3 text-[11px] font-black ${sort === 'nearby' ? 'bg-[#E85053] text-white' : 'border border-[#E4D6CE] bg-white text-[#79655B]'}`}><LocateFixed size={13} />가까운순</button>
            </div>
            <div className="flex rounded-full border border-[#E4D6CE] bg-white p-1" aria-label="저장 보기 방식">
              <button type="button" onClick={() => setView('list')} aria-label="목록 보기" aria-pressed={view === 'list'} className={`flex h-8 w-8 items-center justify-center rounded-full ${view === 'list' ? 'bg-[#FFE3DE] text-[#D94E55]' : 'text-[#9B8980]'}`}><List size={15} /></button>
              <button type="button" onClick={() => setView('map')} aria-label="지도 보기" aria-pressed={view === 'map'} className={`flex h-8 w-8 items-center justify-center rounded-full ${view === 'map' ? 'bg-[#FFE3DE] text-[#D94E55]' : 'text-[#9B8980]'}`}><MapIcon size={15} /></button>
            </div>
          </div>
          {locationError && <p role="alert" className="text-[11px] font-semibold text-[#C55B5B]">{locationError}</p>}
        </section>
      )}

      <main className="px-3 pb-10">
        {!isAnonymous && savedCoursesError && savedCourseRecords.length > 0 && (
          <div role="status" className="mx-2 mb-3 flex items-center justify-between gap-2 rounded-2xl border border-[#F0CCC5] bg-white px-3 py-2 text-[10px] font-bold text-[#A45B55]">
            <span>최근 저장 목록을 표시 중이에요.</span>
            <button type="button" onClick={() => void refreshSavedCourses()} className="inline-flex items-center gap-1 rounded-full bg-[#FFE8E3] px-2 py-1"><RefreshCw size={11} />새로고침</button>
          </div>
        )}
        {isAnonymous ? (
          <section className="mx-2 mt-10 rounded-[28px] border border-[#E8D8CF] bg-white px-6 py-12 text-center shadow-sm">
            <div className="text-5xl">🔖</div>
            <h2 className="mt-4 text-[17px] font-black text-[#30221C]">로그인하면 저장한 코스를 어디서든 볼 수 있어요</h2>
            <p className="mt-2 text-[12px] font-semibold leading-5 text-[#9A8579]">저장은 계정에 안전하게 보관되며 다른 기기에서도 동기화됩니다.</p>
            <button type="button" onClick={() => startGoogleAuth('/saved')} className="lm-btn-primary mt-6 inline-flex px-6">Google로 로그인</button>
          </section>
        ) : isLoadingSavedCourses ? (
          <div role="status" className="py-20 text-center text-[13px] font-bold text-[#9A8579]">저장한 코스를 불러오는 중이에요…</div>
        ) : savedCoursesError && savedCourseRecords.length === 0 ? (
          <section role="alert" className="mx-2 mt-8 rounded-[24px] border border-[#F0CCC5] bg-white p-6 text-center">
            <p className="text-[14px] font-black text-[#3A2922]">저장 목록을 불러오지 못했어요</p>
            <p className="mt-1 text-[11px] font-semibold text-[#A47E73]">{savedCoursesError}</p>
            <button type="button" onClick={() => void refreshSavedCourses()} className="mt-4 inline-flex h-10 items-center gap-1 rounded-xl bg-[#E85053] px-4 text-[12px] font-black text-white"><RefreshCw size={14} />다시 시도</button>
          </section>
        ) : visibleRecords.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-16 text-center">
            <div className="mb-3 text-5xl">🔖</div>
            <p className="mb-1 text-[16px] font-bold text-[#1A1A1A]">{query ? '검색 결과가 없어요' : '아직 저장한 코스가 없어요'}</p>
            <p className="mb-6 text-[13px] text-[#9B9B9B]">{query ? '다른 식당명이나 지역을 검색해보세요' : '발견에서 마음에 드는 코스를 저장해보세요'}</p>
            {!query && <button onClick={() => navigate('/feed')} className="lm-btn-primary inline-flex items-center justify-center px-6">발견으로 이동</button>}
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
                  <span className="absolute left-2 top-2 z-20 rounded-full bg-[#30221C]/85 px-2 py-1 text-[9px] font-black text-white">{placeCount > 0 ? `${placeCount}곳 코스` : '장소 정보 없음'}</span>
                  {distanceLabel && <span className="absolute inset-x-2 bottom-1.5 z-20 truncate rounded-full bg-black/70 px-2 py-1 text-center text-[8px] font-black text-white">{distanceLabel}</span>}
                  <UnifiedMunchieCard post={record.post} courseOverride={record.course} restaurantOverrides={record.restaurants} compact homeSummary detailOrigin="saved" savedView="list" />
                  <button type="button" onClick={() => setPendingUnsaveCourseId(record.courseId)} className={`absolute bottom-1.5 right-1.5 z-30 origin-bottom-right scale-[0.8] shadow-sm ${SAVED_BOOKMARK_BUTTON_CLASS}`} aria-label="저장 취소"><Bookmark size={20} strokeWidth={2} fill="currentColor" /></button>
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
              <button type="button" aria-label="저장 취소 확인 닫기" className="absolute inset-0 bg-[#2A1A14]/40" onClick={() => setPendingUnsaveCourseId(null)} />
              <motion.section role="dialog" aria-modal="true" aria-labelledby="unsave-confirm-title" className="relative w-full max-w-[320px] rounded-[24px] bg-white p-5 shadow-[0_20px_50px_rgba(48,28,20,0.24)]" initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 12 }}>
                <button type="button" aria-label="저장 취소 확인 닫기" onClick={() => setPendingUnsaveCourseId(null)} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#F8ECE6] text-[#876E63]"><X size={16} /></button>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFE8E3] text-[#D94E55]"><Bookmark size={21} fill="currentColor" /></span>
                <h2 id="unsave-confirm-title" className="mt-3 text-[17px] font-black text-[#30221C]">저장을 취소할까요?</h2>
                <p className="mt-1.5 text-[12px] font-semibold leading-5 text-[#8A746A]">계정의 저장 목록에서 이 코스가 사라져요.</p>
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <button type="button" onClick={() => setPendingUnsaveCourseId(null)} className="h-11 rounded-[14px] border border-[#DFD0C8] bg-white text-[13px] font-black text-[#69564D]">취소</button>
                  <button type="button" onClick={() => void confirmUnsave()} className="h-11 rounded-[14px] bg-[#E85053] text-[13px] font-black text-white">저장 취소</button>
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
