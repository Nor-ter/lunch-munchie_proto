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

function assetSource(fileName: string): LunchmateAssetSource {
  return {
    src: `/assets/lunchmate/1x/lunchmate_${fileName}.png`,
    srcSet: `/assets/lunchmate/1x/lunchmate_${fileName}.png 1x, /assets/lunchmate/2x/lunchmate_${fileName}@2x.png 2x`,
  };
}

export const lunchmateStateAssets = {
  default: assetSource('default'),
  happy: assetSource('happy'),
  excited: assetSource('excited'),
  surprised: assetSource('surprised'),
  sad: assetSource('sad'),
  thinking: assetSource('thinking'),
  eating: assetSource('eating'),
  like: assetSource('like'),
  jump: assetSource('jump'),
} satisfies Record<LunchmateStateAssetKey, LunchmateAssetSource>;

// Phase 1F에서는 manifest 등록만 한다. 선택 UI와 profile 저장 연결은 후속 Phase 범위다.
export const lunchmateCostumeAssets = {
  costume_hoodie: assetSource('costume_hoodie'),
  costume_overalls: assetSource('costume_overalls'),
  costume_beret: assetSource('costume_beret'),
  costume_raincoat: assetSource('costume_raincoat'),
} satisfies Record<LunchmateCostumeAssetKey, LunchmateAssetSource>;
