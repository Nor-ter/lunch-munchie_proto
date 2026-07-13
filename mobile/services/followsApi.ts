/**
 * services/followsApi.ts — 팔로우 관계 읽기/쓰기 (순수 함수 · React 비의존)
 *
 * follow-feature-workflow.md §6.1. followUser/unfollowUser 는 클라이언트에서 직접
 * insert/delete 하지 않고 RPC(follow_user/unfollow_user)를 거친다 — id 생성을 서버가
 * 맡고, 멱등(on conflict do nothing) 처리와 자기팔로우 차단을 DB가 강제한다
 * (commit_course_items 와 동일 사상). RPC는 SECURITY INVOKER라 RLS 그대로 적용.
 *
 * getFollowers/getFollowing 은 user_follows 에 FK가 없어(§3.4 계승) PostgREST 임베딩이
 * 안 된다. itemsApi.getItems 와 동일하게 **2쿼리 클라이언트 조인**: user_follows 로
 * 상대측 id 목록을 얻고, users 를 in(...) 으로 일괄 조회해 붙인다. users 행이 없는
 * orphan 은 목록에서 제외한다(§2.5).
 *
 * 스택: supabase-js(확정). 새 라이브러리 없음.
 */
import { supabase } from '@/lib/supabase';
import type { User, UserFollow } from '@/types/db';

/** 현재 세션의 uid. hooks 레이어(useIsFollowing 의 queryKey 등)에서도 재사용. */
export async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인 세션이 없습니다.');
  return user.id;
}

/** 단일 유저(users 행) 조회. 없으면 null. follow-screen-wiring-workflow.md §4.1 — coursesApi.getCourse 패턴. */
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

/** 내(현재 세션)가 followingId 를 팔로우 중인지. */
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

export async function getFollowCounts(
  userId: string,
): Promise<{ followers: number; following: number }> {
  const [followersRes, followingRes] = await Promise.all([
    supabase
      .from('user_follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', userId),
    supabase
      .from('user_follows')
      .select('id', { count: 'exact', head: true })
      .eq('follower_id', userId),
  ]);
  if (followersRes.error) throw followersRes.error;
  if (followingRes.error) throw followingRes.error;
  return { followers: followersRes.count ?? 0, following: followingRes.count ?? 0 };
}

/** userId 를 팔로우하는 사람들(followers) 목록. */
export async function getFollowers(userId: string): Promise<User[]> {
  const { data: follows, error } = await supabase
    .from('user_follows')
    .select('follower_id')
    .eq('following_id', userId);
  if (error) throw error;

  const followerIds = Array.from(
    new Set(((follows as Pick<UserFollow, 'follower_id'>[] | null) ?? []).map((f) => f.follower_id)),
  );
  return getUsersByIds(followerIds);
}

/** userId 가 팔로우하는 사람들(following) 목록. */
export async function getFollowing(userId: string): Promise<User[]> {
  const { data: follows, error } = await supabase
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', userId);
  if (error) throw error;

  const followingIds = Array.from(
    new Set(
      ((follows as Pick<UserFollow, 'following_id'>[] | null) ?? []).map((f) => f.following_id),
    ),
  );
  return getUsersByIds(followingIds);
}

async function getUsersByIds(ids: string[]): Promise<User[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('users').select('*').in('id', ids);
  if (error) throw error;
  // orphan(예정된 id인데 users 행이 없음) 은 자연히 결과에서 빠진다(§2.5).
  return (data as User[] | null) ?? [];
}
