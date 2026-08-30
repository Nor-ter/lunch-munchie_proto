import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useLocation, useParams, useSearch } from 'wouter';
import {
  savedCourseRecordFromApi,
  useApp,
  type Course,
  type FeedPost,
  type Restaurant,
  type SavedCourseRecord,
} from '@/contexts/AppContext';
import OneLineReviewBox from '@/components/munchie/OneLineReviewBox';
import FeedStoryEditor from '@/components/munchie/FeedStoryEditor';
import BackButton from '@/components/ui/BackButton';
import { getTemplateById, getTemplateForCourse } from '@/constants/coursemapTemplates';
import {
  PhotoEditorModal,
  StoryPhotoStep,
  type PhotoAttribution,
} from '@/pages/course/CoursemapCreatePage';
import {
  MAX_MUNCHIE_FEED_PHOTOS,
  toFeedPhotoPlacements,
  type PlacedPhoto,
} from '@/lib/coursemapDecor';
import {
  buildDefaultFeedStorySlides,
  MAX_FEED_STORY_SLIDES,
  normalizeFeedStorySlides,
  resolveFeedStorySlides,
  setFeedStorySlideRestaurant,
  type FeedStoryPhotoAttribution,
  type FeedStorySlide,
} from '@/lib/feedStory';
import { fetchFeedDetailById } from '@/services/savedCoursesApi';

type FeedPostPatchResponse = {
  error?: string;
  feedPhotos?: string[];
  feedDecor?: Array<Record<string, unknown>>;
  storySlides?: FeedStorySlide[];
  photoAttributions?: FeedStoryPhotoAttribution[];
  templateId?: string | null;
};

const boundedNumber = (value: unknown, fallback: number, minimum: number, maximum: number) => {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(minimum, Math.min(maximum, number));
};

/** Canonical server photos are the only editable media source. */
export function storyPlacedPhotosFromPost(post: FeedPost): PlacedPhoto[] {
  const slideIdByPhoto = new Map((post.storySlides ?? []).map(slide => [slide.photo, slide.id]));
  const decorByPhoto = new Map((post.decor ?? []).flatMap(item => (
    item && typeof item.src === 'string' ? [[item.src, item] as const] : []
  )));
  return Array.from(new Set(post.photos)).slice(0, MAX_FEED_STORY_SLIDES).map((src, index) => {
    const decor = decorByPhoto.get(src);
    return {
      id: slideIdByPhoto.get(src) ?? decor?.id ?? `story-photo-${index}`,
      src,
      // Cropped replacements retain this path so server-side attribution can be inherited.
      originalSrc: src,
      x: boundedNumber(decor?.x, 50, 0, 100),
      y: boundedNumber(decor?.y, 50, 0, 100),
      w: boundedNumber(decor?.w, 100, 5, 100),
      h: boundedNumber(decor?.h, 100, 5, 100),
      zoom: 1,
      rotate: boundedNumber(decor?.rotate, 0, -180, 180),
    };
  });
}

function attributionRecord(attributions: FeedStoryPhotoAttribution[] | undefined) {
  return Object.fromEntries((attributions ?? []).map(attribution => [
    attribution.r2Path,
    {
      classification: attribution.classification,
      ...(attribution.restaurantId ? { restaurantId: attribution.restaurantId } : {}),
      source: attribution.source,
    } satisfies PhotoAttribution,
  ]));
}

function normalizePatchAttributions(value: unknown, photos: string[]): FeedStoryPhotoAttribution[] {
  if (!Array.isArray(value)) return [];
  const photoSet = new Set(photos);
  return value.flatMap(raw => {
    if (!raw || typeof raw !== 'object') return [];
    const item = raw as Record<string, unknown>;
    if (typeof item.r2Path !== 'string' || !photoSet.has(item.r2Path)) return [];
    const classification = item.classification === 'restaurant' ? 'restaurant' as const : 'other' as const;
    const restaurantId = classification === 'restaurant' && typeof item.restaurantId === 'string'
      ? item.restaurantId
      : undefined;
    if (classification === 'restaurant' && !restaurantId) return [];
    const source = classification === 'other'
      ? 'other' as const
      : item.source === 'gps_suggestion' || item.source === 'user_selected'
        ? item.source
        : 'other' as const;
    return [{ r2Path: item.r2Path, classification, ...(restaurantId ? { restaurantId } : {}), source }];
  });
}

function FeedEditComposer({
  post,
  course,
  restaurants,
  detailPath,
}: {
  post: FeedPost;
  course: Course;
  restaurants: Restaurant[];
  detailPath: string;
}) {
  const [, navigate] = useLocation();
  const { updateFeedPost, refreshFeedPosts } = useApp();
  const template = getTemplateById(post.templateId ?? post.skinId)
    ?? getTemplateForCourse(post.courseId, 0);
  const [placed, setPlaced] = useState<PlacedPhoto[]>(() => storyPlacedPhotosFromPost(post));
  const [photoAttributions, setPhotoAttributions] = useState<Record<string, PhotoAttribution>>(
    () => attributionRecord(post.photoAttributions),
  );
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [caption, setCaption] = useState(post.caption);
  const [isSaving, setIsSaving] = useState(false);
  const storyStops = useMemo(() => course.stops.map(stop => {
    const restaurant = restaurants.find(item => item.id === stop.placeId);
    const embedded = post.stops?.find(item => item.placeId === stop.placeId);
    return {
      id: stop.placeId,
      name: restaurant?.name ?? embedded?.name,
      category: restaurant?.category ?? embedded?.category,
      address: restaurant?.address ?? embedded?.address,
    };
  }), [course.stops, post.stops, restaurants]);
  const initialPhotoRestaurantIds = post.photos.map(photo => {
    const attribution = post.photoAttributions?.find(item => item.r2Path === photo);
    return attribution?.classification === 'restaurant' ? attribution.restaurantId : undefined;
  });
  const [storySlides, setStorySlides] = useState<FeedStorySlide[]>(() => resolveFeedStorySlides(
    post.storySlides,
    post.photos,
    {
      title: course.title,
      caption: post.caption,
      stops: storyStops,
      photoRestaurantIds: initialPhotoRestaurantIds,
    },
  ));
  const storyStopKey = storyStops.map(stop => `${stop.id}:${stop.name}:${stop.category}:${stop.address}`).join('|');
  const storyAttributionKey = placed.map(photo => {
    const attribution = photoAttributions[photo.originalSrc ?? photo.src];
    return `${photo.id}:${attribution?.classification ?? 'other'}:${attribution?.restaurantId ?? ''}`;
  }).join('|');

  useEffect(() => {
    const seen = new Set<string>();
    const storyPhotos = placed.filter(photo => {
      if (seen.has(photo.src)) return false;
      seen.add(photo.src);
      return true;
    }).slice(0, MAX_FEED_STORY_SLIDES);
    const defaults = buildDefaultFeedStorySlides(
      storyPhotos.map(photo => photo.src),
      {
        title: course.title,
        caption,
        stops: storyStops,
        photoRestaurantIds: storyPhotos.map(photo => {
          const attribution = photoAttributions[photo.originalSrc ?? photo.src];
          return attribution?.classification === 'restaurant' ? attribution.restaurantId : undefined;
        }),
      },
    );
    setStorySlides(current => {
      const next = storyPhotos.map((photo, index) => {
        const existing = current.find(slide => slide.id === photo.id)
          ?? current.find(slide => slide.photo === photo.src || slide.photo === photo.originalSrc);
        return existing
          ? { ...existing, id: photo.id, photo: photo.src }
          : { ...defaults[index]!, id: photo.id };
      });
      return JSON.stringify(next) === JSON.stringify(current) ? current : next;
    });
  }, [caption, course.title, placed, storyAttributionKey, storyStopKey]);

  const updatePhotoAttribution = (url: string, attribution: PhotoAttribution) => {
    setPhotoAttributions(previous => ({ ...previous, [url]: attribution }));
    const photo = placed.find(item => (item.originalSrc ?? item.src) === url);
    if (!photo) return;
    const restaurant = attribution.classification === 'restaurant'
      ? restaurants.find(item => item.id === attribution.restaurantId)
      : undefined;
    setStorySlides(current => current.map(slide => {
      if (slide.id !== photo.id && slide.photo !== photo.src && slide.photo !== photo.originalSrc) return slide;
      return setFeedStorySlideRestaurant(slide, restaurant);
    }));
  };

  const save = async () => {
    if (isSaving || !caption.trim() || placed.length === 0) return;
    setIsSaving(true);
    try {
      const persistPhoto = async (src: string) => {
        if (!src.startsWith('data:image/')) return src;
        const upload = await fetch('/api/uploads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: src }),
        });
        const payload = await upload.json() as { url?: string; error?: string };
        if (!upload.ok || !payload.url) throw new Error(payload.error ?? '사진을 업로드하지 못했어요.');
        return payload.url;
      };
      const serverPlaced = await Promise.all(placed.slice(0, MAX_MUNCHIE_FEED_PHOTOS).map(async photo => ({
        ...photo,
        src: await persistPhoto(photo.src),
      })));
      const serverPhotos = Array.from(new Set(serverPlaced.map(photo => photo.src)));
      const serverPhotoBySlideId = new Map(serverPlaced.map(photo => [photo.id, photo.src]));
      const serverStorySlides = normalizeFeedStorySlides(storySlides.map(slide => ({
        ...slide,
        photo: serverPhotoBySlideId.get(slide.id) ?? slide.photo,
      })), { allowedPhotos: serverPhotos });
      const serverAttributions = serverPlaced.map(photo => {
        const attribution = photoAttributions[photo.originalSrc ?? photo.src]
          ?? photoAttributions[photo.src]
          ?? { classification: 'other' as const, source: 'other' as const };
        return {
          r2Path: photo.src,
          classification: attribution.classification,
          ...(attribution.classification === 'restaurant' && attribution.restaurantId
            ? { restaurantId: attribution.restaurantId }
            : {}),
          source: attribution.source,
        };
      });
      const response = await fetch('/api/feed-post', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          caption: caption.trim(),
          heroImage: serverPhotos[0],
          feedPhotos: serverPhotos,
          feedDecor: serverPlaced,
          templateId: template.id,
          storySlides: serverStorySlides,
          photoAttributions: serverAttributions,
        }),
      });
      const payload = await response.json().catch(() => ({})) as FeedPostPatchResponse;
      if (!response.ok) throw new Error(payload.error ?? '서버에서 수정 권한을 확인하지 못했어요.');

      const canonicalPhotos = Array.isArray(payload.feedPhotos) ? payload.feedPhotos : serverPhotos;
      const canonicalSlides = normalizeFeedStorySlides(payload.storySlides ?? serverStorySlides, { allowedPhotos: canonicalPhotos });
      const canonicalAttributions = normalizePatchAttributions(payload.photoAttributions ?? serverAttributions, canonicalPhotos);
      const canonicalDecor = Array.isArray(payload.feedDecor)
        ? payload.feedDecor.flatMap((item, index) => {
            if (typeof item.src !== 'string' || !canonicalPhotos.includes(item.src)) return [];
            return [{
              id: typeof item.id === 'string' ? item.id : `story-photo-${index}`,
              src: item.src,
              x: boundedNumber(item.x, 50, 0, 100),
              y: boundedNumber(item.y, 50, 0, 100),
              w: boundedNumber(item.w, 100, 5, 100),
              h: boundedNumber(item.h, 100, 5, 100),
              rotate: boundedNumber(item.rotate, 0, -180, 180),
            }];
          })
        : serverPlaced;
      const canonicalPost: FeedPost = {
        ...post,
        photos: canonicalPhotos,
        storySlides: canonicalSlides,
        photoAttributions: canonicalAttributions,
        decor: canonicalDecor,
      };
      const canonicalPlaced = storyPlacedPhotosFromPost(canonicalPost);
      setPlaced(canonicalPlaced);
      setStorySlides(canonicalSlides);
      setPhotoAttributions(attributionRecord(canonicalAttributions));
      updateFeedPost(post.id, {
        photos: canonicalPhotos,
        storySlides: canonicalSlides,
        photoAttributions: canonicalAttributions,
        decor: canonicalDecor,
        photoPlacements: toFeedPhotoPlacements(canonicalPlaced),
        caption: caption.trim(),
        skinId: payload.templateId ?? template.id,
        templateId: payload.templateId ?? template.id,
      });
      await refreshFeedPosts();
      toast.success('Munchie 피드를 수정했어요.');
      navigate(detailPath, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '피드를 수정하지 못했어요.');
    } finally {
      setIsSaving(false);
    }
  };

  const editingPhoto = editingPhotoId
    ? placed.find(photo => photo.id === editingPhotoId)
    : undefined;

  return (
    <main className="min-h-dvh bg-[#FCF4EE] pb-28">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-[#FCF4EE]/95 px-5 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur">
        <BackButton onClick={() => navigate(detailPath)} aria-label="뒤로" />
        <p className="text-[16px] font-black">Munchie 피드 수정</p>
        <span className="w-9" />
      </header>

      <section className="space-y-5 px-4 pt-4">
        <div className="rounded-2xl border border-[#E9DAD0] bg-white px-4 py-3">
          <p className="text-[11px] font-bold text-[#9A8579]">연결된 코스</p>
          <p className="mt-1 truncate text-[14px] font-black text-[#2D211C]">{course.title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#9A8579]">각 사진을 4:5 슬라이드로 편집하고, 사진마다 코스맵·음식·식당·가격·한줄평 오버레이를 따로 배치할 수 있어요.</p>
        </div>
        <StoryPhotoStep
          placed={placed}
          setPlaced={setPlaced}
          restaurants={restaurants}
          photoAttributions={photoAttributions}
          onAddUpload={(url, attribution) => {
            setPhotoAttributions(previous => ({ ...previous, [url]: attribution }));
          }}
          onRemoveFromPool={url => {
            setPhotoAttributions(previous => {
              const next = { ...previous };
              delete next[url];
              return next;
            });
          }}
          onUpdateAttribution={updatePhotoAttribution}
          onEditPhoto={setEditingPhotoId}
        />
        {storySlides.length > 0 && (
          <FeedStoryEditor
            slides={storySlides}
            onChange={setStorySlides}
            stops={storyStops}
            restaurants={restaurants.map(restaurant => ({ id: restaurant.id, name: restaurant.name }))}
          />
        )}
        <OneLineReviewBox compact>
          <textarea
            value={caption}
            onChange={event => setCaption(event.target.value)}
            rows={2}
            placeholder="피드 전체 한줄평을 입력하세요"
            className="w-full resize-none bg-transparent text-[13px] font-semibold text-[#3B2A23] outline-none placeholder:text-[#C9ADA3]"
          />
        </OneLineReviewBox>
      </section>

      <div className="page-bottom-bar fixed bottom-4 left-1/2 z-30 w-[calc(100%-32px)] max-w-[398px] -translate-x-1/2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={isSaving || !caption.trim() || placed.length === 0}
          className="h-[52px] w-full rounded-2xl bg-[#EB5053] font-bold text-white shadow-lg disabled:bg-[#E5CFC5]"
        >
          {isSaving ? '저장 중…' : '수정 완료'}
        </button>
      </div>

      <AnimatePresence>
        {editingPhoto && (
          <PhotoEditorModal
            originalSrc={editingPhoto.src}
            cropAspect={4 / 5}
            onBack={() => setEditingPhotoId(null)}
            onSave={dataUrl => {
              setPlaced(current => current.map(photo => photo.id === editingPhoto.id
                ? { ...photo, src: dataUrl, zoom: 1 }
                : photo));
              setEditingPhotoId(null);
              toast.success('사진을 꾸몄어요 ✨');
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

export default function FeedEditPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const {
    feedPosts,
    getCourseById,
    getRestaurantById,
    savedCourseRecords,
    profile,
    addCourse,
    registerRestaurants,
    isMyPost,
  } = useApp();
  const cachedPost = feedPosts.find(item => item.id === id);
  const cachedRecord = savedCourseRecords.find(item => item.post.id === id);
  const [remoteRecord, setRemoteRecord] = useState<SavedCourseRecord | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [loadFailed, setLoadFailed] = useState(false);
  const sourceParam = new URLSearchParams(search).get('from');
  const source = sourceParam === 'profile' || sourceParam === 'saved' ? sourceParam : 'feed';
  const detailPath = `/feed/${id}?from=${source}`;

  useEffect(() => {
    if (!id) return;
    let active = true;
    setIsLoading(true);
    setLoadFailed(false);
    void fetchFeedDetailById(id)
      .then(payload => {
        if (!active || !payload) {
          if (active) setLoadFailed(true);
          return;
        }
        const record = savedCourseRecordFromApi({
          courseId: payload.course.id,
          savedAt: payload.course.createdAt,
          course: payload.course,
          post: payload.post,
        }, profile);
        setRemoteRecord(record);
        if (record.course.isPublic) {
          addCourse(record.course);
          registerRestaurants(record.restaurants);
        }
      })
      .catch(() => { if (active) setLoadFailed(true); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [addCourse, id, profile.emoji, profile.id, profile.name, registerRestaurants]);

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#FCF4EE] text-sm font-bold text-[#9A8579]">
        게시물을 불러오는 중…
      </main>
    );
  }

  const record = remoteRecord ?? cachedRecord;
  const post = record?.post ?? (loadFailed ? cachedPost : undefined);
  const course = record?.course ?? (post ? getCourseById(post.courseId) : undefined);
  const restaurants = record?.restaurants ?? (course?.stops.flatMap(stop => {
    const restaurant = getRestaurantById(stop.placeId);
    return restaurant ? [restaurant] : [];
  }) ?? []);

  if (!post || !course || !isMyPost(post)) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#FCF4EE] px-6 text-center">
        <div>
          <p className="font-bold">수정할 수 없는 피드예요.</p>
          <p className="mt-2 text-xs text-[#9A8579]">작성자 본인의 서버 게시물만 수정할 수 있어요.</p>
          <button type="button" onClick={() => navigate('/profile')} className="mt-4 rounded-full bg-[#E85053] px-6 py-3 text-sm font-bold text-white">프로필로</button>
        </div>
      </main>
    );
  }

  return (
    <FeedEditComposer
      key={`${post.id}:${post.createdAt}`}
      post={post}
      course={course}
      restaurants={restaurants}
      detailPath={detailPath}
    />
  );
}
