import { displayLabel } from '@/lib/displayCopy';
import { countLabel } from '@/lib/displayCopy';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useParams, useSearch } from 'wouter';
import { Archive, Bookmark, ChevronDown, Clock3, MapPin, Pencil, Share2, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { useApp, type Course } from '@/contexts/AppContext';
import { getTemplateById, getTemplateForCourse } from '@/constants/coursemapTemplates';
import TemplateArtwork from '@/components/munchie/TemplateArtwork';
import TemplateInfoSheet from '@/components/munchie/TemplateInfoSheet';
import OneLineReviewBox from '@/components/munchie/OneLineReviewBox';
import { fromFeedPhotoPlacements } from '@/lib/coursemapDecor';
import BackButton from '@/components/ui/BackButton';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import { startGoogleAuth } from '@/services/authApi';

export default function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const [infoOpen, setInfoOpen] = useState(false);
  const auth = useAuthStatus();
  const {
    getCourseById,
    deleteProfileTemplate,
    feedPosts,
    savedCourseIds,
    saveCourse,
    unsaveCourse,
    isLoading,
  } = useApp();
  const searchParams = new URLSearchParams(search);
  const courseId = searchParams.get('course') ?? undefined;
  const sourceParam = searchParams.get('from');
  const source = sourceParam === 'profile' || sourceParam === 'saved' ? sourceParam : 'feed';
  const backPath = source === 'profile' ? '/profile' : source === 'saved' ? '/saved' : '/feed?tab=template';
  const backLabel = source === 'profile'
    ? "Back to profile"
    : source === 'saved'
      ? "Back to saved"
      : "Back to templates";
  const linkedPost = courseId ? feedPosts.find(post => post.courseId === courseId) : undefined;
  const linkedCourse = courseId ? getCourseById(courseId) : undefined;
  const fallbackCourse: Course | undefined = courseId && linkedPost ? {
    id: courseId,
    title: '',
    description: linkedPost.caption,
    heroImage: linkedPost.photos[0] ?? '',
    tags: linkedPost.tags,
    hashtags: [],
    region: "Munchie community",
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
  const linkedDecor = linkedPost
    ? linkedPost.decor?.length
      ? linkedPost.decor
      : fromFeedPhotoPlacements(linkedPost.photoPlacements, linkedPost.photos) ?? undefined
    : undefined;
  const isSaved = course ? savedCourseIds.includes(course.id) : false;

  const editTemplate = () => {
    if (!course || !template) return;
    navigate(`/course/${course.id}/edit?from=profile`);
  };

  const archiveTemplate = () => {
    if (!course) return;
    if (!window.confirm("Archive this template from your profile? The original course and post will stay.")) return;
    deleteProfileTemplate(course.id);
    toast.success("Template archived.");
    navigate('/profile', { replace: true });
  };

  const toggleSave = async () => {
    if (!course) return;
    if (!auth.data) {
      toast.error("Checking your login. Try again in a moment.");
      return;
    }
    if (auth.data.isAnonymous) {
      startGoogleAuth(window.location.pathname + window.location.search);
      return;
    }
    const succeeded = isSaved
      ? await unsaveCourse(course.id)
      : await saveCourse(course.id);
    if (succeeded) toast.success(isSaved ? "Removed from saved." : "Course saved.");
    else toast.error(isSaved ? "Couldn't unsave the course." : "Couldn't save the course.");
  };

  if ((!template || !course) && isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#FCF4EE] px-6 text-center">
        <div>
          <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-4 border-[#F3D4CA] border-t-[#E85053]" aria-hidden="true" />
          <p className="mt-3 text-sm font-bold text-[#9A8579]">Loading original post…</p>
        </div>
      </main>
    );
  }

  if (!template || !course) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#FCF4EE] px-6">
        <div className="text-center">
          <p className="text-[17px] font-bold text-[#2D211C]">Template not found</p>
          <button
            onClick={() => navigate(backPath)}
            className="mt-4 h-11 rounded-full bg-[#E85053] px-6 text-[14px] font-bold text-white"
          >
            {source === 'profile' ? "Profile" : source === 'saved' ? "Saved" : "Templates"}
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
      <header className="flex items-center justify-between px-5 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
        <div className="flex w-[84px] justify-start">
          <BackButton onClick={() => navigate(backPath)} aria-label={backLabel} />
        </div>
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          aria-label={`View ${template.name} template`}
          className="rounded-xl px-3 py-1 text-center active:bg-white/70"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B09A8C]">Munchie template</p>
          <span className="mt-0.5 flex items-center justify-center gap-1 text-[15px] font-bold text-[#2D211C]">
            {template.name} <ChevronDown size={14} color="#9D887C" />
          </span>
        </button>
        {source === 'profile' ? (
          <div className="flex w-[84px] justify-end gap-2">
            <button
              type="button"
              onClick={editTemplate}
              aria-label="Edit template"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#6C574C] shadow-sm"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={archiveTemplate}
              aria-label="Archive template"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF0F0] text-[#D94447] shadow-sm"
            >
              <Archive size={16} />
            </button>
          </div>
        ) : <div className="h-10 w-[84px]" aria-hidden="true" />}
      </header>

      <section className="px-5">
        <div
          className="mx-auto rounded-[28px] bg-white p-2.5 shadow-[0_18px_45px_rgba(91,57,42,0.16)]"
          style={{ width: 'min(100%, 350px, calc((100dvh - 330px) * 0.75))' }}
        >
          <TemplateArtwork course={course} template={template} photoSources={linkedPost?.photos} decorOverride={linkedDecor} strokesOverride={linkedPost?.canvasStrokes} className="rounded-[20px]" eager />
        </div>
      </section>

      <section className="px-4 pb-3 pt-4">
        {course.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {course.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-[#FDE1E1] px-2.5 py-1 text-[11px] font-bold text-[#D94447]">
                {displayLabel(tag)}
              </span>
            ))}
          </div>
        )}
        <div className={`${course.tags.length > 0 ? 'mt-3' : ''} flex flex-nowrap items-center justify-start gap-3 border-y border-[#EADFD8] py-3 text-[12px] font-semibold text-[#5E4B42]`}>
          <span className="flex shrink-0 items-center gap-1.5"><Clock3 size={14} color="#E85053" />{Math.floor(course.metadata.duration / 60)}hr</span>
          <span className="flex shrink-0 items-center gap-1" aria-label={countLabel(course.metadata.placeCount, 'place')}>
            <MapPin size={14} color="#E85053" aria-hidden="true" />
            {course.metadata.placeCount}
          </span>
          <span className="flex shrink-0 items-center gap-1"><ThumbsUp size={13} color="#E85053" />{linkedPost?.likes ?? 0}</span>
          <span className="flex shrink-0 items-center gap-1"><Share2 size={13} color="#E85053" />{linkedPost?.shares ?? 0}</span>
        </div>
      </section>

      {authorReview && (
        <section data-ui="template-author-review" className="px-3 pt-1">
          <p className="mb-1.5 text-[10px] font-black tracking-[0.08em] text-[#B89E91]">Creator's caption</p>
          <OneLineReviewBox compact className="!min-h-[40px] !px-6 !py-2">
            <p className="break-words text-[13px] font-bold leading-5 text-[#3B2A23]">{authorReview}</p>
          </OneLineReviewBox>
        </section>
      )}

      <div className="page-bottom-action-bar page-bottom-bar">
        <button
          onClick={() => void toggleSave()}
          aria-label={isSaved ? "Unsave course" : "Save course"}
          className="page-bottom-action-secondary"
        >
          <Bookmark size={19} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={() => navigate(`/course/${course.id}?from=template-detail&template=${template.id}&templateFrom=${source}`)}
          className="page-bottom-action-primary"
        >

          View course
        </button>
      </div>
      <TemplateInfoSheet template={infoOpen ? template : null} onClose={() => setInfoOpen(false)} />
    </motion.main>
  );
}
