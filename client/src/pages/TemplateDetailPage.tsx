import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useParams, useSearch } from 'wouter';
import { Bookmark, ChevronDown, ChevronLeft, Clock3, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApp, type Course } from '@/contexts/AppContext';
import { getTemplateById, getTemplateForCourse } from '@/constants/coursemapTemplates';
import TemplateArtwork from '@/components/munchie/TemplateArtwork';
import TemplateInfoSheet from '@/components/munchie/TemplateInfoSheet';
import OneLineReviewBox from '@/components/munchie/OneLineReviewBox';

export default function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const [infoOpen, setInfoOpen] = useState(false);
  const {
    getCourseById,
    deleteProfileTemplate,
    feedPosts,
    savedCourseIds,
    saveCourse,
    unsaveCourse,
  } = useApp();
  const searchParams = new URLSearchParams(search);
  const courseId = searchParams.get('course') ?? undefined;
  const sourceParam = searchParams.get('from');
  const source = sourceParam === 'profile' || sourceParam === 'saved' ? sourceParam : 'feed';
  const backPath = source === 'profile' ? '/profile' : source === 'saved' ? '/saved' : '/feed?tab=template';
  const backLabel = source === 'profile'
    ? '프로필로 돌아가기'
    : source === 'saved'
      ? '저장목록으로 돌아가기'
      : '템플릿 목록으로 돌아가기';
  const linkedPost = courseId ? feedPosts.find(post => post.courseId === courseId) : undefined;
  const linkedCourse = courseId ? getCourseById(courseId) : undefined;
  const fallbackCourse: Course | undefined = courseId && linkedPost ? {
    id: courseId,
    title: '',
    description: linkedPost.caption,
    heroImage: linkedPost.photos[0] ?? '',
    tags: linkedPost.tags,
    hashtags: [],
    region: 'Munchie 커뮤니티',
    metadata: { distance: 0, duration: 0, placeCount: Math.min(linkedPost.photos.length, 3) },
    stops: [],
    createdAt: linkedPost.createdAt,
    isPublic: true,
    creatorId: linkedPost.authorId ?? '',
    savedCount: 0,
  } : undefined;
  const course = linkedCourse ?? fallbackCourse;
  const authorReview = linkedPost?.caption.trim() || course?.description.trim() || '';
  const fallbackTemplateIndex = Math.max(feedPosts.findIndex(post => post.courseId === courseId), 0);
  const template = getTemplateById(templateId) ?? (course ? getTemplateForCourse(course.id, fallbackTemplateIndex) : undefined);
  const isSaved = course ? savedCourseIds.includes(course.id) : false;

  const editTemplate = () => {
    if (!course || !template) return;
    navigate(`/course/${course.id}/edit?from=profile`);
  };

  const deleteTemplate = () => {
    if (!course) return;
    if (!window.confirm('이 템플릿을 삭제할까요? 원본 코스와 피드는 그대로 유지돼요.')) return;
    deleteProfileTemplate(course.id);
    toast.success('나의 템플릿에서 삭제했어요');
    navigate('/profile', { replace: true });
  };

  const toggleSave = () => {
    if (!course) return;
    isSaved ? unsaveCourse(course.id) : saveCourse(course.id);
    toast.success(isSaved ? '저장을 해제했어요' : '코스를 저장했어요');
  };

  if (!template || !course) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#FCF4EE] px-6">
        <div className="text-center">
          <p className="text-[17px] font-bold text-[#2D211C]">템플릿을 찾을 수 없어요</p>
          <button
            onClick={() => navigate(backPath)}
            className="mt-4 h-11 rounded-full bg-[#E85053] px-6 text-[14px] font-bold text-white"
          >
            {source === 'profile' ? '프로필로' : source === 'saved' ? '저장목록으로' : '템플릿 목록으로'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <motion.main
      className="page-with-bottom-action mx-auto min-h-dvh max-w-[430px] overflow-x-hidden bg-[#FCF4EE]"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <header className="flex items-center justify-between px-4 pb-3 pt-4">
        <div className="flex w-[84px] justify-start">
          <button
            onClick={() => navigate(backPath)}
            aria-label={backLabel}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          aria-label={`${template.name} 템플릿 기본 양식 보기`}
          className="rounded-xl px-3 py-1 text-center active:bg-white/70"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B09A8C]">Munchie Template</p>
          <span className="mt-0.5 flex items-center justify-center gap-1 text-[15px] font-bold text-[#2D211C]">
            {template.name} <ChevronDown size={14} color="#9D887C" />
          </span>
        </button>
        {source === 'profile' ? (
          <div className="flex w-[84px] justify-end gap-2">
            <button
              type="button"
              onClick={editTemplate}
              aria-label="템플릿 수정"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#6C574C] shadow-sm"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={deleteTemplate}
              aria-label="템플릿 삭제"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF0F0] text-[#D94447] shadow-sm"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ) : <div className="h-10 w-[84px]" aria-hidden="true" />}
      </header>

      <section className="px-5">
        <div
          className="mx-auto rounded-[28px] bg-white p-2.5 shadow-[0_18px_45px_rgba(91,57,42,0.16)]"
          style={{ width: 'min(100%, 350px, calc((100dvh - 330px) * 0.75))' }}
        >
          <TemplateArtwork course={course} template={template} photoSources={linkedPost?.photos} decorOverride={linkedPost?.decor} className="rounded-[20px]" eager />
        </div>
      </section>

      <section className="px-4 pb-3 pt-4">
        {course.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {course.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-[#FDE1E1] px-2.5 py-1 text-[11px] font-bold text-[#D94447]">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className={`${course.tags.length > 0 ? 'mt-3' : ''} flex flex-nowrap items-center justify-start gap-3 border-y border-[#EADFD8] py-3 text-[12px] font-semibold text-[#5E4B42]`}>
          <span className="flex shrink-0 items-center gap-1.5"><Clock3 size={14} color="#E85053" />{Math.floor(course.metadata.duration / 60)}시간</span>
          <span className="shrink-0">{course.metadata.placeCount}개 스팟</span>
        </div>
      </section>

      {authorReview && (
        <section data-ui="template-author-review" className="px-3 pt-1">
          <p className="mb-1.5 text-[10px] font-black tracking-[0.08em] text-[#B89E91]">작성자의 한줄평</p>
          <OneLineReviewBox compact>
            <p className="break-words text-[12px] font-bold leading-5 text-[#3B2A23]">{authorReview}</p>
          </OneLineReviewBox>
        </section>
      )}

      <div className="page-bottom-action-bar page-bottom-bar">
        <button
          onClick={toggleSave}
          aria-label={isSaved ? '코스 저장 해제' : '코스 저장'}
          className="page-bottom-action-secondary"
        >
          <Bookmark size={19} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={() => navigate(`/course/${course.id}?from=template-detail&template=${template.id}&templateFrom=${source}`)}
          className="page-bottom-action-primary"
        >
          상세 코스 보기
        </button>
      </div>
      <TemplateInfoSheet template={infoOpen ? template : null} onClose={() => setInfoOpen(false)} />
    </motion.main>
  );
}
