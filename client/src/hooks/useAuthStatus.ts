import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AuthStatus { uid: string; isAnonymous: boolean }

async function getAuthStatus(): Promise<AuthStatus> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('로그인 세션이 없습니다.');
  return { uid: user.id, isAnonymous: user.is_anonymous ?? false };
}

export function useAuthStatus() {
  return useQuery({ queryKey: ['authStatus'], queryFn: getAuthStatus, staleTime: Infinity });
}
