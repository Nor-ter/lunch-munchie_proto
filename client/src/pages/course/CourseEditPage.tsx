/**
 * Munchie Mode — Course Editor
 * hi-branch: drag-and-drop place reordering, title/hashtag editing, map preview
 */

import { useState, useRef, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useApp } from '@/contexts/AppContext';
import { motion } from 'framer-motion';
import { ChevronLeft, X, MapPin, ChevronUp, ChevronDown } from 'lucide-react';
import { CourseMap } from '@/components/course/CourseMap';
import { MOCK_COURSE } from '@/data/mockCourse';
import { CoursePlace } from '@/types/course';
import { toast } from 'sonner';

export default function CourseEditPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { saveCourse } = useApp();

  const [title, setTitle] = useState(MOCK_COURSE.title);
  const [hashtags, setHashtags] = useState<string[]>([...MOCK_COURSE.hashtags]);
  const [places, setPlaces] = useState<CoursePlace[]>(
    MOCK_COURSE.places.map(p => ({ ...p }))
  );
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

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

  const removeTag = (tag: string) => setHashtags(prev => prev.filter(t => t !== tag));

  const removePlace = (placeId: string) => setPlaces(prev => prev.filter(p => p.id !== placeId));

  const movePlace = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= places.length) return;
    setPlaces(prev => {
      const arr = [...prev];
      [arr[index], arr[next]] = [arr[next]!, arr[index]!];
      return arr;
    });
  };

  const handleSave = () => {
    if (id) saveCourse(id);
    toast.success('코스가 저장됐어요! 🔖');
    navigate('/saved');
  };

  return (
    <motion.div
      className="max-w-[430px] mx-auto bg-white min-h-dvh pb-24"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Nav */}
      <div className="px-4 py-3 flex items-center border-b border-gray-100 sticky top-0 bg-white z-10">
        <button onClick={() => navigate(-1 as never)}>
          <ChevronLeft size={22} />
        </button>
        <span className="flex-1 text-center font-semibold">코스 편집</span>
        <button
          onClick={handleSave}
          className="text-white text-sm px-4 py-1.5 rounded-lg font-semibold"
          style={{ background: '#EB5053' }}
        >
          저장
        </button>
      </div>

      <div className="px-4 pt-5 space-y-6">
        {/* Title */}
        <div>
          <p className="text-xs text-gray-400 mb-1.5 font-semibold uppercase tracking-wider">코스 제목</p>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#EB5053] transition-colors"
          />
        </div>

        {/* Hashtags */}
        <div>
          <p className="text-xs text-gray-400 mb-1.5 font-semibold uppercase tracking-wider">해시태그</p>
          <div className="flex flex-wrap gap-2">
            {hashtags.map(tag => (
              <span
                key={tag}
                className="flex items-center gap-1 border border-gray-200 rounded-full px-3 py-1 text-sm bg-[#FFF5F5]"
              >
                #{tag}
                <button onClick={() => removeTag(tag)} className="ml-0.5">
                  <X size={12} className="text-gray-400" />
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
                className="border border-[#EB5053] rounded-full px-3 py-1 text-sm outline-none w-24"
                placeholder="#태그"
              />
            ) : (
              <button
                onClick={() => setIsAddingTag(true)}
                className="border border-dashed border-gray-300 rounded-full px-3 py-1 text-sm text-gray-400 hover:border-[#EB5053] hover:text-[#EB5053] transition-colors"
              >
                + 추가
              </button>
            )}
          </div>
        </div>

        {/* Map preview */}
        <div>
          <p className="text-xs text-gray-400 mb-1.5 font-semibold uppercase tracking-wider">코스 지도</p>
          <CourseMap
            places={places}
            width={382}
            height={160}
            className="w-full border border-gray-100"
          />
        </div>

        {/* Place list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
              장소 목록 · {places.length}개 (최대 4)
            </p>
            <span className="text-xs text-gray-400">↑↓ 순서 변경</span>
          </div>

          <div className="space-y-2">
            {places.map((place, i) => (
              <motion.div
                key={place.id}
                layout
                className="border border-gray-100 rounded-xl p-3 bg-white flex items-center gap-3 shadow-sm"
              >
                {/* Order controls */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => movePlace(i, -1)}
                    disabled={i === 0}
                    className="disabled:opacity-20 text-gray-400 hover:text-[#EB5053] transition-colors"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    onClick={() => movePlace(i, 1)}
                    disabled={i === places.length - 1}
                    className="disabled:opacity-20 text-gray-400 hover:text-[#EB5053] transition-colors"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>

                <div
                  className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center shrink-0 font-bold"
                  style={{ background: '#EB5053' }}
                >
                  {i + 1}
                </div>

                {place.imageUrl ? (
                  <img src={place.imageUrl} alt={place.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
                    <MapPin size={16} color="#9B9B9B" />
                  </div>
                )}

                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-semibold truncate text-[#1A1A1A]">{place.name}</span>
                  <span className="text-xs text-gray-400 mt-0.5">
                    {place.distance} · {'₩'.repeat(place.priceLevel)} · {place.category}
                  </span>
                </div>

                <button onClick={() => removePlace(place.id)} className="text-gray-300 shrink-0 hover:text-red-400 transition-colors">
                  <X size={16} />
                </button>
              </motion.div>
            ))}
          </div>

          {places.length < 4 && (
            <button className="mt-2 border-2 border-dashed border-gray-200 rounded-xl py-3 w-full text-sm text-gray-400 flex items-center justify-center gap-1 hover:border-[#EB5053] hover:text-[#EB5053] transition-colors">
              <MapPin size={14} /> 식당 추가 (지도에서)
            </button>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 px-4 py-3 flex gap-3">
        <button
          onClick={() => navigate(-1 as never)}
          className="flex-1 border border-gray-200 rounded-xl h-11 text-sm font-semibold text-[#4A4A4A]"
        >
          취소
        </button>
        <button
          onClick={() => navigate(`/courses/${id}/share`)}
          className="flex-1 text-white rounded-xl h-11 text-sm font-semibold"
          style={{ background: '#EB5053' }}
        >
          코스 공유 →
        </button>
      </div>
    </motion.div>
  );
}
