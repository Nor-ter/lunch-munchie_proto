import type { ReactNode } from 'react';
import { MapPin } from 'lucide-react';

export interface ProfileIdentitySummaryProps {
  avatar: ReactNode;
  displayName: string;
  handle?: string | null;
  handleFallback?: string;
  location?: string | null;
  bio?: string | null;
  secondaryAction?: ReactNode;
}

/** Shared avatar/name hierarchy used by owner and visitor profile cards. */
export default function ProfileIdentitySummary({
  avatar,
  displayName,
  handle,
  handleFallback,
  location,
  bio,
  secondaryAction,
}: ProfileIdentitySummaryProps) {
  return (
    <div className="relative z-20 -mt-9 px-3" data-profile-identity-summary="true">
      <div className="flex min-w-0 items-start gap-4">
        {avatar}
        <div className="min-w-0 flex-1 pt-11">
          <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
            <p className="min-w-0 truncate text-[19px] font-black text-[#3B2A22]">
              {displayName}
            </p>
            <span className="shrink-0 rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-bold text-[#C7864B]">
              🏅 배지
            </span>
          </div>

          <div className="mt-1.5 flex min-w-0 items-center gap-3">
            <p
              className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#8A6E60]"
              data-testid="profile-user-handle"
            >
              {handle ? `@${handle}` : handleFallback}
            </p>
            {secondaryAction && <div className="shrink-0">{secondaryAction}</div>}
          </div>

          {location && (
            <p className="mt-1.5 flex min-w-0 items-center gap-1 truncate text-[11px] font-medium text-[#8A6E60]">
              <MapPin className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{location}</span>
            </p>
          )}
          {bio && (
            <p className="mt-1 line-clamp-2 text-[12px] font-medium leading-[17px] text-[#6F5549]">
              {bio}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
