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
import { MOCK_COURSE } from '@/data/mockCourse';
import { useCourseShare } from '@/hooks/useCourseShare';
import StoryTemplate from '@/components/share/templates/StoryTemplate';
import PngTemplate from '@/components/share/templates/PngTemplate';
import MinimalTemplate from '@/components/share/templates/MinimalTemplate';
import ListTemplate from '@/components/share/templates/ListTemplate';
import PolaroidTemplate from '@/components/share/templates/PolaroidTemplate';
import DarkStoryTemplate from '@/components/share/templates/DarkStoryTemplate';
import StatsCardTemplate from '@/components/share/templates/StatsCardTemplate';
import StravaClassicTemplate from '@/components/share/templates/StravaClassicTemplate';
import StravaCoralTemplate from '@/components/share/templates/StravaCoralTemplate';
import StravaMonoTemplate from '@/components/share/templates/StravaMonoTemplate';
import StravaNeonTemplate from '@/components/share/templates/StravaNeonTemplate';
import StravaCompactTemplate from '@/components/share/templates/StravaCompactTemplate';

// ── Types ─────────────────────────────────────────────────────────────────────

type Platform =
  | 'ig-story'
  | 'ig-feed'
  | 'kakao'
  | 'threads'
  | 'tiktok'
  | 'message'
  | 'save';

const TEMPLATE_INFO: { name: string; desc: string; aspect?: string }[] = [
  { name: '스토리', desc: '배경 포함' },
  { name: 'PNG', desc: '배경 투명' },
  { name: '미니멀', desc: '지도+제목' },
  { name: '리스트형', desc: '장소 목록' },
  { name: '폴라로이드', desc: '감성 스냅' },
  { name: '다크', desc: '나이트 모드' },
  { name: '요약 카드', desc: '거리·시간' },
  { name: '스트라바', desc: '오렌지 루트', aspect: 'PNG · 투명' },
  { name: '스트라바 코랄', desc: '글로우 루트', aspect: 'PNG · 투명' },
  { name: '스트라바 모노', desc: '미니멀 라인', aspect: 'PNG · 투명' },
  { name: '스트라바 네온', desc: '시작·종료', aspect: 'PNG · 투명' },
  { name: '맵 only', desc: '루트만', aspect: 'PNG · 투명' },
];

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

const CARD_WIDTH = 256;
const TEMPLATE_COUNT = TEMPLATE_INFO.length;

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
      className={`flex-shrink-0 transition-all duration-200 ${
        selected ? 'ring-2 ring-[#FF6B5B] rounded-2xl scale-[1.02]' : 'opacity-70'
      }`}
      style={{ scrollSnapAlign: 'center' }}
    >
      {children}
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

  const course = MOCK_COURSE;
  const { captureCard, downloadImage } = useCourseShare();

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
    const offsetX = container.clientWidth / 2 - 120;
    const index = Math.round((center - offsetX - 120) / CARD_WIDTH);
    setSelectedTemplate(Math.max(0, Math.min(TEMPLATE_COUNT - 1, index)));
  }, []);

  const handleShare = async () => {
    const el = cardRefs.current[selectedTemplate];
    if (!el) return;
    setIsCapturing(true);
    try {
      const dataUrl = await captureCard({ current: el });
      const slug = TEMPLATE_INFO[selectedTemplate].name.replace(/\s/g, '-');
      downloadImage(dataUrl, `lunchie-${slug}.png`);
      toast.success(PLATFORM_TOAST[selectedPlatform]);
    } catch {
      toast.error('이미지 저장에 실패했습니다.');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <motion.div
      className="max-w-[430px] mx-auto bg-white min-h-screen"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-4 py-3 flex items-center border-b border-gray-100">
        <button onClick={goBack}>
          <ChevronLeft size={22} />
        </button>
        <span className="flex-1 text-center font-semibold">공유하기</span>
        <span className="text-xs text-gray-400">← 넘겨보기 →</span>
      </div>

      <div className="mt-4 pb-4">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto"
          style={{
            scrollSnapType: 'x mandatory',
            paddingLeft: 'calc(50% - 120px)',
            paddingRight: 'calc(50% - 120px)',
            scrollbarWidth: 'none',
          }}
        >
          <TemplateSlide selected={selectedTemplate === 0}>
            <StoryTemplate ref={setCardRef(0)} course={course} />
          </TemplateSlide>
          <TemplateSlide selected={selectedTemplate === 1}>
            <PngTemplate ref={setCardRef(1)} course={course} />
          </TemplateSlide>
          <TemplateSlide selected={selectedTemplate === 2}>
            <MinimalTemplate ref={setCardRef(2)} course={course} />
          </TemplateSlide>
          <TemplateSlide selected={selectedTemplate === 3}>
            <ListTemplate ref={setCardRef(3)} course={course} />
          </TemplateSlide>
          <TemplateSlide selected={selectedTemplate === 4}>
            <PolaroidTemplate ref={setCardRef(4)} course={course} />
          </TemplateSlide>
          <TemplateSlide selected={selectedTemplate === 5}>
            <DarkStoryTemplate ref={setCardRef(5)} course={course} />
          </TemplateSlide>
          <TemplateSlide selected={selectedTemplate === 6}>
            <StatsCardTemplate ref={setCardRef(6)} course={course} />
          </TemplateSlide>
          <TemplateSlide selected={selectedTemplate === 7}>
            <StravaClassicTemplate ref={setCardRef(7)} course={course} />
          </TemplateSlide>
          <TemplateSlide selected={selectedTemplate === 8}>
            <StravaCoralTemplate ref={setCardRef(8)} course={course} />
          </TemplateSlide>
          <TemplateSlide selected={selectedTemplate === 9}>
            <StravaMonoTemplate ref={setCardRef(9)} course={course} />
          </TemplateSlide>
          <TemplateSlide selected={selectedTemplate === 10}>
            <StravaNeonTemplate ref={setCardRef(10)} course={course} />
          </TemplateSlide>
          <TemplateSlide selected={selectedTemplate === 11}>
            <StravaCompactTemplate ref={setCardRef(11)} course={course} />
          </TemplateSlide>
        </div>
      </div>

      <div className="text-center mt-3">
        <p className="text-sm font-semibold">{TEMPLATE_INFO[selectedTemplate].name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {TEMPLATE_INFO[selectedTemplate].aspect ?? '9:16'}
          {TEMPLATE_INFO[selectedTemplate].desc && ` · ${TEMPLATE_INFO[selectedTemplate].desc}`}
        </p>
      </div>

      <div className="flex justify-center gap-1.5 mt-2 flex-wrap px-4 max-w-[320px] mx-auto">
        {TEMPLATE_INFO.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-200 ${
              i === selectedTemplate ? 'w-4 h-1.5 bg-[#FF6B5B]' : 'w-1.5 h-1.5 bg-gray-200'
            }`}
          />
        ))}
      </div>

      <div className="mt-4 px-4 border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-400 mb-3">어디에 공유할까요?</p>

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
                className="flex flex-col items-center gap-1 flex-shrink-0 min-w-[64px]"
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    active ? 'bg-[#FFF0EE]' : 'bg-gray-100'
                  }`}
                >
                  <Icon size={22} className={active ? 'text-[#FF6B5B]' : 'text-gray-400'} />
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">{label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleShare}
          disabled={isCapturing}
          className="w-full mt-4 mb-6 bg-[#FF6B5B] text-white rounded-xl h-11 text-sm font-medium disabled:opacity-60"
        >
          {isCapturing ? '저장 중...' : PLATFORM_LABELS[selectedPlatform]}
        </button>
      </div>
    </motion.div>
  );
}
