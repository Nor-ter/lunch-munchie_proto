import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion, useReducedMotion, type MotionProps, type Transition } from 'framer-motion';
import {
  lunchmateStateAssets,
  type LunchmateAssetSource,
  type LunchmateStateAssetKey,
} from '@/constants/lunchmateAssets';
import type { FoodieBuddyUiState } from '@/components/munchie/FoodieBuddy';

interface LunchmateCharacterRendererProps {
  flowState: FoodieBuddyUiState;
  levelUpActive?: boolean;
  size?: number;
  alt?: string;
  fallback?: ReactNode;
}

interface LunchmateStateMotion {
  animate: MotionProps['animate'];
  transition: Transition;
}

const STATE_ALT: Record<LunchmateStateAssetKey, string> = {
  default: '편안하게 서 있는 런치메이트',
  happy: '행복한 런치메이트',
  excited: '신이 난 런치메이트',
  surprised: '새 음식에 놀란 런치메이트',
  sad: '속상한 런치메이트',
  thinking: '어떤 음식을 고를지 생각하는 런치메이트',
  eating: '한입을 먹고 있는 런치메이트',
  like: '엄지를 들어 반응하는 런치메이트',
  jump: '레벨업을 기뻐하며 점프하는 런치메이트',
};

const stateAssetLoadCache = new Map<LunchmateStateAssetKey, Promise<boolean>>();

function loadStateAsset(assetKey: LunchmateStateAssetKey) {
  const cached = stateAssetLoadCache.get(assetKey);
  if (cached) return cached;

  const promise = new Promise<boolean>((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(true);
      return;
    }

    const source = lunchmateStateAssets[assetKey];
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.srcset = source.srcSet;
    image.src = source.src;
  });

  stateAssetLoadCache.set(assetKey, promise);
  return promise;
}

function preloadStateAssets() {
  (Object.keys(lunchmateStateAssets) as LunchmateStateAssetKey[]).forEach((assetKey) => {
    void loadStateAsset(assetKey);
  });
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

function motionForState(assetKey: LunchmateStateAssetKey, reducedMotion: boolean): LunchmateStateMotion {
  if (reducedMotion) {
    return {
      animate: { x: 0, y: 0, scale: 1, rotate: 0 },
      transition: { duration: 0 },
    };
  }

  switch (assetKey) {
    case 'surprised':
      return {
        animate: { scale: [1, 1.055, 1], rotate: [0, -1, 0] },
        transition: { duration: 0.42, ease: 'easeOut' },
      };
    case 'thinking':
      return {
        animate: { rotate: [-1.5, 1.5, -1.5] },
        transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
      };
    case 'eating':
      return {
        animate: { y: [0, -2, 0] },
        transition: { duration: 0.55, repeat: Infinity, ease: 'easeInOut' },
      };
    case 'like':
      return {
        animate: { scale: [1, 1.07, 1], rotate: [0, -1.5, 0] },
        transition: { duration: 0.5, ease: 'easeOut' },
      };
    case 'jump':
      return {
        animate: { y: [0, -4, 0], scale: [1, 1.025, 1] },
        transition: { duration: 0.48, ease: 'easeOut' },
      };
    case 'sad':
      return {
        animate: { y: [0, 2, 1], rotate: [0, -1, 1, 0] },
        transition: { duration: 0.65, ease: 'easeInOut' },
      };
    case 'happy':
      return {
        animate: { scale: [1, 1.035, 1] },
        transition: { duration: 0.65, ease: 'easeOut' },
      };
    case 'excited':
      return {
        animate: { y: [0, -3, 0], rotate: [0, -1.5, 1.5, 0] },
        transition: { duration: 0.55, ease: 'easeOut' },
      };
    case 'default':
    default:
      return {
        animate: { x: 0, y: 0, scale: 1, rotate: 0 },
        transition: { duration: 0.2 },
      };
  }
}

export default function LunchmateCharacterRenderer({
  flowState,
  levelUpActive = false,
  size = 76,
  alt,
  fallback,
}: LunchmateCharacterRendererProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const requestedAssetKey = resolveLunchmateAssetKey(flowState, levelUpActive);
  const [displayedAssetKey, setDisplayedAssetKey] = useState<LunchmateStateAssetKey>('default');
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  useEffect(() => {
    preloadStateAssets();
  }, []);

  useEffect(() => {
    let active = true;
    setImageLoadFailed(false);

    if (requestedAssetKey === 'default') {
      setDisplayedAssetKey('default');
      return () => {
        active = false;
      };
    }

    void loadStateAsset(requestedAssetKey).then((loaded) => {
      if (!active) return;
      if (loaded) setDisplayedAssetKey(requestedAssetKey);
      else setImageLoadFailed(true);
    });

    return () => {
      active = false;
    };
  }, [requestedAssetKey]);

  const displayedAsset: LunchmateAssetSource = lunchmateStateAssets[displayedAssetKey];
  const stateMotion = useMemo(
    () => motionForState(displayedAssetKey, reducedMotion),
    [displayedAssetKey, reducedMotion],
  );

  return (
    <motion.div
      className="pointer-events-none flex shrink-0 items-center justify-center will-change-transform"
      style={{ width: size, height: size }}
      animate={stateMotion.animate}
      transition={stateMotion.transition}
      aria-live="polite"
    >
      {imageLoadFailed ? (
        <span className="flex h-full w-full items-center justify-center" role="img" aria-label="런치메이트 이미지 대체 표시">
          {fallback ?? '🙂'}
        </span>
      ) : (
        <img
          src={displayedAsset.src}
          srcSet={displayedAsset.srcSet}
          alt={alt ?? STATE_ALT[displayedAssetKey]}
          width={size}
          height={size}
          draggable={false}
          onError={() => setImageLoadFailed(true)}
          className="h-full w-full select-none object-contain"
          style={{ userSelect: 'none' }}
        />
      )}
    </motion.div>
  );
}
