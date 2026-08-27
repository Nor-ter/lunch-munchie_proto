import LunchmateCharacterRenderer from '@/components/munchie/LunchmateCharacterRenderer';
import LunchmateRoomRenderer from '@/components/munchie/LunchmateRoomRenderer';
import ProfileLunchmateFrame, {
  PROFILE_LUNCHMATE_CHARACTER_ANCHOR_CLASS,
  PROFILE_LUNCHMATE_CHARACTER_SIZE,
} from '@/components/profile/ProfileLunchmateFrame';
import { lunchmateLoadoutFromProfile } from '@/utils/lunchmateProfile';
import type { PublicLunchmateProfile } from '@/types/db';

export interface PublicLunchmateRoomProps {
  lunchmate?: PublicLunchmateProfile;
  unavailable?: boolean;
}

function LunchmateState({ children }: { children: string }) {
  return (
    <ProfileLunchmateFrame className="flex items-center justify-center border-2 border-dashed border-white/70 px-6 text-center text-[13px] font-bold text-[#8A6E60]">
      {children}
    </ProfileLunchmateFrame>
  );
}

export default function PublicLunchmateRoom({ lunchmate, unavailable = false }: PublicLunchmateRoomProps) {
  const hasPresentation = Boolean(
    lunchmate?.character
    || lunchmate?.skin
    || lunchmate?.roomConfig
    || (lunchmate?.loadout && Object.values(lunchmate.loadout).some(Boolean)),
  );

  return (
    <div
      role="region"
      aria-label="읽기 전용 런치메이트 룸"
      data-lunchmate-owner-mode="visitor"
      data-lunchmate-read-only="true"
    >
      {unavailable ? (
        <LunchmateState>런치메이트 룸을 불러오지 못했어요.</LunchmateState>
      ) : lunchmate?.visibility === 'private' ? (
        <LunchmateState>이 사용자의 런치메이트 룸은 비공개예요.</LunchmateState>
      ) : !lunchmate || !hasPresentation ? (
        <LunchmateState>아직 공개된 런치메이트 룸이 없어요.</LunchmateState>
      ) : (
        <ProfileLunchmateFrame data-testid="public-lunchmate-room">
          <LunchmateRoomRenderer
            foodieSkin={lunchmate.skin}
            loadout={lunchmate.roomConfig}
            variant="profile"
          />
          <div className={PROFILE_LUNCHMATE_CHARACTER_ANCHOR_CLASS}>
            <LunchmateCharacterRenderer
              flowState="idle"
              loadout={lunchmateLoadoutFromProfile(lunchmate.loadout)}
              size={PROFILE_LUNCHMATE_CHARACTER_SIZE}
              renderSize="compact"
              artwork="chicken"
              chickenAssetKeyOverride="idle"
              chickenFaceSystem
              chickenFaceOverride="default"
              animated={false}
              fallback={(
                <span className="text-[60px] leading-none" role="img" aria-label="런치메이트 대체 표시">
                  {lunchmate.character ?? '🐥'}
                </span>
              )}
            />
            <div className="h-[5px] w-[45px] rounded-full bg-black/15" aria-hidden="true" />
          </div>
        </ProfileLunchmateFrame>
      )}
    </div>
  );
}
