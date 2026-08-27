import {
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
} from 'react';

export const PROFILE_LUNCHMATE_CHARACTER_SIZE = 86;
export const PROFILE_LUNCHMATE_CHARACTER_ANCHOR_CLASS =
  'pointer-events-none absolute bottom-[3px] left-1/2 z-10 flex w-[116px] -translate-x-1/2 flex-col items-center';

const PROFILE_LUNCHMATE_FRAME_STYLE: CSSProperties = {
  height: 'clamp(144px, 38vw, 150px)',
  background: '#F7EEE8',
};

/** Shared Room viewport dimensions for owner and visitor profile cards. */
const ProfileLunchmateFrame = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ children, className = '', style, ...props }, ref) => (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-3xl ${className}`}
      style={{ ...PROFILE_LUNCHMATE_FRAME_STYLE, ...style }}
      data-profile-lunchmate-stage="true"
      {...props}
    >
      {children}
    </div>
  ),
);

ProfileLunchmateFrame.displayName = 'ProfileLunchmateFrame';

export default ProfileLunchmateFrame;
