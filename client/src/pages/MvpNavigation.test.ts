import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(join(import.meta.dirname, '..', 'App.tsx'), 'utf8');
const tabBarSource = readFileSync(join(import.meta.dirname, '..', 'components', 'TabBar.tsx'), 'utf8');
const feedSource = readFileSync(join(import.meta.dirname, 'MunchieFeedPage.tsx'), 'utf8');
const profileSource = readFileSync(join(import.meta.dirname, 'ProfilePage.tsx'), 'utf8');
const settingsSource = readFileSync(join(import.meta.dirname, 'SettingsPage.tsx'), 'utf8');

describe('Munchie-first MVP navigation', () => {
  it('opens discovery from the root and keeps creation behind Google auth', () => {
    expect(appSource).toContain('<Route path="/">{() => <Redirect to="/feed" />}</Route>');
    expect(appSource).toContain('<Route path="/legacy/home" component={HomePage} />');
    expect(appSource).toContain('<RequireGoogleAuth userId={userId}><CoursemapCreatePage /></RequireGoogleAuth>');
  });

  it('keeps the three-tab navigation and exposes course creation as a discovery FAB', () => {
    expect(tabBarSource).toContain('{ path: "/feed", label: "발견"');
    expect(tabBarSource).toContain('{ path: "/saved", label: "저장"');
    expect(tabBarSource).toContain('{ path: "/profile", label: "내 정보"');
    expect(tabBarSource).not.toContain('{ path: "/coursemap/new", label: "게시"');
    expect(tabBarSource).toContain('grid-cols-3');
    expect(tabBarSource).toContain('aria-label="주요 메뉴"');
    expect(tabBarSource).not.toContain('{ path: "/", label: "홈"');
    expect(tabBarSource).not.toContain('{ path: "/lunchie/settings"');
    expect(feedSource).toContain('aria-label="코스 만들기"');
    expect(feedSource).toContain("onClick={() => navigate('/coursemap/new')}");
    expect(feedSource).toContain('fixed bottom-[calc(var(--lm-tab-bar-height)+14px)]');
    expect(feedSource).toContain('createPortal(');
    expect(feedSource).toContain('document.body');
    expect(profileSource).toContain('aria-label="새 게시물 작성"');
    expect(profileSource).toContain("onClick={() => navigate('/coursemap/new')}");
    expect(profileSource).toContain('aria-label="로그인하고 게시물 작성"');
    expect(profileSource).toContain("const POST_GOOGLE_LOGIN = '/api/auth/google/start?next=%2Fcoursemap%2Fnew'");
  });

  it('opens profile settings as full pages without the primary tab bar', () => {
    expect(appSource).toContain('<Route path="/settings/profile">{() => <RequireGoogleAuth userId={userId}><ProfileEditSettingsPage /></RequireGoogleAuth>}</Route>');
    expect(appSource).toContain('<Route path="/settings/food-preferences" component={FoodPreferencesSettingsPage} />');
    expect(appSource).toContain('<Route path="/settings/notifications">{() => <RequireGoogleAuth userId={userId}><NotificationSettingsPage /></RequireGoogleAuth>}</Route>');
    expect(appSource).toContain('<Route path="/settings" component={SettingsPage} />');
    expect(appSource).toContain("'/settings'");
    expect(profileSource).toContain("onClick={() => navigate('/settings')}");
    expect(profileSource).not.toContain('data-testid="profile-settings-sheet"');
    expect(settingsSource).toContain('title="프로필 편집"');
    expect(settingsSource).toContain('title="음식 취향"');
    expect(settingsSource).toContain('title="알림"');
    expect(settingsSource).toContain('title="좋아하는 음식"');
    expect(settingsSource).toContain('전체 해제');
    expect(settingsSource).toContain('PreferenceCategoryCard');
    expect(settingsSource).toContain('summarizeSelections');
    expect(settingsSource).toContain('favoriteFoods: normalizeFavoriteFoods(favoriteFoods)');
    expect(settingsSource).toContain('data-testid="settings-save-bar"');
    expect(settingsSource).not.toContain('<Section label="프로필">');
    expect(settingsSource).toContain('현재 계정 삭제 기능은 아직 제공되지 않습니다.');
    expect(settingsSource).not.toContain("navigate('/profile?avatar=edit')");
    expect(settingsSource).toContain('사진 변경');
    expect(profileSource).not.toContain('aria-label="아바타 변경"');
    expect(profileSource).not.toContain('/api/uploads');
    expect(settingsSource).toContain('/api/uploads');
    expect(settingsSource).not.toContain('label="음식 취향"');
    expect(settingsSource).toContain('data-testid="profile-edit-avatar-preview"');
    expect(settingsSource).toContain('<AccountBanner variant="settings-entry" />');
    expect(settingsSource).toContain('auth.data.isAnonymous');
    expect(settingsSource).toContain('<Section label="일반">');
    expect(settingsSource).toContain('label="언어" detail="한국어"');
    expect(settingsSource).toContain('label="테마" detail="시스템 설정"');
    expect(settingsSource).toContain('label="문의 및 피드백"');
    expect(settingsSource).toContain('label="개인정보 처리방침"');
    expect(settingsSource).toContain('label="이용약관"');
    expect(settingsSource).toContain("const APP_VERSION = '1.0.0'");
    expect(settingsSource).not.toContain('SupportInfoSettingsPage');
    expect(profileSource).not.toContain("get('avatar')");
    expect(profileSource).toContain("const goToSettings = useCallback(() => {");
    expect(profileSource).toContain("navigate('/settings');");
    expect(profileSource).toContain('<HeaderIconButton onClick={goToSettings} aria-label="프로필 설정">');
  });
});
