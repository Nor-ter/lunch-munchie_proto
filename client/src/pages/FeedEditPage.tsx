import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation, useParams, useSearch } from 'wouter';
import { useApp, type FeedPost } from '@/contexts/AppContext';
import UnifiedMunchieCard from '@/components/munchie/UnifiedMunchieCard';
import { fileToResizedDataUrl } from '@/lib/imageUtils';
import OneLineReviewBox from '@/components/munchie/OneLineReviewBox';

const MAX_PHOTOS = 3;

export default function FeedEditPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const { feedPosts, getCourseById, getRestaurantById, updateFeedPost, isMyPost } = useApp();
  const post = feedPosts.find(item => item.id === id);
  const source = new URLSearchParams(search).get('from') === 'feed' ? 'feed' : 'profile';
  const detailPath = `/feed/${id}?from=${source}`;
  const course = post ? getCourseById(post.courseId) : undefined;
  const [photos, setPhotos] = useState(() => post?.photos.slice(0, MAX_PHOTOS) ?? []);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [caption, setCaption] = useState(post?.caption ?? '');
  const [preview, setPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const photoChoices = useMemo(() => Array.from(new Set([
    ...photos,
    ...(course ? [course.heroImage, ...course.stops.slice(0, MAX_PHOTOS).map(stop => getRestaurantById(stop.placeId)?.image)] : []),
    ...uploaded,
  ].filter((photo): photo is string => Boolean(photo)))), [course, getRestaurantById, photos, uploaded]);

  if (!post || !course || !isMyPost(post)) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#FCF4EE] text-center">
        <div><p className="font-bold">수정할 수 없는 피드예요.</p><button onClick={() => navigate('/profile')} className="mt-4 rounded-full bg-[#E85053] px-6 py-3 text-sm font-bold text-white">프로필로</button></div>
      </main>
    );
  }

  const previewPost: FeedPost = { ...post, photos, caption: caption.trim() || post.caption };
  const togglePhoto = (photo: string) => {
    setPhotos(current => {
      if (current.includes(photo)) return current.filter(item => item !== photo);
      if (current.length >= MAX_PHOTOS) {
        toast.info(`사진은 최대 ${MAX_PHOTOS}장까지 사용할 수 있어요.`);
        return current;
      }
      return [...current, photo];
    });
  };
  const uploadPhotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, Math.max(0, MAX_PHOTOS - photos.length));
    event.target.value = '';
    for (const file of files) {
      try {
        const photo = await fileToResizedDataUrl(file, 800, 0.8);
        setUploaded(current => [...current, photo]);
        setPhotos(current => current.length < MAX_PHOTOS ? [...current, photo] : current);
      } catch {
        toast.error('사진을 불러오지 못했어요.');
      }
    }
  };
  const save = () => {
    if (!caption.trim() || photos.length === 0) return;
    updateFeedPost(post.id, { photos: photos.slice(0, MAX_PHOTOS), caption: caption.trim() });
    toast.success('통합 코스피드를 수정했어요.');
    navigate(detailPath, { replace: true });
  };

  return (
    <main className="min-h-dvh bg-[#FCF4EE] pb-28">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-[#FCF4EE]/95 px-4 pb-3 pt-4 backdrop-blur">
        <button onClick={() => preview ? setPreview(false) : navigate(detailPath)} aria-label="뒤로" className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow"><ChevronLeft size={20} /></button>
        <p className="text-[16px] font-black">{preview ? '수정 미리보기' : '코스피드 수정'}</p>
        <span className="w-9" />
      </header>

      <section className="px-4 pt-4">
        {preview ? (
          <UnifiedMunchieCard post={previewPost} interactive={false} />
        ) : (
          <>
            <div className="mb-3 rounded-2xl border border-[#E9DAD0] bg-white px-4 py-3">
              <p className="text-[11px] font-bold text-[#9A8579]">연결된 코스맵</p>
              <p className="mt-1 truncate text-[14px] font-black text-[#2D211C]">{course.title}</p>
              <p className="mt-1 text-[11px] text-[#9A8579]">코스맵과 피드는 하나의 기록이므로 다른 코스로 변경할 수 없어요.</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {photoChoices.map(photo => {
                const order = photos.indexOf(photo);
                return (
                  <button key={photo} onClick={() => togglePhoto(photo)} className="relative aspect-square overflow-hidden rounded-xl active:scale-95">
                    <img src={photo} alt="" className="h-full w-full object-cover" />
                    {order >= 0 && <><span className="absolute inset-0 rounded-xl border-2 border-[#E85053] bg-[#E85053]/20" /><span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#E85053] text-[12px] font-bold text-white">{order + 1}</span></>}
                  </button>
                );
              })}
              {photos.length < MAX_PHOTOS && <button onClick={() => fileRef.current?.click()} aria-label="사진 추가" className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-[#E0D2C6] text-[#B0A090]"><Plus size={26} /></button>}
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={uploadPhotos} />
            </div>
            <p className="mt-2 text-[11px] font-semibold text-[#9A8579]">코스 사진은 최대 {MAX_PHOTOS}장까지 사용할 수 있어요.</p>
            <OneLineReviewBox className="mt-4">
              <textarea value={caption} onChange={event => setCaption(event.target.value)} rows={3} placeholder="한줄평을 입력하세요" className="w-full resize-none bg-transparent text-[14px] font-semibold text-[#3B2A23] outline-none placeholder:text-[#C9ADA3]" />
            </OneLineReviewBox>
          </>
        )}
      </section>

      <div className="fixed bottom-4 left-1/2 z-30 flex w-[calc(100%-32px)] max-w-[398px] -translate-x-1/2 gap-2">
        {preview && <button onClick={() => setPreview(false)} className="h-[52px] flex-1 rounded-2xl border bg-white font-bold">다시 수정</button>}
        <button onClick={preview ? save : () => setPreview(true)} disabled={!caption.trim() || photos.length === 0} className="h-[52px] flex-[1.5] rounded-2xl bg-[#EB5053] font-bold text-white shadow-lg disabled:bg-[#E5CFC5]">{preview ? '수정 완료' : '미리보기'}</button>
      </div>
    </main>
  );
}
