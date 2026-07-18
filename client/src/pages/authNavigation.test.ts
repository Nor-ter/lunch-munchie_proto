import { describe, expect, it, vi } from 'vitest';
import {
  AUTH_NEXT_SESSION_KEY,
  buildAuthLoginPath,
  clearRememberedAuthNextPath,
  createOAuthCallbackUrl,
  hasOAuthCallbackError,
  rememberAuthNextPath,
  resolveAuthNextPath,
  sanitizeAuthNextPath,
} from './authNavigation';

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
  };
}

describe('web auth navigation', () => {
  it('keeps internal relative next paths', () => {
    expect(sanitizeAuthNextPath('/profile?tab=lunchmate#room')).toBe(
      '/profile?tab=lunchmate#room',
    );
  });

  it.each([
    'https://example.com/profile',
    '//example.com/profile',
    '/\\example.com/profile',
    'profile',
    '/auth/login',
    '/auth/callback',
  ])('falls back to /profile for unsafe or looping next path: %s', (value) => {
    expect(sanitizeAuthNextPath(value)).toBe('/profile');
  });

  it('prefers an explicitly supplied safe query next path', () => {
    const storage = createStorage();
    storage.setItem(AUTH_NEXT_SESSION_KEY, '/saved');

    expect(resolveAuthNextPath('?next=%2Fprofile%2Ffoodie-room', storage)).toBe(
      '/profile/foodie-room',
    );
  });

  it('restores and clears the safe next path through session storage', () => {
    const storage = createStorage();

    rememberAuthNextPath(storage, '/saved');
    expect(resolveAuthNextPath('', storage)).toBe('/saved');

    clearRememberedAuthNextPath(storage);
    expect(resolveAuthNextPath('', storage)).toBe('/profile');
  });

  it('builds a login path without allowing an external next URL', () => {
    expect(buildAuthLoginPath('https://example.com')).toBe(
      '/auth/login?next=%2Fprofile',
    );
  });

  it('builds the OAuth callback from the current origin only', () => {
    expect(createOAuthCallbackUrl('http://localhost:5173')).toBe(
      'http://localhost:5173/auth/callback',
    );
  });

  it('detects provider errors without exposing or interpreting their text', () => {
    expect(hasOAuthCallbackError('?error=access_denied&error_description=secret', '')).toBe(true);
    expect(hasOAuthCallbackError('', '#error_code=provider_error')).toBe(true);
    expect(hasOAuthCallbackError('', '#access_token=not-inspected')).toBe(false);
  });
});
