import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useParams, useLocation, useSearch } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Bookmark, Share2, ChevronLeft, ChevronRight, Star, X, GripVertical, MessageCircle } from 'lucide-react';
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
import { CourseMapView } from '@/components/course/CourseMapView';
import { getCourseMapPositionPercent } from '@/components/course/CourseMap';
import { useApp } from '@/contexts/AppContext';
import { getCourseById as getMockCourseById } from '@/data/mockCourse';
import { CoursePlace } from '@/types/course';
import { COURSE_THEME, getCourseSequenceColor } from '@/constants/courseTheme';
import { getCoursePlacesFromStops } from '@/lib/courseMapSync';
import RestaurantDetailSheet from '@/components/munchie/RestaurantDetailSheet';
import FruitCharacter, { fruitForStop } from '@/components/munchie/FruitCharacter';
import OneLineReviewBox from '@/components/munchie/OneLineReviewBox';

type FromMode = 'explore' | 'saved' | 'feed' | 'template' | 'template-detail' | 'profile';

function useFrom(): FromMode {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const from = params.get('from');
  if (from === 'saved' || from === 'feed' || from === 'template' || from === 'template-detail' || from === 'profile') return from;
  return 'explore';
}

const BACK_PATH: Record<FromMode, string> = {
  saved: '/saved',
  profile: '/profile',
  feed: '/feed?tab=feed',
  template: '/feed?tab=template',
  'template-detail': '/feed?tab=template',
  explore: '/feed', // 먼치모드 통합 — 구 explore 진입도 피드로 복귀
};

function normalizeHashtags(tags: string[]) {
  return tags.map((tag) => tag.replace(/^#/, ''));
}

function DraggableMapPhoto({
  place,
  index,
  mapRef,
  onOpen,
}: {
  place: CoursePlace;
  index: number;
  mapRef: RefObject<HTMLDivElement | null>;
  onOpen: () => void;
}) {
  const didDrag = useRef(false);
  const dragStart = useRef<{ pointerX: number; pointerY: number; offsetX: number; offsetY: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const boxOnRight = place.coords.x < 55;

  const movePhoto = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStart.current || !mapRef.current) return;
    const deltaX = event.clientX - dragStart.current.pointerX;
    const deltaY = event.clientY - dragStart.current.pointerY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 4) didDrag.current = true;

    const desired = {
      x: dragStart.current.offsetX + deltaX,
      y: dragStart.current.offsetY + deltaY,
    };
    const mapBounds = mapRef.current.getBoundingClientRect();
    const photoBounds = event.currentTarget.getBoundingClientRect();
    const baseLeft = photoBounds.left - offset.x;
    const baseTop = photoBounds.top - offset.y;
    const padding = 5;

    setOffset({
      x: Math.min(mapBounds.right - padding - photoBounds.width - baseLeft, Math.max(mapBounds.left + padding - baseLeft, desired.x)),
      y: Math.min(mapBounds.bottom - padding - photoBounds.height - baseTop, Math.max(mapBounds.top + padding - baseTop, desired.y)),
    });
  };

  const finishDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStart.current = null;
    window.setTimeout(() => { didDrag.current = false; }, 0);
  };

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: `${getCourseMapPositionPercent(place.coords.x, 430)}%`,
        top: `${getCourseMapPositionPercent(place.coords.y, 300)}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <FruitCharacter kind={fruitForStop(index)} size={34} />
      <button
        type="button"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          dragStart.current = {
            pointerX: event.clientX,
            pointerY: event.clientY,
            offsetX: offset.x,
            offsetY: offset.y,
          };
        }}
        onPointerMove={movePhoto}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onClick={() => { if (!didDrag.current) onOpen(); }}
        aria-label={`${place.name} 사진 이동 또는 보기`}
        className="pointer-events-auto absolute flex w-[92px] cursor-grab touch-none flex-col overflow-hidden rounded-xl border border-[#E8D9D0] bg-white shadow-[0_6px_16px_rgba(91,56,39,0.15)] active:cursor-grabbing"
        style={{
          top: -22,
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
          zIndex: dragStart.current ? 30 : 10,
          ...(boxOnRight ? { left: 40 } : { right: 40 }),
        }}
      >
        {place.imageUrl ? (
          <img src={place.imageUrl} alt="" className="h-12 w-full select-none object-cover" draggable={false} />
        ) : (
          <span className="flex h-12 w-full items-center justify-center bg-[#F5F1ED] text-[9px] text-[#A8978D]">사진</span>
        )}
        <span className="truncate px-1.5 py-1 text-[8.5px] font-black text-[#3B2A22]">
          {place.name}
        </span>
      </button>
    </div>
  );
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
  /** 오른쪽으로 밀거나 화살표 탭 시 식당 상세 열기 */
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
        {/* 번호 대신 과일 캐릭터 (키위 → 사과 → 딸기 순) */}
        <FruitCharacter kind={fruitForStop(index)} size={32} />
        {!isLast && (
          <div
            className="flex-1 border-l-2 border-dashed ml-[1px] my-1"
            style={{ borderColor: color.lighter }}
          />
        )}
      </div>

      <motion.div
        layout
        role={canPeek ? 'button' : undefined}
        tabIndex={canPeek ? 0 : undefined}
        aria-label={canPeek ? (selected ? `${place.name} 상세보기` : `${place.name} 선택`) : undefined}
        aria-pressed={canPeek ? selected : undefined}
        drag={canPeek && selected ? 'x' : false}
        dragConstraints={{ left: 0, right: 90 }}
        dragElastic={0.12}
        dragSnapToOrigin
        onDragEnd={(_, info) => {
          if (info.offset.x > 55) onOpenDetail?.(place.id);
        }}
        onClick={() => {
          if (!canPeek) return;
          if (selected) {
            onOpenDetail?.(place.id);
            return;
          }
          onSelect?.(place.id);
        }}
        onKeyDown={(event) => {
          if (!canPeek || (event.key !== 'Enter' && event.key !== ' ')) return;
          event.preventDefault();
          if (selected) {
            onOpenDetail?.(place.id);
            return;
          }
          onSelect?.(place.id);
        }}
        className={`flex-1 border rounded-xl p-3 flex gap-3 items-center transition-colors ${!isLast ? 'mb-2' : ''} ${
          canPeek ? 'cursor-pointer' : ''
        }`}
        style={selected
          ? { borderColor: color.base, background: color.faint, touchAction: 'pan-y' }
          : { borderColor: '#EADBD2', background: '#FFFDFC', touchAction: 'pan-y' }}
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
          {place.address && <p className="text-[11px] text-gray-400 truncate">{place.address}</p>}
          {/* 하이라이트 시: 밀어서 상세보기 힌트 */}
          {selected && !isEditing && (
            <motion.p
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1 text-[10px] font-bold"
              style={{ color: color.text }}
            >
              한 번 더 누르거나 오른쪽으로 밀어서 상세보기 →
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
  const search = useSearch();
  // 프로필 진입도 내 코스맵이므로 편집 가능 모드
  const fromSaved = from === 'saved' || from === 'profile';
  const {
    savedCourseIds,
    saveCourse,
    unsaveCourse,
    getCourseById: getAppCourseById,
    getRestaurantById,
    feedPosts,
  } = useApp();
  const isBookmarked = id ? savedCourseIds.includes(id) : false;
  const templateId = new URLSearchParams(search).get('template');
  const templateFrom = new URLSearchParams(search).get('templateFrom');
  const requestedPostId = new URLSearchParams(search).get('post');
  const isProfileTemplateCourse = from === 'template-detail' && templateFrom === 'profile';
  const canManageCourse = fromSaved || isProfileTemplateCourse;
  const backPath = from === 'template-detail' && templateId && id
    ? `/template/${templateId}?course=${id}${templateFrom === 'profile' ? '&from=profile' : ''}`
    : BACK_PATH[from];

  const toggleBookmark = () => {
    if (!id) return;
    if (isBookmarked) unsaveCourse(id);
    else saveCourse(id);
  };

  const appCourse = id ? getAppCourseById(id) : undefined;
  const orphanPost = id
    ? feedPosts.find(post => post.id === requestedPostId && post.courseId === id)
      ?? feedPosts.find(post => post.courseId === id)
    : undefined;
  const courseData = getMockCourseById(id);
  const syncedPlaces = useMemo(
    () => (appCourse ? getCoursePlacesFromStops(appCourse, getRestaurantById) : []),
    [appCourse, getRestaurantById],
  );
  const legacyPhotoPlaces: CoursePlace[] = (orphanPost?.photos ?? []).slice(0, 3).map((photo, index) => ({
    id: `legacy-${orphanPost!.id}-${index}`,
    name: `코스 스팟 ${index + 1}`,
    rating: 0,
    distance: '기록 사진',
    category: orphanPost?.tags[index] ?? 'Munchie',
    priceLevel: 1,
    imageUrl: photo,
    coords: [{ x: 20, y: 28 }, { x: 70, y: 50 }, { x: 32, y: 76 }][index]!,
  }));
  const initialTitle = orphanPost?.caption || appCourse?.description || courseData.title;
  const initialHashtags = normalizeHashtags(appCourse?.hashtags ?? orphanPost?.tags ?? courseData.hashtags);
  const initialPlaces = appCourse && syncedPlaces.length > 0
    ? syncedPlaces
    : legacyPhotoPlaces.length > 0
      ? legacyPhotoPlaces
      : courseData.places.map(p => ({ ...p }));
  const distanceKm = appCourse?.metadata.distance ?? courseData.distanceKm;
  const durationLabel = appCourse
    ? `${Math.floor(appCourse.metadata.duration / 60)}h`
    : `${courseData.durationHours}h`;
  const saveCount = appCourse?.savedCount ?? courseData.saveCount;
  const relatedFeedCount = id
    ? feedPosts.filter(post => post.courseId === id).length
    : 0;
  const authorHandle = (orphanPost?.authorName || courseData.authorHandle).replace(/^@/, '');
  const authorMeta = orphanPost ? 'Munchie creator' : `${courseData.followerCount} Followers`;

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
  // 지도 위 음식점 박스 클릭 → 레스토랑 이미지 라이트박스
  const [lightboxPlace, setLightboxPlace] = useState<CoursePlace | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

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
      navigate(backPath);
    }
  };

  const shareCourseMap = () => {
    if (!id) return;
    navigate(`/course/${id}/share`);
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
      className="mx-auto min-h-screen max-w-[430px] bg-[#FFF8F3] pb-[112px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Back button */}
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <button
          onClick={() => navigate(backPath)}
          aria-label="이전 화면으로 돌아가기"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#EBD8CE] bg-white text-[#8B6A5D] shadow-sm"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#E67E78]">Munchie</p>
          <p className="text-[16px] font-black text-[#49362E]">코스맵 보기</p>
        </div>
        <div className="h-9 w-9" aria-hidden="true" />
      </div>

      {/* Every course map uses the same basic card. Stored legacy skins are intentionally ignored. */}
      <div className="mx-4 overflow-hidden rounded-3xl border border-[#EBD9CF] bg-[#FFFDFC] shadow-[0_10px_28px_rgba(105,67,48,0.08)]">

      {/* Author */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F3EDE8] text-lg">
            {orphanPost?.authorEmoji || '🍽️'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm">@{authorHandle}</span>
            </div>
            <span className="text-xs text-gray-500">{authorMeta}</span>
          </div>
        </div>

        {fromSaved ? (
          <button
            onClick={() => setIsEditing(prev => !prev)}
            className="border border-gray-300 text-sm px-3 py-1 rounded-full"
          >
            {isEditing ? '완료' : '편집'}
          </button>
        ) : isProfileTemplateCourse ? (
          <button
            onClick={() => navigate(`/course/${id}/edit?from=profile`)}
            className="border border-gray-300 text-sm px-3 py-1 rounded-full"
          >
            편집
          </button>
        ) : (
          <button className="border border-gray-300 text-sm px-3 py-1 rounded-full">
            팔로우
          </button>
        )}
      </div>

      {/* Course info */}
      <motion.div layout className="px-4 pb-3">
        {/* One-line review */}
        <AnimatePresence mode="wait">
          {fromSaved && isEditing ? (
            <motion.div
              key="title-input"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <OneLineReviewBox>
                <input
                  ref={titleInputRef}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  aria-label="한줄평 수정"
                  className="w-full bg-transparent text-[14px] font-bold leading-relaxed text-[#3B2A23] outline-none"
                />
              </OneLineReviewBox>
            </motion.div>
          ) : (
            <motion.div
              key="title-text"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <OneLineReviewBox>
                <p className="text-[14px] font-bold leading-relaxed text-[#3B2A23]">{title}</p>
              </OneLineReviewBox>
            </motion.div>
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

      {/* Map actions — 지도 위에 분리해 지도를 가리지 않는다. */}
      <div className="mx-4 mb-2 flex justify-end gap-1.5">
          <button
            onClick={shareCourseMap}
            aria-label="코스맵 공유"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D5E1D9] bg-[#F6FBF7] text-[#688373]"
          >
            <Share2 size={15} />
          </button>
          {!canManageCourse && (
            <button
              onClick={toggleBookmark}
              aria-label="코스맵 저장"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#F0C7BD] bg-[#FFF5F1] text-[#D56F69]"
            >
              <Bookmark
                size={15}
                fill={isBookmarked ? '#E85053' : 'none'}
                stroke={isBookmarked ? '#E85053' : 'currentColor'}
              />
            </button>
          )}
      </div>

      {/* Map area — 과일 캐릭터 마커 + 음식점 박스 오버레이 */}
      <div ref={mapRef} className="relative mx-4 mb-4 h-[300px] overflow-hidden rounded-[22px] border-2 border-[#E9D8CF] bg-[#FBF7F1] shadow-[0_8px_22px_rgba(105,67,48,0.08)]">
        <CourseMapView places={places} width={430} height={300} className="h-full w-full" />
        <div className="pointer-events-none absolute inset-0 z-10">
          {places.map((place, i) => (
            <DraggableMapPhoto
              key={place.id}
              place={place}
              index={i}
              mapRef={mapRef}
              onOpen={() => setLightboxPlace(place)}
            />
          ))}
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[9px] font-bold text-[#8D776C] shadow-sm">
            사진을 드래그해 지도를 확인하세요
          </span>
        </div>
      </div>

      {/* Stats bar */}
      <div className="mx-4 mb-4 grid grid-cols-4 overflow-hidden rounded-2xl border border-[#EADBD2] bg-[#FFFDFC]">
        {[
          { value: `${distanceKm}km`, label: '거리' },
          { value: durationLabel, label: '소요 시간' },
          { value: `${places.length}`, label: '스팟' },
          { value: `${saveCount.toLocaleString()}`, label: '저장' },
        ].map((stat, i, arr) => (
          <div
            key={stat.label}
            className={`flex flex-col items-center py-3 ${i < arr.length - 1 ? 'border-r border-[#EFE2DA]' : ''}`}
          >
            <span className="font-bold text-sm">{stat.value}</span>
            <span className="text-xs text-gray-400">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="mx-4 mb-4">
        <button
          type="button"
          onClick={() => navigate(`/course/${id}/feeds${search ? `?${search}` : ''}`)}
          className="flex w-full items-center gap-3 rounded-2xl border border-[#F2D8D3] bg-[#FFF8F4] p-3.5 text-left active:scale-[0.99]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FDE1E1] text-[#D94447]">
            <MessageCircle size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-black text-[#3B2A22]">이 코스로 만든 피드</span>
            <span className="mt-0.5 block text-[11px] text-[#9D887C]">
              {relatedFeedCount > 0 ? `올라온 피드 ${relatedFeedCount}개 둘러보기` : '아직 올라온 피드가 없어요'}
            </span>
          </span>
          <ChevronRight size={18} color="#B09A8C" />
        </button>
      </div>

      {/* Place list */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">코스 순서</p>
          <p className="text-[10px] text-gray-400">한 번 선택 · 두 번 상세보기</p>
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
                  hasDetail
                  selected={selectedPlaceId === place.id}
                  onSelect={pid => setSelectedPlaceId(prev => (prev === pid ? null : pid))}
                  onOpenDetail={pid => setDetailPlaceId(pid)}
                />
              ))}
            </motion.div>
          </SortableContext>
        </DndContext>
      </div>

      </div>

      {/* 지도 박스 클릭 → 레스토랑 이미지 라이트박스 */}
      <AnimatePresence>
        {lightboxPlace && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxPlace(null)}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-8"
          >
            <motion.div
              initial={{ scale: 0.85, y: 14 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              onClick={event => event.stopPropagation()}
              className="w-full max-w-[340px] overflow-hidden rounded-3xl bg-white"
            >
              {lightboxPlace.imageUrl ? (
                <img src={lightboxPlace.imageUrl} alt={lightboxPlace.name} className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-gray-100 text-sm text-gray-400">
                  등록된 사진이 없어요
                </div>
              )}
              <div className="flex items-center gap-2.5 px-4 py-3.5">
                <FruitCharacter
                  kind={fruitForStop(places.findIndex(p => p.id === lightboxPlace.id))}
                  size={30}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-black text-[#2B211D]">{lightboxPlace.name}</p>
                  <p className="truncate text-[11px] text-gray-400">
                    {lightboxPlace.category}{lightboxPlace.address ? ` · ${lightboxPlace.address}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setLightboxPlace(null); setDetailPlaceId(lightboxPlace.id); }}
                  className="shrink-0 rounded-full bg-[#E85053] px-3 py-1.5 text-[11px] font-black text-white active:scale-95"
                >
                  상세보기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 식당 상세 슬라이드 (뒤로가면 이 화면으로 복귀) */}
      <AnimatePresence>
        {detailPlaceId && (
          <RestaurantDetailSheet
            restaurantId={detailPlaceId}
            fallbackPlace={places.find(place => place.id === detailPlaceId)}
            courseId={id}
            onClose={() => setDetailPlaceId(null)}
          />
        )}
      </AnimatePresence>


      {/* Bottom bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[398px] bg-white rounded-2xl shadow-lg px-4 py-3 flex gap-2">
        {isProfileTemplateCourse ? (
          <button
            onClick={() => navigate(`/course/${id}/edit?from=profile`)}
            className="h-11 flex-1 rounded-xl bg-[#E85053] text-sm font-medium text-white"
          >
            편집
          </button>
        ) : fromSaved ? (
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
              onClick={() => navigate(`/coursemap/new?course=${id}`)}
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
