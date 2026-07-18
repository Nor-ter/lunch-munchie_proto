import type { User } from '@supabase/supabase-js';
import { ensureAnonymousSession, supabase } from '@/lib/supabase';

export const IDENTITY_CONFLICT_CODE = 'identity_already_exists';
export const GOOGLE_PROFILE_IMPORT_PARAM = 'google_profile';
export const GOOGLE_PROFILE_PROMPTED_KEY = 'lm_google_profile_prompted_v1';

export function getAuthRedirectTo(origin: string = window.location.origin): string {
  return `${origin.replace(/\/$/, '')}/profile?${GOOGLE_PROFILE_IMPORT_PARAM}=ask`;
}

export function shouldPromptForGoogleProfile(
  search: string = window.location.search,
  alreadyPrompted: boolean = localStorage.getItem(GOOGLE_PROFILE_PROMPTED_KEY) === 'true',
): boolean {
  return new URLSearchParams(search).get(GOOGLE_PROFILE_IMPORT_PARAM) === 'ask' && !alreadyPrompted;
}

export function markGoogleProfilePrompted(): void {
  localStorage.setItem(GOOGLE_PROFILE_PROMPTED_KEY, 'true');
}

export interface AuthRedirectError {
  code: string;
  description: string | null;
}

function paramsFromHash(hash: string): URLSearchParams {
  const value = hash.startsWith('#') ? hash.slice(1) : hash;
  return new URLSearchParams(value.startsWith('?') ? value.slice(1) : value);
}

export function parseAuthRedirectError(
  urlLike: string = typeof window === 'undefined' ? 'http://localhost/' : window.location.href,
): AuthRedirectError | null {
  const base = typeof window === 'undefined' ? 'http://localhost/' : window.location.origin;
  const url = new URL(urlLike, base);
  const hashParams = paramsFromHash(url.hash);
  const code = url.searchParams.get('error_code') ?? hashParams.get('error_code');
  if (!code) return null;
  return {
    code,
    description: url.searchParams.get('error_description') ?? hashParams.get('error_description'),
  };
}

export function clearAuthRedirectError(): void {
  const url = new URL(window.location.href);
  for (const key of ['error', 'error_code', 'error_description']) url.searchParams.delete(key);
  const hash = paramsFromHash(url.hash);
  for (const key of ['error', 'error_code', 'error_description']) hash.delete(key);
  const cleanHash = hash.toString();
  window.history.replaceState({}, '', `${url.pathname}${url.search}${cleanHash ? `#${cleanHash}` : ''}`);
}

export async function linkIdentityWithGoogle(): Promise<void> {
  const { error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: { redirectTo: getAuthRedirectTo() },
  });
  if (error) throw error;
}

export async function confirmConflictSignIn(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: getAuthRedirectTo() },
  });
  if (error) throw error;
}

export async function signOutToAnonymous(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  await ensureAnonymousSession();
}

export function getGoogleIdentityProfile(user: User): { displayName: string | null; avatarUrl: string | null } {
  const identity = user.identities?.find((item) => item.provider === 'google');
  const data = identity?.identity_data ?? {};
  return {
    displayName: typeof data.full_name === 'string' ? data.full_name : typeof data.name === 'string' ? data.name : null,
    avatarUrl: typeof data.avatar_url === 'string' ? data.avatar_url : typeof data.picture === 'string' ? data.picture : null,
  };
}

export interface GoogleAccountDetails {
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
}

export function getGoogleAccountDetails(user: User): GoogleAccountDetails {
  const profile = getGoogleIdentityProfile(user);
  const identity = user.identities?.find((item) => item.provider === 'google');
  const identityEmail = identity?.identity_data?.email;
  return {
    ...profile,
    email: typeof identityEmail === 'string' ? identityEmail : user.email ?? null,
  };
}

/** 사용자 확인 후에만 Google 이름/사진을 public.users에 반영한다. */
export async function applyGoogleProfile(user: User): Promise<{ displayName: string | null; avatarUrl: string | null }> {
  const profile = getGoogleIdentityProfile(user);
  const updates: Record<string, string> = {};
  if (profile.displayName) updates.username = profile.displayName;
  if (profile.avatarUrl) updates.profile_image_url = profile.avatarUrl;
  if (Object.keys(updates).length === 0) return profile;

  const { error } = await supabase.from('users').update(updates).eq('id', user.id);
  if (error) throw error;
  return profile;
}

function isDefaultUsername(username: string, uid: string): boolean {
  return username === `user_${uid.slice(0, 8)}`;
}

export async function syncProfileIfDefault(user: User): Promise<void> {
  const profile = getGoogleIdentityProfile(user);
  if (!profile.displayName && !profile.avatarUrl) return;

  const { data: row, error } = await supabase.from('users').select('username').eq('id', user.id).maybeSingle();
  if (error) throw error;
  if (!row || !isDefaultUsername(row.username, user.id)) return;

  const updates: Record<string, string> = {};
  if (profile.displayName) updates.username = profile.displayName;
  if (profile.avatarUrl) updates.profile_image_url = profile.avatarUrl;
  const { error: updateError } = await supabase.from('users').update(updates).eq('id', user.id);
  if (updateError) throw updateError;
}
