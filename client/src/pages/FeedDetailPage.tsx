import { useLocation, useParams, useSearch } from 'wouter';
import { ChevronLeft, Pencil } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import UnifiedMunchieCard from '@/components/munchie/UnifiedMunchieCard';

export default function FeedDetailPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const { feedPosts, isMyPost } = useApp();
  const post = feedPosts.find(item => item.id === id);
  const fromProfile = new URLSearchParams(search).get('from') === 'profile';
  const backPath = fromProfile ? '/profile' : '/feed?tab=feed';

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
      <header className="sticky top-0 z-30 flex items-center justify-between bg-[#FCF4EE]/95 px-4 pb-3 pt-4 backdrop-blur">
        <button onClick={() => navigate(backPath)} aria-label="프로필로 돌아가기" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
          <ChevronLeft size={20} />
        </button>
        <p className="text-[15px] font-black text-[#2D211C]">Munchie Feed</p>
        {isMyPost(post) ? (
          <button
            onClick={() => navigate(`/feed/${post.id}/edit?from=${fromProfile ? 'profile' : 'feed'}`)}
            aria-label="피드 수정"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FDE1E1] text-[#D94447]"
          >
            <Pencil size={17} />
          </button>
        ) : <span className="h-10 w-10" />}
      </header>
      <section className="px-4 pt-2">
        <UnifiedMunchieCard post={post} />
      </section>
    </main>
  );
}
