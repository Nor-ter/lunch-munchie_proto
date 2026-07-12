import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useLocation, useSearch } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Bookmark, Share2, ChevronLeft, ChevronRight, Star, X, GripVertical, Palette } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
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
import { CSS } from '@dnd-kit/utilities';
import { CourseMap } from '@/components/course/CourseMap';
import { useApp } from '@/contexts/AppContext';
import { getCourseById as getMockCourseById } from '@/data/mockCourse';
import { CoursePlace } from '@/types/course';
import { COURSE_THEME, getCourseSequenceColor } from '@/constants/courseTheme';
import { getCoursePlacesFromStops } from '@/lib/courseMapSync';
import { getSkinById } from '@/constants/skins';
import SkinFrame from '@/components/munchie/SkinFrame';
import SkinPicker from '@/components/munchie/SkinPicker';
import RestaurantDetailSheet from '@/components/munchie/RestaurantDetailSheet';

type FromMode = 'explore' | 'saved' | 'feed' | 'template' | 'profile';

function useFrom(): FromMode {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const from = params.get('from');
  if (from === 'saved' || from === 'feed' || from === 'template' || from === 'profile') return from;
  return 'explore';
}

const BACK_PATH: Record<FromMode, string> = {
  saved: '/saved',
  profile: '/profile',
  feed: '/feed?tab=feed',
  template: '/feed?tab=template',
  explore: '/feed', // 먼치모드 통합 — 구 explore 진입도 피드로 복귀
};

function normalizeHashtags(tags: string[]) {
  return tags.map((tag) => tag.replace(/^#/, ''));
}

// ── PlaceItem ─────────────────────────────────────────────────────────────────

function PlaceItem({
  place,
  index,
  isLast,
  isEditing,
  onRemove,
  selected = false,
  onSelect,
  onOpenDetail,
  hasDetail = false,
}: {
  place: CoursePlace;
  index: number;
  isLast: boolean;
  isEditing: boolean;
  onRemove?: (id: string) => void;
  /** 터치로 하이라이트된 상태 */
  selected?: boolean;
  onSelect?: (id: string) => void;
  /** 왼쪽으로 밀거나 화살표 탭 시 식당 상세 열기 */
  onOpenDetail?: (id: string) => void;
  hasDetail?: boolean;
}) {
  const color = getCourseSequenceColor(index);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: place.id,
    disabled: !isEditing,
  });
  const canPeek = !isEditing && hasDetail;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex gap-3 ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex flex-col items-center">
        <div
          className="w-7 h-7 rounded-full text-white text-xs flex items-center justify-center shrink-0"
          style={{ background: color.base }}
        >
          {index + 1}
        </div>
        {!isLast && (
          <div
            className="flex-1 border-l-2 border-dashed ml-[1px] my-1"
            style={{ borderColor: color.lighter }}
          />
        )}
      </div>

      <motion.div
        layout
        drag={canPeek && selected ? 'x' : false}
        dragConstraints={{ left: -90, right: 0 }}
        dragElastic={0.12}
        dragSnapToOrigin
        onDragEnd={(_, info) => {
          if (info.offset.x < -55) onOpenDetail?.(place.id);
        }}
        onClick={() => canPeek && onSelect?.(place.id)}
        className={`flex-1 border rounded-xl p-3 flex gap-3 items-center transition-colors ${!isLast ? 'mb-2' : ''} ${
          canPeek ? 'cursor-pointer' : ''
        }`}
        style={selected
          ? { borderColor: color.base, background: color.faint, touchAction: 'pan-y' }
          : { borderColor: '#F3F4F6', touchAction: 'pan-y' }}
      >
        <AnimatePresence>
          {isEditing && (
            <motion.button
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.15 }}
              className="text-gray-300 cursor-grab touch-none shrink-0"
              {...attributes}
              {...listeners}
            >
              <GripVertical size={18} />
            </motion.button>
          )}
        </AnimatePresence>
        {place.imageUrl ? (
          <img src={place.imageUrl} alt={place.name} className="w-14 h-14 rounded-lg object-cover shrink-0" draggable={false} />
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
          {/* 하이라이트 시: 밀어서 상세보기 힌트 */}
          {selected && !isEditing && (
            <motion.p
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1 text-[10px] font-bold"
              style={{ color: color.text }}
            >
              ← 밀어서 식당 상세·후기 보기
            </motion.p>
          )}
        </div>
        {canPeek && selected && (
          <motion.button
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={(e) => { e.stopPropagation(); onOpenDetail?.(place.id); }}
            aria-label={`${place.name} 상세보기`}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: color.base, color: 'white' }}
          >
            <ChevronRight size={16} />
          </motion.button>
        )}
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
  // 프로필 진입도 내 코스맵이므로 편집 가능 모드
  const fromSaved = from === 'saved' || from === 'profile';
  const {
    savedCourseIds,
    saveCourse,
    unsaveCourse,
    getCourseById: getAppCourseById,
    getRestaurantById,
    courseSkins,
    setCourseSkin,
  } = useApp();
  const skin = id ? getSkinById(courseSkins[id]) : undefined;
  const [skinSheetOpen, setSkinSheetOpen] = useState(false);
  const isBookmarked = id ? savedCourseIds.includes(id) : false;

  const toggleBookmark = () => {
    if (!id) return;
    if (isBookmarked) unsaveCourse(id);
    else saveCourse(id);
  };

  const appCourse = id ? getAppCourseById(id) : undefined;
  const courseData = getMockCourseById(id);
  const syncedPlaces = useMemo(
    () => (appCourse ? getCoursePlacesFromStops(appCourse, getRestaurantById) : []),
    [appCourse, getRestaurantById],
  );
  const initialTitle = appCourse?.title ?? courseData.title;
  const initialHashtags = normalizeHashtags(appCourse?.hashtags ?? courseData.hashtags);
  const initialPlaces = appCourse && syncedPlaces.length > 0
    ? syncedPlaces
    : courseData.places.map(p => ({ ...p }));
  const distanceKm = appCourse?.metadata.distance ?? courseData.distanceKm;
  const durationLabel = appCourse
    ? `${Math.floor(appCourse.metadata.duration / 60)}h`
    : `${courseData.durationHours}h`;
  const saveCount = appCourse?.savedCount ?? courseData.saveCount;

  // Local editable state (only used in saved mode)
  const [title, setTitle] = useState(initialTitle);
  const [hashtags, setHashtags] = useState<string[]>(initialHashtags);
  const [places, setPlaces] = useState<CoursePlace[]>(initialPlaces);
  const [isEditing, setIsEditing] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  // 코스 순서: 터치 → 하이라이트, 밀기 → 식당 상세 슬라이드
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [detailPlaceId, setDetailPlaceId] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) titleInputRef.current?.focus();
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) return;
    setTitle(initialTitle);
    setHashtags(initialHashtags);
    setPlaces(initialPlaces);
  }, [id, isEditing, initialTitle, appCourse, syncedPlaces]);

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
      navigate(BACK_PATH[from]);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPlaces(prev => {
        const oldIdx = prev.findIndex(p => p.id === active.id);
        const newIdx = prev.findIndex(p => p.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  return (
    <motion.div
      className="max-w-[430px] mx-auto min-h-screen pb-[112px]"
      style={{ backgroundColor: 'var(--lm-bg)' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Back button */}
      <div className="px-4 pt-4 pb-3">
        <button
          onClick={() => navigate(BACK_PATH[from])}
          className="w-9 h-9 bg-white rounded-full shadow flex items-center justify-center"
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      {/* White card — 스킨 적용 시 스크랩북 프레임으로 감싼다 */}
      <SkinFrame skin={skin} className="mx-4" radius={26}>
      <div className={skin ? undefined : 'bg-white rounded-3xl shadow-sm overflow-hidden'}>

      {/* Author */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm">@{courseData.authorHandle}</span>
            </div>
            <span className="text-xs text-gray-500">{courseData.followerCount} Followers</span>
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
              className="text-xl font-bold w-full border-b border-gray-300 outline-none pb-0.5 bg-transparent"
            />
          ) : (
            <motion.h1
              key="title-text"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-xl font-bold"
            >
              {title}
            </motion.h1>
          )}
        </AnimatePresence>

        {/* Hashtags */}
        <AnimatePresence mode="wait">
          {fromSaved && isEditing ? (
            <motion.div
              key="tags-edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-wrap gap-1.5 mt-1.5"
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
                  className="border border-[#E85053] rounded-full px-2.5 py-0.5 text-xs outline-none w-20"
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
              className="space-x-1 mt-1"
            >
              {hashtags.map(tag => (
                <span key={tag} className="text-xs text-gray-400">#{tag}</span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Map area */}
      <div className="relative mx-4 mb-4 h-[220px] rounded-2xl overflow-hidden">
        <CourseMap places={places} width={430} height={220} className="w-full h-full" />

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
                fill={isBookmarked ? '#E85053' : 'none'}
                stroke={isBookmarked ? '#E85053' : 'currentColor'}
              />
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="mx-4 mb-4 border border-gray-100 rounded-xl grid grid-cols-4">
        {[
          { value: `${distanceKm}km`, label: '거리' },
          { value: durationLabel, label: '소요 시간' },
          { value: `${places.length}`, label: '스팟' },
          { value: `${saveCount.toLocaleString()}`, label: '저장' },
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
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">코스 순서</p>
          <p className="text-[10px] text-gray-400">터치해서 식당 자세히 보기</p>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={places.map(p => p.id)} strategy={verticalListSortingStrategy}>
            <motion.div layout className="flex flex-col">
              {places.map((place, i) => (
                <PlaceItem
                  key={place.id}
                  place={place}
                  index={i}
                  isLast={i === places.length - 1}
                  isEditing={fromSaved && isEditing}
                  onRemove={id => setPlaces(prev => prev.filter(p => p.id !== id))}
                  hasDetail={!!getRestaurantById(place.id)}
                  selected={selectedPlaceId === place.id}
                  onSelect={pid => setSelectedPlaceId(prev => (prev === pid ? null : pid))}
                  onOpenDetail={pid => setDetailPlaceId(pid)}
                />
              ))}
            </motion.div>
          </SortableContext>
        </DndContext>
      </div>

      {/* 템플릿 스킨 바꾸기 — 내 코스(저장/프로필 진입)에서만 */}
      {fromSaved && (
        <div className="px-4 pb-4">
          <button
            onClick={() => setSkinSheetOpen(true)}
            className="w-full h-11 rounded-xl border border-dashed flex items-center justify-center gap-2 text-sm font-semibold active:scale-[0.99] transition-transform"
            style={{ borderColor: skin?.accent ?? '#E85053', color: skin?.accent ?? '#E85053' }}
          >
            <Palette size={16} /> {skin ? `스킨 · ${skin.name}` : '템플릿 스킨 입히기'}
          </button>
        </div>
      )}
      </div>
      </SkinFrame>

      {/* 식당 상세 슬라이드 (뒤로가면 이 화면으로 복귀) */}
      <AnimatePresence>
        {detailPlaceId && (
          <RestaurantDetailSheet
            restaurantId={detailPlaceId}
            onClose={() => setDetailPlaceId(null)}
          />
        )}
      </AnimatePresence>

      {/* 스킨 선택 바텀시트 */}
      <AnimatePresence>
        {skinSheetOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSkinSheetOpen(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-[430px] bg-white rounded-t-3xl z-50 px-5 pt-4 pb-8"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
              <div className="mb-4 flex items-center justify-between">
                <p className="font-bold text-[16px]">템플릿 스킨 선택</p>
                <button
                  onClick={() => { if (id) setCourseSkin(id, null); }}
                  className="text-[12px] text-gray-400 underline underline-offset-2"
                >
                  기본으로
                </button>
              </div>
              <SkinPicker
                value={id ? courseSkins[id] ?? null : null}
                onChange={(skinId) => { if (id) setCourseSkin(id, skinId); }}
                previewPhoto={places[0]?.imageUrl}
                columns={3}
              />
              <button
                onClick={() => setSkinSheetOpen(false)}
                className="mt-5 w-full h-12 rounded-2xl bg-[#E85053] text-white font-bold text-[14px]"
              >
                완료
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[398px] bg-white rounded-2xl shadow-lg px-4 py-3 flex gap-2">
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
              className="flex-1 bg-[#E85053] text-white rounded-xl h-11 text-sm font-medium"
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
                fill={isBookmarked ? '#E85053' : 'none'}
                stroke={isBookmarked ? '#E85053' : 'currentColor'}
              />
            </button>
            <button
              onClick={() => navigate(`/course/${id}/edit?from=explore`)}
              className="flex-1 text-white rounded-xl h-11 text-sm font-medium"
              style={{ backgroundColor: COURSE_THEME.primary }}
            >
              복사해서 편집
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
