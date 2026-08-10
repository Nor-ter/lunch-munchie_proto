import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LoaderCircle, Palette, Plus, Search, X } from 'lucide-react';
import { useLocation } from 'wouter';
import { FOOD_FILTER_TAGS, hasFoodTag } from '@/constants/foodTags';
import { getCourseTagStyle } from '@/constants/courseTheme';
import { type TagType, useApp } from '@/contexts/AppContext';
import UnifiedMunchieCard from '@/components/munchie/UnifiedMunchieCard';
import { FollowButton } from '@/components/follow/FollowButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import { useUserSearch } from '@/hooks/useUserSearch';

export default function MunchieFeedPage() {
  const [, navigate] = useLocation();
  const { feedPosts, refreshFeedPosts } = useApp();
  const [activeFilter, setActiveFilter] = useState<TagType | 'all'>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const auth = useAuthStatus();
  const canSearch = Boolean(auth.data && !auth.data.isAnonymous);
  const userSearch = useUserSearch(searchTerm, canSearch);
  useEffect(() => { void refreshFeedPosts().catch(() => undefined); }, [refreshFeedPosts]);
  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);
  const filteredPosts = activeFilter === 'all'
    ? feedPosts
    : feedPosts.filter(post => hasFoodTag(post.tags, activeFilter as TagType));
  const searchActive = searchInput.trim().length > 0;
  const searchPending = searchActive
    && (searchTerm !== searchInput.trim() || userSearch.isLoading || userSearch.isFetching);

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
              onClick={() => navigate('/coursemap/new')}
              aria-label="새 Munchie 피드 작성"
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#F6B9B1] bg-[#F06F72] text-white shadow-[0_6px_14px_rgba(238,111,114,0.2)] active:scale-95"
            >
              <Plus size={22} strokeWidth={2.5} />
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

        {!searchActive && <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {FOOD_FILTER_TAGS.map(filter => (
            <button
              type="button"
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
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
        </div>}
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
              <UnifiedMunchieCard post={post} />
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredPosts.length === 0 && (
          <div className="rounded-[26px] border border-dashed border-[#DCCBC0] bg-white px-6 py-16 text-center">
            <div className="mb-3 text-5xl">🍽️</div>
            <p className="text-[16px] font-black text-[#2D211C]">아직 Munchie 피드가 없어요</p>
            <p className="mt-1 text-[12px] font-semibold text-[#9A8579]">첫 번째 Munchie 피드를 만들어보세요</p>
          </div>
        )}
        </>}
      </main>
    </div>
  );
}
