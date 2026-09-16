import { LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { useIsFollowing } from '@/hooks/useIsFollowing';
import { useToggleFollow } from '@/hooks/useToggleFollow';

export function FollowButton({ userId, initialFollowing }: { userId: string; initialFollowing?: boolean }) {
  const { data: myId, isLoading: currentUserLoading } = useCurrentUserId();
  const status = useIsFollowing(userId, initialFollowing);
  const toggle = useToggleFollow(userId);

  if (!userId || myId === userId) return null;

  const following = status.data ?? false;
  const busy = currentUserLoading || status.isLoading || toggle.isPending;

  return (
    <button
      type="button"
      data-testid="follow-button"
      disabled={busy}
      onClick={() => toggle.mutate(!following, {
        onError: () => toast.error('Couldn\'t update who you follow. Please try again.'),
      })}
      className={following
        ? 'min-w-[78px] rounded-lg border border-[#E5DCD2] bg-white px-3.5 py-2 text-xs font-bold text-[#6F625A] disabled:opacity-60'
        : 'min-w-[78px] rounded-lg bg-[#EB5053] px-3.5 py-2 text-xs font-bold text-white disabled:opacity-60'}
      aria-label={following ? 'Unfollow' : 'Follow'}
    >
      {busy ? <LoaderCircle className="mx-auto size-4 animate-spin" /> : following ? 'Following' : 'Follow'}
    </button>
  );
}
