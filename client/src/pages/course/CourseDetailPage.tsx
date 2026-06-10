import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useSearch } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Bookmark, Share2, ChevronLeft, Star, X } from 'lucide-react';
import { CourseMap } from '@/components/course/CourseMap';
import { useApp } from '@/contexts/AppContext';
import { MOCK_COURSE } from '@/data/mockCourse';
import { CoursePlace } from '@/types/course';

type FromMode = 'explore' | 'saved';

function useFrom(): FromMode {
  const search = useSearch();
  const params = new URLSearchParams(search);
  return params.get('from') === 'saved' ? 'saved' : 'explore';
}

// ── PlaceItem ─────────────────────────────────────────────────────────────────

function PlaceItem({
  place,
  index,
  isLast,
  isEditing,
  onRemove,
}: {
  place: CoursePlace;
  index: number;
  isLast: boolean;
  isEditing: boolean;
  onRemove?: (id: string) => void;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full bg-[#1A1A1A] text-white text-xs flex items-center justify-center shrink-0">
          {index + 1}
        </div>
        {!isLast && (
          <div className="flex-1 border-l-2 border-dashed border-gray-200 ml-[1px] my-1" />
        )}
      </div>

      <motion.div
        layout
        className={`flex-1 border border-gray-100 rounded-xl p-3 flex gap-3 items-center ${!isLast ? 'mb-2' : ''}`}
      >
        {place.imageUrl ? (
          <img src={place.imageUrl} alt={place.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-gray-100 shrink-0" />
        )}
        <div className="flex flex-col justify-center min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{place.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            <Star size={10} className="inline mb-0.5 text-[#D94447] fill-[#D94447]" />
            {' '}{place.rating} · {place.distance}
          </p>
          <p className="text-xs text-gray-400">{place.category}</p>
        </div>
        <AnimatePresence>
          {isEditing && (
            <motion.button
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.15 }}
              onClick={() => onRemove?.(place.id)}
              className="text-gray-300 shrink-0"
            >
              <X size={16} />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ── CourseDetailPage ──────────────────────────────────────────────────────────

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const from = useFrom();
  const fromSaved = from === 'saved';
  const { savedCourseIds, saveCourse, unsaveCourse } = useApp();
  const isBookmarked = id ? savedCourseIds.includes(id) : false;

  const toggleBookmark = () => {
    if (!id) return;
    if (isBookmarked) unsaveCourse(id);
    else saveCourse(id);
  };

  // Local editable state (only used in saved mode)
  const [title, setTitle] = useState(MOCK_COURSE.title);
  const [hashtags, setHashtags] = useState<string[]>([...MOCK_COURSE.hashtags]);
  const [places, setPlaces] = useState<CoursePlace[]>(MOCK_COURSE.places.map(p => ({ ...p })));
  const [isEditing, setIsEditing] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) titleInputRef.current?.focus();
  }, [isEditing]);

  useEffect(() => {
    if (isAddingTag) tagInputRef.current?.focus();
  }, [isAddingTag]);

  const commitTag = () => {
    const trimmed = newTag.trim().replace(/^#/, '');
    if (trimmed && !hashtags.includes(trimmed)) {
      setHashtags(prev => [...prev, trimmed]);
    }
    setNewTag('');
    setIsAddingTag(false);
  };

  const handleDelete = () => {
    if (window.confirm('이 코스를 삭제할까요?')) {
      navigate('/saved');
    }
  };

  return (
    <motion.div
      className="max-w-[430px] mx-auto bg-white min-h-screen pb-[72px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Map area */}
      <div className="relative h-[220px]">
        <CourseMap places={places} width={430} height={220} className="w-full h-full" />

        <button
          onClick={() => navigate(from === 'saved' ? '/saved' : '/explore')}
          className="absolute top-3 left-3 w-9 h-9 bg-white rounded-full shadow flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="absolute top-3 right-3 flex gap-2">
          <button
            onClick={() => navigate(`/course/${id}/share${fromSaved ? '?from=saved' : ''}`)}
            className="w-9 h-9 bg-white rounded-full shadow flex items-center justify-center"
          >
            <Share2 size={18} />
          </button>
          {!fromSaved && (
            <button
              onClick={toggleBookmark}
              className="w-9 h-9 bg-white rounded-full shadow flex items-center justify-center"
            >
              <Bookmark
                size={18}
                fill={isBookmarked ? '#EB5053' : 'none'}
                stroke={isBookmarked ? '#EB5053' : 'currentColor'}
              />
            </button>
          )}
        </div>
      </div>

      {/* Author */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm">{MOCK_COURSE.authorHandle}</span>
              {MOCK_COURSE.authorBadge && (
                <span className="bg-[#EB5053] text-white text-xs px-2 py-0.5 rounded-full">
                  {MOCK_COURSE.authorBadge}
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500">{MOCK_COURSE.followerCount} followers</span>
          </div>
        </div>

        {fromSaved ? (
          <button
            onClick={() => setIsEditing(prev => !prev)}
            className="border border-gray-300 text-sm px-3 py-1 rounded-full"
          >
            {isEditing ? '완료' : '편집'}
          </button>
        ) : (
          <button className="border border-gray-300 text-sm px-3 py-1 rounded-full">
            팔로우
          </button>
        )}
      </div>

      {/* Course info */}
      <motion.div layout className="px-4 pb-3">
        {/* Hashtags */}
        <AnimatePresence mode="wait">
          {fromSaved && isEditing ? (
            <motion.div
              key="tags-edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-wrap gap-1.5 mb-1"
            >
              {hashtags.map(tag => (
                <span key={tag} className="flex items-center gap-1 border border-gray-200 rounded-full px-2.5 py-0.5 text-xs text-gray-500">
                  #{tag}
                  <button onClick={() => setHashtags(prev => prev.filter(t => t !== tag))}>
                    <X size={10} className="text-gray-400" />
                  </button>
                </span>
              ))}
              {isAddingTag ? (
                <input
                  ref={tagInputRef}
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && commitTag()}
                  onBlur={commitTag}
                  className="border border-[#EB5053] rounded-full px-2.5 py-0.5 text-xs outline-none w-20"
                  placeholder="#태그"
                />
              ) : (
                <button
                  onClick={() => setIsAddingTag(true)}
                  className="border border-dashed border-gray-300 rounded-full px-2.5 py-0.5 text-xs text-gray-400"
                >
                  + 추가
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="tags-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="space-x-1"
            >
              {hashtags.map(tag => (
                <span key={tag} className="text-xs text-gray-400">#{tag}</span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Title */}
        <AnimatePresence mode="wait">
          {fromSaved && isEditing ? (
            <motion.input
              key="title-input"
              ref={titleInputRef}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="text-xl font-bold mt-1 w-full border-b border-gray-300 outline-none pb-0.5 bg-transparent"
            />
          ) : (
            <motion.h1
              key="title-text"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-xl font-bold mt-1"
            >
              {title}
            </motion.h1>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Stats bar */}
      <div className="mx-4 mb-4 border border-gray-100 rounded-xl grid grid-cols-4">
        {[
          { value: `${MOCK_COURSE.distanceKm}km`, label: '거리' },
          { value: `${MOCK_COURSE.durationHours}h`, label: '소요' },
          { value: `${places.length}`, label: '장소' },
          { value: `${MOCK_COURSE.saveCount.toLocaleString()}`, label: '저장' },
        ].map((stat, i, arr) => (
          <div
            key={stat.label}
            className={`py-3 flex flex-col items-center ${i < arr.length - 1 ? 'border-r border-gray-100' : ''}`}
          >
            <span className="font-bold text-sm">{stat.value}</span>
            <span className="text-xs text-gray-400">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Place list */}
      <div className="px-4">
        <p className="text-sm font-semibold mb-3">코스 순서</p>
        <motion.div layout className="flex flex-col">
          {places.map((place, i) => (
            <PlaceItem
              key={place.id}
              place={place}
              index={i}
              isLast={i === places.length - 1}
              isEditing={fromSaved && isEditing}
              onRemove={id => setPlaces(prev => prev.filter(p => p.id !== id))}
            />
          ))}
        </motion.div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 px-4 py-3 flex gap-2">
        {fromSaved ? (
          <>
            <button
              onClick={handleDelete}
              className="flex-1 border border-red-200 text-red-400 rounded-xl h-11 text-sm"
            >
              삭제
            </button>
            <button
              onClick={() => navigate(`/course/${id}/share${fromSaved ? '?from=saved' : ''}`)}
              className="flex-1 bg-[#EB5053] text-white rounded-xl h-11 text-sm font-medium"
            >
              공유하기
            </button>
          </>
        ) : (
          <>
            <button className="w-11 h-11 border border-gray-200 rounded-xl flex items-center justify-center">
              <Heart size={20} />
            </button>
            <button
              onClick={toggleBookmark}
              className="w-11 h-11 border border-gray-200 rounded-xl flex items-center justify-center"
            >
              <Bookmark
                size={20}
                fill={isBookmarked ? '#EB5053' : 'none'}
                stroke={isBookmarked ? '#EB5053' : 'currentColor'}
              />
            </button>
            <button
              onClick={() => navigate(`/course/${id}/edit?from=explore`)}
              className="flex-1 bg-[#1A1A1A] text-white rounded-xl h-11 text-sm font-medium"
            >
              복사해서 편집
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
