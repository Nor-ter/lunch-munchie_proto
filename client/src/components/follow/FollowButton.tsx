import { LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { useIsFollowing } from '@/hooks/useIsFollowing';
import { useToggleFollow } from '@/hooks/useToggleFollow';

export function FollowButton({ userId }: { userId: string }) {
  const { data: myId } = useCurrentUserId();
  const status = useIsFollowing(userId);
  const toggle = useToggleFollow(userId);

  if (!userId || myId === userId) return null;

  const following = status.data ?? false;
  const busy = status.isLoading || toggle.isPending;

  return (
    <button
      type="button"
      data-testid="follow-button"
      disabled={busy}
      onClick={() => toggle.mutate(!following, {
        onError: () => toast.error('팔로우 상태를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.'),
      })}
      className={following
        ? 'min-w-[78px] rounded-lg border border-[#E5DCD2] bg-white px-3.5 py-2 text-xs font-bold text-[#6F625A] disabled:opacity-60'
        : 'min-w-[78px] rounded-lg bg-[#EB5053] px-3.5 py-2 text-xs font-bold text-white disabled:opacity-60'}
      aria-label={following ? '언팔로우' : '팔로우'}
    >
      {busy ? <LoaderCircle className="mx-auto size-4 animate-spin" /> : following ? '팔로잉' : '팔로우'}
    </button>
  );
}
