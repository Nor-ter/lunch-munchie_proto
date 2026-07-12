import { useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Heart, Bookmark, MessageCircle, Share2, Map, Send, MoreHorizontal, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useApp, isFeedCommentHidden, type FeedPost } from '@/contexts/AppContext';
import { getCourseSequenceColor } from '@/constants/courseTheme';

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
    getCourseById, getRestaurantById,
    likedFeedIds, toggleFeedLike, addFeedComment, toggleCommentHidden, isMyPost,
    savedCourseIds, saveCourse, unsaveCourse,
  } = useApp();
  // 소셜 피드 카드는 기본 템플릿 테마로 고정 — 스킨은 코스맵(내 것)에만 적용된다
  const course = getCourseById(post.courseId);
  const liked = likedFeedIds.includes(post.id);
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

  const submitComment = () => {
    if (!comment.trim()) return;
    addFeedComment(post.id, comment.trim());
    setComment('');
    toast.success('한줄평을 남겼어요! ✍️');
  };

  const goCourse = () => {
    if (interactive) navigate(`/course/${post.courseId}?from=feed`);
  };

  const stops = course?.stops.slice(0, 4) ?? [];

  return (
    <div className="rounded-[26px] bg-white border border-[#F0E8E0] shadow-sm overflow-hidden">
      {/* Author */}
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2.5">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[18px] shrink-0"
          style={{ background: '#FFF5F5' }}
        >
          {post.authorEmoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold leading-tight" style={{ color: '#1A1A1A' }}>
            {post.authorName}
          </p>
          <p className="text-[11px] leading-tight truncate" style={{ color: '#9B9B9B' }}>
            {course ? `${course.region} 후기` : '코스 후기'} · {timeAgo(post.createdAt)}
          </p>
        </div>
        <button className="shrink-0" style={{ color: '#9B9B9B' }}>
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Photo carousel */}
      <div className="relative mx-3 rounded-2xl overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          {post.photos.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className="w-full h-[260px] object-cover shrink-0 snap-center"
              draggable={false}
            />
          ))}
        </div>
        {post.photos.length > 1 && (
          <>
            <span className="absolute top-2.5 right-2.5 rounded-full bg-black/55 text-white text-[11px] font-semibold px-2.5 py-1">
              {photoIdx + 1}/{post.photos.length}
            </span>
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
              {post.photos.map((_, i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{ background: i === photoIdx ? '#FFFFFF' : 'rgba(255,255,255,0.5)' }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Caption */}
      <div className="relative mx-4 mt-3 h-[82px] overflow-hidden rounded-2xl bg-[#FFF7F4] px-7 py-4">
        <span
          aria-hidden="true"
          className="absolute left-2.5 top-0 font-serif text-[38px] leading-none"
          style={{ color: '#EB5053' }}
        >
          “
        </span>
        <p className="line-clamp-2 text-[14px] font-medium italic leading-relaxed" style={{ color: '#3B2A22' }}>
          {post.caption}
        </p>
        <span
          aria-hidden="true"
          className="absolute bottom-[-8px] right-2.5 font-serif text-[38px] leading-none"
          style={{ color: '#F3A5A7' }}
        >
          ”
        </span>
      </div>

      {/* Mini course timeline */}
      {stops.length > 0 && (
        <div className="px-4 pt-3 flex items-start">
          {stops.map((stop, i) => {
            const r = getRestaurantById(stop.placeId);
            const color = getCourseSequenceColor(i);
            return (
              <div key={`${stop.placeId}-${i}`} className="flex items-start min-w-0" style={{ flex: 1 }}>
                <div className="flex flex-col items-center min-w-0 flex-1">
                  <div className="relative">
                    <div
                      className="w-12 h-12 rounded-full overflow-hidden border-2"
                      style={{ borderColor: color.base }}
                    >
                      {r?.image
                        ? <img src={r.image} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full" style={{ background: color.faint }} />}
                    </div>
                    <span
                      className="absolute -top-1 -left-1 w-[18px] h-[18px] rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                      style={{ background: color.base }}
                    >
                      {i + 1}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] font-medium truncate w-full text-center" style={{ color: '#4A4A4A' }}>
                    {r?.name ?? ''}
                  </p>
                </div>
                {i < stops.length - 1 && (
                  <div
                    className="mt-6 h-0 flex-shrink-0 w-4 border-t-2 border-dotted"
                    style={{ borderColor: color.lighter }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Action buttons */}
      <div className="px-4 pt-3 flex gap-2">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={goCourse}
          className="flex-1 h-9 rounded-xl text-[12px] font-bold text-white flex items-center justify-center gap-1.5"
          style={{ background: '#E85053' }}
        >
          <Map size={13} /> 코스 보기
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            if (!interactive) return;
            courseSaved ? unsaveCourse(post.courseId) : saveCourse(post.courseId);
            toast.success(courseSaved ? '저장을 해제했어요' : '코스를 저장했어요! 🔖');
          }}
          className="flex-1 h-9 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 border"
          style={{ color: '#E85053', borderColor: '#F0C8C8', background: 'transparent' }}
        >
          <Bookmark size={13} fill={courseSaved ? '#E85053' : 'none'} /> 저장
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => interactive && toast('공유 링크를 복사했어요! 🔗')}
          className="flex-1 h-9 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 border"
          style={{ color: '#E85053', borderColor: '#F0C8C8', background: 'transparent' }}
        >
          <Share2 size={13} /> 공유
        </motion.button>
      </div>

      {/* Counts */}
      <div className="px-4 pt-3 flex items-center gap-4">
        <button
          onClick={() => interactive && toggleFeedLike(post.id)}
          className="flex items-center gap-1.5 text-[13px] font-semibold active:scale-90 transition-transform"
          style={{ color: liked ? '#E85053' : '#9B9B9B' }}
        >
          <Heart size={17} fill={liked ? '#E85053' : 'none'} /> {post.likes}
        </button>
        <span className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: '#9B9B9B' }}>
          <Bookmark size={16} /> {post.saves}
        </span>
        <span className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: '#9B9B9B' }}>
          <MessageCircle size={16} /> {visibleComments.length}
        </span>
      </div>

      {/* Comments */}
      {visibleComments.length > 0 && (
        <div className="px-4 pt-2.5 space-y-1.5">
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

      {/* Comment input */}
      <div className="mx-4 my-3 flex items-center gap-2 rounded-full border px-3.5 h-10" style={{ borderColor: '#EEE4DC', background: 'rgba(255,255,255,0.6)' }}>
        <input
          value={comment}
          onChange={e => setComment(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submitComment()}
          placeholder="한줄평 입력..."
          disabled={!interactive}
          className="flex-1 bg-transparent outline-none text-[13px]"
          style={{ color: '#1A1A1A' }}
        />
        <button onClick={submitComment} disabled={!interactive} style={{ color: '#E85053' }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
