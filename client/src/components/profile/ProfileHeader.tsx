import type { ReactNode } from 'react';

export interface ProfileHeaderProps {
  leftAction?: ReactNode;
  rightAction?: ReactNode;
}

/** Screen-centred profile title with independently positioned edge actions. */
export default function ProfileHeader({ leftAction, rightAction }: ProfileHeaderProps) {
  return (
    <header
      className="px-4"
      style={{ paddingTop: 'max(19px, env(safe-area-inset-top, 0px))' }}
      data-testid="profile-header"
    >
      <div className="relative flex h-10 items-center justify-center">
        <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center">
          {leftAction}
        </div>
        <h1 className="text-center text-sm font-black text-[#2D211C]">프로필</h1>
        <div className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center">
          {rightAction}
        </div>
      </div>
    </header>
  );
}
