import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LUNCHMATE_ITEMS_BY_SLOT,
  LUNCHMATE_STARTER_ITEM_IDS,
} from '../../constants/lunchmateItems';
import {
  PREVIEW_INITIAL_LOADOUT,
  areLunchmateLoadoutsEqual,
  clearPreviewLoadout,
  createWardrobeCandidateLoadout,
  getWardrobeSlotItemId,
  selectPreviewWardrobeItem,
} from './lunchmateWardrobeFixtures';

const COMPONENT_ROOT = join(process.cwd(), 'client', 'src', 'components', 'munchie');
const PANEL_SOURCE = readFileSync(join(COMPONENT_ROOT, 'LunchmateWardrobePanel.tsx'), 'utf8');
const RENDERER_SOURCE = readFileSync(join(COMPONENT_ROOT, 'LunchmateCharacterRenderer.tsx'), 'utf8');
const FOODIE_BUDDY_SOURCE = readFileSync(join(COMPONENT_ROOT, 'FoodieBuddy.tsx'), 'utf8');
const LEVEL_UP_MODAL_SOURCE = readFileSync(join(COMPONENT_ROOT, 'LunchmateLevelUpModal.tsx'), 'utf8');
const SKIN_PICKER_SOURCE = readFileSync(join(COMPONENT_ROOT, 'SkinPicker.tsx'), 'utf8');
const FOODIE_ROOM_SOURCE = readFileSync(join(process.cwd(), 'client', 'src', 'pages', 'FoodieRoomPage.tsx'), 'utf8');
const PROFILE_SOURCE = readFileSync(join(process.cwd(), 'client', 'src', 'pages', 'ProfilePage.tsx'), 'utf8');
const PROFILE_IDENTITY_SOURCE = readFileSync(join(process.cwd(), 'client', 'src', 'components', 'profile', 'ProfileIdentitySummary.tsx'), 'utf8');
const APP_CONTEXT_SOURCE = readFileSync(join(process.cwd(), 'client', 'src', 'contexts', 'AppContext.tsx'), 'utf8');
const STARTER_ITEM_ID_SET: ReadonlySet<string> = new Set(LUNCHMATE_STARTER_ITEM_IDS);

describe('Lunchmate wardrobe preview fixtures', () => {
  it('keeps the manifest counts for all four slots', () => {
    expect(LUNCHMATE_ITEMS_BY_SLOT.outfit).toHaveLength(13);
    expect(LUNCHMATE_ITEMS_BY_SLOT.headwear).toHaveLength(13);
    expect(LUNCHMATE_ITEMS_BY_SLOT.eyewear).toHaveLength(5);
    expect(LUNCHMATE_ITEMS_BY_SLOT.bag).toHaveLength(13);
  });

  it('uses the four shared starter item IDs', () => {
    expect([...STARTER_ITEM_ID_SET].sort()).toEqual([
      'bag_backpack_green',
      'eyewear_round_black',
      'headwear_beret_coral',
      'outfit_hoodie_coral',
    ]);
  });

  it('sets the active slot to null for 착용 안 함', () => {
    const next = selectPreviewWardrobeItem(
      { ...PREVIEW_INITIAL_LOADOUT },
      'outfit',
      null,
      new Set<string>(),
    );
    expect(next.outfitId).toBeNull();
    expect(next.headwearId).toBe(PREVIEW_INITIAL_LOADOUT.headwearId);
  });

  it('allows an owned item and blocks a locked item', () => {
    const empty = clearPreviewLoadout();
    const owned = selectPreviewWardrobeItem(
      empty,
      'outfit',
      'outfit_hoodie_coral',
      STARTER_ITEM_ID_SET,
    );
    const locked = selectPreviewWardrobeItem(
      owned,
      'outfit',
      'outfit_sailor_blue',
      STARTER_ITEM_ID_SET,
    );
    expect(owned.outfitId).toBe('outfit_hoodie_coral');
    expect(locked).toBe(owned);
  });

  it('blocks a slot mismatch even when that item is owned', () => {
    const loadout = clearPreviewLoadout();
    const next = selectPreviewWardrobeItem(
      loadout,
      'outfit',
      'headwear_beret_coral',
      STARTER_ITEM_ID_SET,
    );
    expect(next).toBe(loadout);
    expect(next.outfitId).toBeNull();
  });

  it('builds locked card candidates without treating them as selections', () => {
    const draft = { ...PREVIEW_INITIAL_LOADOUT };
    const candidate = createWardrobeCandidateLoadout(draft, 'outfit', 'outfit_sailor_blue');
    const selected = selectPreviewWardrobeItem(
      draft,
      'outfit',
      'outfit_sailor_blue',
      STARTER_ITEM_ID_SET,
    );
    expect(candidate.outfitId).toBe('outfit_sailor_blue');
    expect(selected).toBe(draft);
  });

  it('tracks changed and applied loadouts for the CTA disabled contract', () => {
    let applied = { ...PREVIEW_INITIAL_LOADOUT };
    const draft = selectPreviewWardrobeItem(applied, 'bag', null, STARTER_ITEM_ID_SET);
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

  it('keeps wardrobe grids responsive and room theme cards two-column on mobile', () => {
    expect(PANEL_SOURCE).toContain('grid grid-cols-3 gap-3 min-[450px]:grid-cols-4');
    expect(FOODIE_ROOM_SOURCE).toContain("const ROOM_CONTENT_GRID_CLASS = 'grid grid-cols-3 gap-3 min-[450px]:grid-cols-4'");
    expect(SKIN_PICKER_SOURCE).toContain('className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4"');
    expect(SKIN_PICKER_SOURCE).toContain('className="min-w-0 rounded-2xl text-left');
  });

  it('stores only from 적용하기 and initializes both loadouts from lm_profile', () => {
    const draftHandlerStart = FOODIE_ROOM_SOURCE.indexOf('const handleDraftChange');
    const applyHandlerStart = FOODIE_ROOM_SOURCE.indexOf('const handleApplyLoadout');
    const renderStart = FOODIE_ROOM_SOURCE.indexOf('return (', applyHandlerStart);
    const draftHandler = FOODIE_ROOM_SOURCE.slice(draftHandlerStart, applyHandlerStart);
    const applyHandler = FOODIE_ROOM_SOURCE.slice(applyHandlerStart, renderStart);

    expect(FOODIE_ROOM_SOURCE).not.toContain('PREVIEW_INITIAL_LOADOUT');
    expect(FOODIE_ROOM_SOURCE.match(/lunchmateLoadoutFromProfile\(profile\.lunchmateLoadout\)/g))
      .toHaveLength(2);
    expect(draftHandler).not.toContain('updateProfile');
    expect(applyHandler).toContain('updateProfile(createLunchmateProfileLoadoutUpdate(nextAppliedLoadout))');
    expect(PANEL_SOURCE).not.toContain('localStorage');
    expect(FOODIE_ROOM_SOURCE).not.toContain('localStorage');
    expect(APP_CONTEXT_SOURCE).toContain("localStorage.setItem('lm_profile', JSON.stringify(profile))");
    expect(APP_CONTEXT_SOURCE).toContain('normalizeLunchmateProfileLoadout(parsed.lunchmateLoadout)');
  });

  it('uses normalized lm_profile ownership for Wardrobe locks', () => {
    expect(FOODIE_ROOM_SOURCE)
      .toContain('normalizeLunchmateOwnedItemIds(profile.lunchmateOwnedItemIds)');
    expect(FOODIE_ROOM_SOURCE).toContain('ownedItemIds={ownedItemIds}');
    expect(PANEL_SOURCE).toContain('ownedItemIds: readonly string[]');
    expect(PANEL_SOURCE).toContain('const locked = !ownedItemIdSet.has(item.id)');
    expect(PANEL_SOURCE).not.toContain('PREVIEW_OWNED_ITEM_IDS');
  });

  it('passes the same saved loadout through Profile, FoodieBuddy, and Level Up jump', () => {
    expect(PROFILE_SOURCE).toContain('() => lunchmateLoadoutFromProfile(profile.lunchmateLoadout)');
    expect(PROFILE_SOURCE.match(/loadout=\{lunchmateLoadout\}/g)).toHaveLength(2);
    expect(FOODIE_BUDDY_SOURCE).toContain('loadout={loadout}');
    expect(LEVEL_UP_MODAL_SOURCE).toContain('levelUpActive');
    expect(LEVEL_UP_MODAL_SOURCE).toContain('loadout={loadout}');
    expect(PROFILE_SOURCE).not.toContain('PREVIEW_OWNED_ITEM_IDS');
  });

  it('keeps the Profile avatar overlap while separating the identity block below the banner', () => {
    expect(PROFILE_SOURCE).toContain('<ProfileIdentitySummary');
    expect(PROFILE_IDENTITY_SOURCE).toContain('className="relative z-20 -mt-9 px-3"');
    expect(PROFILE_IDENTITY_SOURCE).toContain('className="flex min-w-0 items-start gap-4"');
    expect(PROFILE_IDENTITY_SOURCE).toContain('className="min-w-0 flex-1 pt-11"');
    expect(PROFILE_IDENTITY_SOURCE).toContain('className="flex min-w-0 items-center gap-2 whitespace-nowrap"');
    expect(PROFILE_IDENTITY_SOURCE).toContain('className="mt-1.5 flex min-w-0 items-center gap-3"');
    expect(PROFILE_SOURCE).toContain('className="mt-5 grid grid-cols-3"');
  });

  it('keeps owned IDs in the existing lm_profile persistence flow', () => {
    expect(APP_CONTEXT_SOURCE).toContain('lunchmateOwnedItemIds?: string[]');
    expect(APP_CONTEXT_SOURCE)
      .toContain('normalizeLunchmateOwnedItemIds(parsed.lunchmateOwnedItemIds)');
    expect(APP_CONTEXT_SOURCE).toContain('lunchmateRewardClaims?: LunchmateRewardClaim[]');
    expect(APP_CONTEXT_SOURCE)
      .toContain('normalizeLunchmateRewardClaims(parsed.lunchmateRewardClaims)');
    expect(APP_CONTEXT_SOURCE).not.toContain('lunchmateWardrobeFixtures');
    expect(PANEL_SOURCE).not.toContain('localStorage');
    expect(PANEL_SOURCE).not.toContain('sessionStorage');
  });

  it('grants the Level reward before opening the Modal with a per-Level guard', () => {
    expect(PROFILE_SOURCE).toContain('resolveLunchmateLevelRewardGrant({');
    expect(PROFILE_SOURCE)
      .toContain('const stableSeedKey = `${profile.id}:lunchmate-level:${targetLevel}`');
    expect(PROFILE_SOURCE).toContain('rewardGrantGuardRef.current.has(targetLevel)');
    expect(PROFILE_SOURCE).toContain('lunchmateOwnedItemIds: grant.ownedItemIds');
    expect(PROFILE_SOURCE).toContain('lunchmateRewardClaims: grant.claims');
    expect(PROFILE_SOURCE.indexOf('updateProfile({'))
      .toBeLessThan(PROFILE_SOURCE.indexOf("setActiveSheet('levelUp')"));
  });

  it('shows actual reward metadata and a static item-only preview in the Modal', () => {
    expect(LEVEL_UP_MODAL_SOURCE).toContain('{rewardItem.name}');
    expect(LEVEL_UP_MODAL_SOURCE).toContain('{SLOT_LABELS[rewardItem.slot]}');
    expect(LEVEL_UP_MODAL_SOURCE).toContain('{RARITY_LABELS[rewardItem.rarity]}');
    expect(LEVEL_UP_MODAL_SOURCE).toContain('loadout={createRewardPreviewLoadout(rewardItem)}');
    expect(LEVEL_UP_MODAL_SOURCE).toContain('animated={false}');
    expect(LEVEL_UP_MODAL_SOURCE).toContain('모든 꾸미기 아이템을 모았어요');
    expect(LEVEL_UP_MODAL_SOURCE).toContain('현재 기기의 미리보기 보상으로 저장됐어요.');
  });

  it('keeps every existing Level Up close path consuming the event', () => {
    expect(PROFILE_SOURCE).toContain('lunchmateFlow.acknowledgeLevelUp();');
    expect(PROFILE_SOURCE).toContain('onClose={closeLevelUp}');
    expect(LEVEL_UP_MODAL_SOURCE).toContain("keyboardEvent.key === 'Escape'");
    expect(LEVEL_UP_MODAL_SOURCE).toContain('onClick={onClose}');
  });

  it('routes Profile banner customization directly to FoodieRoom', () => {
    expect(PROFILE_SOURCE).toContain("navigate('/profile/foodie-room', {");
    expect(PROFILE_SOURCE).toContain('onCustomize={openFoodieRoom}');
    expect(FOODIE_BUDDY_SOURCE).toContain('aria-label="런치메이트 룸 열기"');
    expect(FOODIE_BUDDY_SOURCE).toContain('data-icon="hanger"');
    expect(PROFILE_SOURCE).not.toContain("activeSheet === 'foodie'");
    expect(PROFILE_SOURCE).not.toContain("setActiveSheet('foodie')");
    expect(PROFILE_SOURCE).not.toContain('푸디 캐릭터 꾸미기');
    expect(PROFILE_SOURCE).not.toContain('FOODIE_CHARS.map');
  });

  it('keeps Lunchbox and Progress as independent Profile sheets', () => {
    expect(PROFILE_SOURCE).toContain("setActiveSheet('lunchbox')");
    expect(PROFILE_SOURCE).toContain("setActiveSheet('progress')");
    expect(PROFILE_SOURCE).toContain("open={activeSheet === 'lunchbox'}");
    expect(PROFILE_SOURCE).toContain("open={activeSheet === 'progress'}");
    expect(FOODIE_BUDDY_SOURCE).toContain('event.stopPropagation();');
  });

  it('moves SkinPicker into the FoodieRoom room tab and uses the existing profile merge path', () => {
    const skinHandlerStart = FOODIE_ROOM_SOURCE.indexOf('const handleRoomPresetChange');
    const renderStart = FOODIE_ROOM_SOURCE.indexOf('return (', skinHandlerStart);
    const skinHandler = FOODIE_ROOM_SOURCE.slice(skinHandlerStart, renderStart);

    expect(FOODIE_ROOM_SOURCE).toContain("activeTab === 'room'");
    expect(FOODIE_ROOM_SOURCE).toContain('<SkinPicker');
    expect(FOODIE_ROOM_SOURCE).toContain('skinId={skin.id}');
    expect(FOODIE_ROOM_SOURCE).toContain('loadout={roomLoadout}');
    expect(FOODIE_ROOM_SOURCE).toContain('onPresetChange={handleRoomPresetChange}');
    expect(skinHandler).toContain('updateProfile(createLunchmateRoomPresetUpdate(skinId))');
    expect(skinHandler).toContain('updateProfile(createLunchmateRoomCategoryUpdate(');
    expect(skinHandler).not.toContain('lunchmateLoadout');
    expect(skinHandler).not.toContain('lunchmateOwnedItemIds');
    expect(SKIN_PICKER_SOURCE).toContain('type="button"');
    expect(SKIN_PICKER_SOURCE).toContain('onSelect={() => onPresetChange(theme.skinId)}');
  });

  it('updates the Room preview from profile skin state and preserves Profile back navigation', () => {
    expect(FOODIE_ROOM_SOURCE)
      .toContain('const skin = getSkinById(profile.foodieSkin) ?? MUNCHIE_SKINS[0]');
    expect(FOODIE_ROOM_SOURCE).toContain('const roomTheme = getLunchmateRoomTheme(skin.id)');
    expect(FOODIE_ROOM_SOURCE).toContain('variant="stage"');
    expect(FOODIE_ROOM_SOURCE).toContain("navigate('/profile', { replace: true })");
  });
});
