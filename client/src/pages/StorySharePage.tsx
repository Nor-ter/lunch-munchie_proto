import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useParams } from 'wouter';
import { ChevronLeft, Download, ImagePlus, Instagram, Link2, Minus, Plus, RotateCcw, RotateCw, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';
import OneLineReviewBox from '@/components/munchie/OneLineReviewBox';
import { SHARE_TEMPLATES } from '@/constants/shareTemplates';
import { useCourseShare } from '@/hooks/useCourseShare';
import { fileToResizedDataUrl } from '@/lib/imageUtils';

interface StoryPhoto {
  id: string;
  src: string;
  x: number;
  y: number;
  size: number;
  rotate: number;
}

const PHOTO_LAYOUTS = [
  { x: 50, y: 43, size: 66, rotate: -2 },
  { x: 37, y: 61, size: 43, rotate: 3 },
  { x: 65, y: 62, size: 40, rotate: -4 },
];

const REVIEW_AREA_TOP = 84;
const photoHeightPercent = (size: number) => size * (27 / 64);
const maxPhotoY = (size: number) => REVIEW_AREA_TOP - (photoHeightPercent(size) / 2) - 1;

export default function StorySharePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { getCourseById, getRestaurantById, feedPosts } = useApp();
  const { captureCard, copyLink, downloadImage, saveImageToDevice } = useCourseShare();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<{
    photoId: string;
    startPhoto: StoryPhoto;
    startPoint: { x: number; y: number };
    pinchDistance?: number;
    pinchSize?: number;
  } | null>(null);
  const course = getCourseById(id);
  const post = feedPosts.find(item => item.courseId === id);
  const selectedTemplate = SHARE_TEMPLATES[selectedIndex]!;

  const places = useMemo(
    () => course?.stops.slice(0, 3).map(stop => getRestaurantById(stop.placeId)).filter(Boolean) ?? [],
    [course, getRestaurantById],
  );
  const photos = useMemo(() => {
    const feedPhotos = post?.photos.filter(Boolean) ?? [];
    const placePhotos = places.map(place => place?.image).filter((photo): photo is string => Boolean(photo));
    return Array.from(new Set([...feedPhotos, ...placePhotos])).slice(0, 3);
  }, [places, post]);
  const initialStoryPhotos = useMemo<StoryPhoto[]>(() => photos.map((src, index) => ({
    id: `story-photo-${index}`,
    src,
    ...(PHOTO_LAYOUTS[index] ?? PHOTO_LAYOUTS[PHOTO_LAYOUTS.length - 1]!),
  })), [photos]);
  const [storyPhotos, setStoryPhotos] = useState<StoryPhoto[]>(initialStoryPhotos);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(initialStoryPhotos[0]?.id ?? null);

  if (!course) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col items-center justify-center bg-[#FFF8F3] px-6 text-center">
        <p className="text-[17px] font-black text-[#3B2A23]">공유할 먼치맵을 찾을 수 없어요</p>
        <button type="button" onClick={() => navigate('/feed')} className="mt-5 rounded-2xl bg-[#EF575B] px-6 py-3 text-[13px] font-black text-white">먼치 홈으로</button>
      </main>
    );
  }

  const shareToStory = async () => {
    try {
      setSharing(true);
      const delivery = await saveImageToDevice(cardRef, `munchie-story-${course.id}.png`, { preferNativeShare: true });
      toast.success(delivery === 'share' ? '인스타그램을 선택해 스토리에 공유하세요.' : '스토리 이미지가 저장됐어요.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.error('스토리 공유 이미지를 만들지 못했어요.');
    } finally {
      setSharing(false);
    }
  };

  const saveImage = async () => {
    try {
      setSharing(true);
      const dataUrl = await captureCard(cardRef, { targetWidth: 1080 });
      await downloadImage(dataUrl, `munchie-story-${course.id}.png`);
      toast.success('9:16 스토리 이미지를 저장했어요.');
    } catch {
      toast.error('이미지를 저장하지 못했어요.');
    } finally {
      setSharing(false);
    }
  };

  const copyCourseLink = async () => {
    try {
      await copyLink(course.id);
      toast.success('먼치맵 링크를 복사했어요.');
    } catch {
      toast.error('링크를 복사하지 못했어요.');
    }
  };

  const updatePhoto = (photoId: string, updates: Partial<StoryPhoto>) => {
    setStoryPhotos(current => current.map(photo => photo.id === photoId ? { ...photo, ...updates } : photo));
  };

  const removePhoto = (photoId: string) => {
    setStoryPhotos(current => {
      const next = current.filter(photo => photo.id !== photoId);
      setActivePhotoId(active => active === photoId ? (next[0]?.id ?? null) : active);
      return next;
    });
  };

  const distanceBetweenPointers = () => {
    const points = Array.from(pointersRef.current.values());
    if (points.length < 2) return 0;
    return Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y);
  };

  const beginPhotoGesture = (photo: StoryPhoto, event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    setActivePhotoId(photo.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 1) {
      gestureRef.current = {
        photoId: photo.id,
        startPhoto: { ...photo },
        startPoint: { x: event.clientX, y: event.clientY },
      };
      return;
    }

    if (gestureRef.current?.photoId === photo.id) {
      gestureRef.current.pinchDistance = distanceBetweenPointers();
      gestureRef.current.pinchSize = photo.size;
    }
  };

  const movePhotoGesture = (photoId: string, event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.photoId !== photoId || !pointersRef.current.has(event.pointerId)) return;
    event.preventDefault();
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size >= 2 && gesture.pinchDistance && gesture.pinchSize) {
      const scale = distanceBetweenPointers() / gesture.pinchDistance;
      const size = Math.min(92, Math.max(18, Math.round(gesture.pinchSize * scale)));
      updatePhoto(photoId, { size, y: Math.min(gesture.startPhoto.y, maxPhotoY(size)) });
      return;
    }

    const canvas = cardRef.current?.getBoundingClientRect();
    if (!canvas) return;
    const x = gesture.startPhoto.x + ((event.clientX - gesture.startPoint.x) / canvas.width) * 100;
    const y = gesture.startPhoto.y + ((event.clientY - gesture.startPoint.y) / canvas.height) * 100;
    updatePhoto(photoId, {
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(maxPhotoY(gesture.startPhoto.size), Math.max(0, y)),
    });
  };

  const endPhotoGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2 && gestureRef.current?.pinchDistance) gestureRef.current = null;
    if (pointersRef.current.size === 0) gestureRef.current = null;
  };

  const resizePhotoWithWheel = (photo: StoryPhoto, event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const delta = event.deltaY < 0 ? 4 : -4;
    const size = Math.min(92, Math.max(18, photo.size + delta));
    updatePhoto(photo.id, { size, y: Math.min(photo.y, maxPhotoY(size)) });
  };

  const addPhoto = async (file?: File) => {
    if (!file || storyPhotos.length >= 5) return;
    try {
      const src = await fileToResizedDataUrl(file, 1200, 0.88);
      const id = `story-upload-${Date.now()}`;
      const offset = storyPhotos.length % 3;
      const layout = PHOTO_LAYOUTS[offset]!;
      setStoryPhotos(current => [...current, { id, src, ...layout, rotate: layout.rotate + current.length * 2 }]);
      setActivePhotoId(id);
    } catch {
      toast.error('사진을 추가하지 못했어요.');
    }
  };

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-[#FFF8F3] pb-32">
      <header className="sticky top-0 z-30 flex items-center border-b border-[#F0E1D9] bg-[#FFFDFC]/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => navigate('/feed')} aria-label="먼치피드 홈으로 돌아가기" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#EADBD3] bg-white text-[#6B554B] shadow-sm">
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#EA7472]">Munchie story</p>
          <h1 className="mt-0.5 text-[16px] font-black text-[#2E211C]">9:16 템플릿 선택 · 공유하기</h1>
        </div>
        <span className="w-9" />
      </header>

      <section className="pt-5">
        <div className="overflow-x-hidden">
          <motion.div
            key={selectedTemplate.id}
            initial={{ opacity: 0.6, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto w-[72%] max-w-[292px] rounded-[27px] bg-white p-2 shadow-[0_18px_42px_rgba(96,57,40,0.18)]"
          >
            <div
              ref={cardRef}
              className="relative aspect-[9/16] w-full overflow-hidden rounded-[21px] bg-[#F8EDE6]"
              onPointerDown={event => {
                if (!(event.target as HTMLElement).closest('[data-story-photo]')) setActivePhotoId(null);
              }}
            >
              <img src={selectedTemplate.background} alt={`${selectedTemplate.name} 9:16 스토리 템플릿`} className="absolute inset-0 h-full w-full object-cover" crossOrigin="anonymous" />
              {storyPhotos.length === 0 && (
                <button
                  type="button"
                  data-share-editor-control
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="템플릿에 첫 사진 추가"
                  className="absolute left-1/2 top-1/2 z-40 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-2xl border-2 border-white bg-[#2DBE73] px-4 py-3 text-[11px] font-black text-white shadow-lg"
                >
                  <ImagePlus size={17} /> 사진 추가
                </button>
              )}
              {storyPhotos.map(photo => (
                  <div
                    key={photo.id}
                    data-story-photo
                    role="button"
                    tabIndex={0}
                    aria-label="스토리 사진 편집 선택"
                    onPointerDown={event => beginPhotoGesture(photo, event)}
                    onPointerMove={event => movePhotoGesture(photo.id, event)}
                    onPointerUp={endPhotoGesture}
                    onPointerCancel={endPhotoGesture}
                    onWheel={event => resizePhotoWithWheel(photo, event)}
                    onKeyDown={event => {
                      if (event.key === 'Delete' || event.key === 'Backspace') removePhoto(photo.id);
                      if (event.key === 'ArrowLeft') updatePhoto(photo.id, { x: Math.max(0, photo.x - 1) });
                      if (event.key === 'ArrowRight') updatePhoto(photo.id, { x: Math.min(100, photo.x + 1) });
                      if (event.key === 'ArrowUp') updatePhoto(photo.id, { y: Math.max(0, photo.y - 1) });
                      if (event.key === 'ArrowDown') updatePhoto(photo.id, { y: Math.min(100, photo.y + 1) });
                    }}
                    className={`absolute aspect-[4/3] touch-none select-none overflow-visible rounded-[10px] border-4 border-white bg-[#F3E7DF] shadow-[0_5px_14px_rgba(57,35,27,0.2)] active:cursor-grabbing ${activePhotoId === photo.id ? 'z-30' : 'z-10'}`}
                    style={{
                      left: `${photo.x}%`,
                      top: `${photo.y}%`,
                      width: `${photo.size}%`,
                      transform: `translate(-50%, -50%) rotate(${photo.rotate}deg)`,
                    }}
                  >
                    <img src={photo.src} alt="" className="pointer-events-none h-full w-full rounded-[6px] object-cover" crossOrigin="anonymous" draggable={false} />
                    {activePhotoId === photo.id && (
                      <div data-share-editor-control className="absolute inset-0 rounded-[7px] ring-2 ring-inset ring-[#EF575B]">
                        <button type="button" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); fileInputRef.current?.click(); }} disabled={storyPhotos.length >= 5} aria-label="사진 추가하기" className="absolute -left-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#2DBE73] text-white shadow disabled:opacity-40"><Plus size={14} /></button>
                        <button type="button" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); removePhoto(photo.id); }} aria-label="사진 삭제하기" className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#F05258] text-white shadow"><Minus size={14} /></button>
                        <button type="button" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); updatePhoto(photo.id, { rotate: photo.rotate - 15 }); }} aria-label="사진 반시계 방향 회전" className="absolute -bottom-3 -left-3 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#4776E6] text-white shadow"><RotateCcw size={14} /></button>
                        <button type="button" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); updatePhoto(photo.id, { rotate: photo.rotate + 15 }); }} aria-label="사진 시계 방향 회전" className="absolute -bottom-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#4776E6] text-white shadow"><RotateCw size={14} /></button>
                      </div>
                    )}
                  </div>
                ))}
              <div className="absolute inset-x-[5%] bottom-[3.5%] z-20 opacity-50">
                <OneLineReviewBox compact className="min-h-[38px] px-5 py-2 shadow-sm">
                  <p className="line-clamp-1 text-left text-[11px] font-black text-[#36251F]">{post?.caption || course.description}</p>
                </OneLineReviewBox>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={event => { void addPhoto(event.target.files?.[0]); event.currentTarget.value = ''; }} />
          </motion.div>
        </div>

        <div className="mt-4 px-5 text-center">
          <h2 className="text-[18px] font-black text-[#33231D]">{selectedTemplate.name}</h2>
          <p className="mt-1 text-[11px] font-semibold text-[#9A8377]">사진을 드래그하고, 휠 또는 두 손가락으로 크기를 조절하세요</p>
          <p className="mt-0.5 text-[10px] font-semibold text-[#B29A8E]">9:16 · 스토리 공유용 · 전체 {SHARE_TEMPLATES.length}종</p>
        </div>

        <div aria-label="9:16 스토리 템플릿 선택" className="mt-4 flex snap-x gap-2.5 overflow-x-auto px-5 pb-3 scrollbar-hide">
          {SHARE_TEMPLATES.map((template, index) => (
            <button
              key={template.id}
              type="button"
              onClick={() => {
                setSelectedIndex(index);
                setActivePhotoId(null);
              }}
              aria-label={`${template.name} 선택`}
              aria-pressed={selectedIndex === index}
              className={`w-[66px] shrink-0 snap-start rounded-[13px] border-2 p-1 transition ${selectedIndex === index ? 'border-[#EF5A5E] bg-[#FFF0EC]' : 'border-[#E9DCD5] bg-white'}`}
            >
              <img src={template.background} alt="" className="aspect-[9/16] w-full rounded-[9px] object-cover" />
            </button>
          ))}
        </div>

      </section>

      <section className="mx-5 mt-4 rounded-[22px] border border-[#EEDDD5] bg-white px-4 py-4 shadow-[0_8px_22px_rgba(91,57,42,0.07)]">
        <p className="text-[12px] font-black text-[#4A342A]">어디에 공유할까요?</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button type="button" onClick={shareToStory} disabled={sharing} className="flex flex-col items-center gap-1.5 rounded-2xl bg-[#EF575B] px-2 py-3 text-white disabled:opacity-60">
            <Instagram size={20} /><span className="text-[10px] font-black">IG 스토리</span>
          </button>
          <button type="button" onClick={copyCourseLink} className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#E7DCD5] bg-[#FFFDFC] px-2 py-3 text-[#71877B]">
            <Link2 size={20} /><span className="text-[10px] font-black">앱 링크</span>
          </button>
          <button type="button" onClick={saveImage} disabled={sharing} className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#E7DCD5] bg-[#FFFDFC] px-2 py-3 text-[#897367] disabled:opacity-60">
            <Download size={20} /><span className="text-[10px] font-black">저장하기</span>
          </button>
        </div>
      </section>

      <div className="page-bottom-bar fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 gap-2 border-t border-[#F0E1D9] bg-[#FFFDFC]/96 px-4 backdrop-blur">
        <button type="button" onClick={shareToStory} disabled={sharing} className="flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#EF575B] text-[13px] font-black text-white disabled:opacity-60">
          <Share2 size={16} /> {sharing ? '이미지 만드는 중…' : '스토리에 공유'}
        </button>
        <button type="button" onClick={() => navigate('/feed')} className="h-13 flex-1 rounded-2xl border border-[#E9D9D1] bg-white text-[13px] font-black text-[#6B554B]">Munchie 홈으로</button>
      </div>
    </main>
  );
}
