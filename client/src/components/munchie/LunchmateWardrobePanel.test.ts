import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LUNCHMATE_ITEMS_BY_SLOT } from '../../constants/lunchmateItems';
import {
  PREVIEW_INITIAL_LOADOUT,
  PREVIEW_OWNED_ITEM_IDS,
  areLunchmateLoadoutsEqual,
  clearPreviewLoadout,
  createWardrobeCandidateLoadout,
  getWardrobeSlotItemId,
  selectPreviewWardrobeItem,
} from './lunchmateWardrobeFixtures';

const COMPONENT_ROOT = join(process.cwd(), 'client', 'src', 'components', 'munchie');
const PANEL_SOURCE = readFileSync(join(COMPONENT_ROOT, 'LunchmateWardrobePanel.tsx'), 'utf8');
const RENDERER_SOURCE = readFileSync(join(COMPONENT_ROOT, 'LunchmateCharacterRenderer.tsx'), 'utf8');
const FOODIE_ROOM_SOURCE = readFileSync(join(process.cwd(), 'client', 'src', 'pages', 'FoodieRoomPage.tsx'), 'utf8');
const PROFILE_SOURCE = readFileSync(join(process.cwd(), 'client', 'src', 'pages', 'ProfilePage.tsx'), 'utf8');

describe('Lunchmate wardrobe preview fixtures', () => {
  it('keeps the manifest counts for all four slots', () => {
    expect(LUNCHMATE_ITEMS_BY_SLOT.outfit).toHaveLength(8);
    expect(LUNCHMATE_ITEMS_BY_SLOT.headwear).toHaveLength(9);
    expect(LUNCHMATE_ITEMS_BY_SLOT.eyewear).toHaveLength(7);
    expect(LUNCHMATE_ITEMS_BY_SLOT.bag).toHaveLength(7);
  });

  it('owns only the four Phase 2C preview items', () => {
    expect([...PREVIEW_OWNED_ITEM_IDS].sort()).toEqual([
      'bag_backpack_green',
      'eyewear_round_black',
      'headwear_beret_coral',
      'outfit_hoodie_coral',
    ]);
  });

  it('sets the active slot to null for 착용 안 함', () => {
    const next = selectPreviewWardrobeItem({ ...PREVIEW_INITIAL_LOADOUT }, 'outfit', null);
    expect(next.outfitId).toBeNull();
    expect(next.headwearId).toBe(PREVIEW_INITIAL_LOADOUT.headwearId);
  });

  it('allows an owned item and blocks a locked item', () => {
    const empty = clearPreviewLoadout();
    const owned = selectPreviewWardrobeItem(empty, 'outfit', 'outfit_hoodie_coral');
    const locked = selectPreviewWardrobeItem(owned, 'outfit', 'outfit_sailor_navy');
    expect(owned.outfitId).toBe('outfit_hoodie_coral');
    expect(locked).toBe(owned);
  });

  it('blocks a slot mismatch even when that item is owned', () => {
    const loadout = clearPreviewLoadout();
    const next = selectPreviewWardrobeItem(loadout, 'outfit', 'headwear_beret_coral');
    expect(next).toBe(loadout);
    expect(next.outfitId).toBeNull();
  });

  it('builds locked card candidates without treating them as selections', () => {
    const draft = { ...PREVIEW_INITIAL_LOADOUT };
    const candidate = createWardrobeCandidateLoadout(draft, 'outfit', 'outfit_sailor_navy');
    const selected = selectPreviewWardrobeItem(draft, 'outfit', 'outfit_sailor_navy');
    expect(candidate.outfitId).toBe('outfit_sailor_navy');
    expect(selected).toBe(draft);
  });

  it('tracks changed and applied loadouts for the CTA disabled contract', () => {
    let applied = { ...PREVIEW_INITIAL_LOADOUT };
    const draft = selectPreviewWardrobeItem(applied, 'bag', null);
    expect(areLunchmateLoadoutsEqual(draft, applied)).toBe(false);
    applied = { ...draft };
    expect(areLunchmateLoadoutsEqual(draft, applied)).toBe(true);
  });

  it('clears every slot without changing the manifest fixture', () => {
    const cleared = clearPreviewLoadout();
    expect(cleared).toEqual({ outfitId: null, headwearId: null, eyewearId: null, bagId: null });
    expect(getWardrobeSlotItemId(PREVIEW_INITIAL_LOADOUT, 'outfit')).toBe('outfit_hoodie_coral');
  });
});

describe('Lunchmate wardrobe UI contracts', () => {
  it('keeps draft and applied state above the top-tab conditional', () => {
    expect(FOODIE_ROOM_SOURCE).toContain('const [draftLoadout, setDraftLoadout]');
    expect(FOODIE_ROOM_SOURCE).toContain('const [appliedLoadout, setAppliedLoadout]');
    expect(FOODIE_ROOM_SOURCE).toContain('loadout={draftLoadout}');
    expect(FOODIE_ROOM_SOURCE.indexOf('const [draftLoadout, setDraftLoadout]'))
      .toBeLessThan(FOODIE_ROOM_SOURCE.indexOf("activeTab === 'wardrobe'"));
  });

  it('disables thumbnail motion without changing the Renderer default', () => {
    expect(PANEL_SOURCE).toContain('animated={false}');
    expect(RENDERER_SOURCE).toContain('animated = true');
    expect(RENDERER_SOURCE).toContain('reducedMotion || !animated');
  });

  it('provides accessible slot and item selection states', () => {
    expect(PANEL_SOURCE).toContain('role="tablist"');
    expect(PANEL_SOURCE).toContain('aria-selected={selected}');
    expect(PANEL_SOURCE).toContain('aria-pressed={selected}');
    expect(PANEL_SOURCE).toContain('aria-disabled={locked}');
    expect(PANEL_SOURCE).toContain('레벨업으로 획득');
  });

  it('uses three columns at 375px and switches to four only at 450px', () => {
    expect(PANEL_SOURCE).toContain('grid grid-cols-3 gap-2 min-[450px]:grid-cols-4');
  });

  it('does not connect loadout or preview inventory to Profile storage', () => {
    expect(PROFILE_SOURCE).not.toContain('loadout=');
    expect(PROFILE_SOURCE).not.toContain('PREVIEW_OWNED_ITEM_IDS');
    expect(PANEL_SOURCE).not.toContain('localStorage');
    expect(PANEL_SOURCE).not.toContain('sessionStorage');
    expect(FOODIE_ROOM_SOURCE).not.toContain('localStorage');
  });
});
