/**
 * Lunchie Munchie — Saved Courses Page
 * Design: Soft Coral (Option 8)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { MapPin, Clock, Bookmark, Plus } from 'lucide-react';
import { useApp, TagType } from '@/contexts/AppContext';

const FILTER_TABS: { label: string; value: TagType | 'all' }[] = [
  { label: '전체', value: 'all' },
  { label: '데이트', value: '데이트 코스' },
  { label: '혼자 여행', value: '혼자 여행' },
  { label: '맛집 투어', value: '맛집 투어' },
];

const TAG_CLASS: Record<string, string> = {
  '데이트 코스': 'tag-date', '맛집': 'tag-food', '카페': 'tag-cafe',
  '전시/문화': 'tag-culture', '액티비티': 'tag-activity',
  '혼자 여행': 'tag-hash', '맛집 투어': 'tag-food', '가성비': 'tag-activity',
};

export default function SavedPage() {
  const [, navigate] = useLocation();
  const { courses, savedCourseIds, unsaveCourse } = useApp();
  const [activeFilter, setActiveFilter] = useState<TagType | 'all'>('all');

  const savedCourses = courses.filter(c => savedCourseIds.includes(c.id));
  const filtered = activeFilter === 'all'
    ? savedCourses
    : savedCourses.filter(c => c.tags.includes(activeFilter as TagType));

  return (
    <div className="min-h-dvh bg-white">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-bold text-[22px] text-[#1A1A1A]">저장한 코스 🔖</h1>
          <button className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center">
            <span className="text-[12px] text-[#4A4A4A] font-semibold">필터</span>
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-semibold transition-all active:scale-95 ${
                activeFilter === tab.value ? 'text-white' : 'bg-[#F5F5F5] text-[#4A4A4A]'
              }`}
              style={activeFilter === tab.value ? { background: '#EB5053' } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Course List */}
      <div className="px-5 space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.map(course => (
            <motion.div
              key={course.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="flex gap-3 p-3 rounded-2xl border border-[#E5E5E5] cursor-pointer active:scale-[0.98] transition-all"
              onClick={() => navigate(`/course/${course.id}?from=saved`)}
            >
              <img
                src={course.heroImage}
                alt={course.title}
                className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex gap-1.5 mb-1 flex-wrap">
                      {course.tags.slice(0, 1).map(tag => (
                        <span key={tag} className={`tag ${TAG_CLASS[tag] || 'tag-hash'}`}>{tag}</span>
                      ))}
                    </div>
                    <p className="font-bold text-[14px] text-[#1A1A1A] line-clamp-2 leading-tight">
                      {course.title}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); unsaveCourse(course.id); }}
                    className="flex-shrink-0"
                  >
                    <Bookmark size={16} fill="#EB5053" stroke="#EB5053" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-[11px] text-[#9B9B9B]">
                    <MapPin size={10} /> {course.metadata.placeCount}개 장소
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-[#9B9B9B]">
                    <Clock size={10} /> {course.metadata.distance}km
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="text-5xl mb-3">🔖</div>
            <p className="font-bold text-[16px] text-[#1A1A1A] mb-1">
              {activeFilter === 'all' ? '아직 저장한 코스가 없어요!' : '해당 카테고리 코스가 없어요'}
            </p>
            <p className="text-[13px] text-[#9B9B9B] mb-6">
              {activeFilter === 'all' ? '첫 코스를 만들어볼까요?' : '다른 필터를 선택해보세요'}
            </p>
            {activeFilter === 'all' && (
              <button
                onClick={() => navigate('/explore')}
                className="lm-btn-primary px-6 inline-flex items-center justify-center"
              >
                코스 탐색하기
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* Create Course FAB */}
      <motion.button
        onClick={() => navigate('/lunchie/settings')}
        className="fixed bottom-24 right-4 flex items-center gap-2 px-4 h-12 rounded-full shadow-xl text-white font-bold text-[13px] z-40"
        style={{ background: '#EB5053' }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
      >
        <Plus size={18} />
        새 코스 만들기
      </motion.button>
    </div>
  );
}
