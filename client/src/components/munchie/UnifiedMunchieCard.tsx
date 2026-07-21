import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bookmark,
  Flag,
  Map,
  MoreHorizontal,
  MessageCircle,
  Send,
  Share2,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { isFeedCommentHidden, type Course, type FeedPost, useApp } from '@/contexts/AppContext';
import { getTemplateForCourse, type CoursemapTemplate } from '@/constants/coursemapTemplates';
import type { PlacedPhoto } from '@/lib/coursemapDecor';
import TemplateArtwork from '@/components/munchie/TemplateArtwork';
import OneLineReviewBox from '@/components/munchie/OneLineReviewBox';

function timeAgo(iso: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
  if (days === 0) return '오늘';
  if (days === 1) return '1일 전';
  if (days < 7) return `${days}일 전`;
  return `${Math.floor(days / 7)}주 전`;
}

export default function UnifiedMunchieCard({
  post,
  compact = false,
  homeSummary = false,
  interactive = true,
  courseOverride,
  templateOverride,
  decorOverride,
  detailOrigin = 'feed',
}: {
  post: FeedPost;
  compact?: boolean;
  homeSummary?: boolean;
  interactive?: boolean;
  courseOverride?: Course;
  templateOverride?: CoursemapTemplate;
  decorOverride?: PlacedPhoto[];
  detailOrigin?: 'feed' | 'saved' | 'profile';
}) {
  const [, navigate] = useLocation();
  const {
    courses,
    getCourseById,
    addFeedComment,
    reactToFeedComment,
    reportFeedComment,
    likedFeedIds,
    toggleFeedLike,
    savedCourseIds,
    saveCourse,
    unsaveCourse,
  } = useApp();
  const [comment, setComment] = useState('');
  const [commentExpanded, setCommentExpanded] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);
  const [commentMenuId, setCommentMenuId] = useState<string | null>(null);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [postReported, setPostReported] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lm_reported_feed_ids') ?? '[]').includes(post.id); }
    catch { return false; }
  });
  const linkedCourse = courseOverride ?? getCourseById(post.courseId);
  // 오래된 피드가 API 코스 목록에 없더라도 한줄평과 사진은 사라지면 안 된다.
  const course: Course = linkedCourse ?? {
    id: post.courseId,
    title: '',
    description: post.caption,
    heroImage: post.photos[0] ?? '',
    tags: post.tags,
    hashtags: [],
    region: 'Munchie 커뮤니티',
    metadata: { distance: 0, duration: 0, placeCount: Math.min(post.photos.length, 3) },
    stops: [],
    createdAt: post.createdAt,
    isPublic: true,
    creatorId: post.authorId ?? '',
    savedCount: 0,
  };

  const courseIndex = Math.max(courses.findIndex(item => item.id === course.id), 0);
  const template = templateOverride ?? getTemplateForCourse(course.id, courseIndex);
  const visibleComments = post.comments.filter(item => !isFeedCommentHidden(item));
  const rootComments = visibleComments.filter(item => !item.parentId);
  const liked = likedFeedIds.includes(post.id);
  const saved = savedCourseIds.includes(course.id);
  const compactDetailPath = `/feed/${post.id}?from=${detailOrigin}`;

  const go = (path: string) => interactive && navigate(path);
  const submitComment = () => {
    if (!interactive || !comment.trim()) return;
    addFeedComment(post.id, comment.trim(), replyingTo?.id);
    setComment('');
    setReplyingTo(null);
    setCommentExpanded(true);
    toast.success(replyingTo ? '답글을 등록했어요.' : '댓글을 등록했어요.');
  };
  const reportPost = () => {
    try {
      const reported: string[] = JSON.parse(localStorage.getItem('lm_reported_feed_ids') ?? '[]');
      if (!reported.includes(post.id)) localStorage.setItem('lm_reported_feed_ids', JSON.stringify([...reported, post.id]));
    } catch { /* 신고 UI는 저장 실패와 무관하게 닫는다. */ }
    setPostReported(true);
    setShowPostMenu(false);
    toast.success('게시물을 신고했어요. 검토 후 필요한 조치를 진행할게요.');
  };

  if (compact) {
    return (
      <article className={`relative overflow-hidden bg-[#FFFDFC] ${homeSummary ? 'rounded-[12px] border border-[#EFD0D4] shadow-[0_5px_14px_rgba(235,80,83,0.07)]' : 'rounded-[18px] border-2 border-[#EAD7CD] shadow-[0_7px_18px_rgba(123,76,53,0.1)]'}`} data-testid={`unified-munchie-card-${post.id}`}>
        <header className="flex h-8 shrink-0 items-center gap-1 px-2">
          <button type="button" onClick={() => go(`/profile/${post.authorId}`)} className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[9px] ${homeSummary ? 'border border-[#EB5053]' : 'border border-[#2F2926]'}`}>{post.authorEmoji}</button>
          <button type="button" onClick={() => go(`/profile/${post.authorId}`)} className={`min-w-0 truncate text-left text-[10px] font-black ${homeSummary ? 'text-[#C93B3E]' : 'text-[#342925]'}`}>{post.authorName}</button>
          <span className={`shrink-0 text-[8px] font-medium ${homeSummary ? 'text-[#A36D6C]' : 'text-[#8B817B]'}`}>{timeAgo(post.createdAt)}</span>
          <span className="flex-1" />
          <button type="button" onClick={() => setShowPostMenu(value => !value)} aria-label="게시물 메뉴" className={`flex h-6 w-6 items-center justify-center ${homeSummary ? 'text-[#D94447]' : 'text-[#413733]'}`}><MoreHorizontal size={15} strokeWidth={3} /></button>
        </header>
        <button type="button" onClick={() => go(compactDetailPath)} className="block w-full text-left" aria-label="피드 상세 보기">
          <OneLineReviewBox compact slim={homeSummary} className="mx-2 mb-1.5 shrink-0 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p key={post.caption} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className={`${homeSummary ? 'line-clamp-1 leading-none' : 'line-clamp-2 leading-snug'} text-[9px] font-bold text-[#3B2A23]`}>{post.caption}</motion.p>
            </AnimatePresence>
          </OneLineReviewBox>
          <div className={`relative mx-2 mb-2 overflow-hidden rounded-[12px] border bg-[#F1E7DE] ${homeSummary ? 'border-[#F2B6AB]' : 'border-[#E8D6CC]'}`}>
            <TemplateArtwork course={course} template={template} photoSources={post.photos} decorOverride={decorOverride} eager />
            {!homeSummary && <div className="absolute bottom-1 left-1 flex gap-1">
              <span className="flex h-6 items-center gap-0.5 rounded-lg border border-[#F2C4BA] bg-[#FFF8F4] px-1.5 text-[7px] font-black text-[#E76B68]"><ThumbsUp size={10} />{post.likes}</span>
              <span
                role="button"
                tabIndex={0}
                aria-label="스토리로 공유"
                onClick={event => { event.stopPropagation(); interactive && go(`/course/${course.id}/share`); }}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); interactive && go(`/course/${course.id}/share`); } }}
                className="flex h-6 items-center rounded-lg border border-[#CDDED3] bg-[#F7FCF8] px-1.5 text-[#668574]"
              ><Share2 size={10} /></span>
            </div>}
          </div>
        </button>
        <AnimatePresence>
          {showPostMenu && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute right-2 top-8 z-30 w-[112px] overflow-hidden rounded-xl border border-[#DACBC3] bg-white shadow-[0_8px_22px_rgba(57,38,29,0.16)]">
              <button type="button" onClick={() => { setShowPostMenu(false); go(`/profile/${post.authorId}`); }} className="block h-9 w-full px-3 text-left text-[10px] font-bold text-[#51443E]">작성자 보기</button>
              <button type="button" disabled={postReported} onClick={reportPost} className="block h-9 w-full border-t border-[#EEE3DD] px-3 text-left text-[10px] font-bold text-[#D84D52] disabled:text-[#A99D97]">{postReported ? '신고 완료' : '게시물 신고'}</button>
            </motion.div>
          )}
        </AnimatePresence>
      </article>
    );
  }

  return (
    <>
      <article className="relative overflow-hidden rounded-[20px] border border-[#E9D6CC] bg-[#FFFDFC] shadow-[0_10px_26px_rgba(117,73,51,0.09)]" data-testid={`unified-munchie-card-${post.id}`}>
        <header className="flex items-center gap-2.5 px-3 pb-2.5 pt-3">
          <button type="button" onClick={() => go(`/profile/${post.authorId}`)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#F0BCAE] bg-[#FFF1EB] text-base">
            {post.authorEmoji}
          </button>
          <button type="button" onClick={() => go(`/profile/${post.authorId}`)} className="min-w-0 text-left">
            <strong className="truncate text-[15px] font-black text-[#30231E]">{post.authorName}</strong>
          </button>
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#8C7B72]">{timeAgo(post.createdAt)}</span>
          <button type="button" onClick={() => setShowPostMenu(value => !value)} aria-label="게시물 메뉴" className="flex h-9 w-9 items-center justify-center text-[#A66C60]"><MoreHorizontal size={21} strokeWidth={3} /></button>
        </header>

        <AnimatePresence>
          {showPostMenu && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute right-3 top-12 z-30 w-[126px] overflow-hidden rounded-xl border border-[#E3D2C9] bg-white shadow-[0_10px_24px_rgba(57,38,29,0.16)]">
              <button type="button" onClick={() => { setShowPostMenu(false); go(`/profile/${post.authorId}`); }} className="block h-10 w-full px-3 text-left text-[11px] font-bold text-[#51443E]">작성자 보기</button>
              <button type="button" disabled={postReported} onClick={reportPost} className="block h-10 w-full border-t border-[#EEE3DD] px-3 text-left text-[11px] font-bold text-[#D84D52] disabled:text-[#A99D97]">{postReported ? '신고 완료' : '게시물 신고'}</button>
            </motion.div>
          )}
        </AnimatePresence>

        <button type="button" onClick={() => go(`/template/${template.id}?course=${course.id}&from=${detailOrigin}`)} className="mx-3 block w-[calc(100%-1.5rem)] overflow-hidden rounded-[14px] border border-[#EED9D0] bg-[#F1E7DE]" aria-label="Munchie 피드 이미지 상세 보기">
          <TemplateArtwork course={course} template={template} photoSources={post.photos} decorOverride={decorOverride} eager />
        </button>

        <div className="mx-3 flex items-center justify-between py-2.5 text-[#A27469]">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => interactive && toggleFeedLike(post.id)} className={`flex h-10 min-w-10 items-center justify-center gap-1 rounded-xl px-2 ${liked ? 'bg-[#FFE2DF] text-[#D94E55]' : 'text-current'}`} aria-label="좋아요">
              <ThumbsUp size={20} strokeWidth={2} fill={liked ? 'currentColor' : 'none'} /><span className="text-[10px] font-black">{post.likes}</span>
            </button>
            <button type="button" onClick={() => interactive && setCommentExpanded(true)} className="flex h-10 min-w-10 items-center justify-center gap-1 rounded-xl px-2 text-current" aria-label="댓글 보기">
              <MessageCircle size={20} strokeWidth={2} /><span className="text-[10px] font-black">{visibleComments.length}</span>
            </button>
            <button type="button" onClick={() => go(`/course/${course.id}?from=${detailOrigin}&post=${post.id}`)} className="flex h-10 w-10 items-center justify-center rounded-xl text-current" aria-label="코스맵 보기">
              <Map size={23} strokeWidth={2} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => interactive && go(`/course/${course.id}/share`)} className="flex h-10 w-10 items-center justify-center rounded-xl text-current" aria-label="공유하기"><Share2 size={20} strokeWidth={2} /></button>
            <button
              type="button"
              onClick={() => {
                if (!interactive) return;
                saved ? unsaveCourse(course.id) : saveCourse(course.id);
                toast.success(saved ? '저장을 해제했어요.' : 'Munchie 피드를 저장했어요.');
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${saved ? 'bg-[#FFE2DF] text-[#D94E55]' : 'text-current'}`}
              aria-label={saved ? '저장 해제' : '저장'}
            >
              <Bookmark size={20} strokeWidth={2} fill={saved ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

      </article>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {commentExpanded && (
            <>
              <motion.button type="button" aria-label="댓글 닫기" className="fixed inset-0 z-[90] bg-[#271913]/35" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setCommentExpanded(false); setReplyingTo(null); }} />
              <motion.aside
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.28}
                onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 650) { setCommentExpanded(false); setReplyingTo(null); } }}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 330, damping: 32 }}
                className="fixed inset-x-0 bottom-0 z-[100] mx-auto flex h-[82dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[24px] border border-[#E8D2C8] bg-[#FFFDFC] shadow-[0_-18px_48px_rgba(62,37,27,0.2)]"
                aria-label="댓글"
              >
                <div className="shrink-0 cursor-grab px-4 pb-3 pt-2 active:cursor-grabbing">
                  <span className="mx-auto block h-1.5 w-11 rounded-full bg-[#D8C7BF]" />
                  <div className="mt-3 flex items-center justify-between">
                    <span className="h-8 w-8" />
                    <strong className="text-[15px] font-black text-[#342620]">댓글 {visibleComments.length}</strong>
                    <button type="button" onClick={() => { setCommentExpanded(false); setReplyingTo(null); }} aria-label="댓글창 닫기" className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F8ECE6] text-[#8D6C60]"><X size={16} /></button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto border-t border-[#F0E2DC] px-4 py-4">
                  {rootComments.map(item => {
                    const replies = visibleComments.filter(reply => reply.parentId === item.id);
                    const renderComment = (entry: typeof item, nested = false) => (
                      <div key={entry.id} className={`relative flex items-start gap-2.5 ${nested ? 'ml-10 mt-3' : ''}`}>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#F0C3B7] bg-[#FFF4EF] text-sm">{entry.authorEmoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] leading-relaxed text-[#3E302A]"><strong className="mr-1.5">{entry.authorName}</strong>{entry.text}</p>
                          <div className="mt-1.5 flex items-center gap-3 text-[10px] font-bold text-[#81716A]">
                            <span>{timeAgo(entry.createdAt)}</span>
                            {!nested && <button type="button" onClick={() => setReplyingTo({ id: entry.id, authorName: entry.authorName })}>답글 달기</button>}
                            <button type="button" onClick={() => reactToFeedComment(post.id, entry.id, 'like')} className={entry.myReaction === 'like' ? 'text-[#E83D45]' : ''}><ThumbsUp className="inline" size={13} /> {entry.likes ?? 0}</button>
                            <button type="button" onClick={() => reactToFeedComment(post.id, entry.id, 'dislike')} className={entry.myReaction === 'dislike' ? 'text-[#6354C7]' : ''}><ThumbsDown className="inline" size={13} /> {entry.dislikes ?? 0}</button>
                          </div>
                        </div>
                        <button type="button" onClick={() => setCommentMenuId(current => current === entry.id ? null : entry.id)} aria-label={`${entry.authorName} 댓글 메뉴`} className="flex h-8 w-8 shrink-0 items-center justify-center text-[#88766E]"><MoreHorizontal size={18} /></button>
                        {commentMenuId === entry.id && (
                          <div className="absolute right-0 top-8 z-10 w-[108px] overflow-hidden rounded-xl border border-[#E3D2C9] bg-white shadow-lg">
                            <button type="button" disabled={entry.reported} onClick={() => { reportFeedComment(post.id, entry.id); setCommentMenuId(null); toast.success('댓글을 신고했어요.'); }} className="flex h-10 w-full items-center gap-2 px-3 text-[11px] font-bold text-[#D84D52] disabled:text-[#A99D97]"><Flag size={13} />{entry.reported ? '신고됨' : '신고하기'}</button>
                          </div>
                        )}
                      </div>
                    );
                    return <div key={item.id}>{renderComment(item)}{replies.map(reply => renderComment(reply, true))}</div>;
                  })}
                  {rootComments.length === 0 && <p className="py-12 text-center text-[12px] font-semibold text-[#9A857A]">첫 번째 댓글을 남겨보세요.</p>}
                </div>

                <div className="shrink-0 border-t border-[#EADBD4] bg-white px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2.5">
                  {replyingTo && (
                    <div className="mb-2 flex items-center justify-between rounded-lg bg-[#FFF0EB] px-3 py-2 text-[11px] font-bold text-[#B55A58]">
                      <span>@{replyingTo.authorName}님에게 답글 작성 중</span>
                      <button type="button" onClick={() => setReplyingTo(null)} aria-label="답글 취소"><X size={14} /></button>
                    </div>
                  )}
                  <div className="flex h-12 items-center gap-2 rounded-[15px] border border-[#E4D1C8] bg-[#FFFDFC] px-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFE6DE] text-sm">{post.authorEmoji}</span>
                    <input value={comment} onChange={event => setComment(event.target.value)} onKeyDown={event => event.key === 'Enter' && submitComment()} placeholder={replyingTo ? `${replyingTo.authorName}님에게 답글...` : '댓글 입력'} className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#9B8A82]" autoFocus />
                    <button type="button" onClick={submitComment} disabled={!comment.trim()} aria-label="댓글 등록" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EF6B6D] text-white disabled:bg-[#E8DDD8]"><Send size={18} /></button>
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
