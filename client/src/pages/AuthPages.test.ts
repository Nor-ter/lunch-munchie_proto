import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const APP_SOURCE = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const CALLBACK_SOURCE = readFileSync(new URL('./AuthCallbackPage.tsx', import.meta.url), 'utf8');
const PROFILE_SOURCE = readFileSync(new URL('./ProfilePage.tsx', import.meta.url), 'utf8');

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

  it('adds auth controls only inside the existing Profile settings sheet', () => {
    expect(PROFILE_SOURCE).toContain("activeSheet === 'settings'");
    expect(PROFILE_SOURCE).toContain('Google로 로그인');
    expect(PROFILE_SOURCE).toContain('<AccountLogoutButton');
  });

  it('does not clear the local preview profile during sign-out', () => {
    expect(PROFILE_SOURCE).not.toContain("removeItem('lm_profile')");
    expect(PROFILE_SOURCE).not.toContain('removeItem("lm_profile")');
  });
});
