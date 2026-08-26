import LunchmateCharacterRenderer from '@/components/munchie/LunchmateCharacterRenderer';
import LunchmateRoomRenderer from '@/components/munchie/LunchmateRoomRenderer';
import { lunchmateLoadoutFromProfile } from '@/utils/lunchmateProfile';
import type { PublicLunchmateProfile } from '@/types/db';

export interface PublicLunchmateRoomProps {
  lunchmate?: PublicLunchmateProfile;
  unavailable?: boolean;
}

function LunchmateState({ children }: { children: string }) {
  return (
    <div className="flex min-h-[120px] items-center justify-center rounded-3xl border-2 border-dashed border-white/70 bg-white/35 px-6 text-center text-[13px] font-bold text-[#8A6E60]">
      {children}
    </div>
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
    <section
      className="mx-4 mt-4 rounded-[28px] bg-[#F8DCD2] p-4"
      aria-label="읽기 전용 런치메이트 룸"
      data-lunchmate-owner-mode="visitor"
      data-lunchmate-read-only="true"
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-[16px] font-black text-[#3B2A22]">Lunchmate Room</h2>
        <span className="rounded-full bg-white/65 px-2.5 py-1 text-[10px] font-bold text-[#8A6E60]">보기 전용</span>
      </div>

      {unavailable ? (
        <LunchmateState>런치메이트 룸을 불러오지 못했어요.</LunchmateState>
      ) : lunchmate?.visibility === 'private' ? (
        <LunchmateState>이 사용자의 런치메이트 룸은 비공개예요.</LunchmateState>
      ) : !lunchmate || !hasPresentation ? (
        <LunchmateState>아직 공개된 런치메이트 룸이 없어요.</LunchmateState>
      ) : (
        <div
          className="relative overflow-hidden rounded-3xl bg-[#F7EEE8]"
          style={{ height: 'clamp(144px, 38vw, 150px)' }}
          data-testid="public-lunchmate-room"
        >
          <LunchmateRoomRenderer
            foodieSkin={lunchmate.skin}
            loadout={lunchmate.roomConfig}
            variant="profile"
          />
          <div className="pointer-events-none absolute bottom-[3px] left-1/2 z-10 flex w-[116px] -translate-x-1/2 flex-col items-center">
            <LunchmateCharacterRenderer
              flowState="idle"
              loadout={lunchmateLoadoutFromProfile(lunchmate.loadout)}
              size={86}
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
        </div>
      )}
    </section>
  );
}
