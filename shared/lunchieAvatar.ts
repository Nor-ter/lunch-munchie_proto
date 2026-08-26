export const DEFAULT_LUNCHIE_SESSION_AVATAR = '😊';

export const SUPPORTED_LUNCHIE_SESSION_AVATARS = [
  '😊', '🍱', '🍜', '🍣', '🥩', '🍕', '🌮', '🍔',
  '🥗', '☕', '🎂', '🍰', '🦊', '🐱', '🐼', '🐨',
] as const;

const supportedSessionAvatars = new Set<string>(SUPPORTED_LUNCHIE_SESSION_AVATARS);

const deprecatedProfileAvatarPaths = new Set([
  '/logo 002.png',
  '/assets/logo 003 3.png',
  '/assets/lunchie-brand-mark.png',
  '/assets/lunchie-logo.png',
  '/src/assets/lunchie-logo.png',
]);

const deprecatedProfileAvatarTokens = new Set([
  'brand-mark',
  'default-logo',
  'legacy-logo',
  'logo',
  'lunchie-logo',
]);

export function normalizeLunchieSessionAvatar(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_LUNCHIE_SESSION_AVATAR;
  const candidate = value.trim();
  return supportedSessionAvatars.has(candidate)
    ? candidate
    : DEFAULT_LUNCHIE_SESSION_AVATAR;
}

export function normalizeLunchieProfileImage(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const candidate = value.trim();
  if (!candidate) return undefined;

  const token = candidate.toLowerCase();
  if (deprecatedProfileAvatarTokens.has(token)) return undefined;

  try {
    const path = decodeURIComponent(new URL(candidate, 'https://lunchie.invalid').pathname).toLowerCase();
    if (deprecatedProfileAvatarPaths.has(path)) return undefined;
  } catch {
    // Preserve non-URL values unless they match a known retired token above.
  }

  return candidate;
}
