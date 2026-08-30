import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams, useSearch } from 'wouter';
import { savedCourseRecordFromApi, useApp, type SavedCourseRecord } from '@/contexts/AppContext';
import UnifiedMunchieCard from '@/components/munchie/UnifiedMunchieCard';
import BackButton from '@/components/ui/BackButton';
import CourseDirectionsAction from '@/components/course/CourseDirectionsAction';
import { getSavedReturnPath } from '@/lib/savedNavigation';
import { useProfileFeed } from '@/hooks/useProfileFeed';
import {
  buildGoogleMapsDirectionsUrl,
  googlePlaceIdFromRestaurantId,
} from '@/lib/googleMapsDirections';
import { logNavigate } from '@/lib/eventLogger';
import { fetchFeedDetailById } from '@/services/savedCoursesApi';

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
  const backLabel = fromNotifications ? '알림으로 돌아가기' : fromProfile ? '프로필로 돌아가기' : fromSaved ? '저장목록으로 돌아가기' : '먼치피드로 돌아가기';
  const directionsUrl = useMemo(() => buildGoogleMapsDirectionsUrl(
    (post?.stops ?? []).map(stop => {
      const restaurant = getRestaurantById(stop.placeId);
      return {
        googlePlaceId: googlePlaceIdFromRestaurantId(stop.placeId),
        address: restaurant?.address ?? stop.address ?? stop.name,
        latitude: stop.latitude ?? restaurant?.lat,
        longitude: stop.longitude ?? restaurant?.lng,
      };
    }),
  ), [getRestaurantById, post?.stops]);

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
      <header className="sticky top-0 z-30 grid grid-cols-[40px_1fr_40px] items-center bg-[#FCF4EE]/95 px-5 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur">
        <BackButton onClick={() => navigate(backPath)} aria-label={backLabel} />
        <p className="text-center text-[15px] font-black text-[#2D211C]">Munchie Feed</p>
        <span className="h-10 w-10" aria-hidden="true" />
      </header>
      <CourseDirectionsAction
        href={directionsUrl}
        stopCount={post.stops?.length ?? 0}
        onNavigate={handleDirectionsOpen}
      />
      <section className="px-4 pt-2">
        <UnifiedMunchieCard
          post={post}
          courseOverride={detailRecord?.course}
          restaurantOverrides={detailRecord?.restaurants}
          detailOrigin={detailOrigin}
          savedView={savedView}
        />
      </section>
    </main>
  );
}
