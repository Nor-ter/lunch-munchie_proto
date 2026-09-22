import { displayLabel } from '@/lib/displayCopy';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LoaderCircle, MapPin, Plus, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
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

export default function MunchieFeedPage() {
  const [, navigate] = useLocation();
  const { feedPosts, refreshFeedPosts, loadMoreFeedPosts, hasMoreFeedPosts, isLoadingMoreFeedPosts } = useApp();
  const [activeFilter, setActiveFilter] = useState<TagType | 'all'>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const auth = useAuthStatus();
  const canSearch = Boolean(auth.data && !auth.data.isAnonymous);
  const userSearch = useUserSearch(searchTerm, canSearch);
  const [showFilters, setShowFilters] = useState(false);
  const [draftCenter, setDraftCenter] = useState<FeedRadiusCenter | null>(null);
  const [draftRadiusKm, setDraftRadiusKm] = useState(5);
  const [appliedLocation, setAppliedLocation] = useState<FeedLocationFilter | null>(null);
  const [isApplyingLocation, setIsApplyingLocation] = useState(false);
  const [locationDetailsLoadingId, setLocationDetailsLoadingId] = useState<string | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const locationSearch = useLocationSearch(draftCenter ?? undefined);
  const hasMapsKey = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  useEffect(() => { void refreshFeedPosts(null).catch(() => undefined); }, [refreshFeedPosts]);
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
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (
      !sentinel
      || activeFilter !== 'all'
      || !hasMoreFeedPosts
      || isLoadingMoreFeedPosts
      || typeof IntersectionObserver === 'undefined'
    ) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      void loadMoreFeedPosts().catch(error => {
        toast.error(error instanceof Error ? error.message : "Couldn't load more posts");
      });
    }, { rootMargin: '400px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeFilter, filteredPosts.length, hasMoreFeedPosts, isLoadingMoreFeedPosts, loadMoreFeedPosts]);
  const searchActive = searchInput.trim().length > 0;
  const searchPending = searchActive
    && (searchTerm !== searchInput.trim() || userSearch.isLoading || userSearch.isFetching);
  const courseCreationFab = typeof document === 'undefined' ? null : createPortal(
    <button
      type="button"
      onClick={() => navigate('/coursemap/new')}
      aria-label="Create course"
      className="fixed bottom-[calc(var(--lm-tab-bar-height)+14px)] right-[max(18px,calc((100vw-480px)/2+18px))] z-40 flex size-[58px] items-center justify-center rounded-full border border-white/20 bg-[rgba(232,80,83,0.9)] text-white shadow-[0_10px_28px_rgba(119,35,45,0.24),0_2px_8px_rgba(119,35,45,0.12)] backdrop-blur-[12px] transition-[transform,background-color,box-shadow] hover:bg-[rgba(218,66,71,0.94)] hover:shadow-[0_13px_32px_rgba(119,35,45,0.28),0_3px_10px_rgba(119,35,45,0.14)] active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFB6C5]"
    >
      <Plus size={25} strokeWidth={2} aria-hidden="true" />
    </button>,
    document.body,
  );

  const pickLocation = async (placeId: string) => {
    if (locationDetailsLoadingId) return;
    setLocationDetailsLoadingId(placeId);
    try {
      const location = await getLocationDetails(placeId, locationSearch.sessionToken);
      setDraftCenter({ lat: location.latitude, lng: location.longitude });
      locationSearch.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't find that location");
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
      toast.error(error instanceof Error ? error.message : "Couldn't load nearby posts");
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
      toast.error(error instanceof Error ? error.message : "Couldn't load posts");
    } finally {
      setIsApplyingLocation(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#FFF7F2] pb-[calc(65px+43px+1rem)]">
      <div className="fixed right-3 top-[calc(env(safe-area-inset-top)+12px)] z-40 flex w-[min(84vw,360px)] flex-col items-end gap-2 px-1">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              if (searchOpen) {
                setSearchInput('');
                setSearchTerm('');
              }
              setSearchOpen(open => !open);
            }}
            aria-label={searchOpen ? "Close profile search" : "Open profile search"}
            aria-expanded={searchOpen}
            className={`flex h-9 w-9 items-center justify-center rounded-full border-2 active:scale-95 ${searchOpen ? 'border-[#E96A6D] bg-[#E96A6D] text-white' : 'border-[#E7CFC4] bg-[#FFF8F4] text-[#9A7468]'}`}
          >
            {searchOpen ? <X size={18} /> : <Search size={18} />}
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(current => !current)}
            aria-label="Show filters"
            aria-pressed={showFilters}
            className={`flex h-9 w-9 items-center justify-center rounded-full border-2 active:scale-95 ${showFilters ? 'border-[#BFD7C8] bg-[#F1FAF4] text-[#4D7D63]' : 'border-[#D8E3DC] bg-[#F8FCFA] text-[#5F7A6B]'}`}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {searchOpen && <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#A08377]" aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={event => setSearchInput(event.target.value.slice(0, 40))}
            placeholder="Search by name or @username"
            aria-label="Search profiles"
            autoFocus
            autoCapitalize="none"
            autoComplete="off"
            className="h-11 w-full rounded-2xl border border-[#E5D2C8] bg-[#FFF8F4] pl-10 pr-10 text-[13px] font-semibold text-[#3E302A] outline-none placeholder:text-[#AE9589] focus:border-[#E96A6D] focus:bg-white"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => { setSearchInput(''); setSearchTerm(''); }}
              aria-label="Clear search"
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
                      className="h-8 shrink-0 rounded-[10px] px-3 text-[11px] font-black transition-transform active:scale-95"
                      style={filter.value === 'all'
                        ? activeFilter === filter.value
                          ? { background: '#EE7775', color: '#FFFFFF' }
                          : { background: '#FFF9F5', color: '#6E5B51', border: '1.5px solid #CDBDB4' }
                        : getCourseTagStyle(filter.value, activeFilter === filter.value)}
                    >
                      {displayLabel(filter.label)}
                    </button>
                  ))}
                </div>

                <div className="mt-3 border-t border-[#F0E4DE] pt-3" data-ui="feed-radius-filter">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-1.5 text-[12px] font-black text-[#49382F]"><MapPin size={14} className="text-[#DB5158]" />Nearby posts</p>
                    </div>
                    {appliedLocation && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="shrink-0 rounded-full bg-[#EAF5EE] px-2.5 py-1 text-[11px] font-black text-[#4D7D63]"
                      >
                        {appliedLocation.radiusKm}km radius
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
                            placeholder="Search an area, address or place"
                            aria-label="Search location"
                            className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-[#49382F] outline-none placeholder:text-[#B3A49C]"
                          />
                          {locationSearch.input && (
                            <button
                              type="button"
                              onClick={locationSearch.reset}
                              className="flex h-6 w-6 items-center justify-center rounded-full text-[#A9978D]"
                              aria-label="Clear location search"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                        {locationSearch.input.trim().length >= 2 && (
                          <div className="absolute inset-x-0 top-[calc(100%+4px)] z-20 max-h-44 overflow-y-auto rounded-xl border border-[#E2D6CF] bg-white p-1.5 shadow-[0_10px_24px_rgba(66,45,36,0.16)]">
                            {locationSearch.isError && (
                              <p className="px-3 py-2 text-[11px] font-semibold text-[#C44D52]">Couldn't search locations</p>
                            )}
                            {!locationSearch.isLoading && !locationSearch.isError && locationSearch.suggestions.length === 0 && (
                              <p className="px-3 py-2 text-[11px] font-semibold text-[#9B887E]">No results found</p>
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

                      Location filters are unavailable right now.
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-3">
                    <label htmlFor="feed-radius" className="shrink-0 text-[11px] font-black text-[#5D493F]">Radius</label>
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
                        <RotateCcw size={13} />Reset
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { void applyLocationFilter(); }}
                      disabled={!draftCenter || isApplyingLocation || !hasMapsKey}
                      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#E95259] text-[12px] font-black text-white shadow-[0_6px_14px_rgba(217,76,85,0.18)] transition-transform active:scale-[0.98] disabled:bg-[#D8CBC5] disabled:shadow-none"
                    >
                      {isApplyingLocation && <LoaderCircle size={14} className="animate-spin" />}
                      {draftCenter ? `Show posts within ${draftRadiusKm}km` : "Choose a location on the map"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>}
      </div>

      <main className={`px-2 py-3 ${searchActive ? 'pt-32' : 'pt-16'}`}>
        {searchActive ? (
          <section aria-label="Profile search results" className="overflow-hidden rounded-[22px] border border-[#E9D8CF] bg-white shadow-[0_8px_24px_rgba(89,56,42,0.07)]">
            {auth.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-14 text-[13px] font-bold text-[#907A70]"><LoaderCircle className="size-4 animate-spin" />Checking login status…</div>
            ) : !canSearch ? (
              <div className="px-6 py-12 text-center">
                <p className="text-[15px] font-black text-[#342720]">Log in to find people</p>
                <p className="mt-1 text-[12px] font-semibold text-[#9A857A]">Find food lovers to follow.</p>
                <button type="button" onClick={() => navigate('/profile')} className="mt-5 h-11 rounded-xl bg-[#EB5053] px-5 text-[13px] font-black text-white">Log in</button>
              </div>
            ) : searchPending ? (
              <div className="flex items-center justify-center gap-2 py-14 text-[13px] font-bold text-[#907A70]"><LoaderCircle className="size-4 animate-spin" />Searching profiles…</div>
            ) : userSearch.isError ? (
              <div className="px-6 py-12 text-center text-[13px] font-bold text-[#C25357]">{userSearch.error.message}</div>
            ) : (userSearch.data?.length ?? 0) === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="text-[15px] font-black text-[#342720]">No results found</p>
                <p className="mt-1 text-[12px] font-semibold text-[#9A857A]">Check the name or @username and try again.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F3E8E2]">
                {userSearch.data?.map(user => (
                  <div key={user.id} className="flex items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => navigate(user.is_self ? '/profile' : `/profile/${user.id}`)}
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
                      <span className="rounded-full bg-[#F5EDE8] px-3 py-1.5 text-[11px] font-bold text-[#8D756A]">My profile</span>
                    ) : (
                      <FollowButton userId={user.id} initialFollowing={user.is_following} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : <>
        {isLoadingMoreFeedPosts && feedPosts.length === 0 ? (
          <div
            role="status"
            className="flex min-h-[45vh] items-center justify-center gap-2 text-[13px] font-bold text-[#907A70]"
          >
            <LoaderCircle className="size-5 animate-spin" />

            Loading Munchie Feed…
          </div>
        ) : <div data-ui="munchie-feed-grid" className="grid grid-cols-2 items-start gap-x-2">
          {[0, 1].map(column => (
            <div key={column} data-feed-column={column + 1} className="flex min-w-0 flex-col gap-4">
              <AnimatePresence mode="popLayout">
                {filteredPosts.filter((_, index) => index % 2 === column).map(post => (
                  <motion.div
                    key={post.id}
                    layout
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <UnifiedMunchieCard post={post} feedGrid />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ))}
        </div>}

        {!isLoadingMoreFeedPosts && filteredPosts.length === 0 && (
          <div className="mt-4 rounded-[26px] border border-dashed border-[#DCCBC0] bg-white px-6 py-16 text-center">
            <div className="mb-3 text-5xl">🍽️</div>
            <p className="text-[16px] font-black text-[#2D211C]">{appliedLocation ? "No posts nearby" : "No posts yet"}</p>
            <p className="mt-1 text-[12px] font-semibold text-[#9A8579]">{appliedLocation ? "Move the pin or widen your search" : "Share your first food find"}</p>
          </div>
        )}
        {activeFilter === 'all' && filteredPosts.length > 0 && hasMoreFeedPosts && (
          <div
            ref={loadMoreSentinelRef}
            data-ui="feed-load-more-sentinel"
            aria-live="polite"
            className="flex min-h-16 items-center justify-center py-5 text-[13px] font-black text-[#A97A70]"
          >
            {isLoadingMoreFeedPosts && <><LoaderCircle className="mr-2 size-4 animate-spin" />Loading more posts…</>}
          </div>
        )}
        </>}
      </main>

      {courseCreationFab}
    </div>
  );
}
