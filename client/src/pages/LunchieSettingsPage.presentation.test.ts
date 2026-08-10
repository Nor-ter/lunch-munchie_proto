import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const settingsSource = readFileSync(join(import.meta.dirname, 'LunchieSettingsPage.tsx'), 'utf8');
const lobbySource = readFileSync(join(import.meta.dirname, 'SessionLobbyPage.tsx'), 'utf8');
const tabBarSource = readFileSync(join(import.meta.dirname, '..', 'components', 'TabBar.tsx'), 'utf8');

describe('Lunchie Quick Match presentation', () => {
  it('reuses the home preference art and adds a random card with a selected marker', () => {
    expect(settingsSource).toContain('/assets/characters/quick-match/coffee.png');
    expect(settingsSource).toContain('/assets/characters/quick-match/rice.png');
    expect(settingsSource).toContain('/assets/characters/quick-match/dessert.png');
    expect(settingsSource).toContain("label: 'RANDOM'");
    expect(settingsSource).toContain('aria-pressed={selected}');
  });

  it('uses direct controls for invite size, distance, and dietary needs without a budget section', () => {
    expect(settingsSource).toContain('aria-label="초대 인원 줄이기"');
    expect(settingsSource).toContain('aria-label="초대 인원 늘리기"');
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

  it('preserves the production location and radius data contract behind the new ruler UI', () => {
    expect(settingsSource).toContain("import { localityForCoordinate } from '@shared/melbourneLocality'");
    expect(settingsSource).toContain('const [distanceEnabled, setDistanceEnabled] = useState(false)');
    expect(settingsSource).toContain('originLatitude: currentOrigin?.latitude');
    expect(settingsSource).toContain('originLongitude: currentOrigin?.longitude');
    expect(settingsSource).toContain('radius_m: distanceEnabled ? radius : null');
    expect(settingsSource).toContain('<DistanceRuler radius={radius} onChange={selectRadius}');
  });

  it('presents the deadline as a live clock dial inspired by the timer reference', () => {
    expect(settingsSource).toContain("Array.from({ length: 30 }");
    expect(settingsSource).toContain('<linearGradient id={gradientId}');
    expect(settingsSource).toContain('`${minutes}분, ${deadlineLabel} 종료`');
    expect(settingsSource).toContain('aria-label="마감 시간 1분 늘리기"');
    expect(settingsSource).toContain('aria-label="마감 시간 1분 줄이기"');
    expect(settingsSource).not.toContain('다이얼을 돌리면 종료 시각이 바로 바뀌어요');
    expect(settingsSource).not.toContain('<DeadlineMinuteInput');
    expect(settingsSource).toContain("if (event.key === 'Home') onChange(1)");
    expect(settingsSource).toContain("if (event.key === 'End') onChange(15)");
  });

  it('restores invite size, removes ratings, and presents expanded dietary options in English', () => {
    expect(settingsSource).not.toContain('원하는 평점');
    expect(settingsSource).not.toContain('>참여자</CardTitle>');
    expect(settingsSource).toContain('함께 먹을 정원');
    expect(settingsSource).toContain("label: 'Carnivore'");
    expect(settingsSource).toContain("label: 'Small Appetite'");
    expect(settingsSource).toContain("label: 'Asian', value: 'Asian'");
    expect(settingsSource).toContain("label: 'Beef', value: 'No Beef'");
    expect(settingsSource).toContain("label: 'Nuts', value: 'No Nuts'");
    expect(settingsSource).toContain('aria-controls="dietary-exclusion-menu"');
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
