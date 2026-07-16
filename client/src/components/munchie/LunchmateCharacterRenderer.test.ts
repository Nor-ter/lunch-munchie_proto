import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
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
import type { LunchmateAssetSource } from '../../constants/lunchmateAssets';
import type { LunchmateLayerItem } from '../../types/lunchmateCustomization';

const PUBLIC_ROOT = join(process.cwd(), 'client', 'public');
const LAYER_ROOT = join(PUBLIC_ROOT, 'assets', 'lunchmate', 'layers');
const RENDERER_SOURCE_PATH = join(process.cwd(), 'client', 'src', 'components', 'munchie', 'LunchmateCharacterRenderer.tsx');

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

  it('maps every 1x and 2x production source to a copied PNG', () => {
    const sources = LUNCHMATE_ITEMS.flatMap(itemSources);
    expect(sources).toHaveLength(40);

    for (const source of sources) {
      const oneX = join(PUBLIC_ROOT, source.src.replace(/^\/+/, ''));
      const twoXPath = source.src.replace(/\.png$/, '@2x.png');
      const twoX = join(PUBLIC_ROOT, twoXPath.replace(/^\/+/, ''));
      expect(existsSync(oneX), source.src).toBe(true);
      expect(existsSync(twoX), twoXPath).toBe(true);
      expect(source.srcSet).toBe(`${source.src} 1x, ${twoXPath} 2x`);
    }
  });

  it('contains exactly 40 1x and 40 2x RGBA canvases', () => {
    const pngFiles = collectPngFiles(LAYER_ROOT);
    const oneX = pngFiles.filter(path => !path.endsWith('@2x.png'));
    const twoX = pngFiles.filter(path => path.endsWith('@2x.png'));
    expect(oneX).toHaveLength(40);
    expect(twoX).toHaveLength(40);

    for (const path of pngFiles) {
      const png = readFileSync(path);
      const expectedSize = path.endsWith('@2x.png') ? 720 : 360;
      expect(png.readUInt32BE(16), path).toBe(expectedSize);
      expect(png.readUInt32BE(20), path).toBe(expectedSize);
      expect(png[25], path).toBe(6);
    }
  });
});

describe('LunchmateCharacterRenderer layered composition', () => {
  it('resolves an empty loadout to the base only', () => {
    expect(resolveLunchmateRenderLayers(EMPTY_LUNCHMATE_LOADOUT, 'default')).toEqual([
      { layerName: 'base' },
    ]);
  });

  it('resolves the four-slot fixture in the required DOM order', () => {
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

  it('uses a layer default when the current visual state has no override', () => {
    const hoodie = LUNCHMATE_ITEMS_BY_ID.outfit_hoodie_coral;
    expect(hoodie).toBeDefined();
    for (const state of ['default', 'eating', 'thinking', 'like', 'jump'] as const) {
      expect(resolveLunchmateLayerSource(hoodie?.front, state)).toBe(hoodie?.front.default);
      expect(resolveLunchmateRenderLayers(LAYER_PREVIEW_LOADOUT, state).map(layer => layer.layerName))
        .toEqual(LUNCHMATE_LAYER_ORDER);
    }
  });

  it('preserves the existing reaction-to-like state mapping', () => {
    const rendererSource = readFileSync(RENDERER_SOURCE_PATH, 'utf8');
    expect(rendererSource).toMatch(/case 'reaction':\s+return 'like';/);
    expect(resolveLunchmateRenderLayers(LAYER_PREVIEW_LOADOUT, 'like').map(layer => layer.layerName))
      .toEqual(LUNCHMATE_LAYER_ORDER);
  });

  it('keeps accessories decorative and backgrounds outside the character canvas', () => {
    const rendererSource = readFileSync(RENDERER_SOURCE_PATH, 'utf8');
    expect(rendererSource).toContain('alt=""');
    expect(rendererSource).toContain('aria-hidden="true"');
    expect(rendererSource).toContain('data-lunchmate-character-canvas="true"');
    expect(rendererSource).not.toContain('data-lunchmate-layer="background"');
    expect(rendererSource).not.toContain("constants/skins");
    expect(rendererSource).toContain('onError={() => setLoadFailed(true)}');
  });
});
