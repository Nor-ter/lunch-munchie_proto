import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getUser } },
}));

import { getAuthStatus } from './useAuthStatus';

describe('getAuthStatus', () => {
  beforeEach(() => {
    getUser.mockReset();
    vi.unstubAllGlobals();
  });

  it('uses the Cloudflare Google session before a stale Supabase browser session', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'stale-supabase-user', is_anonymous: false } },
      error: null,
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          sub: 'google-user', email: 'user@example.com', name: 'Google User', picture: 'https://example.com/avatar.png',
        },
      }),
    }));

    await expect(getAuthStatus()).resolves.toEqual({
      uid: 'google-user',
      isAnonymous: false,
      email: 'user@example.com',
      name: 'Google User',
      picture: 'https://example.com/avatar.png',
    });
    expect(getUser).not.toHaveBeenCalled();
  });

  it('treats an available server session endpoint with no user as anonymous', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: null }),
    }));

    await expect(getAuthStatus()).resolves.toEqual({ uid: 'anonymous', isAnonymous: true });
    expect(getUser).not.toHaveBeenCalled();
  });

  it('uses Supabase only when the Cloudflare session endpoint is unavailable locally', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'local-user', is_anonymous: false, email: 'local@example.com', user_metadata: { name: 'Local User' } } },
      error: null,
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Functions unavailable')));

    await expect(getAuthStatus()).resolves.toMatchObject({
      uid: 'local-user', isAnonymous: false, email: 'local@example.com', name: 'Local User',
    });
  });
});
