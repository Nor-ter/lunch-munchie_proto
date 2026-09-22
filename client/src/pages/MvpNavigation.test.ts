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
    expect(tabBarSource).toContain("{ path: \"/feed\", label: \"Discover\"");
    expect(tabBarSource).toContain("{ path: \"/saved\", label: \"Saved\"");
    expect(tabBarSource).toContain("{ path: \"/profile\", label: \"Profile\"");
    expect(tabBarSource).not.toContain("{ path: \"/coursemap/new\", label: \"Post\"");
    expect(tabBarSource).toContain('grid-cols-3');
    expect(tabBarSource).toContain("aria-label=\"Main navigation\"");
    expect(tabBarSource).not.toContain('{ path: "/", label: "홈"');
    expect(tabBarSource).not.toContain('{ path: "/lunchie/settings"');
    expect(feedSource).toContain("aria-label=\"Create course\"");
    expect(feedSource).toContain("onClick={() => navigate('/coursemap/new')}");
    expect(feedSource).toContain('fixed bottom-[calc(var(--lm-tab-bar-height)+14px)]');
    expect(feedSource).toContain('createPortal(');
    expect(feedSource).toContain('document.body');
    expect(profileSource).toContain("aria-label=\"Create a post\"");
    expect(profileSource).toContain("onClick={() => navigate('/coursemap/new')}");
    expect(profileSource).toContain("aria-label=\"Log in to post\"");
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
    expect(settingsSource).toContain("title=\"Edit profile\"");
    expect(settingsSource).toContain("title=\"Food preferences\"");
    expect(settingsSource).toContain("title=\"Notifications\"");
    expect(settingsSource).toContain("title=\"Favourite cuisines\"");
    expect(settingsSource).toContain("Clear all");
    expect(settingsSource).toContain('PreferenceCategoryCard');
    expect(settingsSource).toContain('summarizeSelections');
    expect(settingsSource).toContain('favoriteFoods: normalizeFavoriteFoods(favoriteFoods)');
    expect(settingsSource).toContain('data-testid="settings-save-bar"');
    expect(settingsSource).not.toContain("<Section label=\"Profile\">");
    expect(settingsSource).toContain("Account deletion isn't available yet.");
    expect(settingsSource).not.toContain("navigate('/profile?avatar=edit')");
    expect(settingsSource).toContain("Change photo");
    expect(profileSource).not.toContain("aria-label=\"Change avatar\"");
    expect(profileSource).not.toContain('/api/uploads');
    expect(settingsSource).toContain('/api/uploads');
    expect(settingsSource).not.toContain("label=\"Food preferences\"");
    expect(settingsSource).toContain('data-testid="profile-edit-avatar-preview"');
    expect(settingsSource).toContain('<AccountBanner variant="settings-entry" />');
    expect(settingsSource).toContain('auth.data.isAnonymous');
    expect(settingsSource).toContain("<Section label=\"General\">");
    expect(settingsSource).toContain("label=\"Language\" detail=\"English\"");
    expect(settingsSource).toContain("label=\"Theme\" detail=\"System default\"");
    expect(settingsSource).toContain("label=\"Help and feedback\"");
    expect(settingsSource).toContain("label=\"Privacy policy\"");
    expect(settingsSource).toContain("label=\"Terms of use\"");
    expect(settingsSource).toContain("const APP_VERSION = '1.0.0'");
    expect(settingsSource).not.toContain('SupportInfoSettingsPage');
    expect(profileSource).not.toContain("get('avatar')");
    expect(profileSource).toContain("const goToSettings = useCallback(() => {");
    expect(profileSource).toContain("navigate('/settings');");
    expect(profileSource).toContain("<HeaderIconButton onClick={goToSettings} aria-label=\"Profile settings\">");
  });
});
