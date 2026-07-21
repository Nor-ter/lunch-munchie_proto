import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion, useReducedMotion, type MotionProps, type Transition } from 'framer-motion';
import {
  lunchmateChickenAssets,
  lunchmateEffectAssets,
  lunchmateFaceAssets,
  lunchmateFacelessBaseAsset,
  lunchmateStateAssets,
  type LunchmateAssetSource,
  type LunchmateChickenAssetKey,
  type LunchmateStateAssetKey,
} from '../../constants/lunchmateAssets';
import {
  EMPTY_LUNCHMATE_LOADOUT,
  resolveLunchmateRenderLayers,
  type LunchmateResolvedLayer,
} from '../../constants/lunchmateItems';
import {
  resolveLunchmateChickenCostumePose,
  resolveLunchmateChickenCostumeRenderLayers,
  type LunchmatePoseResolvedLayer,
} from '../../constants/lunchmateCostumePoseManifest';
import {
  resolveLunchmateExpressionPresentation,
  type LunchmateEffectId,
  type LunchmateFaceState,
  type LunchmateMotionState,
  type LunchmateRenderSize,
} from '../../constants/lunchmateExpressions';
import type { LunchmateLoadout } from '../../types/lunchmateCustomization';
import type { FoodieBuddyUiState } from './FoodieBuddy';

export type LunchmatePoseMode = 'composedExpression';
export type LunchmateCharacterArtwork = 'classic' | 'chicken';

interface LunchmateCharacterRendererProps {
  flowState: FoodieBuddyUiState;
  levelUpActive?: boolean;
  size?: number;
  renderSize?: LunchmateRenderSize;
  alt?: string;
  fallback?: ReactNode;
  loadout?: LunchmateLoadout;
  animated?: boolean;
  /** Profile/Room의 새 시각 기반. 기존 레이어 Renderer의 기본 동작은 호환을 위해 유지한다. */
  artwork?: LunchmateCharacterArtwork;
  /** FoodieRoom의 UI 전용 모션이 선택한 chicken sprite. 기존 flow mapping보다 우선한다. */
  chickenAssetKeyOverride?: LunchmateChickenAssetKey;
  /** Room 최초 측정과 sprite 교체 후 bounds 재측정에 사용한다. */
  onChickenImageLoad?: () => void;
}

interface LunchmateStateMotion {
  animate: MotionProps['animate'];
  transition: Transition;
}

export interface LunchmateRenderPlan {
  poseMode: LunchmatePoseMode;
  visualAssetKey: LunchmateStateAssetKey;
  baseAssetKey: 'default';
  faceState: LunchmateFaceState;
  effectId: LunchmateEffectId | null;
  motionState: LunchmateMotionState;
  renderSize: LunchmateRenderSize;
  renderLayers: LunchmateResolvedLayer[];
  handheld: null;
}

const STATE_ALT: Record<LunchmateStateAssetKey, string> = {
  default: '편안하게 서 있는 런치메이트',
  happy: '행복한 런치메이트',
  excited: '신이 난 런치메이트',
  surprised: '새 음식에 놀란 런치메이트',
  sad: '속상한 런치메이트',
  thinking: '어떤 음식을 고를지 생각하는 런치메이트',
  eating: '한입을 기다리며 행복해하는 런치메이트',
  like: '한입을 받고 기뻐하는 런치메이트',
  jump: '레벨업을 기뻐하며 점프하는 런치메이트',
};

const assetLoadCache = new Map<string, Promise<boolean>>();

function loadAsset(source: LunchmateAssetSource) {
  const cached = assetLoadCache.get(source.src);
  if (cached) return cached;

  const promise = new Promise<boolean>((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(true);
      return;
    }

    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.srcset = source.srcSet;
    image.src = source.src;
  });

  assetLoadCache.set(source.src, promise);
  return promise;
}

function LunchmateLayerImage({
  source,
  layerName,
  mirrored = false,
  translateX = 0,
  translateY = 0,
}: {
  source: LunchmateAssetSource;
  layerName: string;
  mirrored?: boolean;
  translateX?: number;
  translateY?: number;
}) {
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [source.src]);

  if (loadFailed) return null;

  return (
    <img
      src={source.src}
      srcSet={source.srcSet}
      alt=""
      aria-hidden="true"
      data-lunchmate-layer={layerName}
      data-lunchmate-layer-mirrored={mirrored ? 'true' : undefined}
      data-lunchmate-translate-x={translateX}
      data-lunchmate-translate-y={translateY}
      draggable={false}
      onError={() => setLoadFailed(true)}
      className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
      style={{
        userSelect: 'none',
        // v3 artwork is aligned on the full canvas. Mirroring is the only
        // pose transform needed for sideRight; it does not resize eyewear.
        transform: mirrored ? 'scaleX(-1)' : undefined,
      }}
    />
  );
}

export function resolveLunchmateAssetKey(
  flowState: FoodieBuddyUiState,
  levelUpActive = false,
): LunchmateStateAssetKey {
  if (levelUpActive) return 'jump';

  switch (flowState) {
    case 'foodAvailable':
      return 'surprised';
    case 'selectingFood':
      return 'thinking';
    case 'submitting':
    case 'sharingAnimation':
      return 'eating';
    case 'reaction':
      return 'like';
    case 'error':
      return 'sad';
    case 'idle':
    default:
      return 'default';
  }
}

export function resolveLunchmateChickenAssetKey(
  flowState: FoodieBuddyUiState,
): LunchmateChickenAssetKey {
  return flowState === 'submitting' || flowState === 'sharingAnimation'
    ? 'feeding'
    : 'idle';
}

export function resolveLunchmateRenderPlan(
  loadout: LunchmateLoadout,
  flowState: FoodieBuddyUiState,
  levelUpActive = false,
  _animated = true,
  renderSize: LunchmateRenderSize = 'compact',
): LunchmateRenderPlan {
  const visualAssetKey = resolveLunchmateAssetKey(flowState, levelUpActive);
  const presentation = resolveLunchmateExpressionPresentation(visualAssetKey, renderSize);

  return {
    poseMode: 'composedExpression',
    visualAssetKey,
    baseAssetKey: 'default',
    faceState: presentation.faceState,
    effectId: presentation.effectId,
    motionState: presentation.motionState,
    renderSize,
    renderLayers: resolveLunchmateRenderLayers(loadout, 'default'),
    handheld: null,
  };
}

export function motionForLunchmateState(
  motionState: LunchmateMotionState,
  motionDisabled: boolean,
): LunchmateStateMotion {
  if (motionDisabled) {
    return {
      animate: { x: 0, y: 0, scale: 1, rotate: 0 },
      transition: { duration: 0 },
    };
  }

  if (motionState === 'success') {
    return {
      animate: { x: 0, y: [0, -4, 0], scale: [1, 1.05, 1], rotate: 0 },
      transition: { duration: 0.5, ease: 'easeOut' },
    };
  }

  if (motionState === 'jump') {
    return {
      animate: { x: 0, y: [0, -18, 0], scale: [1, 1.04, 1], rotate: 0 },
      transition: { duration: 0.58, ease: 'easeOut' },
    };
  }

  return {
    animate: { x: 0, y: 0, scale: 1, rotate: 0 },
    transition: { duration: 0.2 },
  };
}

type LunchmateRenderableAccessoryLayer = Exclude<LunchmateResolvedLayer, { layerName: 'base' }>
  | LunchmatePoseResolvedLayer;

function accessoryLayers(
  layers: ReadonlyArray<LunchmateResolvedLayer | LunchmatePoseResolvedLayer>,
  layerNames: ReadonlySet<LunchmateResolvedLayer['layerName']>,
): LunchmateRenderableAccessoryLayer[] {
  return layers.filter((layer): layer is LunchmateRenderableAccessoryLayer => (
    layer.layerName !== 'base' && layerNames.has(layer.layerName)
  ));
}

const BACK_LAYER_NAMES = new Set<LunchmateResolvedLayer['layerName']>(['bag-back', 'outfit-back']);
const FRONT_BODY_LAYER_NAMES = new Set<LunchmateResolvedLayer['layerName']>(['outfit-front', 'bag-front']);
const FACE_ACCESSORY_LAYER_NAMES = new Set<LunchmateResolvedLayer['layerName']>(['eyewear', 'headwear']);

export default function LunchmateCharacterRenderer({
  flowState,
  levelUpActive = false,
  size = 76,
  renderSize = 'compact',
  alt,
  fallback,
  loadout = EMPTY_LUNCHMATE_LOADOUT,
  animated = true,
  artwork = 'classic',
  chickenAssetKeyOverride,
  onChickenImageLoad,
}: LunchmateCharacterRendererProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const renderPlan = useMemo(
    () => resolveLunchmateRenderPlan(loadout, flowState, levelUpActive, animated, renderSize),
    [animated, flowState, levelUpActive, loadout, renderSize],
  );
  const [facelessLoadFailed, setFacelessLoadFailed] = useState(false);
  const [failedChickenSource, setFailedChickenSource] = useState<string | null>(null);
  const [legacyLoadFailed, setLegacyLoadFailed] = useState(false);
  const [displayedFaceState, setDisplayedFaceState] = useState<LunchmateFaceState>('default');
  const [faceLoadFailed, setFaceLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const requestedFaceState = renderPlan.faceState;

    if (requestedFaceState === 'default') {
      setFaceLoadFailed(false);
      setDisplayedFaceState('default');
      return () => {
        active = false;
      };
    }

    void loadAsset(lunchmateFaceAssets[requestedFaceState]).then((loaded) => {
      if (!active) return;
      if (loaded) {
        setFaceLoadFailed(false);
        setDisplayedFaceState(requestedFaceState);
      } else {
        setDisplayedFaceState('default');
      }
    });

    return () => {
      active = false;
    };
  }, [renderPlan.faceState]);

  useEffect(() => {
    if (artwork !== 'chicken') return;
    void loadAsset(lunchmateChickenAssets.idle);
    void loadAsset(lunchmateChickenAssets.feeding);
  }, [artwork]);

  const stateMotion = useMemo(
    () => motionForLunchmateState(
      renderPlan.motionState,
      reducedMotion || !animated,
    ),
    [animated, reducedMotion, renderPlan.motionState],
  );
  const displayedFaceAsset = lunchmateFaceAssets[displayedFaceState];
  const effectAsset = renderPlan.effectId && animated
    ? lunchmateEffectAssets[renderPlan.effectId]
    : null;
  const legacyAsset = lunchmateStateAssets.default;
  const chickenAssetKey = chickenAssetKeyOverride ?? resolveLunchmateChickenAssetKey(flowState);
  const chickenAsset = lunchmateChickenAssets[chickenAssetKey];
  const usesChickenArtwork = artwork === 'chicken'
    && failedChickenSource !== chickenAsset.src;
  const chickenCostumePose = resolveLunchmateChickenCostumePose(chickenAssetKey);
  const chickenCostumeLayers = useMemo(
    () => resolveLunchmateChickenCostumeRenderLayers(loadout, chickenCostumePose),
    [chickenCostumePose, loadout],
  );
  const activeAccessoryLayers = usesChickenArtwork
    ? chickenCostumeLayers
    : renderPlan.renderLayers;
  const backLayers = accessoryLayers(activeAccessoryLayers, BACK_LAYER_NAMES);
  const frontBodyLayers = accessoryLayers(activeAccessoryLayers, FRONT_BODY_LAYER_NAMES);
  const faceAccessoryLayers = accessoryLayers(activeAccessoryLayers, FACE_ACCESSORY_LAYER_NAMES);

  const renderAccessories = (layers: LunchmateRenderableAccessoryLayer[]) => layers.map(layer => (
    <LunchmateLayerImage
      key={`${layer.layerName}:${layer.source.src}`}
      source={layer.source}
      layerName={layer.layerName}
      mirrored={'mirrored' in layer ? layer.mirrored : false}
      translateX={'translateX' in layer ? layer.translateX : 0}
      translateY={'translateY' in layer ? layer.translateY : 0}
    />
  ));

  return (
    <motion.div
      className="pointer-events-none flex shrink-0 items-center justify-center will-change-transform"
      style={{ width: size, height: size }}
      animate={stateMotion.animate}
      transition={stateMotion.transition}
      aria-live="polite"
      data-lunchmate-pose-mode={renderPlan.poseMode}
      data-lunchmate-visual-state={renderPlan.visualAssetKey}
      data-lunchmate-face-state={renderPlan.faceState}
      data-lunchmate-motion-state={renderPlan.motionState}
      data-lunchmate-render-size={renderPlan.renderSize}
      data-lunchmate-artwork={usesChickenArtwork ? 'chicken' : 'classic'}
      data-lunchmate-chicken-asset={usesChickenArtwork ? chickenAssetKey : undefined}
    >
      <div
        className="relative h-full w-full overflow-visible"
        data-lunchmate-character-canvas="true"
      >
        {renderAccessories(backLayers)}

        {usesChickenArtwork ? (
          <img
            src={chickenAsset.src}
            srcSet={chickenAsset.srcSet}
            alt={alt ?? '편안하게 서 있는 치킨 런치메이트'}
            width={size}
            height={size}
            data-lunchmate-layer="chicken-base"
            draggable={false}
            onLoad={onChickenImageLoad}
            onError={() => setFailedChickenSource(chickenAsset.src)}
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain opacity-100"
            style={{ objectPosition: 'center bottom', userSelect: 'none', opacity: 1 }}
          />
        ) : facelessLoadFailed ? (
          legacyLoadFailed ? (
            <span
              className="absolute inset-0 flex h-full w-full items-center justify-center"
              role="img"
              aria-label="런치메이트 이미지 대체 표시"
              data-lunchmate-layer="legacy-fallback"
            >
              {fallback ?? '🙂'}
            </span>
          ) : (
            <img
              src={legacyAsset.src}
              srcSet={legacyAsset.srcSet}
              alt={alt ?? STATE_ALT[renderPlan.visualAssetKey]}
              width={size}
              height={size}
              data-lunchmate-layer="legacy-base"
              draggable={false}
              onError={() => setLegacyLoadFailed(true)}
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
              style={{ userSelect: 'none' }}
            />
          )
        ) : (
          <img
            src={lunchmateFacelessBaseAsset.src}
            srcSet={lunchmateFacelessBaseAsset.srcSet}
            alt={alt ?? STATE_ALT[renderPlan.visualAssetKey]}
            width={size}
            height={size}
            data-lunchmate-layer="faceless-base"
            draggable={false}
            onError={() => setFacelessLoadFailed(true)}
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
            style={{ userSelect: 'none' }}
          />
        )}

        {renderAccessories(frontBodyLayers)}

        {!usesChickenArtwork && !facelessLoadFailed && !faceLoadFailed && (
          <img
            src={displayedFaceAsset.src}
            srcSet={displayedFaceAsset.srcSet}
            alt=""
            aria-hidden="true"
            data-lunchmate-layer="face"
            draggable={false}
            onError={() => {
              if (displayedFaceState === 'default') {
                setFaceLoadFailed(true);
              } else {
                setDisplayedFaceState('default');
              }
            }}
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
            style={{ userSelect: 'none' }}
          />
        )}

        {renderAccessories(faceAccessoryLayers)}

        {!usesChickenArtwork && effectAsset && (
          <LunchmateLayerImage
            source={effectAsset}
            layerName="effect"
          />
        )}
      </div>
    </motion.div>
  );
}
