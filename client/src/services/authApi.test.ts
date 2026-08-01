import { describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';
import {
  getAuthRedirectTo, getGoogleAccountDetails, getGoogleIdentityProfile, IDENTITY_CONFLICT_CODE,
  parseAuthRedirectError, shouldPromptForGoogleProfile,
} from './authApi';

describe('parseAuthRedirectError', () => {
  it('parses an identity conflict from the query', () => {
    expect(parseAuthRedirectError(`http://localhost:5173/profile?error_code=${IDENTITY_CONFLICT_CODE}&error_description=used`))
      .toEqual({ code: IDENTITY_CONFLICT_CODE, description: 'used' });
  });

  it('parses an identity conflict from the hash', () => {
    expect(parseAuthRedirectError(`http://localhost:5173/profile#error_code=${IDENTITY_CONFLICT_CODE}&error_description=used`))
      .toEqual({ code: IDENTITY_CONFLICT_CODE, description: 'used' });
  });

  it('returns null when no OAuth error is present', () => {
    expect(parseAuthRedirectError('http://localhost:5173/profile')).toBeNull();
  });
});

describe('getAuthRedirectTo', () => {
  it('returns the profile route on the active Vite origin', () => {
    expect(getAuthRedirectTo('http://localhost:5173')).toBe('http://localhost:5173/profile?google_profile=ask');
  });
});

describe('getGoogleIdentityProfile', () => {
  it('extracts the Google display name and avatar without applying them automatically', () => {
    const user = {
      identities: [{ provider: 'google', identity_data: { full_name: 'Google User', avatar_url: 'https://example.com/avatar.jpg' } }],
    } as unknown as User;
    expect(getGoogleIdentityProfile(user)).toEqual({
      displayName: 'Google User',
      avatarUrl: 'https://example.com/avatar.jpg',
    });
  });
});

describe('getGoogleAccountDetails', () => {
  it('returns the linked Google account name, photo, and email', () => {
    const user = {
      email: 'fallback@example.com',
      identities: [{
        provider: 'google',
        identity_data: {
          full_name: 'Google User',
          avatar_url: 'https://example.com/avatar.jpg',
          email: 'google@example.com',
        },
      }],
    } as unknown as User;

    expect(getGoogleAccountDetails(user)).toEqual({
      displayName: 'Google User',
      avatarUrl: 'https://example.com/avatar.jpg',
      email: 'google@example.com',
    });
  });

  it('falls back to the auth user email', () => {
    const user = {
      email: 'fallback@example.com',
      identities: [{ provider: 'google', identity_data: {} }],
    } as unknown as User;

    expect(getGoogleAccountDetails(user).email).toBe('fallback@example.com');
  });
});

describe('shouldPromptForGoogleProfile', () => {
  it('asks only on the first Google OAuth return', () => {
    expect(shouldPromptForGoogleProfile('?google_profile=ask', false)).toBe(true);
    expect(shouldPromptForGoogleProfile('?google_profile=ask', true)).toBe(false);
    expect(shouldPromptForGoogleProfile('', false)).toBe(false);
  });
});
