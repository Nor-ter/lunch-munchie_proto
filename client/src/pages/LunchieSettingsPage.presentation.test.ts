import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const settingsSource = readFileSync(join(import.meta.dirname, 'LunchieSettingsPage.tsx'), 'utf8');
const lobbySource = readFileSync(join(import.meta.dirname, 'SessionLobbyPage.tsx'), 'utf8');
const tabBarSource = readFileSync(join(import.meta.dirname, '..', 'components', 'TabBar.tsx'), 'utf8');
const preferenceSource = readFileSync(join(import.meta.dirname, '..', 'lib', 'quickMatch.ts'), 'utf8');
const managementSource = readFileSync(join(import.meta.dirname, '..', 'components', 'lunchie', 'SessionManagementMenu.tsx'), 'utf8');
const swipeSource = readFileSync(join(import.meta.dirname, 'LunchieSwipePage.tsx'), 'utf8');

describe('Lunchie Quick Match presentation', () => {
  it('reuses the home preference art and adds a random card with a selected marker', () => {
    expect(settingsSource).toContain('/assets/characters/quick-match/coffee.png');
    expect(settingsSource).toContain('/assets/characters/quick-match/rice.png');
    expect(settingsSource).toContain('/assets/characters/quick-match/dessert.png');
    expect(settingsSource).toContain("label: 'RANDOM'");
    expect(settingsSource).toContain('aria-pressed={selected}');
  });

  it('uses direct controls for invite size, distance, and dietary needs without a budget section', () => {
    expect(settingsSource).toContain('aria-label="Group size"');
    expect(settingsSource).toContain('aria-valuemax={12}');
    expect(settingsSource).toContain('onPointerCancel={finishDrag}');
    expect(settingsSource).toContain('aria-label="검색 거리"');
    expect(settingsSource).not.toContain('런치킨을 좌우로 움직여 검색 범위를 정해요');
    expect(settingsSource).not.toContain('aria-label="한 사람당 예산 세로 선택"');
    expect(settingsSource).not.toContain('1인 예산');
    expect(settingsSource).toContain('side-walk-${walkDirection}-${walkFrame}');
    expect(settingsSource).toContain('lunchmateLoadoutFromProfile(profile.lunchmateLoadout)');
  });

  it('caps the touch dial at 15 minutes and aligns the ruler to 1–5km+', () => {
    expect(settingsSource).toContain('aria-valuemax={15}');
    expect(settingsSource).toContain('onPointerMove={event =>');
    expect(settingsSource).toContain('aria-label="마감 분 직접 입력"');
    expect(settingsSource).toContain('const RADIUS_OPTIONS = [1000, 2000, 3000, 4000, 5000]');
    expect(settingsSource).toContain("return radius >= 5000 ? '5km+' : `${radius / 1000}km`");
  });

  it('restores group settings and enables every canonical dietary filter', () => {
    expect(settingsSource).not.toContain('원하는 평점');
    expect(settingsSource).not.toContain('>참여자</CardTitle>');
    expect(settingsSource).toContain('함께 먹을 정원');
    expect(settingsSource).toContain('QUICK_MATCH_SETTINGS_STORAGE_KEY');
    expect(preferenceSource).toContain("label: 'Pescatarian'");
    expect(preferenceSource).toContain("value: 'GLUTEN_FREE'");
    expect(preferenceSource).toContain("value: 'NO_SEAFOOD'");
    expect(preferenceSource).not.toContain("label: 'Carnivore'");
    expect(preferenceSource).not.toContain("label: 'Small Appetite'");
    expect(settingsSource).toContain('No ingredients selected');
    expect(settingsSource).toContain('aria-controls="dietary-exclusion-menu"');
    expect(settingsSource).not.toContain('Not available');
    expect(settingsSource).not.toContain('>Soon</span>');
    expect(settingsSource).toContain('For severe allergies');
  });

  it('shows a server-verified progress card and shares cancel/leave controls with the lobby', () => {
    expect(settingsSource).toContain('Quick Match in progress');
    expect(settingsSource).toContain('activeSessionVerified');
    expect(settingsSource).toContain('<SessionManagementMenu');
    expect(lobbySource).toContain('<SessionManagementMenu');
    expect(managementSource).toContain('Cancel this Quick Match?');
    expect(managementSource).toContain('Leave this lobby?');
  });

  it('renders explicit swipe loading, API, catalogue, preference, and session states', () => {
    expect(swipeSource).toContain('Preparing your Quick Match');
    expect(swipeSource).toContain('Restaurants aren’t available yet');
    expect(swipeSource).toContain('No matches found');
    expect(swipeSource).toContain('This Quick Match is no longer available');
    expect(swipeSource).toContain('Try again');
  });

  it('keeps the Quick Match and lobby navigation bar flat like the home navigation', () => {
    expect(tabBarSource).toContain('location === "/lunchie/settings"');
    expect(tabBarSource).toContain('location === "/session/lobby"');
    expect(settingsSource).not.toContain('fixed inset-x-0 bottom-[var(--lm-tab-bar-height)]');
  });

  it('returns from the lobby to settings and renders the personalized lunchmate instead of the legacy gif', () => {
    expect(lobbySource).toContain("navigate('/lunchie/settings')");
    expect(lobbySource).toContain('alt="참여자를 기다리는 나의 런치킨"');
    expect(lobbySource).toContain('lunchmateLoadoutFromProfile(profile.lunchmateLoadout)');
    expect(lobbySource).not.toContain('lunchie-quick-match-jump.gif');
  });

  it('allows QR invitations to use a LAN or tunnel origin without changing session data', () => {
    expect(lobbySource).toContain('resolveInviteOrigin(import.meta.env.VITE_INVITE_ORIGIN, window.location.origin)');
    expect(lobbySource).toContain('`${inviteOrigin}/join/${currentSession.inviteCode}`');
  });
});
