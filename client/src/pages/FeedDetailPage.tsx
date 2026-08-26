import { useLocation, useParams, useSearch } from 'wouter';
import { useApp } from '@/contexts/AppContext';
import UnifiedMunchieCard from '@/components/munchie/UnifiedMunchieCard';
import BackButton from '@/components/ui/BackButton';
import { getSavedReturnPath } from '@/lib/savedNavigation';

export default function FeedDetailPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const { feedPosts, isLoading } = useApp();
  const post = feedPosts.find(item => item.id === id);
  const origin = new URLSearchParams(search).get('from');
  const fromProfile = origin === 'profile';
  const fromSaved = origin === 'saved';
  const fromNotifications = origin === 'notifications';
  const profileReturnId = new URLSearchParams(search).get('profileId');
  const savedView = fromSaved && new URLSearchParams(search).get('savedView') === 'map'
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

  if (!post && isLoading) {
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
      <header className="sticky top-0 z-30 grid grid-cols-[40px_1fr_40px] items-center bg-[#FCF4EE]/95 px-5 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur">
        <BackButton onClick={() => navigate(backPath)} aria-label={backLabel} />
        <p className="text-center text-[15px] font-black text-[#2D211C]">Munchie Feed</p>
        <span className="h-10 w-10" aria-hidden="true" />
      </header>
      <section className="px-4 pt-2">
        <UnifiedMunchieCard post={post} detailOrigin={detailOrigin} savedView={savedView} />
      </section>
    </main>
  );
}
