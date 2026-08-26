import type { UserProfile } from '@/contexts/AppContext';

/** Remote feed rows only carry legacy demo IDs for emoji. Everyone else gets a neutral glyph. */
export function feedAuthorEmoji(
  creatorId: string | undefined,
  authorName: string,
  profile: Pick<UserProfile, 'id' | 'emoji'>,
): string {
  if (creatorId === profile.id) return profile.emoji;
  if (creatorId === 'user_minji') return '🐰';
  if (creatorId === 'user_jenny') return '🍓';
  if (creatorId === 'user_minsu') return '🐻';
  const initial = authorName.replace(/^@/, '').trim().slice(0, 1);
  return initial || '🍽️';
}
