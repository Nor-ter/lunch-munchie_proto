
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
  window.location.assign(`/api/auth/google/start?next=${encodeURIComponent('/profile')}`);
}

export async function confirmConflictSignIn(): Promise<void> {
  window.location.assign(`/api/auth/google/start?next=${encodeURIComponent('/profile')}`);
}

export async function signOutToAnonymous(): Promise<void> {
  const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  if (!response.ok) throw new Error('로그아웃하지 못했어요.');
  // 다른 사람이 같은 브라우저를 열었을 때 이전 계정의 방/투표 상태를 복원하지 않는다.
  for (const key of ['lm_session', 'lm_swipes', 'lm_feed_likes', 'lm_feed_dislikes', 'lm_today_journey']) {
    localStorage.removeItem(key);
  }
}
