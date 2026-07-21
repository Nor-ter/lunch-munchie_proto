/**
 * Lunchie Munchie — Course Detail Page
 * Design: Soft Coral (Option 8)
 * Layout: Hero + Tags + Meta + Timeline + Sticky Footer
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useParams } from 'wouter';
import { ArrowLeft, Share2, MapPin, Clock, Bookmark, Star, ChevronRight } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import CourseMapOverlay from '@/components/CourseMapOverlay';
import { toast } from 'sonner';

const TAG_CLASS: Record<string, string> = {
  '맛집': 'tag-food', '데이트코스': 'tag-date', '혼밥': 'tag-hash',
  '카페': 'tag-cafe', '펍나이트': 'tag-date', '브런치': 'tag-food',
  '디저트': 'tag-cafe', '가성비': 'tag-activity',
};

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { getCourseById, getRestaurantById, savedCourseIds, saveCourse, unsaveCourse } = useApp();

  const course = getCourseById(params.id);
  const isSaved = savedCourseIds.includes(params.id);

  const [bookmarkedStops, setBookmarkedStops] = useState<Set<string>>(
    new Set(course?.stops.filter(s => s.isBookmarked).map(s => s.placeId) || [])
  );

  if (!course) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-center">
          <p className="font-bold text-[16px] text-[#1A1A1A] mb-4">코스를 찾을 수 없어요</p>
          <button onClick={() => navigate('/courses/feeds')} className="lm-btn-primary px-6 flex items-center justify-center">
            코스 탐색
          </button>
        </div>
      </div>
    );
  }

  const handleShare = () => {
    navigate(`/course/${course.id}/share`);
  };

  const toggleStopBookmark = (placeId: string) => {
    setBookmarkedStops(prev => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  };

  const handleSave = () => {
    if (isSaved) {
      unsaveCourse(course.id);
      toast.info('저장 취소됨');
    } else {
      saveCourse(course.id);
      toast.success('코스를 저장했어요! 🔖');
    }
  };

  return (
    <div className="min-h-dvh bg-[#FCF4EE] pb-28">
      {/* Hero Header */}
      <div className="relative h-[250px] md:h-[300px]">
        <img src={course.heroImage} alt={course.title} className="w-full h-full object-cover" />
        <CourseMapOverlay course={course} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-12">
          <button
            onClick={() => window.history.back()}
            className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center active:scale-95"
          >
            <ArrowLeft size={17} color="#1A1A1A" />
          </button>
          <span className="font-semibold text-white text-[15px]">코스 상세</span>
          <button
            onClick={handleShare}
            className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center active:scale-95"
          >
            <Share2 size={17} color="#1A1A1A" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-5">
        {/* Tags */}
        <div className="flex gap-2 flex-wrap mb-3">
          {course.tags.map(tag => (
            <span key={tag} className={`tag ${TAG_CLASS[tag] || 'tag-hash'}`}>{tag}</span>
          ))}
        </div>

        {/* Title */}
        <h1 className="font-bold text-[22px] text-[#1A1A1A] leading-tight mb-2">{course.title}</h1>

        {/* Hashtags */}
        <div className="flex gap-1.5 flex-wrap mb-3">
          {course.hashtags.map(h => (
            <span key={h} className="tag tag-hash">{h}</span>
          ))}
        </div>

        {/* Description */}
        <p className="text-[14px] text-[#4A4A4A] leading-relaxed mb-4">{course.description}</p>

        {/* Meta */}
        <div className="flex items-center gap-4 py-4 border-y border-[#E5E5E5] mb-5">
          <div className="flex items-center gap-1.5">
            <MapPin size={15} color="#EB5053" />
            <span className="text-[13px] font-semibold text-[#1A1A1A]">{course.metadata.distance}km</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={15} color="#EB5053" />
            <span className="text-[13px] font-semibold text-[#1A1A1A]">{Math.floor(course.metadata.duration / 60)}시간</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[15px]">📍</span>
            <span className="text-[13px] font-semibold text-[#1A1A1A]">{course.metadata.placeCount}개 장소</span>
          </div>
        </div>

        {/* Course Timeline */}
        <h2 className="font-bold text-[17px] text-[#1A1A1A] mb-4">코스 순서</h2>
        <div className="space-y-0">
          {course.stops.map((stop, i) => {
            const restaurant = getRestaurantById(stop.placeId);
            if (!restaurant) return null;
            const isLast = i === course.stops.length - 1;
            const isBookmarked = bookmarkedStops.has(stop.placeId);

            return (
              <motion.div
                key={stop.placeId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex gap-3"
              >
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-[12px] flex-shrink-0"
                    style={{ background: '#EB5053' }}
                  >
                    {stop.order}
                  </div>
                  {!isLast && <div className="w-0.5 flex-1 bg-[#E5E5E5] my-1" style={{ minHeight: '24px' }} />}
                </div>

                {/* Stop content */}
                <div className={`flex-1 flex items-start gap-3 ${isLast ? 'pb-0' : 'pb-4'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px] text-[#1A1A1A]">{restaurant.name}</p>
                    <p className="text-[12px] text-[#9B9B9B] mt-0.5">{stop.startTime} — {stop.endTime}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Star size={11} fill="#D94447" color="#D94447" />
                      <span className="text-[11px] text-[#4A4A4A]">{restaurant.rating}</span>
                      <span className="text-[11px] text-[#9B9B9B]">· {restaurant.category}</span>
                    </div>
                  </div>
                  <img
                    src={restaurant.image}
                    alt={restaurant.name}
                    className="w-14 h-14 object-cover rounded-xl flex-shrink-0"
                  />
                  <button
                    onClick={() => toggleStopBookmark(stop.placeId)}
                    className="flex-shrink-0 mt-1"
                  >
                    <Bookmark
                      size={18}
                      fill={isBookmarked ? '#EB5053' : 'none'}
                      stroke={isBookmarked ? '#EB5053' : '#9B9B9B'}
                    />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Sticky Footer */}
      <div
        className="page-bottom-bar fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 bg-white px-5"
        style={{ boxShadow: '0 -4px 16px rgba(0,0,0,0.08)' }}
      >
        <div className="flex w-full gap-3">
          <button
            onClick={handleSave}
            className="lm-btn-outline flex items-center justify-center gap-2 flex-[3]"
          >
            <Bookmark size={16} fill={isSaved ? '#EB5053' : 'none'} stroke={isSaved ? '#EB5053' : '#1A1A1A'} />
            {isSaved ? '저장됨' : '저장하기'}
          </button>
          <button
            onClick={() => navigate(`/courses/${course.id}/navigate`)}
            className="lm-btn-primary flex items-center justify-center gap-2 flex-[7]"
          >
            코스 따라가기 <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
