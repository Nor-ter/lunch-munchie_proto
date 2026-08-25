import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LUNCHIE_SESSION_AVATAR,
  normalizeLunchieProfileImage,
  normalizeLunchieSessionAvatar,
} from './lunchieAvatar';

describe('Lunchie avatar compatibility', () => {
  it('keeps currently supported session emoji avatars', () => {
    expect(normalizeLunchieSessionAvatar('🍜')).toBe('🍜');
    expect(normalizeLunchieSessionAvatar(' 🐼 ')).toBe('🐼');
  });

  it('replaces retired or malformed session avatar values with the safe default', () => {
    expect(normalizeLunchieSessionAvatar('/assets/Logo%20003%203.png')).toBe(DEFAULT_LUNCHIE_SESSION_AVATAR);
    expect(normalizeLunchieSessionAvatar('🐥')).toBe(DEFAULT_LUNCHIE_SESSION_AVATAR);
    expect(normalizeLunchieSessionAvatar(null)).toBe(DEFAULT_LUNCHIE_SESSION_AVATAR);
  });

  it('removes known retired logo assets without touching valid profile photos', () => {
    expect(normalizeLunchieProfileImage('/assets/Logo%20003%203.png')).toBeUndefined();
    expect(normalizeLunchieProfileImage('https://lunchie-munchie.pages.dev/assets/lunchie-brand-mark.png')).toBeUndefined();
    expect(normalizeLunchieProfileImage('/photos/uploads/user-1/avatar.webp')).toBe('/photos/uploads/user-1/avatar.webp');
    expect(normalizeLunchieProfileImage('https://lh3.googleusercontent.com/profile.jpg')).toBe('https://lh3.googleusercontent.com/profile.jpg');
  });
});
