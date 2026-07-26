import type { LunchmateAssetSource } from './lunchmateAssets';
import {
  LUNCHMATE_LAYER_ORDER,
  resolveLunchmateRenderLayers,
  type LunchmateAccessoryLayerName,
  type LunchmateResolvedLayer,
} from './lunchmateItems';
import type { LunchmateLoadout } from '../types/lunchmateCustomization';

/**
 * Pose-aware Lunchmate costume runtime contracts.
 *
 * This is a typed transcription of `placements.json` in
 * lunchmate-starter-costume-pilot-v3.zip. The source artwork is already
 * aligned on its fixed 360/720 canvases; do not add a compensating CSS scale
 * or translation here.
 */
export type LunchmateCostumePose =
  | 'front'
  | 'feeding'
  | 'sideLeft'
  | 'sideRight'
  | 'sitting'
  | 'emotion'
  | 'grabbed';

type DirectPose = 'front' | 'feeding' | 'sideLeft' | 'sitting';
type PoseReference = 'front' | 'sideLeft';

interface LunchmatePoseAssetEntry {
  behind?: string;
  body?: string;
  front?: string;
  translateX: 0;
  translateY: 0;
}

interface LunchmatePoseReuseEntry {
  reuse: 'front';
}

interface LunchmatePoseMirrorEntry {
  mirrorFrom: 'sideLeft';
}

type LunchmatePoseEntry =
  | LunchmatePoseAssetEntry
  | LunchmatePoseReuseEntry
  | LunchmatePoseMirrorEntry;

interface LunchmateStarterCostumePoseItem {
  front: LunchmatePoseAssetEntry;
  feeding: LunchmatePoseAssetEntry;
  sideLeft: LunchmatePoseAssetEntry;
  sitting: LunchmatePoseAssetEntry;
  emotion: LunchmatePoseReuseEntry;
  grabbed: LunchmatePoseReuseEntry;
  sideRight: LunchmatePoseMirrorEntry;
}

export interface LunchmatePoseResolvedLayer {
  layerName: LunchmateAccessoryLayerName;
  source: LunchmateAssetSource;
  costumeId: string;
  pose: DirectPose;
  mirrored: boolean;
  translateX: 0;
  translateY: 0;
}

const STARTER_PILOT_ROOT = '/assets/lunchmate/costumes/starter-pilot-v3';
const STARTER_PILOT_ASSET_REVISION = 'side-hoodie-rollback-v5';
const COLLECTION_WAVE1_ROOT = '/assets/lunchmate/costumes/collection-wave1-v1';
// Wave 1 retains its established runtime root and item IDs. Its current
// revision also clears the blue sailor body overlay's leaked face pixels.
const COLLECTION_WAVE1_ASSET_REVISION = 'collection-repaired-v2';
const COLLECTION_WAVE2_ROOT = '/assets/lunchmate/costumes/collection-wave2-v1';
const COLLECTION_WAVE2_ASSET_REVISION = 'collection-repaired-v2';
const COLLECTION_WAVE3_ROOT = '/assets/lunchmate/costumes/collection-wave3-v2';
const COLLECTION_WAVE3_ASSET_REVISION = 'collection-wave3-v2';
const EYEWEAR_COLLECTION_WAVE1_ROOT = '/assets/lunchmate/costumes/eyewear-collection-wave1-v1';
const EYEWEAR_COLLECTION_WAVE1_ASSET_REVISION = 'eyewear-collection-wave1-v1';

function costumeCollectionAssetSource(
  root: string,
  revision: string,
  relativePath: string,
): LunchmateAssetSource {
  const revisionQuery = `?v=${revision}`;
  const oneX = `${root}/1x/${relativePath}${revisionQuery}`;
  const twoX = `${root}/2x/${relativePath.replace(/\.png$/, '@2x.png')}${revisionQuery}`;

  return {
    src: oneX,
    srcSet: `${oneX} 1x, ${twoX} 2x`,
  };
}

function starterPilotAssetSource(relativePath: string): LunchmateAssetSource {
  return costumeCollectionAssetSource(
    STARTER_PILOT_ROOT,
    STARTER_PILOT_ASSET_REVISION,
    relativePath,
  );
}

function collectionWave1AssetSource(relativePath: string): LunchmateAssetSource {
  return costumeCollectionAssetSource(
    COLLECTION_WAVE1_ROOT,
    COLLECTION_WAVE1_ASSET_REVISION,
    relativePath,
  );
}

function collectionWave2AssetSource(relativePath: string): LunchmateAssetSource {
  return costumeCollectionAssetSource(
    COLLECTION_WAVE2_ROOT,
    COLLECTION_WAVE2_ASSET_REVISION,
    relativePath,
  );
}

function collectionWave3AssetSource(relativePath: string): LunchmateAssetSource {
  return costumeCollectionAssetSource(
    COLLECTION_WAVE3_ROOT,
    COLLECTION_WAVE3_ASSET_REVISION,
    relativePath,
  );
}

function eyewearCollectionWave1AssetSource(relativePath: string): LunchmateAssetSource {
  return costumeCollectionAssetSource(
    EYEWEAR_COLLECTION_WAVE1_ROOT,
    EYEWEAR_COLLECTION_WAVE1_ASSET_REVISION,
    relativePath,
  );
}

/** The v3 ZIP's layer order; it intentionally matches the legacy renderer. */
export const LUNCHMATE_STARTER_PILOT_LAYER_ORDER = [
  'bag-back',
  'outfit-back',
  'base',
  'outfit-front',
  'bag-front',
  'eyewear',
  'headwear',
] as const;

/**
 * Do not replace this manifest with prior pilot translations. Every direct
 * pose entry carries the v3 JSON's literal zero placement values.
 */
export const LUNCHMATE_STARTER_COSTUME_POSE_MANIFEST = {
  version: 3,
  referenceCanvas: 720,
  items: {
    outfit_hoodie_coral: {
      front: {
        behind: 'outfit_hoodie_coral/front-behind.png',
        body: 'outfit_hoodie_coral/front-body.png',
        translateX: 0,
        translateY: 0,
      },
      // The feeding chicken keeps its utensils and hands outside the torso.
      // Reusing the aligned front hoodie body avoids the long sleeve-shaped
      // feeding overlay that looked clipped at compact Profile size.
      feeding: {
        behind: 'outfit_hoodie_coral/front-behind.png',
        body: 'outfit_hoodie_coral/front-body.png',
        translateX: 0,
        translateY: 0,
      },
      sideLeft: {
        behind: 'outfit_hoodie_coral/side-left-behind.png',
        body: 'outfit_hoodie_coral/side-left-body.png',
        translateX: 0,
        translateY: 0,
      },
      sitting: {
        behind: 'outfit_hoodie_coral/sitting-behind.png',
        body: 'outfit_hoodie_coral/sitting-body.png',
        translateX: 0,
        translateY: 0,
      },
      emotion: { reuse: 'front' },
      grabbed: { reuse: 'front' },
      sideRight: { mirrorFrom: 'sideLeft' },
    },
    bag_backpack_green: {
      front: {
        behind: 'bag_backpack_green/front-behind.png',
        front: 'bag_backpack_green/front-front.png',
        translateX: 0,
        translateY: 0,
      },
      feeding: {
        behind: 'bag_backpack_green/feeding-behind.png',
        front: 'bag_backpack_green/feeding-front.png',
        translateX: 0,
        translateY: 0,
      },
      sideLeft: {
        behind: 'bag_backpack_green/side-left-behind.png',
        front: 'bag_backpack_green/side-left-front.png',
        translateX: 0,
        translateY: 0,
      },
      sitting: {
        behind: 'bag_backpack_green/sitting-behind.png',
        front: 'bag_backpack_green/sitting-front.png',
        translateX: 0,
        translateY: 0,
      },
      emotion: { reuse: 'front' },
      grabbed: { reuse: 'front' },
      sideRight: { mirrorFrom: 'sideLeft' },
    },
    eyewear_round_black: {
      front: {
        front: 'eyewear_round_black/front.png',
        translateX: 0,
        translateY: 0,
      },
      feeding: {
        front: 'eyewear_round_black/feeding.png',
        translateX: 0,
        translateY: 0,
      },
      sideLeft: {
        front: 'eyewear_round_black/side-left.png',
        translateX: 0,
        translateY: 0,
      },
      sitting: {
        front: 'eyewear_round_black/sitting.png',
        translateX: 0,
        translateY: 0,
      },
      emotion: { reuse: 'front' },
      grabbed: { reuse: 'front' },
      sideRight: { mirrorFrom: 'sideLeft' },
    },
    headwear_beret_coral: {
      front: {
        front: 'headwear_beret_coral/front.png',
        translateX: 0,
        translateY: 0,
      },
      feeding: {
        front: 'headwear_beret_coral/feeding.png',
        translateX: 0,
        translateY: 0,
      },
      sideLeft: {
        front: 'headwear_beret_coral/side-left.png',
        translateX: 0,
        translateY: 0,
      },
      sitting: {
        front: 'headwear_beret_coral/sitting.png',
        translateX: 0,
        translateY: 0,
      },
      emotion: { reuse: 'front' },
      grabbed: { reuse: 'front' },
      sideRight: { mirrorFrom: 'sideLeft' },
    },
  },
} as const satisfies {
  version: number;
  referenceCanvas: number;
  items: Record<string, LunchmateStarterCostumePoseItem>;
};

export const LUNCHMATE_STARTER_PILOT_ITEM_IDS = Object.freeze(
  Object.keys(LUNCHMATE_STARTER_COSTUME_POSE_MANIFEST.items),
) as readonly (keyof typeof LUNCHMATE_STARTER_COSTUME_POSE_MANIFEST.items)[];

/**
 * Wave 1 is an independent collection. Its fixed 360/720 artwork and zero
 * translations are a direct transcription of collection-repaired-v2's
 * placements.json; do not reuse legacy layer coordinates for these items.
 */
export const LUNCHMATE_COSTUME_COLLECTION_WAVE1_POSE_MANIFEST = {
  version: 2,
  referenceCanvas: 720,
  items: {
    outfit_strawberry_picnic: {
      front: { behind: 'outfit_strawberry_picnic/front-behind.png', body: 'outfit_strawberry_picnic/front-body.png', translateX: 0, translateY: 0 },
      feeding: { behind: 'outfit_strawberry_picnic/feeding-behind.png', body: 'outfit_strawberry_picnic/feeding-body.png', translateX: 0, translateY: 0 },
      sideLeft: { behind: 'outfit_strawberry_picnic/side-left-behind.png', body: 'outfit_strawberry_picnic/side-left-body.png', translateX: 0, translateY: 0 },
      sitting: { behind: 'outfit_strawberry_picnic/sitting-behind.png', body: 'outfit_strawberry_picnic/sitting-body.png', translateX: 0, translateY: 0 },
      emotion: { reuse: 'front' },
      grabbed: { reuse: 'front' },
      sideRight: { mirrorFrom: 'sideLeft' },
    },
    headwear_gingham_bow: {
      front: { front: 'headwear_gingham_bow/front.png', translateX: 0, translateY: 0 },
      feeding: { front: 'headwear_gingham_bow/feeding.png', translateX: 0, translateY: 0 },
      sideLeft: { front: 'headwear_gingham_bow/side-left.png', translateX: 0, translateY: 0 },
      sitting: { front: 'headwear_gingham_bow/sitting.png', translateX: 0, translateY: 0 },
      emotion: { reuse: 'front' },
      grabbed: { reuse: 'front' },
      sideRight: { mirrorFrom: 'sideLeft' },
    },
    bag_picnic_basket: {
      front: { behind: 'bag_picnic_basket/front-behind.png', front: 'bag_picnic_basket/front-front.png', translateX: 0, translateY: 0 },
      feeding: { behind: 'bag_picnic_basket/feeding-behind.png', front: 'bag_picnic_basket/feeding-front.png', translateX: 0, translateY: 0 },
      sideLeft: { behind: 'bag_picnic_basket/side-left-behind.png', front: 'bag_picnic_basket/side-left-front.png', translateX: 0, translateY: 0 },
      sitting: { behind: 'bag_picnic_basket/sitting-behind.png', front: 'bag_picnic_basket/sitting-front.png', translateX: 0, translateY: 0 },
      emotion: { reuse: 'front' },
      grabbed: { reuse: 'front' },
      sideRight: { mirrorFrom: 'sideLeft' },
    },
    outfit_sailor_blue: {
      front: { behind: 'outfit_sailor_blue/front-behind.png', body: 'outfit_sailor_blue/front-body.png', translateX: 0, translateY: 0 },
      feeding: { behind: 'outfit_sailor_blue/feeding-behind.png', body: 'outfit_sailor_blue/feeding-body.png', translateX: 0, translateY: 0 },
      sideLeft: { behind: 'outfit_sailor_blue/side-left-behind.png', body: 'outfit_sailor_blue/side-left-body.png', translateX: 0, translateY: 0 },
      sitting: { behind: 'outfit_sailor_blue/sitting-behind.png', body: 'outfit_sailor_blue/sitting-body.png', translateX: 0, translateY: 0 },
      emotion: { reuse: 'front' },
      grabbed: { reuse: 'front' },
      sideRight: { mirrorFrom: 'sideLeft' },
    },
    headwear_sailor_cap_navy: {
      front: { front: 'headwear_sailor_cap_navy/front.png', translateX: 0, translateY: 0 },
      feeding: { front: 'headwear_sailor_cap_navy/feeding.png', translateX: 0, translateY: 0 },
      sideLeft: { front: 'headwear_sailor_cap_navy/side-left.png', translateX: 0, translateY: 0 },
      sitting: { front: 'headwear_sailor_cap_navy/sitting.png', translateX: 0, translateY: 0 },
      emotion: { reuse: 'front' },
      grabbed: { reuse: 'front' },
      sideRight: { mirrorFrom: 'sideLeft' },
    },
    bag_anchor_pouch_navy: {
      front: { behind: 'bag_anchor_pouch_navy/front-behind.png', front: 'bag_anchor_pouch_navy/front-front.png', translateX: 0, translateY: 0 },
      feeding: { behind: 'bag_anchor_pouch_navy/feeding-behind.png', front: 'bag_anchor_pouch_navy/feeding-front.png', translateX: 0, translateY: 0 },
      sideLeft: { behind: 'bag_anchor_pouch_navy/side-left-behind.png', front: 'bag_anchor_pouch_navy/side-left-front.png', translateX: 0, translateY: 0 },
      sitting: { behind: 'bag_anchor_pouch_navy/sitting-behind.png', front: 'bag_anchor_pouch_navy/sitting-front.png', translateX: 0, translateY: 0 },
      emotion: { reuse: 'front' },
      grabbed: { reuse: 'front' },
      sideRight: { mirrorFrom: 'sideLeft' },
    },
  },
} as const satisfies {
  version: number;
  referenceCanvas: number;
  items: Record<string, LunchmateStarterCostumePoseItem>;
};

export const LUNCHMATE_COLLECTION_WAVE1_ITEM_IDS = Object.freeze(
  Object.keys(LUNCHMATE_COSTUME_COLLECTION_WAVE1_POSE_MANIFEST.items),
) as readonly (keyof typeof LUNCHMATE_COSTUME_COLLECTION_WAVE1_POSE_MANIFEST.items)[];

function collectionOutfit(itemId: string): LunchmateStarterCostumePoseItem {
  return {
    front: { behind: `${itemId}/front-behind.png`, body: `${itemId}/front-body.png`, translateX: 0, translateY: 0 },
    feeding: { behind: `${itemId}/feeding-behind.png`, body: `${itemId}/feeding-body.png`, translateX: 0, translateY: 0 },
    sideLeft: { behind: `${itemId}/side-left-behind.png`, body: `${itemId}/side-left-body.png`, translateX: 0, translateY: 0 },
    sitting: { behind: `${itemId}/sitting-behind.png`, body: `${itemId}/sitting-body.png`, translateX: 0, translateY: 0 },
    emotion: { reuse: 'front' },
    grabbed: { reuse: 'front' },
    sideRight: { mirrorFrom: 'sideLeft' },
  };
}

function collectionHeadwear(itemId: string): LunchmateStarterCostumePoseItem {
  return {
    front: { front: `${itemId}/front.png`, translateX: 0, translateY: 0 },
    feeding: { front: `${itemId}/feeding.png`, translateX: 0, translateY: 0 },
    sideLeft: { front: `${itemId}/side-left.png`, translateX: 0, translateY: 0 },
    sitting: { front: `${itemId}/sitting.png`, translateX: 0, translateY: 0 },
    emotion: { reuse: 'front' },
    grabbed: { reuse: 'front' },
    sideRight: { mirrorFrom: 'sideLeft' },
  };
}

function collectionEyewear(itemId: string): LunchmateStarterCostumePoseItem {
  return {
    front: { front: `${itemId}/front.png`, translateX: 0, translateY: 0 },
    feeding: { front: `${itemId}/feeding.png`, translateX: 0, translateY: 0 },
    sideLeft: { front: `${itemId}/side-left.png`, translateX: 0, translateY: 0 },
    sitting: { front: `${itemId}/sitting.png`, translateX: 0, translateY: 0 },
    emotion: { reuse: 'front' },
    grabbed: { reuse: 'front' },
    sideRight: { mirrorFrom: 'sideLeft' },
  };
}

function collectionBag(itemId: string): LunchmateStarterCostumePoseItem {
  return {
    front: { behind: `${itemId}/front-behind.png`, front: `${itemId}/front-front.png`, translateX: 0, translateY: 0 },
    feeding: { behind: `${itemId}/feeding-behind.png`, front: `${itemId}/feeding-front.png`, translateX: 0, translateY: 0 },
    sideLeft: { behind: `${itemId}/side-left-behind.png`, front: `${itemId}/side-left-front.png`, translateX: 0, translateY: 0 },
    sitting: { behind: `${itemId}/sitting-behind.png`, front: `${itemId}/sitting-front.png`, translateX: 0, translateY: 0 },
    emotion: { reuse: 'front' },
    grabbed: { reuse: 'front' },
    sideRight: { mirrorFrom: 'sideLeft' },
  };
}

/**
 * Wave 2 keeps the ZIP's pose families and fixed canvas placement intact.
 * Raincoat intentionally uses its established manifest ID so saved loadouts
 * resolve to its new pose-aware artwork without any data migration.
 */
export const LUNCHMATE_COSTUME_COLLECTION_WAVE2_POSE_MANIFEST = {
  version: 2,
  referenceCanvas: 720,
  items: {
    outfit_bakery_apron_cream: collectionOutfit('outfit_bakery_apron_cream'),
    headwear_chef_puff_cream: collectionHeadwear('headwear_chef_puff_cream'),
    bag_baguette_tote: collectionBag('bag_baguette_tote'),
    outfit_raincoat_yellow: collectionOutfit('outfit_raincoat_yellow'),
    headwear_frog_bucket_hat: collectionHeadwear('headwear_frog_bucket_hat'),
    bag_cloud_pouch: collectionBag('bag_cloud_pouch'),
    outfit_cardigan_mint: collectionOutfit('outfit_cardigan_mint'),
    headwear_bow_cream_back: collectionHeadwear('headwear_bow_cream_back'),
    bag_acorn_satchel: collectionBag('bag_acorn_satchel'),
    outfit_denim_overalls: collectionOutfit('outfit_denim_overalls'),
    headwear_bow_side_navy: collectionHeadwear('headwear_bow_side_navy'),
    bag_camera_crossbody: collectionBag('bag_camera_crossbody'),
    outfit_pajamas_lilac: collectionOutfit('outfit_pajamas_lilac'),
    headwear_nightcap_lilac: collectionHeadwear('headwear_nightcap_lilac'),
    bag_star_pouch: collectionBag('bag_star_pouch'),
    outfit_varsity_cherry_coral: collectionOutfit('outfit_varsity_cherry_coral'),
    headwear_bow_pink_loop: collectionHeadwear('headwear_bow_pink_loop'),
    bag_cherry_crossbody: collectionBag('bag_cherry_crossbody'),
  },
} as const satisfies {
  version: number;
  referenceCanvas: number;
  items: Record<string, LunchmateStarterCostumePoseItem>;
};

export const LUNCHMATE_COLLECTION_WAVE2_ITEM_IDS = Object.freeze(
  Object.keys(LUNCHMATE_COSTUME_COLLECTION_WAVE2_POSE_MANIFEST.items),
) as readonly (keyof typeof LUNCHMATE_COSTUME_COLLECTION_WAVE2_POSE_MANIFEST.items)[];

/** Wave 3 v2 uses independent slot artwork on fixed 360/720 canvases. */
export const LUNCHMATE_COSTUME_COLLECTION_WAVE3_POSE_MANIFEST = {
  version: 2,
  referenceCanvas: 720,
  items: {
    outfit_space_explorer_cream: collectionOutfit('outfit_space_explorer_cream'),
    headwear_space_hood_periwinkle: collectionHeadwear('headwear_space_hood_periwinkle'),
    bag_moon_pouch_honey: collectionBag('bag_moon_pouch_honey'),
    outfit_artist_smock_rose: collectionOutfit('outfit_artist_smock_rose'),
    headwear_beret_teal: collectionHeadwear('headwear_beret_teal'),
    bag_palette_crossbody: collectionBag('bag_palette_crossbody'),
    outfit_garden_overalls_sage: collectionOutfit('outfit_garden_overalls_sage'),
    headwear_tulip_headband_coral: collectionHeadwear('headwear_tulip_headband_coral'),
    bag_watering_can_terracotta: collectionBag('bag_watering_can_terracotta'),
    outfit_detective_cape_cocoa: collectionOutfit('outfit_detective_cape_cocoa'),
    headwear_detective_cap_forest: collectionHeadwear('headwear_detective_cap_forest'),
    bag_magnifying_satchel: collectionBag('bag_magnifying_satchel'),
  },
} as const satisfies {
  version: number;
  referenceCanvas: number;
  items: Record<string, LunchmateStarterCostumePoseItem>;
};

export const LUNCHMATE_COLLECTION_WAVE3_ITEM_IDS = Object.freeze(
  Object.keys(LUNCHMATE_COSTUME_COLLECTION_WAVE3_POSE_MANIFEST.items),
) as readonly (keyof typeof LUNCHMATE_COSTUME_COLLECTION_WAVE3_POSE_MANIFEST.items)[];

/** Eyewear Wave 1 layers render after the face and before headwear. */
export const LUNCHMATE_EYEWEAR_COLLECTION_WAVE1_POSE_MANIFEST = {
  version: 1,
  referenceCanvas: 720,
  items: {
    eyewear_sunglasses_cocoa: collectionEyewear('eyewear_sunglasses_cocoa'),
    eyewear_heart_coral: collectionEyewear('eyewear_heart_coral'),
    eyewear_star_honey: collectionEyewear('eyewear_star_honey'),
    eyewear_cat_eye_lilac: collectionEyewear('eyewear_cat_eye_lilac'),
  },
} as const satisfies {
  version: number;
  referenceCanvas: number;
  items: Record<string, LunchmateStarterCostumePoseItem>;
};

export const LUNCHMATE_EYEWEAR_COLLECTION_WAVE1_ITEM_IDS = Object.freeze(
  Object.keys(LUNCHMATE_EYEWEAR_COLLECTION_WAVE1_POSE_MANIFEST.items),
) as readonly (keyof typeof LUNCHMATE_EYEWEAR_COLLECTION_WAVE1_POSE_MANIFEST.items)[];

type PoseAwareCostumeSlot = 'outfit' | 'headwear' | 'eyewear' | 'bag';

const STARTER_PILOT_ITEM_SLOTS = {
  outfit_hoodie_coral: 'outfit',
  bag_backpack_green: 'bag',
  eyewear_round_black: 'eyewear',
  headwear_beret_coral: 'headwear',
} as const satisfies Record<keyof typeof LUNCHMATE_STARTER_COSTUME_POSE_MANIFEST.items, PoseAwareCostumeSlot>;

const COLLECTION_WAVE1_ITEM_SLOTS = {
  outfit_strawberry_picnic: 'outfit',
  headwear_gingham_bow: 'headwear',
  bag_picnic_basket: 'bag',
  outfit_sailor_blue: 'outfit',
  headwear_sailor_cap_navy: 'headwear',
  bag_anchor_pouch_navy: 'bag',
} as const satisfies Record<keyof typeof LUNCHMATE_COSTUME_COLLECTION_WAVE1_POSE_MANIFEST.items, PoseAwareCostumeSlot>;

const COLLECTION_WAVE2_ITEM_SLOTS = {
  outfit_bakery_apron_cream: 'outfit',
  headwear_chef_puff_cream: 'headwear',
  bag_baguette_tote: 'bag',
  outfit_raincoat_yellow: 'outfit',
  headwear_frog_bucket_hat: 'headwear',
  bag_cloud_pouch: 'bag',
  outfit_cardigan_mint: 'outfit',
  headwear_bow_cream_back: 'headwear',
  bag_acorn_satchel: 'bag',
  outfit_denim_overalls: 'outfit',
  headwear_bow_side_navy: 'headwear',
  bag_camera_crossbody: 'bag',
  outfit_pajamas_lilac: 'outfit',
  headwear_nightcap_lilac: 'headwear',
  bag_star_pouch: 'bag',
  outfit_varsity_cherry_coral: 'outfit',
  headwear_bow_pink_loop: 'headwear',
  bag_cherry_crossbody: 'bag',
} as const satisfies Record<keyof typeof LUNCHMATE_COSTUME_COLLECTION_WAVE2_POSE_MANIFEST.items, PoseAwareCostumeSlot>;

const COLLECTION_WAVE3_ITEM_SLOTS = {
  outfit_space_explorer_cream: 'outfit',
  headwear_space_hood_periwinkle: 'headwear',
  bag_moon_pouch_honey: 'bag',
  outfit_artist_smock_rose: 'outfit',
  headwear_beret_teal: 'headwear',
  bag_palette_crossbody: 'bag',
  outfit_garden_overalls_sage: 'outfit',
  headwear_tulip_headband_coral: 'headwear',
  bag_watering_can_terracotta: 'bag',
  outfit_detective_cape_cocoa: 'outfit',
  headwear_detective_cap_forest: 'headwear',
  bag_magnifying_satchel: 'bag',
} as const satisfies Record<keyof typeof LUNCHMATE_COSTUME_COLLECTION_WAVE3_POSE_MANIFEST.items, PoseAwareCostumeSlot>;

const EYEWEAR_COLLECTION_WAVE1_ITEM_SLOTS = {
  eyewear_sunglasses_cocoa: 'eyewear',
  eyewear_heart_coral: 'eyewear',
  eyewear_star_honey: 'eyewear',
  eyewear_cat_eye_lilac: 'eyewear',
} as const satisfies Record<keyof typeof LUNCHMATE_EYEWEAR_COLLECTION_WAVE1_POSE_MANIFEST.items, PoseAwareCostumeSlot>;

function isPoseAssetEntry(entry: LunchmatePoseEntry): entry is LunchmatePoseAssetEntry {
  return 'translateX' in entry;
}

function resolveDirectPose(
  item: LunchmateStarterCostumePoseItem,
  requestedPose: LunchmateCostumePose,
): { pose: DirectPose; mirrored: boolean; entry: LunchmatePoseAssetEntry } {
  let pose: LunchmateCostumePose | PoseReference = requestedPose;
  let mirrored = false;

  while (true) {
    const entry = item[pose as keyof LunchmateStarterCostumePoseItem] as LunchmatePoseEntry;
    if (isPoseAssetEntry(entry)) {
      return { pose: pose as DirectPose, mirrored, entry };
    }

    if ('reuse' in entry) {
      pose = entry.reuse;
      continue;
    }

    mirrored = true;
    pose = entry.mirrorFrom;
  }
}

function resolvePoseAwareCostume(
  costumeId: string,
): {
  item: LunchmateStarterCostumePoseItem;
  slot: PoseAwareCostumeSlot;
  assetSource: (relativePath: string) => LunchmateAssetSource;
} | null {
  const starterItem = LUNCHMATE_STARTER_COSTUME_POSE_MANIFEST.items[
    costumeId as keyof typeof LUNCHMATE_STARTER_COSTUME_POSE_MANIFEST.items
  ];
  if (starterItem) {
    return {
      item: starterItem,
      slot: STARTER_PILOT_ITEM_SLOTS[costumeId as keyof typeof STARTER_PILOT_ITEM_SLOTS],
      assetSource: starterPilotAssetSource,
    };
  }

  const waveOneItem = LUNCHMATE_COSTUME_COLLECTION_WAVE1_POSE_MANIFEST.items[
    costumeId as keyof typeof LUNCHMATE_COSTUME_COLLECTION_WAVE1_POSE_MANIFEST.items
  ];
  if (waveOneItem) {
    return {
      item: waveOneItem,
      slot: COLLECTION_WAVE1_ITEM_SLOTS[costumeId as keyof typeof COLLECTION_WAVE1_ITEM_SLOTS],
      assetSource: collectionWave1AssetSource,
    };
  }

  const waveTwoItem = LUNCHMATE_COSTUME_COLLECTION_WAVE2_POSE_MANIFEST.items[
    costumeId as keyof typeof LUNCHMATE_COSTUME_COLLECTION_WAVE2_POSE_MANIFEST.items
  ];
  if (waveTwoItem) {
    return {
      item: waveTwoItem,
      slot: COLLECTION_WAVE2_ITEM_SLOTS[costumeId as keyof typeof COLLECTION_WAVE2_ITEM_SLOTS],
      assetSource: collectionWave2AssetSource,
    };
  }

  const waveThreeItem = LUNCHMATE_COSTUME_COLLECTION_WAVE3_POSE_MANIFEST.items[
    costumeId as keyof typeof LUNCHMATE_COSTUME_COLLECTION_WAVE3_POSE_MANIFEST.items
  ];
  if (waveThreeItem) {
    return {
      item: waveThreeItem,
      slot: COLLECTION_WAVE3_ITEM_SLOTS[costumeId as keyof typeof COLLECTION_WAVE3_ITEM_SLOTS],
      assetSource: collectionWave3AssetSource,
    };
  }

  const eyewearItem = LUNCHMATE_EYEWEAR_COLLECTION_WAVE1_POSE_MANIFEST.items[
    costumeId as keyof typeof LUNCHMATE_EYEWEAR_COLLECTION_WAVE1_POSE_MANIFEST.items
  ];
  if (!eyewearItem) return null;

  return {
    item: eyewearItem,
    slot: EYEWEAR_COLLECTION_WAVE1_ITEM_SLOTS[costumeId as keyof typeof EYEWEAR_COLLECTION_WAVE1_ITEM_SLOTS],
    assetSource: eyewearCollectionWave1AssetSource,
  };
}

function layersForEntry(
  costumeId: string,
  slot: PoseAwareCostumeSlot,
  pose: DirectPose,
  mirrored: boolean,
  entry: LunchmatePoseAssetEntry,
  assetSource: (relativePath: string) => LunchmateAssetSource,
): LunchmatePoseResolvedLayer[] {
  const layerMap: Array<[LunchmateAccessoryLayerName, string | undefined]> = slot === 'outfit'
    ? [
      ['outfit-back', entry.behind],
      ['outfit-front', entry.body],
    ]
    : slot === 'bag'
      ? [
        ['bag-back', entry.behind],
        ['bag-front', entry.front],
      ]
      : slot === 'eyewear'
        ? [['eyewear', entry.front]]
        : [['headwear', entry.front]];

  return layerMap.flatMap(([layerName, relativePath]) => {
    if (!relativePath) return [];
    return [{
      layerName,
      source: assetSource(relativePath),
      costumeId,
      pose,
      mirrored,
      translateX: entry.translateX,
      translateY: entry.translateY,
    }];
  });
}

/** Resolves one pose-aware collection item; unknown IDs intentionally fall back to legacy. */
export function resolveLunchmateStarterCostumePoseLayers(
  costumeId: string | null,
  pose: LunchmateCostumePose,
): LunchmatePoseResolvedLayer[] {
  if (!costumeId) return [];

  const costume = resolvePoseAwareCostume(costumeId);
  if (!costume) return [];

  const resolved = resolveDirectPose(costume.item, pose);
  return layersForEntry(
    costumeId,
    costume.slot,
    resolved.pose,
    resolved.mirrored,
    resolved.entry,
    costume.assetSource,
  );
}

/** Maps the existing chicken base sprite selection to the v3 pose families. */
export function resolveLunchmateChickenCostumePose(
  chickenAssetKey: string,
): LunchmateCostumePose {
  if (chickenAssetKey === 'feeding') return 'feeding';
  if (chickenAssetKey === 'sitting') return 'sitting';
  if (chickenAssetKey === 'grabbed') return 'grabbed';
  if (chickenAssetKey === 'happy'
    || chickenAssetKey === 'surprised'
    || chickenAssetKey === 'sleepy'
    || chickenAssetKey === 'crying') {
    return 'emotion';
  }
  if (chickenAssetKey === 'side-walk-left-1' || chickenAssetKey === 'side-walk-left-2') {
    return 'sideLeft';
  }
  if (chickenAssetKey === 'side-walk-right-1' || chickenAssetKey === 'side-walk-right-2') {
    return 'sideRight';
  }
  return 'front';
}

function poseAwareLayersForLoadout(
  loadout: LunchmateLoadout,
  pose: LunchmateCostumePose,
): LunchmatePoseResolvedLayer[] {
  return [
    ...resolveLunchmateStarterCostumePoseLayers(loadout.outfitId, pose),
    ...resolveLunchmateStarterCostumePoseLayers(loadout.headwearId, pose),
    ...resolveLunchmateStarterCostumePoseLayers(loadout.eyewearId, pose),
    ...resolveLunchmateStarterCostumePoseLayers(loadout.bagId, pose),
  ];
}

/**
 * Keeps legacy assets for every non-pose-aware item, replacing only the v3
 * Starter, Wave 1, and Wave 2 slots. This deliberately does not mutate or normalize
 * the loadout.
 */
export function resolveLunchmateChickenCostumeRenderLayers(
  loadout: LunchmateLoadout,
  pose: LunchmateCostumePose,
): LunchmatePoseResolvedLayer[] {
  const poseAwareLayers = poseAwareLayersForLoadout(loadout, pose);
  const poseAwareLayerByName = new Map(poseAwareLayers.map(layer => [layer.layerName, layer]));
  const legacyLayerByName = new Map(
    resolveLunchmateRenderLayers(loadout, 'default')
      .filter((layer): layer is Exclude<LunchmateResolvedLayer, { layerName: 'base' }> => (
        layer.layerName !== 'base'
      ))
      .map(layer => [layer.layerName, layer]),
  );

  return LUNCHMATE_LAYER_ORDER.flatMap((layerName) => {
    if (layerName === 'base') return [];
    const poseAwareLayer = poseAwareLayerByName.get(layerName);
    if (poseAwareLayer) return [poseAwareLayer];

    const legacyLayer = legacyLayerByName.get(layerName);
    if (!legacyLayer) return [];
    return [{
      ...legacyLayer,
      costumeId: 'legacy',
      pose: 'front' as const,
      mirrored: false,
      translateX: 0,
      translateY: 0,
    }];
  });
}
