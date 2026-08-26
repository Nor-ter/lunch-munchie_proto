import { useQuery } from '@tanstack/react-query';

export interface AuthStatus { uid: string; isAnonymous: boolean; isAdmin: boolean; email?: string; name?: string; picture?: string }

export async function getAuthStatus(): Promise<AuthStatus> {
  try {
    const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
    const { user, isAdmin } = response.ok
      ? await response.json() as {
          user?: { sub?: string; email?: string; name?: string; picture?: string } | null;
          isAdmin?: boolean;
        }
      : { user: null, isAdmin: false };
    return user?.sub
      ? { uid: user.sub, isAnonymous: false, isAdmin: Boolean(isAdmin), email: user.email, name: user.name, picture: user.picture }
      : { uid: 'anonymous', isAnonymous: true, isAdmin: false };
  } catch {
    return { uid: 'anonymous', isAnonymous: true, isAdmin: false };
  }
}

export function useAuthStatus() {
  return useQuery({
    queryKey: ['authStatus'],
    queryFn: getAuthStatus,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
