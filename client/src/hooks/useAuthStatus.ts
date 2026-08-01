import { useQuery } from '@tanstack/react-query';
export interface AuthStatus { uid: string; isAnonymous: boolean; email?: string; name?: string; picture?: string }

async function getAuthStatus(): Promise<AuthStatus> {
  const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
  if (!response.ok) throw new Error('로그인 세션을 확인하지 못했어요.');
  const { user } = await response.json() as { user: { sub: string; email?: string; name?: string; picture?: string } | null };
  return user
    ? { uid: user.sub, isAnonymous: false, email: user.email, name: user.name, picture: user.picture }
    : { uid: 'anonymous', isAnonymous: true };
}

export function useAuthStatus() {
  return useQuery({ queryKey: ['authStatus'], queryFn: getAuthStatus, staleTime: Infinity });
}
