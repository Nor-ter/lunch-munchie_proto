export interface LunchmateAssetSource {
  src: string;
  srcSet: string;
}

export type LunchmateStateAssetKey =
  | 'default'
  | 'happy'
  | 'excited'
  | 'surprised'
  | 'sad'
  | 'thinking'
  | 'eating'
  | 'like'
  | 'jump';

export type LunchmateCostumeAssetKey =
  | 'costume_hoodie'
  | 'costume_overalls'
  | 'costume_beret'
  | 'costume_raincoat';

function assetSource(fileName: string, revision?: string): LunchmateAssetSource {
  const revisionQuery = revision ? `?v=${revision}` : '';

  return {
    src: `/assets/lunchmate/1x/lunchmate_${fileName}.png${revisionQuery}`,
    srcSet: `/assets/lunchmate/1x/lunchmate_${fileName}.png${revisionQuery} 1x, /assets/lunchmate/2x/lunchmate_${fileName}@2x.png${revisionQuery} 2x`,
  };
}

const LUNCHMATE_STATE_ASSET_REVISION = 'body-seams-v1';

function composedAssetSource(
  oneXPath: string,
  twoXPath: string,
  revision?: string,
): LunchmateAssetSource {
  const revisionQuery = revision ? `?v=${revision}` : '';

  return {
    src: `${oneXPath}${revisionQuery}`,
    srcSet: `${oneXPath}${revisionQuery} 1x, ${twoXPath}${revisionQuery} 2x`,
  };
}

export function lunchmateLayerAssetSource(relativePath: string): LunchmateAssetSource {
  const basePath = `/assets/lunchmate/layers/${relativePath}`;
  return {
    src: `${basePath}.png`,
    srcSet: `${basePath}.png 1x, ${basePath}@2x.png 2x`,
  };
}

export const lunchmateStateAssets = {
  default: assetSource('default', LUNCHMATE_STATE_ASSET_REVISION),
  happy: assetSource('happy', LUNCHMATE_STATE_ASSET_REVISION),
  excited: assetSource('excited', LUNCHMATE_STATE_ASSET_REVISION),
  surprised: assetSource('surprised', LUNCHMATE_STATE_ASSET_REVISION),
  sad: assetSource('sad', LUNCHMATE_STATE_ASSET_REVISION),
  thinking: assetSource('thinking', LUNCHMATE_STATE_ASSET_REVISION),
  eating: assetSource('eating', LUNCHMATE_STATE_ASSET_REVISION),
  like: assetSource('like', LUNCHMATE_STATE_ASSET_REVISION),
  jump: assetSource('jump', LUNCHMATE_STATE_ASSET_REVISION),
} satisfies Record<LunchmateStateAssetKey, LunchmateAssetSource>;

export const lunchmateFacelessBaseAsset = composedAssetSource(
  '/assets/lunchmate/base/1x/faceless.png',
  '/assets/lunchmate/base/2x/faceless@2x.png',
  'faceless-seamless-v2',
);

export const lunchmateFaceAssets = {
  default: composedAssetSource(
    '/assets/lunchmate/layers/face/1x/default.png',
    '/assets/lunchmate/layers/face/2x/default@2x.png',
  ),
  happy: composedAssetSource(
    '/assets/lunchmate/layers/face/1x/happy.png',
    '/assets/lunchmate/layers/face/2x/happy@2x.png',
  ),
  excited: composedAssetSource(
    '/assets/lunchmate/layers/face/1x/excited.png',
    '/assets/lunchmate/layers/face/2x/excited@2x.png',
  ),
  surprised: composedAssetSource(
    '/assets/lunchmate/layers/face/1x/surprised.png',
    '/assets/lunchmate/layers/face/2x/surprised@2x.png',
  ),
  sad: composedAssetSource(
    '/assets/lunchmate/layers/face/1x/sad.png',
    '/assets/lunchmate/layers/face/2x/sad@2x.png',
  ),
  thinking: composedAssetSource(
    '/assets/lunchmate/layers/face/1x/thinking.png',
    '/assets/lunchmate/layers/face/2x/thinking@2x.png',
    'thinking-clean-v2',
  ),
} as const;

export const lunchmateEffectAssets = {
  surprised_marks: composedAssetSource(
    '/assets/lunchmate/layers/effects/1x/surprised_marks.png',
    '/assets/lunchmate/layers/effects/2x/surprised_marks@2x.png',
  ),
  thinking_bubble: composedAssetSource(
    '/assets/lunchmate/layers/effects/1x/thinking_bubble.png',
    '/assets/lunchmate/layers/effects/2x/thinking_bubble@2x.png',
  ),
  jump_lines: composedAssetSource(
    '/assets/lunchmate/layers/effects/1x/jump_lines.png',
    '/assets/lunchmate/layers/effects/2x/jump_lines@2x.png',
  ),
} as const;

// Phase 1F에서는 manifest 등록만 한다. 선택 UI와 profile 저장 연결은 후속 Phase 범위다.
export const lunchmateCostumeAssets = {
  costume_hoodie: assetSource('costume_hoodie'),
  costume_overalls: assetSource('costume_overalls'),
  costume_beret: assetSource('costume_beret'),
  costume_raincoat: assetSource('costume_raincoat'),
} satisfies Record<LunchmateCostumeAssetKey, LunchmateAssetSource>;
