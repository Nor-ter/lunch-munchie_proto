import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bookmark,
  Flag,
  Map,
  MoreHorizontal,
  MessageCircle,
  MapPin,
  Send,
  Share2,
  ThumbsDown,
  ThumbsUp,
  UserRound,
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
  interactive = true,
  captionOverride,
  courseOverride,
  templateOverride,
  decorOverride,
}: {
  post: FeedPost;
  compact?: boolean;
  interactive?: boolean;
  captionOverride?: string;
  courseOverride?: Course;
  templateOverride?: CoursemapTemplate;
  decorOverride?: PlacedPhoto[];
}) {
  const [, navigate] = useLocation();
  const {
    courses,
    feedPosts,
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
  const [showAllComments, setShowAllComments] = useState(false);
  const [showAuthorDetail, setShowAuthorDetail] = useState(false);
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
  const commentsToShow = showAllComments ? visibleComments : visibleComments.slice(0, 3);
  const liked = likedFeedIds.includes(post.id);
  const saved = savedCourseIds.includes(course.id);
  const authorPostCount = feedPosts.filter(item => item.authorId === post.authorId).length;
  const displayedCaption = captionOverride ?? post.caption;

  const go = (path: string) => interactive && navigate(path);
  const submitComment = () => {
    if (!interactive || !comment.trim()) return;
    addFeedComment(post.id, comment.trim());
    setComment('');
    setCommentExpanded(true);
    toast.success('한줄평을 등록했어요.');
  };

  if (compact) {
    return (
      <article className="overflow-hidden rounded-[18px] border-2 border-[#EAD7CD] bg-[#FFFDFC] shadow-[0_7px_18px_rgba(123,76,53,0.1)]" data-testid={`unified-munchie-card-${post.id}`}>
        <button type="button" onClick={() => go(`/feed/${post.id}`)} className="block w-full text-left">
          <div className="flex h-7 shrink-0 items-center gap-1 px-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#F2BFB2] bg-[#FFF0EA] text-[9px]">{post.authorEmoji}</span>
            <strong className="min-w-0 flex-1 truncate text-[9px] text-[#62483D]">{post.authorName}</strong>
            <span className="truncate text-[7px] font-semibold text-[#A38A7E]">{timeAgo(post.createdAt)}</span>
          </div>
          <OneLineReviewBox compact className="mx-2 mb-1.5 shrink-0 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p key={displayedCaption} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="line-clamp-2 text-[9px] font-bold leading-snug text-[#3B2A23]">{displayedCaption}</motion.p>
            </AnimatePresence>
          </OneLineReviewBox>
          <div className="relative border-t border-[#F0DDD4]">
            <TemplateArtwork course={course} template={template} photoSources={post.photos} decorOverride={decorOverride} eager />
            <div className="absolute bottom-1 left-1 flex gap-1">
              <span className="flex h-6 items-center gap-0.5 rounded-lg border border-[#F2C4BA] bg-[#FFF8F4] px-1.5 text-[7px] font-black text-[#E76B68]"><ThumbsUp size={10} />{post.likes}</span>
              <span
                role="button"
                tabIndex={0}
                aria-label="스토리로 공유"
                onClick={event => { event.stopPropagation(); interactive && go(`/course/${course.id}/share`); }}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); interactive && go(`/course/${course.id}/share`); } }}
                className="flex h-6 items-center rounded-lg border border-[#CDDED3] bg-[#F7FCF8] px-1.5 text-[#668574]"
              ><Share2 size={10} /></span>
            </div>
          </div>
        </button>
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-[24px] border-2 border-[#E9D6CC] bg-[#FFFDFC] shadow-[0_12px_30px_rgba(117,73,51,0.1)]" data-testid={`unified-munchie-card-${post.id}`}>
      <header className="flex items-center gap-2.5 px-3 pb-2 pt-3">
        <button type="button" onClick={() => go(`/profile/${post.authorId}`)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#F0BCAE] bg-[#FFF1EB] text-base">
          {post.authorEmoji}
        </button>
        <button type="button" onClick={() => go(`/profile/${post.authorId}`)} className="min-w-0 text-left">
          <strong className="truncate text-[16px] font-black text-[#30231E]">{post.authorName}</strong>
        </button>
        {interactive && <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#8C7B72]">{timeAgo(post.createdAt)}</span>}
        {!interactive && <span className="flex-1" />}
        <button type="button" onClick={() => setShowAuthorDetail(true)} aria-label="작성자 정보 보기" className="p-1 text-[#B27668]"><MoreHorizontal size={22} strokeWidth={3} /></button>
      </header>

      {interactive && (
        <button type="button" onClick={() => go(`/feed/${post.id}`)} className="mx-7 mb-2 block w-[calc(100%-3.5rem)] text-left">
          <OneLineReviewBox>
            <p className="text-[14px] font-bold leading-relaxed">{post.caption}</p>
          </OneLineReviewBox>
        </button>
      )}

      <div className="relative mx-3 border-y-2 border-[#F0DDD4]">
        <button type="button" onClick={() => go(`/template/${template.id}?course=${course.id}&from=feed`)} className="block w-full" aria-label="코스피드 이미지 상세 보기">
          <TemplateArtwork course={course} template={template} photoSources={post.photos} decorOverride={decorOverride} eager />
        </button>
        <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2">
          <button type="button" onClick={() => interactive && toggleFeedLike(post.id)} className={`flex h-9 min-w-9 items-center justify-center gap-1 rounded-xl border-2 border-[#F0BDB3] px-2 ${liked ? 'bg-[#FFE1DE] text-[#D9565C]' : 'bg-[#FFF8F4] text-[#E06B68]'}`} aria-label="좋아요">
            <ThumbsUp size={21} fill={liked ? 'currentColor' : 'none'} /> <span className="text-[10px] font-black">{post.likes}</span>
          </button>
          <button type="button" onClick={() => interactive && go(`/course/${course.id}/share`)} className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#C9DCCF] bg-[#F7FCF8] text-[#678675]" aria-label="스토리로 공유"><Share2 size={19} /></button>
        </div>
        <button type="button" onClick={() => go(`/course/${course.id}?from=feed&post=${post.id}`)} className="absolute bottom-3 right-3 z-20 flex h-9 items-center gap-1 rounded-xl border-2 border-[#E7D1A9] bg-[#FFFAEB] px-3 text-[11px] font-black text-[#9A7A3F]" aria-label="코스맵 보기">
          <Map size={17} /> 코스맵
        </button>
      </div>

      <div className="flex gap-2 px-3 py-3">
        <div className="flex h-11 min-w-0 flex-1 items-center rounded-[15px] border-2 border-[#E9D6CC] bg-[#FFFDFC] px-3 text-[#9B7467]">
          <input
            value={comment}
            onFocus={() => interactive && setCommentExpanded(true)}
            onChange={event => setComment(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && submitComment()}
            placeholder="한줄평 입력"
            aria-expanded={commentExpanded}
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#4B4643]"
          />
          <button type="button" onClick={submitComment} aria-label="한줄평 등록"><Send size={23} /></button>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!interactive) return;
            saved ? unsaveCourse(course.id) : saveCourse(course.id);
            toast.success(saved ? '저장을 해제했어요.' : '코스피드를 저장했어요.');
          }}
          className={`flex h-11 min-w-[76px] items-center justify-center gap-1 rounded-[15px] border-2 border-[#F0BDB3] px-3 text-[13px] font-bold ${saved ? 'bg-[#EE7775] text-white' : 'bg-[#FFF3EE] text-[#CE655F]'}`}
        >
          <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} /> 저장
        </button>
      </div>

      <AnimatePresence initial={false}>
        {commentExpanded && (
          <motion.section initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t-2 border-[#EAD8CF] bg-[#FFFDFC]">
            <div className="space-y-4 px-4 py-4">
              <div className="flex items-center justify-between">
                <strong className="text-[13px]">코스피드 코멘트 {visibleComments.length}</strong>
                <button type="button" onClick={() => setCommentExpanded(false)} className="text-[11px] font-bold text-[#817873]">접기</button>
              </div>
              {commentsToShow.map(item => (
                <div key={item.id} className="flex items-start gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#F0C3B7] bg-[#FFF4EF] text-sm">{item.authorEmoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-relaxed"><strong className="mr-1">{item.authorName}</strong>{item.text}</p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] font-bold">
                      <button type="button" onClick={() => reactToFeedComment(post.id, item.id, 'like')} className={item.myReaction === 'like' ? 'text-[#E83D45]' : 'text-[#756C67]'}><ThumbsUp className="inline" size={13} /> {item.likes ?? 0}</button>
                      <button type="button" onClick={() => reactToFeedComment(post.id, item.id, 'dislike')} className={item.myReaction === 'dislike' ? 'text-[#6354C7]' : 'text-[#756C67]'}><ThumbsDown className="inline" size={13} /> {item.dislikes ?? 0}</button>
                      <button type="button" disabled={item.reported} onClick={() => { reportFeedComment(post.id, item.id); toast.success('코멘트를 신고했어요.'); }} className="ml-auto text-[#756C67] disabled:opacity-40"><Flag className="inline" size={12} /> {item.reported ? '신고됨' : '신고'}</button>
                    </div>
                  </div>
                </div>
              ))}
              {visibleComments.length === 0 && <p className="py-3 text-center text-[12px] text-[#8D837D]">첫 번째 한줄평을 남겨보세요.</p>}
              {visibleComments.length > 3 && <button type="button" onClick={() => setShowAllComments(value => !value)} className="w-full text-center text-[11px] font-bold">{showAllComments ? '일부만 보기' : `모두 보기 (${visibleComments.length})`}</button>}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAuthorDetail && (
          <motion.aside
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.22 }}
            className="fixed inset-x-0 bottom-0 z-[80] mx-auto w-full max-w-[480px] rounded-t-[28px] border-2 border-[#F0C9BE] bg-[#FFF8F4] px-5 pb-8 pt-5"
            aria-label="작성자 상세 정보"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-[#FF6B70] bg-white text-2xl">{post.authorEmoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#FF5960]">Munchie creator</p>
                <h3 className="mt-1 truncate text-[20px] font-black text-[#35241D]">{post.authorName}</h3>
                <p className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-[#8B7468]"><MapPin size={12} /> {course.region || 'Munchie 커뮤니티'}</p>
              </div>
              <button type="button" onClick={() => setShowAuthorDetail(false)} aria-label="작성자 정보 닫기" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFE9E2] text-[#D94449]"><X size={17} /></button>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-white px-3 py-3 text-center"><UserRound className="mx-auto text-[#FF5960]" size={17} /><strong className="mt-1 block text-[14px]">{authorPostCount}</strong><span className="text-[10px] text-[#8B7468]">코스피드</span></div>
              <div className="rounded-2xl bg-white px-3 py-3 text-center"><ThumbsUp className="mx-auto text-[#FF5960]" size={17} /><strong className="mt-1 block text-[14px]">{post.likes}</strong><span className="text-[10px] text-[#8B7468]">받은 좋아요</span></div>
              <div className="rounded-2xl bg-white px-3 py-3 text-center"><MessageCircle className="mx-auto text-[#FF5960]" size={17} /><strong className="mt-1 block text-[14px]">{visibleComments.length}</strong><span className="text-[10px] text-[#8B7468]">코멘트</span></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">{post.tags.map(tag => <span key={tag} className="rounded-full bg-[#FFE9E2] px-3 py-1.5 text-[11px] font-bold text-[#C93D43]">#{tag}</span>)}</div>
            <button type="button" onClick={() => go(`/profile/${post.authorId}`)} className="mt-5 h-12 w-full rounded-2xl bg-[#FF5960] text-[14px] font-black text-white">프로필 자세히 보기</button>
          </motion.aside>
        )}
      </AnimatePresence>
    </article>
  );
}
