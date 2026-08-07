import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Palette, Plus, SlidersHorizontal } from 'lucide-react';
import { useLocation } from 'wouter';
import { FOOD_FILTER_TAGS, hasFoodTag } from '@/constants/foodTags';
import { getCourseTagStyle } from '@/constants/courseTheme';
import { type TagType, useApp } from '@/contexts/AppContext';
import UnifiedMunchieCard from '@/components/munchie/UnifiedMunchieCard';

export default function MunchieFeedPage() {
  const [, navigate] = useLocation();
  const { feedPosts, refreshFeedPosts } = useApp();
  const [activeFilter, setActiveFilter] = useState<TagType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(true);
  useEffect(() => { void refreshFeedPosts().catch(() => undefined); }, [refreshFeedPosts]);
  const filteredPosts = activeFilter === 'all'
    ? feedPosts
    : feedPosts.filter(post => hasFoodTag(post.tags, activeFilter as TagType));

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

        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="space-y-4 px-3 py-4">
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
