import type { GroupSession, Restaurant } from '@/contexts/AppContext';

export interface SavedLunchPick {
  restaurant: Restaurant;
  session: GroupSession | null;
  savedAt: number;
}

export const SAVED_LUNCH_PICKS_KEY = 'lm_saved_lunch_picks';

export function readSavedLunchPicks(raw: string | null): SavedLunchPick[] {
  try {
    const items: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(items)) return [];
    return items.filter((item): item is SavedLunchPick =>
      item && typeof item.restaurant?.id === 'string'
      && typeof item.restaurant?.name === 'string'
      && Number.isFinite(item.savedAt)
      && (item.session === null || (
        typeof item.session?.id === 'string'
        && Array.isArray(item.session.members)
        && Array.isArray(item.session.restaurants)
      )),
    );
  } catch {
    return [];
  }
}

export function upsertSavedLunchPick(items: SavedLunchPick[], pick: SavedLunchPick): SavedLunchPick[] {
  return [pick, ...items.filter(item => item.restaurant.id !== pick.restaurant.id)];
}
