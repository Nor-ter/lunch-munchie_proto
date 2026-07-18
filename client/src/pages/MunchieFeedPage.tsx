import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Gift, MapPinned, PenLine, Settings2 } from 'lucide-react';
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
    <div className="min-h-dvh bg-[#F8F1EB] pb-28">
      <header className="sticky top-0 z-30 border-b border-[#EDE0D6] bg-[#FFFDFB]/95 px-5 pb-4 pt-11 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F25055]">Lunchie Munchie</p>
            <h1 className="mt-1 text-[30px] font-black leading-none text-[#201713]">MUNCHIE</h1>
            <p className="mt-2 text-[12px] font-semibold text-[#8D776C]">먼치로 함께 맛집 코스 탐방</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/profile/foodie-room')}
              aria-label="런치메이트 선물"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E8D8CE] bg-white text-[#3A2B24] shadow-sm active:scale-95"
            >
              <Gift size={18} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              aria-label="Munchie 설정"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E8D8CE] bg-white text-[#3A2B24] shadow-sm active:scale-95"
            >
              <Settings2 size={18} />
            </button>
          </div>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FOOD_FILTER_TAGS.map(filter => (
            <button
              type="button"
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className="h-9 shrink-0 rounded-full px-4 text-[11px] font-black transition-transform active:scale-95"
              style={filter.value === 'all'
                ? activeFilter === filter.value
                  ? { background: '#221815', color: '#FFFFFF' }
                  : { background: '#FFFFFF', color: '#6E5B51', border: '1px solid #E8D8CE' }
                : getCourseTagStyle(filter.value, activeFilter === filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </header>

      <main className="space-y-6 px-3.5 py-5">
        <button
          type="button"
          onClick={() => navigate('/explore/places')}
          className="flex w-full items-center gap-3 rounded-2xl border border-[#E9DAD0] bg-white px-4 py-3 text-left shadow-[0_8px_22px_rgba(72,45,32,0.05)]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF0EA] text-[#F25055]">
            <MapPinned size={19} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-black text-[#362720]">새로운 맛집 코스를 찾고 있나요?</span>
            <span className="mt-0.5 block text-[10px] font-semibold text-[#A08B80]">내 주변 음식점에서 코스를 시작해보세요</span>
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
            <p className="text-[16px] font-black text-[#2D211C]">아직 코스 기록이 없어요</p>
            <p className="mt-1 text-[12px] font-semibold text-[#9A8579]">첫 번째 템플릿 피드를 만들어보세요</p>
          </div>
        )}
      </main>

      {createPortal(
        <motion.button
          type="button"
          onClick={() => navigate('/feed/new')}
          className="fixed bottom-24 z-40 flex h-12 items-center gap-2 rounded-full bg-[#FF424B] px-5 text-[12px] font-black text-white shadow-[0_12px_28px_rgba(255,66,75,0.3)]"
          style={{ right: 'max(1rem, calc((100vw - min(100vw, 480px)) / 2 + 1rem))' }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.94 }}
        >
          <PenLine size={16} /> 새 코스 기록
        </motion.button>,
        document.body,
      )}
    </div>
  );
}
