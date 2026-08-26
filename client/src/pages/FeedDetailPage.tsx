import { useLocation, useParams, useSearch } from 'wouter';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/contexts/AppContext';
import UnifiedMunchieCard from '@/components/munchie/UnifiedMunchieCard';
import BackButton from '@/components/ui/BackButton';
import { getSavedReturnPath } from '@/lib/savedNavigation';
import { useProfileFeed } from '@/hooks/useProfileFeed';

export default function FeedDetailPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const { feedPosts, isMyPost, deleteCourseWithFeed, isLoading } = useApp();
  const searchParams = new URLSearchParams(search);
  const profileAuthorId = searchParams.get('authorId') ?? '';
  const profileFeed = useProfileFeed(profileAuthorId);
  const post = feedPosts.find(item => item.id === id)
    ?? profileFeed.posts.find(item => item.id === id);
  const origin = searchParams.get('from');
  const fromProfile = origin === 'profile';
  const fromSaved = origin === 'saved';
  const fromNotifications = origin === 'notifications';
  const profileReturnId = searchParams.get('profileId');
  const savedView = fromSaved && searchParams.get('savedView') === 'map'
    ? 'map'
    : undefined;
  const detailOrigin = fromProfile ? 'profile' : fromSaved ? 'saved' : 'feed';
  const backPath = fromNotifications
    ? '/?notifications=1'
    : fromProfile
      ? profileReturnId ? `/profile/${profileReturnId}` : '/profile'
      : fromSaved
        ? getSavedReturnPath(search, id)
        : '/feed?tab=feed';
  const backLabel = fromNotifications ? '알림으로 돌아가기' : fromProfile ? '프로필로 돌아가기' : fromSaved ? '저장목록으로 돌아가기' : '먼치피드로 돌아가기';
  const deletePost = async () => {
    if (!post || !window.confirm('게시물과 원본 코스를 영구 삭제할까요? 되돌릴 수 없습니다.')) return;
    const response = await fetch(`/api/feed-post?courseId=${encodeURIComponent(post.courseId)}`, {
      method: 'DELETE', credentials: 'same-origin',
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      toast.error(payload.error || '게시물을 삭제하지 못했어요.');
      return;
    }
    deleteCourseWithFeed(post.courseId);
    toast.success('게시물과 원본 코스를 삭제했어요.');
    navigate(backPath, { replace: true });
  };

  if (!post && (isLoading || profileFeed.isLoading)) {
    return <main className="flex min-h-dvh items-center justify-center bg-[#FCF4EE] text-sm font-bold text-[#9A8579]">피드를 불러오는 중이에요…</main>;
  }

  if (!post) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#FCF4EE] px-6 text-center">
        <div>
          <p className="font-bold text-[#2D211C]">피드를 찾을 수 없어요</p>
          <button onClick={() => navigate(backPath)} className="mt-4 rounded-full bg-[#E85053] px-6 py-3 text-sm font-bold text-white">돌아가기</button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-[#FCF4EE] pb-8">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-[#FCF4EE]/95 px-5 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur">
        <BackButton onClick={() => navigate(backPath)} aria-label={backLabel} />
        <p className="text-[15px] font-black text-[#2D211C]">Munchie Feed</p>
        {isMyPost(post) ? (
          <div className="flex gap-1">
            <button onClick={() => navigate(`/feed/${post.id}/edit?from=${detailOrigin}`)} aria-label="피드 수정" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FDE1E1] text-[#D94447]"><Pencil size={17} /></button>
            <button onClick={() => void deletePost()} aria-label="피드 삭제" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FCE9E7] text-[#B94A45]"><Trash2 size={17} /></button>
          </div>
        ) : <span className="h-10 w-10" />}
      </header>
      <section className="px-4 pt-2">
        <UnifiedMunchieCard post={post} detailOrigin={detailOrigin} savedView={savedView} />
      </section>
    </main>
  );
}
