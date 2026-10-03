import {
  lunchmateLayerAssetSource,
  type LunchmateAssetSource,
  type LunchmateStateAssetKey,
} from './lunchmateAssets';
import type {
  LunchmateLayerItem,
  LunchmateLayerPart,
  LunchmateLoadout,
  LunchmateSlot,
} from '../types/lunchmateCustomization';

function layerPart(relativePath: string): LunchmateLayerPart {
  return { default: lunchmateLayerAssetSource(relativePath) };
}

/**
 * Costume collections are rendered pose-aware for chicken artwork. These
 * front sources retain a safe manifest fallback without changing legacy item
 * paths or any persisted loadout data.
 */
function costumeCollectionLayerPart(
  collection:
    | 'collection-wave1-v1'
    | 'collection-wave2-v1'
    | 'collection-wave3-v2'
    | 'eyewear-collection-wave1-v1',
  relativePath: string,
): LunchmateLayerPart {
  const revisions = {
    'collection-wave1-v1': 'collection-repaired-v2',
    'collection-wave2-v1': 'collection-repaired-v2',
    'collection-wave3-v2': 'collection-wave3-v2',
    'eyewear-collection-wave1-v1': 'eyewear-collection-wave1-v1',
  } as const;
  const revision = `?v=${revisions[collection]}`;
  const oneX = `/assets/lunchmate/costumes/${collection}/1x/${relativePath}.png${revision}`;
  const twoX = `/assets/lunchmate/costumes/${collection}/2x/${relativePath}@2x.png${revision}`;
  return {
    default: {
      src: oneX,
      srcSet: `${oneX} 1x, ${twoX} 2x`,
    },
  };
}

function collectionWave1LayerPart(relativePath: string): LunchmateLayerPart {
  return costumeCollectionLayerPart('collection-wave1-v1', relativePath);
}

function collectionWave2LayerPart(relativePath: string): LunchmateLayerPart {
  return costumeCollectionLayerPart('collection-wave2-v1', relativePath);
}

function collectionWave3LayerPart(relativePath: string): LunchmateLayerPart {
  return costumeCollectionLayerPart('collection-wave3-v2', relativePath);
}

function eyewearCollectionWave1LayerPart(relativePath: string): LunchmateLayerPart {
  return costumeCollectionLayerPart('eyewear-collection-wave1-v1', relativePath);
}

export const LUNCHMATE_ITEMS = [
  {
    id: 'outfit_hoodie_coral',
    slot: 'outfit',
    name: "Coral Hoodie",
    rarity: 'common',
    front: layerPart('outfit/hoodie'),
    back: layerPart('outfit/hoodie_back'),
  },
  {
    id: 'outfit_raincoat_yellow',
    slot: 'outfit',
    name: "Yellow Raincoat",
    rarity: 'rare',
    front: layerPart('outfit/raincoat_yellow'),
    back: layerPart('outfit/raincoat_yellow_back'),
  },
  {
    id: 'outfit_strawberry_picnic',
    slot: 'outfit',
    name: "Strawberry Picnic",
    rarity: 'rare',
    front: collectionWave1LayerPart('outfit_strawberry_picnic/front-body'),
    back: collectionWave1LayerPart('outfit_strawberry_picnic/front-behind'),
  },
  {
    id: 'outfit_sailor_blue',
    slot: 'outfit',
    name: "Blue Sailor Outfit",
    rarity: 'rare',
    front: collectionWave1LayerPart('outfit_sailor_blue/front-body'),
    back: collectionWave1LayerPart('outfit_sailor_blue/front-behind'),
  },
  {
    id: 'outfit_bakery_apron_cream',
    slot: 'outfit',
    name: "Bakery Apron",
    rarity: 'rare',
    front: collectionWave2LayerPart('outfit_bakery_apron_cream/front-body'),
    back: collectionWave2LayerPart('outfit_bakery_apron_cream/front-behind'),
  },
  {
    id: 'outfit_cardigan_mint',
    slot: 'outfit',
    name: "Mint Cottage Cardigan",
    rarity: 'rare',
    front: collectionWave2LayerPart('outfit_cardigan_mint/front-body'),
    back: collectionWave2LayerPart('outfit_cardigan_mint/front-behind'),
  },
  {
    id: 'outfit_denim_overalls',
    slot: 'outfit',
    name: "Denim Play Overalls",
    rarity: 'rare',
    front: collectionWave2LayerPart('outfit_denim_overalls/front-body'),
    back: collectionWave2LayerPart('outfit_denim_overalls/front-behind'),
  },
  {
    id: 'outfit_pajamas_lilac',
    slot: 'outfit',
    name: "Lilac Dream Pajamas",
    rarity: 'rare',
    front: collectionWave2LayerPart('outfit_pajamas_lilac/front-body'),
    back: collectionWave2LayerPart('outfit_pajamas_lilac/front-behind'),
  },
  {
    id: 'outfit_varsity_cherry_coral',
    slot: 'outfit',
    name: "Cherry Varsity",
    rarity: 'rare',
    front: collectionWave2LayerPart('outfit_varsity_cherry_coral/front-body'),
    back: collectionWave2LayerPart('outfit_varsity_cherry_coral/front-behind'),
  },
  {
    id: 'outfit_space_explorer_cream',
    slot: 'outfit',
    name: "Space Explorer",
    rarity: 'rare',
    front: collectionWave3LayerPart('outfit_space_explorer_cream/front-body'),
    back: collectionWave3LayerPart('outfit_space_explorer_cream/front-behind'),
  },
  {
    id: 'outfit_artist_smock_rose',
    slot: 'outfit',
    name: "Little Artist Smock",
    rarity: 'rare',
    front: collectionWave3LayerPart('outfit_artist_smock_rose/front-body'),
    back: collectionWave3LayerPart('outfit_artist_smock_rose/front-behind'),
  },
  {
    id: 'outfit_garden_overalls_sage',
    slot: 'outfit',
    name: "Garden Helper Overalls",
    rarity: 'rare',
    front: collectionWave3LayerPart('outfit_garden_overalls_sage/front-body'),
    back: collectionWave3LayerPart('outfit_garden_overalls_sage/front-behind'),
  },
  {
    id: 'outfit_detective_cape_cocoa',
    slot: 'outfit',
    name: "Cozy Detective Cape",
    rarity: 'rare',
    front: collectionWave3LayerPart('outfit_detective_cape_cocoa/front-body'),
    back: collectionWave3LayerPart('outfit_detective_cape_cocoa/front-behind'),
  },
  {
    id: 'headwear_beret_coral',
    slot: 'headwear',
    name: "Coral Beret",
    rarity: 'common',
    front: layerPart('headwear/beret'),
  },
  {
    id: 'headwear_gingham_bow',
    slot: 'headwear',
    name: "Gingham Ribbon",
    rarity: 'rare',
    front: collectionWave1LayerPart('headwear_gingham_bow/front'),
  },
  {
    id: 'headwear_sailor_cap_navy',
    slot: 'headwear',
    name: "Navy Sailor Cap",
    rarity: 'rare',
    front: collectionWave1LayerPart('headwear_sailor_cap_navy/front'),
  },
  {
    id: 'headwear_chef_puff_cream',
    slot: 'headwear',
    name: "Cream Chef Hat",
    rarity: 'rare',
    front: collectionWave2LayerPart('headwear_chef_puff_cream/front'),
  },
  {
    id: 'headwear_frog_bucket_hat',
    slot: 'headwear',
    name: "Frog Bucket Hat",
    rarity: 'rare',
    front: collectionWave2LayerPart('headwear_frog_bucket_hat/front'),
  },
  {
    id: 'headwear_bow_cream_back',
    slot: 'headwear',
    name: "Cream Back Ribbon",
    rarity: 'rare',
    front: collectionWave2LayerPart('headwear_bow_cream_back/front'),
  },
  {
    id: 'headwear_bow_side_navy',
    slot: 'headwear',
    name: "Navy Side Ribbon",
    rarity: 'rare',
    front: collectionWave2LayerPart('headwear_bow_side_navy/front'),
  },
  {
    id: 'headwear_nightcap_lilac',
    slot: 'headwear',
    name: "Lilac Nightcap",
    rarity: 'rare',
    front: collectionWave2LayerPart('headwear_nightcap_lilac/front'),
  },
  {
    id: 'headwear_bow_pink_loop',
    slot: 'headwear',
    name: "Pink Loop Ribbon",
    rarity: 'rare',
    front: collectionWave2LayerPart('headwear_bow_pink_loop/front'),
  },
  {
    id: 'headwear_space_hood_periwinkle',
    slot: 'headwear',
    name: "Periwinkle Space Hood",
    rarity: 'rare',
    front: collectionWave3LayerPart('headwear_space_hood_periwinkle/front'),
  },
  {
    id: 'headwear_beret_teal',
    slot: 'headwear',
    name: "Teal Beret",
    rarity: 'rare',
    front: collectionWave3LayerPart('headwear_beret_teal/front'),
  },
  {
    id: 'headwear_tulip_headband_coral',
    slot: 'headwear',
    name: "Coral Tulip Headband",
    rarity: 'rare',
    front: collectionWave3LayerPart('headwear_tulip_headband_coral/front'),
  },
  {
    id: 'headwear_detective_cap_forest',
    slot: 'headwear',
    name: "Forest Detective Cap",
    rarity: 'rare',
    front: collectionWave3LayerPart('headwear_detective_cap_forest/front'),
  },
  {
    id: 'eyewear_round_black',
    slot: 'eyewear',
    name: "Black Round Glasses",
    rarity: 'common',
    front: layerPart('eyewear/round_glasses'),
  },
  {
    id: 'eyewear_heart_coral',
    slot: 'eyewear',
    name: "Coral Heart Glasses",
    rarity: 'rare',
    front: eyewearCollectionWave1LayerPart('eyewear_heart_coral/front'),
  },
  {
    id: 'eyewear_sunglasses_cocoa',
    slot: 'eyewear',
    name: "Cocoa Classic Sunglasses",
    rarity: 'common',
    front: eyewearCollectionWave1LayerPart('eyewear_sunglasses_cocoa/front'),
  },
  {
    id: 'eyewear_star_honey',
    slot: 'eyewear',
    name: "Honey Star Sunglasses",
    rarity: 'special',
    front: eyewearCollectionWave1LayerPart('eyewear_star_honey/front'),
  },
  {
    id: 'eyewear_cat_eye_lilac',
    slot: 'eyewear',
    name: "Lilac Cat-eye Sunglasses",
    rarity: 'rare',
    front: eyewearCollectionWave1LayerPart('eyewear_cat_eye_lilac/front'),
  },
  {
    id: 'bag_backpack_green',
    slot: 'bag',
    name: "Green Backpack",
    rarity: 'common',
    front: layerPart('bag/backpack_straps'),
    back: layerPart('bag/backpack_back'),
  },
  {
    id: 'bag_picnic_basket',
    slot: 'bag',
    name: "Picnic Basket",
    rarity: 'rare',
    front: collectionWave1LayerPart('bag_picnic_basket/front-front'),
    back: collectionWave1LayerPart('bag_picnic_basket/front-behind'),
  },
  {
    id: 'bag_anchor_pouch_navy',
    slot: 'bag',
    name: "Navy Anchor Pouch",
    rarity: 'rare',
    front: collectionWave1LayerPart('bag_anchor_pouch_navy/front-front'),
    back: collectionWave1LayerPart('bag_anchor_pouch_navy/front-behind'),
  },
  {
    id: 'bag_baguette_tote',
    slot: 'bag',
    name: "Baguette Tote",
    rarity: 'rare',
    front: collectionWave2LayerPart('bag_baguette_tote/front-front'),
    back: collectionWave2LayerPart('bag_baguette_tote/front-behind'),
  },
  {
    id: 'bag_cloud_pouch',
    slot: 'bag',
    name: "Cloud Pouch",
    rarity: 'rare',
    front: collectionWave2LayerPart('bag_cloud_pouch/front-front'),
    back: collectionWave2LayerPart('bag_cloud_pouch/front-behind'),
  },
  {
    id: 'bag_acorn_satchel',
    slot: 'bag',
    name: "Acorn Satchel",
    rarity: 'rare',
    front: collectionWave2LayerPart('bag_acorn_satchel/front-front'),
    back: collectionWave2LayerPart('bag_acorn_satchel/front-behind'),
  },
  {
    id: 'bag_camera_crossbody',
    slot: 'bag',
    name: "Camera Crossbody Bag",
    rarity: 'rare',
    front: collectionWave2LayerPart('bag_camera_crossbody/front-front'),
    back: collectionWave2LayerPart('bag_camera_crossbody/front-behind'),
  },
  {
    id: 'bag_star_pouch',
    slot: 'bag',
    name: "Star Pouch",
    rarity: 'rare',
    front: collectionWave2LayerPart('bag_star_pouch/front-front'),
    back: collectionWave2LayerPart('bag_star_pouch/front-behind'),
  },
  {
    id: 'bag_cherry_crossbody',
    slot: 'bag',
    name: "Cherry Crossbody Bag",
    rarity: 'rare',
    front: collectionWave2LayerPart('bag_cherry_crossbody/front-front'),
    back: collectionWave2LayerPart('bag_cherry_crossbody/front-behind'),
  },
  {
    id: 'bag_moon_pouch_honey',
    slot: 'bag',
    name: "Honey Moon Pouch",
    rarity: 'rare',
    front: collectionWave3LayerPart('bag_moon_pouch_honey/front-front'),
    back: collectionWave3LayerPart('bag_moon_pouch_honey/front-behind'),
  },
  {
    id: 'bag_palette_crossbody',
    slot: 'bag',
    name: "Palette Crossbody Bag",
    rarity: 'rare',
    front: collectionWave3LayerPart('bag_palette_crossbody/front-front'),
    back: collectionWave3LayerPart('bag_palette_crossbody/front-behind'),
  },
  {
    id: 'bag_watering_can_terracotta',
    slot: 'bag',
    name: "Terracotta Watering Can",
    rarity: 'rare',
    front: collectionWave3LayerPart('bag_watering_can_terracotta/front-front'),
    back: collectionWave3LayerPart('bag_watering_can_terracotta/front-behind'),
  },
  {
    id: 'bag_magnifying_satchel',
    slot: 'bag',
    name: "Magnifying Glass Satchel",
    rarity: 'rare',
    front: collectionWave3LayerPart('bag_magnifying_satchel/front-front'),
    back: collectionWave3LayerPart('bag_magnifying_satchel/front-behind'),
  },
] as const satisfies readonly LunchmateLayerItem[];

export const LUNCHMATE_ITEMS_BY_ID = Object.fromEntries(
  LUNCHMATE_ITEMS.map(item => [item.id, item]),
) as Readonly<Partial<Record<string, LunchmateLayerItem>>>;

export const LUNCHMATE_ITEMS_BY_SLOT = {
  outfit: LUNCHMATE_ITEMS.filter(item => item.slot === 'outfit'),
  headwear: LUNCHMATE_ITEMS.filter(item => item.slot === 'headwear'),
  eyewear: LUNCHMATE_ITEMS.filter(item => item.slot === 'eyewear'),
  bag: LUNCHMATE_ITEMS.filter(item => item.slot === 'bag'),
} satisfies Readonly<Record<LunchmateSlot, readonly LunchmateLayerItem[]>>;

export const LUNCHMATE_STARTER_ITEM_IDS = [
  'outfit_hoodie_coral',
  'headwear_beret_coral',
  'eyewear_round_black',
  'bag_backpack_green',
] as const;

export const EMPTY_LUNCHMATE_LOADOUT: Readonly<LunchmateLoadout> = Object.freeze({
  outfitId: null,
  headwearId: null,
  eyewearId: null,
  bagId: null,
});

/** Phase 2B의 Room 합성 확인 전용 fixture. 저장 상태와 연결하지 않는다. */
export const LAYER_PREVIEW_LOADOUT: Readonly<LunchmateLoadout> = Object.freeze({
  outfitId: 'outfit_hoodie_coral',
  headwearId: 'headwear_beret_coral',
  eyewearId: 'eyewear_round_black',
  bagId: 'bag_backpack_green',
});

export type LunchmateAccessoryLayerName =
  | 'bag-back'
  | 'outfit-back'
  | 'outfit-front'
  | 'bag-front'
  | 'eyewear'
  | 'headwear';

export type LunchmateResolvedLayer =
  | { layerName: 'base' }
  | { layerName: LunchmateAccessoryLayerName; source: LunchmateAssetSource };

export const LUNCHMATE_LAYER_ORDER = [
  'bag-back',
  'outfit-back',
  'base',
  'outfit-front',
  'bag-front',
  'eyewear',
  'headwear',
] as const;

function resolveLoadoutItem(
  itemId: string | null,
  expectedSlot: LunchmateSlot,
): LunchmateLayerItem | undefined {
  if (!itemId) return undefined;
  const item = LUNCHMATE_ITEMS_BY_ID[itemId];
  return item?.slot === expectedSlot ? item : undefined;
}

export function resolveLunchmateLayerSource(
  part: LunchmateLayerPart | undefined,
  visualState: LunchmateStateAssetKey,
): LunchmateAssetSource | undefined {
  if (!part) return undefined;
  return part.stateOverrides?.[visualState] ?? part.default;
}

export function resolveLunchmateRenderLayers(
  loadout: LunchmateLoadout,
  visualState: LunchmateStateAssetKey,
): LunchmateResolvedLayer[] {
  const outfit = resolveLoadoutItem(loadout.outfitId, 'outfit');
  const headwear = resolveLoadoutItem(loadout.headwearId, 'headwear');
  const eyewear = resolveLoadoutItem(loadout.eyewearId, 'eyewear');
  const bag = resolveLoadoutItem(loadout.bagId, 'bag');
  const layers: LunchmateResolvedLayer[] = [];

  const bagBack = resolveLunchmateLayerSource(bag?.back, visualState);
  const outfitBack = resolveLunchmateLayerSource(outfit?.back, visualState);
  const outfitFront = resolveLunchmateLayerSource(outfit?.front, visualState);
  const bagFront = resolveLunchmateLayerSource(bag?.front, visualState);
  const eyewearFront = resolveLunchmateLayerSource(eyewear?.front, visualState);
  const headwearFront = resolveLunchmateLayerSource(headwear?.front, visualState);

  if (bagBack) layers.push({ layerName: 'bag-back', source: bagBack });
  if (outfitBack) layers.push({ layerName: 'outfit-back', source: outfitBack });
  layers.push({ layerName: 'base' });
  if (outfitFront) layers.push({ layerName: 'outfit-front', source: outfitFront });
  if (bagFront) layers.push({ layerName: 'bag-front', source: bagFront });
  if (eyewearFront) layers.push({ layerName: 'eyewear', source: eyewearFront });
  if (headwearFront) layers.push({ layerName: 'headwear', source: headwearFront });

  return layers;
}
