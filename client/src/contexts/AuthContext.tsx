import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

export type WebAuthStatus =
  | 'unconfigured'
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'error';

export type WebAuthState = {
  status: WebAuthStatus;
  session: Session | null;
  user: User | null;
  error: Error | null;
  isConfigured: boolean;
};

export type WebAuthActionResult = {
  error: Error | null;
};

export type WebAuthContextValue = WebAuthState & {
  signInWithGoogle: (redirectTo: string) => Promise<WebAuthActionResult>;
  signOut: () => Promise<WebAuthActionResult>;
};

type WebAuthEnvironment = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
};

export interface WebAuthClient {
  auth: {
    getSession: () => Promise<{
      data: { session: Session | null };
      error: Error | null;
    }>;
    onAuthStateChange: (
      callback: (event: AuthChangeEvent, session: Session | null) => void,
    ) => {
      data: {
        subscription: {
          unsubscribe: () => void;
        };
      };
    };
    signInWithOAuth: (credentials: {
      provider: 'google';
      options: {
        redirectTo: string;
      };
    }) => Promise<{ error: Error | null }>;
    signOut: (options: {
      scope: 'local';
    }) => Promise<{ error: Error | null }>;
  };
}

interface WebAuthSessionController {
  ready: Promise<void>;
  stop: () => void;
}

const AuthContext = createContext<WebAuthContextValue | null>(null);

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Supabase Auth initialization failed');
}

export function isWebAuthConfigured(
  environment: WebAuthEnvironment = import.meta.env,
): boolean {
  return Boolean(
    environment.VITE_SUPABASE_URL?.trim()
    && (
      environment.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
      || environment.VITE_SUPABASE_ANON_KEY?.trim()
    ),
  );
}

export function createWebAuthValue(
  session: Session | null,
): WebAuthState {
  return {
    status: session ? 'authenticated' : 'unauthenticated',
    session,
    user: session?.user ?? null,
    error: null,
    isConfigured: true,
  };
}

function createWebAuthErrorValue(error: unknown): WebAuthState {
  return {
    status: 'error',
    session: null,
    user: null,
    error: toError(error),
    isConfigured: true,
  };
}

/**
 * Starts session restoration and the auth-state subscription as one lifecycle.
 * stop() is safe to call before the dynamic client import or getSession resolves,
 * which keeps React StrictMode effect replays from retaining duplicate listeners.
 */
export function startWebAuthSession({
  loadClient,
  onValue,
}: {
  loadClient: () => Promise<WebAuthClient>;
  onValue: (value: WebAuthState) => void;
}): WebAuthSessionController {
  let active = true;
  let unsubscribe: (() => void) | undefined;

  const ready = (async () => {
    try {
      const client = await loadClient();
      if (!active) return;

      let receivedAuthEvent = false;
      const { data: { subscription } } = client.auth.onAuthStateChange(
        (_event, session) => {
          receivedAuthEvent = true;
          if (active) onValue(createWebAuthValue(session));
        },
      );
      unsubscribe = () => subscription.unsubscribe();

      if (!active) {
        unsubscribe();
        unsubscribe = undefined;
        return;
      }

      const { data, error } = await client.auth.getSession();
      if (!active) return;

      if (error) {
        onValue(createWebAuthErrorValue(error));
      } else if (!receivedAuthEvent) {
        onValue(createWebAuthValue(data.session));
      }
    } catch (error) {
      if (active) onValue(createWebAuthErrorValue(error));
    }
  })();

  return {
    ready,
    stop: () => {
      active = false;
      unsubscribe?.();
      unsubscribe = undefined;
    },
  };
}

const loadSupabaseClient = async (): Promise<WebAuthClient> => {
  const { supabase } = await import('@/lib/supabase');
  return supabase;
};

export async function startGoogleOAuth(
  client: WebAuthClient,
  redirectTo: string,
): Promise<WebAuthActionResult> {
  try {
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    return { error: error ? toError(error) : null };
  } catch (error) {
    return { error: toError(error) };
  }
}

export async function signOutLocally(
  client: WebAuthClient,
): Promise<WebAuthActionResult> {
  try {
    const { error } = await client.auth.signOut({ scope: 'local' });
    return { error: error ? toError(error) : null };
  } catch (error) {
    return { error: toError(error) };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isWebAuthConfigured();
  const [value, setValue] = useState<WebAuthState>(() => (
    configured
      ? {
          status: 'loading',
          session: null,
          user: null,
          error: null,
          isConfigured: true,
        }
      : {
          status: 'unconfigured',
          session: null,
          user: null,
          error: null,
          isConfigured: false,
        }
  ));

  useEffect(() => {
    if (!configured) {
      setValue({
        status: 'unconfigured',
        session: null,
        user: null,
        error: null,
        isConfigured: false,
      });
      return;
    }

    setValue({
      status: 'loading',
      session: null,
      user: null,
      error: null,
      isConfigured: true,
    });

    const controller = startWebAuthSession({
      loadClient: loadSupabaseClient,
      onValue: setValue,
    });

    return controller.stop;
  }, [configured]);

  const signInWithGoogle = useCallback(async (redirectTo: string) => {
    if (!configured) {
      return { error: new Error('Supabase Auth is not configured') };
    }

    try {
      return startGoogleOAuth(await loadSupabaseClient(), redirectTo);
    } catch (error) {
      return { error: toError(error) };
    }
  }, [configured]);

  const signOut = useCallback(async () => {
    if (!configured) {
      return { error: new Error('Supabase Auth is not configured') };
    }

    try {
      return signOutLocally(await loadSupabaseClient());
    } catch (error) {
      return { error: toError(error) };
    }
  }, [configured]);

  const contextValue = useMemo<WebAuthContextValue>(() => ({
    ...value,
    signInWithGoogle,
    signOut,
  }), [signInWithGoogle, signOut, value]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
