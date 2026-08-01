import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createClientMock = vi.hoisted(() => vi.fn(() => ({ kind: 'supabase-client' })));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

describe('Supabase browser client', () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('creates one client from the Vite URL and publishable key', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co/');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_example');

    const { supabase } = await import('./supabase');

    expect(createClientMock).toHaveBeenCalledOnce();
    expect(createClientMock).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'sb_publishable_example',
    );
    expect(supabase).toEqual({ kind: 'supabase-client' });
  });

  it('creates an inactive local client when Supabase is fully unconfigured', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    const { supabase } = await import('./supabase');

    expect(createClientMock).toHaveBeenCalledOnce();
    expect(createClientMock).toHaveBeenCalledWith(
      'http://127.0.0.1:54321',
      'local-development-placeholder',
    );
    expect(supabase).toEqual({ kind: 'supabase-client' });
  });

  it('fails without exposing values when the project URL is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_example');

    await expect(import('./supabase')).rejects.toThrow(
      '[Supabase] Missing required environment variable: VITE_SUPABASE_URL',
    );
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('fails without exposing values when the publishable key is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    await expect(import('./supabase')).rejects.toThrow(
      '[Supabase] Missing required environment variable: VITE_SUPABASE_PUBLISHABLE_KEY',
    );
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed project URL before creating the client', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'not-a-url');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_example');

    await expect(import('./supabase')).rejects.toThrow(
      '[Supabase] VITE_SUPABASE_URL must be a valid HTTP(S) URL',
    );
    expect(createClientMock).not.toHaveBeenCalled();
  });
});
