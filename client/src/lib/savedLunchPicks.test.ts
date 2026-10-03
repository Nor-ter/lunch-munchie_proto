import { describe, expect, it } from 'vitest';
import type { GroupSession, Restaurant } from '@/contexts/AppContext';
import { readSavedLunchPicks, upsertSavedLunchPick, type SavedLunchPick } from './savedLunchPicks';

const restaurant: Restaurant = {
  id: 'winner-a', name: 'Selected restaurant', category: 'Cafe', tags: ['카페'],
  rating: 4.5, reviewCount: 12, distance: '1km', address: 'Melbourne',
  image: '/photos/winner.jpg', photos: ['/photos/winner.jpg'],
  menuItems: [{ name: 'Coffee', price: 5 }],
  lat: -37.81, lng: 144.96, priceRange: 1, openHours: '09:00-17:00',
  dietary: [], description: 'Saved winner',
};
const session: GroupSession = {
  id: 'original-session', name: 'Lunch session', inviteCode: 'ABC123', hostId: 'host',
  members: [], filters: { partySize: 1, dietary: [], budget: 2, radius: 1000, categories: [] },
  deadline: null, status: 'completed', restaurants: [restaurant], results: [],
};
const pick: SavedLunchPick = { restaurant, session, savedAt: 1000 };

describe('saved lunch picks', () => {
  it('restores the original restaurant, menu and session after a reload', () => {
    const restored = readSavedLunchPicks(JSON.stringify(upsertSavedLunchPick([], pick)));
    expect(restored).toEqual([pick]);
    expect(restored[0].restaurant.menuItems).toEqual(restaurant.menuItems);
    expect(restored[0].session?.inviteCode).toBe('ABC123');
  });

  it('keeps one saved card per restaurant and replaces its result snapshot', () => {
    const updated = { ...pick, session: { ...session, id: 'new-session' }, savedAt: 2000 };
    expect(upsertSavedLunchPick([pick], updated)).toEqual([updated]);
  });

  it('preserves other saved restaurants when a new pick is added', () => {
    const other = { ...pick, restaurant: { ...restaurant, id: 'winner-b' } };
    expect(upsertSavedLunchPick([pick], other)).toEqual([other, pick]);
  });

  it('ignores corrupt storage and entries without a valid result snapshot', () => {
    expect(readSavedLunchPicks('{')).toEqual([]);
    expect(readSavedLunchPicks('{}')).toEqual([]);
    expect(readSavedLunchPicks(JSON.stringify([null, {}, { ...pick, session: {} }, pick]))).toEqual([pick]);
    expect(readSavedLunchPicks(JSON.stringify([{ ...pick, session: null }]))).toHaveLength(1);
  });
});
