import { useLocation } from 'wouter';
import { FollowButton } from './FollowButton';
import { useFollowers } from '@/hooks/useFollowers';
import { useFollowing } from '@/hooks/useFollowing';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export type FollowListMode = 'followers' | 'following';

interface FollowerListSheetProps {
  open: boolean;
  userId: string;
  mode: FollowListMode;
  onOpenChange: (open: boolean) => void;
}

export function FollowerListSheet({ open, userId, mode, onOpenChange }: FollowerListSheetProps) {
  const [, navigate] = useLocation();
  const followers = useFollowers(open && mode === 'followers' ? userId : '');
  const following = useFollowing(open && mode === 'following' ? userId : '');
  const query = mode === 'followers' ? followers : following;
  const title = mode === 'followers' ? '팔로워' : '팔로잉';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[75dvh] max-w-[480px] rounded-t-3xl border-[#F0E8E0] bg-white">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{title} 목록에서 프로필을 열거나 팔로우 상태를 바꿀 수 있어요.</SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-8">
          {query.isLoading && <p className="py-8 text-center text-sm text-[#9B9B9B]">불러오는 중…</p>}
          {!query.isLoading && (query.data?.length ?? 0) === 0 && (
            <p className="py-8 text-center text-sm text-[#9B9B9B]">{title} 목록이 비어 있어요.</p>
          )}
          {query.data?.map((user) => (
            <div key={user.id} className="flex items-center gap-3 border-b border-[#F5EDE5] py-3">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                onClick={() => { onOpenChange(false); navigate(`/profile/${user.id}`); }}
              >
                <Avatar className="size-10">
                  {user.profile_image_url && <AvatarImage src={user.profile_image_url} alt="" />}
                  <AvatarFallback>{user.username.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-[#2D211C]">{user.username}</span>
                  {user.handle && <span className="block truncate text-[11px] font-semibold text-[#9A8277]">@{user.handle}</span>}
                </span>
              </button>
              <FollowButton userId={user.id} />
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
