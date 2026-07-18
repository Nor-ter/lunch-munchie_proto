import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bookmark, Map, MoreHorizontal, Send, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import {
  isFeedCommentHidden,
  type FeedPost,
  useApp,
} from '@/contexts/AppContext';
import { getTemplateByIndex } from '@/constants/coursemapTemplates';
import { getCourseById as getMockCourseById } from '@/data/mockCourse';
import { getCoursePlacesFromStops } from '@/lib/courseMapSync';
import { lunchmateLoadoutFromProfile } from '@/utils/lunchmateProfile';
import LunchmateCharacterRenderer from '@/components/munchie/LunchmateCharacterRenderer';
import TemplateArtwork from '@/components/munchie/TemplateArtwork';

const CHARACTER_POSITIONS = [
  { left: '10%', top: '12%', state: 'idle' as const },
  { left: '61%', top: '39%', state: 'foodAvailable' as const },
  { left: '21%', top: '72%', state: 'reaction' as const },
];

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return '오늘';
  if (days < 7) return `${days}일 전`;
  const date = new Date(iso);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export default function UnifiedMunchieCard({
  post,
  compact = false,
}: {
  post: FeedPost;
  compact?: boolean;
}) {
  const [, navigate] = useLocation();
  const {
    courses,
    profile,
    getCourseById,
    getRestaurantById,
    addFeedComment,
    savedCourseIds,
    saveCourse,
    unsaveCourse,
  } = useApp();
  const [comment, setComment] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);
  const course = getCourseById(post.courseId);
  const courseSaved = savedCourseIds.includes(post.courseId);
  const courseIndex = course ? Math.max(courses.findIndex(item => item.id === course.id), 0) : 0;
  const template = getTemplateByIndex(courseIndex);
  const loadout = useMemo(
    () => lunchmateLoadoutFromProfile(profile.lunchmateLoadout),
    [profile.lunchmateLoadout],
  );
  const syncedPlaces = course ? getCoursePlacesFromStops(course, getRestaurantById) : [];
  const places = syncedPlaces.length > 0
    ? syncedPlaces
    : getMockCourseById(post.courseId).places;
  const visibleComments = post.comments.filter(commentItem => !isFeedCommentHidden(commentItem));
  const commentsToShow = showAllComments ? visibleComments : visibleComments.slice(0, compact ? 1 : 2);

  if (!course) return null;

  const submitComment = () => {
    if (!comment.trim()) return;
    addFeedComment(post.id, comment.trim());
    setComment('');
    toast.success('한줄평을 남겼어요! ✍️');
  };

  return (
    <article
      className="overflow-hidden rounded-[26px] border border-[#E9DED5] bg-white shadow-[0_12px_34px_rgba(72,45,32,0.08)]"
      data-testid={`unified-munchie-card-${post.id}`}
    >
      <div className="flex items-center gap-2.5 px-3.5 pb-2.5 pt-3.5">
        <button
          type="button"
          onClick={() => post.authorId && navigate(`/profile/${post.authorId}`)}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#F0D8D1] bg-[#FFF4F0] text-[17px]">
            {post.authorEmoji}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-black text-[#2B211D]">{post.authorName}</span>
            <span className="block truncate text-[10px] font-semibold text-[#A08D82]">
              {course.region} · {timeAgo(post.createdAt)}
            </span>
          </span>
        </button>
        <span className="rounded-full bg-[#FFF1EC] px-2 py-1 text-[9px] font-black text-[#F25055]">
          {course.metadata.placeCount} SPOTS
        </span>
        <button type="button" aria-label="게시물 메뉴" className="text-[#A08D82]">
          <MoreHorizontal size={18} />
        </button>
      </div>

      <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(116px,0.9fr)] gap-2.5 px-3.5">
        <button
          type="button"
          onClick={() => navigate(`/template/${template.id}?course=${course.id}&from=feed`)}
          className="relative aspect-[3/4] min-w-0 overflow-hidden rounded-[20px] border border-[#E7D8CE] bg-[#F6EEE8] text-left"
          aria-label={`${course.title} 템플릿 열기`}
        >
          <TemplateArtwork
            course={course}
            template={template}
            className="absolute inset-0 h-full w-full rounded-none"
            eager
            showLabel={false}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/[0.03] via-transparent to-black/[0.12]" />

          {places.slice(0, 3).map((place, index) => {
            const position = CHARACTER_POSITIONS[index]!;
            return (
              <span
                key={place.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: position.left, top: position.top }}
              >
                <span className="relative flex h-[50px] w-[50px] items-center justify-center rounded-full border-2 border-white bg-white/90 shadow-[0_6px_14px_rgba(48,32,24,0.18)]">
                  <LunchmateCharacterRenderer
                    flowState={position.state}
                    loadout={loadout}
                    size={42}
                    renderSize="compact"
                    animated={false}
                  />
                  <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#FF424B] px-1 text-[9px] font-black text-white">
                    {index + 1}
                  </span>
                </span>
              </span>
            );
          })}

          <span className="absolute bottom-2.5 left-2.5 right-2.5 rounded-xl bg-white/90 px-2.5 py-2 shadow-sm backdrop-blur-sm">
            <span className="block truncate text-[11px] font-black text-[#2B211D]">{course.title}</span>
            <span className="mt-0.5 block truncate text-[9px] font-semibold text-[#917B70]">
              캐릭터를 따라가는 {places.slice(0, 3).length}곳의 맛집 코스
            </span>
          </span>
        </button>

        <div className="flex min-w-0 flex-col gap-2">
          <div className="relative min-h-[86px] rounded-2xl bg-[#FFF6F2] px-3 py-3">
            <span className="absolute left-2 top-0 font-serif text-[28px] leading-none text-[#F25055]">“</span>
            <p className="line-clamp-4 pt-1 text-[11px] font-semibold leading-relaxed text-[#3C2C25]">
              {post.caption}
            </p>
            <span className="absolute bottom-[-8px] right-2 font-serif text-[28px] leading-none text-[#F6B1A7]">”</span>
          </div>

          <div className="rounded-2xl border border-[#EEE2D9] bg-[#FFFCFA] p-2">
            <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#B0998D]">Course route</p>
            <div className="space-y-1.5">
              {places.slice(0, 3).map((place, index) => (
                <button
                  type="button"
                  key={place.id}
                  onClick={() => navigate(`/course/${course.id}?from=feed`)}
                  className="flex w-full items-center gap-1.5 text-left"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FF424B] text-[9px] font-black text-white">
                    {index + 1}
                  </span>
                  <span className="line-clamp-2 text-[9.5px] font-bold leading-tight text-[#4B3930]">{place.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-1.5">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate(`/course/${course.id}?from=feed`)}
              className="col-span-2 flex h-9 items-center justify-center gap-1 rounded-xl bg-[#FF424B] text-[10px] font-black text-white"
            >
              <Map size={12} /> 코스 보기
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                courseSaved ? unsaveCourse(course.id) : saveCourse(course.id);
                toast.success(courseSaved ? '저장을 해제했어요' : '코스를 저장했어요! 🔖');
              }}
              className="flex h-9 items-center justify-center gap-1 rounded-xl border border-[#F0CFC7] bg-white text-[10px] font-black text-[#F25055]"
            >
              <Bookmark size={12} fill={courseSaved ? 'currentColor' : 'none'} /> 저장
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => toast('공유 링크를 복사했어요! 🔗')}
              className="flex h-9 items-center justify-center gap-1 rounded-xl border border-[#F0CFC7] bg-white text-[10px] font-black text-[#F25055]"
            >
              <Share2 size={12} /> 공유
            </motion.button>
          </div>
        </div>
      </div>

      <div className="mx-3.5 mt-3 overflow-hidden rounded-2xl border border-[#EEE2D9] bg-[#FFFCFA]">
        <div className="space-y-2 px-3 py-2.5">
          {commentsToShow.length > 0 ? commentsToShow.map(commentItem => (
            <div key={commentItem.id} className="flex items-start gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFF0EB] text-[11px]">
                {commentItem.authorEmoji}
              </span>
              <p className="min-w-0 flex-1 text-[10.5px] leading-relaxed text-[#5C473D]">
                <strong className="mr-1 font-black text-[#33251F]">{commentItem.authorName}</strong>
                {commentItem.text}
              </p>
            </div>
          )) : (
            <p className="text-[10px] font-semibold text-[#A89489]">첫 번째 한줄평을 남겨보세요.</p>
          )}
        </div>
        {visibleComments.length > commentsToShow.length && (
          <button
            type="button"
            onClick={() => setShowAllComments(true)}
            className="w-full border-t border-[#EEE2D9] py-2 text-[10px] font-black text-[#F25055]"
          >
            한줄평 {visibleComments.length}개 더보기
          </button>
        )}
      </div>

      {!compact && (
        <div className="mx-3.5 mb-3.5 mt-2.5 flex h-11 items-center rounded-full border border-[#E6D7CE] bg-white px-3.5">
          <input
            value={comment}
            onChange={event => setComment(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && submitComment()}
            placeholder="한줄평 입력"
            className="min-w-0 flex-1 bg-transparent text-[12px] text-[#2B211D] outline-none placeholder:text-[#B5A49B]"
          />
          <button type="button" onClick={submitComment} aria-label="한줄평 등록" className="text-[#F25055]">
            <Send size={18} />
          </button>
        </div>
      )}
    </article>
  );
}
