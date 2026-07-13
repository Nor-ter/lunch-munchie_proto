import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { type Course } from '@/contexts/AppContext';
import { getTemplateByIndex } from '@/constants/coursemapTemplates';
import { getCreatorName } from '@/constants/creators';
import TemplateArtwork from '@/components/munchie/TemplateArtwork';

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
  from?: 'feed' | 'template' | 'profile' | 'saved';
  showAuthor?: boolean;
}) {
  const [, navigate] = useLocation();
  const template = getTemplateByIndex(index);

  const handleOpen = () => {
    if (from === 'template' || from === 'profile' || from === 'saved') {
      const source = from === 'profile' ? '&from=profile' : '';
      navigate(`/template/${template.id}?course=${course.id}${source}`);
      return;
    }
    navigate(`/course/${course.id}?from=${from}`);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={handleOpen}
      className="text-left w-full"
    >
      <TemplateArtwork course={course} template={template} className="rounded-xl shadow-sm" />

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
