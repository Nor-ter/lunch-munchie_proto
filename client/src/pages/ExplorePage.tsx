/**
 * Lunchie Munchie — Explore (Course List) Page
 * Design: Soft Coral (Option 8)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { MapPin, Clock, Bookmark, Star, SlidersHorizontal } from 'lucide-react';
import { useApp, Course, TagType } from '@/contexts/AppContext';
import CourseMapOverlay from '@/components/CourseMapOverlay';

const FILTER_TAGS: { label: string; value: TagType | 'all' }[] = [
  { label: '전체', value: 'all' },
  { label: '데이트 코스', value: '데이트 코스' },
  { label: '맛집', value: '맛집' },
  { label: '카페', value: '카페' },
  { label: '혼자 여행', value: '혼자 여행' },
  { label: '전시/문화', value: '전시/문화' },
  { label: '액티비티', value: '액티비티' },
];

const TAG_CLASS: Record<string, string> = {
  '데이트 코스': 'tag-date',
  '맛집': 'tag-food',
  '카페': 'tag-cafe',
  '전시/문화': 'tag-culture',
  '액티비티': 'tag-activity',
  '혼자 여행': 'tag-hash',
  '맛집 투어': 'tag-food',
  '가성비': 'tag-activity',
};

function CourseListCard({ course, onTap }: { course: Course; onTap: () => void }) {
  const { savedCourseIds, saveCourse, unsaveCourse } = useApp();
  const isSaved = savedCourseIds.includes(course.id);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="lm-card overflow-hidden cursor-pointer"
      whileTap={{ scale: 0.98 }}
      onClick={onTap}
    >
      <div className="relative h-40">
        <img src={course.heroImage} alt={course.title} className="w-full h-full object-cover" />
        <CourseMapOverlay course={course} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <button
          onClick={e => { e.stopPropagation(); isSaved ? unsaveCourse(course.id) : saveCourse(course.id); }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center"
        >
          <Bookmark size={14} fill={isSaved ? '#EB5053' : 'none'} stroke={isSaved ? '#EB5053' : '#4A4A4A'} />
        </button>
        <div className="absolute bottom-3 left-3 flex gap-1.5 flex-wrap">
          {course.tags.slice(0, 2).map(tag => (
            <span key={tag} className={`tag ${TAG_CLASS[tag] || 'tag-hash'}`}>{tag}</span>
          ))}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-[15px] text-[#1A1A1A] mb-1">{course.title}</h3>
        <div className="flex gap-1.5 flex-wrap mb-2">
          {course.hashtags.slice(0, 3).map(h => (
            <span key={h} className="tag tag-hash">{h}</span>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[#9B9B9B]">
          <span className="flex items-center gap-1 text-[12px]">
            <MapPin size={11} /> {course.metadata.distance}km
          </span>
          <span className="flex items-center gap-1 text-[12px]">
            <Clock size={11} /> {Math.floor(course.metadata.duration / 60)}시간
          </span>
          <span className="flex items-center gap-1 text-[12px]">
            📍 {course.metadata.placeCount}개 장소
          </span>
          <span className="flex items-center gap-1 text-[12px] ml-auto">
            <Bookmark size={11} /> {course.savedCount}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function ExplorePage() {
  const [, navigate] = useLocation();
  const { courses } = useApp();
  const [activeFilter, setActiveFilter] = useState<TagType | 'all'>('all');

  const filtered = activeFilter === 'all'
    ? courses
    : courses.filter(c => c.tags.includes(activeFilter as TagType));

  return (
    <div className="min-h-dvh bg-[#F5F5F5]">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-bold text-[22px] text-[#1A1A1A]">코스 탐색 🗺️</h1>
          <button className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center">
            <SlidersHorizontal size={18} color="#4A4A4A" />
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-5 px-5">
          {FILTER_TAGS.map(f => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-semibold transition-all active:scale-95 ${
                activeFilter === f.value
                  ? 'text-white'
                  : 'bg-[#F5F5F5] text-[#4A4A4A]'
              }`}
              style={activeFilter === f.value ? { background: '#EB5053' } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Course List */}
      <div className="px-5 py-4 space-y-4">
        <AnimatePresence mode="popLayout">
          {filtered.map(course => (
            <CourseListCard
              key={course.id}
              course={course}
              onTap={() => navigate(`/course/${course.id}?from=explore`)}
            />
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🔍</div>
            <p className="font-bold text-[16px] text-[#1A1A1A] mb-1">코스가 없어요</p>
            <p className="text-[13px] text-[#9B9B9B]">다른 필터를 선택해보세요</p>
          </div>
        )}
      </div>

      {/* Create Course FAB */}
      <motion.button
        onClick={() => navigate('/session/create')}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-xl flex items-center justify-center z-40 text-white font-bold text-2xl"
        style={{ background: '#EB5053' }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.3 }}
      >
        +
      </motion.button>
    </div>
  );
}
