import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(join(import.meta.dirname, '..', 'App.tsx'), 'utf8');
const tabBarSource = readFileSync(join(import.meta.dirname, '..', 'components', 'TabBar.tsx'), 'utf8');
const feedSource = readFileSync(join(import.meta.dirname, 'MunchieFeedPage.tsx'), 'utf8');
const profileSource = readFileSync(join(import.meta.dirname, 'ProfilePage.tsx'), 'utf8');

describe('Munchie-first MVP navigation', () => {
  it('opens discovery from the root and keeps creation behind Google auth', () => {
    expect(appSource).toContain('<Route path="/">{() => <Redirect to="/feed" />}</Route>');
    expect(appSource).toContain('<Route path="/legacy/home" component={HomePage} />');
    expect(appSource).toContain('<RequireGoogleAuth userId={userId}><CoursemapCreatePage /></RequireGoogleAuth>');
  });

  it('keeps creation in profile and exposes only discovery, saved, and profile in primary navigation', () => {
    expect(tabBarSource).toContain('{ path: "/feed", label: "발견"');
    expect(tabBarSource).toContain('{ path: "/saved", label: "저장"');
    expect(tabBarSource).toContain('{ path: "/profile", label: "내 정보"');
    expect(tabBarSource).not.toContain('{ path: "/coursemap/new", label: "게시"');
    expect(tabBarSource).toContain('grid-cols-3');
    expect(tabBarSource).toContain('aria-label="주요 메뉴"');
    expect(tabBarSource).not.toContain('{ path: "/", label: "홈"');
    expect(tabBarSource).not.toContain('{ path: "/lunchie/settings"');
    expect(feedSource).not.toContain('aria-label="새 Munchie 피드 작성"');
    expect(profileSource).toContain('aria-label="새 게시물 작성"');
    expect(profileSource).toContain("onClick={() => navigate('/coursemap/new')}");
    expect(profileSource).toContain('aria-label="로그인하고 게시물 작성"');
    expect(profileSource).toContain("const POST_GOOGLE_LOGIN = '/api/auth/google/start?next=%2Fcoursemap%2Fnew'");
  });
});
