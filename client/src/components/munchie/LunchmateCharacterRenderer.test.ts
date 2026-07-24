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
  lunchmateChickenAssets,
  lunchmateChickenFaceAssets,
  lunchmateChickenFacelessBaseAsset,
  lunchmateEffectAssets,
  lunchmateFaceAssets,
  lunchmateFacelessBaseAsset,
  type LunchmateAssetSource,
} from '../../constants/lunchmateAssets';
import {
  LUNCHMATE_STARTER_COSTUME_POSE_MANIFEST,
  LUNCHMATE_STARTER_PILOT_ITEM_IDS,
  LUNCHMATE_STARTER_PILOT_LAYER_ORDER,
  LUNCHMATE_COLLECTION_WAVE1_ITEM_IDS,
  LUNCHMATE_COSTUME_COLLECTION_WAVE1_POSE_MANIFEST,
  LUNCHMATE_COLLECTION_WAVE2_ITEM_IDS,
  LUNCHMATE_COSTUME_COLLECTION_WAVE2_POSE_MANIFEST,
  LUNCHMATE_COLLECTION_WAVE3_ITEM_IDS,
  LUNCHMATE_COSTUME_COLLECTION_WAVE3_POSE_MANIFEST,
  LUNCHMATE_EYEWEAR_COLLECTION_WAVE1_ITEM_IDS,
  LUNCHMATE_EYEWEAR_COLLECTION_WAVE1_POSE_MANIFEST,
  resolveLunchmateChickenCostumePose,
  resolveLunchmateChickenCostumeRenderLayers,
  resolveLunchmateStarterCostumePoseLayers,
} from '../../constants/lunchmateCostumePoseManifest';
import { resolveLunchmateExpressionPresentation } from '../../constants/lunchmateExpressions';
import type { LunchmateLayerItem } from '../../types/lunchmateCustomization';
import {
  motionForLunchmateState,
  resolveLunchmateChickenAssetKey,
  resolveLunchmateRenderPlan,
  shouldUseLunchmateChickenFaceSystem,
} from './LunchmateCharacterRenderer';

const PUBLIC_ROOT = join(process.cwd(), 'client', 'public');
const LAYER_ROOT = join(PUBLIC_ROOT, 'assets', 'lunchmate', 'layers');
const STARTER_PILOT_ROOT = join(
  PUBLIC_ROOT,
  'assets',
  'lunchmate',
  'costumes',
  'starter-pilot-v3',
);
const COLLECTION_WAVE1_ROOT = join(
  PUBLIC_ROOT,
  'assets',
  'lunchmate',
  'costumes',
  'collection-wave1-v1',
);
const COLLECTION_WAVE2_ROOT = join(
  PUBLIC_ROOT,
  'assets',
  'lunchmate',
  'costumes',
  'collection-wave2-v1',
);
const COLLECTION_WAVE3_ROOT = join(
  PUBLIC_ROOT,
  'assets',
  'lunchmate',
  'costumes',
  'collection-wave3-v2',
);
const EYEWEAR_COLLECTION_WAVE1_ROOT = join(
  PUBLIC_ROOT,
  'assets',
  'lunchmate',
  'costumes',
  'eyewear-collection-wave1-v1',
);
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
  it('registers the two transparent chicken sources without replacing legacy assets', () => {
    expect(lunchmateChickenAssets.idle.src)
      .toBe('/assets/lunchmate/chicken/chicken-idle.png?v=chicken-visual-v1');
    expect(lunchmateChickenAssets.feeding.src)
      .toBe('/assets/lunchmate/chicken/chicken-feeding.png?v=chicken-visual-v1');
    assertRgbaCanvas(publicPath(lunchmateChickenAssets.idle.src), 950);
    assertRgbaCanvas(publicPath(lunchmateChickenAssets.feeding.src), 1254);
  });

  it('registers 44 unique items with the catalog slot counts', () => {
    expect(LUNCHMATE_ITEMS).toHaveLength(44);
    expect(new Set(LUNCHMATE_ITEMS.map(item => item.id)).size).toBe(44);
    expect(LUNCHMATE_ITEMS_BY_SLOT.outfit).toHaveLength(13);
    expect(LUNCHMATE_ITEMS_BY_SLOT.headwear).toHaveLength(13);
    expect(LUNCHMATE_ITEMS_BY_SLOT.eyewear).toHaveLength(5);
    expect(LUNCHMATE_ITEMS_BY_SLOT.bag).toHaveLength(13);
  });

  it('keeps all bag backs and the two outfit back layers', () => {
    expect(LUNCHMATE_ITEMS_BY_SLOT.bag.every(item => item.back)).toBe(true);
    expect(LUNCHMATE_ITEMS_BY_ID.outfit_hoodie_coral?.back).toBeDefined();
    expect(LUNCHMATE_ITEMS_BY_ID.outfit_raincoat_yellow?.back).toBeDefined();
  });

  it('maps every wardrobe 1x and 2x source to a copied PNG', () => {
    const sources = LUNCHMATE_ITEMS.flatMap(itemSources);
    expect(sources).toHaveLength(70);

    for (const source of sources) {
      const oneX = publicPath(source.src);
      const twoXPath = source.srcSet.split(', ')[1].replace(/ 2x$/, '');
      const twoX = publicPath(twoXPath);
      expect(existsSync(oneX), source.src).toBe(true);
      expect(existsSync(twoX), twoXPath).toBe(true);
      expect(source.srcSet).toBe(`${source.src} 1x, ${twoXPath} 2x`);
    }
  });

  it('keeps exactly 9 wardrobe 1x and 9 wardrobe 2x RGBA canvases', () => {
    const expressionDirectoryParts = [
      `${sep}face${sep}`,
      `${sep}effects${sep}`,
    ];
    const pngFiles = collectPngFiles(LAYER_ROOT).filter(path => (
      expressionDirectoryParts.every(part => !path.includes(part))
    ));
    const oneX = pngFiles.filter(path => !path.endsWith('@2x.png'));
    const twoX = pngFiles.filter(path => path.endsWith('@2x.png'));
    expect(oneX).toHaveLength(9);
    expect(twoX).toHaveLength(9);

    for (const path of pngFiles) {
      assertRgbaCanvas(path, path.endsWith('@2x.png') ? 720 : 360);
    }
  });
});

describe('Profile chicken face system assets', () => {
  it('registers the shared 950px faceless base and four single-face layers', () => {
    expect(lunchmateChickenFacelessBaseAsset.src).toBe(
      '/assets/lunchmate/chicken/face-system/chicken-faceless.png?v=chicken-face-system-v1',
    );
    expect(Object.keys(lunchmateChickenFaceAssets)).toEqual([
      'default',
      'surprised',
      'crying',
      'angry',
    ]);

    for (const source of [
      lunchmateChickenFacelessBaseAsset,
      ...Object.values(lunchmateChickenFaceAssets),
    ]) {
      expect(existsSync(publicPath(source.src)), source.src).toBe(true);
      assertRgbaCanvas(publicPath(source.src), 950);
      expect(source.srcSet).toBe(`${source.src} 1x, ${source.src} 2x`);
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
  it('limits the faceless chicken composition to the explicit Profile idle route', () => {
    expect(shouldUseLunchmateChickenFaceSystem('chicken', 'idle', true)).toBe(true);
    expect(shouldUseLunchmateChickenFaceSystem('chicken', 'feeding', true)).toBe(false);
    expect(shouldUseLunchmateChickenFaceSystem('classic', 'idle', true)).toBe(false);
    expect(shouldUseLunchmateChickenFaceSystem('chicken', 'idle', false)).toBe(false);
  });

  it('uses feeding chicken artwork only during the existing delivery phases', () => {
    expect(resolveLunchmateChickenAssetKey('submitting')).toBe('feeding');
    expect(resolveLunchmateChickenAssetKey('sharingAnimation')).toBe('feeding');
    expect(resolveLunchmateChickenAssetKey('reaction')).toBe('idle');
    expect(resolveLunchmateChickenAssetKey('error')).toBe('idle');
    expect(resolveLunchmateChickenAssetKey('foodAvailable')).toBe('idle');
    expect(resolveLunchmateChickenAssetKey('idle')).toBe('idle');
  });

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

  it('renders one chicken face after front costume layers and before eyewear/headwear', () => {
    const rendererSource = readFileSync(RENDERER_SOURCE_PATH, 'utf8');
    const backIndex = rendererSource.indexOf('{renderAccessories(backLayers)}');
    const chickenBaseIndex = rendererSource.indexOf('data-lunchmate-chicken-base={usesChickenFaceSystem');
    const frontIndex = rendererSource.indexOf('{renderAccessories(frontBodyLayers)}');
    const chickenFaceIndex = rendererSource.indexOf('data-lunchmate-layer="chicken-face"');
    const faceAccessoryIndex = rendererSource.indexOf('{renderAccessories(faceAccessoryLayers)}');

    expect(chickenBaseIndex).toBeGreaterThan(backIndex);
    expect(frontIndex).toBeGreaterThan(chickenBaseIndex);
    expect(chickenFaceIndex).toBeGreaterThan(frontIndex);
    expect(faceAccessoryIndex).toBeGreaterThan(chickenFaceIndex);
    expect(rendererSource.match(/data-lunchmate-layer="chicken-face"/g)).toHaveLength(1);
    expect(rendererSource).toContain('src={chickenBaseAsset.src}');
    expect(rendererSource).toContain('src={activeChickenFaceAsset.src}');
  });
});

describe('Lunchmate Starter Costume Pose Pilot v3', () => {
  const directPoses = ['front', 'feeding', 'sideLeft', 'sitting'] as const;

  it('registers only the four Starter IDs and installs all fixed-canvas overlay assets', () => {
    expect(LUNCHMATE_STARTER_PILOT_ITEM_IDS).toEqual([
      'outfit_hoodie_coral',
      'bag_backpack_green',
      'eyewear_round_black',
      'headwear_beret_coral',
    ]);
    expect(LUNCHMATE_STARTER_COSTUME_POSE_MANIFEST.version).toBe(3);
    expect(LUNCHMATE_STARTER_COSTUME_POSE_MANIFEST.referenceCanvas).toBe(720);

    const pngFiles = collectPngFiles(STARTER_PILOT_ROOT);
    const oneX = pngFiles.filter(path => path.includes(`${sep}1x${sep}`));
    const twoX = pngFiles.filter(path => path.includes(`${sep}2x${sep}`));
    expect(oneX).toHaveLength(24);
    expect(twoX).toHaveLength(24);

    for (const path of oneX) assertRgbaCanvas(path, 360);
    for (const path of twoX) assertRgbaCanvas(path, 720);
  });

  it('uses the v3 front, feeding, side-left, and sitting artwork with literal zero translations', () => {
    for (const itemId of LUNCHMATE_STARTER_PILOT_ITEM_IDS) {
      for (const pose of directPoses) {
        const layers = resolveLunchmateStarterCostumePoseLayers(itemId, pose);
        expect(layers.length, `${itemId}:${pose}`).toBeGreaterThan(0);

        for (const layer of layers) {
          const twoX = layer.source.srcSet.split(', ')[1].replace(/ 2x$/, '');
          expect(layer.source.src).toContain(`/starter-pilot-v3/1x/${itemId}/`);
          expect(twoX).toContain(`/starter-pilot-v3/2x/${itemId}/`);
          expect(existsSync(publicPath(layer.source.src)), layer.source.src).toBe(true);
          expect(existsSync(publicPath(twoX)), twoX).toBe(true);
          expect(layer.translateX).toBe(0);
          expect(layer.translateY).toBe(0);
          expect(layer.mirrored).toBe(false);
        }
      }
    }
  });

  it('uses the aligned front hoodie body during feeding so utensils stay visually outside the sleeves', () => {
    const front = resolveLunchmateStarterCostumePoseLayers('outfit_hoodie_coral', 'front');
    const feeding = resolveLunchmateStarterCostumePoseLayers('outfit_hoodie_coral', 'feeding');

    expect(feeding.map(layer => layer.source.src)).toEqual(front.map(layer => layer.source.src));
    expect(feeding.every(layer => layer.translateX === 0 && layer.translateY === 0)).toBe(true);
  });

  it('mirrors only the side-left canvas for sideRight and reuses front for emotion and grabbed', () => {
    for (const itemId of LUNCHMATE_STARTER_PILOT_ITEM_IDS) {
      const front = resolveLunchmateStarterCostumePoseLayers(itemId, 'front');
      const sideLeft = resolveLunchmateStarterCostumePoseLayers(itemId, 'sideLeft');
      const sideRight = resolveLunchmateStarterCostumePoseLayers(itemId, 'sideRight');
      const emotion = resolveLunchmateStarterCostumePoseLayers(itemId, 'emotion');
      const grabbed = resolveLunchmateStarterCostumePoseLayers(itemId, 'grabbed');

      expect(sideRight.map(layer => layer.source.src)).toEqual(sideLeft.map(layer => layer.source.src));
      expect(sideRight.every(layer => layer.mirrored)).toBe(true);
      expect(emotion.map(layer => layer.source.src)).toEqual(front.map(layer => layer.source.src));
      expect(grabbed.map(layer => layer.source.src)).toEqual(front.map(layer => layer.source.src));
      expect(emotion.every(layer => !layer.mirrored)).toBe(true);
      expect(grabbed.every(layer => !layer.mirrored)).toBe(true);
    }
  });

  it('maps every current chicken sprite to the required v3 pose family', () => {
    expect(resolveLunchmateChickenCostumePose('idle')).toBe('front');
    expect(resolveLunchmateChickenCostumePose('feeding')).toBe('feeding');
    expect(resolveLunchmateChickenCostumePose('side-walk-left-1')).toBe('sideLeft');
    expect(resolveLunchmateChickenCostumePose('side-walk-left-2')).toBe('sideLeft');
    expect(resolveLunchmateChickenCostumePose('side-walk-right-1')).toBe('sideRight');
    expect(resolveLunchmateChickenCostumePose('side-walk-right-2')).toBe('sideRight');
    expect(resolveLunchmateChickenCostumePose('sitting')).toBe('sitting');
    for (const key of ['happy', 'surprised', 'sleepy', 'crying'] as const) {
      expect(resolveLunchmateChickenCostumePose(key)).toBe('emotion');
    }
    expect(resolveLunchmateChickenCostumePose('grabbed')).toBe('grabbed');
  });

  it('keeps the exact bag/outfit/base/body/bag/face layer order and allows transparent behind assets', () => {
    expect(LUNCHMATE_STARTER_PILOT_LAYER_ORDER).toEqual(LUNCHMATE_LAYER_ORDER);
    const layers = resolveLunchmateChickenCostumeRenderLayers(LAYER_PREVIEW_LOADOUT, 'feeding');
    expect(layers.map(layer => layer.layerName)).toEqual([
      'bag-back',
      'outfit-back',
      'outfit-front',
      'bag-front',
      'eyewear',
      'headwear',
    ]);
    expect(layers.filter(layer => layer.layerName.endsWith('back'))).toHaveLength(2);
    expect(layers.every(layer => layer.translateX === 0 && layer.translateY === 0)).toBe(true);
  });

  it('does not render removed legacy catalog IDs as costume layers', () => {
    const removedLoadout = {
      outfitId: 'removed_outfit',
      headwearId: 'removed_headwear',
      eyewearId: 'removed_eyewear',
      bagId: 'removed_bag',
    } as const;
    const layers = resolveLunchmateChickenCostumeRenderLayers(removedLoadout, 'sitting');

    expect(layers).toEqual([]);
  });

  it('uses only mirror scale for sideRight and never applies an extra eyewear scale or placement translation', () => {
    const rendererSource = readFileSync(RENDERER_SOURCE_PATH, 'utf8');
    expect(rendererSource).toContain("transform: mirrored ? 'scaleX(-1)' : undefined");
    expect(rendererSource).not.toContain('scale(1.3)');
    expect(rendererSource).not.toContain('scale(1.28)');
    expect(rendererSource).not.toContain('eyewearScale');
    expect(rendererSource).not.toContain('translateX: 28');
    expect(rendererSource).not.toContain('translateY: 34');
  });
});

describe('Lunchmate Costume Collection Wave 1', () => {
  const directPoses = ['front', 'feeding', 'sideLeft', 'sitting'] as const;
  const itemIds = [
    'outfit_strawberry_picnic',
    'headwear_gingham_bow',
    'bag_picnic_basket',
    'outfit_sailor_blue',
    'headwear_sailor_cap_navy',
    'bag_anchor_pouch_navy',
  ] as const;

  it('registers the six Wave 1 IDs and every copied 360/720 RGBA overlay', () => {
    expect(LUNCHMATE_COLLECTION_WAVE1_ITEM_IDS).toEqual(itemIds);
    expect(LUNCHMATE_COSTUME_COLLECTION_WAVE1_POSE_MANIFEST.version).toBe(2);
    expect(LUNCHMATE_COSTUME_COLLECTION_WAVE1_POSE_MANIFEST.referenceCanvas).toBe(720);

    const pngFiles = collectPngFiles(COLLECTION_WAVE1_ROOT);
    const oneX = pngFiles.filter(path => path.includes(`${sep}1x${sep}`));
    const twoX = pngFiles.filter(path => path.includes(`${sep}2x${sep}`));
    expect(oneX).toHaveLength(40);
    expect(twoX).toHaveLength(40);

    for (const path of oneX) assertRgbaCanvas(path, 360);
    for (const path of twoX) assertRgbaCanvas(path, 720);
  });

  it('uses the ZIP front, feeding, side-left, and sitting artwork with literal zero translations', () => {
    for (const itemId of itemIds) {
      for (const pose of directPoses) {
        const layers = resolveLunchmateStarterCostumePoseLayers(itemId, pose);
        expect(layers.length, `${itemId}:${pose}`).toBeGreaterThan(0);

        for (const layer of layers) {
          const twoX = layer.source.srcSet.split(', ')[1].replace(/ 2x$/, '');
          expect(layer.source.src).toContain(`/collection-wave1-v1/1x/${itemId}/`);
          expect(twoX).toContain(`/collection-wave1-v1/2x/${itemId}/`);
          expect(layer.source.src).toContain('?v=collection-repaired-v2');
          expect(existsSync(publicPath(layer.source.src)), layer.source.src).toBe(true);
          expect(existsSync(publicPath(twoX)), twoX).toBe(true);
          expect(layer.translateX).toBe(0);
          expect(layer.translateY).toBe(0);
          expect(layer.mirrored).toBe(false);
        }
      }
    }
  });

  it('mirrors sideLeft for sideRight and reuses front for emotion and grabbed', () => {
    for (const itemId of itemIds) {
      const front = resolveLunchmateStarterCostumePoseLayers(itemId, 'front');
      const sideLeft = resolveLunchmateStarterCostumePoseLayers(itemId, 'sideLeft');
      const sideRight = resolveLunchmateStarterCostumePoseLayers(itemId, 'sideRight');
      const emotion = resolveLunchmateStarterCostumePoseLayers(itemId, 'emotion');
      const grabbed = resolveLunchmateStarterCostumePoseLayers(itemId, 'grabbed');

      expect(sideRight.map(layer => layer.source.src)).toEqual(sideLeft.map(layer => layer.source.src));
      expect(sideRight.every(layer => layer.mirrored)).toBe(true);
      expect(emotion.map(layer => layer.source.src)).toEqual(front.map(layer => layer.source.src));
      expect(grabbed.map(layer => layer.source.src)).toEqual(front.map(layer => layer.source.src));
    }
  });

  it('keeps all three Wave 1 slots independently combinable in placements.json layer order', () => {
    const strawberryPicnic = {
      outfitId: 'outfit_strawberry_picnic',
      headwearId: 'headwear_gingham_bow',
      eyewearId: null,
      bagId: 'bag_picnic_basket',
    } as const;
    const blueSailor = {
      outfitId: 'outfit_sailor_blue',
      headwearId: 'headwear_sailor_cap_navy',
      eyewearId: null,
      bagId: 'bag_anchor_pouch_navy',
    } as const;

    for (const loadout of [strawberryPicnic, blueSailor]) {
      for (const pose of directPoses) {
        const layers = resolveLunchmateChickenCostumeRenderLayers(loadout, pose);
        expect(layers.map(layer => layer.layerName)).toEqual([
          'bag-back',
          'outfit-back',
          'outfit-front',
          'bag-front',
          'headwear',
        ]);
        expect(layers.every(layer => layer.costumeId !== 'legacy')).toBe(true);
        expect(layers.every(layer => layer.translateX === 0 && layer.translateY === 0)).toBe(true);
      }
    }
  });

  it('resolves both repaired Wave 1 outfits and bags independently in all direct poses', () => {
    const outfitIds = itemIds.filter(id => id.startsWith('outfit_'));
    const bagIds = itemIds.filter(id => id.startsWith('bag_'));

    for (const pose of directPoses) {
      for (const outfitId of outfitIds) {
        const layers = resolveLunchmateChickenCostumeRenderLayers({
          outfitId,
          headwearId: null,
          eyewearId: null,
          bagId: null,
        }, pose);
        expect(layers.map(layer => layer.layerName), `${outfitId}:${pose}`).toEqual([
          'outfit-back',
          'outfit-front',
        ]);
      }

      for (const bagId of bagIds) {
        const layers = resolveLunchmateChickenCostumeRenderLayers({
          outfitId: null,
          headwearId: null,
          eyewearId: null,
          bagId,
        }, pose);
        expect(layers.map(layer => layer.layerName), `${bagId}:${pose}`).toEqual([
          'bag-back',
          'bag-front',
        ]);
      }
    }
  });

  it('keeps the approved Profile and Room character sizes at their theme anchors', () => {
    const foodieBuddySource = readFileSync(FOODIE_BUDDY_SOURCE_PATH, 'utf8');
    const foodieRoomSource = readFileSync(FOODIE_ROOM_SOURCE_PATH, 'utf8');
    expect(foodieBuddySource).toContain('const LUNCHMATE_RENDER_SIZE = 86');
    expect(foodieBuddySource).toContain('size={LUNCHMATE_RENDER_SIZE}');
    expect(foodieRoomSource).toContain('size={156}');
    expect(foodieRoomSource).toContain('bottom-[15.625%]');
  });
});

describe('Lunchmate Costume Collection Wave 2', () => {
  const directPoses = ['front', 'feeding', 'sideLeft', 'sitting'] as const;
  const itemIds = [
    'outfit_bakery_apron_cream',
    'headwear_chef_puff_cream',
    'bag_baguette_tote',
    'outfit_raincoat_yellow',
    'headwear_frog_bucket_hat',
    'bag_cloud_pouch',
    'outfit_cardigan_mint',
    'headwear_bow_cream_back',
    'bag_acorn_satchel',
    'outfit_denim_overalls',
    'headwear_bow_side_navy',
    'bag_camera_crossbody',
    'outfit_pajamas_lilac',
    'headwear_nightcap_lilac',
    'bag_star_pouch',
    'outfit_varsity_cherry_coral',
    'headwear_bow_pink_loop',
    'bag_cherry_crossbody',
  ] as const;

  const setLoadouts = [
    ['outfit_bakery_apron_cream', 'headwear_chef_puff_cream', 'bag_baguette_tote'],
    ['outfit_raincoat_yellow', 'headwear_frog_bucket_hat', 'bag_cloud_pouch'],
    ['outfit_cardigan_mint', 'headwear_bow_cream_back', 'bag_acorn_satchel'],
    ['outfit_denim_overalls', 'headwear_bow_side_navy', 'bag_camera_crossbody'],
    ['outfit_pajamas_lilac', 'headwear_nightcap_lilac', 'bag_star_pouch'],
    ['outfit_varsity_cherry_coral', 'headwear_bow_pink_loop', 'bag_cherry_crossbody'],
  ] as const;

  it('registers all six sets and every copied 360/720 RGBA overlay', () => {
    expect(LUNCHMATE_COLLECTION_WAVE2_ITEM_IDS).toEqual(itemIds);
    expect(LUNCHMATE_COSTUME_COLLECTION_WAVE2_POSE_MANIFEST.version).toBe(2);
    expect(LUNCHMATE_COSTUME_COLLECTION_WAVE2_POSE_MANIFEST.referenceCanvas).toBe(720);

    const pngFiles = collectPngFiles(COLLECTION_WAVE2_ROOT);
    const oneX = pngFiles.filter(path => path.includes(`${sep}1x${sep}`));
    const twoX = pngFiles.filter(path => path.includes(`${sep}2x${sep}`));
    expect(oneX).toHaveLength(120);
    expect(twoX).toHaveLength(120);

    for (const path of oneX) assertRgbaCanvas(path, 360);
    for (const path of twoX) assertRgbaCanvas(path, 720);
  });

  it('uses each direct pose from placements.json with no compensating translation', () => {
    for (const itemId of itemIds) {
      for (const pose of directPoses) {
        const layers = resolveLunchmateStarterCostumePoseLayers(itemId, pose);
        expect(layers.length, `${itemId}:${pose}`).toBeGreaterThan(0);
        for (const layer of layers) {
          const twoX = layer.source.srcSet.split(', ')[1].replace(/ 2x$/, '');
          expect(layer.source.src).toContain(`/collection-wave2-v1/1x/${itemId}/`);
          expect(twoX).toContain(`/collection-wave2-v1/2x/${itemId}/`);
          expect(layer.source.src).toContain('?v=collection-repaired-v2');
          expect(existsSync(publicPath(layer.source.src)), layer.source.src).toBe(true);
          expect(existsSync(publicPath(twoX)), twoX).toBe(true);
          expect(layer.translateX).toBe(0);
          expect(layer.translateY).toBe(0);
          expect(layer.mirrored).toBe(false);
        }
      }
    }
  });

  it('mirrors sideLeft for sideRight and keeps emotion/grabbed on the front artwork', () => {
    for (const itemId of itemIds) {
      const front = resolveLunchmateStarterCostumePoseLayers(itemId, 'front');
      const sideLeft = resolveLunchmateStarterCostumePoseLayers(itemId, 'sideLeft');
      const sideRight = resolveLunchmateStarterCostumePoseLayers(itemId, 'sideRight');
      const emotion = resolveLunchmateStarterCostumePoseLayers(itemId, 'emotion');
      const grabbed = resolveLunchmateStarterCostumePoseLayers(itemId, 'grabbed');

      expect(sideRight.map(layer => layer.source.src)).toEqual(sideLeft.map(layer => layer.source.src));
      expect(sideRight.every(layer => layer.mirrored)).toBe(true);
      expect(emotion.map(layer => layer.source.src)).toEqual(front.map(layer => layer.source.src));
      expect(grabbed.map(layer => layer.source.src)).toEqual(front.map(layer => layer.source.src));
    }
  });

  it('keeps every set independently composable in bag/outfit/base/body/bag/face/headwear order', () => {
    for (const [outfitId, headwearId, bagId] of setLoadouts) {
      const loadout = { outfitId, headwearId, eyewearId: null, bagId };
      for (const pose of directPoses) {
        const layers = resolveLunchmateChickenCostumeRenderLayers(loadout, pose);
        expect(layers.map(layer => layer.layerName)).toEqual([
          'bag-back',
          'outfit-back',
          'outfit-front',
          'bag-front',
          'headwear',
        ]);
        expect(layers.every(layer => layer.costumeId !== 'legacy')).toBe(true);
        expect(layers.every(layer => layer.translateX === 0 && layer.translateY === 0)).toBe(true);
      }
    }
  });

  it('resolves every repaired outfit and bag independently in all direct poses', () => {
    const outfitIds = itemIds.filter(id => id.startsWith('outfit_'));
    const bagIds = itemIds.filter(id => id.startsWith('bag_'));

    for (const pose of directPoses) {
      for (const outfitId of outfitIds) {
        const layers = resolveLunchmateChickenCostumeRenderLayers({
          outfitId,
          headwearId: null,
          eyewearId: null,
          bagId: null,
        }, pose);
        expect(layers.map(layer => layer.layerName), `${outfitId}:${pose}`).toEqual([
          'outfit-back',
          'outfit-front',
        ]);
      }

      for (const bagId of bagIds) {
        const layers = resolveLunchmateChickenCostumeRenderLayers({
          outfitId: null,
          headwearId: null,
          eyewearId: null,
          bagId,
        }, pose);
        expect(layers.map(layer => layer.layerName), `${bagId}:${pose}`).toEqual([
          'bag-back',
          'bag-front',
        ]);
      }
    }
  });

  it('keeps the repaired Bakery apron complete on both direct side poses', () => {
    for (const pose of ['front', 'sideLeft'] as const) {
      const layers = resolveLunchmateStarterCostumePoseLayers('outfit_bakery_apron_cream', pose);
      expect(layers.map(layer => layer.layerName)).toEqual(['outfit-back', 'outfit-front']);
      expect(layers[1].source.src).toContain(`outfit_bakery_apron_cream/${pose === 'front' ? 'front' : 'side-left'}-body.png`);
    }
  });

  it('reuses the established raincoat ID without duplicating the catalog entry', () => {
    expect(LUNCHMATE_ITEMS.filter(item => item.id === 'outfit_raincoat_yellow')).toHaveLength(1);
    expect(resolveLunchmateStarterCostumePoseLayers('outfit_raincoat_yellow', 'feeding')
      .every(layer => layer.source.src.includes('/collection-wave2-v1/'))).toBe(true);
  });
});

describe('Lunchmate Costume Collection Wave 3', () => {
  const directPoses = ['front', 'feeding', 'sideLeft', 'sitting'] as const;
  const itemIds = [
    'outfit_space_explorer_cream',
    'headwear_space_hood_periwinkle',
    'bag_moon_pouch_honey',
    'outfit_artist_smock_rose',
    'headwear_beret_teal',
    'bag_palette_crossbody',
    'outfit_garden_overalls_sage',
    'headwear_tulip_headband_coral',
    'bag_watering_can_terracotta',
    'outfit_detective_cape_cocoa',
    'headwear_detective_cap_forest',
    'bag_magnifying_satchel',
  ] as const;

  const mixedLoadouts = [
    ['outfit_space_explorer_cream', 'headwear_beret_teal', 'bag_watering_can_terracotta'],
    ['outfit_artist_smock_rose', 'headwear_detective_cap_forest', 'bag_moon_pouch_honey'],
    ['outfit_garden_overalls_sage', 'headwear_space_hood_periwinkle', 'bag_palette_crossbody'],
    ['outfit_detective_cape_cocoa', 'headwear_tulip_headband_coral', 'bag_magnifying_satchel'],
  ] as const;

  it('registers all 12 Wave 3 v2 IDs and 160 fixed RGBA overlays', () => {
    expect(LUNCHMATE_COLLECTION_WAVE3_ITEM_IDS).toEqual(itemIds);
    expect(LUNCHMATE_COSTUME_COLLECTION_WAVE3_POSE_MANIFEST.version).toBe(2);
    expect(LUNCHMATE_COSTUME_COLLECTION_WAVE3_POSE_MANIFEST.referenceCanvas).toBe(720);

    const pngFiles = collectPngFiles(COLLECTION_WAVE3_ROOT);
    const oneX = pngFiles.filter(path => path.includes(`${sep}1x${sep}`));
    const twoX = pngFiles.filter(path => path.includes(`${sep}2x${sep}`));
    expect(oneX).toHaveLength(80);
    expect(twoX).toHaveLength(80);
    for (const path of oneX) assertRgbaCanvas(path, 360);
    for (const path of twoX) assertRgbaCanvas(path, 720);
  });

  it('resolves the four direct poses, reuse poses, and mirrored walking direction with zero placement offsets', () => {
    for (const itemId of itemIds) {
      for (const pose of directPoses) {
        const layers = resolveLunchmateStarterCostumePoseLayers(itemId, pose);
        expect(layers.length, `${itemId}:${pose}`).toBeGreaterThan(0);
        for (const layer of layers) {
          const twoX = layer.source.srcSet.split(', ')[1].replace(/ 2x$/, '');
          expect(layer.source.src).toContain(`/collection-wave3-v2/1x/${itemId}/`);
          expect(twoX).toContain(`/collection-wave3-v2/2x/${itemId}/`);
          expect(layer.source.src).toContain('?v=collection-wave3-v2');
          expect(existsSync(publicPath(layer.source.src)), layer.source.src).toBe(true);
          expect(existsSync(publicPath(twoX)), twoX).toBe(true);
          expect(layer.translateX).toBe(0);
          expect(layer.translateY).toBe(0);
          expect(layer.mirrored).toBe(false);
        }
      }

      const sideLeft = resolveLunchmateStarterCostumePoseLayers(itemId, 'sideLeft');
      const sideRight = resolveLunchmateStarterCostumePoseLayers(itemId, 'sideRight');
      const front = resolveLunchmateStarterCostumePoseLayers(itemId, 'front');
      expect(sideRight.map(layer => layer.source.src)).toEqual(sideLeft.map(layer => layer.source.src));
      expect(sideRight.every(layer => layer.mirrored)).toBe(true);
      expect(resolveLunchmateStarterCostumePoseLayers(itemId, 'emotion').map(layer => layer.source.src))
        .toEqual(front.map(layer => layer.source.src));
      expect(resolveLunchmateStarterCostumePoseLayers(itemId, 'grabbed').map(layer => layer.source.src))
        .toEqual(front.map(layer => layer.source.src));
    }
  });

  it('keeps every slot independently wearable and cross-set combinations in the established layer order', () => {
    const outfitIds = itemIds.filter(id => id.startsWith('outfit_'));
    const headwearIds = itemIds.filter(id => id.startsWith('headwear_'));
    const bagIds = itemIds.filter(id => id.startsWith('bag_'));

    for (const pose of directPoses) {
      for (const outfitId of outfitIds) {
        expect(resolveLunchmateChickenCostumeRenderLayers({ outfitId, headwearId: null, eyewearId: null, bagId: null }, pose)
          .map(layer => layer.layerName)).toEqual(['outfit-back', 'outfit-front']);
      }
      for (const headwearId of headwearIds) {
        expect(resolveLunchmateChickenCostumeRenderLayers({ outfitId: null, headwearId, eyewearId: null, bagId: null }, pose)
          .map(layer => layer.layerName)).toEqual(['headwear']);
      }
      for (const bagId of bagIds) {
        expect(resolveLunchmateChickenCostumeRenderLayers({ outfitId: null, headwearId: null, eyewearId: null, bagId }, pose)
          .map(layer => layer.layerName)).toEqual(['bag-back', 'bag-front']);
      }
    }

    for (const [outfitId, headwearId, bagId] of mixedLoadouts) {
      for (const pose of directPoses) {
        expect(resolveLunchmateChickenCostumeRenderLayers({ outfitId, headwearId, eyewearId: null, bagId }, pose)
          .map(layer => layer.layerName)).toEqual([
            'bag-back',
            'outfit-back',
            'outfit-front',
            'bag-front',
            'headwear',
          ]);
      }
    }
  });

  it('retains the approved Profile and FoodieRoom rendering sizes', () => {
    const foodieBuddySource = readFileSync(FOODIE_BUDDY_SOURCE_PATH, 'utf8');
    const foodieRoomSource = readFileSync(FOODIE_ROOM_SOURCE_PATH, 'utf8');
    expect(foodieBuddySource).toContain('const LUNCHMATE_RENDER_SIZE = 86');
    expect(foodieRoomSource).toContain('size={156}');
    expect(foodieRoomSource).toContain('bottom-[15.625%]');
  });
});

describe('Lunchmate Eyewear Collection Wave 1', () => {
  const directPoses = ['front', 'feeding', 'sideLeft', 'sitting'] as const;
  const itemIds = [
    'eyewear_sunglasses_cocoa',
    'eyewear_heart_coral',
    'eyewear_star_honey',
    'eyewear_cat_eye_lilac',
  ] as const;

  it('registers all four 360/720 RGBA eyewear overlays without duplicating the established heart ID', () => {
    expect(LUNCHMATE_EYEWEAR_COLLECTION_WAVE1_ITEM_IDS).toEqual(itemIds);
    expect(LUNCHMATE_EYEWEAR_COLLECTION_WAVE1_POSE_MANIFEST.version).toBe(1);
    expect(LUNCHMATE_EYEWEAR_COLLECTION_WAVE1_POSE_MANIFEST.referenceCanvas).toBe(720);
    expect(LUNCHMATE_ITEMS.filter(item => item.id === 'eyewear_heart_coral')).toHaveLength(1);

    const pngFiles = collectPngFiles(EYEWEAR_COLLECTION_WAVE1_ROOT);
    const oneX = pngFiles.filter(path => path.includes(`${sep}1x${sep}`));
    const twoX = pngFiles.filter(path => path.includes(`${sep}2x${sep}`));
    expect(oneX).toHaveLength(16);
    expect(twoX).toHaveLength(16);
    for (const path of oneX) assertRgbaCanvas(path, 360);
    for (const path of twoX) assertRgbaCanvas(path, 720);
  });

  it('resolves direct poses after the face with side-right mirror and literal zero translations', () => {
    for (const itemId of itemIds) {
      for (const pose of directPoses) {
        const layers = resolveLunchmateStarterCostumePoseLayers(itemId, pose);
        expect(layers).toHaveLength(1);
        const layer = layers[0];
        const twoX = layer.source.srcSet.split(', ')[1].replace(/ 2x$/, '');
        expect(layer.layerName).toBe('eyewear');
        expect(layer.source.src).toContain(`/eyewear-collection-wave1-v1/1x/${itemId}/`);
        expect(twoX).toContain(`/eyewear-collection-wave1-v1/2x/${itemId}/`);
        expect(layer.source.src).toContain('?v=eyewear-collection-wave1-v1');
        expect(existsSync(publicPath(layer.source.src)), layer.source.src).toBe(true);
        expect(existsSync(publicPath(twoX)), twoX).toBe(true);
        expect(layer.translateX).toBe(0);
        expect(layer.translateY).toBe(0);
        expect(layer.mirrored).toBe(false);
      }

      const front = resolveLunchmateStarterCostumePoseLayers(itemId, 'front');
      const sideLeft = resolveLunchmateStarterCostumePoseLayers(itemId, 'sideLeft');
      const sideRight = resolveLunchmateStarterCostumePoseLayers(itemId, 'sideRight');
      expect(sideRight.map(layer => layer.source.src)).toEqual(sideLeft.map(layer => layer.source.src));
      expect(sideRight.every(layer => layer.mirrored)).toBe(true);
      expect(resolveLunchmateStarterCostumePoseLayers(itemId, 'emotion').map(layer => layer.source.src))
        .toEqual(front.map(layer => layer.source.src));
      expect(resolveLunchmateStarterCostumePoseLayers(itemId, 'grabbed').map(layer => layer.source.src))
        .toEqual(front.map(layer => layer.source.src));
    }
  });

  it('combines each eyewear item with independent Wave 3 outfit, bag, and headwear layers', () => {
    for (const eyewearId of itemIds) {
      for (const pose of directPoses) {
        expect(resolveLunchmateChickenCostumeRenderLayers({
          outfitId: 'outfit_artist_smock_rose',
          headwearId: 'headwear_tulip_headband_coral',
          eyewearId,
          bagId: 'bag_magnifying_satchel',
        }, pose).map(layer => layer.layerName)).toEqual([
          'bag-back',
          'outfit-back',
          'outfit-front',
          'bag-front',
          'eyewear',
          'headwear',
        ]);
      }
    }
  });
});

describe('Lunchmate food flow and presentation contracts', () => {
  it('keeps one responsive food-flight layer during sharingAnimation', () => {
    const foodieBuddySource = readFileSync(FOODIE_BUDDY_SOURCE_PATH, 'utf8');
    const flightStart = foodieBuddySource.indexOf('{isSharingAnimation && sharedFoodPlaceholder && (');
    const flightEnd = foodieBuddySource.indexOf('/* 정적 idle 캐릭터', flightStart);
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

  it('keeps Level Up compact and makes Profile/Room use the static chicken artwork', () => {
    const levelUpSource = readFileSync(LEVEL_UP_SOURCE_PATH, 'utf8');
    const foodieRoomSource = readFileSync(FOODIE_ROOM_SOURCE_PATH, 'utf8');
    const foodieBuddySource = readFileSync(FOODIE_BUDDY_SOURCE_PATH, 'utf8');

    expect(levelUpSource).toContain('levelUpActive');
    expect(levelUpSource).toContain('loadout={loadout}');
    expect(levelUpSource).toContain('renderSize="compact"');
    expect(foodieRoomSource).toContain('flowState="idle"');
    expect(foodieRoomSource).toContain('renderSize="room"');
    expect(foodieRoomSource).toContain('artwork="chicken"');
    expect(foodieRoomSource).toContain('animated={false}');
    expect(foodieRoomSource).toContain('className="relative aspect-[3/2]');
    expect(foodieRoomSource).toContain('size={156}');
    expect(foodieRoomSource).toContain('className="absolute inset-x-0 bottom-[15.625%] z-10 flex justify-center"');
    expect(foodieBuddySource).toContain('artwork="chicken"');
    expect(foodieBuddySource).toContain('animated={false}');
    expect(foodieBuddySource).toContain('const LUNCHMATE_RENDER_SIZE = 86');
    expect(foodieBuddySource).toContain('chickenFaceSystem={profileFaceSystemEnabled}');
    expect(foodieBuddySource).toContain("chickenFaceOverride={profileTapFace ?? 'default'}");
    expect(foodieBuddySource).toContain("height: 'clamp(144px, 38vw, 150px)'");
    expect(foodieBuddySource).toContain("background: 'rgba(255,255,255,0.88)'");
    expect(foodieBuddySource).not.toContain('👀→');
    expect(foodieBuddySource).not.toContain('wanderRef');
    expect(foodieBuddySource).not.toContain('bounceRef');
  });

  it('keeps tap reactions local, streaked, and blocked by feeding interactions', () => {
    const foodieBuddySource = readFileSync(FOODIE_BUDDY_SOURCE_PATH, 'utf8');

    expect(foodieBuddySource).toContain('const PROFILE_TAP_STREAK_RESET_MS = 2_000');
    expect(foodieBuddySource).toContain("surprised: 600");
    expect(foodieBuddySource).toContain("crying: 900");
    expect(foodieBuddySource).toContain("angry: 1_100");
    expect(foodieBuddySource).toContain("profileTapFace === 'angry' && !motionIsReduced");
    expect(foodieBuddySource).toContain('profileTapInteractionBlocked');
    expect(foodieBuddySource).toContain('isLunchboxDragGesture(');
    expect(foodieBuddySource).toContain('createLunchmateProfileTapInteractionController(setProfileTapFace)');
    expect(foodieBuddySource).toContain('profileTapController.pointerUp({');
    expect(foodieBuddySource).toContain('suspended: isFeeding || isFoodDragging || isLunchboxOpen || isProfileTapReactionActive');
  });
});
