import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');
const myProfileSource = readFileSync(join(import.meta.dirname, 'ProfilePage.tsx'), 'utf8');
const otherProfileSource = readFileSync(join(import.meta.dirname, 'OtherProfilePage.tsx'), 'utf8');
const headerSource = readFileSync(join(root, 'components', 'profile', 'ProfileHeader.tsx'), 'utf8');
const roomSource = readFileSync(join(root, 'components', 'profile', 'PublicLunchmateRoom.tsx'), 'utf8');
const userHookSource = readFileSync(join(root, 'hooks', 'useUser.ts'), 'utf8');
const profileApiSource = readFileSync(join(root, 'services', 'profileApi.ts'), 'utf8');
const appContextSource = readFileSync(join(root, 'contexts', 'AppContext.tsx'), 'utf8');

describe('shared profile header and visitor Lunchmate room', () => {
  it('keeps the title screen-centred for owner, guest and visitor action layouts', () => {
    expect(myProfileSource.match(/<ProfileHeader/g)).toHaveLength(2);
    expect(otherProfileSource).toContain('<ProfileHeader');
    expect(headerSource).toContain('absolute left-0');
    expect(headerSource).toContain('absolute right-0');
    expect(headerSource).toContain('>프로필</h1>');
    expect(headerSource).toContain("env(safe-area-inset-top, 0px)");
  });

  it('renders the viewed user query as a read-only room with safe states', () => {
    expect(userHookSource).toContain("queryKey: ['user', userId]");
    expect(otherProfileSource).toContain('lunchmate={remoteUser.data?.lunchmate}');
    expect(roomSource).toContain('data-lunchmate-read-only="true"');
    expect(roomSource).toContain("lunchmate?.visibility === 'private'");
    expect(roomSource).toContain('아직 공개된 런치메이트 룸이 없어요.');
    expect(roomSource).toContain('<LunchmateRoomRenderer');
    expect(roomSource).toContain('<LunchmateCharacterRenderer');
    expect(roomSource).not.toContain('onCustomize');
    expect(roomSource).not.toContain('onClick=');
  });

  it('persists only presentation fields, never inventory or rewards', () => {
    expect(profileApiSource).toContain("credentials: 'same-origin'");
    expect(profileApiSource).toContain("visibility: profile.lunchmateVisibility ?? 'public'");
    expect(profileApiSource).not.toContain('lunchmateOwnedItemIds');
    expect(profileApiSource).not.toContain('lunchmateRewardClaims');
    expect(profileApiSource).not.toContain('lunchboxInventory');
  });

  it('clears the previous account presentation before hydrating a changed session', () => {
    expect(appContextSource).toContain('lastAuthUidRef.current !== initialAuthUserId');
    expect(appContextSource).toContain('clearPublicLunchmatePresentation(authenticatedProfile)');
    expect(appContextSource).toContain('localLunchmateFieldsFromPublic(serverLunchmate)');
  });
});
