/**
 * Lunchie Munchie — My Profile
 * 스크랩북 프로필: 내가 만든 코스맵 템플릿 + 내가 쓴 피드를 한눈에 보고 관리한다.
 * - 나의 코스맵: 스킨 카드 그리드, 좋아요 순/최신 순 정렬, 탭하면 상세(편집 가능)
 * - 나의 피드: 수정(한줄평/스킨)·삭제, 악성 댓글 숨기기(메인 피드에 일괄 반영)
 */
import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import {
  Menu, Heart, Clock, MessageCircle, Pencil, Trash2, EyeOff, Eye, ChevronDown, ChevronUp, X, Camera, Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp, isFeedCommentHidden, type FeedPost } from '@/contexts/AppContext';
import { fileToResizedDataUrl } from '@/lib/imageUtils';
import TemplateCoursemapCard from '@/components/munchie/TemplateCoursemapCard';
import SkinPicker from '@/components/munchie/SkinPicker';
import FoodieBuddy, { FOODIE_CHARS, foodieLevel } from '@/components/munchie/FoodieBuddy';

const EMOJIS = ['😊', '🍱', '🍜', '🍣', '🥩', '🍕', '🌮', '🍔', '🥗', '☕', '🎂', '🍰'];
const DIETARY_OPTIONS = ['비건', '채식', '글루텐프리', '할랄', '유제품 제외', '견과류 알러지', '해산물 제외'];

type SortMode = 'likes' | 'recent';

/** 프로필 아바타 — 업로드 사진이 있으면 사진, 없으면 이모지. 공통 렌더링으로 항상 최신 profile을 반영한다 */
function Avatar({ photo, emoji, size }: { photo?: string; emoji: string; size: number }) {
  return (
    <div
      className="rounded-full bg-[#EFE3DA] flex items-center justify-center overflow-hidden shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.49 }}
    >
      {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : emoji}
    </div>
  );
}

// ── 내 피드 관리 아이템 ───────────────────────────────────────────────────────

function MyFeedItem({
  post,
  onEdit,
}: {
  post: FeedPost;
  onEdit: (post: FeedPost) => void;
}) {
  const { getCourseById, deleteFeedPost, toggleCommentHidden } = useApp();
  const [showComments, setShowComments] = useState(false);
  const course = getCourseById(post.courseId);
  const visibleCount = post.comments.filter(c => !isFeedCommentHidden(c)).length;
  const hiddenCount = post.comments.length - visibleCount;

  const handleDelete = () => {
    if (window.confirm('이 피드를 삭제할까요?')) {
      deleteFeedPost(post.id);
      toast.success('피드를 삭제했어요');
    }
  };

  return (
    <div className="rounded-2xl bg-white border border-[#F0E8E0] overflow-hidden">
      {/* 터치해서 들어가면 바로 수정 */}
      <div className="flex gap-3 p-3 cursor-pointer active:bg-[#FAF4EE]" onClick={() => onEdit(post)}>
        <img src={post.photos[0]} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#1A1A1A] line-clamp-2 leading-snug">{post.caption}</p>
          <p className="mt-1 text-[11px] text-[#9B9B9B] truncate">📍 {course?.title ?? '삭제된 코스'}</p>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-[#B09A8C]">
            <span className="flex items-center gap-0.5"><Heart size={10} fill="currentColor" /> {post.likes}</span>
            <span className="flex items-center gap-0.5"><MessageCircle size={10} /> {visibleCount}</span>
            {hiddenCount > 0 && (
              <span className="flex items-center gap-0.5 text-[#C7A69A]"><EyeOff size={10} /> 숨김 {hiddenCount}</span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex border-t border-[#F5EDE5] text-[12px] font-semibold">
        <button onClick={() => onEdit(post)} className="flex-1 h-10 flex items-center justify-center gap-1.5 text-[#4A4A4A] active:bg-[#FAF4EE]">
          <Pencil size={13} /> 수정
        </button>
        <button
          onClick={() => setShowComments(v => !v)}
          className="flex-1 h-10 flex items-center justify-center gap-1.5 border-x border-[#F5EDE5] active:bg-[#FAF4EE]"
          style={{ color: hiddenCount > 0 ? '#E85053' : '#4A4A4A' }}
        >
          <MessageCircle size={13} /> 댓글 관리 ({post.comments.length})
          {showComments ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <button onClick={handleDelete} className="flex-1 h-10 flex items-center justify-center gap-1.5 text-[#D83A3D] active:bg-[#FBECEC]">
          <Trash2 size={13} /> 삭제
        </button>
      </div>

      {/* 댓글 관리: 숨기기 토글 → 메인 먼치피드에서 일괄 미노출 */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-[#F5EDE5] bg-[#FDFAF6]"
          >
            <div className="p-3 space-y-2">
              {post.comments.length === 0 && (
                <p className="text-[12px] text-[#9B9B9B] text-center py-2">아직 댓글이 없어요</p>
              )}
              {post.comments.map(c => (
                <div key={c.id} className="flex items-start gap-2">
                  <span className="text-[14px] shrink-0" style={{ opacity: c.hidden ? 0.4 : 1 }}>{c.authorEmoji}</span>
                  <p
                    className={`min-w-0 flex-1 text-[12px] leading-snug ${c.hidden ? 'line-through' : ''}`}
                    style={{ color: c.hidden ? '#B8AFA6' : '#1A1A1A' }}
                  >
                    <b className="mr-1">{c.authorName}</b>
                    {c.text}
                    {c.hidden && (
                      <span className="ml-1.5 rounded-full bg-[#EFE7DF] px-1.5 py-0.5 text-[10px] no-underline text-[#8A7A6C]" style={{ textDecoration: 'none', display: 'inline-block' }}>
                        숨김
                      </span>
                    )}
                  </p>
                  <button
                    onClick={() => {
                      toggleCommentHidden(post.id, c.id);
                      toast(c.hidden ? '댓글을 다시 표시해요 👀' : '댓글을 숨겼어요 — 메인 피드에 일괄 적용됩니다 🙈');
                    }}
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                    style={{ background: c.hidden ? '#EFE7DF' : '#FBECEC', color: c.hidden ? '#8A7A6C' : '#D83A3D' }}
                    aria-label={c.hidden ? '댓글 표시' : '댓글 숨기기'}
                  >
                    {c.hidden ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── ProfilePage ───────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [, navigate] = useLocation();
  const { profile, updateProfile, courses, feedPosts, isMyPost, updateFeedPost } = useApp();

  const [sort, setSort] = useState<SortMode>('likes');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [foodieOpen, setFoodieOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  // 피드 수정 시트 (한줄평만 수정 — 피드 카드는 기본 테마 고정)
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [editCaption, setEditCaption] = useState('');

  const myPosts = useMemo(() => feedPosts.filter(isMyPost), [feedPosts, isMyPost]);
  const totalLikes = myPosts.reduce((sum, p) => sum + p.likes, 0);
  // 성장점수: 코스맵 + 피드가 쌓일수록 푸디 캐릭터가 진화한다
  const foodieScore = courses.length + myPosts.length;

  const sortedCourses = useMemo(() => {
    const list = [...courses];
    if (sort === 'likes') list.sort((a, b) => b.savedCount - a.savedCount);
    else list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list;
  }, [courses, sort]);

  const openEdit = (post: FeedPost) => {
    setEditingPost(post);
    setEditCaption(post.caption);
  };

  const saveEdit = () => {
    if (!editingPost) return;
    updateFeedPost(editingPost.id, { caption: editCaption.trim() || editingPost.caption });
    setEditingPost(null);
    toast.success('피드를 수정했어요 ✅');
  };

  const saveSettings = () => {
    updateProfile({ name: editName });
    setSettingsOpen(false);
    toast.success('프로필 업데이트 완료! ✅');
  };

  const toggleDiet = (d: string) => {
    const current = profile.dietary;
    updateProfile({ dietary: current.includes(d) ? current.filter(x => x !== d) : [...current, d] });
  };

  const pickEmoji = (e: string) => {
    updateProfile({ emoji: e, avatarPhoto: undefined });
    toast.success('아바타를 변경했어요! ' + e);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file, 400, 0.85);
      updateProfile({ avatarPhoto: dataUrl });
      toast.success('프로필 사진을 업데이트했어요! 📸');
    } catch {
      toast.error('사진을 불러오지 못했어요');
    }
  };

  return (
    <div className="min-h-dvh bg-[#FCF4EE] pb-24">
      {/* 상단 메뉴 */}
      <div className="flex justify-end px-5 pt-11">
        <button
          onClick={() => { setEditName(profile.name); setSettingsOpen(true); }}
          className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center active:scale-95"
          aria-label="프로필 설정"
        >
          <Menu size={18} color="#4A4A4A" />
        </button>

        {/* 아바타 업로드용 숨은 파일 입력 — 헤더 아바타 탭 시트/설정 시트 공용 */}
        <input
          ref={avatarFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarUpload}
        />
      </div>

      {/* 핑크 프로필 카드 */}
      <div className="mx-4 mt-2 rounded-[28px] p-4 pb-5" style={{ background: '#F8DCD2' }}>
        {/* 다마고치 배너 — 코스맵·피드가 늘수록 진화하는 푸디 캐릭터 */}
        <FoodieBuddy
          score={foodieScore}
          char={profile.foodieChar}
          skinId={profile.foodieSkin}
          onCustomize={() => setFoodieOpen(true)}
        />
        <div className="relative z-20 -mt-9 px-3">
          <div className="flex items-end gap-3">
            <button
              onClick={() => setAvatarOpen(true)}
              className="relative shrink-0 rounded-full border-4 border-[#F8DCD2] shadow-md active:scale-95 transition-transform"
              aria-label="아바타 변경"
            >
              <Avatar photo={profile.avatarPhoto} emoji={profile.emoji} size={74} />
              <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#EB5053] border-2 border-white flex items-center justify-center">
                <Camera size={11} color="white" />
              </span>
            </button>
            <div className="pb-1.5 min-w-0">
              <p className="flex items-center gap-1.5 font-black text-[16px] text-[#3B2A22] truncate">
                @{profile.name}
                <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-bold text-[#C7864B]">🏅 배지</span>
              </p>
              <p className="text-[11px] text-[#8A6E60] mt-0.5">오늘도 맛있는 하루를 위해</p>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3">
          {[
            { value: 2380, label: '팔로워' },
            { value: 128, label: '팔로잉' },
            { value: totalLikes, label: '좋아요' },
          ].map((s, i, arr) => (
            <div key={s.label} className={`text-center ${i < arr.length - 1 ? 'border-r border-[#EBC5B8]' : ''}`}>
              <p className="font-black text-[17px] text-[#3B2A22]">{s.value.toLocaleString()}</p>
              <p className="text-[10px] text-[#8A6E60] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 나의 템플릿 */}
      <div className="px-4 mt-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-[18px] text-[#1A1A1A]">나의 템플릿 {sortedCourses.length}</h2>
          <div className="flex gap-1.5">
            {([['likes', '좋아요 순', Heart], ['recent', '최신 순', Clock]] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                className="flex items-center gap-1 rounded-full border px-2.5 h-7 text-[11px] font-semibold transition-colors active:scale-95"
                style={sort === key
                  ? { background: '#1A1A1A', color: '#FFFFFF', borderColor: '#1A1A1A' }
                  : { background: '#FFFFFF', color: '#4A4A4A', borderColor: '#E5DCD2' }}
              >
                <Icon size={11} fill={key === 'likes' && sort === key ? 'currentColor' : 'none'} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* 2줄 고정 + 횡 스크롤 — 다음 코스맵은 옆으로 넘겨서 본다 */}
        <div
          className="-mx-4 px-4 overflow-x-auto scrollbar-hide pb-1"
          style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
        >
          <div
            className="grid grid-flow-col gap-x-2.5 gap-y-4"
            style={{
              gridTemplateRows: 'repeat(2, auto)',
              // 3개 열은 완전히 보여주고, 다음 열은 스와이프 힌트로 살짝 노출한다.
              gridAutoColumns: 'calc((min(100vw, 480px) - 45px) / 3)',
            }}
          >
            {sortedCourses.map((course, i) => (
              <div key={course.id} style={{ scrollSnapAlign: 'start' }}>
                <TemplateCoursemapCard course={course} index={i} from="profile" />
              </div>
            ))}
          </div>
        </div>
        {sortedCourses.length > 6 && (
          <p className="mt-1 text-center text-[10px] font-medium text-[#C7A69A]">← 옆으로 넘겨보세요 →</p>
        )}
      </div>

      {/* 나의 피드 */}
      <div className="px-4 mt-8">
        <h2 className="font-black text-[18px] text-[#1A1A1A] mb-3">나의 피드 {myPosts.length}</h2>
        {myPosts.length === 0 ? (
          <button
            onClick={() => navigate('/feed/new')}
            className="w-full rounded-2xl border-2 border-dashed border-[#E5CFC5] py-8 text-center"
          >
            <p className="text-3xl mb-1">📔</p>
            <p className="text-[13px] font-bold text-[#8A7A6C]">첫 먼치 피드를 작성해보세요</p>
          </button>
        ) : (
          <div className="space-y-3">
            {myPosts.map(post => (
              <MyFeedItem key={post.id} post={post} onEdit={openEdit} />
            ))}
          </div>
        )}
      </div>

      {/* 피드 수정 시트 */}
      <AnimatePresence>
        {editingPost && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditingPost(null)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-[430px] bg-white rounded-t-3xl z-50 px-5 pt-4 pb-8 max-h-[80dvh] overflow-y-auto"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
              <div className="mb-4 flex items-center justify-between">
                <p className="font-bold text-[16px]">피드 수정</p>
                <button onClick={() => setEditingPost(null)}><X size={18} className="text-gray-400" /></button>
              </div>
              <p className="mb-1.5 text-[12px] font-semibold text-[#9B9B9B]">한줄평</p>
              <textarea
                value={editCaption}
                onChange={e => setEditCaption(e.target.value)}
                rows={3}
                className="w-full rounded-2xl bg-[#FAF6F1] border border-[#F0E8E0] p-4 text-[14px] outline-none focus:border-[#E85053] resize-none"
              />
              <button
                onClick={saveEdit}
                className="mt-5 w-full h-12 rounded-2xl bg-[#E85053] text-white font-bold text-[14px]"
              >
                저장하기
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 푸디 캐릭터 커스텀 시트 */}
      <AnimatePresence>
        {foodieOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setFoodieOpen(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-[430px] bg-white rounded-t-3xl z-50 px-5 pt-4 pb-8 max-h-[82dvh] overflow-y-auto"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
              <div className="mb-1 flex items-center justify-between">
                <p className="font-bold text-[16px]">푸디 캐릭터 꾸미기</p>
                <button onClick={() => setFoodieOpen(false)}><X size={18} className="text-gray-400" /></button>
              </div>
              <p className="mb-4 text-[11px] text-[#9B9B9B]">
                코스맵·피드를 만들수록 성장점수가 쌓여요 — 현재 <b className="text-[#E85053]">{foodieScore}점</b> ·{' '}
                Lv.{foodieLevel(foodieScore).index + 1} {foodieLevel(foodieScore).level.name}
              </p>

              <p className="mb-2 text-[12px] font-semibold text-[#9B9B9B]">캐릭터</p>
              <div className="grid grid-cols-4 gap-2">
                {FOODIE_CHARS.map(c => {
                  const active = (profile.foodieChar ?? '🍙') === c.emoji;
                  return (
                    <button
                      key={c.emoji}
                      onClick={() => { updateProfile({ foodieChar: c.emoji }); toast.success(`${c.name}(으)로 변신! ${c.emoji}`); }}
                      className={`rounded-2xl py-2.5 flex flex-col items-center gap-1 transition-all active:scale-95 ${
                        active ? 'bg-[#FFF5F5] ring-2 ring-[#EB5053]' : 'bg-[#F7F3EE]'
                      }`}
                    >
                      <span className="text-[26px] leading-none">{c.emoji}</span>
                      <span className={`text-[10px] font-semibold ${active ? 'text-[#EB5053]' : 'text-[#8A7A6C]'}`}>{c.name}</span>
                    </button>
                  );
                })}
              </div>
              {foodieLevel(foodieScore).index === 0 && (
                <p className="mt-2 text-[10px] text-[#B09A8C]">🥚 아직 알 단계예요 — 2점부터 캐릭터가 부화해요!</p>
              )}

              <p className="mt-5 mb-2 text-[12px] font-semibold text-[#9B9B9B]">방 스킨</p>
              <SkinPicker
                value={profile.foodieSkin ?? 'pink-picnic'}
                onChange={(skinId) => updateProfile({ foodieSkin: skinId })}
                columns={3}
              />

              <button
                onClick={() => setFoodieOpen(false)}
                className="mt-6 w-full h-12 rounded-2xl bg-[#E85053] text-white font-bold text-[14px]"
              >
                완료
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 프로필 설정 시트 (이름/이모지/식단) */}
      <AnimatePresence>
        {settingsOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSettingsOpen(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-[430px] bg-white rounded-t-3xl z-50 px-5 pt-4 pb-8 max-h-[80dvh] overflow-y-auto"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
              <p className="mb-4 font-bold text-[16px]">프로필 설정</p>

              {/* 아바타 — 탭하면 사진 업로드/이모지 변경 시트로 */}
              <button
                onClick={() => setAvatarOpen(true)}
                className="mb-5 flex w-full items-center gap-3 rounded-xl bg-[#FAF6F1] border border-[#F0E8E0] p-3 active:scale-[0.99] transition-transform"
              >
                <Avatar photo={profile.avatarPhoto} emoji={profile.emoji} size={48} />
                <span className="flex-1 text-left text-[13px] font-semibold text-[#4A4A4A]">아바타 변경</span>
                <Camera size={16} color="#9B9B9B" />
              </button>

              <p className="mb-1.5 text-[12px] font-semibold text-[#9B9B9B]">이름</p>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full h-11 rounded-xl bg-[#FAF6F1] border border-[#F0E8E0] px-3 text-[14px] font-bold outline-none focus:border-[#E85053]"
              />

              <p className="mt-4 mb-1.5 text-[12px] font-semibold text-[#9B9B9B]">식단 제한 (그룹 세션에 자동 적용)</p>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => toggleDiet(d)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95 ${
                      profile.dietary.includes(d) ? 'text-white' : 'bg-[#F5F5F5] text-[#4A4A4A]'
                    }`}
                    style={profile.dietary.includes(d) ? { background: '#EB5053' } : {}}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <button
                onClick={saveSettings}
                className="mt-6 w-full h-12 rounded-2xl bg-[#E85053] text-white font-bold text-[14px]"
              >
                저장하기
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 아바타 변경 시트 — 사진 업로드 또는 기본 이모지 중 선택, 즉시 반영 */}
      <AnimatePresence>
        {avatarOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 z-50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAvatarOpen(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-[430px] bg-white rounded-t-3xl z-50 px-5 pt-4 pb-8 max-h-[80dvh] overflow-y-auto"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
              <div className="mb-4 flex items-center justify-between">
                <p className="font-bold text-[16px]">아바타 변경</p>
                <button onClick={() => setAvatarOpen(false)}><X size={18} className="text-gray-400" /></button>
              </div>

              <div className="mb-5 flex flex-col items-center">
                <Avatar photo={profile.avatarPhoto} emoji={profile.emoji} size={88} />
                <button
                  onClick={() => avatarFileRef.current?.click()}
                  className="mt-3 flex items-center gap-1.5 rounded-full bg-[#EB5053] text-white px-4 h-9 text-[12px] font-bold active:scale-95 transition-transform"
                >
                  <Upload size={13} /> 사진 업로드
                </button>
                {profile.avatarPhoto && (
                  <button
                    onClick={() => { updateProfile({ avatarPhoto: undefined }); toast('사진을 지웠어요 — 이모지로 돌아가요'); }}
                    className="mt-2 text-[11px] font-semibold text-[#B0A090] underline underline-offset-2"
                  >
                    사진 삭제하고 이모지로
                  </button>
                )}
              </div>

              <p className="mb-2 text-[12px] font-semibold text-[#9B9B9B]">기본 이모지</p>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map(e => {
                  const active = !profile.avatarPhoto && profile.emoji === e;
                  return (
                    <button
                      key={e}
                      onClick={() => pickEmoji(e)}
                      className={`text-xl p-1.5 rounded-xl transition-all ${active ? 'bg-[#FFF5F5] ring-2 ring-[#EB5053] scale-110' : 'bg-[#F5F5F5]'}`}
                    >
                      {e}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setAvatarOpen(false)}
                className="mt-6 w-full h-12 rounded-2xl bg-[#E85053] text-white font-bold text-[14px]"
              >
                완료
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
