import { useEffect, useMemo, useState } from 'react';
import { MapPin, Route } from 'lucide-react';
import { useLocation, useParams, useSearch } from 'wouter';
import { savedCourseRecordFromApi, useApp, type SavedCourseRecord } from '@/contexts/AppContext';
import UnifiedMunchieCard from '@/components/munchie/UnifiedMunchieCard';
import FoodHeroCourseOverlay, { type FoodHeroCourseStop } from '@/components/munchie/FoodHeroCourseOverlay';
import BackButton from '@/components/ui/BackButton';
import CourseDirectionsAction from '@/components/course/CourseDirectionsAction';
import { FeedCourseMap } from '@/components/feed/FeedCourseMap';
import { getSavedReturnPath } from '@/lib/savedNavigation';
import { useProfileFeed } from '@/hooks/useProfileFeed';
import { feedStoryRestaurantIdsForPhotos } from '@/lib/feedStory';
import {
  buildGoogleMapsDirectionsUrl,
  googlePlaceIdFromRestaurantId,
} from '@/lib/googleMapsDirections';
import { logNavigate } from '@/lib/eventLogger';
import { fetchFeedDetailById } from '@/services/savedCoursesApi';
import type { CoursePlace } from '@/types/course';

export default function FeedDetailPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const {
    feedPosts,
    isLoading,
    getRestaurantById,
    savedCourseRecords,
    profile,
    addCourse,
    registerRestaurants,
  } = useApp();
  const searchParams = new URLSearchParams(search);
  const profileAuthorId = searchParams.get('authorId') ?? '';
  const profileFeed = useProfileFeed(profileAuthorId);
  const cachedPost = feedPosts.find(item => item.id === id)
    ?? profileFeed.posts.find(item => item.id === id);
  const savedRecord = savedCourseRecords.find(record => record.post.id === id);
  const [remoteRecord, setRemoteRecord] = useState<SavedCourseRecord | null>(null);
  const [isLoadingDirectPost, setIsLoadingDirectPost] = useState(Boolean(id));
  const [directPostMissing, setDirectPostMissing] = useState(false);
  useEffect(() => {
    if (!id) return;
    let active = true;
    setRemoteRecord(null);
    setIsLoadingDirectPost(true);
    setDirectPostMissing(false);
    void fetchFeedDetailById(id)
      .then((payload) => {
        if (!active) return;
        if (!payload) {
          setDirectPostMissing(true);
          return;
        }
        const record = savedCourseRecordFromApi({
          courseId: payload.course.id,
          savedAt: payload.course.createdAt,
          course: payload.course,
          post: payload.post,
        }, profile);
        setRemoteRecord(record);
        // Public canonical resources may safely hydrate the reusable catalogue
        // so the linked course detail remains available after navigation.
        if (record.course.isPublic) {
          addCourse(record.course);
          registerRestaurants(record.restaurants);
        }
      })
      .catch(() => {
        if (active && !cachedPost && !savedRecord) setDirectPostMissing(true);
      })
      .finally(() => { if (active) setIsLoadingDirectPost(false); });
    return () => { active = false; };
  }, [addCourse, id, profile.emoji, profile.id, profile.name, registerRestaurants]);
  const detailRecord = remoteRecord ?? savedRecord;
  const post = detailRecord?.post ?? cachedPost;
  const origin = searchParams.get('from');
  const fromProfile = origin === 'profile';
  const fromSaved = origin === 'saved';
  const fromNotifications = origin === 'notifications';
  const profileReturnId = searchParams.get('profileId');
  const savedView = fromSaved && searchParams.get('savedView') === 'map'
    ? 'map'
    : undefined;
  const detailOrigin = fromProfile ? 'profile' : fromSaved ? 'saved' : 'feed';
  const backPath = fromNotifications
    ? '/?notifications=1'
    : fromProfile
      ? profileReturnId ? `/profile/${profileReturnId}` : '/profile'
      : fromSaved
        ? getSavedReturnPath(search, id)
        : '/feed?tab=feed';
  const orderedPlaceIds = useMemo(() => {
    const courseStopIds = detailRecord?.course.stops
      .slice()
      .sort((a, b) => a.order - b.order)
      .map(stop => stop.placeId) ?? [];
    const postStopIds = post?.stops?.map(stop => stop.placeId) ?? [];
    return Array.from(new Set((courseStopIds.length ? courseStopIds : postStopIds).filter(Boolean)));
  }, [detailRecord?.course.stops, post?.stops]);
  const routePlaces = useMemo<CoursePlace[]>(() => orderedPlaceIds.map((placeId, index) => {
    const embeddedStop = post?.stops?.find(stop => stop.placeId === placeId);
    const restaurant = detailRecord?.restaurants.find(item => item.id === placeId)
      ?? getRestaurantById(placeId);
    return {
      id: placeId,
      name: restaurant?.name ?? embeddedStop?.name ?? `코스 장소 ${index + 1}`,
      rating: restaurant?.rating ?? 0,
      distance: restaurant?.distance ?? '',
      category: restaurant?.category ?? embeddedStop?.category ?? '코스 장소',
      priceLevel: restaurant?.priceRange ?? 1,
      imageUrl: restaurant?.image,
      coords: { x: 20 + (index * 30), y: index % 2 === 0 ? 38 : 66 },
      latitude: embeddedStop?.latitude ?? restaurant?.lat,
      longitude: embeddedStop?.longitude ?? restaurant?.lng,
      address: restaurant?.address ?? embeddedStop?.address,
    };
  }), [detailRecord?.restaurants, getRestaurantById, orderedPlaceIds, post?.stops]);
  const storyStops = useMemo<FoodHeroCourseStop[]>(() => routePlaces.map(place => ({
    id: place.id,
    name: place.name,
    category: place.category,
    address: place.address,
  })), [routePlaces]);
  const photoRestaurantIds = useMemo(() => (
    post?.photoAttributions?.length
      ? feedStoryRestaurantIdsForPhotos(post.photos, post.photoAttributions)
      : undefined
  ), [post?.photoAttributions, post?.photos]);
  const directionsUrl = useMemo(() => buildGoogleMapsDirectionsUrl(
    routePlaces.map(place => {
      return {
        googlePlaceId: googlePlaceIdFromRestaurantId(place.id),
        address: place.address ?? place.name,
        latitude: place.latitude,
        longitude: place.longitude,
      };
    }),
  ), [routePlaces]);
  const displayTags = Array.from(new Set(post?.tags ?? []));

  const detailTitle = detailRecord?.course.title ?? post?.title ?? '나만의 Munchie 코스';

  const handleDirectionsOpen = () => {
    const firstStop = post?.stops?.[0];
    if (!firstStop) return;
    logNavigate(firstStop.placeId, {
      course_id: post.courseId,
      context: { surface: 'feed_detail', stop_count: post.stops?.length ?? 0 },
    });
  };

  if (!post && (isLoading || profileFeed.isLoading || isLoadingDirectPost)) {
    return <main className="flex min-h-dvh items-center justify-center bg-[#FCF4EE] text-sm font-bold text-[#9A8579]">피드를 불러오는 중이에요…</main>;
  }

  if (!post || directPostMissing && !cachedPost && !savedRecord) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#FCF4EE] px-6 text-center">
        <div>
          <p className="font-bold text-[#2D211C]">피드를 찾을 수 없어요</p>
          <button onClick={() => navigate(backPath)} className="mt-4 rounded-full bg-[#E85053] px-6 py-3 text-sm font-bold text-white">돌아가기</button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-[#FCF4EE] pb-8">
      <div className="fixed left-4 top-[max(12px,env(safe-area-inset-top))] z-30">
        <BackButton
          onClick={() => navigate(backPath)}
          aria-label={fromNotifications ? '알림으로 돌아가기' : fromProfile ? '프로필로 돌아가기' : fromSaved ? '저장목록으로 돌아가기' : '먼치피드로 돌아가기'}
        />
      </div>

      <section data-ui="feed-detail-story" className="mx-4 overflow-hidden rounded-[24px] bg-[#30211B] shadow-[0_14px_32px_rgba(76,42,30,0.16)]">
        <FoodHeroCourseOverlay
          photos={post.missingOriginalMedia ? [] : post.photos}
          slides={post.storySlides}
          photoRestaurantIds={photoRestaurantIds}
          title={detailRecord?.course.title ?? post.title}
          caption={post.caption}
          stops={storyStops}
          placeCount={routePlaces.length}
          distanceKm={detailRecord?.course.metadata.distance}
          durationMinutes={detailRecord?.course.metadata.duration}
          eager
        />
      </section>

      <section className="px-4 pt-3">
        <UnifiedMunchieCard
          post={post}
          courseOverride={detailRecord?.course}
          restaurantOverrides={detailRecord?.restaurants}
          detailOrigin={detailOrigin}
          savedView={savedView}
          hideHero
        />
      </section>

      <section className="mx-4 mt-4 rounded-[20px] border border-[#E6D1C6] bg-[#FFFDFC] px-5 pb-4 pt-4 shadow-[0_10px_24px_rgba(105,74,59,0.08)]">
        <div data-ui="feed-detail-copy" className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#E56B68]">Munchie Course</p>
          <h1 className="mt-1 text-[24px] font-black leading-tight tracking-[-0.035em] text-[#30221C]">
            {detailTitle}
          </h1>
          {post.caption.trim() && (
            <p className="whitespace-pre-wrap text-[14px] font-semibold leading-6 text-[#5F4B42]">{post.caption}</p>
          )}
          {detailRecord?.course.description?.trim()
            && detailRecord.course.description.trim() !== post.caption.trim() && (
              <p className="whitespace-pre-wrap text-[13px] leading-6 text-[#89756B]">{detailRecord.course.description}</p>
            )}
          {displayTags.length > 0 && (
            <div className="pt-1.5 flex flex-wrap gap-1.5">
              {displayTags.map(tag => <span key={tag} className="rounded-full bg-[#FCE5DE] px-2.5 py-1 text-[11px] font-black text-[#C75B58]">#{tag}</span>)}
            </div>
          )}
        </div>
      </section>

      <section data-ui="feed-detail-course-map" className="mx-4 mt-5 overflow-hidden rounded-[24px] border border-[#E8D5CB] bg-[#FFFDFC] shadow-[0_10px_26px_rgba(117,73,51,0.08)]">
        <div className="flex items-center justify-between px-4 pb-3 pt-4">
          <div>
            <p className="flex items-center gap-1.5 text-[15px] font-black text-[#382820]"><Route size={17} className="text-[#E85053]" />코스맵</p>
            <p className="mt-1 text-[11px] font-semibold text-[#9A8579]">게시물에 저장된 순서대로 이동 경로를 보여줘요.</p>
          </div>
          <span className="rounded-full bg-[#FFF0EB] px-2.5 py-1 text-[11px] font-black text-[#D95A59]">{routePlaces.length}곳</span>
        </div>

        <div className="mx-3 h-[260px] overflow-hidden rounded-[18px] bg-[#F3EDE8]">
          {routePlaces.some(place => typeof place.latitude === 'number' && typeof place.longitude === 'number') ? (
            <FeedCourseMap places={routePlaces} />
          ) : (
            <div className="flex h-full items-center justify-center px-8 text-center text-[12px] font-semibold text-[#9A8579]">이 게시물에는 지도에 표시할 코스 장소가 없어요.</div>
          )}
        </div>

        {routePlaces.length > 0 && (
          <ol className="space-y-2 px-4 py-4">
            {routePlaces.map((place, index) => (
              <li key={place.id} className="flex items-start gap-3 rounded-[14px] bg-[#FFF7F3] px-3 py-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E85053] text-[11px] font-black text-white">{index + 1}</span>
                <span className="min-w-0">
                  <strong className="block truncate text-[12px] font-black text-[#3B2B24]">{place.name}</strong>
                  <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-semibold text-[#927D73]"><MapPin size={10} />{place.address ?? place.category}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="mt-4">
        <CourseDirectionsAction
          href={directionsUrl}
          stopCount={routePlaces.length}
          onNavigate={handleDirectionsOpen}
        />
      </div>
    </main>
  );
}
