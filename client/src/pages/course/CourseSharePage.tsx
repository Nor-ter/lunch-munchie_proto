/**
 * Munchie Mode — Course Share
 * hi-branch: 4-template carousel + platform selector + image capture
 */

import { useRef, useState, useCallback } from 'react';
import { useParams, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ChevronLeft, Instagram, MessageCircle, Download, Share2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { MOCK_COURSE } from '@/data/mockCourse';
import { useCourseShare } from '@/hooks/useCourseShare';
import { CourseMap } from '@/components/course/CourseMap';

type Platform = 'ig-story' | 'ig-feed' | 'kakao' | 'message' | 'save';

// ── Inline Templates ──────────────────────────────────────────────────────────

function StoryCard({ course }: { course: typeof MOCK_COURSE }) {
  return (
    <div style={{ width: 240, height: 380, background: '#fff', padding: 20, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', borderRadius: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: '#9E9E9E' }}>@{course.authorHandle}</span>
        <span style={{ fontSize: 10, color: '#9E9E9E' }}>My Course Map</span>
      </div>
      <p style={{ fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', margin: '10px 0 0' }}>{course.title}</p>
      <p style={{ fontSize: 12, color: '#EB5053', fontStyle: 'italic', margin: '4px 0 12px' }}>맛있는 하루 코스 ♥</p>
      <CourseMap places={course.places} width={200} height={140} />
      <p style={{ fontSize: 11, color: '#4A4A4A', marginTop: 12, flexGrow: 1 }}>{course.places.map(p => p.name).join(' → ')}</p>
      <div style={{ borderTop: '1px solid #EB505330', paddingTop: 6 }}>
        <span style={{ fontSize: 10, color: '#EB5053', fontWeight: 700 }}>Lunchie Munchie</span>
      </div>
    </div>
  );
}

function MinimalCard({ course }: { course: typeof MOCK_COURSE }) {
  return (
    <div style={{ width: 240, height: 380, background: '#fff', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', gap: 8, borderRadius: 20, position: 'relative' }}>
      <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 9, color: '#9E9E9E' }}>My Course Map</span>
      <p style={{ fontSize: 20, fontWeight: 'bold', color: '#1A1A1A', margin: 0, textAlign: 'center', padding: '0 20px' }}>{course.title}</p>
      <p style={{ fontSize: 12, color: '#EB5053', margin: 0 }}>맛있는 하루 코스 ♥</p>
      <CourseMap places={course.places} width={200} height={150} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', padding: '0 16px' }}>
        {course.hashtags.map(h => (
          <span key={h} style={{ fontSize: 10, color: '#9E9E9E' }}>#{h}</span>
        ))}
      </div>
    </div>
  );
}

function ListCard({ course }: { course: typeof MOCK_COURSE }) {
  return (
    <div style={{ width: 240, height: 380, background: 'linear-gradient(160deg, #FFF8F2 0%, #FFE8D6 100%)', boxSizing: 'border-box', fontFamily: 'sans-serif', borderRadius: 20, overflow: 'hidden', padding: 20 }}>
      <div style={{ background: '#EB5053', borderRadius: 10, padding: '4px 10px', display: 'inline-block', marginBottom: 10 }}>
        <span style={{ fontSize: 10, color: 'white', fontWeight: 700 }}>LUNCHIE MUNCHIE</span>
      </div>
      <p style={{ fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', margin: '0 0 4px' }}>{course.title}</p>
      <p style={{ fontSize: 10, color: '#9B9B9B', margin: '0 0 14px' }}>{course.distanceKm}km · {course.durationHours}h</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {course.places.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#EB5053', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#1A1A1A', margin: 0 }}>{p.name}</p>
              <p style={{ fontSize: 10, color: '#9B9B9B', margin: 0 }}>{p.category} · {p.distance}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
        <div style={{ height: 1, background: '#EB505330', marginBottom: 6 }} />
        <span style={{ fontSize: 9, color: '#EB5053', fontWeight: 700 }}>🍱 Lunchie Munchie</span>
      </div>
    </div>
  );
}

function DarkCard({ course }: { course: typeof MOCK_COURSE }) {
  return (
    <div style={{ width: 240, height: 380, background: '#111', boxSizing: 'border-box', fontFamily: 'sans-serif', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column' }}>
      <p style={{ fontSize: 10, color: '#EB5053', fontWeight: 700, margin: '0 0 8px' }}>LUNCHIE MUNCHIE</p>
      <p style={{ fontSize: 17, fontWeight: 'bold', color: '#fff', margin: '0 0 4px' }}>{course.title}</p>
      <p style={{ fontSize: 11, color: '#666', margin: '0 0 14px' }}>@{course.authorHandle}</p>
      <CourseMap places={course.places} width={200} height={140} />
      <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#EB5053', margin: 0 }}>{course.distanceKm}km</p>
          <p style={{ fontSize: 9, color: '#666', margin: 0 }}>거리</p>
        </div>
        <div style={{ width: 1, background: '#333' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#EB5053', margin: 0 }}>{course.durationHours}h</p>
          <p style={{ fontSize: 9, color: '#666', margin: 0 }}>시간</p>
        </div>
        <div style={{ width: 1, background: '#333' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#EB5053', margin: 0 }}>{course.places.length}</p>
          <p style={{ fontSize: 9, color: '#666', margin: 0 }}>스팟</p>
        </div>
      </div>
    </div>
  );
}

// ── Template config ───────────────────────────────────────────────────────────

const TEMPLATES = [
  { id: 'story', name: '스토리형', desc: '배경 포함' },
  { id: 'minimal', name: '미니멀', desc: '지도+제목' },
  { id: 'list', name: '리스트형', desc: '장소 목록' },
  { id: 'dark', name: '다크', desc: '나이트 모드' },
];

const PLATFORMS: { id: Platform; label: string; Icon: React.FC<{ size?: number; className?: string }> }[] = [
  { id: 'ig-story', label: 'IG 스토리', Icon: Instagram },
  { id: 'ig-feed', label: 'IG 피드', Icon: Share2 },
  { id: 'kakao', label: '카카오톡', Icon: Send },
  { id: 'message', label: '메시지', Icon: MessageCircle },
  { id: 'save', label: '갤러리', Icon: Download },
];

const PLATFORM_LABELS: Record<Platform, string> = {
  'ig-story': '스토리에 공유',
  'ig-feed': '피드에 공유',
  kakao: '카카오톡으로 보내기',
  message: '메시지로 보내기',
  save: '이미지 저장',
};

const PLATFORM_TOAST: Record<Platform, string> = {
  'ig-story': '이미지가 저장됐어요! Instagram 스토리에 업로드해주세요!',
  'ig-feed': '이미지가 저장됐어요! Instagram 피드에 업로드해주세요!',
  kakao: '이미지가 저장됐어요! 카카오톡에서 사진을 보내주세요!',
  message: '이미지가 저장됐어요! 메시지 앱에서 공유해주세요!',
  save: '갤러리에 저장됐어요!',
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CourseSharePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const course = MOCK_COURSE;
  const { captureCard, downloadImage } = useCourseShare();

  const [selected, setSelected] = useState(0);
  const [platform, setPlatform] = useState<Platform>('ig-story');
  const [isCapturing, setIsCapturing] = useState(false);

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleShare = useCallback(async () => {
    const el = cardRefs.current[selected];
    if (!el) return;
    setIsCapturing(true);
    try {
      const dataUrl = await captureCard({ current: el });
      downloadImage(dataUrl, `lunchie-${TEMPLATES[selected]!.id}.png`);
      toast.success(PLATFORM_TOAST[platform]);
    } catch {
      toast.error('이미지 저장에 실패했습니다.');
    } finally {
      setIsCapturing(false);
    }
  }, [selected, platform, captureCard, downloadImage]);

  const renderTemplate = (idx: number) => {
    const tId = TEMPLATES[idx]!.id;
    if (tId === 'story') return <StoryCard course={course} />;
    if (tId === 'minimal') return <MinimalCard course={course} />;
    if (tId === 'list') return <ListCard course={course} />;
    return <DarkCard course={course} />;
  };

  return (
    <motion.div
      className="max-w-[430px] mx-auto bg-white min-h-dvh"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center border-b border-gray-100 sticky top-0 bg-white z-10">
        <button onClick={() => navigate(-1 as never)}>
          <ChevronLeft size={22} />
        </button>
        <span className="flex-1 text-center font-semibold">공유하기</span>
        <span className="text-xs text-gray-400">← 넘겨보기 →</span>
      </div>

      {/* Template carousel */}
      <div
        className="flex gap-4 overflow-x-auto mt-6 pb-2"
        style={{ scrollSnapType: 'x mandatory', paddingLeft: 'calc(50% - 120px)', paddingRight: 'calc(50% - 120px)', scrollbarWidth: 'none' }}
      >
        {TEMPLATES.map((tpl, i) => (
          <div
            key={tpl.id}
            onClick={() => setSelected(i)}
            style={{ scrollSnapAlign: 'center', flexShrink: 0 }}
            className={`cursor-pointer transition-all duration-200 ${i === selected ? 'ring-2 ring-[#EB5053] rounded-[20px] scale-[1.03]' : 'opacity-60'}`}
          >
            <div ref={el => { cardRefs.current[i] = el; }}>
              {renderTemplate(i)}
            </div>
          </div>
        ))}
      </div>

      {/* Template info */}
      <div className="text-center mt-4">
        <p className="text-sm font-semibold text-[#1A1A1A]">{TEMPLATES[selected]!.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">9:16 · {TEMPLATES[selected]!.desc}</p>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-2">
        {TEMPLATES.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-200 ${i === selected ? 'w-4 h-1.5 bg-[#EB5053]' : 'w-1.5 h-1.5 bg-gray-200'}`}
          />
        ))}
      </div>

      {/* Platform selector */}
      <div className="mt-5 px-4 border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wider">어디에 공유할까요?</p>
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {PLATFORMS.map(({ id: pid, label, Icon }) => {
            const active = platform === pid;
            return (
              <button
                key={pid}
                onClick={() => setPlatform(pid)}
                className="flex flex-col items-center gap-1 flex-shrink-0 min-w-[64px]"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${active ? 'bg-[#FFF0EE]' : 'bg-gray-100'}`}>
                  <Icon size={22} className={active ? 'text-[#EB5053]' : 'text-gray-400'} />
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">{label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => void handleShare()}
          disabled={isCapturing}
          className="w-full mt-4 mb-6 text-white rounded-xl h-11 text-sm font-semibold disabled:opacity-60"
          style={{ background: '#EB5053' }}
        >
          {isCapturing ? '저장 중...' : PLATFORM_LABELS[platform]}
        </button>
      </div>
    </motion.div>
  );
}
