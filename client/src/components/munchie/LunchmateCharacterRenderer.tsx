import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion, useReducedMotion, type MotionProps, type Transition } from 'framer-motion';
import {
  lunchmateEffectAssets,
  lunchmateFaceAssets,
  lunchmateFacelessBaseAsset,
  lunchmateStateAssets,
  type LunchmateAssetSource,
  type LunchmateStateAssetKey,
} from '../../constants/lunchmateAssets';
import {
  EMPTY_LUNCHMATE_LOADOUT,
  resolveLunchmateRenderLayers,
  type LunchmateResolvedLayer,
} from '../../constants/lunchmateItems';
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

interface LunchmateCharacterRendererProps {
  flowState: FoodieBuddyUiState;
  levelUpActive?: boolean;
  size?: number;
  renderSize?: LunchmateRenderSize;
  alt?: string;
  fallback?: ReactNode;
  loadout?: LunchmateLoadout;
  animated?: boolean;
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
}: {
  source: LunchmateAssetSource;
  layerName: string;
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
      draggable={false}
      onError={() => setLoadFailed(true)}
      className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
      style={{ userSelect: 'none' }}
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

function accessoryLayers(
  layers: LunchmateResolvedLayer[],
  layerNames: ReadonlySet<LunchmateResolvedLayer['layerName']>,
) {
  return layers.filter(layer => layerNames.has(layer.layerName));
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
}: LunchmateCharacterRendererProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const renderPlan = useMemo(
    () => resolveLunchmateRenderPlan(loadout, flowState, levelUpActive, animated, renderSize),
    [animated, flowState, levelUpActive, loadout, renderSize],
  );
  const [facelessLoadFailed, setFacelessLoadFailed] = useState(false);
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

  const stateMotion = useMemo(
    () => motionForLunchmateState(
      renderPlan.motionState,
      reducedMotion || !animated,
    ),
    [animated, reducedMotion, renderPlan.motionState],
  );
  const backLayers = accessoryLayers(renderPlan.renderLayers, BACK_LAYER_NAMES);
  const frontBodyLayers = accessoryLayers(renderPlan.renderLayers, FRONT_BODY_LAYER_NAMES);
  const faceAccessoryLayers = accessoryLayers(renderPlan.renderLayers, FACE_ACCESSORY_LAYER_NAMES);
  const displayedFaceAsset = lunchmateFaceAssets[displayedFaceState];
  const effectAsset = renderPlan.effectId && animated
    ? lunchmateEffectAssets[renderPlan.effectId]
    : null;
  const legacyAsset = lunchmateStateAssets.default;

  const renderAccessories = (layers: LunchmateResolvedLayer[]) => layers.map(layer => (
    layer.layerName === 'base' ? null : (
      <LunchmateLayerImage
        key={`${layer.layerName}:${layer.source.src}`}
        source={layer.source}
        layerName={layer.layerName}
      />
    )
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
    >
      <div
        className="relative h-full w-full overflow-visible"
        data-lunchmate-character-canvas="true"
      >
        {renderAccessories(backLayers)}

        {facelessLoadFailed ? (
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

        {!facelessLoadFailed && !faceLoadFailed && (
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

        {effectAsset && (
          <LunchmateLayerImage
            source={effectAsset}
            layerName="effect"
          />
        )}
      </div>
    </motion.div>
  );
}
