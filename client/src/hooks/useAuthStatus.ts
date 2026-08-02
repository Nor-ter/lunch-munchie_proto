import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AuthStatus { uid: string; isAnonymous: boolean; email?: string; name?: string; picture?: string }

async function getAuthStatus(): Promise<AuthStatus> {
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
