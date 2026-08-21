import { describe, expect, it } from 'vitest';
import { getGoogleAuthStartUrl } from './authApi';

describe('Google auth start URL', () => {
  it('keeps Pages dev OAuth on port 8788 when launched from Vite port 5173', () => {
    expect(getGoogleAuthStartUrl('/coursemap/new', 'http://localhost:5173')).toBe(
      'http://localhost:8788/api/auth/google/start?next=%2Fcoursemap%2Fnew',
    );
  });

  it('uses a same-origin relative URL on the Pages dev server', () => {
    expect(getGoogleAuthStartUrl('/profile', 'http://localhost:8788')).toBe(
      '/api/auth/google/start?next=%2Fprofile',
    );
  });
});
