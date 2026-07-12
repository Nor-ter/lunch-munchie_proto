import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useParams, useLocation, useSearch } from 'wouter';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Instagram,
  Download,
  Share2,
  Plus,
  RotateCw,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { getCourseById as getMockCourseById } from '@/data/mockCourse';
import { useCourseShare } from '@/hooks/useCourseShare';
import type { Course } from '@/types/course';
import { fileToResizedDataUrl } from '@/lib/imageUtils';
import { useApp } from '@/contexts/AppContext';
import { getCoursePlacesFromStops } from '@/lib/courseMapSync';

// ── Types ─────────────────────────────────────────────────────────────────────

type Platform = 'ig-story' | 'app-link' | 'save';

const templateNames = [
  '네컷 베이직', '네컷 컬러', '네컷 무드',
  '로드맵 체리', '로드맵 포토', '로드맵 피크닉', '로드맵 빈티지', '로드맵 컬러',
  '런치 트레이 레드', '런치 트레이 블루', '런치 트레이 피크닉',
  'CD 핑크', 'CD 컬러', 'CD 스크랩',
  '영수증 모노', '영수증 빈티지', '영수증 컬러',
  '티켓 클래식', '티켓 로맨틱',
] as const;

const TEMPLATES = templateNames.map((name, index) => ({
  name,
  desc: 'ZIP 디자인 · 사진 위치 편집 가능',
  aspect: '9:16',
  background: `/templates/munchie-share/template-${String(index + 1).padStart(2, '0')}.jpg`,
}));

const PLATFORMS: {
  id: Platform;
  label: string;
  Icon: React.FC<{ size?: number; className?: string }>;
}[] = [
  { id: 'ig-story', label: 'IG 스토리', Icon: Instagram },
  { id: 'app-link', label: '앱 링크', Icon: Share2 },
  { id: 'save', label: '이미지 저장', Icon: Download },
];

const PLATFORM_LABELS: Record<Platform, string> = {
  'ig-story': '스토리에 공유',
  'app-link': '앱 링크 공유하기',
  save: '이미지 저장',
};

const PLATFORM_TOAST: Record<Platform, string> = {
  'ig-story': '이미지가 저장되었습니다. Instagram 스토리에 업로드해주세요!',
  'app-link': '코스 앱 링크가 복사되었습니다!',
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

const DEFAULT_PHOTO_POSITIONS = [
  { left: 34, top: 112, rotate: -5 },
  { left: 166, top: 118, rotate: 5 },
  { left: 44, top: 250, rotate: 3 },
  { left: 164, top: 258, rotate: -4 },
  { left: 100, top: 370, rotate: 2 },
];

function captureSafeImageUrl(source: string) {
  if (source.startsWith('data:') || source.startsWith('/') || source.startsWith('blob:')) return source;
  return `/api/image-proxy?url=${encodeURIComponent(source)}`;
}

function EditablePhoto({
  src,
  index,
  canvasRef,
  onRemove,
  onAdd,
}: {
  src: string;
  index: number;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onRemove: () => void;
  onAdd: (file: File) => void;
}) {
  const position = DEFAULT_PHOTO_POSITIONS[index];
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(position.rotate);
  const photoRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const previousDistance = useRef<number | null>(null);
  const rotationGesture = useRef<{ pointerId: number; startAngle: number; startRotation: number } | null>(null);
  const [controlsVisible, setControlsVisible] = useState(false);

  useEffect(() => {
    const hideControlsOutside = (event: PointerEvent) => {
      if (!photoRef.current?.contains(event.target as Node)) setControlsVisible(false);
    };
    document.addEventListener('pointerdown', hideControlsOutside, true);
    return () => document.removeEventListener('pointerdown', hideControlsOutside, true);
  }, []);

  const distance = () => {
    const points = Array.from(pointers.current.values());
    if (points.length < 2) return null;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    setControlsVisible(true);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    previousDistance.current = distance();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const nextDistance = distance();
    if (nextDistance && previousDistance.current) {
      const ratio = nextDistance / previousDistance.current;
      setScale(current => Math.max(0.55, Math.min(2.5, current * ratio)));
      previousDistance.current = nextDistance;
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    previousDistance.current = distance();
  };

  const startRotation = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = photoRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    rotationGesture.current = {
      pointerId: event.pointerId,
      startAngle: Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180 / Math.PI,
      startRotation: rotation,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveRotation = (event: React.PointerEvent<HTMLButtonElement>) => {
    const gesture = rotationGesture.current;
    const rect = photoRef.current?.getBoundingClientRect();
    if (!gesture || gesture.pointerId !== event.pointerId || !rect) return;
    event.preventDefault();
    event.stopPropagation();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180 / Math.PI;
    setRotation(gesture.startRotation + angle - gesture.startAngle);
  };

  const endRotation = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (rotationGesture.current?.pointerId === event.pointerId) rotationGesture.current = null;
    event.stopPropagation();
  };

  return (
    <motion.div
      ref={photoRef}
      drag
      dragConstraints={canvasRef}
      dragMomentum={false}
      dragElastic={0}
      whileDrag={{ zIndex: 30, boxShadow: '0 10px 24px rgba(0,0,0,0.28)' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={event => {
        if (event.pointerType === 'mouse' && !rotationGesture.current) setControlsVisible(false);
      }}
      onWheel={event => {
        event.preventDefault();
        setScale(current => Math.max(0.55, Math.min(2.5, current + (event.deltaY < 0 ? 0.1 : -0.1))));
      }}
      className="group absolute h-[92px] w-[78px] cursor-grab active:cursor-grabbing"
      style={{ left: position.left, top: position.top, rotate: rotation, touchAction: 'none' }}
    >
      <div
        className="h-full w-full overflow-hidden rounded-[3px] border-[5px] border-white bg-white shadow-lg"
        style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
      >
        <img src={captureSafeImageUrl(src)} alt="" className="h-full w-full object-cover" draggable={false} />
      </div>
      <div data-share-editor-control className={`absolute -left-2.5 -right-2.5 -top-2.5 z-40 flex items-center justify-between transition-opacity group-hover:opacity-100 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}>
        <label
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-[#35B85A] text-white shadow-md"
          aria-label="사진 추가"
          onPointerDown={event => event.stopPropagation()}
          onClick={event => event.stopPropagation()}
        >
          <Plus size={16} strokeWidth={3} />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={event => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) onAdd(file);
            }}
          />
        </label>
        <button
          type="button"
          onPointerDown={event => event.stopPropagation()}
          onClick={event => { event.stopPropagation(); onRemove(); }}
          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#EB5053] text-white shadow-md"
          aria-label="사진 삭제"
        >
          <X size={15} strokeWidth={3} />
        </button>
      </div>
      <button
        type="button"
        data-share-editor-control
        onPointerDown={startRotation}
        onPointerMove={moveRotation}
        onPointerUp={endRotation}
        onPointerCancel={endRotation}
        className={`absolute -bottom-3 -right-3 z-40 flex h-8 w-8 touch-none items-center justify-center rounded-full border-2 border-white bg-[#4778E8] text-white shadow-md transition-opacity group-hover:opacity-100 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}
        aria-label="사진 회전"
      >
        <RotateCw size={16} strokeWidth={2.7} />
      </button>
    </motion.div>
  );
}

/** ZIP 디자인 배경 위에서 코스 사진을 자유롭게 드래그하는 9:16 공유 캔버스. */
const EditableZipTemplate = forwardRef<HTMLDivElement, {
  course: Course;
  background: string;
  editable: boolean;
}>(({ course, background, editable }, forwardedRef) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(forwardedRef, () => canvasRef.current as HTMLDivElement);
  const [photos, setPhotos] = useState(() => course.places
    .map(place => place.imageUrl)
    .filter((url): url is string => !!url)
    .slice(0, 5)
    .map((src, index) => ({ id: `initial-${index}`, src })));

  const addPhoto = async (file: File) => {
    if (photos.length >= 5) {
      toast.info('사진은 최대 5개까지 추가할 수 있어요');
      return;
    }
    try {
      const src = await fileToResizedDataUrl(file, 900, 0.8);
      setPhotos(previous => [...previous, { id: `upload-${Date.now()}`, src }]);
      toast.success('사진을 추가했어요');
    } catch {
      toast.error('사진을 불러오지 못했어요');
    }
  };

  return (
    <div
      ref={canvasRef}
      className="relative h-[516px] w-[290px] overflow-hidden bg-[#F4EEE9]"
      style={{ touchAction: 'none' }}
    >
      <img src={background} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      {editable && photos.map((photo, index) => (
        <EditablePhoto
          key={photo.id}
          src={photo.src}
          index={index}
          canvasRef={canvasRef}
          onRemove={() => setPhotos(previous => previous.filter(item => item.id !== photo.id))}
          onAdd={addPhoto}
        />
      ))}
      {editable && photos.length === 0 && (
        <label data-share-editor-control className="absolute left-1/2 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[#35B85A] bg-white/90 px-6 py-5 text-[#239845] shadow-lg">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#35B85A] text-white">
            <Plus size={22} strokeWidth={3} />
          </span>
          <span className="text-[12px] font-bold">사진 추가</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={event => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) addPhoto(file);
            }}
          />
        </label>
      )}
      <div className="pointer-events-none absolute bottom-4 left-1/2 max-w-[240px] -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-center text-[10px] font-bold text-[#3B2A22] backdrop-blur-sm">
        {course.title}
      </div>
    </div>
  );
});

EditableZipTemplate.displayName = 'EditableZipTemplate';

// ── CourseSharePage ───────────────────────────────────────────────────────────

function useShareNavigation() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const from = params.get('from');
  const shareFrom = from === 'saved' || from === 'edit' || from === 'create' ? from : null;
  const editorFrom = params.get('editorFrom') === 'saved' ? 'saved' : 'explore';
  return { shareFrom, editorFrom } as const;
}

export default function CourseSharePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { shareFrom, editorFrom } = useShareNavigation();
  const { getCourseById: getAppCourseById, getRestaurantById, profile } = useApp();

  const goBack = () => {
    if (!id) {
      navigate('/explore', { replace: true });
      return;
    }
    if (shareFrom === 'saved') {
      navigate(`/course/${id}?from=saved`, { replace: true });
    } else if (shareFrom === 'edit' || shareFrom === 'create') {
      navigate(`/course/${id}/edit?from=${editorFrom}`, { replace: true });
    } else {
      navigate(`/course/${id}?from=explore`, { replace: true });
    }
  };

  const appCourse = id ? getAppCourseById(id) : undefined;
  const syncedPlaces = useMemo(
    () => appCourse ? getCoursePlacesFromStops(appCourse, getRestaurantById) : [],
    [appCourse, getRestaurantById],
  );
  const fallbackCourse = getMockCourseById(id);
  const course: Course = appCourse
    ? {
        id: appCourse.id,
        authorHandle: profile.name,
        followerCount: '',
        title: appCourse.title,
        subtitle: appCourse.description,
        region: appCourse.region,
        date: appCourse.createdAt,
        hashtags: appCourse.hashtags,
        distanceKm: appCourse.metadata.distance,
        durationHours: Math.round((appCourse.metadata.duration / 60) * 10) / 10,
        saveCount: appCourse.savedCount,
        places: syncedPlaces,
      }
    : fallbackCourse;
  const [customPhotos] = useState<Array<string | null>>(() => {
    if (!id) return [];
    try {
      const saved = localStorage.getItem(`lm_course_share_photos_${id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const shareCourse: Course = customPhotos.length > 0
    ? {
        ...course,
        places: course.places.map((place, index) => customPhotos[index] ? { ...place, imageUrl: customPhotos[index]! } : place),
      }
    : course;
  const { saveImageToDevice, copyLink } = useCourseShare();

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
    if (selectedPlatform === 'app-link') {
      try {
        const url = `${window.location.origin}/course/${course.id}`;
        if (navigator.share) {
          await navigator.share({ title: course.title, text: 'Lunchie Munchie 코스를 확인해보세요!', url });
          toast.success('앱 링크를 공유했어요!');
        } else {
          await copyLink(course.id);
          toast.success(PLATFORM_TOAST['app-link']);
        }
      } catch {
        // 사용자가 네이티브 공유 시트를 닫은 경우에도 화면은 그대로 유지한다.
      }
      return;
    }
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

  const finishTemplate = () => {
    toast.success('템플릿을 완성했어요!');
    navigate('/feed?tab=template', { replace: true });
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
          <p className="font-semibold text-[15px]">Munchie 템플릿 에디터 / 공유하기</p>
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
          {TEMPLATES.map((template, index) => (
            <TemplateSlide key={template.background} selected={selectedTemplate === index}>
              <EditableZipTemplate
                ref={setCardRef(index)}
                course={shareCourse}
                background={template.background}
                editable={selectedTemplate === index}
              />
            </TemplateSlide>
          ))}
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
        <p className="mt-2 text-[11px] font-medium text-[#EB5053]">사진을 드래그·핀치하고 파란 아이콘으로 회전하세요</p>
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

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={handleShare}
            disabled={isCapturing}
            className="bg-[#EB5053] text-white rounded-2xl h-12 px-2 text-[13px] font-semibold disabled:opacity-60 active:scale-[0.98] transition-transform"
          >
            {isCapturing ? '저장 중...' : PLATFORM_LABELS[selectedPlatform]}
          </button>
          <button
            onClick={finishTemplate}
            className="bg-[#EB5053] text-white rounded-2xl h-12 px-2 text-[13px] font-semibold active:scale-[0.98] transition-transform"
          >
            템플릿 완성 및 홈으로
          </button>
        </div>
      </div>
    </motion.div>
  );
}
