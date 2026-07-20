import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Palette, MapPinned, PenLine, Settings2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { FOOD_FILTER_TAGS, hasFoodTag } from '@/constants/foodTags';
import { getCourseTagStyle } from '@/constants/courseTheme';
import { type TagType, useApp } from '@/contexts/AppContext';
import UnifiedMunchieCard from '@/components/munchie/UnifiedMunchieCard';

export default function MunchieFeedPage() {
  const [, navigate] = useLocation();
  const { feedPosts } = useApp();
  const [activeFilter, setActiveFilter] = useState<TagType | 'all'>('all');
  const filteredPosts = activeFilter === 'all'
    ? feedPosts
    : feedPosts.filter(post => hasFoodTag(post.tags, activeFilter as TagType));

  return (
    <div className="min-h-dvh bg-[#FFF7F2] pb-28">
      <header className="sticky top-0 z-30 border-b-2 border-[#EAD7CE] bg-[#FFFDFC] px-4 pb-3 pt-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#FF4D57]">Lunchie Munchie</p>
            <h1 className="mt-1 text-[25px] font-black leading-none tracking-[-0.03em] text-[#30231E]">MUNCHIE FEED</h1>
            <p className="mt-1.5 text-[11px] font-semibold text-[#8D776C]">한줄평과 코스맵을 함께 보는 피드</p>
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
              onClick={() => navigate('/profile')}
              aria-label="Munchie 설정"
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#D5DED3] bg-[#F7FAF6] text-[#708776] active:scale-95"
            >
              <Settings2 size={18} />
            </button>
          </div>
        </div>

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
      </header>

      <main className="space-y-4 px-3 py-4">
        <button
          type="button"
          onClick={() => navigate('/explore/places')}
          className="flex w-full items-center gap-3 rounded-[18px] border-2 border-[#E6CFC3] bg-[#FFFDFC] px-4 py-3 text-left shadow-[0_7px_18px_rgba(72,45,32,0.05)]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF0EA] text-[#F25055]">
            <MapPinned size={19} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-black text-[#362720]">새로운 맛집 기록을 남겨볼까요?</span>
            <span className="mt-0.5 block text-[10px] font-semibold text-[#A08B80]">장소·사진·한줄평을 한 번에 기록해보세요</span>
          </span>
          <span className="text-[18px] text-[#F25055]">→</span>
        </button>

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
            <p className="text-[16px] font-black text-[#2D211C]">아직 코스피드가 없어요</p>
            <p className="mt-1 text-[12px] font-semibold text-[#9A8579]">첫 번째 한줄평과 코스맵을 만들어보세요</p>
          </div>
        )}
      </main>

      {createPortal(
        <motion.button
          type="button"
          onClick={() => navigate('/coursemap/new')}
          className="fixed bottom-24 z-40 flex h-12 items-center gap-2 rounded-[16px] border-2 border-[#F6B9B1] bg-[#F06F72] px-5 text-[12px] font-black text-white shadow-[0_10px_24px_rgba(238,111,114,0.25)]"
          style={{ right: 'max(1rem, calc((100vw - min(100vw, 480px)) / 2 + 1rem))' }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.94 }}
        >
          <PenLine size={16} /> + Munchie Feed
        </motion.button>,
        document.body,
      )}
    </div>
  );
}
