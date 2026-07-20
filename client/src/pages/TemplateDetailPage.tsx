import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useParams, useSearch } from 'wouter';
import { Bookmark, ChevronDown, ChevronLeft, ChevronRight, Clock3, MapPin, MessageCircle, Pencil, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { isFeedCommentHidden, useApp, type Course, type Restaurant } from '@/contexts/AppContext';
import { getTemplateById, getTemplateForCourse } from '@/constants/coursemapTemplates';
import TemplateArtwork from '@/components/munchie/TemplateArtwork';
import TemplateInfoSheet from '@/components/munchie/TemplateInfoSheet';
import RestaurantDetailSheet from '@/components/munchie/RestaurantDetailSheet';

export default function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const [infoOpen, setInfoOpen] = useState(false);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [detailRestaurantId, setDetailRestaurantId] = useState<string | null>(null);
  const {
    getCourseById,
    getRestaurantById,
    deleteProfileTemplate,
    feedPosts,
    savedCourseIds,
    saveCourse,
    unsaveCourse,
  } = useApp();
  const searchParams = new URLSearchParams(search);
  const courseId = searchParams.get('course') ?? undefined;
  const source = searchParams.get('from') === 'profile' ? 'profile' : 'feed';
  const backPath = source === 'profile' ? '/profile' : '/feed?tab=template';
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
            {source === 'profile' ? '프로필로' : '템플릿 목록으로'}
          </button>
        </div>
      </main>
    );
  }

  const restaurants = course.stops
    .map((stop) => ({ stop, restaurant: getRestaurantById(stop.placeId) }))
    .filter((item): item is typeof item & { restaurant: Restaurant } => !!item.restaurant);
  const relatedPosts = feedPosts.filter(post => post.courseId === course.id);
  const recentComments = relatedPosts
    .flatMap(post => post.comments.filter(comment => !isFeedCommentHidden(comment)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 2);

  return (
    <motion.main
      className="mx-auto min-h-dvh max-w-[430px] bg-[#FCF4EE] pb-28"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <header className="flex items-center justify-between px-4 pb-3 pt-4">
        <div className="flex w-[84px] justify-start">
          <button
            onClick={() => navigate(backPath)}
            aria-label={source === 'profile' ? '프로필로 돌아가기' : '템플릿 목록으로 돌아가기'}
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
        <div className="mx-auto w-full max-w-[350px] rounded-[28px] bg-white p-2.5 shadow-[0_18px_45px_rgba(91,57,42,0.16)]">
          <TemplateArtwork course={course} template={template} photoSources={linkedPost?.photos} className="rounded-[20px]" eager />
        </div>
      </section>

      <section className="px-5 pb-4 pt-7">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {course.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-[#FDE1E1] px-2.5 py-1 text-[11px] font-bold text-[#D94447]">
              {tag}
            </span>
          ))}
        </div>
        <h1 className="text-[23px] font-bold leading-tight text-[#2D211C]">{course.title}</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[#8C776B]">{course.description}</p>
        <div className="mt-4 flex gap-4 border-y border-[#EADFD8] py-3 text-[12px] font-semibold text-[#5E4B42]">
          <span className="flex items-center gap-1.5"><MapPin size={14} color="#E85053" />{course.region}</span>
          <span className="flex items-center gap-1.5"><Clock3 size={14} color="#E85053" />{Math.floor(course.metadata.duration / 60)}시간</span>
          <span>{course.metadata.placeCount}개 스팟</span>
        </div>
      </section>

      <section className="px-5 pt-3">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#C2AFA4]">Places in template</p>
            <h2 className="mt-0.5 text-[18px] font-bold text-[#2D211C]">템플릿 속 식당</h2>
          </div>
          <span className="text-[12px] font-semibold text-[#9D887C]">{restaurants.length}곳</span>
        </div>
        <div className="space-y-2.5">
          {restaurants.map(({ stop, restaurant }) => {
            const selected = selectedRestaurantId === restaurant.id;
            return (
              <motion.article
                key={restaurant.id}
                drag={selected ? 'x' : false}
                dragConstraints={{ left: -90, right: 0 }}
                dragElastic={0.12}
                dragSnapToOrigin
                onDragEnd={(_, info) => {
                  if (info.offset.x < -55) setDetailRestaurantId(restaurant.id);
                }}
                onClick={() => setSelectedRestaurantId(current => current === restaurant.id ? null : restaurant.id)}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border bg-white p-3 shadow-[0_4px_16px_rgba(91,57,42,0.06)]"
                style={{
                  borderColor: selected ? '#E85053' : 'transparent',
                  touchAction: 'pan-y',
                }}
              >
                <div className="relative shrink-0">
                  <img src={restaurant.image} alt={restaurant.name} className="h-16 w-16 rounded-xl object-cover" />
                  <span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#E85053] text-[10px] font-black text-white">
                    {stop.order}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-[#2D211C]">{restaurant.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-[#9D887C]">{restaurant.category} · {restaurant.address}</p>
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#5E4B42]">
                    <Star size={11} fill="#E85053" color="#E85053" /> {restaurant.rating}
                    <span className="font-normal text-[#B09A8C]">· {stop.startTime}</span>
                  </p>
                  {selected && (
                    <motion.p
                      initial={{ opacity: 0, y: 2 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1 text-[10px] font-bold text-[#D94447]"
                    >
                      ← 밀어서 식당 상세·후기 보기
                    </motion.p>
                  )}
                </div>
                {selected && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDetailRestaurantId(restaurant.id);
                    }}
                    aria-label={`${restaurant.name} 상세보기`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E85053] text-white"
                  >
                    <ChevronRight size={16} />
                  </button>
                )}
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="px-5 pt-5">
        <button
          type="button"
          onClick={() => navigate(`/course/${course.id}/feeds?from=template-detail&template=${template.id}${source === 'profile' ? '&templateFrom=profile' : ''}`)}
          className="flex w-full items-center gap-3 rounded-2xl border border-[#F2D8D3] bg-white p-3.5 text-left shadow-[0_4px_16px_rgba(91,57,42,0.06)] active:scale-[0.99]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FDE1E1] text-[#D94447]">
            <MessageCircle size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-black text-[#3B2A22]">이 코스로 만든 피드</span>
            <span className="mt-0.5 block text-[11px] text-[#9D887C]">
              {relatedPosts.length > 0 ? `피드 ${relatedPosts.length}개 · 댓글 ${recentComments.length}개` : '아직 올라온 피드가 없어요'}
            </span>
            {recentComments.length > 0 && (
              <span className="mt-1 block truncate text-[11px] text-[#6C574C]">
                “{recentComments[0]?.text}”
              </span>
            )}
          </span>
          <ChevronRight size={18} color="#B09A8C" />
        </button>
      </section>

      <div className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-[430px] -translate-x-1/2 gap-2 border-t border-[#F0E6DF] bg-white/95 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <button
          onClick={toggleSave}
          aria-label={isSaved ? '코스 저장 해제' : '코스 저장'}
          className="flex h-13 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#F0C8C8] text-[#E85053] active:scale-[0.99]"
        >
          <Bookmark size={19} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={() => navigate(`/course/${course.id}?from=template-detail&template=${template.id}${source === 'profile' ? '&templateFrom=profile' : ''}`)}
          className="flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#E85053] text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(232,80,83,0.25)] active:scale-[0.99]"
        >
          상세 코스 보기 <ChevronRight size={18} />
        </button>
      </div>
      <TemplateInfoSheet template={infoOpen ? template : null} onClose={() => setInfoOpen(false)} />
      <AnimatePresence>
        {detailRestaurantId && (
          <RestaurantDetailSheet
            restaurantId={detailRestaurantId}
            onClose={() => setDetailRestaurantId(null)}
          />
        )}
      </AnimatePresence>
    </motion.main>
  );
}
