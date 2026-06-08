import { useState, useRef, useEffect } from 'react';
import { useParams, useLocation, useSearch } from 'wouter';
import { useApp } from '@/contexts/AppContext';
import { motion } from 'framer-motion';
import { ChevronLeft, X, GripVertical, Plus, MapPin } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { KeyboardSensor } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CourseMap } from '@/components/course/CourseMap';
import { MOCK_COURSE } from '@/data/mockCourse';
import { CoursePlace } from '@/types/course';

// ── SortableItem ──────────────────────────────────────────────────────────────

function SortableItem({
  place,
  index,
  onRemove,
}: {
  place: CoursePlace;
  index: number;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: place.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`border border-gray-100 rounded-xl p-3 mb-2 bg-white flex items-center gap-3 ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      <button
        className="text-gray-300 cursor-grab touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} />
      </button>

      <div className="w-6 h-6 rounded-full bg-[#1A1A1A] text-white text-xs flex items-center justify-center shrink-0">
        {index + 1}
      </div>

      {place.imageUrl ? (
        <img
          src={place.imageUrl}
          alt={place.name}
          className="w-12 h-12 rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0" />
      )}

      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium truncate">{place.name}</span>
        <span className="text-xs text-gray-400">
          {place.distance} · {'₩'.repeat(place.priceLevel)}
        </span>
      </div>

      <button
        onClick={() => onRemove(place.id)}
        className="ml-auto text-gray-300 shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function useFromExplore(): boolean {
  const search = useSearch();
  return new URLSearchParams(search).get('from') === 'explore';
}

// ── CourseEditPage ────────────────────────────────────────────────────────────

export default function CourseEditPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const fromExplore = useFromExplore();
  const { saveCourse } = useApp();

  const goBack = () => {
    if (fromExplore && id) {
      navigate(`/course/${id}?from=explore`);
    } else {
      navigate(-1 as never);
    }
  };

  const handleSave = () => {
    if (id) saveCourse(id);
    navigate('/saved');
  };

  const [title, setTitle] = useState(MOCK_COURSE.title);
  const [hashtags, setHashtags] = useState<string[]>([...MOCK_COURSE.hashtags]);
  const [places, setPlaces] = useState<CoursePlace[]>(
    MOCK_COURSE.places.map((p) => ({ ...p }))
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
      setHashtags((prev) => [...prev, trimmed]);
    }
    setNewTag('');
    setIsAddingTag(false);
  };

  const removeTag = (tag: string) => {
    setHashtags((prev) => prev.filter((t) => t !== tag));
  };

  const removePlace = (placeId: string) => {
    setPlaces((prev) => prev.filter((p) => p.id !== placeId));
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPlaces((prev) => {
        const oldIdx = prev.findIndex((p) => p.id === active.id);
        const newIdx = prev.findIndex((p) => p.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  return (
    <motion.div
      className="max-w-[430px] mx-auto bg-white min-h-screen pb-[72px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Nav bar */}
      <div className="px-4 py-3 flex items-center border-b border-gray-100">
        <button onClick={goBack}>
          <ChevronLeft size={22} />
        </button>
        <span className="flex-1 text-center font-semibold">코스 편집</span>
        <button
          onClick={handleSave}
          className="bg-[#FF6B5B] text-white text-sm px-4 py-1.5 rounded-lg"
        >
          저장
        </button>
      </div>

      {/* Form */}
      <div className="px-4 pt-4 space-y-5">

        {/* Title */}
        <div>
          <p className="text-xs text-gray-400 mb-1">코스 제목</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400"
          />
        </div>

        {/* Hashtags */}
        <div>
          <p className="text-xs text-gray-400 mb-1.5">해시태그</p>
          <div className="flex flex-wrap gap-2">
            {hashtags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 border border-gray-200 rounded-full px-3 py-1 text-sm"
              >
                #{tag}
                <button onClick={() => removeTag(tag)}>
                  <X size={12} className="text-gray-400" />
                </button>
              </span>
            ))}
            {isAddingTag ? (
              <input
                ref={tagInputRef}
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && commitTag()}
                onBlur={commitTag}
                className="border border-[#FF6B5B] rounded-full px-3 py-1 text-sm outline-none w-24"
                placeholder="#태그"
              />
            ) : (
              <button
                onClick={() => setIsAddingTag(true)}
                className="border border-dashed border-gray-300 rounded-full px-3 py-1 text-sm text-gray-400"
              >
                + 추가
              </button>
            )}
          </div>
        </div>

        {/* Map preview */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400">지도 · 현재 코스</span>
            <button className="text-xs text-[#FF6B5B]">+ 근처 식당 추가</button>
          </div>
          <CourseMap
            places={places}
            width={398}
            height={160}
            className="w-full border border-gray-100"
          />
        </div>

        {/* Place list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              장소 · {places.length}개 (최대 4)
            </span>
            <span className="text-xs text-gray-400">drag to reorder</span>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={places.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {places.map((place, i) => (
                <SortableItem
                  key={place.id}
                  place={place}
                  index={i}
                  onRemove={removePlace}
                />
              ))}
            </SortableContext>
          </DndContext>

          {places.length < 4 && (
            <button className="border-2 border-dashed border-gray-200 rounded-xl py-3 w-full text-sm text-gray-400 flex items-center justify-center gap-1">
              <MapPin size={14} />
              식당 추가 (지도에서)
            </button>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 px-4 py-3 flex gap-3">
        <button
          onClick={goBack}
          className="flex-1 border border-gray-200 rounded-xl h-11 text-sm"
        >
          취소
        </button>
        <button
          onClick={() => navigate(`/course/${id}/share?from=edit`)}
          className="flex-1 bg-[#FF6B5B] text-white rounded-xl h-11 text-sm font-medium"
        >
          코스 공유
        </button>
      </div>
    </motion.div>
  );
}
