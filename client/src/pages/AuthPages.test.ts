import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const APP_SOURCE = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const AUTH_BOOTSTRAP_SOURCE = readFileSync(new URL('../components/auth/AuthBootstrap.tsx', import.meta.url), 'utf8');
const AUTH_STATUS_SOURCE = readFileSync(new URL('../hooks/useAuthStatus.ts', import.meta.url), 'utf8');
const VITE_CONFIG_SOURCE = readFileSync(new URL('../../../vite.config.ts', import.meta.url), 'utf8');
const CALLBACK_SOURCE = readFileSync(new URL('./AuthCallbackPage.tsx', import.meta.url), 'utf8');
const LOGIN_SOURCE = readFileSync(new URL('./AuthLoginPage.tsx', import.meta.url), 'utf8');
const PROFILE_SOURCE = readFileSync(new URL('./ProfilePage.tsx', import.meta.url), 'utf8');
const AVATAR_SOURCE = readFileSync(new URL('../components/ui/avatar.tsx', import.meta.url), 'utf8');

describe('web auth routes and integration boundaries', () => {
  it('registers login and callback routes without the TabBar', () => {
    expect(APP_SOURCE).toContain('<Route path="/login">');
    expect(APP_SOURCE).toContain('<Route path="/auth/login"');
    expect(APP_SOURCE).toContain('<Route path="/auth/callback"');
    expect(APP_SOURCE).toContain("'/auth'");
  });

  it('relies on automatic URL session detection without a manual code exchange', () => {
    expect(CALLBACK_SOURCE).not.toContain('exchangeCodeForSession');
  });

  it('keeps bootstrap and page auth status on the same session result', () => {
    expect(AUTH_BOOTSTRAP_SOURCE).toContain('getAuthStatus()');
    expect(AUTH_BOOTSTRAP_SOURCE).toContain("queryClient.setQueryData<AuthStatus>(['authStatus'], auth)");
    expect(AUTH_STATUS_SOURCE).toContain('refetchOnMount');
    expect(AUTH_STATUS_SOURCE).not.toContain('staleTime: Infinity');
  });

  it('routes Vite dev OAuth starts to Pages Functions instead of the legacy API', () => {
    expect(VITE_CONFIG_SOURCE).toContain('"/api/auth/google/start"');
    expect(VITE_CONFIG_SOURCE).toContain('target: "http://localhost:8788"');
  });

  it('keeps OAuth errors visible instead of immediately restarting login', () => {
    expect(LOGIN_SOURCE).toContain('if (authError) return;');
    expect(LOGIN_SOURCE).toContain('오류 코드: {authError}');
  });

  it('adds auth controls only inside the existing Profile settings sheet', () => {
    expect(PROFILE_SOURCE).toContain("activeSheet === 'settings'");
    expect(PROFILE_SOURCE).toContain('Google로 로그인');
    expect(PROFILE_SOURCE).toContain('<AccountLogoutButton');
  });

  it('does not clear the local preview profile during sign-out', () => {
    expect(PROFILE_SOURCE).not.toContain("removeItem('lm_profile')");
    expect(PROFILE_SOURCE).not.toContain('removeItem("lm_profile")');
  });

  it('loads shared avatar images without referrers', () => {
    expect(AVATAR_SOURCE).toContain('referrerPolicy = "no-referrer"');
    expect(AVATAR_SOURCE).toContain('referrerPolicy={referrerPolicy}');
  });
});
