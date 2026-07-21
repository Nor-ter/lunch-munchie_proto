import { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation, useParams, useSearch } from 'wouter';
import { useApp } from '@/contexts/AppContext';
import OneLineReviewBox from '@/components/munchie/OneLineReviewBox';
import TemplatePhotoPositionEditor, { createTemplatePhotoPlacement } from '@/components/munchie/TemplatePhotoPositionEditor';
import { getTemplateForCourse } from '@/constants/coursemapTemplates';
import { getCoursemapDecor, MAX_MUNCHIE_FEED_PHOTOS, saveCoursemapDecor, type PlacedPhoto } from '@/lib/coursemapDecor';


export default function FeedEditPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const { feedPosts, getCourseById, getRestaurantById, updateFeedPost, isMyPost } = useApp();
  const post = feedPosts.find(item => item.id === id);
  const sourceParam = new URLSearchParams(search).get('from');
  const source = sourceParam === 'profile' || sourceParam === 'saved' ? sourceParam : 'feed';
  const detailPath = `/feed/${id}?from=${source}`;
  const course = post ? getCourseById(post.courseId) : undefined;
  const templateIndex = Math.max(feedPosts.findIndex(item => item.courseId === post?.courseId), 0);
  const template = getTemplateForCourse(post?.courseId ?? id ?? 'preview', templateIndex);
  const [placed, setPlaced] = useState<PlacedPhoto[]>(() => {
    const savedDecor = post ? getCoursemapDecor(post.courseId) : null;
    if (savedDecor) return savedDecor;
    return (post?.photos ?? []).slice(0, MAX_MUNCHIE_FEED_PHOTOS).map((src, index) => (
      createTemplatePhotoPlacement(src, index, template)
    ));
  });
  const [caption, setCaption] = useState(post?.caption ?? '');

  const photoChoices = useMemo(() => Array.from(new Set([
    ...placed.map(photo => photo.src),
    ...(post?.photos ?? []),
    ...(course ? [course.heroImage, ...course.stops.map(stop => getRestaurantById(stop.placeId)?.image)] : []),
  ].filter((photo): photo is string => Boolean(photo)))), [course, getRestaurantById, placed, post?.photos]);

  if (!post || !course || !isMyPost(post)) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#FCF4EE] text-center">
        <div><p className="font-bold">수정할 수 없는 피드예요.</p><button onClick={() => navigate('/profile')} className="mt-4 rounded-full bg-[#E85053] px-6 py-3 text-sm font-bold text-white">프로필로</button></div>
      </main>
    );
  }

  const save = () => {
    if (!caption.trim() || placed.length === 0) return;
    const nextPlaced = placed.slice(0, MAX_MUNCHIE_FEED_PHOTOS);
    updateFeedPost(post.id, { photos: nextPlaced.map(photo => photo.src), caption: caption.trim() });
    saveCoursemapDecor(post.courseId, nextPlaced);
    toast.success('Munchie 피드를 수정했어요.');
    navigate(detailPath, { replace: true });
  };

  return (
    <main className="min-h-dvh bg-[#FCF4EE] pb-28">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-[#FCF4EE]/95 px-4 pb-3 pt-4 backdrop-blur">
        <button onClick={() => navigate(detailPath)} aria-label="뒤로" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow"><ChevronLeft size={20} /></button>
        <p className="text-[16px] font-black">Munchie 피드 수정</p>
        <span className="w-9" />
      </header>

      <section className="px-4 pt-4">
        <div className="mb-3 rounded-2xl border border-[#E9DAD0] bg-white px-4 py-3">
          <p className="text-[11px] font-bold text-[#9A8579]">연결된 코스맵</p>
          <p className="mt-1 truncate text-[14px] font-black text-[#2D211C]">{course.title}</p>
          <p className="mt-1 text-[11px] text-[#9A8579]">사진과 위치만 수정되며 연결된 코스는 그대로 유지돼요.</p>
        </div>
        <TemplatePhotoPositionEditor
          template={template}
          placed={placed}
          setPlaced={setPlaced}
          photoPool={photoChoices}
        />
        <OneLineReviewBox compact className="mt-4">
          <textarea value={caption} onChange={event => setCaption(event.target.value)} rows={2} placeholder="한줄평을 입력하세요" className="w-full resize-none bg-transparent text-[13px] font-semibold text-[#3B2A23] outline-none placeholder:text-[#C9ADA3]" />
        </OneLineReviewBox>
      </section>

      <div className="page-bottom-bar fixed bottom-4 left-1/2 z-30 w-[calc(100%-32px)] max-w-[398px] -translate-x-1/2">
        <button onClick={save} disabled={!caption.trim() || placed.length === 0} className="h-[52px] w-full rounded-2xl bg-[#EB5053] font-bold text-white shadow-lg disabled:bg-[#E5CFC5]">수정 완료</button>
      </div>
    </main>
  );
}
