import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useLocation, useSearch } from 'wouter';
import { useApp, type Course, type Restaurant } from '@/contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, GripVertical, Plus, MapPin, Search, Check } from 'lucide-react';
import { toast } from 'sonner';
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
import { getCourseSequenceColor } from '@/constants/courseTheme';
import { getCoursePlacesFromStops, getCourseMapPoints } from '@/lib/courseMapSync';
import { getSkinById } from '@/constants/skins';
import SkinFrame from '@/components/munchie/SkinFrame';
import RestaurantDetailSheet from '@/components/munchie/RestaurantDetailSheet';

const MAX_PLACES = 4;

/** 선택된 장소들의 좌표를 실제 위경도 기반으로 재계산한다 (지도 미리보기용) */
function withRecalculatedCoords(
  places: CoursePlace[],
  getRestaurantById: (id: string) => Restaurant | undefined,
): CoursePlace[] {
  const linked = places.map((p) => getRestaurantById(p.id));
  const points = getCourseMapPoints(linked.filter((r): r is Restaurant => !!r));
  let pointIdx = 0;
  return places.map((p, i) => (linked[i] ? { ...p, coords: points[pointIdx++] ?? p.coords } : p));
}

function restaurantToPlace(r: Restaurant): CoursePlace {
  return {
    id: r.id,
    name: r.name,
    rating: r.rating,
    distance: r.distance,
    category: r.category,
    priceLevel: r.priceRange,
    imageUrl: r.image,
    coords: { x: 50, y: 50 },
  };
}

// ── RestaurantPickerSheet ─────────────────────────────────────────────────────

function RestaurantPickerSheet({
  addedIds,
  onPick,
  onClose,
}: {
  addedIds: string[];
  onPick: (r: Restaurant) => void;
  onClose: () => void;
}) {
  const { restaurants } = useApp();
  const [query, setQuery] = useState('');
  const filtered = restaurants.filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/40 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-[430px] bg-white rounded-t-3xl z-50 px-4 pt-4 pb-6 max-h-[75dvh] flex flex-col"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200 shrink-0" />
        <p className="mb-3 font-bold text-[15px] shrink-0">식당 추가</p>
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-gray-100 px-3 h-10 shrink-0">
          <Search size={15} className="text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="식당 이름으로 검색"
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {filtered.map((r) => {
            const added = addedIds.includes(r.id);
            return (
              <button
                key={r.id}
                onClick={() => !added && onPick(r)}
                disabled={added}
                className={`w-full flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all ${
                  added ? 'border-gray-100 opacity-50' : 'border-gray-100 active:scale-[0.98]'
                }`}
              >
                <img src={r.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-xs text-gray-400">{r.category} · {r.distance}</p>
                </div>
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: added ? '#EAF7EC' : '#F5F5F5' }}
                >
                  {added ? <Check size={13} className="text-[#2E9E42]" /> : <Plus size={13} className="text-gray-400" />}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">검색 결과가 없어요</p>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ── SortableItem ──────────────────────────────────────────────────────────────

function SortableItem({
  place,
  index,
  onRemove,
  selected = false,
  onSelect,
  onOpenDetail,
  hasDetail = false,
}: {
  place: CoursePlace;
  index: number;
  onRemove: (id: string) => void;
  /** 터치로 하이라이트된 상태 */
  selected?: boolean;
  onSelect?: (id: string) => void;
  /** 왼쪽으로 밀거나 화살표 탭 시 식당 상세(후기 모아보기) 열기 */
  onOpenDetail?: (id: string) => void;
  hasDetail?: boolean;
}) {
  const color = getCourseSequenceColor(index);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: place.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-50' : ''}
    >
      <motion.div
        drag={hasDetail && selected ? 'x' : false}
        dragConstraints={{ left: -90, right: 0 }}
        dragElastic={0.12}
        dragSnapToOrigin
        onDragEnd={(_, info) => {
          if (info.offset.x < -55) onOpenDetail?.(place.id);
        }}
        onClick={() => hasDetail && onSelect?.(place.id)}
        className={`border rounded-xl p-3 mb-2 bg-white flex items-center gap-3 transition-colors ${
          isDragging ? 'shadow-lg' : ''
        } ${hasDetail ? 'cursor-pointer' : ''}`}
        style={{
          borderColor: selected ? color.base : '#F3F4F6',
          background: selected ? color.faint : '#FFFFFF',
          touchAction: 'pan-y',
        }}
      >
        <button
          className="text-gray-300 cursor-grab touch-none"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} />
        </button>

        <div
          className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center shrink-0"
          style={{ background: color.base }}
        >
          {index + 1}
        </div>

        {place.imageUrl ? (
          <img
            src={place.imageUrl}
            alt={place.name}
            className="w-12 h-12 rounded-lg object-cover shrink-0"
            draggable={false}
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0" />
        )}

        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-medium truncate">{place.name}</span>
          <span className="text-xs text-gray-400">
            {place.distance} · {'₩'.repeat(place.priceLevel)}
          </span>
          {selected && (
            <motion.span
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-0.5 text-[10px] font-bold"
              style={{ color: color.text }}
            >
              ← 밀어서 상세·후기 확인
            </motion.span>
          )}
        </div>

        {hasDetail && selected && (
          <motion.button
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={(e) => { e.stopPropagation(); onOpenDetail?.(place.id); }}
            aria-label={`${place.name} 상세보기`}
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: color.base, color: 'white' }}
          >
            <ChevronRight size={15} />
          </motion.button>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onRemove(place.id); }}
          className="text-gray-300 shrink-0"
        >
          <X size={16} />
        </button>
      </motion.div>
    </div>
  );
}

function useEditorFrom(): 'explore' | 'saved' {
  const search = useSearch();
  return new URLSearchParams(search).get('from') === 'saved' ? 'saved' : 'explore';
}

function normalizeHashtags(tags: string[]) {
  return tags.map((tag) => tag.replace(/^#/, ''));
}

// ── CourseEditPage ────────────────────────────────────────────────────────────

export default function CourseEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const [, navigate] = useLocation();
  const editorFrom = useEditorFrom();
  const { saveCourse, addCourse, getCourseById, getRestaurantById, profile, courseSkins } = useApp();
  const appCourse = !isNew && id ? getCourseById(id) : undefined;
  // 복사해서 편집으로 가져온 코스의 스킨 느낌을 에디터에서도 유지한다
  const skin = !isNew && id ? getSkinById(courseSkins[id]) : undefined;
  const syncedPlaces = useMemo(
    () => (appCourse ? getCoursePlacesFromStops(appCourse, getRestaurantById) : []),
    [appCourse, getRestaurantById],
  );
  const initialTitle = isNew ? '' : appCourse?.title ?? MOCK_COURSE.title;
  const initialHashtags = isNew
    ? []
    : normalizeHashtags(appCourse?.hashtags ?? MOCK_COURSE.hashtags);
  const initialPlaces = isNew
    ? []
    : appCourse && syncedPlaces.length > 0
      ? syncedPlaces
      : MOCK_COURSE.places.map((p) => ({ ...p }));

  const goBack = () => {
    if (isNew) {
      navigate('/feed', { replace: true });
      return;
    }

    if (!id) {
      navigate('/explore', { replace: true });
      return;
    }

    navigate(`/course/${id}?from=${editorFrom}`, { replace: true });
  };

  const [title, setTitle] = useState(initialTitle);
  const [hashtags, setHashtags] = useState<string[]>(initialHashtags);
  const [places, setPlaces] = useState<CoursePlace[]>(initialPlaces);
  const [showPicker, setShowPicker] = useState(false);
  // 장소 행: 터치 → 하이라이트, 밀기 → 식당 상세(후기 모아보기) 슬라이드
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [detailPlaceId, setDetailPlaceId] = useState<string | null>(null);

  const handleSave = () => {
    if (!isNew) {
      if (id) saveCourse(id);
      navigate('/saved');
      return;
    }

    // 완전 새 코스 만들기 — 최소 제목 1개 + 장소 1곳 이상 필요
    if (!title.trim()) {
      toast.error('코스 제목을 입력해주세요');
      return;
    }
    if (places.length === 0) {
      toast.error('장소를 1곳 이상 추가해주세요');
      return;
    }

    const linkedRestaurants = places.map((p) => getRestaurantById(p.id)).filter((r): r is Restaurant => !!r);
    const tagPool = Array.from(new Set(linkedRestaurants.flatMap((r) => r.tags)));
    const newId = `course_${Date.now()}`;
    const newCourse: Course = {
      id: newId,
      title: title.trim(),
      description: '',
      heroImage: places[0]!.imageUrl ?? '',
      tags: (tagPool.length > 0 ? tagPool : ['맛집']).slice(0, 2) as Course['tags'],
      hashtags,
      region: linkedRestaurants[0]?.address.split(' ').slice(0, 2).join(' ') ?? '',
      metadata: {
        distance: Math.round(linkedRestaurants.length * 0.5 * 10) / 10,
        duration: places.length * 60,
        placeCount: places.length,
      },
      stops: places.map((p, i) => ({
        placeId: p.id,
        order: i + 1,
        startTime: '',
        endTime: '',
        isBookmarked: false,
      })),
      createdAt: new Date().toISOString().slice(0, 10),
      isPublic: true,
      creatorId: profile.id,
      savedCount: 0,
    };

    addCourse(newCourse);
    toast.success('코스를 만들었어요! 🎉');
    navigate(`/course/${newId}?from=explore`, { replace: true });
  };

  const addPlace = (r: Restaurant) => {
    if (places.length >= MAX_PLACES) {
      toast.info(`장소는 최대 ${MAX_PLACES}개까지 추가할 수 있어요`);
      return;
    }
    if (places.some((p) => p.id === r.id)) return;
    setPlaces((prev) => withRecalculatedCoords([...prev, restaurantToPlace(r)], getRestaurantById));
    setShowPicker(false);
  };

  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAddingTag) tagInputRef.current?.focus();
  }, [isAddingTag]);

  useEffect(() => {
    setTitle(initialTitle);
    setHashtags(initialHashtags);
    setPlaces(initialPlaces);
  }, [id, initialTitle, appCourse, syncedPlaces]);

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
    setPlaces((prev) => withRecalculatedCoords(prev.filter((p) => p.id !== placeId), getRestaurantById));
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
        <span className="flex-1 text-center font-semibold">{isNew ? '새 코스 만들기' : '코스 편집'}</span>
        <button
          onClick={handleSave}
          className="bg-[#E85053] text-white text-sm px-4 py-1.5 rounded-lg"
        >
          {isNew ? '만들기' : '저장'}
        </button>
      </div>

      {/* Form — 스킨이 있는 코스는 에디터에서도 그 느낌을 유지 */}
      <SkinFrame skin={skin} className={skin ? 'mx-3 mt-3' : undefined} radius={22}>
      <div className="px-4 pt-4 pb-4 space-y-5" style={skin ? { background: skin.paper } : undefined}>

        {/* Title */}
        <div>
          <p className="text-xs text-gray-400 mb-1">코스 제목</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isNew ? '예: 성수동 감성 데이트 코스' : undefined}
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
                className="border border-[#E85053] rounded-full px-3 py-1 text-sm outline-none w-24"
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
            <button onClick={() => setShowPicker(true)} className="text-xs text-[#E85053]">+ 근처 식당 추가</button>
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
              장소 · {places.length}개 (최대 {MAX_PLACES})
            </span>
            <span className="text-xs text-gray-400">터치 → 상세 · 드래그 → 순서변경</span>
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
                  hasDetail={!!getRestaurantById(place.id)}
                  selected={selectedPlaceId === place.id}
                  onSelect={(pid) => setSelectedPlaceId((prev) => (prev === pid ? null : pid))}
                  onOpenDetail={(pid) => setDetailPlaceId(pid)}
                />
              ))}
            </SortableContext>
          </DndContext>

          {places.length < MAX_PLACES && (
            <button
              onClick={() => setShowPicker(true)}
              className="border-2 border-dashed border-gray-200 rounded-xl py-3 w-full text-sm text-gray-400 flex items-center justify-center gap-1 active:scale-[0.99] transition-transform"
            >
              <MapPin size={14} />
              식당 추가
            </button>
          )}
        </div>
      </div>
      </SkinFrame>

      <AnimatePresence>
        {showPicker && (
          <RestaurantPickerSheet
            addedIds={places.map((p) => p.id)}
            onPick={addPlace}
            onClose={() => setShowPicker(false)}
          />
        )}
      </AnimatePresence>

      {/* 식당 상세 슬라이드 — 뒤로가면 에디터로 복귀 */}
      <AnimatePresence>
        {detailPlaceId && (
          <RestaurantDetailSheet
            restaurantId={detailPlaceId}
            onClose={() => setDetailPlaceId(null)}
          />
        )}
      </AnimatePresence>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 px-4 py-3 flex gap-3">
        <button
          onClick={goBack}
          className="flex-1 border border-gray-200 rounded-xl h-11 text-sm"
        >
          취소
        </button>
        {isNew ? (
          <button
            onClick={handleSave}
            className="flex-1 bg-[#E85053] text-white rounded-xl h-11 text-sm font-medium"
          >
            코스 만들기
          </button>
        ) : (
          <button
            onClick={() => navigate(`/course/${id}/share?from=edit&editorFrom=${editorFrom}`)}
            className="flex-1 bg-[#E85053] text-white rounded-xl h-11 text-sm font-medium"
          >
            코스 공유
          </button>
        )}
      </div>
    </motion.div>
  );
}
