import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useParams, useSearch } from 'wouter';
import { Check, ChevronLeft, Clock, MapPin, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useApp, type Course, type FeedPost } from '@/contexts/AppContext';
import FeedPostCard from '@/components/munchie/FeedPostCard';
import { fileToResizedDataUrl } from '@/lib/imageUtils';

const STEP_TITLES = ['코스 선택', '사진·한줄평 수정', '수정 미리보기'];

function CourseChoice({ course, selected, onSelect }: { course: Course; selected: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className="flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-left active:scale-[0.99]" style={{ borderColor: selected ? '#E85053' : '#F0E8E0', borderWidth: selected ? 2 : 1 }}>
      <img src={course.heroImage} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold text-[#1A1A1A]">{course.title}</p>
        <p className="mt-0.5 text-[12px] text-[#9B9B9B]">{course.metadata.distance}km · {Math.floor(course.metadata.duration / 60)}h · {course.metadata.placeCount} 스팟</p>
      </div>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: selected ? '#E85053' : '#F0F0F0' }}>
        {selected && <Check size={14} color="white" strokeWidth={3} />}
      </span>
    </button>
  );
}

export default function FeedEditPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const { courses, savedCourseIds, feedPosts, getRestaurantById, updateFeedPost, isMyPost } = useApp();
  const post = feedPosts.find(item => item.id === id);
  const source = new URLSearchParams(search).get('from') === 'feed' ? 'feed' : 'profile';
  const detailPath = `/feed/${id}?from=${source}`;
  const [step, setStep] = useState(0);
  const [courseId, setCourseId] = useState(post?.courseId ?? '');
  const [photos, setPhotos] = useState<string[]>(post?.photos ?? []);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [caption, setCaption] = useState(post?.caption ?? '');
  const fileRef = useRef<HTMLInputElement>(null);

  const sortedCourses = useMemo(() => [
    ...courses.filter(course => savedCourseIds.includes(course.id)),
    ...courses.filter(course => !savedCourseIds.includes(course.id)),
  ], [courses, savedCourseIds]);
  const course = courses.find(item => item.id === courseId);
  const photoChoices = useMemo(() => Array.from(new Set([
    ...photos,
    ...(course ? [course.heroImage, ...course.stops.map(stop => getRestaurantById(stop.placeId)?.image).filter((photo): photo is string => !!photo)] : []),
    ...uploaded,
  ].filter(Boolean))), [course, getRestaurantById, photos, uploaded]);
  const previewPost = useMemo<FeedPost | null>(() => {
    if (!post || !course || photos.length === 0 || !caption.trim()) return null;
    return { ...post, courseId: course.id, photos, caption: caption.trim(), tags: course.tags };
  }, [caption, course, photos, post]);

  if (!post || !isMyPost(post)) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#FCF4EE] text-center">
        <div><p className="font-bold">수정할 수 없는 피드예요</p><button onClick={() => navigate('/profile')} className="mt-4 rounded-full bg-[#E85053] px-6 py-3 text-sm font-bold text-white">프로필로</button></div>
      </main>
    );
  }

  const togglePhoto = (photo: string) => setPhotos(current => current.includes(photo) ? current.filter(item => item !== photo) : [...current, photo]);
  const selectCourse = (nextCourseId: string) => {
    if (nextCourseId !== courseId) setPhotos(nextCourseId === post.courseId ? post.photos : []);
    setCourseId(nextCourseId);
  };
  const uploadPhotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    for (const file of files) {
      try {
        const photo = await fileToResizedDataUrl(file, 800, 0.8);
        setUploaded(current => [...current, photo]);
        setPhotos(current => [...current, photo]);
      } catch { toast.error('사진을 불러오지 못했어요'); }
    }
  };
  const canNext = step === 0 ? !!course : photos.length > 0 && !!caption.trim();
  const save = () => {
    if (!previewPost) return;
    updateFeedPost(post.id, {
      courseId: previewPost.courseId,
      photos: previewPost.photos,
      caption: previewPost.caption,
      tags: previewPost.tags,
    });
    toast.success('피드를 수정했어요 ✅');
    navigate(detailPath, { replace: true });
  };

  return (
    <main className="min-h-dvh bg-[#FCF4EE] pb-28">
      <header className="sticky top-0 z-20 bg-[#FCF4EE]/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <button onClick={() => step === 0 ? navigate(detailPath) : setStep(current => current - 1)} aria-label="이전 단계" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow"><ChevronLeft size={20} /></button>
          <p className="text-[16px] font-bold">{STEP_TITLES[step]}</p><span className="w-9" />
        </div>
        <div className="mt-3 flex justify-center gap-1.5">{STEP_TITLES.map((_, index) => <span key={index} className="h-1.5 rounded-full" style={{ width: index === step ? 22 : 6, background: index <= step ? '#EB5053' : '#EDDCD2' }} />)}</div>
      </header>

      <AnimatePresence mode="wait">
        <motion.section key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="px-4 pt-4">
          {step === 0 && <div className="space-y-3"><p className="px-1 text-[13px] font-semibold text-[#9B9B9B]">연결할 코스를 선택하세요</p>{sortedCourses.map(item => <CourseChoice key={item.id} course={item} selected={courseId === item.id} onSelect={() => selectCourse(item.id)} />)}</div>}
          {step === 1 && course && (
            <div>
              <div className="grid grid-cols-3 gap-2">
                {photoChoices.map(photo => { const order = photos.indexOf(photo); return (
                  <button key={photo} onClick={() => togglePhoto(photo)} className="relative aspect-square overflow-hidden rounded-xl active:scale-95">
                    <img src={photo} alt="" className="h-full w-full object-cover" />
                    {order >= 0 && <><span className="absolute inset-0 rounded-xl border-2 border-[#E85053] bg-[#E85053]/25" /><span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#E85053] text-[12px] font-bold text-white">{order + 1}</span></>}
                  </button>
                );})}
                <button onClick={() => fileRef.current?.click()} aria-label="사진 추가" className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-[#E0D2C6] text-[#B0A090]"><Plus size={26} /></button>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={uploadPhotos} />
              </div>
              <textarea value={caption} onChange={event => setCaption(event.target.value)} rows={3} className="mt-4 w-full resize-none rounded-2xl border border-[#F0E8E0] bg-white p-4 text-[14px] outline-none focus:border-[#E85053]" />
              <div className="mt-3 rounded-2xl border border-[#F0E8E0] bg-white px-4 py-3"><p className="flex items-center gap-1 text-[12px] font-semibold text-[#E85053]"><MapPin size={12} /> 코스 · {course.title}</p><p className="mt-1 flex items-center gap-3 text-[11px] text-[#9B9B9B]"><span>{course.metadata.distance}km</span><span className="flex items-center gap-1"><Clock size={10} /> {Math.floor(course.metadata.duration / 60)}h</span></p></div>
            </div>
          )}
          {step === 2 && previewPost && <div><div className="mb-4 text-center"><p className="text-[17px] font-bold">수정 내용을 확인해주세요</p><p className="mt-1 text-[12px] text-[#9B9B9B]">저장하면 기존 피드에 바로 반영돼요</p></div><FeedPostCard post={previewPost} interactive={false} /></div>}
        </motion.section>
      </AnimatePresence>

      <div className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-32px)] max-w-[398px] -translate-x-1/2">
        {step < 2 ? <button onClick={() => canNext && setStep(current => current + 1)} disabled={!canNext} className="h-[52px] w-full rounded-2xl text-[15px] font-bold text-white shadow-lg" style={{ background: canNext ? '#EB5053' : '#E5CFC5' }}>{step === 0 ? '다음' : '미리보기'}</button> : <div className="flex gap-2.5"><button onClick={() => setStep(1)} className="h-[52px] flex-1 rounded-2xl border bg-white font-bold">다시 수정</button><button onClick={save} className="h-[52px] flex-[1.5] rounded-2xl bg-[#EB5053] font-bold text-white shadow-lg">수정 완료</button></div>}
      </div>
    </main>
  );
}
