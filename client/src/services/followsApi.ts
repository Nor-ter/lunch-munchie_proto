import { supabase } from '@/lib/supabase';
import type { User, UserFollow } from '@/types/db';

export async function getCurrentUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('로그인 세션이 없습니다.');
  return user.id;
}

export async function getUser(userId: string): Promise<User | null> {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return (data as User | null) ?? null;
}

export async function followUser(followingId: string): Promise<void> {
  const { error } = await supabase.rpc('follow_user', { p_following_id: followingId });
  if (error) throw error;
}

export async function unfollowUser(followingId: string): Promise<void> {
  const { error } = await supabase.rpc('unfollow_user', { p_following_id: followingId });
  if (error) throw error;
}

export async function getIsFollowing(followingId: string): Promise<boolean> {
  const myId = await getCurrentUserId();
  const { count, error } = await supabase
    .from('user_follows')
    .select('id', { count: 'exact', head: true })
    .eq('follower_id', myId)
    .eq('following_id', followingId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  const [followersResult, followingResult] = await Promise.all([
    supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  if (followersResult.error) throw followersResult.error;
  if (followingResult.error) throw followingResult.error;
  return { followers: followersResult.count ?? 0, following: followingResult.count ?? 0 };
}

export async function getFollowers(userId: string): Promise<User[]> {
  const { data, error } = await supabase.from('user_follows').select('follower_id').eq('following_id', userId);
  if (error) throw error;
  const ids = Array.from(new Set(((data as Pick<UserFollow, 'follower_id'>[] | null) ?? []).map((row) => row.follower_id)));
  return getUsersByIds(ids);
}

export async function getFollowing(userId: string): Promise<User[]> {
  const { data, error } = await supabase.from('user_follows').select('following_id').eq('follower_id', userId);
  if (error) throw error;
  const ids = Array.from(new Set(((data as Pick<UserFollow, 'following_id'>[] | null) ?? []).map((row) => row.following_id)));
  return getUsersByIds(ids);
}

async function getUsersByIds(ids: string[]): Promise<User[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('users').select('*').in('id', ids);
  if (error) throw error;
  return (data as User[] | null) ?? [];
}
