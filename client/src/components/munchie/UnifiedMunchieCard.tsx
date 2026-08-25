import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bookmark,
  Flag,
  Map,
  MoreHorizontal,
  Pencil,
  MessageCircle,
  Send,
  Share2,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { isFeedCommentHidden, type Course, type FeedPost, useApp } from '@/contexts/AppContext';
import { getTemplateById, getTemplateForCourse, type CoursemapTemplate } from '@/constants/coursemapTemplates';
import { fromFeedPhotoPlacements, type CoursemapCanvasStroke, type PlacedPhoto } from '@/lib/coursemapDecor';
import TemplateArtwork from '@/components/munchie/TemplateArtwork';
import OneLineReviewBox from '@/components/munchie/OneLineReviewBox';
import { acquireDocumentScrollLock } from '@/lib/documentScrollLock';
import { resolveFeedAuthorId } from '@/lib/profileFeed';
import { logCourseFeedImpression } from '@/lib/eventLogger';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import { startGoogleAuth } from '@/services/authApi';
import {
  getSavedCourseDetailPath,
  type SavedViewMode,
} from '@/lib/savedNavigation';

function timeAgo(iso: string | number) {
  const normalized = typeof iso === 'string' ? iso.replace(/T(\d):/, 'T0$1:') : iso;
  const timestamp = new Date(normalized).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
  if (days === 0) return '오늘';
  if (days === 1) return '1일 전';
  if (days < 7) return `${days}일 전`;
  return `${Math.floor(days / 7)}주 전`;
}

function FeedAuthorAvatar({ post, className }: { post: FeedPost; className: string }) {
  return post.authorImage ? (
    <img src={post.authorImage} alt="" className={`${className} object-cover`} referrerPolicy="no-referrer" />
  ) : (
    <span className={className}>{post.authorEmoji}</span>
  );
}

export const SAVED_BOOKMARK_BUTTON_CLASS =
  'flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFE2DF] text-[#D94E55]';

export default function UnifiedMunchieCard({
  post,
  compact = false,
  homeSummary = false,
  interactive = true,
  courseOverride,
  templateOverride,
  decorOverride,
  strokesOverride,
  detailOrigin = 'feed',
  profileReturnId,
  savedView,
}: {
  post: FeedPost;
  compact?: boolean;
  homeSummary?: boolean;
  interactive?: boolean;
  courseOverride?: Course;
  templateOverride?: CoursemapTemplate;
  decorOverride?: PlacedPhoto[];
  strokesOverride?: CoursemapCanvasStroke[];
  detailOrigin?: 'feed' | 'saved' | 'profile';
  profileReturnId?: string;
  savedView?: SavedViewMode;
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
    deleteCourseWithFeed,
    incrementFeedShare,
    isMyPost,
  } = useApp();
  const [comment, setComment] = useState('');
  const [commentExpanded, setCommentExpanded] = useState(false);
  const [reviewRevealed, setReviewRevealed] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);
  const [commentMenuId, setCommentMenuId] = useState<string | null>(null);
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const lastArtworkTapAtRef = useRef(0);
  const [postReported, setPostReported] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lm_reported_feed_ids') ?? '[]').includes(post.id); }
    catch { return false; }
  });
  const { data: auth } = useAuthStatus();
  const linkedCourse = courseOverride ?? getCourseById(post.courseId);
  const ownPost = isMyPost(post);
  const authorProfilePath = ownPost ? '/profile' : `/profile/${resolveFeedAuthorId(post)}`;

  useEffect(() => {
    if (!deleteConfirmOpen) return;
    return acquireDocumentScrollLock({ inertSelector: '.app-shell' });
  }, [deleteConfirmOpen]);
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
  const template = templateOverride ?? getTemplateById(post.templateId) ?? getTemplateById(post.skinId) ?? getTemplateForCourse(course.id, courseIndex);
  const embeddedDecor = fromFeedPhotoPlacements(post.photoPlacements, post.photos) ?? undefined;
  const renderedDecor = decorOverride ?? post.decor ?? embeddedDecor;
  const renderedStrokes = strokesOverride ?? post.canvasStrokes;
  const visibleComments = post.comments.filter(item => !isFeedCommentHidden(item));
  const rootComments = visibleComments.filter(item => !item.parentId);
  const liked = likedFeedIds.includes(post.id);
  const saved = savedCourseIds.includes(course.id);
  const profileReturnQuery = detailOrigin === 'profile' && profileReturnId
    ? `&profileId=${encodeURIComponent(profileReturnId)}`
    : '';
  const compactDetailPath = `/feed/${post.id}?from=${detailOrigin}${profileReturnQuery}`;
  const courseMapPath = detailOrigin === 'saved' && savedView
    ? getSavedCourseDetailPath(course.id, post.id, savedView)
    : `/course/${course.id}?from=${detailOrigin}&post=${post.id}`;
  const feedSharePath = `/feed/${post.id}`;
  const cardRef = useRef<HTMLElement | null>(null);
  const impressionLoggedRef = useRef(false);

  useEffect(() => {
    if (!cardRef.current || impressionLoggedRef.current || typeof IntersectionObserver === 'undefined') return;
    let entryTime = 0;
    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry?.isIntersecting) {
        entryTime = Date.now();
      } else if (entryTime > 0) {
        const dwell = Date.now() - entryTime;
        if (dwell >= 1000 && !impressionLoggedRef.current) {
          impressionLoggedRef.current = true;
          logCourseFeedImpression(post.courseId || post.id, dwell);
        }
        entryTime = 0;
      }
    }, { threshold: 0.6 });
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [post.courseId, post.id]);

  const go = (path: string) => interactive && navigate(path);
  const requireLogin = () => {
    if (!auth) {
      toast.error('로그인 상태를 확인 중이에요. 잠시 후 다시 시도해 주세요.');
      return false;
    }
    if (!auth.isAnonymous) return true;
    toast.error('이 기능은 로그인 후 사용할 수 있어요.');
    startGoogleAuth(window.location.pathname + window.location.search);
    return false;
  };
  const submitComment = async () => {
    if (!interactive || !comment.trim()) return;
    if (!requireLogin()) return;
    const response = await fetch('/api/feed-comment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId: course.id, text: comment.trim(), parentId: replyingTo?.id }) });
    if (!response.ok) { toast.error('댓글을 등록하지 못했어요.'); return; }
    addFeedComment(post.id, comment.trim(), replyingTo?.id);
    setComment('');
    setReplyingTo(null);
    setCommentExpanded(true);
    toast.success(replyingTo ? '답글을 등록했어요.' : '댓글을 등록했어요.');
  };
  const reportPost = async () => {
    if (!requireLogin()) return;
    const response = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetType: 'course', targetId: course.id }) });
    if (!response.ok) { toast.error('신고를 접수하지 못했어요.'); return; }
    setPostReported(true);
    setShowPostMenu(false);
    toast.success('게시물을 신고했어요. 검토 후 필요한 조치를 진행할게요.');
  };
  const editPost = () => {
    setShowPostMenu(false);
    go(`/feed/${post.id}/edit?from=${detailOrigin}`);
  };
  const requestPostDelete = () => {
    setShowPostMenu(false);
    setDeleteConfirmOpen(true);
  };
  const confirmPostDelete = async () => {
    const response = await fetch(`/api/feed-post?courseId=${encodeURIComponent(course.id)}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      toast.error(payload.error || '게시물을 삭제하지 못했어요.');
      return;
    }
    setDeleteConfirmOpen(false);
    deleteCourseWithFeed(course.id);
    toast.success('게시물과 원본 코스를 삭제했어요.');
  };
  const togglePostLike = async () => {
    if (!interactive || !requireLogin()) return;
    const response = await fetch('/api/feed-like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId: course.id }) });
    if (!response.ok) { toast.error('좋아요를 저장하지 못했어요.'); return; }
    toggleFeedLike(post.id);
  };
  const shareFeedPost = async () => {
    if (!interactive) return;
    const shareUrl = typeof window === 'undefined'
      ? feedSharePath
      : `${window.location.origin}${feedSharePath}`;
    const title = `${post.authorName}님의 Munchie 피드`;
    const text = post.caption ? `${post.caption}` : 'Munchie 피드를 함께 봐요.';
    const recordShare = () => incrementFeedShare(post.id);
    const copyShareLink = async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        recordShare();
        toast.success('피드 링크를 복사했어요.');
      } catch {
        toast.error('공유 링크를 복사하지 못했어요.');
      }
    };

    if (typeof navigator === 'undefined' || !navigator.share) {
      await copyShareLink();
      return;
    }

    try {
      await navigator.share({ title, text, url: shareUrl });
      recordShare();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      await copyShareLink();
    }
  };
  const handleArtworkPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive || event.button !== 0) return;
    const tappedAt = Date.now();
    const elapsed = tappedAt - lastArtworkTapAtRef.current;
    if (elapsed >= 60 && elapsed <= 320) {
      lastArtworkTapAtRef.current = 0;
      if (!liked) void togglePostLike();
      return;
    }
    lastArtworkTapAtRef.current = tappedAt;
  };

  const deleteConfirmation = typeof document !== 'undefined' && createPortal(
    <AnimatePresence>
      {deleteConfirmOpen && (
        <motion.div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-[#2D1D18]/45 px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="presentation"
          onClick={() => setDeleteConfirmOpen(false)}
        >
          <motion.section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`delete-post-title-${post.id}`}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            onClick={event => event.stopPropagation()}
            className="relative w-full max-w-[330px] rounded-[24px] border border-[#F0D7CE] bg-[#FFFDFC] px-5 pb-5 pt-6 text-center shadow-[0_22px_60px_rgba(63,36,26,0.25)]"
          >
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(false)}
              aria-label="게시물 삭제 창 닫기"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#F7ECE7] text-[#80675C]"
            >
              <X size={16} />
            </button>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF0F0] text-[#D94447]">
              <Trash2 size={22} />
            </span>
            <h2 id={`delete-post-title-${post.id}`} className="mt-3 text-[17px] font-black text-[#30221C]">
              게시물을 삭제하시겠습니까?
            </h2>
            <p className="mt-1.5 text-[11px] font-semibold text-[#9A8277]">게시물과 원본 코스가 영구 삭제되며 복구할 수 없어요.</p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button type="button" onClick={() => setDeleteConfirmOpen(false)} className="h-11 rounded-[14px] border border-[#DFD0C8] bg-white text-[13px] font-black text-[#69564D]">
                취소
              </button>
              <button type="button" onClick={() => void confirmPostDelete()} className="h-11 rounded-[14px] bg-[#E85053] text-[13px] font-black text-white">
                확인
              </button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );

  if (compact) {
    return (
      <>
      <article ref={cardRef} className={`relative overflow-hidden bg-[#FFFDFC] ${homeSummary ? 'rounded-[12px] border border-[#EFD0D4] shadow-[0_5px_14px_rgba(235,80,83,0.07)]' : 'rounded-[18px] border-2 border-[#EAD7CD] shadow-[0_7px_18px_rgba(123,76,53,0.1)]'}`} data-testid={`unified-munchie-card-${post.id}`}>
        <header className={`flex shrink-0 items-center gap-1 px-2 ${homeSummary ? 'h-9' : 'h-8'}`}>
          <button type="button" onClick={() => go(authorProfilePath)} className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[9px] ${homeSummary ? 'border border-[#EB5053]' : 'border border-[#2F2926]'}`}>{post.authorEmoji}</button>
          <button type="button" onClick={() => go(authorProfilePath)} className={`min-w-0 truncate text-left text-[10px] font-semibold ${homeSummary ? 'text-[#3E2922]' : 'text-[#342925]'}`}>{post.authorName}</button>
          <span className={`shrink-0 text-[8px] font-medium ${homeSummary ? 'text-[#A36D6C]' : 'text-[#8B817B]'}`}>{timeAgo(post.createdAt)}</span>
          <span className="flex-1" />
          <button type="button" onClick={() => setShowPostMenu(value => !value)} aria-label="게시물 메뉴" className={`flex h-6 w-6 items-center justify-center ${homeSummary ? 'text-[#D94447]' : 'text-[#413733]'}`}><MoreHorizontal size={15} strokeWidth={3} /></button>
        </header>
        <button type="button" onClick={() => go(compactDetailPath)} className="block w-full text-left" aria-label="피드 상세 보기">
          <div className={`relative mx-2 mb-2 overflow-hidden rounded-[12px] border bg-[#F1E7DE] ${homeSummary ? 'border-[#F2B6AB]' : 'border-[#E8D6CC]'}`}>
            <TemplateArtwork course={course} template={template} photoSources={post.photos} decorOverride={renderedDecor} strokesOverride={renderedStrokes} eager />
            {post.missingOriginalMedia && <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-1 text-[8px] font-bold text-white">원본 사진이 없는 이전 게시물</span>}
            <div
              data-ui="compact-one-line-review"
              className={`pointer-events-none absolute inset-x-2 z-10 ${homeSummary ? 'bottom-2' : 'bottom-9'}`}
            >
              <OneLineReviewBox
                compact
                slim={homeSummary}
                className="!border-[#F2B6AB]/55 !bg-[#FFF8F4]/46 !text-[#3B2A23] shadow-[0_3px_10px_rgba(45,29,24,0.1)] backdrop-blur-[1px]"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={post.caption}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className={`${homeSummary ? 'line-clamp-1 leading-none' : 'line-clamp-2 leading-snug'} text-[9px] font-bold [text-shadow:0_1px_1px_rgba(255,255,255,0.72)]`}
                  >
                    {post.caption}
                  </motion.p>
                </AnimatePresence>
              </OneLineReviewBox>
            </div>
            {!homeSummary && <div className="absolute bottom-1 left-1 flex gap-1">
              <span className="flex h-6 items-center gap-0.5 rounded-lg border border-[#F2C4BA] bg-[#FFF8F4] px-1.5 text-[7px] font-black text-[#E76B68]"><ThumbsUp size={10} />{post.likes}</span>
              <span
                role="button"
                tabIndex={0}
                aria-label="피드 공유하기"
                onClick={event => { event.stopPropagation(); void shareFeedPost(); }}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); void shareFeedPost(); } }}
                className="flex h-6 items-center rounded-lg border border-[#CDDED3] bg-[#F7FCF8] px-1.5 text-[#668574]"
              ><Share2 size={10} /></span>
            </div>}
          </div>
        </button>
        <AnimatePresence>
          {showPostMenu && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute right-2 top-8 z-30 w-[112px] overflow-hidden rounded-xl border border-[#DACBC3] bg-white shadow-[0_8px_22px_rgba(57,38,29,0.16)]">
              {ownPost ? (
                <>
                  <button type="button" onClick={editPost} className="flex h-9 w-full items-center gap-1.5 px-3 text-left text-[10px] font-bold text-[#51443E]"><Pencil size={12} />게시물 수정</button>
                  <button type="button" onClick={requestPostDelete} className="flex h-9 w-full items-center gap-1.5 border-t border-[#EEE3DD] px-3 text-left text-[10px] font-bold text-[#D84D52]"><Trash2 size={12} />게시물 삭제</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => { setShowPostMenu(false); go(authorProfilePath); }} className="block h-9 w-full px-3 text-left text-[10px] font-bold text-[#51443E]">작성자 보기</button>
                  <button type="button" disabled={postReported} onClick={reportPost} className="block h-9 w-full border-t border-[#EEE3DD] px-3 text-left text-[10px] font-bold text-[#D84D52] disabled:text-[#A99D97]">{postReported ? '신고 완료' : '게시물 신고'}</button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </article>
      {deleteConfirmation}
      </>
    );
  }

  return (
    <>
      <article ref={cardRef} className="relative overflow-hidden rounded-[20px] border border-[#E9D6CC] bg-[#FFFDFC] shadow-[0_10px_26px_rgba(117,73,51,0.09)]" data-testid={`unified-munchie-card-${post.id}`}>
        <header className="flex items-center gap-2.5 px-3 pb-2.5 pt-3">
          <button type="button" onClick={() => go(authorProfilePath)} className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#F0BCAE] bg-[#FFF1EB] text-base">
            <FeedAuthorAvatar post={post} className="h-full w-full" />
          </button>
          <button type="button" onClick={() => go(authorProfilePath)} className="min-w-0 text-left">
            <strong className="truncate text-[15px] font-semibold text-[#3E2922]">{post.authorName}</strong>
          </button>
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#8C7B72]">{timeAgo(post.createdAt)}</span>
          <button type="button" onClick={() => setShowPostMenu(value => !value)} aria-label="게시물 메뉴" className="flex h-9 w-9 items-center justify-center text-[#A66C60]"><MoreHorizontal size={21} strokeWidth={3} /></button>
        </header>

        <AnimatePresence>
          {showPostMenu && (
            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute right-3 top-12 z-30 w-[126px] overflow-hidden rounded-xl border border-[#E3D2C9] bg-white shadow-[0_10px_24px_rgba(57,38,29,0.16)]">
              {ownPost ? (
                <>
                  <button type="button" onClick={editPost} className="flex h-10 w-full items-center gap-2 px-3 text-left text-[11px] font-bold text-[#51443E]"><Pencil size={13} />게시물 수정</button>
                  <button type="button" onClick={requestPostDelete} className="flex h-10 w-full items-center gap-2 border-t border-[#EEE3DD] px-3 text-left text-[11px] font-bold text-[#D84D52]"><Trash2 size={13} />게시물 삭제</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => { setShowPostMenu(false); go(authorProfilePath); }} className="block h-10 w-full px-3 text-left text-[11px] font-bold text-[#51443E]">작성자 보기</button>
                  <button type="button" disabled={postReported} onClick={reportPost} className="block h-10 w-full border-t border-[#EEE3DD] px-3 text-left text-[11px] font-bold text-[#D84D52] disabled:text-[#A99D97]">{postReported ? '신고 완료' : '게시물 신고'}</button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative mx-3 overflow-hidden rounded-[14px] border border-[#EED9D0] bg-[#F1E7DE]">
          <div
            data-ui="munchie-template-artwork"
            onPointerUp={handleArtworkPointerUp}
            className="block w-full touch-manipulation"
          >
            <TemplateArtwork course={course} template={template} photoSources={post.photos} decorOverride={renderedDecor} strokesOverride={renderedStrokes} eager />
          </div>
          {post.missingOriginalMedia && <span className="absolute left-2 top-2 z-10 rounded-full bg-black/55 px-2 py-1 text-[9px] font-bold text-white">원본 사진이 없는 이전 게시물</span>}
          <button
            type="button"
            onClick={() => go(`/template/${template.id}?course=${course.id}&from=${detailOrigin}`)}
            className="absolute right-2 top-2 z-10 rounded-full bg-[#FFFDFC]/90 px-2.5 py-1 text-[9px] font-black text-[#765E53] shadow-sm backdrop-blur"
            aria-label="Munchie 피드 이미지 상세 보기"
          >
            템플릿 보기
          </button>
          <motion.div
            aria-hidden="true"
            initial={false}
            animate={{ opacity: reviewRevealed ? 1 : 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-28 bg-gradient-to-t from-[#241712]/85 via-[#241712]/45 to-transparent"
          />
          <button
            type="button"
            onClick={() => interactive && setReviewRevealed(value => !value)}
            aria-label={reviewRevealed ? '한줄평 음영 숨기기' : '한줄평 또렷하게 보기'}
            aria-pressed={reviewRevealed}
            className="absolute inset-x-3 bottom-3 z-10 text-left"
          >
            <OneLineReviewBox
              compact
              className={`shadow-[0_3px_10px_rgba(45,29,24,0.1)] backdrop-blur-[1px] transition-[background-color,border-color,color,box-shadow] duration-200 ${
                reviewRevealed
                  ? '!border-white/25 !bg-[#2D1D18]/20 !text-white shadow-[0_5px_18px_rgba(0,0,0,0.2)]'
                  : '!border-[#F2B6AB]/55 !bg-[#FFF8F4]/46 !text-[#3B2A23]'
              }`}
            >
              <span className={`line-clamp-1 w-full text-[12px] font-bold leading-5 ${
                reviewRevealed
                  ? '[text-shadow:0_1px_3px_rgba(0,0,0,0.38)]'
                  : '[text-shadow:0_1px_1px_rgba(255,255,255,0.72)]'
              }`}>
                {post.caption}
              </span>
            </OneLineReviewBox>
          </button>
        </div>

        <div className="mx-3 flex items-center justify-between py-2.5 text-[#A27469]">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void togglePostLike()} className={`flex h-10 min-w-10 items-center justify-center gap-1 rounded-xl px-2 ${liked ? 'bg-[#FFE2DF] text-[#D94E55]' : 'text-current'}`} aria-label="좋아요">
              <ThumbsUp size={20} strokeWidth={2} fill={liked ? 'currentColor' : 'none'} /><span className="text-[10px] font-black">{post.likes}</span>
            </button>
            <button type="button" onClick={() => interactive && setCommentExpanded(true)} className="flex h-10 min-w-10 items-center justify-center gap-1 rounded-xl px-2 text-current" aria-label="댓글 보기">
              <MessageCircle size={20} strokeWidth={2} /><span className="text-[10px] font-black">{visibleComments.length}</span>
            </button>
            <button type="button" onClick={() => go(courseMapPath)} className="flex h-10 w-10 items-center justify-center rounded-xl text-current" aria-label="코스맵 보기">
              <Map size={23} strokeWidth={2} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void shareFeedPost()} className="flex h-10 w-10 items-center justify-center rounded-xl text-current" aria-label="공유하기"><Share2 size={20} strokeWidth={2} /></button>
            <button
              type="button"
              onClick={() => {
                if (!interactive) return;
                saved ? unsaveCourse(course.id) : saveCourse(course.id);
                toast.success(saved ? '저장을 해제했어요.' : 'Munchie 피드를 저장했어요.');
              }}
              className={saved
                ? SAVED_BOOKMARK_BUTTON_CLASS
                : 'flex h-10 w-10 items-center justify-center rounded-xl text-current'}
              aria-label={saved ? '저장 해제' : '저장'}
            >
              <Bookmark size={20} strokeWidth={2} fill={saved ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

      </article>

      {deleteConfirmation}

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
                          <p className="text-[13px] leading-relaxed text-[#3E302A]"><strong className="mr-1.5 font-medium">{entry.authorName}</strong>{entry.text}</p>
                          <div className="mt-1.5 flex items-center gap-3 text-[10px] font-bold text-[#81716A]">
                            <span>{timeAgo(entry.createdAt)}</span>
                            {!nested && <button type="button" onClick={() => setReplyingTo({ id: entry.id, authorName: entry.authorName })}>답글 달기</button>}
                            <button type="button" onClick={() => reactToFeedComment(post.id, entry.id, 'like')} className={entry.myReaction === 'like' ? 'text-[#E83D45]' : ''}><ThumbsUp className="inline" size={13} /> {entry.likes ?? 0}</button>
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
                    <input value={comment} onChange={event => setComment(event.target.value)} onKeyDown={event => event.key === 'Enter' && void submitComment()} placeholder={auth?.isAnonymous ? '로그인 후 댓글을 남길 수 있어요' : (replyingTo ? `${replyingTo.authorName}님에게 답글...` : '댓글 입력')} className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#9B8A82]" autoFocus />
                    <button type="button" onClick={() => void submitComment()} disabled={!comment.trim()} aria-label="댓글 등록" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EF6B6D] text-white disabled:bg-[#E8DDD8]"><Send size={18} /></button>
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
