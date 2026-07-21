import { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, useSearch } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ChevronLeft, ChevronRight, Star, X, GripVertical, Clock } from 'lucide-react';
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
import { useApp } from '@/contexts/AppContext';
import { getCourseById as getMockCourseById } from '@/data/mockCourse';
import { CoursePlace } from '@/types/course';
import { getCourseSequenceColor } from '@/constants/courseTheme';
import { getCoursePlacesFromStops } from '@/lib/courseMapSync';
import RestaurantDetailSheet from '@/components/munchie/RestaurantDetailSheet';

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
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-black leading-none text-white"
          style={{ backgroundColor: color.base }}
          aria-label={`${index + 1}번째 장소`}
        >
          {index + 1}
        </span>
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
    getCourseById: getAppCourseById,
    getRestaurantById,
    feedPosts,
  } = useApp();
  const templateId = new URLSearchParams(search).get('template');
  const templateFrom = new URLSearchParams(search).get('templateFrom');
  const templateOrigin = templateFrom === 'profile' || templateFrom === 'saved' ? templateFrom : 'feed';
  const requestedPostId = new URLSearchParams(search).get('post');
  const isProfileTemplateCourse = from === 'template-detail' && templateFrom === 'profile';
  const backPath = from === 'template-detail' && templateId && id
    ? `/template/${templateId}?course=${id}&from=${templateOrigin}`
    : BACK_PATH[from];

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
  const initialPlaces = appCourse && syncedPlaces.length > 0
    ? syncedPlaces
    : legacyPhotoPlaces.length > 0
      ? legacyPhotoPlaces
      : courseData.places.map(p => ({ ...p }));
  const durationHours = appCourse
    ? appCourse.metadata.duration / 60
    : courseData.durationHours;
  const durationLabel = `${Number.isInteger(durationHours) ? durationHours : durationHours.toFixed(1)}시간`;
  const authorHandle = (orphanPost?.authorName || courseData.authorHandle).replace(/^@/, '');
  const authorMeta = orphanPost ? 'Munchie creator' : `${courseData.followerCount} Followers`;

  // Local editable state (only used in saved mode)
  const [places, setPlaces] = useState<CoursePlace[]>(initialPlaces);
  const [isEditing, setIsEditing] = useState(false);
  // 코스 순서: 터치 → 하이라이트, 밀기 → 식당 상세 슬라이드
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [detailPlaceId, setDetailPlaceId] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) return;
    setPlaces(initialPlaces);
  }, [id, isEditing, appCourse, syncedPlaces]);

  const handleDelete = () => {
    if (window.confirm('이 코스를 삭제할까요?')) {
      navigate(backPath);
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
      className="page-with-bottom-action mx-auto min-h-screen max-w-[430px] bg-[#FFF8F3]"
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

      {/* Map area — 지도·경로·순번 마커만 표시한다. */}
      <div
        data-ui="course-map-area"
        className="relative mx-4 mb-4 h-[270px] overflow-hidden rounded-[22px] border border-[#E9D8CF] bg-[#FBF7F1] shadow-[0_8px_22px_rgba(105,67,48,0.08)]"
      >
        <CourseMapView places={places} width={430} height={270} className="h-full w-full" />
      </div>

      {/* Time / spots */}
      <div
        data-ui="course-meta"
        className="mx-4 flex items-center justify-start gap-3 border-y border-[#EEE0D8] py-3 text-[11px] font-bold text-[#766158]"
      >
        <span className="flex shrink-0 items-center gap-1.5">
          <Clock size={14} className="text-[#EE7772]" />
          {durationLabel}
        </span>
        <span className="shrink-0">{places.length}개 스팟</span>
      </div>

      {/* Place list */}
      <div className="px-4 pb-4 pt-4">
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

      {/* 식당 상세 슬라이드 (뒤로가면 이 화면으로 복귀) */}
      <AnimatePresence>
        {detailPlaceId && (
          <RestaurantDetailSheet
            restaurantId={detailPlaceId}
            fallbackPlace={places.find(place => place.id === detailPlaceId)}
            onClose={() => setDetailPlaceId(null)}
          />
        )}
      </AnimatePresence>


      {/* Bottom bar */}
      <div className="page-bottom-action-bar page-bottom-bar">
        {isProfileTemplateCourse ? (
          <button
            onClick={() => navigate(`/course/${id}/edit?from=profile`)}
            className="page-bottom-action-primary"
          >
            편집
          </button>
        ) : fromSaved ? (
          <button
            onClick={handleDelete}
            className="h-[52px] flex-1 rounded-2xl border border-red-200 text-sm text-red-400"
          >
            삭제
          </button>
        ) : (
          <>
            <button className="page-bottom-action-secondary">
              <Heart size={20} />
            </button>
            <button
              onClick={() => navigate(`/coursemap/new?course=${id}`)}
              className="page-bottom-action-primary"
            >
              복사해서 편집
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
