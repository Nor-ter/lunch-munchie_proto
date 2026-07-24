import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createLunchmateRoomCategoryUpdate,
  createLunchmateRoomPresetUpdate,
  getLunchmateRoomTheme,
  LUNCHMATE_ROOM_ITEMS,
  LUNCHMATE_ROOM_THEMES,
  normalizeLunchmateRoomLoadout,
} from './lunchmateRoomThemes';

const PUBLIC_ROOT = join(process.cwd(), 'client', 'public');
const ALL_ITEMS = Object.values(LUNCHMATE_ROOM_ITEMS).flat();

afterEach(() => {
  vi.unstubAllGlobals();
});

function publicFile(assetPath: string): string {
  return join(PUBLIC_ROOT, assetPath.split('?')[0].replace(/^\//, ''));
}

describe('Lunchmate room customization manifest contract', () => {
  it('maps all six existing foodieSkin IDs without changing them', () => {
    expect(LUNCHMATE_ROOM_THEMES.map(({ skinId, assetKey }) => [skinId, assetKey])).toEqual([
      ['pink-picnic', 'pink-picnic'],
      ['yellow-munchtray', 'yellow-lunch-tray'],
      ['vintage-frame', 'vintage-frame'],
      ['blue-note', 'blue-note'],
      ['flower-garden', 'flower-garden'],
      ['modern-minimal', 'modern-minimal'],
    ]);
  });

  it('resolves every manifest ID to existing stage 1x/2x, profile 1x/2x and thumbnail assets', () => {
    expect(ALL_ITEMS).toHaveLength(24);
    for (const item of ALL_ITEMS) {
      const paths = [
        item.stage.src,
        ...item.stage.srcSet.split(', ').map(entry => entry.replace(/ [12]x$/, '')),
        item.profile.src,
        ...item.profile.srcSet.split(', ').map(entry => entry.replace(/ [12]x$/, '')),
        item.thumbnail,
      ];
      for (const assetPath of new Set(paths)) {
        expect(existsSync(publicFile(assetPath)), `${item.id}: ${assetPath}`).toBe(true);
      }
    }
  });

  it('derives a complete legacy preset at render time without mutating the input', () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { setItem });
    const legacyProfile = { foodieSkin: 'yellow-munchtray' };
    const before = JSON.stringify(legacyProfile);
    expect(normalizeLunchmateRoomLoadout(undefined, legacyProfile.foodieSkin)).toEqual(
      getLunchmateRoomTheme('yellow-munchtray').loadout,
    );
    expect(JSON.stringify(legacyProfile)).toBe(before);
    expect('lunchmateRoomLoadout' in legacyProfile).toBe(false);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('skips the initial lm_profile write for an existing user while preserving real migrations', () => {
    const appContextSource = readFileSync(
      join(process.cwd(), 'client', 'src', 'contexts', 'AppContext.tsx'),
      'utf8',
    );
    expect(appContextSource).toContain('if (initiallyStoredProfile?.id === profile.id) return;');
    expect(appContextSource).toContain("localStorage.setItem('lm_profile', JSON.stringify(profile))");
  });

  it('selecting a preset keeps the real foodieSkin and writes all four fields', () => {
    expect(createLunchmateRoomPresetUpdate('yellow-munchtray')).toEqual({
      foodieSkin: 'yellow-munchtray',
      lunchmateRoomLoadout: getLunchmateRoomTheme('yellow-munchtray').loadout,
    });
  });

  it('changes only wallpaper or floor from the normalized current loadout', () => {
    const current = getLunchmateRoomTheme('pink-picnic').loadout;
    const wallpaperUpdate = createLunchmateRoomCategoryUpdate(
      current,
      'pink-picnic',
      'wallpaperId',
      'wallpaper_blue_note',
    ).lunchmateRoomLoadout;
    expect(wallpaperUpdate).toEqual({ ...current, wallpaperId: 'wallpaper_blue_note' });

    const floorUpdate = createLunchmateRoomCategoryUpdate(
      current,
      'pink-picnic',
      'floorId',
      'floor_walnut',
    ).lunchmateRoomLoadout;
    expect(floorUpdate).toEqual({ ...current, floorId: 'floor_walnut' });
  });

  it('accepts valid furniture/props IDs and null', () => {
    const current = getLunchmateRoomTheme('pink-picnic').loadout;
    expect(createLunchmateRoomCategoryUpdate(
      current,
      'pink-picnic',
      'furnitureId',
      null,
    ).lunchmateRoomLoadout.furnitureId).toBeNull();
    expect(createLunchmateRoomCategoryUpdate(
      current,
      'pink-picnic',
      'propsId',
      'props_blue_note',
    ).lunchmateRoomLoadout.propsId).toBe('props_blue_note');
  });

  it('normalizes invalid IDs to the current preset and then the pink default', () => {
    expect(normalizeLunchmateRoomLoadout({
      wallpaperId: 'bad',
      floorId: 'bad',
      furnitureId: 'bad',
      propsId: 'bad',
    }, 'blue-note')).toEqual(getLunchmateRoomTheme('blue-note').loadout);

    expect(normalizeLunchmateRoomLoadout(undefined, 'unknown')).toEqual(
      getLunchmateRoomTheme('pink-picnic').loadout,
    );
  });
});
