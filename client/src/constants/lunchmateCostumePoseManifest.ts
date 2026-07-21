import type { LunchmateAssetSource } from './lunchmateAssets';
import {
  LUNCHMATE_LAYER_ORDER,
  resolveLunchmateRenderLayers,
  type LunchmateAccessoryLayerName,
  type LunchmateResolvedLayer,
} from './lunchmateItems';
import type { LunchmateLoadout } from '../types/lunchmateCustomization';

/**
 * Starter Costume Pose Pilot v3 runtime contract.
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

function starterPilotAssetSource(relativePath: string): LunchmateAssetSource {
  const revisionQuery = `?v=${STARTER_PILOT_ASSET_REVISION}`;
  const oneX = `${STARTER_PILOT_ROOT}/1x/${relativePath}${revisionQuery}`;
  const twoX = `${STARTER_PILOT_ROOT}/2x/${relativePath.replace(/\.png$/, '@2x.png')}${revisionQuery}`;

  return {
    src: oneX,
    srcSet: `${oneX} 1x, ${twoX} 2x`,
  };
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
      feeding: {
        behind: 'outfit_hoodie_coral/feeding-behind.png',
        body: 'outfit_hoodie_coral/feeding-body.png',
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

function layersForEntry(
  costumeId: string,
  pose: DirectPose,
  mirrored: boolean,
  entry: LunchmatePoseAssetEntry,
): LunchmatePoseResolvedLayer[] {
  const layerMap: Array<[LunchmateAccessoryLayerName, string | undefined]> = costumeId === 'outfit_hoodie_coral'
    ? [
      ['outfit-back', entry.behind],
      ['outfit-front', entry.body],
    ]
    : costumeId === 'bag_backpack_green'
      ? [
        ['bag-back', entry.behind],
        ['bag-front', entry.front],
      ]
      : costumeId === 'eyewear_round_black'
        ? [['eyewear', entry.front]]
        : [['headwear', entry.front]];

  return layerMap.flatMap(([layerName, relativePath]) => {
    if (!relativePath) return [];
    return [{
      layerName,
      source: starterPilotAssetSource(relativePath),
      costumeId,
      pose,
      mirrored,
      translateX: entry.translateX,
      translateY: entry.translateY,
    }];
  });
}

/** Resolves one v3 Starter item; unknown IDs intentionally fall back to legacy. */
export function resolveLunchmateStarterCostumePoseLayers(
  costumeId: string | null,
  pose: LunchmateCostumePose,
): LunchmatePoseResolvedLayer[] {
  if (!costumeId) return [];

  const item = LUNCHMATE_STARTER_COSTUME_POSE_MANIFEST.items[
    costumeId as keyof typeof LUNCHMATE_STARTER_COSTUME_POSE_MANIFEST.items
  ];
  if (!item) return [];

  const resolved = resolveDirectPose(item, pose);
  return layersForEntry(costumeId, resolved.pose, resolved.mirrored, resolved.entry);
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

function starterLayersForLoadout(
  loadout: LunchmateLoadout,
  pose: LunchmateCostumePose,
): LunchmatePoseResolvedLayer[] {
  return [
    ...resolveLunchmateStarterCostumePoseLayers(
      loadout.outfitId === 'outfit_hoodie_coral' ? loadout.outfitId : null,
      pose,
    ),
    ...resolveLunchmateStarterCostumePoseLayers(
      loadout.headwearId === 'headwear_beret_coral' ? loadout.headwearId : null,
      pose,
    ),
    ...resolveLunchmateStarterCostumePoseLayers(
      loadout.eyewearId === 'eyewear_round_black' ? loadout.eyewearId : null,
      pose,
    ),
    ...resolveLunchmateStarterCostumePoseLayers(
      loadout.bagId === 'bag_backpack_green' ? loadout.bagId : null,
      pose,
    ),
  ];
}

/**
 * Keeps legacy assets for every non-pilot item, replacing only the exact v3
 * Starter slots. This deliberately does not mutate or normalize the loadout.
 */
export function resolveLunchmateChickenCostumeRenderLayers(
  loadout: LunchmateLoadout,
  pose: LunchmateCostumePose,
): LunchmatePoseResolvedLayer[] {
  const starterLayers = starterLayersForLoadout(loadout, pose);
  const starterLayerByName = new Map(starterLayers.map(layer => [layer.layerName, layer]));
  const legacyLayerByName = new Map(
    resolveLunchmateRenderLayers(loadout, 'default')
      .filter((layer): layer is Exclude<LunchmateResolvedLayer, { layerName: 'base' }> => (
        layer.layerName !== 'base'
      ))
      .map(layer => [layer.layerName, layer]),
  );

  return LUNCHMATE_LAYER_ORDER.flatMap((layerName) => {
    if (layerName === 'base') return [];
    const starterLayer = starterLayerByName.get(layerName);
    if (starterLayer) return [starterLayer];

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
