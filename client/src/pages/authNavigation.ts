export const DEFAULT_AUTH_NEXT_PATH = '/profile';
export const AUTH_NEXT_SESSION_KEY = 'lm_web_auth_next';

type AuthNextStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const INTERNAL_URL_BASE = 'https://lunchmate.local';
const AUTH_ROUTE_PATHS = new Set(['/auth/login', '/auth/callback']);

export function sanitizeAuthNextPath(value: string | null | undefined): string {
  const candidate = value?.trim();
  if (
    !candidate
    || !candidate.startsWith('/')
    || candidate.startsWith('//')
    || candidate.includes('\\')
  ) {
    return DEFAULT_AUTH_NEXT_PATH;
  }

  try {
    const url = new URL(candidate, INTERNAL_URL_BASE);
    if (url.origin !== INTERNAL_URL_BASE || AUTH_ROUTE_PATHS.has(url.pathname)) {
      return DEFAULT_AUTH_NEXT_PATH;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_AUTH_NEXT_PATH;
  }
}

export function resolveAuthNextPath(
  search: string,
  storage?: AuthNextStorage,
): string {
  const params = new URLSearchParams(search);
  if (params.has('next')) {
    return sanitizeAuthNextPath(params.get('next'));
  }

  if (!storage) return DEFAULT_AUTH_NEXT_PATH;

  try {
    return sanitizeAuthNextPath(storage.getItem(AUTH_NEXT_SESSION_KEY));
  } catch {
    return DEFAULT_AUTH_NEXT_PATH;
  }
}

export function rememberAuthNextPath(
  storage: AuthNextStorage,
  nextPath: string,
): void {
  try {
    storage.setItem(AUTH_NEXT_SESSION_KEY, sanitizeAuthNextPath(nextPath));
  } catch {
    // OAuth can still continue with the default callback when storage is unavailable.
  }
}

export function clearRememberedAuthNextPath(storage: AuthNextStorage): void {
  try {
    storage.removeItem(AUTH_NEXT_SESSION_KEY);
  } catch {
    // Navigation already has a safe path, so storage cleanup failure is non-fatal.
  }
}

export function buildAuthLoginPath(nextPath: string): string {
  return `/auth/login?next=${encodeURIComponent(sanitizeAuthNextPath(nextPath))}`;
}

export function createOAuthCallbackUrl(origin: string): string {
  return new URL('/auth/callback', origin).toString();
}

export function hasOAuthCallbackError(search: string, hash: string): boolean {
  const hasErrorParam = (value: string) => {
    const params = new URLSearchParams(value.replace(/^[?#]/, ''));
    return params.has('error') || params.has('error_code') || params.has('error_description');
  };

  return hasErrorParam(search) || hasErrorParam(hash);
}
