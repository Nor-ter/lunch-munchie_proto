import type { UserProfile } from '@/contexts/AppContext';
import type { PublicLunchmateProfile } from '@/types/db';
import { normalizeLunchmateProfileLoadout } from '@/utils/lunchmateProfile';

export type PublicLunchmateLocalFields = Pick<
  UserProfile,
  'foodieChar' | 'foodieSkin' | 'lunchmateLoadout' | 'lunchmateRoomLoadout' | 'lunchmateVisibility'
>;

export function hasLunchmatePresentation(profile: Partial<PublicLunchmateLocalFields>): boolean {
  const loadout = normalizeLunchmateProfileLoadout(profile.lunchmateLoadout);
  return Boolean(
    profile.foodieChar
    || profile.foodieSkin
    || profile.lunchmateRoomLoadout
    || Object.values(loadout).some(Boolean),
  );
}

export function localLunchmateFieldsFromPublic(
  lunchmate: PublicLunchmateProfile,
): PublicLunchmateLocalFields {
  return {
    foodieChar: lunchmate.character ?? undefined,
    foodieSkin: lunchmate.skin ?? undefined,
    lunchmateLoadout: lunchmate.loadout ?? undefined,
    lunchmateRoomLoadout: lunchmate.roomConfig ?? undefined,
    lunchmateVisibility: lunchmate.visibility,
  };
}

export async function savePublicLunchmateProfile(
  profile: PublicLunchmateLocalFields,
): Promise<void> {
  const response = await fetch('/api/profile', {
    method: 'PATCH',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lunchmate: {
        character: profile.foodieChar ?? null,
        skin: profile.foodieSkin ?? null,
        loadout: normalizeLunchmateProfileLoadout(profile.lunchmateLoadout),
        roomConfig: profile.lunchmateRoomLoadout ?? null,
        visibility: profile.lunchmateVisibility ?? 'public',
      },
    }),
  });
  if (!response.ok) throw new Error('런치메이트 공개 프로필을 저장하지 못했습니다.');
}
