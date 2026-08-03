import { useQuery } from '@tanstack/react-query';

export interface AuthStatus { uid: string; isAnonymous: boolean; email?: string; name?: string; picture?: string }

export async function getAuthStatus(): Promise<AuthStatus> {
  try {
    const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
    const { user } = response.ok ? await response.json() as {
      user?: { sub?: string; email?: string; name?: string; picture?: string } | null;
    } : { user: null };
    return user?.sub
      ? { uid: user.sub, isAnonymous: false, email: user.email, name: user.name, picture: user.picture }
      : { uid: 'anonymous', isAnonymous: true };
  } catch {
    return { uid: 'anonymous', isAnonymous: true };
  }
}

export function useAuthStatus() {
  return useQuery({ queryKey: ['authStatus'], queryFn: getAuthStatus, staleTime: Infinity });
}
