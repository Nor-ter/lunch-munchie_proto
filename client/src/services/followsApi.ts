import type { User, UserSearchResult } from '@/types/db';

export async function getCurrentUserId(): Promise<string> {
  const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
  const { user } = response.ok ? await response.json() as { user?: { sub?: string } | null } : { user: null };
  if (!user?.sub) throw new Error('Please sign in again.');
  return user.sub;
}

export async function getUser(userId: string): Promise<User | null> {
  const response = await fetch(`/api/users/${encodeURIComponent(userId)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Couldn\'t load the profile.');
  return await response.json() as User;
}

export async function searchUsers(query: string, signal?: AbortSignal): Promise<UserSearchResult[]> {
  const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
    credentials: 'same-origin',
    signal,
  });
  if (response.status === 401) throw new Error('Sign in to search people.');
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || 'Couldn\'t search people.');
  }
  return await response.json() as UserSearchResult[];
}

export async function followUser(followingId: string): Promise<void> {
  const response = await fetch(`/api/users/${encodeURIComponent(followingId)}/follow`, { method: 'POST', credentials: 'same-origin' });
  if (!response.ok) throw new Error('Couldn\'t follow this person.');
}

export async function unfollowUser(followingId: string): Promise<void> {
  const response = await fetch(`/api/users/${encodeURIComponent(followingId)}/follow`, { method: 'DELETE', credentials: 'same-origin' });
  if (!response.ok) throw new Error('Couldn\'t unfollow this person.');
}

export async function getIsFollowing(followingId: string): Promise<boolean> {
  const response = await fetch(`/api/users/${encodeURIComponent(followingId)}/follow`, { credentials: 'same-origin' });
  if (!response.ok) throw new Error('Couldn\'t load follow status.');
  return Boolean((await response.json() as { following?: boolean }).following);
}

export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  const response = await fetch(`/api/users/${encodeURIComponent(userId)}/follows`, { credentials: 'same-origin' });
  if (!response.ok) throw new Error('Couldn\'t load follow counts.');
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
  if (!response.ok) throw new Error('Couldn\'t load the follow list.');
  return await response.json() as User[];
}
