import type { User } from '@/types/db';

export async function getCurrentUserId(): Promise<string> {
  const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
  const { user } = response.ok ? await response.json() as { user?: { sub?: string } | null } : { user: null };
  if (!user?.sub) throw new Error('로그인 세션이 없습니다.');
  return user.sub;
}

export async function getUser(userId: string): Promise<User | null> {
  const response = await fetch(`/api/users/${encodeURIComponent(userId)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('프로필을 불러오지 못했습니다.');
  return await response.json() as User;
}

export async function followUser(followingId: string): Promise<void> {
  const response = await fetch(`/api/users/${encodeURIComponent(followingId)}/follow`, { method: 'POST', credentials: 'same-origin' });
  if (!response.ok) throw new Error('팔로우하지 못했습니다.');
}

export async function unfollowUser(followingId: string): Promise<void> {
  const response = await fetch(`/api/users/${encodeURIComponent(followingId)}/follow`, { method: 'DELETE', credentials: 'same-origin' });
  if (!response.ok) throw new Error('팔로우를 취소하지 못했습니다.');
}

export async function getIsFollowing(followingId: string): Promise<boolean> {
  const response = await fetch(`/api/users/${encodeURIComponent(followingId)}/follow`, { credentials: 'same-origin' });
  if (!response.ok) throw new Error('팔로우 상태를 불러오지 못했습니다.');
  return Boolean((await response.json() as { following?: boolean }).following);
}

export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  const response = await fetch(`/api/users/${encodeURIComponent(userId)}/follows`, { credentials: 'same-origin' });
  if (!response.ok) throw new Error('팔로우 수를 불러오지 못했습니다.');
  return await response.json() as { followers: number; following: number };
}

export async function getFollowers(userId: string): Promise<User[]> {
  return getFollowList(userId, 'followers');
}

export async function getFollowing(userId: string): Promise<User[]> {
  return getFollowList(userId, 'following');
}

async function getFollowList(userId: string, kind: 'followers' | 'following'): Promise<User[]> {
  const response = await fetch(`/api/users/${encodeURIComponent(userId)}/${kind}`, { credentials: 'same-origin' });
  if (!response.ok) throw new Error('팔로우 목록을 불러오지 못했습니다.');
  return await response.json() as User[];
}
