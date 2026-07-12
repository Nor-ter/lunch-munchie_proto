/**
 * Munchie Feed 작성 흐름
 * ① 코스 선택 → ② 사진/한줄평 작성 → ③ 게시 완료
 * (피드 카드는 기본 테마 고정 — 스킨 선택 단계 없음)
 */
import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { ChevronLeft, Check, Plus, MapPin, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import { useApp, type Course, type FeedPost } from '@/contexts/AppContext';
import FeedPostCard from '@/components/munchie/FeedPostCard';
import { fileToResizedDataUrl } from '@/lib/imageUtils';

const STEP_TITLES = ['코스 선택', '사진/한줄평 작성', '게시 완료'];

function CourseSelectItem({ course, selected, onSelect }: { course: Course; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 rounded-2xl border bg-white p-3 text-left transition-all active:scale-[0.99]"
      style={{ borderColor: selected ? '#E85053' : '#F0E8E0', borderWidth: selected ? 2 : 1 }}
    >
      <img src={course.heroImage} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-[14px] text-[#1A1A1A] truncate">{course.title}</p>
        <p className="text-[12px] text-[#9B9B9B] mt-0.5">
          {course.metadata.distance}km · {Math.floor(course.metadata.duration / 60)}h · {course.metadata.placeCount} 스팟
        </p>
      </div>
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
        style={{ background: selected ? '#E85053' : '#F0F0F0' }}
      >
        {selected && <Check size={14} color="white" strokeWidth={3} />}
      </span>
    </button>
  );
}

export default function FeedComposePage() {
  const [, navigate] = useLocation();
  const { courses, savedCourseIds, getRestaurantById, profile, addFeedPost } = useApp();

  const [step, setStep] = useState(0);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [published, setPublished] = useState<FeedPost | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 저장한 코스 먼저 보여준다 (와이어프레임 "저장된 내 코스")
  const sortedCourses = useMemo(() => {
    const saved = courses.filter(c => savedCourseIds.includes(c.id));
    const rest = courses.filter(c => !savedCourseIds.includes(c.id));
    return [...saved, ...rest];
  }, [courses, savedCourseIds]);

  const course = courseId ? courses.find(c => c.id === courseId) : undefined;

  // 사진 후보: 선택한 코스의 스팟 이미지 + 직접 업로드
  const photoChoices = useMemo(() => {
    const stopImages = course
      ? [course.heroImage, ...course.stops.map(s => getRestaurantById(s.placeId)?.image).filter((v): v is string => !!v)]
      : [];
    return Array.from(new Set([...stopImages, ...uploaded]));
  }, [course, uploaded, getRestaurantById]);

  const togglePhoto = (src: string) => {
    setPhotos(prev => prev.includes(src) ? prev.filter(p => p !== src) : [...prev, src]);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    for (const f of files) {
      try {
        const url = await fileToResizedDataUrl(f, 800, 0.8);
        setUploaded(prev => [...prev, url]);
        setPhotos(prev => [...prev, url]);
      } catch {
        toast.error('사진을 불러오지 못했어요');
      }
    }
  };

  const canNext =
    step === 0 ? !!courseId :
    step === 1 ? photos.length > 0 && caption.trim().length > 0 : true;

  const goNext = () => {
    if (!canNext) return;
    if (step === 1) {
      // 게시 — 피드 카드는 기본 테마 고정
      const post = addFeedPost({
        authorId: profile.id,
        authorName: profile.name,
        authorEmoji: profile.emoji,
        courseId: courseId!,
        photos,
        caption: caption.trim(),
        skinId: 'default',
        tags: course?.tags ?? [],
      });
      setPublished(post);
      setStep(2);
      return;
    }
    setStep(s => s + 1);
  };

  const goBack = () => {
    if (step === 0 || step === 2) navigate('/feed');
    else setStep(s => s - 1);
  };

  return (
    <div className="min-h-dvh bg-[#FCF4EE] pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#FCF4EE]/95 backdrop-blur px-4 pt-10 pb-3">
        <div className="flex items-center justify-between">
          <button onClick={goBack} className="w-9 h-9 bg-white rounded-full shadow flex items-center justify-center">
            {step === 2 ? <X size={18} /> : <ChevronLeft size={20} />}
          </button>
          <p className="font-bold text-[16px] text-[#1A1A1A]">{STEP_TITLES[step]}</p>
          <span className="w-9" />
        </div>
        {/* Progress dots */}
        <div className="mt-3 flex justify-center gap-1.5">
          {STEP_TITLES.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{ width: i === step ? 22 : 6, background: i <= step ? '#EB5053' : '#EDDCD2' }}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22 }}
          className="px-4 pt-4"
        >
          {/* ① 코스 선택 */}
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-[13px] font-semibold text-[#9B9B9B] px-1">저장된 내 코스</p>
              {sortedCourses.map(c => (
                <CourseSelectItem key={c.id} course={c} selected={courseId === c.id} onSelect={() => setCourseId(c.id)} />
              ))}
            </div>
          )}

          {/* ② 사진/한줄평 작성 */}
          {step === 1 && course && (
            <div>
              <div className="grid grid-cols-3 gap-2">
                {photoChoices.map(src => {
                  const order = photos.indexOf(src);
                  return (
                    <button key={src} onClick={() => togglePhoto(src)} className="relative aspect-square rounded-xl overflow-hidden active:scale-95 transition-transform">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      {order >= 0 && (
                        <>
                          <span className="absolute inset-0 bg-[#E85053]/25 border-2 border-[#E85053] rounded-xl" />
                          <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#E85053] text-white text-[12px] font-bold flex items-center justify-center">
                            {order + 1}
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-[#E0D2C6] flex items-center justify-center text-[#B0A090] active:scale-95 transition-transform"
                >
                  <Plus size={26} />
                </button>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
              </div>

              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="한줄평을 남겨보세요. 예) 이자카야를 다녀왔다. 맛있었다. 추천~!"
                rows={3}
                className="mt-4 w-full rounded-2xl bg-white border border-[#F0E8E0] p-4 text-[14px] outline-none focus:border-[#E85053] resize-none"
              />

              <div className="mt-3 rounded-2xl bg-white border border-[#F0E8E0] px-4 py-3">
                <p className="text-[12px] font-semibold text-[#E85053] flex items-center gap-1">
                  <MapPin size={12} /> 코스 · {course.title}
                </p>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-[#9B9B9B]">
                  <span className="flex items-center gap-1"><MapPin size={10} /> {course.metadata.distance}km</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {Math.floor(course.metadata.duration / 60)}h</span>
                  <span>📍 {course.metadata.placeCount} spots</span>
                </div>
              </div>
            </div>
          )}

          {/* ③ 게시 완료 */}
          {step === 2 && published && (
            <div>
              <div className="text-center mb-5">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                  className="text-5xl mb-2"
                >
                  🎉
                </motion.div>
                <p className="font-bold text-[18px] text-[#1A1A1A]">게시 완료!</p>
                <p className="text-[13px] text-[#9B9B9B] mt-1">먼치 피드에 기록이 올라갔어요</p>
              </div>
              <FeedPostCard post={published} interactive={false} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom CTA */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[398px] z-30">
        {step < 2 ? (
          <motion.button
            whileTap={{ scale: canNext ? 0.97 : 1 }}
            onClick={goNext}
            disabled={!canNext}
            className="w-full h-[52px] rounded-2xl text-white font-bold text-[15px] shadow-lg transition-colors"
            style={{ background: canNext ? '#EB5053' : '#E5CFC5' }}
          >
            {step === 1 ? '게시하기' : '다음'}
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/feed')}
            className="w-full h-[52px] rounded-2xl text-white font-bold text-[15px] shadow-lg"
            style={{ background: '#EB5053' }}
          >
            Munchie Feed 보러가기
          </motion.button>
        )}
      </div>
    </div>
  );
}
