import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LoaderCircle, MapPin, Palette, Plus, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { FOOD_FILTER_TAGS, hasFoodTag } from '@/constants/foodTags';
import { getCourseTagStyle } from '@/constants/courseTheme';
import { type FeedLocationFilter, type TagType, useApp } from '@/contexts/AppContext';
import FeedRadiusMap, { type FeedRadiusCenter } from '@/components/feed/FeedRadiusMap';
import UnifiedMunchieCard from '@/components/munchie/UnifiedMunchieCard';
import { FollowButton } from '@/components/follow/FollowButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import { useUserSearch } from '@/hooks/useUserSearch';
import { isWithinRadius } from '@shared/geo';
import { useLocationSearch } from '@/hooks/useLocationSearch';
import { getLocationDetails } from '@/services/placesApi';
import {
  DEFAULT_FEED_VIEW_STATE,
  markFeedProfileNavigation,
  readRestorableFeedViewState,
  saveFeedViewState,
  type FeedViewState,
} from '@/lib/feedHistoryState';

export default function MunchieFeedPage() {
  const [, navigate] = useLocation();
  const { feedPosts, refreshFeedPosts, loadMoreFeedPosts, hasMoreFeedPosts, isLoadingMoreFeedPosts } = useApp();
  const [restoredViewState] = useState(() => readRestorableFeedViewState());
  const initialViewState = restoredViewState ?? DEFAULT_FEED_VIEW_STATE;
  const [activeFilter, setActiveFilter] = useState<TagType | 'all'>(initialViewState.activeFilter);
  const [searchOpen, setSearchOpen] = useState(initialViewState.searchOpen);
  const [searchInput, setSearchInput] = useState(initialViewState.searchInput);
  const [searchTerm, setSearchTerm] = useState(initialViewState.searchInput.trim());
  const auth = useAuthStatus();
  const canSearch = Boolean(auth.data && !auth.data.isAnonymous);
  const userSearch = useUserSearch(searchTerm, canSearch);
  const [showFilters, setShowFilters] = useState(initialViewState.showFilters);
  const [draftCenter, setDraftCenter] = useState<FeedRadiusCenter | null>(initialViewState.draftCenter);
  const [draftRadiusKm, setDraftRadiusKm] = useState(initialViewState.draftRadiusKm);
  const [appliedLocation, setAppliedLocation] = useState<FeedLocationFilter | null>(initialViewState.appliedLocation);
  const [isApplyingLocation, setIsApplyingLocation] = useState(false);
  const [locationDetailsLoadingId, setLocationDetailsLoadingId] = useState<string | null>(null);
  const locationSearch = useLocationSearch(draftCenter ?? undefined);
  const hasMapsKey = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  const currentViewState: FeedViewState = {
    activeFilter,
    searchOpen,
    searchInput,
    showFilters,
    draftCenter,
    draftRadiusKm,
    appliedLocation,
  };
  useEffect(() => {
    saveFeedViewState(currentViewState);
  }, [activeFilter, appliedLocation, draftCenter, draftRadiusKm, searchInput, searchOpen, showFilters]);
  useEffect(() => {
    if (restoredViewState) return;
    void refreshFeedPosts(null).catch(() => undefined);
  }, [refreshFeedPosts, restoredViewState]);
  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);
  const categoryPosts = activeFilter === 'all'
    ? feedPosts
    : feedPosts.filter(post => hasFoodTag(post.tags, activeFilter as TagType));
  const filteredPosts = appliedLocation
    ? categoryPosts.filter(post => post.stops?.some(stop => isWithinRadius(
        appliedLocation.latitude,
        appliedLocation.longitude,
        stop.latitude,
        stop.longitude,
        appliedLocation.radiusKm * 1_000,
      )))
    : categoryPosts;
  const searchActive = searchInput.trim().length > 0;
  const searchPending = searchActive
    && (searchTerm !== searchInput.trim() || userSearch.isLoading || userSearch.isFetching);

  const prepareProfileNavigation = () => {
    markFeedProfileNavigation(currentViewState);
  };

  const pickLocation = async (placeId: string) => {
    if (locationDetailsLoadingId) return;
    setLocationDetailsLoadingId(placeId);
    try {
      const location = await getLocationDetails(placeId, locationSearch.sessionToken);
      setDraftCenter({ lat: location.latitude, lng: location.longitude });
      locationSearch.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '장소 위치를 불러오지 못했어요');
    } finally {
      setLocationDetailsLoadingId(null);
    }
  };

  const applyLocationFilter = async () => {
    if (!draftCenter || isApplyingLocation) return;
    const next = {
      latitude: draftCenter.lat,
      longitude: draftCenter.lng,
      radiusKm: draftRadiusKm,
    };
    setIsApplyingLocation(true);
    try {
      await refreshFeedPosts(next);
      setAppliedLocation(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '근처 피드를 불러오지 못했어요');
    } finally {
      setIsApplyingLocation(false);
    }
  };

  const clearLocationFilter = async () => {
    if (isApplyingLocation) return;
    setIsApplyingLocation(true);
    try {
      await refreshFeedPosts(null);
      setAppliedLocation(null);
      setDraftCenter(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '전체 피드를 불러오지 못했어요');
    } finally {
      setIsApplyingLocation(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#FFF7F2] pb-[calc(65px+43px+1rem)]">
      <header className="sticky top-0 z-30 border-b border-[#EAD7CE] bg-[#FFFDFC] px-4 pb-3 pt-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[25px] font-black leading-none tracking-[-0.03em] text-[#DB2837]">MUNCHIE FEED</h1>
            <p className="mt-2 text-[11px] font-semibold text-[#8D776C]">다녀온 맛집 Munchie 피드를 함께 공유해요</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (searchOpen) {
                  setSearchInput('');
                  setSearchTerm('');
                }
                setSearchOpen(open => !open);
              }}
              aria-label={searchOpen ? '사용자 검색 닫기' : '사용자 검색 열기'}
              aria-expanded={searchOpen}
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 active:scale-95 ${searchOpen ? 'border-[#E96A6D] bg-[#E96A6D] text-white' : 'border-[#E7CFC4] bg-[#FFF8F4] text-[#9A7468]'}`}
            >
              {searchOpen ? <X size={18} /> : <Search size={18} />}
            </button>
            <button
              type="button"
              onClick={() => navigate('/templates')}
              aria-label="전체 템플릿 보기"
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#F0C2B5] bg-[#FFF4EE] text-[#DB6E67] active:scale-95"
            >
              <Palette size={18} />
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(current => !current)}
              aria-label="필터 보기"
              aria-pressed={showFilters}
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 active:scale-95 ${showFilters ? 'border-[#BFD7C8] bg-[#F1FAF4] text-[#4D7D63]' : 'border-[#D8E3DC] bg-[#F8FCFA] text-[#5F7A6B]'}`}
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>
        </div>

        {searchOpen && <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#A08377]" aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={event => setSearchInput(event.target.value.slice(0, 40))}
            placeholder="사용자 이름 또는 @아이디 검색"
            aria-label="사용자 검색"
            autoFocus
            autoCapitalize="none"
            autoComplete="off"
            className="h-11 w-full rounded-2xl border border-[#E5D2C8] bg-[#FFF8F4] pl-10 pr-10 text-[13px] font-semibold text-[#3E302A] outline-none placeholder:text-[#AE9589] focus:border-[#E96A6D] focus:bg-white"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => { setSearchInput(''); setSearchTerm(''); }}
              aria-label="검색어 지우기"
              className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-[#9B8176]"
            >
              <X size={15} />
            </button>
          )}
        </div>}

        {!searchActive && <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 border-t border-[#F0E4DE] pt-3">
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
                  {FOOD_FILTER_TAGS.map(filter => (
                    <button
                      type="button"
                      key={filter.value}
                      onClick={() => setActiveFilter(filter.value)}
                      aria-pressed={activeFilter === filter.value}
                      className="h-8 shrink-0 rounded-[10px] px-3 text-[10px] font-black transition-transform active:scale-95"
                      style={filter.value === 'all'
                        ? activeFilter === filter.value
                          ? { background: '#EE7775', color: '#FFFFFF' }
                          : { background: '#FFF9F5', color: '#6E5B51', border: '1.5px solid #CDBDB4' }
                        : getCourseTagStyle(filter.value, activeFilter === filter.value)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <div className="mt-3 border-t border-[#F0E4DE] pt-3" data-ui="feed-radius-filter">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-1.5 text-[12px] font-black text-[#49382F]"><MapPin size={14} className="text-[#DB5158]" />근처 피드</p>
                    </div>
                    {appliedLocation && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="shrink-0 rounded-full bg-[#EAF5EE] px-2.5 py-1 text-[10px] font-black text-[#4D7D63]"
                      >
                        {appliedLocation.radiusKm}km 적용 중
                      </motion.span>
                    )}
                  </div>

                  {hasMapsKey ? (
                    <>
                      <div className="relative mb-2">
                        <div className="flex h-10 items-center gap-2 rounded-xl border border-[#DED3CD] bg-white px-3 focus-within:border-[#DA6468] focus-within:ring-2 focus-within:ring-[#F6DADB]">
                          {locationSearch.isLoading || locationDetailsLoadingId ? (
                            <LoaderCircle size={14} className="shrink-0 animate-spin text-[#D6575C]" />
                          ) : (
                            <Search size={14} className="shrink-0 text-[#9B887E]" />
                          )}
                          <input
                            value={locationSearch.input}
                            onChange={event => locationSearch.setInput(event.target.value)}
                            placeholder="동네, 주소 또는 장소 검색"
                            aria-label="기준 위치 검색"
                            className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-[#49382F] outline-none placeholder:text-[#B3A49C]"
                          />
                          {locationSearch.input && (
                            <button
                              type="button"
                              onClick={locationSearch.reset}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-[#A9978D]"
                              aria-label="위치 검색어 지우기"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                        {locationSearch.input.trim().length >= 2 && (
                          <div className="absolute inset-x-0 top-[calc(100%+4px)] z-20 max-h-44 overflow-y-auto rounded-xl border border-[#E2D6CF] bg-white p-1.5 shadow-[0_10px_24px_rgba(66,45,36,0.16)]">
                            {locationSearch.isError && (
                              <p className="px-3 py-2 text-[11px] font-semibold text-[#C44D52]">위치 검색에 실패했어요</p>
                            )}
                            {!locationSearch.isLoading && !locationSearch.isError && locationSearch.suggestions.length === 0 && (
                              <p className="px-3 py-2 text-[11px] font-semibold text-[#9B887E]">검색 결과가 없어요</p>
                            )}
                            {locationSearch.suggestions.map(suggestion => (
                              <button
                                key={suggestion.placeId}
                                type="button"
                                disabled={Boolean(locationDetailsLoadingId)}
                                onClick={() => { void pickLocation(suggestion.placeId); }}
                                className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[#FFF5F1] disabled:opacity-50"
                              >
                                <MapPin size={13} className="mt-0.5 shrink-0 text-[#D6575C]" />
                                <span className="text-[11px] font-semibold leading-snug text-[#59463C]">{suggestion.text}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <FeedRadiusMap center={draftCenter} radiusKm={draftRadiusKm} onCenterChange={setDraftCenter} />
                    </>
                  ) : (
                    <div className="flex h-24 items-center justify-center rounded-[18px] border border-dashed border-[#D7E5DB] bg-[#F4F8F5] px-5 text-center text-[11px] font-bold text-[#789082]">
                      지도 API 설정 후 위치 반경 필터를 사용할 수 있어요.
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-3">
                    <label htmlFor="feed-radius" className="shrink-0 text-[11px] font-black text-[#5D493F]">반경</label>
                    <input
                      id="feed-radius"
                      type="range"
                      min="1"
                      max="30"
                      step="1"
                      value={draftRadiusKm}
                      onChange={event => setDraftRadiusKm(Number(event.target.value))}
                      className="h-1.5 min-w-0 flex-1 accent-[#E95259]"
                    />
                    <output htmlFor="feed-radius" className="w-12 text-right text-[12px] font-black tabular-nums text-[#D94C55]">{draftRadiusKm} km</output>
                  </div>

                  <div className="mt-3 flex gap-2">
                    {appliedLocation && (
                      <button
                        type="button"
                        onClick={() => { void clearLocationFilter(); }}
                        disabled={isApplyingLocation}
                        className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-[#DCCFC8] bg-white px-3 text-[11px] font-black text-[#806D63] disabled:opacity-50"
                      >
                        <RotateCcw size={13} />초기화
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { void applyLocationFilter(); }}
                      disabled={!draftCenter || isApplyingLocation || !hasMapsKey}
                      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#E95259] text-[12px] font-black text-white shadow-[0_6px_14px_rgba(217,76,85,0.18)] transition-transform active:scale-[0.98] disabled:bg-[#D8CBC5] disabled:shadow-none"
                    >
                      {isApplyingLocation && <LoaderCircle size={14} className="animate-spin" />}
                      {draftCenter ? `${draftRadiusKm}km 안의 피드 보기` : '지도에 위치를 찍어주세요'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>}
      </header>

      <main className="space-y-4 px-3 py-4">
        {searchActive ? (
          <section aria-label="사용자 검색 결과" className="overflow-hidden rounded-[22px] border border-[#E9D8CF] bg-white shadow-[0_8px_24px_rgba(89,56,42,0.07)]">
            {auth.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-14 text-[13px] font-bold text-[#907A70]"><LoaderCircle className="size-4 animate-spin" />로그인 상태 확인 중…</div>
            ) : !canSearch ? (
              <div className="px-6 py-12 text-center">
                <p className="text-[15px] font-black text-[#342720]">로그인 후 사용자를 검색할 수 있어요</p>
                <p className="mt-1 text-[12px] font-semibold text-[#9A857A]">프로필을 방문하고 서로 팔로우해 보세요.</p>
                <button type="button" onClick={() => navigate('/profile')} className="mt-5 h-11 rounded-xl bg-[#EB5053] px-5 text-[13px] font-black text-white">로그인하러 가기</button>
              </div>
            ) : searchPending ? (
              <div className="flex items-center justify-center gap-2 py-14 text-[13px] font-bold text-[#907A70]"><LoaderCircle className="size-4 animate-spin" />사용자를 찾는 중…</div>
            ) : userSearch.isError ? (
              <div className="px-6 py-12 text-center text-[13px] font-bold text-[#C25357]">{userSearch.error.message}</div>
            ) : (userSearch.data?.length ?? 0) === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="text-[15px] font-black text-[#342720]">검색 결과가 없어요</p>
                <p className="mt-1 text-[12px] font-semibold text-[#9A857A]">이름이나 @아이디를 다시 확인해 주세요.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F3E8E2]">
                {userSearch.data?.map(user => (
                  <div key={user.id} className="flex items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (!user.is_self) prepareProfileNavigation();
                        navigate(user.is_self ? '/profile' : `/profile/${user.id}`);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <Avatar className="size-11 shrink-0 border border-[#F0D8CE]">
                        {user.profile_image_url && <AvatarImage src={user.profile_image_url} alt="" />}
                        <AvatarFallback className="bg-[#FFF1EB] font-black text-[#B45F5C]">{user.username.slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-black text-[#342720]">{user.username}</span>
                        <span className="mt-0.5 block truncate text-[11px] font-semibold text-[#9A7D71]">@{user.handle}</span>
                      </span>
                    </button>
                    {user.is_self ? (
                      <span className="rounded-full bg-[#F5EDE8] px-3 py-1.5 text-[11px] font-bold text-[#8D756A]">내 프로필</span>
                    ) : (
                      <FollowButton userId={user.id} initialFollowing={user.is_following} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : <>
        <AnimatePresence mode="popLayout">
          {filteredPosts.map(post => (
            <motion.div
              key={post.id}
              layout
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <UnifiedMunchieCard post={post} onBeforeAuthorProfileNavigate={prepareProfileNavigation} />
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredPosts.length === 0 && (
          <div className="rounded-[26px] border border-dashed border-[#DCCBC0] bg-white px-6 py-16 text-center">
            <div className="mb-3 text-5xl">🍽️</div>
            <p className="text-[16px] font-black text-[#2D211C]">{appliedLocation ? '이 반경에는 피드가 없어요' : '아직 Munchie 피드가 없어요'}</p>
            <p className="mt-1 text-[12px] font-semibold text-[#9A8579]">{appliedLocation ? '핀을 옮기거나 반경을 넓혀보세요' : '첫 번째 Munchie 피드를 만들어보세요'}</p>
          </div>
        )}
        {activeFilter === 'all' && filteredPosts.length > 0 && hasMoreFeedPosts && (
          <button
            type="button"
            onClick={() => { void loadMoreFeedPosts(); }}
            disabled={isLoadingMoreFeedPosts}
            className="mx-auto block rounded-full border border-[#F1C2B6] bg-white px-5 py-3 text-[13px] font-black text-[#D95359] disabled:opacity-50"
          >
            {isLoadingMoreFeedPosts ? '다음 피드를 불러오는 중…' : '더 많은 Munchie 보기'}
          </button>
        )}
        </>}
      </main>
      <button
        type="button"
        onClick={() => navigate('/coursemap/new')}
        aria-label="새 Munchie 피드 작성"
        className="fixed right-6 z-40 flex h-16 w-16 items-center justify-center rounded-full border border-white/70 bg-[#F06F72] text-white shadow-[0_10px_22px_rgba(238,80,83,0.32)] active:scale-95"
        style={{ bottom: 'calc(var(--lm-tab-bar-height, 76px) + 18px + env(safe-area-inset-bottom, 0px))' }}
      >
        <Plus size={34} strokeWidth={2.2} />
      </button>
    </div>
  );
}
