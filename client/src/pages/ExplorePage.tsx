/**
 * Lunchie Munchie — Explore (Course List) Page
 * Design: Soft Coral (Option 8)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { MapPin, Clock, Bookmark, Star, SlidersHorizontal, Plus, BookOpen } from 'lucide-react';
import { useApp, Course, TagType } from '@/contexts/AppContext';
import CourseMapOverlay from '@/components/CourseMapOverlay';
import { getCourseTagStyle } from '@/constants/courseTheme';

const FILTER_TAGS: { label: string; value: TagType | 'all' }[] = [
  { label: '전체', value: 'all' },
  { label: '데이트 코스', value: '데이트 코스' },
  { label: '맛집', value: '맛집' },
  { label: '카페', value: '카페' },
  { label: '혼자 여행', value: '혼자 여행' },
  { label: '전시/문화', value: '전시/문화' },
  { label: '액티비티', value: '액티비티' },
];

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
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/50 to-transparent" />
        <button
          onClick={e => { e.stopPropagation(); isSaved ? unsaveCourse(course.id) : saveCourse(course.id); }}
          className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center"
        >
          <Bookmark size={14} fill={isSaved ? '#E85053' : 'none'} stroke={isSaved ? '#E85053' : '#4A4A4A'} />
        </button>
        <div className="absolute bottom-3 left-3 z-30 flex gap-1.5 flex-wrap">
          {course.tags.slice(0, 2).map(tag => (
            <span key={tag} className="tag" style={getCourseTagStyle(tag)}>
              {tag}
            </span>
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
    <div className="min-h-dvh bg-[#FCF4EE]">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-[28px] text-[#1A1A1A]">Munchie Mode</h1>
              <svg width="28" height="28" viewBox="0 0 40 40" fill="none" stroke="#FF3E4D" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5 L14 8.5 L25 12.5 L35 8.5 V29 L25 33 L14 29 L5 33 Z" strokeWidth="2.7" />
                <path d="M14 8.5 V29" strokeWidth="2.4" />
                <path d="M25 12.5 V33" strokeWidth="2.4" />
                <path d="M20 4.7 C15.9 4.7 12.7 7.8 12.7 11.7 C12.7 16.7 20 23 20 23 C20 23 27.3 16.7 27.3 11.7 C27.3 7.8 24.1 4.7 20 4.7 Z" strokeWidth="2.7" />
                <circle cx="20" cy="11.8" r="2.4" fill="#FF3E4D" strokeWidth="0" />
              </svg>
            </div>
            <p className="text-[12px] mt-0.5" style={{ color: '#9B9B9B' }}>코스를 탐색해보아요</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/feed')}
              aria-label="Munchie Feed"
              className="w-10 h-10 rounded-full bg-[#FDE1E1] flex items-center justify-center"
            >
              <BookOpen size={18} color="#E85053" />
            </button>
            <button className="w-10 h-10 rounded-full bg-[#F5F5F5] flex items-center justify-center">
              <SlidersHorizontal size={18} color="#4A4A4A" />
            </button>
          </div>
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
                  : ''
              }`}
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
