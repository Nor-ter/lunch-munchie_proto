import { useFollowCounts } from '@/hooks/useFollowCounts';

interface ProfileStatsProps {
  userId: string;
  onPressFollowers?: () => void;
  onPressFollowing?: () => void;
}

export function ProfileStats({ userId, onPressFollowers, onPressFollowing }: ProfileStatsProps) {
  const { data, isLoading } = useFollowCounts(userId);
  const values = [
    { label: '팔로워', value: data?.followers ?? 0, onClick: onPressFollowers },
    { label: '팔로잉', value: data?.following ?? 0, onClick: onPressFollowing },
  ];

  return <>
    {values.map((item) => (
      <button
        type="button"
        key={item.label}
        onClick={item.onClick}
        disabled={!item.onClick}
        className="border-r border-[#EBC5B8] text-center disabled:cursor-default"
        aria-label={`${item.label} 목록`}
      >
        <p className="font-black text-[17px] text-[#3B2A22]">{isLoading ? '–' : item.value.toLocaleString()}</p>
        <p className="mt-0.5 text-[10px] text-[#8A6E60]">{item.label}</p>
      </button>
    ))}
  </>;
}
