import { useState } from 'react';
import { ChevronLeft, MapPin } from 'lucide-react';
import { useLocation, useParams } from 'wouter';
import { FollowButton } from '@/components/follow/FollowButton';
import { FollowerListSheet, type FollowListMode } from '@/components/follow/FollowerListSheet';
import { ProfileStats } from '@/components/follow/ProfileStats';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/hooks/useUser';
import { useProfileFeed } from '@/hooks/useProfileFeed';
import UnifiedMunchieCard from '@/components/munchie/UnifiedMunchieCard';

export default function OtherProfilePage() {
  const { id = '' } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const remoteUser = useUser(id);
  const { posts, fallbackAuthor, isLoading: isProfileFeedLoading } = useProfileFeed(id);
  const [listMode, setListMode] = useState<FollowListMode | null>(null);
  const user = remoteUser.data ?? fallbackAuthor?.user;
  const avatarFallback = fallbackAuthor?.emoji ?? user?.username.slice(0, 1).toUpperCase();
  const totalLikes = posts.reduce((sum, post) => sum + post.likes, 0);

  if (remoteUser.isLoading && !fallbackAuthor) {
    return <main className="flex min-h-dvh items-center justify-center bg-[#FCF4EE] text-sm text-[#9B9B9B]">프로필을 불러오는 중…</main>;
  }

  if (!user) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#FCF4EE] px-6 text-center">
        <div>
          <p className="text-4xl">🍽️</p>
          <h1 className="mt-3 text-lg font-black text-[#2D211C]">유저를 찾을 수 없어요</h1>
          <p className="mt-1 text-sm text-[#9B9B9B]">아직 실제 계정과 연결되지 않은 게시물일 수 있어요.</p>
          <button onClick={() => navigate('/feed')} className="mt-5 rounded-full bg-[#EB5053] px-6 py-3 text-sm font-bold text-white">피드로 돌아가기</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#FCF4EE] pb-24">
      <header className="flex items-center px-4 pb-3 pt-10">
        <button onClick={() => history.back()} aria-label="뒤로 가기" className="flex size-10 items-center justify-center rounded-full bg-white shadow-sm">
          <ChevronLeft size={20} />
        </button>
        <h1 className="flex-1 pr-10 text-center text-sm font-black text-[#2D211C]">프로필</h1>
      </header>

      <section className="mx-4 mt-3 rounded-[28px] bg-[#F8DCD2] p-6">
        <div className="flex items-center gap-4">
          <Avatar className="size-20 border-4 border-white/70">
            {user.profile_image_url && <AvatarImage src={user.profile_image_url} alt={`${user.username} 프로필`} />}
            <AvatarFallback className="bg-white/70 text-xl font-black">{avatarFallback}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black text-[#3B2A22]">{user.username}</p>
            {user.handle && (
              <p className="mt-1 truncate text-[11px] font-semibold text-[#9A7667]" data-testid="profile-user-handle">
                @{user.handle}
              </p>
            )}
            {user.location && <p className="mt-1 flex items-center gap-1 text-xs text-[#8A6E60]"><MapPin size={12} />{user.location}</p>}
            {user.bio && <p className="mt-2 text-sm text-[#6F5549]">{user.bio}</p>}
          </div>
          {remoteUser.data && <FollowButton userId={user.id} />}
        </div>
        <div className="mt-6 grid grid-cols-3">
          <ProfileStats
            userId={user.id}
            onPressFollowers={() => setListMode('followers')}
            onPressFollowing={() => setListMode('following')}
          />
          <div className="text-center">
            <p className="font-black text-[17px] text-[#3B2A22]">{totalLikes.toLocaleString()}</p>
            <p className="mt-0.5 text-[10px] text-[#8A6E60]">좋아요</p>
          </div>
        </div>
      </section>

      <section className="px-4 pb-4 pt-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-[18px] font-black text-[#2D211C]">{user.username}님의 피드</h2>
          <span className="text-[12px] font-bold text-[#A37E6F]">{posts.length}</span>
        </div>
        {isProfileFeedLoading && posts.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[#E5CFC5] py-9 text-center">
            <p className="text-[13px] font-bold text-[#8A7A6C]">피드를 동기화하는 중…</p>
          </div>
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-2 items-start gap-3" data-testid="profile-feed-grid">
            {posts.map((post) => (
              <UnifiedMunchieCard
                key={post.id}
                post={post}
                compact
                homeSummary
                detailOrigin="profile"
                profileReturnId={user.id}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-[#E5CFC5] py-9 text-center">
            <p className="mb-1 text-3xl">📔</p>
            <p className="text-[13px] font-bold text-[#8A7A6C]">아직 올린 피드가 없어요</p>
          </div>
        )}
      </section>
      <FollowerListSheet open={listMode !== null} userId={user.id} mode={listMode ?? 'followers'} onOpenChange={(open) => !open && setListMode(null)} />
    </main>
  );
}
