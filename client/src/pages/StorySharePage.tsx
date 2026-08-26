import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useParams } from 'wouter';
import { Download, Instagram, Link2, LockKeyhole, Map, Newspaper, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { CourseMap } from '@/components/course/CourseMap';
import TemplateArtwork from '@/components/munchie/TemplateArtwork';
import { getTemplateById, getTemplateForCourse } from '@/constants/coursemapTemplates';
import { type Course, type FeedPost, useApp } from '@/contexts/AppContext';
import { useCourseShare } from '@/hooks/useCourseShare';
import { getCoursePlacesFromStops } from '@/lib/courseMapSync';
import { fromFeedPhotoPlacements } from '@/lib/coursemapDecor';
import BackButton from '@/components/ui/BackButton';

type ShareView = 'feed' | 'map';

function buildFallbackCourse(post: FeedPost): Course {
  return {
    id: post.courseId,
    title: 'Munchie Feed',
    description: post.caption,
    heroImage: post.photos[0] ?? '',
    tags: post.tags,
    hashtags: [],
    region: 'Munchie community',
    metadata: { distance: 0, duration: 0, placeCount: 0 },
    stops: [],
    createdAt: post.createdAt,
    isPublic: true,
    creatorId: post.authorId ?? '',
    savedCount: 0,
  };
}

export default function StorySharePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { courses, feedPosts, getCourseById, getRestaurantById, incrementFeedShare } = useApp();
  const { captureCard, downloadImage, saveImageToDevice } = useCourseShare();
  const [view, setView] = useState<ShareView>('feed');
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const requestedPostId = typeof window === 'undefined'
    ? null
    : new URLSearchParams(window.location.search).get('post');
  const post = (requestedPostId
    ? feedPosts.find(item => item.id === requestedPostId && item.courseId === id)
    : undefined) ?? feedPosts.find(item => item.courseId === id);
  const storedCourse = getCourseById(id);
  const course = storedCourse ?? (post ? buildFallbackCourse(post) : undefined);
  const courseIndex = Math.max(courses.findIndex(item => item.id === id), 0);
  const template = post
    ? getTemplateById(post.templateId) ?? getTemplateById(post.skinId) ?? getTemplateForCourse(id, courseIndex)
    : undefined;
  const decor = post
    ? post.decor ?? fromFeedPhotoPlacements(post.photoPlacements, post.photos) ?? undefined
    : undefined;
  const places = useMemo(
    () => course ? getCoursePlacesFromStops(course, getRestaurantById).slice(0, 3) : [],
    [course, getRestaurantById],
  );

  if (!course || !post || !template) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col items-center justify-center bg-[#FFF8F3] px-6 text-center">
        <p className="text-[17px] font-black text-[#3B2A23]">공유할 Munchie 피드를 찾을 수 없어요</p>
        <p className="mt-2 text-[12px] font-semibold text-[#9A8377]">먼치피드에서 게시물의 공유 버튼을 다시 눌러주세요.</p>
        <button type="button" onClick={() => navigate('/feed')} className="mt-5 rounded-2xl bg-[#EF575B] px-6 py-3 text-[13px] font-black text-white">먼치피드로</button>
      </main>
    );
  }

  const shareFilename = `munchie-${view}-story-${post.id}.png`;

  const shareToStory = async () => {
    try {
      setSharing(true);
      const delivery = await saveImageToDevice(cardRef, shareFilename, { preferNativeShare: true, targetWidth: 1080 });
      incrementFeedShare(post.id);
      toast.success(delivery === 'share'
        ? '공유 앱에서 Instagram 스토리를 선택해 주세요.'
        : '9:16 스토리 이미지가 저장됐어요.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.error('스토리 이미지를 공유하지 못했어요.');
    } finally {
      setSharing(false);
    }
  };

  const saveImage = async () => {
    try {
      setSharing(true);
      const dataUrl = await captureCard(cardRef, { targetWidth: 1080 });
      await downloadImage(dataUrl, shareFilename);
      toast.success('9:16 스토리 이미지를 저장했어요.');
    } catch {
      toast.error('이미지를 저장하지 못했어요.');
    } finally {
      setSharing(false);
    }
  };

  const copyFeedLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/feed/${post.id}`);
      incrementFeedShare(post.id);
      toast.success('Munchie 피드 링크를 복사했어요.');
    } catch {
      toast.error('링크를 복사하지 못했어요.');
    }
  };

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] overscroll-contain bg-[#FFF8F3] pb-32 text-[#35241D]">
      <header className="sticky top-0 z-30 flex items-center border-b border-[#F0E1D9] bg-[#FFFDFC]/95 px-5 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur">
        <BackButton onClick={() => navigate(`/feed/${post.id}`)} aria-label="피드로 돌아가기" />
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#EA7472]">Munchie story</p>
          <h1 className="mt-0.5 text-[16px] font-black">스토리 공유하기</h1>
        </div>
        <span className="w-9" />
      </header>

      <section className="px-5 pt-5">
        <div className="mx-auto flex max-w-[292px] rounded-[17px] border border-[#E9D8CF] bg-white p-1.5 shadow-[0_7px_20px_rgba(91,57,42,0.08)]" aria-label="공유할 화면 선택">
          {([
            { id: 'feed' as const, label: '피드', Icon: Newspaper },
            { id: 'map' as const, label: '맵', Icon: Map },
          ]).map(item => (
            <button key={item.id} type="button" onClick={() => setView(item.id)} aria-pressed={view === item.id} className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[12px] text-[12px] font-black transition ${view === item.id ? 'bg-[#EF575B] text-white shadow-sm' : 'text-[#8A7469]'}`}>
              <item.Icon size={15} /> {item.label}
            </button>
          ))}
        </div>

        <motion.div key={view} initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.2 }} className="mx-auto mt-4 w-[76%] max-w-[292px] rounded-[28px] bg-white p-2 shadow-[0_18px_42px_rgba(96,57,40,0.18)]">
            <div ref={cardRef} data-testid="locked-story-preview" className="relative aspect-[9/16] w-full overflow-hidden rounded-[21px] bg-[#FFF2EA]">
              <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#FFD8CB]" />
              <div className="absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-[#FFE6B8]/70" />

              <div className="absolute inset-x-[7%] top-[4.2%] z-10 flex items-center justify-between">
                <div>
                  <p className="text-[7px] font-black uppercase tracking-[0.24em] text-[#E85E60]">Lunchie Munchie</p>
                  <p className="mt-0.5 text-[11px] font-black text-[#34241E]">{view === 'feed' ? 'Munchie Feed' : 'Munchie Map'}</p>
                </div>
                <span className="rounded-full border border-[#F2C7BC] bg-white/75 px-2 py-1 text-[6px] font-black uppercase tracking-[0.15em] text-[#B1665A]">9:16 story</span>
              </div>

              {view === 'feed' ? (
                <div className="absolute inset-x-[6.5%] top-[14%] z-10">
                  <div className="overflow-hidden rounded-[16px] border-[3px] border-white bg-white shadow-[0_10px_24px_rgba(74,43,30,0.18)]">
                    <TemplateArtwork course={course} template={template} photoSources={post.photos} decorOverride={decor} strokesOverride={post.canvasStrokes} eager />
                  </div>
                  <div className="mt-3 rounded-[13px] border border-white/80 bg-white/76 px-3 py-2.5 shadow-sm backdrop-blur-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FFE1D8] text-[10px]">{post.authorEmoji}</span>
                      <strong className="truncate text-[8px] text-[#4A342B]">{post.authorName}</strong>
                      <span className="ml-auto text-[7px] font-bold text-[#B17C6E]">앨범 {post.photos.length}장</span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[9px] font-bold leading-[1.45] text-[#3B2A23]">{post.caption}</p>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-x-[6.5%] top-[15%] z-10">
                  <div className="overflow-hidden rounded-[17px] border-[3px] border-white bg-[#F5EFE9] shadow-[0_10px_24px_rgba(74,43,30,0.16)]">
                    {places.length > 0 ? (
                      <CourseMap places={places} width={300} height={270} className="block h-auto w-full !rounded-none" />
                    ) : (
                      <div className="flex aspect-square items-center justify-center bg-[#F4ECE6] text-[10px] font-bold text-[#A58A7D]">저장된 코스 위치가 없어요</div>
                    )}
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {places.map((place, index) => (
                      <div key={place.id} className="flex items-center gap-2 rounded-[11px] border border-white/80 bg-white/78 px-2.5 py-2 shadow-sm">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EF575B] text-[8px] font-black text-white">{index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[8px] font-black text-[#3A2922]">{place.name}</p>
                          <p className="truncate text-[6px] font-bold text-[#9D8174]">{place.category} · {place.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="absolute inset-x-[7%] bottom-[3.5%] z-10 flex items-end justify-between gap-2">
                <p className="max-w-[78%] line-clamp-1 text-[7px] font-black text-[#8E685B]">{course.title || post.caption}</p>
                <span className="text-[7px] font-black text-[#E85E60]">@MUNCHIE</span>
              </div>
            </div>
        </motion.div>

        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F5E9E3] px-3 py-1.5 text-[10px] font-black text-[#8A6C5F]">
            <LockKeyhole size={12} /> 원본 피드 고정 · 사진 변경 불가
          </div>
          <p className="mt-2 text-[11px] font-semibold text-[#9A8377]">작성한 사진 앨범과 배치를 그대로 9:16 스토리로 공유해요.</p>
        </div>
      </section>

      <section className="mx-5 mt-5 rounded-[22px] border border-[#EEDDD5] bg-white px-4 py-4 shadow-[0_8px_22px_rgba(91,57,42,0.07)]">
        <p className="text-[12px] font-black text-[#4A342A]">어디에 공유할까요?</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button type="button" onClick={shareToStory} disabled={sharing} className="flex flex-col items-center gap-1.5 rounded-2xl bg-[#EF575B] px-2 py-3 text-white disabled:opacity-60"><Instagram size={20} /><span className="text-[10px] font-black">IG 스토리</span></button>
          <button type="button" onClick={copyFeedLink} className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#E7DCD5] bg-[#FFFDFC] px-2 py-3 text-[#71877B]"><Link2 size={20} /><span className="text-[10px] font-black">피드 링크</span></button>
          <button type="button" onClick={saveImage} disabled={sharing} className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#E7DCD5] bg-[#FFFDFC] px-2 py-3 text-[#897367] disabled:opacity-60"><Download size={20} /><span className="text-[10px] font-black">저장하기</span></button>
        </div>
      </section>

      <div className="page-bottom-bar fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 gap-2 border-t border-[#F0E1D9] bg-[#FFFDFC]/96 px-4 backdrop-blur">
        <button type="button" onClick={shareToStory} disabled={sharing} className="flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#EF575B] text-[13px] font-black text-white disabled:opacity-60"><Share2 size={16} /> {sharing ? '스토리 만드는 중…' : `${view === 'feed' ? '피드' : '맵'} 스토리 공유`}</button>
        <button type="button" onClick={() => navigate(`/feed/${post.id}`)} className="h-13 flex-1 rounded-2xl border border-[#E9D9D1] bg-white text-[13px] font-black text-[#6B554B]">피드로 돌아가기</button>
      </div>
    </main>
  );
}
