import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useLocation, useSearch } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, ThumbsUp, ChevronRight, Star, X, GripVertical, Clock, MapPin, Plus, Search, Share2, Trash2 } from 'lucide-react';
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
import { MAX_COURSE_STOPS, type CourseStop, type Restaurant, useApp } from '@/contexts/AppContext';
import { CoursePlace } from '@/types/course';
import { getCourseSequenceColor } from '@/constants/courseTheme';
import { getCourseMapPoints, getCoursePlacesFromFeedStops, getCoursePlacesFromStops } from '@/lib/courseMapSync';
import { isAuthenticatedContentOwner, resolveFeedAuthorId } from '@/lib/profileFeed';
import { AuthorAvatar } from '@/components/ui/AuthorAvatar';
import RestaurantDetailSheet from '@/components/munchie/RestaurantDetailSheet';
import { usePlacesSearch } from '@/hooks/usePlacesSearch';
import { getPlaceDetails } from '@/services/placesApi';
import { mapGoogleRestaurant } from '@/lib/googlePlaces';
import { toast } from 'sonner';
import CourseSequenceMarker from '@/components/course/CourseSequenceMarker';
import { acquireDocumentScrollLock } from '@/lib/documentScrollLock';
import { FollowButton } from '@/components/follow/FollowButton';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import { getLunchmateLevelIcon } from '@/constants/lunchmateLevelIcons';
import { getLunchmateProgressSnapshot } from '@/utils/lunchmateProgress';
import { lunchmateTotalXpFromProfile } from '@/utils/lunchmateProfile';
import { logCourseOpen } from '@/lib/eventLogger';
import BackButton from '@/components/ui/BackButton';

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

export function resolveCourseDetailBackPath(
  from: FromMode,
  templateFrom: string | null,
  postId?: string | null,
  savedView?: string | null,
): string {
  if (from === 'saved' && postId) {
    const savedViewQuery = savedView === 'map' ? '&savedView=map' : '';
    return `/feed/${encodeURIComponent(postId)}?from=saved${savedViewQuery}`;
  }
  if (from !== 'template-detail') return BACK_PATH[from];
  if (templateFrom === 'profile') return BACK_PATH.profile;
  if (templateFrom === 'saved') return BACK_PATH.saved;
  return '/feed';
}

export function shouldShowSavedCopyEdit(from: FromMode): boolean {
  return from === 'saved';
}

function restaurantToCoursePlace(restaurant: Restaurant): CoursePlace {
  return {
    id: restaurant.id,
    name: restaurant.name,
    rating: restaurant.rating,
    distance: restaurant.distance,
    category: restaurant.category,
    priceLevel: restaurant.priceRange,
    imageUrl: restaurant.image,
    coords: { x: 50, y: 50 },
    latitude: restaurant.lat,
    longitude: restaurant.lng,
    address: restaurant.address,
  };
}

export function syncCoursePlaceCoordinates(places: CoursePlace[]) {
  if (!places.every(place => typeof place.latitude === 'number' && typeof place.longitude === 'number')) {
    return places;
  }
  const points = getCourseMapPoints(places.map(place => ({
    lat: place.latitude!,
    lng: place.longitude!,
  })));
  return places.map((place, index) => ({ ...place, coords: points[index] ?? place.coords }));
}

export function buildCourseStopsFromPlaces(
  places: CoursePlace[],
  existingStops: CourseStop[] = [],
): CourseStop[] {
  return places.map((place, index) => {
    const existingStop = existingStops.find(stop => stop.placeId === place.id);
    return {
      placeId: place.id,
      order: index + 1,
      startTime: existingStop?.startTime ?? '',
      endTime: existingStop?.endTime ?? '',
      isBookmarked: existingStop?.isBookmarked ?? false,
    };
  });
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
  onReplace,
  replacementActive = false,
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
  onReplace?: () => void;
  replacementActive?: boolean;
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
        <button
          type="button"
          disabled={!isEditing}
          onClick={onReplace}
          className={`flex shrink-0 items-center justify-center ${isEditing ? 'cursor-pointer active:scale-90' : ''}`}
          aria-label={isEditing ? `${index + 1}번 장소 검색 및 변경` : `${index + 1}번째 장소`}
        >
          <CourseSequenceMarker index={index} selected={replacementActive} />
        </button>
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
        style={selected || replacementActive
          ? { borderColor: color.base, background: color.faint, touchAction: 'pan-y' }
          : { borderColor: '#EADBD2', background: '#FFFDFC', touchAction: 'pan-y' }}
      >
        <AnimatePresence>
          {isEditing && (
            <motion.button
              type="button"
              aria-label={`${place.name} 순서 변경`}
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
              type="button"
              aria-label={`${place.name} 장소 삭제`}
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
  // 저장/프로필은 진입 출처일 뿐 소유권 근거가 아니다.
  const fromSaved = from === 'saved' || from === 'profile';
  const isSavedOrigin = shouldShowSavedCopyEdit(from);
  const {
    getCourseById: getAppCourseById,
    getRestaurantById,
    feedPosts,
    likedFeedIds,
    toggleFeedLike,
    incrementFeedShare,
    savedCourseIds,
    saveCourse,
    unsaveCourse,
    restaurants,
    registerRestaurants,
    updateCourse,
    addCourse,
    deleteCourseWithFeed,
    profile,
    isMyPost,
    isLoading,
  } = useApp();
  const auth = useAuthStatus();
  const authenticatedUserId = auth.data && !auth.data.isAnonymous ? auth.data.uid : null;
  const templateFrom = new URLSearchParams(search).get('templateFrom');
  const requestedPostId = new URLSearchParams(search).get('post');
  const savedView = new URLSearchParams(search).get('savedView');
  const isProfileTemplateCourse = from === 'template-detail' && templateFrom === 'profile';
  const backPath = resolveCourseDetailBackPath(from, templateFrom, requestedPostId, savedView);

  const appCourse = id ? getAppCourseById(id) : undefined;
  const orphanPost = id
    ? feedPosts.find(post => post.id === requestedPostId && post.courseId === id)
      ?? feedPosts.find(post => post.courseId === id)
    : undefined;
  const syncedPlaces = useMemo(
    () => (appCourse ? getCoursePlacesFromStops(appCourse, getRestaurantById) : []),
    [appCourse, getRestaurantById],
  );
  const feedGeoPlaces = useMemo(
    () => (orphanPost?.stops?.length
      ? getCoursePlacesFromFeedStops(orphanPost.stops, appCourse, getRestaurantById)
      : []),
    [orphanPost, appCourse, getRestaurantById],
  );
  const resolvedPlaces = syncedPlaces.length > 0 ? syncedPlaces : feedGeoPlaces;
  const legacyPhotoPlaces: CoursePlace[] = useMemo(
    () => (orphanPost?.photos ?? []).slice(0, 3).map((photo, index) => ({
      id: `legacy-${orphanPost!.id}-${index}`,
      name: `코스 스팟 ${index + 1}`,
      rating: 0,
      distance: '기록 사진',
      category: orphanPost?.tags[index] ?? 'Munchie',
      priceLevel: 1,
      imageUrl: photo,
      coords: [{ x: 20, y: 28 }, { x: 70, y: 50 }, { x: 32, y: 76 }][index]!,
    })),
    [orphanPost],
  );
  const initialPlaces = resolvedPlaces.length > 0
    ? resolvedPlaces
    : legacyPhotoPlaces.length > 0
      ? legacyPhotoPlaces
      : [];
  const durationHours = appCourse
    ? appCourse.metadata.duration / 60
    : 0;
  const durationLabel = `${Number.isInteger(durationHours) ? durationHours : durationHours.toFixed(1)}시간`;
  const authorHandle = (orphanPost?.authorName || 'app_user').replace(/^@/, '');
  const authorMeta = orphanPost ? 'Munchie creator' : '0 Followers';
  const authorId = orphanPost
    ? resolveFeedAuthorId(orphanPost)
    : appCourse?.creatorId ?? '';
  const isOwnCourseAuthor = orphanPost
    ? isMyPost(orphanPost)
    : isAuthenticatedContentOwner(authorId, authenticatedUserId);
  const ownAuthorProgress = getLunchmateProgressSnapshot(lunchmateTotalXpFromProfile(profile));
  const authorLevel = isOwnCourseAuthor
    ? ownAuthorProgress.level
    : orphanPost?.authorLevel ?? 1;
  const authorLevelName = isOwnCourseAuthor
    ? ownAuthorProgress.levelName
    : orphanPost?.authorLevelName ?? '한입 새싹';
  const authorLevelIcon = getLunchmateLevelIcon(authorLevel);
  const AuthorLevelIcon = authorLevelIcon.Icon;
  const authorAvatarImage = isOwnCourseAuthor ? profile.avatarPhoto : orphanPost?.authorImage;
  const authorAvatarEmoji = isOwnCourseAuthor ? profile.emoji : orphanPost?.authorEmoji ?? '🍽️';
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapWidth, setMapWidth] = useState(362);
  const isCoursePostLiked = orphanPost ? likedFeedIds.includes(orphanPost.id) : false;
  const isCourseSaved = id ? savedCourseIds.includes(id) : false;

  useEffect(() => {
    if (id) logCourseOpen(id);
  }, [id]);

  // Local editable state (only used in saved mode)
  const [places, setPlaces] = useState<CoursePlace[]>(initialPlaces);
  const [isEditing, setIsEditing] = useState(false);
  // 코스 순서: 터치 → 하이라이트, 밀기 → 식당 상세 슬라이드
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [detailPlaceId, setDetailPlaceId] = useState<string | null>(null);
  const [editingPlaceIndex, setEditingPlaceIndex] = useState<number | 'new' | null>(null);
  const [detailsLoadingId, setDetailsLoadingId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const mapGeoPlaces = places.filter(
    (place) => typeof place.latitude === 'number' && typeof place.longitude === 'number',
  );
  const mapReady = mapGeoPlaces.length > 0;
  const mapLoading = !mapReady && (isLoading || Boolean(appCourse && resolvedPlaces.length === 0));
  const searchBias = places[0]?.latitude != null && places[0]?.longitude != null
    ? { lat: places[0].latitude, lng: places[0].longitude }
    : undefined;
  const {
    input: placeSearchInput,
    setInput: setPlaceSearchInput,
    sessionToken: placeSearchSessionToken,
    suggestions: placeSuggestions,
    isLoading: placeSearchLoading,
    isError: placeSearchError,
    endSession: endPlaceSearchSession,
    reset: resetPlaceSearch,
  } = usePlacesSearch(searchBias);
  const localPlaceResults = placeSearchInput.trim().length >= 1
    ? restaurants.filter(restaurant => (
      restaurant.name.toLowerCase().includes(placeSearchInput.trim().toLowerCase())
      || restaurant.address.toLowerCase().includes(placeSearchInput.trim().toLowerCase())
    )).slice(0, 5)
    : [];

  const handleCourseShare = async () => {
    if (!id) return;
    const shareUrl = `${window.location.origin}/course/${encodeURIComponent(id)}`;
    const shareTitle = appCourse?.title || orphanPost?.caption || 'Lunchie Munchie 코스맵';
    const recordShare = () => {
      if (orphanPost) incrementFeedShare(orphanPost.id);
    };
    const copyShareLink = async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        recordShare();
        toast.success('코스 링크를 복사했어요.');
      } catch {
        toast.error('코스 링크를 공유하지 못했어요.');
      }
    };

    if (!navigator.share) {
      await copyShareLink();
      return;
    }

    try {
      await navigator.share({
        title: `Lunchie Munchie — ${shareTitle}`,
        text: `${shareTitle} 코스를 함께 둘러보세요.`,
        url: shareUrl,
      });
      recordShare();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      await copyShareLink();
    }
  };

  const toggleCourseSaved = () => {
    if (!id) return;
    if (isCourseSaved) {
      unsaveCourse(id);
      toast.success('저장을 해제했어요.');
    } else {
      saveCourse(id);
      toast.success('코스를 저장했어요.');
    }
  };

  useEffect(() => {
    if (isEditing) return;
    setPlaces(resolvedPlaces.length > 0 ? resolvedPlaces : legacyPhotoPlaces);
  }, [id, isEditing, resolvedPlaces, legacyPhotoPlaces]);

  useLayoutEffect(() => {
    const node = mapContainerRef.current;
    if (!node) return;
    const updateWidth = () => setMapWidth(Math.max(1, Math.floor(node.clientWidth)));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!deleteConfirmOpen) return;
    return acquireDocumentScrollLock({ inertSelector: '.app-shell' });
  }, [deleteConfirmOpen]);

  const closePlaceSearch = () => {
    setEditingPlaceIndex(null);
    resetPlaceSearch();
  };

  const selectCourseRestaurant = (restaurant: Restaurant) => {
    if (editingPlaceIndex === null) return;
    const replacingIndex = editingPlaceIndex === 'new' ? -1 : editingPlaceIndex;
    if (places.some((place, index) => index !== replacingIndex && place.id === restaurant.id)) {
      toast.info('이미 코스에 담긴 장소예요.');
      return;
    }

    const nextPlace = restaurantToCoursePlace(restaurant);
    setPlaces(current => syncCoursePlaceCoordinates(
      editingPlaceIndex === 'new'
        ? [...current, nextPlace].slice(0, MAX_COURSE_STOPS)
        : current.map((place, index) => index === editingPlaceIndex ? nextPlace : place),
    ));
    closePlaceSearch();
  };

  const selectGooglePlace = async (placeId: string) => {
    if (detailsLoadingId) return;
    setDetailsLoadingId(placeId);
    try {
      const row = await getPlaceDetails(placeId, placeSearchSessionToken);
      const restaurant = mapGoogleRestaurant(row);
      registerRestaurants([restaurant]);
      selectCourseRestaurant(restaurant);
      endPlaceSearchSession();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '장소 정보를 가져오지 못했어요.');
    } finally {
      setDetailsLoadingId(null);
    }
  };

  const removeCoursePlace = (placeId: string) => {
    if (places.length <= 1) {
      toast.info('코스에는 장소가 최소 1곳 필요해요.');
      return;
    }
    setPlaces(current => syncCoursePlaceCoordinates(current.filter(place => place.id !== placeId)));
    setEditingPlaceIndex(null);
  };

  const saveCourseEdits = () => {
    if (!id || places.length === 0) return;
    const stops = buildCourseStopsFromPlaces(places, appCourse?.stops);

    if (appCourse) {
      updateCourse(appCourse.id, {
        stops,
        metadata: { ...appCourse.metadata, placeCount: stops.length },
      });
    } else {
      addCourse({
        id,
        title: orphanPost?.caption || 'Munchie 코스',
        description: orphanPost?.caption ?? '',
        heroImage: places[0]?.imageUrl ?? orphanPost?.photos[0] ?? '',
        tags: orphanPost?.tags ?? [],
        hashtags: [],
        region: '',
        metadata: {
          distance: 0,
          duration: 0,
          placeCount: stops.length,
        },
        stops,
        createdAt: new Date().toISOString().slice(0, 10),
        isPublic: true,
        creatorId: orphanPost?.authorId ?? profile.id,
        savedCount: 0,
      });
    }

    closePlaceSearch();
    setIsEditing(false);
    toast.success('코스 순서와 장소를 저장했어요.');
  };

  const toggleEditMode = () => {
    if (isEditing) {
      saveCourseEdits();
      return;
    }
    setIsEditing(true);
  };

  const confirmCourseDelete = async () => {
    if (!id) return;
    const response = await fetch(`/api/feed-post?courseId=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      toast.error(payload.error || '게시물을 삭제하지 못했어요.');
      return;
    }
    setDeleteConfirmOpen(false);
    deleteCourseWithFeed(id);
    toast.success('코스맵과 먼치 피드를 삭제했어요.');
    navigate(backPath);
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
        return syncCoursePlaceCoordinates(arrayMove(prev, oldIdx, newIdx));
      });
      setEditingPlaceIndex(null);
    }
  };

  const hasBottomAction = isProfileTemplateCourse || isSavedOrigin || (fromSaved && isEditing) || !fromSaved;

  const placeSearchPanel = editingPlaceIndex !== null ? (
    <motion.div
      data-ui="course-place-search"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="relative mb-3 ml-10 mt-3 rounded-2xl border border-[#E85053] bg-white p-3 shadow-[0_8px_20px_rgba(60,35,22,0.1)]">
        <span className="absolute -top-2 left-6 h-4 w-4 rotate-45 border-l border-t border-[#E85053] bg-white" />
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[12px] font-black text-[#49362E]">
            {editingPlaceIndex === 'new' ? '새 장소 추가' : `${editingPlaceIndex + 1}번 장소 변경`}
          </p>
          <button type="button" onClick={closePlaceSearch} aria-label="장소 검색 닫기" className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F7EFEA] text-[#8B7469]">
            <X size={14} />
          </button>
        </div>
        <div className="flex h-10 items-center gap-2 rounded-xl bg-[#F7F2EE] px-3">
          <Search size={15} className="shrink-0 text-[#A28E84]" />
          <input
            autoFocus
            value={placeSearchInput}
            onChange={event => setPlaceSearchInput(event.target.value)}
            placeholder="지도검색 — 장소 이름 또는 주소"
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#B7A69D]"
          />
        </div>

        <div className="mt-2 max-h-[220px] space-y-1 overflow-y-auto overscroll-contain">
          {localPlaceResults.map(restaurant => (
            <button
              key={`local-${restaurant.id}`}
              type="button"
              onClick={() => selectCourseRestaurant(restaurant)}
              className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left active:bg-[#FFF6F2]"
            >
              {restaurant.image ? <img src={restaurant.image} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" /> : <span className="h-9 w-9 shrink-0 rounded-lg bg-[#F2EEEB]" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-bold text-[#3F3029]">{restaurant.name}</span>
                <span className="block truncate text-[10px] text-[#9A8980]">{restaurant.address}</span>
              </span>
              <Plus size={14} className="shrink-0 text-[#E85053]" />
            </button>
          ))}

          {placeSuggestions.map(suggestion => (
            <button
              key={`google-${suggestion.placeId}`}
              type="button"
              onClick={() => selectGooglePlace(suggestion.placeId)}
              disabled={detailsLoadingId !== null}
              className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left active:bg-[#FFF6F2] disabled:opacity-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFF0EC] text-[#E85053]"><MapPin size={15} /></span>
              <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-[#3F3029]">{suggestion.text}</span>
              <Plus size={14} className="shrink-0 text-[#E85053]" />
            </button>
          ))}

          {placeSearchLoading && <p className="py-3 text-center text-[11px] text-[#9A8980]">장소 검색 중…</p>}
          {placeSearchError && <p className="py-3 text-center text-[11px] text-[#D45A5E]">온라인 장소 검색을 불러오지 못했어요.</p>}
          {placeSearchInput.trim().length > 0 && !placeSearchLoading && localPlaceResults.length === 0 && placeSuggestions.length === 0 && !placeSearchError && (
            <p className="py-3 text-center text-[11px] text-[#9A8980]">일치하는 장소가 없어요.</p>
          )}
        </div>
      </div>
    </motion.div>
  ) : null;

  return (
    <motion.div
      className={`${hasBottomAction ? 'page-with-bottom-action' : ''} mx-auto min-h-screen max-w-[430px] bg-[#FFF8F3]`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Back button */}
      <div className="flex items-center justify-between px-5 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
        <BackButton onClick={() => navigate(backPath)} aria-label="이전 화면으로 돌아가기" />
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
        {authorId ? (
          <button
            type="button"
            onClick={() => navigate(`/profile/${authorId}`)}
            aria-label={`${authorHandle} 프로필 보기`}
            className="flex items-center gap-2 rounded-xl text-left outline-none transition-transform active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#ED7773] focus-visible:ring-offset-2"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F3EDE8] text-lg">
              <AuthorAvatar
                image={authorAvatarImage}
                emoji={authorAvatarEmoji}
                name={authorHandle}
                className="flex h-full w-full items-center justify-center"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm">@{authorHandle}</span>
              </div>
              <span className="text-xs text-gray-500">{authorMeta}</span>
              <span
                className="mt-0.5 flex w-fit items-center gap-1 rounded-full bg-[#FFF3EC] px-2 py-0.5 text-[9px] font-black"
                style={{ color: authorLevelIcon.color }}
                aria-label={`작성자 레벨 Lv.${authorLevel} ${authorLevelName}`}
              >
                <AuthorLevelIcon size={10} strokeWidth={2.5} aria-hidden="true" />
                Lv.{authorLevel} {authorLevelName}
              </span>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F3EDE8] text-lg">
              <AuthorAvatar
                image={authorAvatarImage}
                emoji={authorAvatarEmoji}
                name={authorHandle}
                className="flex h-full w-full items-center justify-center"
              />
            </div>
            <div>
              <span className="block font-medium text-sm">@{authorHandle}</span>
              <span className="text-xs text-gray-500">{authorMeta}</span>
              <span
                className="mt-0.5 flex w-fit items-center gap-1 rounded-full bg-[#FFF3EC] px-2 py-0.5 text-[9px] font-black"
                style={{ color: authorLevelIcon.color }}
                aria-label={`작성자 레벨 Lv.${authorLevel} ${authorLevelName}`}
              >
                <AuthorLevelIcon size={10} strokeWidth={2.5} aria-hidden="true" />
                Lv.{authorLevel} {authorLevelName}
              </span>
            </div>
          </div>
        )}

        {from === 'feed' || isSavedOrigin ? (
          <button
            type="button"
            onClick={handleCourseShare}
            aria-label="코스 공유하기"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#F0C8C8] bg-white text-[#D94E55] active:scale-[0.98]"
          >
            <Share2 size={17} />
          </button>
        ) : fromSaved && isOwnCourseAuthor ? (
          <button
            onClick={toggleEditMode}
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
        ) : !isOwnCourseAuthor && authorId ? (
          <FollowButton userId={authorId} />
        ) : null}
      </div>

      {/* Map area — 지도·경로·순번 마커만 표시한다. */}
      <div
        ref={mapContainerRef}
        data-ui="course-map-area"
        className="relative mx-4 mb-4 h-[270px] overflow-hidden rounded-[22px] border border-[#E9D8CF] bg-[#FBF7F1] shadow-[0_8px_22px_rgba(105,67,48,0.08)]"
      >
        {mapReady ? (
          <CourseMapView
            places={mapGeoPlaces}
            width={mapWidth}
            height={270}
            className="h-full w-full"
            selectedPlaceId={selectedPlaceId}
            onSelectPlace={setSelectedPlaceId}
          />
        ) : (
          <div
            className="flex h-full items-center justify-center bg-[#F3EDE8] text-[12px] text-[#9B9B9B]"
            aria-busy={mapLoading || undefined}
          >
            {mapLoading ? '지도 불러오는 중…' : '표시할 지도 좌표가 없어요.'}
          </div>
        )}
        <AnimatePresence>
          {selectedPlaceId && (
            <motion.div
              key={selectedPlaceId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute bottom-3 left-1/2 max-w-[calc(100%-1.5rem)] -translate-x-1/2 truncate rounded-full border border-white/80 bg-[#4A352D]/90 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg backdrop-blur"
              aria-live="polite"
            >
              {places.find((place) => place.id === selectedPlaceId)?.name} 선택됨
            </motion.div>
          )}
        </AnimatePresence>
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
        <span className="flex shrink-0 items-center gap-1" aria-label={`스팟 ${places.length}개`}>
          <MapPin size={14} className="text-[#E85053]" />
          {places.length}
        </span>
        <span className="flex shrink-0 items-center gap-1" aria-label={`좋아요 ${orphanPost?.likes ?? 0}개`}>
          <ThumbsUp size={13} className="text-[#E85053]" />
          {orphanPost?.likes ?? 0}
        </span>
      </div>

      {/* Place list */}
      <div className="px-4 pb-4 pt-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={places.map(p => p.id)} strategy={verticalListSortingStrategy}>
            <motion.div layout className="flex flex-col">
              {places.map((place, i) => (
                <div key={place.id} className="relative">
                  {i < places.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute bottom-0 left-[17px] top-9 border-l-2 border-dashed"
                      style={{ borderColor: getCourseSequenceColor(i).lighter }}
                    />
                  )}
                  <PlaceItem
                    place={place}
                    index={i}
                    isLast={i === places.length - 1}
                    isEditing={fromSaved && isEditing}
                    onRemove={removeCoursePlace}
                    onReplace={() => setEditingPlaceIndex(current => current === i ? null : i)}
                    replacementActive={isEditing && editingPlaceIndex === i}
                    hasDetail
                    selected={selectedPlaceId === place.id}
                    onSelect={pid => setSelectedPlaceId(prev => (prev === pid ? null : pid))}
                    onOpenDetail={pid => setDetailPlaceId(pid)}
                  />
                  <AnimatePresence>{isEditing && editingPlaceIndex === i ? placeSearchPanel : null}</AnimatePresence>
                </div>
              ))}
              {isEditing && places.length < MAX_COURSE_STOPS && (
                <div>
                  <button
                    type="button"
                    onClick={() => setEditingPlaceIndex(current => current === 'new' ? null : 'new')}
                    className="ml-11 mt-1 flex h-11 w-[calc(100%-2.75rem)] items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#E7B8AE] bg-[#FFF8F5] text-[12px] font-black text-[#D95A5D]"
                  >
                    <Plus size={15} /> 새 장소 추가
                  </button>
                  <AnimatePresence>{editingPlaceIndex === 'new' ? placeSearchPanel : null}</AnimatePresence>
                </div>
              )}
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
      {hasBottomAction && (
      <div className="page-bottom-action-bar page-bottom-bar">
        {isProfileTemplateCourse ? (
          <button
            onClick={() => navigate(`/course/${id}/edit?from=profile`)}
            className="page-bottom-action-primary"
          >
            편집
          </button>
        ) : fromSaved && isEditing ? (
          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(true)}
            className="h-[52px] flex-1 rounded-2xl bg-[#E85053] text-sm font-black text-white shadow-[0_8px_18px_rgba(232,80,83,0.25)] active:scale-[0.98]"
          >
            삭제
          </button>
        ) : isSavedOrigin ? (
          <>
            <button
              type="button"
              onClick={() => orphanPost && toggleFeedLike(orphanPost.id)}
              disabled={!orphanPost}
              aria-label={isCoursePostLiked ? '좋아요 취소' : '좋아요'}
              aria-pressed={isCoursePostLiked}
              className={`page-bottom-action-secondary transition-colors disabled:opacity-40 ${
                isCoursePostLiked ? 'bg-[#FFE2DF] text-[#D94E55]' : ''
              }`}
            >
              <ThumbsUp size={20} fill={isCoursePostLiked ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              onClick={() => navigate(`/coursemap/new?course=${id}`)}
              className="page-bottom-action-primary"
            >
              복사해서 편집
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => orphanPost && toggleFeedLike(orphanPost.id)}
              disabled={!orphanPost}
              aria-label={isCoursePostLiked ? '좋아요 취소' : '좋아요'}
              aria-pressed={isCoursePostLiked}
              className={`page-bottom-action-secondary transition-colors disabled:opacity-40 ${
                isCoursePostLiked ? 'bg-[#FFE2DF] text-[#D94E55]' : ''
              }`}
            >
              <ThumbsUp size={20} fill={isCoursePostLiked ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              onClick={toggleCourseSaved}
              aria-label={isCourseSaved ? '저장 해제' : '저장하기'}
              className="page-bottom-action-primary gap-2"
            >
              <Bookmark size={18} fill={isCourseSaved ? 'currentColor' : 'none'} />
              {isCourseSaved ? '저장됨' : '저장하기'}
            </button>
          </>
        )}
      </div>
      )}

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {deleteConfirmOpen && (
            <motion.div
              className="fixed inset-0 z-[140] flex items-center justify-center bg-[#2D1D18]/45 px-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              role="presentation"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              <motion.section
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-course-title"
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                onClick={event => event.stopPropagation()}
                className="relative w-full max-w-[330px] rounded-[24px] border border-[#F0D7CE] bg-[#FFFDFC] px-5 pb-5 pt-6 text-center shadow-[0_22px_60px_rgba(63,36,26,0.25)]"
              >
                <button
                  type="button"
                  onClick={() => setDeleteConfirmOpen(false)}
                  aria-label="코스맵 삭제 창 닫기"
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#F7ECE7] text-[#80675C]"
                >
                  <X size={16} />
                </button>
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF0F0] text-[#D94447]">
                  <Trash2 size={22} />
                </span>
                <h2 id="delete-course-title" className="mt-3 text-[17px] font-black text-[#30221C]">
                  게시물을 삭제하시겠습니까?
                </h2>
                <p className="mt-1.5 text-[11px] font-semibold leading-5 text-[#9A8277]">
                  코스맵과 먼치 피드 같이 삭제되며<br />다시 복구할 수 없습니다.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <button type="button" onClick={() => setDeleteConfirmOpen(false)} className="h-11 rounded-[14px] border border-[#DFD0C8] bg-white text-[13px] font-black text-[#69564D]">
                    취소
                  </button>
                  <button type="button" onClick={() => void confirmCourseDelete()} className="h-11 rounded-[14px] bg-[#E85053] text-[13px] font-black text-white">
                    확인
                  </button>
                </div>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </motion.div>
  );
}
