import { useState } from 'react';
import { ChevronLeft, MapPin } from 'lucide-react';
import { useLocation, useParams } from 'wouter';
import { FollowButton } from '@/components/follow/FollowButton';
import { FollowerListSheet, type FollowListMode } from '@/components/follow/FollowerListSheet';
import { ProfileStats } from '@/components/follow/ProfileStats';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/hooks/useUser';
import { DEMO_AUTHORS } from '@/data/demoAuthors';

export default function OtherProfilePage() {
  const { id = '' } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const demoUser = DEMO_AUTHORS[id];
  const user = useUser(id, !demoUser);
  const [listMode, setListMode] = useState<FollowListMode | null>(null);

  if (user.isLoading && !demoUser) {
    return <main className="flex min-h-dvh items-center justify-center bg-[#FCF4EE] text-sm text-[#9B9B9B]">프로필을 불러오는 중…</main>;
  }

  if (!demoUser && !user.data) {
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

  const profile = demoUser ?? user.data!;
  const isDemo = Boolean(demoUser);
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
            {profile.profile_image_url && <AvatarImage src={profile.profile_image_url} alt="" />}
            <AvatarFallback className="bg-white/70 text-xl font-black">{profile.username.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black text-[#3B2A22]">@{profile.username}</p>
            {profile.location && <p className="mt-1 flex items-center gap-1 text-xs text-[#8A6E60]"><MapPin size={12} />{profile.location}</p>}
            {profile.bio && <p className="mt-2 text-sm text-[#6F5549]">{profile.bio}</p>}
          </div>
          {!isDemo && <FollowButton userId={profile.id} />}
        </div>
        <div className="mt-6 grid grid-cols-2">
          {isDemo ? <div className="col-span-2 text-center text-xs font-semibold text-[#8A6E60]">샘플 피드 작성자</div> : <ProfileStats userId={profile.id} onPressFollowers={() => setListMode('followers')} onPressFollowing={() => setListMode('following')} />}
        </div>
      </section>

      <section className="px-5 py-10 text-center text-sm text-[#9B9B9B]">공개 코스와 피드는 다음 연결 단계에서 표시됩니다.</section>
      {!isDemo && <FollowerListSheet open={listMode !== null} userId={profile.id} mode={listMode ?? 'followers'} onOpenChange={(open) => !open && setListMode(null)} />}
    </main>
  );
}
