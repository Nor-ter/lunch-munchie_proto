import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useApp, type Course } from '@/contexts/AppContext';
import { getTemplateByIndex } from '@/constants/coursemapTemplates';
import { getCreatorName } from '@/constants/creators';

/**
 * 템플릿 코스맵 카드 — 디자이너 템플릿(9:16)의 빈 포토슬롯에
 * 코스의 식당 사진을 채워 넣는다. 피드 코스맵 탭/프로필/저장 목록 공용.
 */
export default function TemplateCoursemapCard({
  course,
  index = 0,
  from = 'feed',
  showAuthor = false,
}: {
  course: Course;
  /** 템플릿 순환용 인덱스 */
  index?: number;
  from?: 'feed' | 'profile' | 'saved';
  showAuthor?: boolean;
}) {
  const [, navigate] = useLocation();
  const { getRestaurantById } = useApp();
  const template = getTemplateByIndex(index);

  // 슬롯 수만큼 사진 채우기 — 스팟 사진 우선, 모자라면 순환
  const photos = [
    ...course.stops.map(s => getRestaurantById(s.placeId)?.image).filter((v): v is string => !!v),
    course.heroImage,
  ];
  const dateLabel = course.createdAt.slice(0, 10).replace(/-/g, '/');

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={() => navigate(`/course/${course.id}?from=${from}`)}
      className="text-left w-full"
    >
      <div
        className="relative w-full overflow-hidden rounded-xl shadow-sm"
        style={{ aspectRatio: '9 / 16' }}
      >
        <img
          src={template.image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
          loading="lazy"
        />
        {/* 포토슬롯 채우기 */}
        {template.slots.map((slot, i) => (
          <div
            key={i}
            className="absolute overflow-hidden"
            style={{
              left: `${slot.left}%`,
              top: `${slot.top}%`,
              width: `${slot.width}%`,
              height: `${slot.height}%`,
              borderRadius: slot.radius ?? 0,
              transform: slot.rotate ? `rotate(${slot.rotate}deg)` : undefined,
            }}
          >
            <img
              src={photos[i % photos.length]}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
              loading="lazy"
            />
          </div>
        ))}
        {/* 코스명/날짜 라벨 (원본의 플레이스홀더 텍스트를 덮는 스티커) */}
        {template.label && (
          <div
            className="absolute flex flex-col items-center justify-center text-center px-1"
            style={{
              left: `${template.label.left}%`,
              top: `${template.label.top}%`,
              width: `${template.label.width}%`,
              height: `${template.label.height}%`,
              background: template.label.bg,
              borderRadius: 6,
              color: template.label.color,
              transform: template.label.rotate ? `rotate(${template.label.rotate}deg)` : undefined,
              boxShadow: template.label.bg ? '0 1px 3px rgba(0,0,0,0.08)' : undefined,
            }}
          >
            <p className="w-full truncate text-[9px] font-bold leading-tight">{course.title}</p>
            <p className="text-[7px] font-semibold opacity-70 leading-tight">{dateLabel}</p>
          </div>
        )}
      </div>

      {/* 카드 하단 정보 */}
      <p className="mt-1.5 px-0.5 text-center text-[11px] font-bold leading-tight line-clamp-2 text-[#3B2A22]">
        {course.title}
      </p>
      <p className="mt-0.5 flex items-center justify-center gap-1 text-[10px] text-[#B09A8C]">
        <Heart size={9} fill="currentColor" /> {course.savedCount} · {course.metadata.placeCount} 스팟
      </p>
      {showAuthor && (
        <p className="mt-1 flex items-center justify-center">
          <span className="rounded-full bg-[#FDE1E1] px-1.5 py-0.5 text-[9px] font-bold text-[#E85053]">
            @{getCreatorName(course.creatorId)}
          </span>
        </p>
      )}
    </motion.button>
  );
}
