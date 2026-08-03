import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AuthStatus { uid: string; isAnonymous: boolean; email?: string; name?: string; picture?: string }

export async function getAuthStatus(): Promise<AuthStatus> {
  try {
    // Cloudflare Pages Function이 발급한 Google 세션이 운영 신원의 기준이다.
    // Supabase 브라우저 세션은 레거시/로컬 폴백일 뿐, 여기보다 우선하면
    // Google 로그인 직후에도 프로필이 익명으로 보이는 상태가 발생한다.
    const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
    if (response.ok) {
      const { user } = await response.json() as {
        user?: { sub?: string; email?: string; name?: string; picture?: string } | null;
      };
      if (user?.sub) {
        return {
          uid: user.sub,
          isAnonymous: false,
          email: user.email,
          name: user.name,
          picture: user.picture,
        };
      }
      // 응답을 받은 경우에는 서버가 신원을 확정한 것이다. Supabase의 남은
      // 로컬 토큰으로 다른 로그인 상태를 만들어 내지 않는다.
      return { uid: 'anonymous', isAnonymous: true };
    }
  } catch {
    // 개발 중 Functions가 없을 때만 아래 Supabase 호환 폴백을 사용한다.
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { uid: 'anonymous', isAnonymous: true };
    return {
      uid: user.id,
      isAnonymous: user.is_anonymous ?? false,
      email: user.email,
      name: user.user_metadata?.full_name ?? user.user_metadata?.name,
      picture: user.user_metadata?.avatar_url ?? user.user_metadata?.picture,
    };
  } catch {
    return { uid: 'anonymous', isAnonymous: true };
  }
}

export function useAuthStatus() {
  return useQuery({ queryKey: ['authStatus'], queryFn: getAuthStatus, staleTime: Infinity });
}
