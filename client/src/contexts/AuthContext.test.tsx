import { describe, expect, it, vi } from 'vitest';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import {
  createWebAuthValue,
  isWebAuthConfigured,
  signOutLocally,
  startWebAuthSession,
  startGoogleOAuth,
  type WebAuthClient,
  type WebAuthState,
} from './AuthContext';

function createSession(userId: string): Session {
  return {
    user: { id: userId } as User,
  } as Session;
}

function createClient({
  session,
  error = null,
}: {
  session: Session | null;
  error?: Error | null;
}) {
  let listener: ((event: AuthChangeEvent, session: Session | null) => void) | undefined;
  const unsubscribe = vi.fn();
  const getSession = vi.fn(async () => ({
    data: { session },
    error,
  }));
  const onAuthStateChange = vi.fn((
    callback: (event: AuthChangeEvent, session: Session | null) => void,
  ) => {
    listener = callback;
    return { data: { subscription: { unsubscribe } } };
  });
  const signInWithOAuth = vi.fn(async (): Promise<{ error: Error | null }> => ({ error: null }));
  const signOut = vi.fn(async (): Promise<{ error: Error | null }> => ({ error: null }));

  return {
    client: {
      auth: {
        getSession,
        onAuthStateChange,
        signInWithOAuth,
        signOut,
      },
    } satisfies WebAuthClient,
    emit(event: AuthChangeEvent, nextSession: Session | null) {
      listener?.(event, nextSession);
    },
    getSession,
    onAuthStateChange,
    signInWithOAuth,
    signOut,
    unsubscribe,
  };
}

describe('AuthContext session foundation', () => {
  it('treats missing or blank Vite variables as unconfigured', () => {
    expect(isWebAuthConfigured({})).toBe(false);
    expect(isWebAuthConfigured({
      VITE_SUPABASE_URL: ' ',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'key',
    })).toBe(false);
    expect(isWebAuthConfigured({
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'key',
    })).toBe(true);
  });

  it('maps restored sessions to authenticated state', async () => {
    const session = createSession('restored-user');
    const auth = createClient({ session });
    const values: WebAuthState[] = [];

    const controller = startWebAuthSession({
      loadClient: async () => auth.client,
      onValue: value => values.push(value),
    });
    await controller.ready;

    expect(auth.onAuthStateChange).toHaveBeenCalledOnce();
    expect(auth.getSession).toHaveBeenCalledOnce();
    expect(values).toEqual([createWebAuthValue(session)]);
  });

  it('maps an empty restored session to unauthenticated state', async () => {
    const auth = createClient({ session: null });
    const values: WebAuthState[] = [];

    const controller = startWebAuthSession({
      loadClient: async () => auth.client,
      onValue: value => values.push(value),
    });
    await controller.ready;

    expect(values.at(-1)).toMatchObject({
      status: 'unauthenticated',
      session: null,
      user: null,
      error: null,
      isConfigured: true,
    });
  });

  it('keeps context synchronized with later auth-state changes', async () => {
    const auth = createClient({ session: null });
    const values: WebAuthState[] = [];
    const nextSession = createSession('signed-in-user');

    const controller = startWebAuthSession({
      loadClient: async () => auth.client,
      onValue: value => values.push(value),
    });
    await controller.ready;
    auth.emit('SIGNED_IN', nextSession);
    auth.emit('SIGNED_OUT', null);

    expect(values.map(value => value.status)).toEqual([
      'unauthenticated',
      'authenticated',
      'unauthenticated',
    ]);
    expect(values[1].user?.id).toBe('signed-in-user');
  });

  it('reports session restoration failures without throwing from the lifecycle', async () => {
    const authError = new Error('session restore failed');
    const auth = createClient({ session: null, error: authError });
    const values: WebAuthState[] = [];

    const controller = startWebAuthSession({
      loadClient: async () => auth.client,
      onValue: value => values.push(value),
    });
    await controller.ready;

    expect(values.at(-1)).toMatchObject({
      status: 'error',
      session: null,
      user: null,
      error: authError,
      isConfigured: true,
    });
  });

  it('unsubscribes once and ignores later events after stop', async () => {
    const auth = createClient({ session: null });
    const values: WebAuthState[] = [];

    const controller = startWebAuthSession({
      loadClient: async () => auth.client,
      onValue: value => values.push(value),
    });
    await controller.ready;
    controller.stop();
    controller.stop();
    auth.emit('SIGNED_IN', createSession('ignored-user'));

    expect(auth.unsubscribe).toHaveBeenCalledOnce();
    expect(values.map(value => value.status)).toEqual(['unauthenticated']);
  });

  it('does not subscribe when stopped before the client import resolves', async () => {
    const auth = createClient({ session: null });
    let resolveClient: ((client: WebAuthClient) => void) | undefined;
    const clientPromise = new Promise<WebAuthClient>((resolve) => {
      resolveClient = resolve;
    });
    const onValue = vi.fn();

    const controller = startWebAuthSession({
      loadClient: () => clientPromise,
      onValue,
    });
    controller.stop();
    resolveClient?.(auth.client);
    await controller.ready;

    expect(auth.onAuthStateChange).not.toHaveBeenCalled();
    expect(auth.getSession).not.toHaveBeenCalled();
    expect(onValue).not.toHaveBeenCalled();
  });

  it('starts Google OAuth with the supplied callback URL', async () => {
    const auth = createClient({ session: null });
    const redirectTo = 'http://localhost:5173/auth/callback';

    const result = await startGoogleOAuth(auth.client, redirectTo);

    expect(result.error).toBeNull();
    expect(auth.signInWithOAuth).toHaveBeenCalledOnce();
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo },
    });
  });

  it('returns an OAuth start failure without throwing provider details into the UI layer', async () => {
    const auth = createClient({ session: null });
    const providerError = new Error('provider details');
    auth.signInWithOAuth.mockResolvedValueOnce({ error: providerError });

    const result = await startGoogleOAuth(
      auth.client,
      'http://localhost:5173/auth/callback',
    );

    expect(result.error).toBe(providerError);
  });

  it('signs out only the current browser session', async () => {
    const auth = createClient({ session: null });

    const result = await signOutLocally(auth.client);

    expect(result.error).toBeNull();
    expect(auth.signOut).toHaveBeenCalledOnce();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
