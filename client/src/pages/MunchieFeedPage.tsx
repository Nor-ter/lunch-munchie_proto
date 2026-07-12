/**
 * Munchie Feed — Munchie Mode의 단일 표면 (기존 코스 탐색을 피드로 통합)
 * 피드 탭: 사진+한줄평 정성 기록 (Credit) / 코스맵 탭: 스크랩북 코스맵 탐색 (Core Product)
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { SlidersHorizontal, PenLine, Plus } from 'lucide-react';
import { useApp, TagType } from '@/contexts/AppContext';
import { getCourseTagStyle } from '@/constants/courseTheme';
import FeedPostCard from '@/components/munchie/FeedPostCard';
import TemplateCoursemapCard from '@/components/munchie/TemplateCoursemapCard';

const FILTER_TAGS: { label: string; value: TagType | 'all' }[] = [
  { label: '전체', value: 'all' },
  { label: '데이트 코스', value: '데이트 코스' },
  { label: '맛집', value: '맛집' },
  { label: '카페', value: '카페' },
  { label: '혼자 여행', value: '혼자 여행' },
  { label: '전시/문화', value: '전시/문화' },
];

export default function MunchieFeedPage() {
  const [, navigate] = useLocation();
  const { feedPosts, courses } = useApp();
  const [activeFilter, setActiveFilter] = useState<TagType | 'all'>('all');
  const [view, setView] = useState<'feed' | 'maps'>('feed');

  const filtered = activeFilter === 'all'
    ? feedPosts
    : feedPosts.filter(p => p.tags.includes(activeFilter as TagType));

  const filteredCourses = activeFilter === 'all'
    ? courses
    : courses.filter(c => c.tags.includes(activeFilter as TagType));

  return (
    <div className="min-h-dvh bg-[#FCF4EE]">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-bold text-[26px] text-[#1A1A1A]">Munchie Mode</h1>
            <p className="text-[12px] mt-0.5 text-[#9B9B9B]">
              {view === 'feed' ? '사진과 한줄평으로 남기는 정성 기록' : '스크랩북 코스맵을 탐색해보아요'}
            </p>
          </div>
          <button className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center">
            <SlidersHorizontal size={18} color="#4A4A4A" />
          </button>
        </div>

        {/* 피드 / 코스맵 세그먼트 (먼치모드 통합) */}
        <div className="mb-3 flex rounded-full bg-[#F5F0EA] p-1">
          {([['feed', 'Munchie Feed'], ['maps', '코스맵']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className="relative flex-1 h-9 rounded-full text-[13px] font-bold transition-colors"
              style={{ color: view === key ? '#FFFFFF' : '#8A7A6C' }}
            >
              {view === key && (
                <motion.span
                  layoutId="feed-seg"
                  className="absolute inset-0 rounded-full"
                  style={{ background: '#EB5053' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10">{label}</span>
            </button>
          ))}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-5 px-5">
          {FILTER_TAGS.map(f => (
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
      </div>

      {view === 'feed' ? (
        /* Feed */
        <div className="px-4 py-5 space-y-7">
          <AnimatePresence mode="popLayout">
            {filtered.map(post => (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <FeedPostCard post={post} />
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">📔</div>
              <p className="font-bold text-[16px] text-[#1A1A1A] mb-1">아직 기록이 없어요</p>
              <p className="text-[13px] text-[#9B9B9B]">첫 번째 먼치 피드를 남겨보세요</p>
            </div>
          )}
        </div>
      ) : (
        /* 코스맵 그리드 — 디자이너 템플릿의 빈칸에 식당 사진이 채워진다 (3열) */
        <div className="px-4 py-5">
          <div className="grid grid-cols-3 gap-x-2.5 gap-y-5">
            {filteredCourses.map((course, i) => (
              <TemplateCoursemapCard key={course.id} course={course} index={i} from="feed" />
            ))}
          </div>
          {filteredCourses.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">🗺️</div>
              <p className="font-bold text-[16px] text-[#1A1A1A] mb-1">코스맵이 없어요</p>
              <p className="text-[13px] text-[#9B9B9B]">다른 필터를 선택해보세요</p>
            </div>
          )}
        </div>
      )}

      {/* FAB — 피드 탭: 피드 작성 / 코스맵 탭: 새 코스 만들기 */}
      <motion.button
        onClick={() => navigate(view === 'feed' ? '/feed/new' : '/course/new/edit')}
        className="fixed bottom-24 right-4 flex items-center gap-2 px-4 h-12 rounded-full shadow-xl text-white font-bold text-[13px] z-40"
        style={{ background: '#EB5053' }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
      >
        {view === 'feed' ? <PenLine size={16} /> : <Plus size={16} />}
        {view === 'feed' ? '피드 작성' : '새 코스 만들기'}
      </motion.button>
    </div>
  );
}
