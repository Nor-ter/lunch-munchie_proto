import { useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Bookmark, Share2, Map, Send, MoreHorizontal, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useApp, isFeedCommentHidden, type FeedPost } from '@/contexts/AppContext';
import { getCourseSequenceColor } from '@/constants/courseTheme';
import { getTemplateByIndex } from '@/constants/coursemapTemplates';
import { getCourseById as getMockCourseById } from '@/data/mockCourse';
import { getCoursePlacesFromStops } from '@/lib/courseMapSync';
import TemplateArtwork from '@/components/munchie/TemplateArtwork';

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return '오늘';
  if (days < 7) return `${days}일 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** Munchie Feed 게시물 카드 — 기본 테마 고정(스킨 미적용) + 사진 캐러셀 + 한줄평 + 코스 미니 타임라인 */
export default function FeedPostCard({
  post,
  interactive = true,
}: {
  post: FeedPost;
  /** false면 작성 완료 미리보기용 (버튼·입력 비활성) */
  interactive?: boolean;
}) {
  const [, navigate] = useLocation();
  const {
    courses, getCourseById, getRestaurantById,
    addFeedComment, toggleCommentHidden, isMyPost,
    savedCourseIds, saveCourse, unsaveCourse,
  } = useApp();
  // 소셜 피드 카드는 기본 템플릿 테마로 고정 — 스킨은 코스맵(내 것)에만 적용된다
  const course = getCourseById(post.courseId);
  const courseSaved = savedCourseIds.includes(post.courseId);
  const mine = isMyPost(post);
  // 숨김 처리된 댓글은 피드 어디서든 노출되지 않는다 (프로필에서 숨김 → 일괄 적용)
  const visibleComments = post.comments.filter(c => !isFeedCommentHidden(c));

  const [photoIdx, setPhotoIdx] = useState(0);
  const [comment, setComment] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setPhotoIdx(Math.round(el.scrollLeft / el.clientWidth));
  };

  const goNextSlide = () => {
    const el = scrollRef.current;
    if (!el || slideCount <= 1) return;
    const nextIdx = (photoIdx + 1) % slideCount;
    el.scrollTo({ left: nextIdx * el.clientWidth, behavior: 'smooth' });
    setPhotoIdx(nextIdx);
  };

  const submitComment = () => {
    if (!comment.trim()) return;
    addFeedComment(post.id, comment.trim());
    setComment('');
    toast.success('한줄평을 남겼어요! ✍️');
  };

  const goCourse = () => {
    if (interactive) navigate(`/course/${post.courseId}?from=feed`);
  };

  const courseIndex = course ? courses.findIndex(item => item.id === course.id) : -1;
  const template = course ? getTemplateByIndex(Math.max(courseIndex, 0)) : null;
  const hasTemplateSlide = !!(course && template);
  const syncedPlaces = course ? getCoursePlacesFromStops(course, getRestaurantById) : [];
  const courseMapPlaces = syncedPlaces.length > 0
    ? syncedPlaces
    : getMockCourseById(post.courseId).places;
  const photoPairs = post.photos.reduce<string[][]>((pairs, src, index) => {
    if (index % 2 === 0) pairs.push([src]);
    else pairs[pairs.length - 1]?.push(src);
    return pairs;
  }, []);
  const slideCount = photoPairs.length + (hasTemplateSlide ? 1 : 0);

  const renderMediaSlide = (media: React.ReactNode, key: string) => (
    <div key={key} className="h-full w-full shrink-0 snap-center overflow-hidden bg-[#F1E7DE]">
      {media}
    </div>
  );

  const infoPanel = (
    <div className="flex min-w-0 flex-col gap-2 bg-white p-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid={`feed-author-${post.id}`}
            disabled={!interactive || !post.authorId}
            onClick={() => post.authorId && navigate(`/profile/${post.authorId}`)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-default"
            aria-label={post.authorId ? `${post.authorName} 프로필 열기` : undefined}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[16px] shrink-0"
              style={{ background: '#FFF5F5' }}
            >
              {post.authorEmoji}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold leading-tight" style={{ color: '#1A1A1A' }}>
                {post.authorName}
              </p>
              <p className="truncate text-[10px] leading-tight" style={{ color: '#9B9B9B' }}>
                {course ? `${course.region} 후기` : '코스 후기'} · {timeAgo(post.createdAt)}
              </p>
            </div>
          </button>
          <button className="shrink-0" style={{ color: '#9B9B9B' }}>
            <MoreHorizontal size={16} />
          </button>
        </div>

        <div className="relative h-[74px] overflow-hidden rounded-2xl bg-[#FFF7F4] px-6 py-3">
          <span
            aria-hidden="true"
            className="absolute left-2 top-0 font-serif text-[32px] leading-none"
            style={{ color: '#EB5053' }}
          >
            “
          </span>
          <p className="line-clamp-3 text-[12px] font-medium italic leading-relaxed" style={{ color: '#3B2A22' }}>
            {post.caption}
          </p>
          <span
            aria-hidden="true"
            className="absolute bottom-[-8px] right-2 font-serif text-[32px] leading-none"
            style={{ color: '#F3A5A7' }}
          >
            ”
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={goCourse}
            className="h-8 rounded-xl text-[10px] font-bold text-white flex items-center justify-center gap-1"
            style={{ background: '#E85053' }}
          >
            <Map size={11} /> 코스
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              if (!interactive) return;
              courseSaved ? unsaveCourse(post.courseId) : saveCourse(post.courseId);
              toast.success(courseSaved ? '저장을 해제했어요' : '코스를 저장했어요! 🔖');
            }}
            className="h-8 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 border"
            style={{ color: '#E85053', borderColor: '#F0C8C8', background: 'transparent' }}
          >
            <Bookmark size={11} fill={courseSaved ? '#E85053' : 'none'} /> 저장
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => interactive && toast('공유 링크를 복사했어요! 🔗')}
            className="h-8 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 border"
            style={{ color: '#E85053', borderColor: '#F0C8C8', background: 'transparent' }}
          >
            <Share2 size={11} /> 공유
          </motion.button>
        </div>

        <div className="rounded-2xl bg-[#FFF7F4] px-2 py-2">
          <div className="space-y-1">
            {courseMapPlaces.slice(0, 3).map((place, index, visibleItems) => {
              const color = getCourseSequenceColor(index);
              const isLast = index === visibleItems.length - 1;
              return (
                <div key={place.id} className="flex min-w-0 gap-2">
                  <div className="flex shrink-0 flex-col items-center">
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white"
                      style={{ background: color.base }}
                    >
                      {index + 1}
                    </span>
                    {!isLast && (
                      <span
                        className="my-0.5 h-7 border-l border-dashed"
                        style={{ borderColor: color.lighter }}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  {place.imageUrl ? (
                    <img
                      src={place.imageUrl}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-lg object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[9px] font-bold text-[#3B2A22]">
                      {place.name.slice(0, 2)}
                    </div>
                  )}
                  <p className="min-w-0 flex-1 truncate pt-1 text-[10.5px] font-black leading-tight text-[#3B2A22]">
                    {place.name}
                  </p>
                </div>
              );
            })}
            {courseMapPlaces.length === 0 && (
              <p className="text-[10.5px] font-semibold text-[#9B9B9B]">식당 정보가 없어요</p>
            )}
          </div>
          {courseMapPlaces.length > 3 && (
            <p className="mt-1 text-center text-[9px] font-bold text-[#B09A8C]">
              +{courseMapPlaces.length - 3}곳 더
            </p>
          )}
        </div>

    </div>
  );

  return (
    <div className="rounded-[26px] bg-white border border-[#F0E8E0] shadow-sm overflow-hidden">
      <div className="mx-3 mt-3 grid min-h-[280px] grid-cols-[55%_45%] overflow-hidden rounded-2xl">
        <div
          className="relative min-h-[280px] overflow-hidden"
          role="button"
          tabIndex={0}
          aria-label="다음 이미지 보기"
          onClick={goNextSlide}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              goNextSlide();
            }
          }}
        >
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            role="region"
            aria-label={`피드 이미지 ${slideCount}장, 좌우로 넘겨보기`}
            className="flex h-full touch-pan-x snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth scrollbar-hide"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x', overscrollBehaviorX: 'contain' }}
          >
            {course && template && renderMediaSlide(
              <TemplateArtwork course={course} template={template} className="h-full min-h-[280px] rounded-none" eager showLabel={false} />,
              'template',
            )}
            {photoPairs.map((pair, pairIndex) => renderMediaSlide(
              <div className="grid h-full min-h-[280px] grid-rows-2 gap-1 bg-white">
                {pair.map((src, imageIndex) => (
                  <img
                    key={src}
                    src={src}
                    alt={`피드 사진 ${pairIndex * 2 + imageIndex + 1}`}
                    className="pointer-events-none h-full min-h-0 w-full select-none object-cover"
                    draggable={false}
                  />
                ))}
                {pair.length === 1 && <div className="bg-[#F1E7DE]" aria-hidden="true" />}
              </div>,
              `photo-pair-${pairIndex}`,
            ))}
          </div>
          {slideCount > 1 && (
            <>
              <span className="absolute right-2 top-2 z-20 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white">
                {photoIdx + 1}/{slideCount}
              </span>
              <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
                {Array.from({ length: slideCount }).map((_, i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full transition-all"
                    style={{ background: i === photoIdx ? '#FFFFFF' : 'rgba(255,255,255,0.5)' }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        {infoPanel}
      </div>

      <div className="px-4 py-3">
        {visibleComments.length > 0 && (
          <div className="space-y-1.5 pb-2">
            {(showAllComments ? visibleComments : visibleComments.slice(0, 2)).map(c => (
              <div key={c.id} className="flex items-start gap-1.5 text-[12px] leading-snug">
                <span className="shrink-0">{c.authorEmoji}</span>
                <p className="min-w-0 flex-1" style={{ color: '#1A1A1A' }}>
                  <b className="mr-1">{c.authorName}</b>
                  {c.text}
                </p>
                {mine && interactive && (
                  <button
                    onClick={() => {
                      toggleCommentHidden(post.id, c.id);
                      toast('댓글을 숨겼어요 — 피드 전체에 적용됩니다 🙈');
                    }}
                    aria-label="댓글 숨기기"
                    className="shrink-0 mt-0.5"
                    style={{ color: '#9B9B9B' }}
                  >
                    <EyeOff size={13} />
                  </button>
                )}
              </div>
            ))}
            {visibleComments.length > 2 && (
              <button
                onClick={() => setShowAllComments(v => !v)}
                className="text-[11px] font-semibold"
                style={{ color: '#9B9B9B' }}
              >
                {showAllComments ? '접기' : `댓글 ${visibleComments.length}개 모두 보기`}
              </button>
            )}
          </div>
        )}

        <div className="flex h-10 items-center gap-2 rounded-full border px-3.5" style={{ borderColor: '#EEE4DC', background: 'rgba(255,255,255,0.6)' }}>
          <input
            value={comment}
            onChange={e => setComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitComment()}
            placeholder="한줄평 입력..."
            disabled={!interactive}
            className="min-w-0 flex-1 bg-transparent outline-none text-[13px]"
            style={{ color: '#1A1A1A' }}
          />
          <button onClick={submitComment} disabled={!interactive} style={{ color: '#E85053' }}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
