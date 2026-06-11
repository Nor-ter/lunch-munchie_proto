import { useRef, useState, useCallback } from 'react';
import { useParams, useLocation, useSearch } from 'wouter';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Instagram,
  MessageCircle,
  Download,
  Share2,
  Send,
  AtSign,
  Music2,
} from 'lucide-react';
import { toast } from 'sonner';
import { getCourseById } from '@/data/mockCourse';
import { useCourseShare } from '@/hooks/useCourseShare';
import FoodCourseStoryTemplate from '@/components/share/templates/FoodCourseStoryTemplate';
import StravaDarkTemplate from '@/components/share/templates/StravaDarkTemplate';
import StravaMinimalTemplate from '@/components/share/templates/StravaMinimalTemplate';
import FoodCourseDarkTemplate from '@/components/share/templates/FoodCourseDarkTemplate';

// ── Types ─────────────────────────────────────────────────────────────────────

type Platform =
  | 'ig-story'
  | 'ig-feed'
  | 'kakao'
  | 'threads'
  | 'tiktok'
  | 'message'
  | 'save';

const TEMPLATES = [
  { name: '푸드 코스', desc: '지도 + 일정', aspect: '9:16' },
  { name: '스트라바', desc: '오렌지 루트 + 통계', aspect: '9:16' },
  { name: '미니멀', desc: '루트만', aspect: '9:16' },
  { name: '다크 스토리', desc: '풀스크린 지도', aspect: '9:16' },
] as const;

const PLATFORMS: {
  id: Platform;
  label: string;
  Icon: React.FC<{ size?: number; className?: string }>;
}[] = [
  { id: 'ig-story', label: 'IG 스토리', Icon: Instagram },
  { id: 'ig-feed', label: 'IG 피드', Icon: Share2 },
  { id: 'kakao', label: '카카오톡', Icon: Send },
  { id: 'threads', label: '스레드', Icon: AtSign },
  { id: 'tiktok', label: '틱톡', Icon: Music2 },
  { id: 'message', label: '메시지', Icon: MessageCircle },
  { id: 'save', label: '갤러리', Icon: Download },
];

const PLATFORM_LABELS: Record<Platform, string> = {
  'ig-story': '스토리에 공유',
  'ig-feed': '피드에 공유',
  kakao: '카카오톡으로 보내기',
  threads: '스레드에 공유',
  tiktok: '틱톡에 공유',
  message: '메시지로 보내기',
  save: '이미지 저장',
};

const PLATFORM_TOAST: Record<Platform, string> = {
  'ig-story': '이미지가 저장되었습니다. Instagram 스토리에 업로드해주세요!',
  'ig-feed': '이미지가 저장되었습니다. Instagram 피드에 업로드해주세요!',
  kakao: '이미지가 저장되었습니다. 카카오톡에서 사진을 보내주세요!',
  threads: '이미지가 저장되었습니다. Threads에 업로드해주세요!',
  tiktok: '이미지가 저장되었습니다. TikTok에 업로드해주세요!',
  message: '이미지가 저장되었습니다. 메시지 앱에서 공유해주세요!',
  save: '갤러리에 저장되었습니다!',
};

const CARD_WIDTH = 290;
const TEMPLATE_COUNT = TEMPLATES.length;

// ── Template carousel item ────────────────────────────────────────────────────

function TemplateSlide({
  selected,
  children,
}: {
  selected: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex-shrink-0 transition-all duration-300 ${
        selected ? 'scale-100' : 'scale-[0.92] opacity-60'
      }`}
      style={{ scrollSnapAlign: 'center' }}
    >
      <div
        className={`rounded-[22px] overflow-hidden transition-shadow duration-300 ${
          selected ? 'shadow-[0_8px_32px_rgba(0,0,0,0.18)] ring-2 ring-[#EB5053]' : 'shadow-[0_4px_16px_rgba(0,0,0,0.08)]'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

// ── CourseSharePage ───────────────────────────────────────────────────────────

function useShareFrom(): 'saved' | 'edit' | null {
  const search = useSearch();
  const from = new URLSearchParams(search).get('from');
  if (from === 'saved' || from === 'edit') return from;
  return null;
}

export default function CourseSharePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const shareFrom = useShareFrom();

  const goBack = () => {
    if (!id) {
      navigate(-1 as never);
      return;
    }
    if (shareFrom === 'saved') navigate(`/course/${id}?from=saved`);
    else if (shareFrom === 'edit') navigate(`/course/${id}/edit`);
    else navigate(-1 as never);
  };

  const course = getCourseById(id);
  const { saveImageToDevice } = useCourseShare();

  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('ig-story');
  const [isCapturing, setIsCapturing] = useState(false);

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const setCardRef = (index: number) => (el: HTMLDivElement | null) => {
    cardRefs.current[index] = el;
  };

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const center = container.scrollLeft + container.clientWidth / 2;
    const offsetX = container.clientWidth / 2 - CARD_WIDTH / 2;
    const index = Math.round((center - offsetX - CARD_WIDTH / 2) / (CARD_WIDTH + 16));
    setSelectedTemplate(Math.max(0, Math.min(TEMPLATE_COUNT - 1, index)));
  }, []);

  const handleShare = async () => {
    const el = cardRefs.current[selectedTemplate];
    if (!el) return;
    setIsCapturing(true);
    try {
      const slug = TEMPLATES[selectedTemplate].name.replace(/\s/g, '-');
      const filename = `lunchie-${course.id}-${slug}.png`;
      const method = await saveImageToDevice(
        { current: el },
        filename,
        { preferNativeShare: selectedPlatform !== 'save' }
      );

      if (selectedPlatform === 'save') {
        toast.success('이미지가 다운로드 폴더에 저장되었습니다!');
      } else if (method === 'share') {
        toast.success('공유 메뉴에서 저장하거나 보낼 수 있어요!');
      } else {
        toast.success(PLATFORM_TOAST[selectedPlatform]);
      }
    } catch (e) {
      console.error('Failed to save share image:', e);
      toast.error('이미지 저장에 실패했습니다.');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <motion.div
      className="max-w-[430px] mx-auto bg-[#FAFAFA] min-h-screen"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center bg-white border-b border-gray-100">
        <button onClick={goBack} className="w-9 h-9 flex items-center justify-center -ml-1">
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 text-center">
          <p className="font-semibold text-[15px]">코스맵 공유하기</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{course.title}</p>
        </div>
        <div className="w-9" />
      </div>

      {/* Preview area */}
      <div className="pt-6 pb-2 bg-gradient-to-b from-white to-[#FAFAFA]">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto pb-4"
          style={{
            scrollSnapType: 'x mandatory',
            paddingLeft: 'calc(50% - 145px)',
            paddingRight: 'calc(50% - 145px)',
            scrollbarWidth: 'none',
          }}
        >
          <TemplateSlide selected={selectedTemplate === 0}>
            <FoodCourseStoryTemplate ref={setCardRef(0)} course={course} />
          </TemplateSlide>
          <TemplateSlide selected={selectedTemplate === 1}>
            <StravaDarkTemplate ref={setCardRef(1)} course={course} />
          </TemplateSlide>
          <TemplateSlide selected={selectedTemplate === 2}>
            <StravaMinimalTemplate ref={setCardRef(2)} course={course} />
          </TemplateSlide>
          <TemplateSlide selected={selectedTemplate === 3}>
            <FoodCourseDarkTemplate ref={setCardRef(3)} course={course} />
          </TemplateSlide>
        </div>
      </div>

      {/* Template info */}
      <div className="text-center px-4">
        <p className="text-[15px] font-bold text-[#1A1A1A]">
          {TEMPLATES[selectedTemplate].name}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {TEMPLATES[selectedTemplate].aspect} · {TEMPLATES[selectedTemplate].desc}
        </p>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-3">
        {TEMPLATES.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setSelectedTemplate(i);
              const container = scrollContainerRef.current;
              if (container) {
                const offset = i * (CARD_WIDTH + 16);
                container.scrollTo({ left: offset, behavior: 'smooth' });
              }
            }}
            className={`rounded-full transition-all duration-200 ${
              i === selectedTemplate ? 'w-5 h-1.5 bg-[#EB5053]' : 'w-1.5 h-1.5 bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Course quick stats */}
      <div className="mx-4 mt-5 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex justify-around text-center">
          <div>
            <p className="text-lg font-bold text-[#1A1A1A]">{course.distanceKm}km</p>
            <p className="text-[10px] text-gray-400 mt-0.5">총 거리</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div>
            <p className="text-lg font-bold text-[#1A1A1A]">{course.durationHours}h</p>
            <p className="text-[10px] text-gray-400 mt-0.5">소요 시간</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div>
            <p className="text-lg font-bold text-[#1A1A1A]">{course.places.length}곳</p>
            <p className="text-[10px] text-gray-400 mt-0.5">방문 스팟</p>
          </div>
        </div>
      </div>

      {/* Platform picker */}
      <div className="mt-5 px-4 pb-8">
        <p className="text-xs text-gray-400 mb-3 font-medium">어디에 공유할까요?</p>

        <div
          className="flex gap-3 overflow-x-auto pb-2"
          style={{ scrollbarWidth: 'none' }}
        >
          {PLATFORMS.map(({ id: pid, label, Icon }) => {
            const active = selectedPlatform === pid;
            return (
              <button
                key={pid}
                onClick={() => setSelectedPlatform(pid)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 min-w-[64px]"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    active
                      ? 'bg-[#EB5053] text-white shadow-md shadow-[#EB5053]/30'
                      : 'bg-white text-gray-400 border border-gray-100'
                  }`}
                >
                  <Icon size={20} />
                </div>
                <span
                  className={`text-[11px] whitespace-nowrap ${
                    active ? 'text-[#EB5053] font-medium' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleShare}
          disabled={isCapturing}
          className="w-full mt-5 bg-[#1A1A1A] text-white rounded-2xl h-12 text-sm font-semibold disabled:opacity-60 active:scale-[0.98] transition-transform"
        >
          {isCapturing ? '저장 중...' : PLATFORM_LABELS[selectedPlatform]}
        </button>
      </div>
    </motion.div>
  );
}
