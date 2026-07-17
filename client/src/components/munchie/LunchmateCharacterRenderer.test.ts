import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import {
  EMPTY_LUNCHMATE_LOADOUT,
  LAYER_PREVIEW_LOADOUT,
  LUNCHMATE_LAYER_ORDER,
  LUNCHMATE_ITEMS,
  LUNCHMATE_ITEMS_BY_ID,
  LUNCHMATE_ITEMS_BY_SLOT,
  resolveLunchmateLayerSource,
  resolveLunchmateRenderLayers,
} from '../../constants/lunchmateItems';
import {
  lunchmateEffectAssets,
  lunchmateFaceAssets,
  lunchmateFacelessBaseAsset,
  type LunchmateAssetSource,
} from '../../constants/lunchmateAssets';
import { resolveLunchmateExpressionPresentation } from '../../constants/lunchmateExpressions';
import type { LunchmateLayerItem } from '../../types/lunchmateCustomization';
import {
  motionForLunchmateState,
  resolveLunchmateRenderPlan,
} from './LunchmateCharacterRenderer';

const PUBLIC_ROOT = join(process.cwd(), 'client', 'public');
const LAYER_ROOT = join(PUBLIC_ROOT, 'assets', 'lunchmate', 'layers');
const COMPONENT_ROOT = join(process.cwd(), 'client', 'src', 'components', 'munchie');
const RENDERER_SOURCE_PATH = join(COMPONENT_ROOT, 'LunchmateCharacterRenderer.tsx');
const FOODIE_BUDDY_SOURCE_PATH = join(COMPONENT_ROOT, 'FoodieBuddy.tsx');
const LEVEL_UP_SOURCE_PATH = join(COMPONENT_ROOT, 'LunchmateLevelUpModal.tsx');
const FLOW_SOURCE_PATH = join(process.cwd(), 'client', 'src', 'hooks', 'useLunchmateFlow.ts');
const FOODIE_ROOM_SOURCE_PATH = join(process.cwd(), 'client', 'src', 'pages', 'FoodieRoomPage.tsx');

function itemSources(item: LunchmateLayerItem): LunchmateAssetSource[] {
  const parts = [item.back, item.front].filter(Boolean);
  return parts.flatMap(part => [
    part!.default,
    ...Object.values(part!.stateOverrides ?? {}).filter(Boolean) as LunchmateAssetSource[],
  ]);
}

function collectPngFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectPngFiles(path) : entry.name.endsWith('.png') ? [path] : [];
  });
}

function publicPath(path: string) {
  return join(PUBLIC_ROOT, path.split('?')[0].replace(/^\/+/, ''));
}

function assertRgbaCanvas(path: string, expectedSize: number) {
  const png = readFileSync(path);
  expect(png.readUInt32BE(16), path).toBe(expectedSize);
  expect(png.readUInt32BE(20), path).toBe(expectedSize);
  expect(png[25], path).toBe(6);
}

describe('Lunchmate layered item manifest', () => {
  it('registers 31 unique items with the catalog slot counts', () => {
    expect(LUNCHMATE_ITEMS).toHaveLength(31);
    expect(new Set(LUNCHMATE_ITEMS.map(item => item.id)).size).toBe(31);
    expect(LUNCHMATE_ITEMS_BY_SLOT.outfit).toHaveLength(8);
    expect(LUNCHMATE_ITEMS_BY_SLOT.headwear).toHaveLength(9);
    expect(LUNCHMATE_ITEMS_BY_SLOT.eyewear).toHaveLength(7);
    expect(LUNCHMATE_ITEMS_BY_SLOT.bag).toHaveLength(7);
  });

  it('keeps all bag backs and the two outfit back layers', () => {
    expect(LUNCHMATE_ITEMS_BY_SLOT.bag.every(item => item.back)).toBe(true);
    expect(LUNCHMATE_ITEMS_BY_ID.outfit_hoodie_coral?.back).toBeDefined();
    expect(LUNCHMATE_ITEMS_BY_ID.outfit_raincoat_yellow?.back).toBeDefined();
  });

  it('maps every wardrobe 1x and 2x source to a copied PNG', () => {
    const sources = LUNCHMATE_ITEMS.flatMap(itemSources);
    expect(sources).toHaveLength(40);

    for (const source of sources) {
      const oneX = publicPath(source.src);
      const twoXPath = source.src.replace(/\.png$/, '@2x.png');
      const twoX = publicPath(twoXPath);
      expect(existsSync(oneX), source.src).toBe(true);
      expect(existsSync(twoX), twoXPath).toBe(true);
      expect(source.srcSet).toBe(`${source.src} 1x, ${twoXPath} 2x`);
    }
  });

  it('keeps exactly 40 wardrobe 1x and 40 wardrobe 2x RGBA canvases', () => {
    const expressionDirectoryParts = [
      `${sep}face${sep}`,
      `${sep}effects${sep}`,
    ];
    const pngFiles = collectPngFiles(LAYER_ROOT).filter(path => (
      expressionDirectoryParts.every(part => !path.includes(part))
    ));
    const oneX = pngFiles.filter(path => !path.endsWith('@2x.png'));
    const twoX = pngFiles.filter(path => path.endsWith('@2x.png'));
    expect(oneX).toHaveLength(40);
    expect(twoX).toHaveLength(40);

    for (const path of pngFiles) {
      assertRgbaCanvas(path, path.endsWith('@2x.png') ? 720 : 360);
    }
  });
});

describe('Lunchmate expression assets', () => {
  it('registers faceless, six face, and three effect sources without duplicate paths', () => {
    const sources = [
      lunchmateFacelessBaseAsset,
      ...Object.values(lunchmateFaceAssets),
      ...Object.values(lunchmateEffectAssets),
    ];
    const paths = sources.flatMap(source => [
      source.src,
      source.srcSet.split(', ')[1].replace(/ 2x$/, ''),
    ]);

    expect(sources).toHaveLength(10);
    expect(paths).toHaveLength(20);
    expect(new Set(paths).size).toBe(20);
  });

  it('maps all 20 expression production PNGs to 360/720 RGBA canvases', () => {
    const sources = [
      lunchmateFacelessBaseAsset,
      ...Object.values(lunchmateFaceAssets),
      ...Object.values(lunchmateEffectAssets),
    ];

    for (const source of sources) {
      const oneX = publicPath(source.src);
      const twoXPath = source.srcSet.split(', ')[1].replace(/ 2x$/, '');
      const twoX = publicPath(twoXPath);
      expect(existsSync(oneX), source.src).toBe(true);
      expect(existsSync(twoX), twoXPath).toBe(true);
      assertRgbaCanvas(oneX, 360);
      assertRgbaCanvas(twoX, 720);
    }
  });

  it('keeps the exact faceless, face, and effect public paths', () => {
    expect(lunchmateFacelessBaseAsset.src)
      .toBe('/assets/lunchmate/base/1x/faceless.png?v=faceless-seamless-v2');
    expect(lunchmateFacelessBaseAsset.srcSet).toBe(
      '/assets/lunchmate/base/1x/faceless.png?v=faceless-seamless-v2 1x, '
      + '/assets/lunchmate/base/2x/faceless@2x.png?v=faceless-seamless-v2 2x',
    );
    expect(Object.keys(lunchmateFaceAssets)).toEqual([
      'default',
      'happy',
      'excited',
      'surprised',
      'sad',
      'thinking',
    ]);
    expect(Object.keys(lunchmateEffectAssets)).toEqual([
      'surprised_marks',
      'thinking_bubble',
      'jump_lines',
    ]);
    expect(lunchmateFaceAssets.thinking.src)
      .toBe('/assets/lunchmate/layers/face/1x/thinking.png?v=thinking-clean-v2');
    expect(lunchmateFaceAssets.thinking.srcSet).toBe(
      '/assets/lunchmate/layers/face/1x/thinking.png?v=thinking-clean-v2 1x, '
      + '/assets/lunchmate/layers/face/2x/thinking@2x.png?v=thinking-clean-v2 2x',
    );
    for (const faceState of ['default', 'happy', 'excited', 'surprised', 'sad'] as const) {
      expect(lunchmateFaceAssets[faceState].src).not.toContain('?v=');
    }
  });
});

describe('Lunchmate expression policy', () => {
  it('maps eating and like to a happy face without full-body action sprites', () => {
    expect(resolveLunchmateExpressionPresentation('eating', 'compact')).toEqual({
      faceState: 'happy',
      effectId: null,
      motionState: 'idle',
    });
    expect(resolveLunchmateExpressionPresentation('like', 'compact')).toEqual({
      faceState: 'happy',
      effectId: null,
      motionState: 'success',
    });
  });

  it('maps jump to an excited face and only shows jump lines in room size', () => {
    expect(resolveLunchmateExpressionPresentation('jump', 'compact')).toEqual({
      faceState: 'excited',
      effectId: null,
      motionState: 'jump',
    });
    expect(resolveLunchmateExpressionPresentation('jump', 'room')).toEqual({
      faceState: 'excited',
      effectId: 'jump_lines',
      motionState: 'jump',
    });
  });

  it('keeps compact thinking clear and adds the bubble in room size', () => {
    expect(resolveLunchmateExpressionPresentation('thinking', 'compact').effectId).toBeNull();
    expect(resolveLunchmateExpressionPresentation('thinking', 'room').effectId)
      .toBe('thinking_bubble');
  });

  it('adds surprised marks without changing the surprised face', () => {
    expect(resolveLunchmateExpressionPresentation('surprised', 'compact')).toEqual({
      faceState: 'surprised',
      effectId: 'surprised_marks',
      motionState: 'idle',
    });
  });
});

describe('LunchmateCharacterRenderer composed expression', () => {
  it('resolves an empty loadout to the fixed faceless composition', () => {
    const plan = resolveLunchmateRenderPlan(EMPTY_LUNCHMATE_LOADOUT, 'idle');
    expect(plan.poseMode).toBe('composedExpression');
    expect(plan.baseAssetKey).toBe('default');
    expect(plan.faceState).toBe('default');
    expect(plan.renderLayers).toEqual([{ layerName: 'base' }]);
    expect(plan.handheld).toBeNull();
  });

  it('resolves the four-slot fixture in the existing accessory order', () => {
    const layers = resolveLunchmateRenderLayers(LAYER_PREVIEW_LOADOUT, 'default');
    expect(layers.map(layer => layer.layerName)).toEqual(LUNCHMATE_LAYER_ORDER);
  });

  it('ignores unknown and wrong-slot IDs without hiding valid slots', () => {
    const layers = resolveLunchmateRenderLayers({
      outfitId: 'headwear_beret_coral',
      headwearId: 'headwear_beret_coral',
      eyewearId: 'missing-eyewear',
      bagId: 'bag_backpack_green',
    }, 'default');
    const sources = layers.flatMap(layer => layer.layerName === 'base' ? [] : [layer.source.src]);

    expect(sources.some(source => source.includes('outfit/'))).toBe(false);
    expect(sources.some(source => source.includes('eyewear/'))).toBe(false);
    expect(sources).toContain('/assets/lunchmate/layers/headwear/beret.png');
    expect(sources).toContain('/assets/lunchmate/layers/bag/backpack_back.png');
    expect(layers.some(layer => layer.layerName === 'base')).toBe(true);
  });

  it('uses each layer default for expression changes', () => {
    const hoodie = LUNCHMATE_ITEMS_BY_ID.outfit_hoodie_coral;
    expect(hoodie).toBeDefined();
    for (const state of ['default', 'eating', 'thinking', 'like', 'jump'] as const) {
      expect(resolveLunchmateLayerSource(hoodie?.front, state)).toBe(hoodie?.front.default);
    }
  });

  it('uses the faceless base and happy face while eating with any loadout', () => {
    const emptyPlan = resolveLunchmateRenderPlan(EMPTY_LUNCHMATE_LOADOUT, 'submitting');
    const equippedPlan = resolveLunchmateRenderPlan(LAYER_PREVIEW_LOADOUT, 'sharingAnimation');

    for (const plan of [emptyPlan, equippedPlan]) {
      expect(plan.poseMode).toBe('composedExpression');
      expect(plan.visualAssetKey).toBe('eating');
      expect(plan.baseAssetKey).toBe('default');
      expect(plan.faceState).toBe('happy');
      expect(plan.motionState).toBe('idle');
    }
  });

  it('keeps every accessory while face state changes', () => {
    const thinking = resolveLunchmateRenderPlan(LAYER_PREVIEW_LOADOUT, 'selectingFood');
    const reaction = resolveLunchmateRenderPlan(LAYER_PREVIEW_LOADOUT, 'reaction');

    expect(thinking.renderLayers).toEqual(reaction.renderLayers);
    expect(thinking.faceState).toBe('thinking');
    expect(reaction.faceState).toBe('happy');
    expect(thinking.renderLayers.map(layer => layer.layerName)).toEqual(LUNCHMATE_LAYER_ORDER);
  });

  it('changes only the face source across the same renderer rerender sequence', () => {
    const rerenderStates = [
      { flowState: 'idle', faceState: 'default', effectId: null },
      { flowState: 'foodAvailable', faceState: 'surprised', effectId: 'surprised_marks' },
      { flowState: 'selectingFood', faceState: 'thinking', effectId: 'thinking_bubble' },
      { flowState: 'error', faceState: 'sad', effectId: null },
      { flowState: 'reaction', faceState: 'happy', effectId: null },
    ] as const;
    const plans = rerenderStates.map(({ flowState }) => (
      resolveLunchmateRenderPlan(
        LAYER_PREVIEW_LOADOUT,
        flowState,
        false,
        true,
        'room',
      )
    ));
    const firstAccessorySources = plans[0].renderLayers.flatMap(layer => (
      layer.layerName === 'base' ? [] : [layer.source.src]
    ));

    for (const [index, plan] of plans.entries()) {
      expect(lunchmateFacelessBaseAsset.src)
        .toBe('/assets/lunchmate/base/1x/faceless.png?v=faceless-seamless-v2');
      expect(plan.baseAssetKey).toBe('default');
      expect(plan.faceState).toBe(rerenderStates[index].faceState);
      expect(plan.effectId).toBe(rerenderStates[index].effectId);
      expect(plan.renderLayers.flatMap(layer => (
        layer.layerName === 'base' ? [] : [layer.source.src]
      ))).toEqual(firstAccessorySources);
      const revision = plan.faceState === 'thinking' ? '?v=thinking-clean-v2' : '';
      expect(lunchmateFaceAssets[plan.faceState].src)
        .toBe(`/assets/lunchmate/layers/face/1x/${plan.faceState}.png${revision}`);
      expect(lunchmateFaceAssets[plan.faceState].src).not.toContain('/1x/lunchmate_');
    }
  });

  it('keeps the requested business-to-expression mapping unchanged', () => {
    expect(resolveLunchmateRenderPlan(EMPTY_LUNCHMATE_LOADOUT, 'idle'))
      .toMatchObject({ faceState: 'default', motionState: 'idle' });
    expect(resolveLunchmateRenderPlan(EMPTY_LUNCHMATE_LOADOUT, 'foodAvailable'))
      .toMatchObject({ faceState: 'surprised', motionState: 'idle' });
    expect(resolveLunchmateRenderPlan(EMPTY_LUNCHMATE_LOADOUT, 'selectingFood'))
      .toMatchObject({ faceState: 'thinking', motionState: 'idle' });
    expect(resolveLunchmateRenderPlan(EMPTY_LUNCHMATE_LOADOUT, 'submitting'))
      .toMatchObject({ faceState: 'happy', motionState: 'idle' });
    expect(resolveLunchmateRenderPlan(EMPTY_LUNCHMATE_LOADOUT, 'sharingAnimation'))
      .toMatchObject({ faceState: 'happy', motionState: 'idle' });
    expect(resolveLunchmateRenderPlan(EMPTY_LUNCHMATE_LOADOUT, 'reaction'))
      .toMatchObject({ faceState: 'happy', motionState: 'success' });
    expect(resolveLunchmateRenderPlan(EMPTY_LUNCHMATE_LOADOUT, 'error'))
      .toMatchObject({ faceState: 'sad', motionState: 'idle' });
    expect(resolveLunchmateRenderPlan(EMPTY_LUNCHMATE_LOADOUT, 'idle', true))
      .toMatchObject({ faceState: 'excited', motionState: 'jump' });
  });

  it('uses success motion for reaction and jump motion for Level Up', () => {
    const reaction = resolveLunchmateRenderPlan(LAYER_PREVIEW_LOADOUT, 'reaction');
    const levelUp = resolveLunchmateRenderPlan(LAYER_PREVIEW_LOADOUT, 'idle', true);

    expect(reaction.motionState).toBe('success');
    expect(motionForLunchmateState(reaction.motionState, false).animate)
      .toMatchObject({ y: [0, -4, 0], scale: [1, 1.05, 1] });
    expect(levelUp.faceState).toBe('excited');
    expect(levelUp.motionState).toBe('jump');
    expect(motionForLunchmateState(levelUp.motionState, false).animate)
      .toMatchObject({ y: [0, -18, 0], scale: [1, 1.04, 1] });
    expect(levelUp.renderLayers.map(layer => layer.layerName)).toEqual(LUNCHMATE_LAYER_ORDER);
  });

  it('does not treat invalid IDs as real layers', () => {
    const plan = resolveLunchmateRenderPlan({
      outfitId: 'headwear_beret_coral',
      headwearId: 'missing-headwear',
      eyewearId: null,
      bagId: null,
    }, 'reaction');

    expect(plan.renderLayers).toEqual([{ layerName: 'base' }]);
    expect(plan.faceState).toBe('happy');
  });

  it('removes motion without removing the composed character', () => {
    const plan = resolveLunchmateRenderPlan(LAYER_PREVIEW_LOADOUT, 'reaction');
    const motion = motionForLunchmateState(plan.motionState, true);

    expect(plan.renderLayers.map(layer => layer.layerName)).toEqual(LUNCHMATE_LAYER_ORDER);
    expect(motion.animate).toEqual({ x: 0, y: 0, scale: 1, rotate: 0 });
    expect(motion.transition).toEqual({ duration: 0 });
  });

  it('uses room effects only when the caller explicitly requests room size', () => {
    const compact = resolveLunchmateRenderPlan(LAYER_PREVIEW_LOADOUT, 'selectingFood');
    const room = resolveLunchmateRenderPlan(
      LAYER_PREVIEW_LOADOUT,
      'selectingFood',
      false,
      true,
      'room',
    );

    expect(compact.renderSize).toBe('compact');
    expect(compact.effectId).toBeNull();
    expect(room.renderSize).toBe('room');
    expect(room.effectId).toBe('thinking_bubble');
  });

  it('renders face below eyewear and effect after every accessory', () => {
    const rendererSource = readFileSync(RENDERER_SOURCE_PATH, 'utf8');
    const backIndex = rendererSource.indexOf('{renderAccessories(backLayers)}');
    const baseIndex = rendererSource.indexOf('src={lunchmateFacelessBaseAsset.src}');
    const frontIndex = rendererSource.indexOf('{renderAccessories(frontBodyLayers)}');
    const faceIndex = rendererSource.indexOf('data-lunchmate-layer="face"');
    const faceAccessoryIndex = rendererSource.indexOf('{renderAccessories(faceAccessoryLayers)}');
    const effectIndex = rendererSource.indexOf('layerName="effect"');

    expect(backIndex).toBeLessThan(baseIndex);
    expect(baseIndex).toBeLessThan(frontIndex);
    expect(frontIndex).toBeLessThan(faceIndex);
    expect(faceIndex).toBeLessThan(faceAccessoryIndex);
    expect(faceAccessoryIndex).toBeLessThan(effectIndex);
  });

  it('keeps base and accessory sources independent from visual action sprites', () => {
    const rendererSource = readFileSync(RENDERER_SOURCE_PATH, 'utf8');
    expect(rendererSource).toContain('lunchmateFacelessBaseAsset');
    expect(rendererSource).toContain('lunchmateFaceAssets[displayedFaceState]');
    expect(rendererSource).not.toContain('preloadStateAssets');
    expect(rendererSource).not.toContain('lunchmateStateAssets[renderPlan.visualAssetKey]');
    expect(rendererSource).toContain('const legacyAsset = lunchmateStateAssets.default');
    expect(rendererSource).toContain('data-lunchmate-layer="faceless-base"');
    expect(rendererSource).toContain('aria-hidden="true"');
    expect(rendererSource).toContain('onError={() => setLoadFailed(true)}');
  });
});

describe('Lunchmate food flow and presentation contracts', () => {
  it('keeps one responsive food-flight layer during sharingAnimation', () => {
    const foodieBuddySource = readFileSync(FOODIE_BUDDY_SOURCE_PATH, 'utf8');
    const flightStart = foodieBuddySource.indexOf('{isSharingAnimation && sharedFoodPlaceholder && (');
    const flightEnd = foodieBuddySource.indexOf('/* 캐릭터 (좌우 배회 + 바운스)', flightStart);
    const flightSource = foodieBuddySource.slice(flightStart, flightEnd);

    expect(flightSource).toContain('data-lunchmate-food-flight="true"');
    expect(flightSource).toContain("left: ['88%', '72%', '52%']");
    expect(flightSource).toContain('pointer-events-none');
    expect(flightSource).toContain('z-30');
    expect(flightSource).not.toContain('key=');
  });

  it('keeps the existing business sequence and returns to the normal state', () => {
    const flowSource = readFileSync(FLOW_SOURCE_PATH, 'utf8');
    const sharingIndex = flowSource.indexOf("setState('sharingAnimation')");
    const reactionIndex = flowSource.indexOf("setState('reaction')", sharingIndex);
    const idleIndex = flowSource.indexOf("setState('idle')", reactionIndex);

    expect(sharingIndex).toBeGreaterThan(-1);
    expect(sharingIndex).toBeLessThan(reactionIndex);
    expect(reactionIndex).toBeLessThan(idleIndex);
    expect(flowSource.match(/setPreviewXp\(nextXp\)/g)).toHaveLength(1);
    expect(flowSource).not.toContain('quantity -');
  });

  it('keeps Level Up compact and makes the FoodieRoom preview explicitly room-sized', () => {
    const levelUpSource = readFileSync(LEVEL_UP_SOURCE_PATH, 'utf8');
    const foodieRoomSource = readFileSync(FOODIE_ROOM_SOURCE_PATH, 'utf8');

    expect(levelUpSource).toContain('levelUpActive');
    expect(levelUpSource).toContain('loadout={loadout}');
    expect(levelUpSource).toContain('renderSize="compact"');
    expect(foodieRoomSource).toContain('flowState="selectingFood"');
    expect(foodieRoomSource).toContain('renderSize="room"');
  });
});
