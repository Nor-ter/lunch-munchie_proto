import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Bookmark, Heart, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { type Course, useApp } from '@/contexts/AppContext';
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
  const { savedCourseIds, saveCourse, unsaveCourse, feedPosts } = useApp();
  const template = getTemplateByIndex(index);
  const isSaved = savedCourseIds.includes(course.id);
  const relatedFeedCount = feedPosts.filter(post => post.courseId === course.id).length;

  const handleOpen = () => {
    if (from === 'template' || from === 'profile' || from === 'saved') {
      const source = from === 'profile' ? '&from=profile' : '';
      navigate(`/template/${template.id}?course=${course.id}${source}`);
      return;
    }
    navigate(`/course/${course.id}?from=${from}`);
  };

  const toggleSave = () => {
    isSaved ? unsaveCourse(course.id) : saveCourse(course.id);
    toast.success(isSaved ? '저장을 해제했어요' : '코스를 저장했어요');
  };

  return (
    <motion.article
      whileTap={{ scale: 0.96 }}
      className="text-left w-full"
    >
      <button type="button" onClick={handleOpen} className="block w-full text-left">
        <TemplateArtwork course={course} template={template} className="rounded-xl shadow-sm" />
      </button>

      {/* 카드 하단 정보 */}
      <button
        type="button"
        onClick={handleOpen}
        className="mt-1.5 block w-full px-0.5 text-center text-[11px] font-bold leading-tight line-clamp-2 text-[#3B2A22]"
      >
        {course.title}
      </button>
      <div className="mt-0.5 flex items-center justify-center gap-2 text-[10px] text-[#B09A8C]">
        <button type="button" onClick={handleOpen} className="flex items-center gap-1">
          <Heart size={9} fill="currentColor" /> {course.savedCount}
        </button>
        <button
          type="button"
          onClick={() => navigate(`/course/${course.id}/feeds?from=${from}`)}
          aria-label={`${course.title} 피드 보기`}
          className="flex items-center gap-1"
        >
          <MessageCircle size={9} /> {relatedFeedCount}
        </button>
        <button
          type="button"
          onClick={toggleSave}
          aria-label={isSaved ? `${course.title} 저장 해제` : `${course.title} 저장`}
          className="flex items-center gap-1"
          style={{ color: isSaved ? '#E85053' : undefined }}
        >
          <Bookmark size={9} fill={isSaved ? 'currentColor' : 'none'} /> 저장
        </button>
      </div>
      {showAuthor && (
        <p className="mt-1 flex items-center justify-center">
          <span className="rounded-full bg-[#FDE1E1] px-1.5 py-0.5 text-[9px] font-bold text-[#E85053]">
            @{getCreatorName(course.creatorId)}
          </span>
        </p>
      )}
    </motion.article>
  );
}
