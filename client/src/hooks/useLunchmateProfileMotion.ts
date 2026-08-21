import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import {
  lunchmateChickenAssets,
  type LunchmateChickenAssetKey,
} from '@/constants/lunchmateAssets';
import {
  resolveLunchmateRoomEmotionMotion,
  selectLunchmateRoomEmotion,
  type LunchmateRoomEmotion,
  type LunchmateRoomEmotionMotion,
} from '@/hooks/useLunchmateRoomMotion';

export type LunchmateProfileMotionStatus =
  | 'idle'
  | 'walking-left'
  | 'walking-right'
  | 'sitting'
  | LunchmateRoomEmotion;
export type LunchmateProfileFacing = 'front' | 'left' | 'right';
export type LunchmateProfileWalkFrame = 1 | 2;
export type LunchmateProfileMotionActivity =
  | 'idle-wait'
  | 'source-transition'
  | 'center-emotion'
  | 'post-emotion-idle'
  | 'walking'
  | 'edge-hold'
  | 'center-pause'
  | 'sitting'
  | 'post-sitting-idle'
  | 'suspended';

export interface LunchmateProfileMotionSnapshot {
  status: LunchmateProfileMotionStatus;
  activity: LunchmateProfileMotionActivity;
  facing: LunchmateProfileFacing;
  x: number;
  frame: LunchmateProfileWalkFrame;
  scaleY: number;
  positionTransitionMs: number;
  poseTransitionMs: number;
  emotionMotion: 'none' | LunchmateRoomEmotion;
  interactionReady: boolean;
  animationsEnabled: boolean;
}

export interface LunchmateProfileTravelBounds {
  minX: number;
  maxX: number;
}

export const LUNCHMATE_PROFILE_MAX_OFFSET_PX = 44;
export const LUNCHMATE_PROFILE_EDGE_GAP_PX = 16;
export const LUNCHMATE_PROFILE_INITIAL_IDLE_RANGE_MS = [2500, 3500] as const;
export const LUNCHMATE_PROFILE_EMOTION_DURATION_RANGE_MS = [1800, 2200] as const;
export const LUNCHMATE_PROFILE_POST_EMOTION_RANGE_MS = [300, 500] as const;
export const LUNCHMATE_PROFILE_WALK_DURATION_RANGE_MS = [900, 1150] as const;
export const LUNCHMATE_PROFILE_WALK_FRAME_MS = 225;
export const LUNCHMATE_PROFILE_EDGE_HOLD_RANGE_MS = [350, 550] as const;
export const LUNCHMATE_PROFILE_CENTER_PAUSE_RANGE_MS = [600, 900] as const;
export const LUNCHMATE_PROFILE_PRE_SITTING_RANGE_MS = [500, 800] as const;
export const LUNCHMATE_PROFILE_SITTING_RANGE_MS = [4500, 6500] as const;
export const LUNCHMATE_PROFILE_POST_SITTING_RANGE_MS = [2000, 3000] as const;
export const LUNCHMATE_PROFILE_POSE_TRANSITION_RANGE_MS = [160, 220] as const;
export const LUNCHMATE_PROFILE_LONG_PRESS_MS = 400;
export const LUNCHMATE_PROFILE_LONG_PRESS_PREPARE_MS = 80;
export const LUNCHMATE_PROFILE_LONG_PRESS_MOVE_THRESHOLD_PX = 4;
export const LUNCHMATE_PROFILE_GRAB_LIFT_PX = 12;
export const LUNCHMATE_PROFILE_GRAB_MAX_ROTATE_DEG = 11;
export const LUNCHMATE_PROFILE_GRAB_HARD_ROTATE_LIMIT_DEG = 12;
export const LUNCHMATE_PROFILE_GRAB_MAX_SCALE = 1.03;
export const LUNCHMATE_PROFILE_GRAB_LANDING_MS = 320;
export const LUNCHMATE_PROFILE_GRAB_HORIZONTAL_PADDING_PX = 9;
export const LUNCHMATE_PROFILE_GRAB_VERTICAL_PADDING_PX = 7;
export const LUNCHMATE_PROFILE_GRAB_ROTATION_ALLOWANCE_PX = 6;
export const LUNCHMATE_PROFILE_GRAB_VELOCITY_NOISE_THRESHOLD = 0.03;
export const LUNCHMATE_PROFILE_GRAB_VELOCITY_TO_ANGLE = 18;
export const LUNCHMATE_PROFILE_GRAB_SETTLE_DELAY_MS = 80;

const PROFILE_MOTION_ASSET_KEYS = [
  'idle',
  'grabbed',
  'sitting',
  'side-walk-left-1',
  'side-walk-left-2',
  'side-walk-right-1',
  'side-walk-right-2',
  'happy',
  'surprised',
  'sleepy',
  'crying',
] as const satisfies readonly LunchmateChickenAssetKey[];

const INITIAL_PROFILE_MOTION: LunchmateProfileMotionSnapshot = {
  status: 'idle',
  activity: 'idle-wait',
  facing: 'front',
  x: 0,
  frame: 1,
  scaleY: 1,
  positionTransitionMs: 0,
  poseTransitionMs: 0,
  emotionMotion: 'none',
  interactionReady: false,
  animationsEnabled: true,
};

function clampRandom(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(0.999999, Math.max(0, value));
}

function durationFromRandom(
  range: readonly [number, number],
  random: () => number,
) {
  return Math.round(range[0] + ((range[1] - range[0]) * clampRandom(random())));
}

export function calculateLunchmateProfileTravelBounds(
  stageWidth: number,
  characterWidth: number,
): LunchmateProfileTravelBounds {
  const safeStageWidth = Number.isFinite(stageWidth) ? Math.max(0, stageWidth) : 0;
  const safeCharacterWidth = Number.isFinite(characterWidth)
    ? Math.max(0, characterWidth)
    : 0;
  const measuredOffset = Math.max(
    0,
    (safeStageWidth - safeCharacterWidth) / 2 - LUNCHMATE_PROFILE_EDGE_GAP_PX,
  );
  const maxOffset = Math.min(LUNCHMATE_PROFILE_MAX_OFFSET_PX, measuredOffset);
  return {
    minX: maxOffset === 0 ? 0 : -maxOffset,
    maxX: maxOffset,
  };
}

export function resolveLunchmateProfileAssetKey(
  status: LunchmateProfileMotionStatus,
  facing: LunchmateProfileFacing,
  frame: LunchmateProfileWalkFrame,
): LunchmateChickenAssetKey {
  if (status === 'sitting') return 'sitting';
  if (
    status === 'happy'
    || status === 'surprised'
    || status === 'sleepy'
    || status === 'crying'
  ) return status;
  if (facing === 'left') return `side-walk-left-${frame}`;
  if (facing === 'right') return `side-walk-right-${frame}`;
  return 'idle';
}

export function selectLunchmateProfileEmotion(
  randomValue: number,
  previousEmotion: LunchmateRoomEmotion | null,
) {
  return selectLunchmateRoomEmotion(randomValue, previousEmotion);
}

export function resolveLunchmateProfilePresentationAsset(
  automaticAssetKey: LunchmateChickenAssetKey,
  isFeeding: boolean,
  interactionReady: boolean,
): LunchmateChickenAssetKey {
  return isFeeding && interactionReady ? 'feeding' : automaticAssetKey;
}

export function hasLunchmateProfileMeasurements(
  stageWidth: number,
  characterWidth: number,
) {
  return Number.isFinite(stageWidth)
    && stageWidth > 0
    && Number.isFinite(characterWidth)
    && characterWidth > 0;
}

export function scheduleLunchmateProfileInitialMeasurement(measure: () => void) {
  measure();
  if (
    typeof requestAnimationFrame !== 'function'
    || typeof cancelAnimationFrame !== 'function'
  ) return () => undefined;
  const frameId = requestAnimationFrame(measure);
  return () => cancelAnimationFrame(frameId);
}

type ScheduledStep =
  | 'initial-idle'
  | 'center-emotion'
  | 'post-emotion-idle'
  | 'pose-first-half'
  | 'pose-second-half'
  | 'walk-to-edge'
  | 'edge-hold'
  | 'walk-to-center'
  | 'center-pause'
  | 'pre-sitting-pause'
  | 'sitting'
  | 'post-sitting-idle';

type PausedSchedule =
  | {
      kind: 'timer';
      step: ScheduledStep;
      remainingMs: number;
      callback: () => void;
    }
  | {
      kind: 'walking';
      step: 'walk-to-edge' | 'walk-to-center';
      remainingMs: number;
      targetX: number;
      direction: 'walking-left' | 'walking-right';
      callback: () => void;
    }
  | {
      kind: 'pose';
      step: 'pose-first-half' | 'pose-second-half';
      remainingMs: number;
      targetScaleY: number;
      callback: () => void;
    };

interface LunchmateProfileMotionControllerOptions {
  getBounds: () => LunchmateProfileTravelBounds;
  onChange: (snapshot: LunchmateProfileMotionSnapshot) => void;
  random?: () => number;
  now?: () => number;
  reducedMotion?: boolean;
  initiallyVisible?: boolean;
  initiallySuspended?: boolean;
}

export interface LunchmateProfileMotionController {
  start: () => void;
  stop: () => void;
  setVisible: (visible: boolean) => void;
  setSuspended: (suspended: boolean) => void;
  setGrabPaused: (paused: boolean) => void;
  restart: () => void;
  remeasure: () => void;
  getSnapshot: () => LunchmateProfileMotionSnapshot;
}

export function createLunchmateProfileMotionController({
  getBounds,
  onChange,
  random = Math.random,
  now = Date.now,
  reducedMotion = false,
  initiallyVisible = true,
  initiallySuspended = false,
}: LunchmateProfileMotionControllerOptions): LunchmateProfileMotionController {
  let snapshot = { ...INITIAL_PROFILE_MOTION };
  let started = false;
  let stopped = false;
  let visible = initiallyVisible;
  let suspended = initiallySuspended;
  let grabPaused = false;
  let phaseTimer: ReturnType<typeof setTimeout> | null = null;
  let frameTimer: ReturnType<typeof setInterval> | null = null;
  let deadline = 0;
  let scheduledStep: ScheduledStep | null = null;
  let scheduledCallback: (() => void) | null = null;
  let pausedSchedule: PausedSchedule | null = null;
  let activeEdge: 'left' | 'right' | null = null;
  let lastEmotion: LunchmateRoomEmotion | null = null;
  let walkStartX = 0;
  let walkTargetX = 0;
  let walkStartedAt = 0;
  let walkDurationMs = 0;
  let poseStartScaleY = 1;
  let poseTargetScaleY = 1;
  let poseStartedAt = 0;
  let poseDurationMs = 0;

  const emit = (nextSnapshot: LunchmateProfileMotionSnapshot) => {
    snapshot = nextSnapshot;
    onChange(nextSnapshot);
  };

  const clearTimers = () => {
    if (phaseTimer !== null) clearTimeout(phaseTimer);
    if (frameTimer !== null) clearInterval(frameTimer);
    phaseTimer = null;
    frameTimer = null;
  };

  const schedule = (
    step: ScheduledStep,
    durationMs: number,
    callback: () => void,
  ) => {
    scheduledStep = step;
    scheduledCallback = callback;
    deadline = now() + durationMs;
    phaseTimer = setTimeout(() => {
      phaseTimer = null;
      scheduledStep = null;
      scheduledCallback = null;
      callback();
    }, durationMs);
  };

  const clampX = (x: number) => {
    const bounds = getBounds();
    return Math.min(bounds.maxX, Math.max(bounds.minX, x));
  };

  const currentWalkingX = () => {
    if (
      (scheduledStep !== 'walk-to-edge' && scheduledStep !== 'walk-to-center')
      || walkDurationMs <= 0
    ) return snapshot.x;
    const progress = Math.min(1, Math.max(0, (now() - walkStartedAt) / walkDurationMs));
    return walkStartX + ((walkTargetX - walkStartX) * progress);
  };

  const currentPoseScaleY = () => {
    if (
      (scheduledStep !== 'pose-first-half' && scheduledStep !== 'pose-second-half')
      || poseDurationMs <= 0
    ) return snapshot.scaleY;
    const progress = Math.min(1, Math.max(0, (now() - poseStartedAt) / poseDurationMs));
    return poseStartScaleY + ((poseTargetScaleY - poseStartScaleY) * progress);
  };

  const beginPoseHalf = (
    targetScaleY: number,
    durationMs: number,
    step: 'pose-first-half' | 'pose-second-half',
    callback: () => void,
  ) => {
    poseStartScaleY = snapshot.scaleY;
    poseTargetScaleY = targetScaleY;
    poseStartedAt = now();
    poseDurationMs = durationMs;
    emit({
      ...snapshot,
      activity: 'source-transition',
      scaleY: targetScaleY,
      poseTransitionMs: durationMs,
      interactionReady: false,
    });
    schedule(step, durationMs, callback);
  };

  const beginSourceTransition = (
    targetStatus: LunchmateProfileMotionStatus,
    targetFacing: LunchmateProfileFacing,
    onComplete: () => void,
  ) => {
    if (stopped) return;
    if (!visible || reducedMotion) {
      emit({
        ...snapshot,
        status: targetStatus,
        facing: targetFacing,
        frame: 1,
        scaleY: 1,
        poseTransitionMs: 0,
      });
      onComplete();
      return;
    }
    const totalMs = durationFromRandom(
      LUNCHMATE_PROFILE_POSE_TRANSITION_RANGE_MS,
      random,
    );
    const firstHalfMs = Math.floor(totalMs / 2);
    const secondHalfMs = totalMs - firstHalfMs;
    beginPoseHalf(0.97, firstHalfMs, 'pose-first-half', () => {
      emit({
        ...snapshot,
        status: targetStatus,
        facing: targetFacing,
        frame: 1,
        poseTransitionMs: 0,
      });
      beginPoseHalf(1, secondHalfMs, 'pose-second-half', () => {
        emit({ ...snapshot, scaleY: 1, poseTransitionMs: 0 });
        onComplete();
      });
    });
  };

  const beginWalking = (
    direction: 'walking-left' | 'walking-right',
    targetX: number,
    durationMs: number,
    step: 'walk-to-edge' | 'walk-to-center',
    onArrival: () => void,
  ) => {
    if (stopped || suspended || !visible || reducedMotion) return;
    walkStartX = clampX(snapshot.x);
    walkTargetX = clampX(targetX);
    walkStartedAt = now();
    walkDurationMs = Math.max(0, durationMs);
    emit({
      ...snapshot,
      status: direction,
      activity: 'walking',
      facing: direction === 'walking-left' ? 'left' : 'right',
      x: walkTargetX,
      frame: 1,
      scaleY: 1,
      positionTransitionMs: walkDurationMs,
      poseTransitionMs: 0,
      emotionMotion: 'none',
      interactionReady: false,
    });
    frameTimer = setInterval(() => {
      emit({
        ...snapshot,
        frame: snapshot.frame === 1 ? 2 : 1,
      });
    }, LUNCHMATE_PROFILE_WALK_FRAME_MS);
    schedule(step, walkDurationMs, onArrival);
  };

  const beginCenterEmotion = () => {
    if (stopped || suspended || !visible || reducedMotion) return;
    const selectedEmotion = selectLunchmateProfileEmotion(random(), lastEmotion);
    lastEmotion = selectedEmotion;
    beginSourceTransition(selectedEmotion, 'front', () => {
      if (stopped || suspended || !visible || reducedMotion) return;
      emit({
        ...snapshot,
        status: selectedEmotion,
        activity: 'center-emotion',
        facing: 'front',
        x: 0,
        positionTransitionMs: 0,
        emotionMotion: selectedEmotion,
      });
      schedule(
        'center-emotion',
        durationFromRandom(LUNCHMATE_PROFILE_EMOTION_DURATION_RANGE_MS, random),
        () => {
          if (stopped || suspended || !visible || reducedMotion) return;
          emit({
            ...snapshot,
            activity: 'source-transition',
            emotionMotion: 'none',
          });
          beginSourceTransition('idle', 'front', () => {
            if (stopped || suspended || !visible || reducedMotion) return;
            emit({
              ...snapshot,
              status: 'idle',
              activity: 'post-emotion-idle',
              facing: 'front',
              x: 0,
              positionTransitionMs: 0,
              emotionMotion: 'none',
            });
            schedule(
              'post-emotion-idle',
              durationFromRandom(LUNCHMATE_PROFILE_POST_EMOTION_RANGE_MS, random),
              () => departToEdge('left'),
            );
          });
        },
      );
    });
  };

  const beginInitialIdle = () => {
    if (stopped || suspended || !visible || reducedMotion) return;
    activeEdge = null;
    emit({
      ...INITIAL_PROFILE_MOTION,
      activity: 'idle-wait',
      animationsEnabled: true,
    });
    schedule(
      'initial-idle',
      durationFromRandom(LUNCHMATE_PROFILE_INITIAL_IDLE_RANGE_MS, random),
      beginCenterEmotion,
    );
  };

  const beginSitting = () => {
    if (stopped || suspended || !visible || reducedMotion) return;
    beginSourceTransition('sitting', 'front', () => {
      if (stopped || suspended) return;
      emit({
        ...snapshot,
        status: 'sitting',
        activity: 'sitting',
        facing: 'front',
        x: 0,
        positionTransitionMs: 0,
        emotionMotion: 'none',
      });
      schedule(
        'sitting',
        durationFromRandom(LUNCHMATE_PROFILE_SITTING_RANGE_MS, random),
        () => {
          beginSourceTransition('idle', 'front', () => {
            if (stopped || suspended) return;
            emit({
              ...snapshot,
              status: 'idle',
              activity: 'post-sitting-idle',
              facing: 'front',
              x: 0,
              positionTransitionMs: 0,
              emotionMotion: 'none',
            });
            schedule(
              'post-sitting-idle',
              durationFromRandom(LUNCHMATE_PROFILE_POST_SITTING_RANGE_MS, random),
              beginInitialIdle,
            );
          });
        },
      );
    });
  };

  const arriveAtCenter = () => {
    if (stopped || suspended || !visible || reducedMotion) return;
    if (frameTimer !== null) {
      clearInterval(frameTimer);
      frameTimer = null;
    }
    emit({ ...snapshot, x: 0, positionTransitionMs: 0 });
    const completedEdge = activeEdge ?? 'left';
    beginSourceTransition('idle', 'front', () => {
      if (stopped || suspended) return;
      emit({
        ...snapshot,
        status: 'idle',
        activity: 'center-pause',
        facing: 'front',
        x: 0,
        positionTransitionMs: 0,
        emotionMotion: 'none',
      });
      if (completedEdge === 'left') {
        schedule(
          'center-pause',
          durationFromRandom(LUNCHMATE_PROFILE_CENTER_PAUSE_RANGE_MS, random),
          () => departToEdge('right'),
        );
      } else {
        schedule(
          'pre-sitting-pause',
          durationFromRandom(LUNCHMATE_PROFILE_PRE_SITTING_RANGE_MS, random),
          beginSitting,
        );
      }
    });
  };

  const returnToCenter = () => {
    if (stopped || suspended || !visible || reducedMotion) return;
    const direction = activeEdge === 'left' ? 'walking-right' : 'walking-left';
    const facing = direction === 'walking-left' ? 'left' : 'right';
    beginSourceTransition(direction, facing, () => {
      beginWalking(
        direction,
        0,
        durationFromRandom(LUNCHMATE_PROFILE_WALK_DURATION_RANGE_MS, random),
        'walk-to-center',
        arriveAtCenter,
      );
    });
  };

  const arriveAtEdge = () => {
    if (stopped || suspended || !visible || reducedMotion) return;
    if (frameTimer !== null) {
      clearInterval(frameTimer);
      frameTimer = null;
    }
    const bounds = getBounds();
    const edgeX = activeEdge === 'left' ? bounds.minX : bounds.maxX;
    emit({
      ...snapshot,
      activity: 'edge-hold',
      x: edgeX,
      positionTransitionMs: 0,
    });
    schedule(
      'edge-hold',
      durationFromRandom(LUNCHMATE_PROFILE_EDGE_HOLD_RANGE_MS, random),
      returnToCenter,
    );
  };

  function departToEdge(edge: 'left' | 'right') {
    if (stopped || suspended || !visible || reducedMotion) return;
    activeEdge = edge;
    const direction = edge === 'left' ? 'walking-left' : 'walking-right';
    beginSourceTransition(direction, edge, () => {
      const bounds = getBounds();
      beginWalking(
        direction,
        edge === 'left' ? bounds.minX : bounds.maxX,
        durationFromRandom(LUNCHMATE_PROFILE_WALK_DURATION_RANGE_MS, random),
        'walk-to-edge',
        arriveAtEdge,
      );
    });
  }

  const finishInteractionNormalization = () => {
    if (stopped) return;
    if (suspended) {
      emit({
        ...INITIAL_PROFILE_MOTION,
        activity: 'suspended',
        interactionReady: true,
        animationsEnabled: visible && !reducedMotion,
      });
    } else {
      beginInitialIdle();
    }
  };

  const normalizeForInteraction = () => {
    clearTimers();
    pausedSchedule = null;
    scheduledStep = null;
    scheduledCallback = null;
    emit({
      ...snapshot,
      x: 0,
      positionTransitionMs: 0,
      emotionMotion: 'none',
      interactionReady: false,
    });
    if (snapshot.status === 'idle' && snapshot.facing === 'front') {
      finishInteractionNormalization();
      return;
    }
    beginSourceTransition('idle', 'front', finishInteractionNormalization);
  };

  const pause = () => {
    if (
      (scheduledStep === 'walk-to-edge' || scheduledStep === 'walk-to-center')
      && scheduledCallback
    ) {
      pausedSchedule = {
        kind: 'walking',
        step: scheduledStep,
        remainingMs: Math.max(0, deadline - now()),
        targetX: walkTargetX,
        direction: snapshot.status as 'walking-left' | 'walking-right',
        callback: scheduledCallback,
      };
      const currentX = clampX(currentWalkingX());
      clearTimers();
      scheduledStep = null;
      scheduledCallback = null;
      emit({
        ...snapshot,
        x: currentX,
        positionTransitionMs: 0,
        animationsEnabled: false,
      });
      return;
    }

    if (
      (scheduledStep === 'pose-first-half' || scheduledStep === 'pose-second-half')
      && scheduledCallback
    ) {
      pausedSchedule = {
        kind: 'pose',
        step: scheduledStep,
        remainingMs: Math.max(0, deadline - now()),
        targetScaleY: poseTargetScaleY,
        callback: scheduledCallback,
      };
      const currentScaleY = currentPoseScaleY();
      clearTimers();
      scheduledStep = null;
      scheduledCallback = null;
      emit({
        ...snapshot,
        scaleY: currentScaleY,
        poseTransitionMs: 0,
        animationsEnabled: false,
      });
      return;
    }

    if (scheduledStep && scheduledCallback) {
      pausedSchedule = {
        kind: 'timer',
        step: scheduledStep,
        remainingMs: Math.max(0, deadline - now()),
        callback: scheduledCallback,
      };
    }
    clearTimers();
    scheduledStep = null;
    scheduledCallback = null;
    emit({ ...snapshot, animationsEnabled: false });
  };

  const resume = () => {
    if (stopped || reducedMotion || grabPaused) return;
    const pending = pausedSchedule;
    pausedSchedule = null;
    emit({ ...snapshot, animationsEnabled: true });
    if (suspended && !pending) {
      normalizeForInteraction();
      return;
    }
    if (!pending) {
      beginInitialIdle();
      return;
    }
    if (pending.kind === 'walking') {
      beginWalking(
        pending.direction,
        pending.targetX,
        pending.remainingMs,
        pending.step,
        pending.callback,
      );
      return;
    }
    if (pending.kind === 'pose') {
      beginPoseHalf(
        pending.targetScaleY,
        pending.remainingMs,
        pending.step,
        pending.callback,
      );
      return;
    }
    schedule(pending.step, pending.remainingMs, pending.callback);
  };

  return {
    start() {
      if (started || stopped) return;
      started = true;
      emit({
        ...INITIAL_PROFILE_MOTION,
        activity: suspended ? 'suspended' : 'idle-wait',
        interactionReady: suspended,
        animationsEnabled: visible && !reducedMotion,
      });
      if (reducedMotion) return;
      if (suspended) return;
      if (visible) beginInitialIdle();
    },
    stop() {
      stopped = true;
      clearTimers();
      pausedSchedule = null;
      scheduledStep = null;
      scheduledCallback = null;
    },
    setVisible(nextVisible) {
      if (visible === nextVisible || stopped) return;
      visible = nextVisible;
      if (!visible) pause();
      else if (started) resume();
    },
    setSuspended(nextSuspended) {
      if (suspended === nextSuspended || stopped) return;
      suspended = nextSuspended;
      if (!started || reducedMotion) {
        emit({
          ...INITIAL_PROFILE_MOTION,
          activity: suspended ? 'suspended' : 'idle-wait',
          interactionReady: suspended,
          animationsEnabled: false,
        });
        return;
      }
      if (!visible) {
        clearTimers();
        pausedSchedule = null;
        emit({
          ...INITIAL_PROFILE_MOTION,
          activity: suspended ? 'suspended' : 'idle-wait',
          interactionReady: suspended,
          animationsEnabled: false,
        });
        return;
      }
      normalizeForInteraction();
    },
    setGrabPaused(nextPaused) {
      if (grabPaused === nextPaused || stopped) return;
      grabPaused = nextPaused;
      if (!started || reducedMotion || suspended || !visible) return;
      if (grabPaused) pause();
      else resume();
    },
    restart() {
      if (stopped) return;
      clearTimers();
      pausedSchedule = null;
      scheduledStep = null;
      scheduledCallback = null;
      activeEdge = null;
      grabPaused = false;
      if (reducedMotion || suspended || !visible || !started) {
        emit({
          ...INITIAL_PROFILE_MOTION,
          activity: suspended ? 'suspended' : 'idle-wait',
          interactionReady: suspended,
          animationsEnabled: false,
        });
        return;
      }
      beginInitialIdle();
    },
    remeasure() {
      if (stopped || !visible) return;
      if (scheduledStep === 'walk-to-edge' || scheduledStep === 'walk-to-center') {
        if (!scheduledCallback) return;
        const currentX = clampX(currentWalkingX());
        const remainingMs = Math.max(0, deadline - now());
        const direction = snapshot.status as 'walking-left' | 'walking-right';
        const step = scheduledStep;
        const callback = scheduledCallback;
        clearTimers();
        scheduledStep = null;
        scheduledCallback = null;
        emit({ ...snapshot, x: currentX, positionTransitionMs: 0 });
        const bounds = getBounds();
        const targetX = step === 'walk-to-center'
          ? 0
          : activeEdge === 'left'
            ? bounds.minX
            : bounds.maxX;
        beginWalking(direction, targetX, remainingMs, step, callback);
        return;
      }
      if (scheduledStep === 'pose-first-half' || scheduledStep === 'pose-second-half') {
        return;
      }
      const bounds = getBounds();
      const nextX = snapshot.x < 0
        ? bounds.minX
        : snapshot.x > 0
          ? bounds.maxX
          : 0;
      if (nextX !== snapshot.x) {
        emit({ ...snapshot, x: nextX, positionTransitionMs: 0 });
      }
    },
    getSnapshot() {
      return snapshot;
    },
  };
}

export type LunchmateProfileGrabPhase =
  | 'idle'
  | 'pressing'
  | 'grabbed'
  | 'landing'
  | 'recovering';

export interface LunchmateProfileGrabSnapshot {
  phase: LunchmateProfileGrabPhase;
  assetKeyOverride: 'grabbed' | 'idle' | null;
  x: number;
  y: number;
  rotate: number;
  scaleX: number;
  scaleY: number;
  transitionMs: number;
}

export interface LunchmateProfileGrabBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface LunchmateProfileRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

export interface LunchmateProfilePointerCaptureTarget {
  setPointerCapture: (pointerId: number) => void;
  releasePointerCapture: (pointerId: number) => void;
  hasPointerCapture?: (pointerId: number) => boolean;
}

export interface LunchmateProfileGrabPointer {
  pointerId: number;
  isPrimary: boolean;
  clientX: number;
  clientY: number;
  initialVisualX: number;
  initialVisualY?: number;
  target: LunchmateProfilePointerCaptureTarget;
}

export function readLunchmateProfileVisualOffset(
  moving: Pick<LunchmateProfileRect, 'left' | 'width' | 'bottom'> | null | undefined,
  anchor: Pick<LunchmateProfileRect, 'left' | 'width' | 'bottom'> | null | undefined,
) {
  if (!moving || !anchor) return null;
  return {
    x: (moving.left + (moving.width / 2)) - (anchor.left + (anchor.width / 2)),
    y: moving.bottom - anchor.bottom,
  };
}

export function parseLunchmateProfileTransform(transform: string | null | undefined) {
  if (!transform || transform === 'none') return { x: 0, y: 0 };
  if (typeof DOMMatrixReadOnly === 'function') {
    try {
      const matrix = new DOMMatrixReadOnly(transform);
      return { x: matrix.m41, y: matrix.m42 };
    } catch {
      // Fall through to the regex parser for Node test environments.
    }
  }
  const matrix3d = transform.match(/^matrix3d\((.+)\)$/);
  if (matrix3d) {
    const values = matrix3d[1].split(',').map(value => Number(value.trim()));
    if (values.length === 16 && values.every(Number.isFinite)) {
      return { x: values[12], y: values[13] };
    }
  }
  const matrix = transform.match(/^matrix\((.+)\)$/);
  if (matrix) {
    const values = matrix[1].split(',').map(value => Number(value.trim()));
    if (values.length === 6 && values.every(Number.isFinite)) {
      return { x: values[4], y: values[5] };
    }
  }
  return null;
}

export function readLunchmateProfileTransformOffset(element: HTMLElement | null | undefined) {
  if (!element || typeof getComputedStyle !== 'function') return null;
  return parseLunchmateProfileTransform(getComputedStyle(element).transform);
}

function snapMotionValue(value: MotionValue<number>, next: number) {
  const motion = value as MotionValue<number> & {
    jump?: (nextValue: number) => void;
    stop?: () => void;
  };
  motion.stop?.();
  if (typeof motion.jump === 'function') motion.jump(next);
  else motion.set(next);
}

export interface LunchmateProfileGrabTarget {
  x?: number;
  y?: number;
  rotate?: number;
  immediate?: boolean;
}

export interface LunchmateProfileGrabController {
  pointerDown: (pointer: LunchmateProfileGrabPointer) => boolean;
  pointerMove: (pointerId: number, clientX: number, clientY: number) => boolean;
  pointerUp: (pointerId: number) => boolean;
  pointerCancel: (pointerId: number) => boolean;
  lostPointerCapture: (pointerId: number) => boolean;
  setBlocked: (blocked: boolean) => void;
  setVisible: (visible: boolean) => void;
  remeasure: () => void;
  consumeClickSuppression: () => boolean;
  stop: () => void;
  getSnapshot: () => LunchmateProfileGrabSnapshot;
}

const INITIAL_PROFILE_GRAB: LunchmateProfileGrabSnapshot = {
  phase: 'idle',
  assetKeyOverride: null,
  x: 0,
  y: 0,
  rotate: 0,
  scaleX: 1,
  scaleY: 1,
  transitionMs: 0,
};

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function calculateLunchmateProfileGrabBounds(
  stage: LunchmateProfileRect,
  character: LunchmateProfileRect,
): LunchmateProfileGrabBounds {
  const horizontalInset = LUNCHMATE_PROFILE_GRAB_HORIZONTAL_PADDING_PX
    + LUNCHMATE_PROFILE_GRAB_ROTATION_ALLOWANCE_PX;
  const minX = Math.min(
    0,
    stage.left + horizontalInset - character.left,
  );
  const maxX = Math.max(
    0,
    stage.right - horizontalInset - character.right,
  );

  return {
    minX,
    maxX,
    minY: Math.min(
      0,
      stage.top + LUNCHMATE_PROFILE_GRAB_VERTICAL_PADDING_PX - character.top,
    ),
    maxY: Math.max(
      0,
      stage.bottom - LUNCHMATE_PROFILE_GRAB_VERTICAL_PADDING_PX - character.bottom,
    ),
  };
}

export function clampLunchmateProfileGrabOffset(
  x: number,
  y: number,
  bounds: LunchmateProfileGrabBounds,
) {
  return {
    x: clampValue(x, bounds.minX, bounds.maxX),
    y: clampValue(y, bounds.minY, bounds.maxY),
  };
}

interface LunchmateProfileGrabControllerOptions {
  getBounds: () => LunchmateProfileGrabBounds;
  getRendered: () => { x: number; y: number; rotate: number };
  toStageLocal: (clientX: number, clientY: number) => { x: number; y: number };
  onChange: (snapshot: LunchmateProfileGrabSnapshot) => void;
  onTargetChange: (target: LunchmateProfileGrabTarget) => void;
  onPauseAutomaticMotion: () => void;
  onResumeAutomaticMotion: () => void;
  onRestartAutomaticMotion: () => void;
  random?: () => number;
  now?: () => number;
  reducedMotion?: boolean;
  initiallyBlocked?: boolean;
  initiallyVisible?: boolean;
}

export function createLunchmateProfileGrabController({
  getBounds,
  getRendered,
  toStageLocal,
  onChange,
  onTargetChange,
  onPauseAutomaticMotion,
  onResumeAutomaticMotion,
  onRestartAutomaticMotion,
  random = Math.random,
  now = Date.now,
  reducedMotion = false,
  initiallyBlocked = false,
  initiallyVisible = true,
}: LunchmateProfileGrabControllerOptions): LunchmateProfileGrabController {
  let snapshot = { ...INITIAL_PROFILE_GRAB };
  let blocked = initiallyBlocked;
  let visible = initiallyVisible;
  let stopped = false;
  let activePointerId: number | null = null;
  let pointerStartLocalX = 0;
  let pointerStartLocalY = 0;
  let initialVisualX = 0;
  let captureTarget: LunchmateProfilePointerCaptureTarget | null = null;
  let activeBounds: LunchmateProfileGrabBounds | null = null;
  let lastPointerLocalX = 0;
  let lastPointerAt = 0;
  let filteredVelocityX = 0;
  let suppressNextClick = false;
  let prepareTimer: ReturnType<typeof setTimeout> | null = null;
  let activationTimer: ReturnType<typeof setTimeout> | null = null;
  let landingTimer: ReturnType<typeof setTimeout> | null = null;
  let pickupSwayTimer: ReturnType<typeof setTimeout> | null = null;
  let pickupSettleTimer: ReturnType<typeof setTimeout> | null = null;
  let velocitySettleTimer: ReturnType<typeof setTimeout> | null = null;

  const emit = (next: LunchmateProfileGrabSnapshot) => {
    snapshot = next;
    onChange(next);
  };

  const clearPressTimers = () => {
    if (prepareTimer !== null) clearTimeout(prepareTimer);
    if (activationTimer !== null) clearTimeout(activationTimer);
    prepareTimer = null;
    activationTimer = null;
  };

  const clearLandingTimers = () => {
    if (landingTimer !== null) clearTimeout(landingTimer);
    landingTimer = null;
  };

  const clearPendulumTimers = () => {
    if (pickupSwayTimer !== null) clearTimeout(pickupSwayTimer);
    if (pickupSettleTimer !== null) clearTimeout(pickupSettleTimer);
    if (velocitySettleTimer !== null) clearTimeout(velocitySettleTimer);
    pickupSwayTimer = null;
    pickupSettleTimer = null;
    velocitySettleTimer = null;
  };

  const releaseCapture = () => {
    if (captureTarget === null || activePointerId === null) return;
    try {
      if (
        captureTarget.hasPointerCapture === undefined
        || captureTarget.hasPointerCapture(activePointerId)
      ) {
        captureTarget.releasePointerCapture(activePointerId);
      }
    } catch {
      // Pointer가 브라우저에 의해 먼저 해제된 경우에도 상태 정리는 계속한다.
    }
  };

  const resetImmediately = (
    notify = true,
    automaticMotion: 'resume' | 'restart' | 'none' = 'resume',
  ) => {
    clearPressTimers();
    clearLandingTimers();
    clearPendulumTimers();
    releaseCapture();
    activePointerId = null;
    captureTarget = null;
    activeBounds = null;
    filteredVelocityX = 0;
    onTargetChange({ x: 0, y: 0, rotate: 0, immediate: true });
    snapshot = { ...INITIAL_PROFILE_GRAB };
    if (notify) onChange(snapshot);
    if (automaticMotion === 'resume') onResumeAutomaticMotion();
    else if (automaticMotion === 'restart') onRestartAutomaticMotion();
  };

  const finishLanding = () => {
    if (stopped) return;
    onTargetChange({ x: 0, y: 0, rotate: 0, immediate: true });
    emit({ ...INITIAL_PROFILE_GRAB });
    onRestartAutomaticMotion();
  };

  const beginLanding = () => {
    clearPressTimers();
    clearPendulumTimers();
    releaseCapture();
    activePointerId = null;
    captureTarget = null;
    activeBounds = null;
    suppressNextClick = true;

    if (reducedMotion) {
      resetImmediately(true, 'restart');
      return;
    }

    const halfLandingMs = Math.floor(LUNCHMATE_PROFILE_GRAB_LANDING_MS / 2);
    const rendered = getRendered();
    const landingOvershoot = clampValue(
      -rendered.rotate * 0.35,
      -3,
      3,
    );
    onTargetChange({
      x: 0,
      y: 0,
      rotate: landingOvershoot,
    });
    emit({
      ...snapshot,
      phase: 'landing',
      assetKeyOverride: 'grabbed',
      x: 0,
      y: 0,
      rotate: landingOvershoot,
      scaleX: 1.03,
      scaleY: 0.95,
      transitionMs: halfLandingMs,
    });
    landingTimer = setTimeout(() => {
      landingTimer = null;
      onTargetChange({ rotate: 0 });
      emit({
        ...snapshot,
        phase: 'landing',
        assetKeyOverride: 'idle',
        x: 0,
        y: 0,
        rotate: 0,
        scaleX: 1,
        scaleY: 1,
        transitionMs: LUNCHMATE_PROFILE_GRAB_LANDING_MS - halfLandingMs,
      });
      landingTimer = setTimeout(() => {
        landingTimer = null;
        finishLanding();
      }, LUNCHMATE_PROFILE_GRAB_LANDING_MS - halfLandingMs);
    }, halfLandingMs);
  };

  const activateGrab = () => {
    clearPressTimers();
    if (
      stopped
      || blocked
      || !visible
      || activePointerId === null
      || captureTarget === null
      || snapshot.phase !== 'pressing'
    ) {
      resetImmediately();
      return false;
    }
    try {
      if (
        captureTarget.hasPointerCapture === undefined
        || !captureTarget.hasPointerCapture(activePointerId)
      ) {
        captureTarget.setPointerCapture(activePointerId);
      }
    } catch {
      resetImmediately();
      return false;
    }
    const bounds = getBounds();
    activeBounds = bounds;
    const startX = clampValue(initialVisualX, bounds.minX, bounds.maxX);
    const lifted = clampLunchmateProfileGrabOffset(
      startX,
      -LUNCHMATE_PROFILE_GRAB_LIFT_PX,
      bounds,
    );
    // outer auto wrapper가 0으로 바뀌기 전에 동일한 시각 위치를 spring에 주입한다.
    onTargetChange({ x: startX, y: 0, rotate: 0, immediate: true });
    onTargetChange({
      y: lifted.y,
      rotate: reducedMotion ? 0 : 5,
    });
    emit({
      phase: 'grabbed',
      assetKeyOverride: 'grabbed',
      x: lifted.x,
      y: lifted.y,
      rotate: reducedMotion ? 0 : 5,
      scaleX: reducedMotion ? 1 : LUNCHMATE_PROFILE_GRAB_MAX_SCALE,
      scaleY: reducedMotion ? 1 : LUNCHMATE_PROFILE_GRAB_MAX_SCALE,
      transitionMs: reducedMotion ? 0 : LUNCHMATE_PROFILE_LONG_PRESS_PREPARE_MS,
    });
    suppressNextClick = true;
    lastPointerLocalX = pointerStartLocalX;
    lastPointerAt = now();
    filteredVelocityX = 0;

    if (!reducedMotion) {
      pickupSwayTimer = setTimeout(() => {
        pickupSwayTimer = null;
        if (snapshot.phase !== 'grabbed') return;
        onTargetChange({ rotate: -3 });
      }, 180);
      pickupSettleTimer = setTimeout(() => {
        pickupSettleTimer = null;
        if (snapshot.phase !== 'grabbed') return;
        onTargetChange({ rotate: 0 });
      }, 360);
    }
    return true;
  };

  return {
    pointerDown(pointer) {
      if (
        stopped
        || blocked
        || !visible
        || !pointer.isPrimary
        || snapshot.phase === 'pressing'
        || snapshot.phase === 'grabbed'
      ) return false;

      // 놓기/복귀 애니메이션은 새 입력보다 우선하지 않는다. 사용자가 다시 잡으면
      // 남은 landing/recovering timer를 즉시 끊고 현재 제스처를 시작한다.
      const interruptVisual = snapshot.phase === 'landing' || snapshot.phase === 'recovering'
        ? {
            x: pointer.initialVisualX,
            y: pointer.initialVisualY ?? getRendered().y,
            rotate: getRendered().rotate,
          }
        : null;
      if (interruptVisual) {
        clearPressTimers();
        clearLandingTimers();
        clearPendulumTimers();
        releaseCapture();
        activePointerId = null;
        captureTarget = null;
        activeBounds = null;
        filteredVelocityX = 0;
        // 화면에서 보이는 위치를 그대로 고정한 뒤 다시 잡아 snap-back을 막는다.
        // spring.get()이 페인트보다 먼저 착지점(0)에 도달해도 DOM offset을 쓴다.
        onTargetChange({ ...interruptVisual, immediate: true });
      }

      activePointerId = pointer.pointerId;
      const localPointer = toStageLocal(pointer.clientX, pointer.clientY);
      pointerStartLocalX = localPointer.x;
      pointerStartLocalY = localPointer.y;
      initialVisualX = pointer.initialVisualX;
      captureTarget = pointer.target;
      suppressNextClick = false;
      try {
        // pointerdown 시점부터 소유권을 확보해 빠른 이동이나 캐릭터 경계 이탈에도
        // pointermove/up을 놓치지 않는다.
        captureTarget.setPointerCapture(activePointerId);
      } catch {
        resetImmediately();
        return false;
      }
      onPauseAutomaticMotion();
      emit({
        ...INITIAL_PROFILE_GRAB,
        phase: 'pressing',
        x: interruptVisual?.x ?? 0,
        y: interruptVisual?.y ?? 0,
        rotate: interruptVisual?.rotate ?? 0,
        scaleX: reducedMotion ? 1 : 1.015,
        scaleY: reducedMotion ? 1 : 0.985,
        transitionMs: reducedMotion ? 0 : LUNCHMATE_PROFILE_LONG_PRESS_PREPARE_MS,
      });

      if (!reducedMotion) {
        prepareTimer = setTimeout(() => {
          prepareTimer = null;
          if (snapshot.phase !== 'pressing') return;
          emit({
            ...snapshot,
            scaleY: 0.97,
            transitionMs: LUNCHMATE_PROFILE_LONG_PRESS_PREPARE_MS,
          });
        }, LUNCHMATE_PROFILE_LONG_PRESS_MS - LUNCHMATE_PROFILE_LONG_PRESS_PREPARE_MS);
      }
      activationTimer = setTimeout(activateGrab, LUNCHMATE_PROFILE_LONG_PRESS_MS);
      return true;
    },
    pointerMove(pointerId, clientX, clientY) {
      if (stopped || pointerId !== activePointerId) return false;
      const localPointer = toStageLocal(clientX, clientY);
      const deltaX = localPointer.x - pointerStartLocalX;
      const deltaY = localPointer.y - pointerStartLocalY;
      if (snapshot.phase === 'pressing') {
        if (Math.hypot(deltaX, deltaY) < LUNCHMATE_PROFILE_LONG_PRESS_MOVE_THRESHOLD_PX) {
          return false;
        }
        // 빠르게 끌기 시작한 포인터도 즉시 잡기로 전환한다. 정지한 포인터의
        // 400ms long-press 진입은 그대로 유지해 touch 사용성도 보존한다.
        if (!activateGrab()) return false;
      }
      if (snapshot.phase !== 'grabbed') return false;

      clearPendulumTimers();
      const bounds = activeBounds ?? getBounds();
      const nextOffset = clampLunchmateProfileGrabOffset(
        initialVisualX + deltaX,
        deltaY - LUNCHMATE_PROFILE_GRAB_LIFT_PX,
        bounds,
      );
      const sampleTime = now();
      const elapsedMs = Math.max(8, sampleTime - lastPointerAt);
      const rawVelocityX = (localPointer.x - lastPointerLocalX) / elapsedMs;
      filteredVelocityX = (filteredVelocityX * 0.65) + (rawVelocityX * 0.35);
      const nextRotate = reducedMotion
        || Math.abs(filteredVelocityX) < LUNCHMATE_PROFILE_GRAB_VELOCITY_NOISE_THRESHOLD
        ? 0
        : clampValue(
            -filteredVelocityX * LUNCHMATE_PROFILE_GRAB_VELOCITY_TO_ANGLE,
            -LUNCHMATE_PROFILE_GRAB_MAX_ROTATE_DEG,
            LUNCHMATE_PROFILE_GRAB_MAX_ROTATE_DEG,
          );
      snapshot = {
        ...snapshot,
        x: nextOffset.x,
        y: nextOffset.y,
        rotate: nextRotate,
        transitionMs: 0,
      };
      onTargetChange({
        x: nextOffset.x,
        y: nextOffset.y,
        rotate: nextRotate,
        immediate: reducedMotion,
      });
      lastPointerLocalX = localPointer.x;
      lastPointerAt = sampleTime;
      suppressNextClick = true;
      if (!reducedMotion) {
        velocitySettleTimer = setTimeout(() => {
          velocitySettleTimer = null;
          if (snapshot.phase !== 'grabbed') return;
          filteredVelocityX = 0;
          onTargetChange({ rotate: 0 });
        }, LUNCHMATE_PROFILE_GRAB_SETTLE_DELAY_MS);
      }
      return true;
    },
    pointerUp(pointerId) {
      if (pointerId !== activePointerId || stopped) return false;
      if (snapshot.phase === 'pressing') {
        resetImmediately(true, 'resume');
        return false;
      }
      if (snapshot.phase !== 'grabbed') return false;
      beginLanding();
      return true;
    },
    pointerCancel(pointerId) {
      if (pointerId !== activePointerId || stopped) return false;
      if (snapshot.phase === 'grabbed') beginLanding();
      else resetImmediately(true, 'resume');
      return true;
    },
    lostPointerCapture(pointerId) {
      if (pointerId !== activePointerId || stopped) return false;
      if (snapshot.phase === 'grabbed') beginLanding();
      else resetImmediately(true, 'resume');
      return true;
    },
    setBlocked(nextBlocked) {
      blocked = nextBlocked;
      if (blocked && snapshot.phase !== 'idle') resetImmediately(true, 'resume');
    },
    setVisible(nextVisible) {
      visible = nextVisible;
      if (!visible && snapshot.phase !== 'idle') {
        resetImmediately(true, 'resume');
      }
    },
    remeasure() {
      if (snapshot.phase !== 'grabbed') return;
      activeBounds = getBounds();
      const nextOffset = clampLunchmateProfileGrabOffset(
        snapshot.x,
        snapshot.y,
        activeBounds,
      );
      if (nextOffset.x !== snapshot.x || nextOffset.y !== snapshot.y) {
        snapshot = {
          ...snapshot,
          x: nextOffset.x,
          y: nextOffset.y,
          transitionMs: 0,
        };
        onTargetChange({
          x: nextOffset.x,
          y: nextOffset.y,
          immediate: reducedMotion,
        });
      }
    },
    consumeClickSuppression() {
      const shouldSuppress = suppressNextClick;
      suppressNextClick = false;
      return shouldSuppress;
    },
    stop() {
      stopped = true;
      clearPressTimers();
      clearLandingTimers();
      clearPendulumTimers();
      releaseCapture();
      activePointerId = null;
      captureTarget = null;
    },
    getSnapshot() {
      return snapshot;
    },
  };
}

function preloadLunchmateProfileMotionAssets() {
  if (typeof Image === 'undefined') return;
  PROFILE_MOTION_ASSET_KEYS.forEach((assetKey) => {
    const source = lunchmateChickenAssets[assetKey];
    const image = new Image();
    image.srcset = source.srcSet;
    image.src = source.src;
  });
}

interface UseLunchmateProfileMotionOptions {
  suspended: boolean;
  /** 자동 모션 정지와 별개로 실제 pointer grab을 막아야 하는 상태. */
  grabBlocked?: boolean;
}

type LunchmateProfileMotionValue = Omit<
  LunchmateProfileMotionSnapshot,
  'emotionMotion'
> & {
  stageRef: RefObject<HTMLDivElement | null>;
  characterRef: RefObject<HTMLDivElement | null>;
  assetKey: LunchmateChickenAssetKey;
  motionReady: boolean;
  reducedMotion: boolean;
  emotionMotion: LunchmateRoomEmotionMotion;
  grab: LunchmateProfileGrabSnapshot & {
    isActive: boolean;
    hasVisualControl: boolean;
    positionX: MotionValue<number>;
    positionY: MotionValue<number>;
    pendulumRotate: MotionValue<number>;
    handlePointerDown: (
      pointer: Omit<LunchmateProfileGrabPointer, 'initialVisualX' | 'initialVisualY'>,
    ) => boolean;
    handlePointerMove: (
      pointerId: number,
      clientX: number,
      clientY: number,
    ) => boolean;
    handlePointerUp: (pointerId: number) => boolean;
    handlePointerCancel: (pointerId: number) => boolean;
    handleLostPointerCapture: (pointerId: number) => boolean;
    consumeClickSuppression: () => boolean;
  };
  handleCharacterImageLoad: () => void;
};

export function useLunchmateProfileMotion({
  suspended,
  grabBlocked = suspended,
}: UseLunchmateProfileMotionOptions): LunchmateProfileMotionValue {
  const stageRef = useRef<HTMLDivElement>(null);
  const characterRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<LunchmateProfileMotionController | null>(null);
  const grabControllerRef = useRef<LunchmateProfileGrabController | null>(null);
  const measureRef = useRef<() => void>(() => undefined);
  const lastMeasurementRef = useRef({ stageWidth: 0, characterWidth: 0 });
  const imageLoadFrameRef = useRef<number | null>(null);
  const grabBoundsRef = useRef<LunchmateProfileGrabBounds>({
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
  });
  const reducedMotion = useReducedMotion() ?? false;
  const [motionReady, setMotionReady] = useState(false);
  const [snapshot, setSnapshot] = useState<LunchmateProfileMotionSnapshot>(
    INITIAL_PROFILE_MOTION,
  );
  const [grabSnapshot, setGrabSnapshot] = useState<LunchmateProfileGrabSnapshot>(
    INITIAL_PROFILE_GRAB,
  );
  const grabTargetX = useMotionValue(0);
  const grabTargetY = useMotionValue(0);
  const grabTargetRotate = useMotionValue(0);
  const grabSpringX = useSpring(grabTargetX, {
    stiffness: 310,
    damping: 27,
    mass: 0.8,
  });
  const grabSpringY = useSpring(grabTargetY, {
    stiffness: 310,
    damping: 27,
    mass: 0.8,
  });
  const grabSpringRotate = useSpring(grabTargetRotate, {
    stiffness: 170,
    damping: 13,
    mass: 0.9,
  });
  const clampedGrabSpringX = useTransform(
    grabSpringX,
    value => clampValue(
      value,
      grabBoundsRef.current.minX,
      grabBoundsRef.current.maxX,
    ),
  );
  const clampedGrabSpringY = useTransform(
    grabSpringY,
    value => clampValue(
      value,
      grabBoundsRef.current.minY,
      grabBoundsRef.current.maxY,
    ),
  );
  const clampedGrabSpringRotate = useTransform(
    grabSpringRotate,
    value => clampValue(
      value,
      -LUNCHMATE_PROFILE_GRAB_HARD_ROTATE_LIMIT_DEG,
      LUNCHMATE_PROFILE_GRAB_HARD_ROTATE_LIMIT_DEG,
    ),
  );

  useEffect(() => {
    preloadLunchmateProfileMotionAssets();
  }, []);

  useEffect(() => {
    const grabController = createLunchmateProfileGrabController({
      getBounds: () => {
        const stage = stageRef.current?.getBoundingClientRect();
        const renderedCharacter = characterRef.current?.getBoundingClientRect();
        const fixedAnchor = stageRef.current?.querySelector<HTMLElement>(
          '[data-lunchmate-profile-grab-anchor="true"]',
        )?.getBoundingClientRect();
        if (!stage || !renderedCharacter || !fixedAnchor) {
          const emptyBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
          grabBoundsRef.current = emptyBounds;
          return emptyBounds;
        }
        // transform된 실제 rect 대신 고정 drop anchor에서 중앙 기준 rect를 복원한다.
        const characterWidth = characterRef.current?.offsetWidth
          || renderedCharacter.width;
        const characterHeight = characterRef.current?.offsetHeight
          || renderedCharacter.height;
        const characterLeft = fixedAnchor.left + ((fixedAnchor.width - characterWidth) / 2);
        const characterBottom = fixedAnchor.bottom;
        const character: LunchmateProfileRect = {
          left: characterLeft,
          right: characterLeft + characterWidth,
          top: characterBottom - characterHeight,
          bottom: characterBottom,
          width: characterWidth,
          height: characterHeight,
        };
        const nextBounds = calculateLunchmateProfileGrabBounds(stage, character);
        grabBoundsRef.current = nextBounds;
        return nextBounds;
      },
      getRendered: () => ({
        x: clampedGrabSpringX.get(),
        y: clampedGrabSpringY.get(),
        rotate: clampedGrabSpringRotate.get(),
      }),
      toStageLocal: (clientX, clientY) => {
        const stage = stageRef.current?.getBoundingClientRect();
        return stage
          ? { x: clientX - stage.left, y: clientY - stage.top }
          : { x: clientX, y: clientY };
      },
      onChange: setGrabSnapshot,
      onTargetChange: ({ x, y, rotate, immediate }) => {
        if (x !== undefined) {
          grabTargetX.set(x);
          if (immediate) snapMotionValue(grabSpringX, x);
        }
        if (y !== undefined) {
          grabTargetY.set(y);
          if (immediate) snapMotionValue(grabSpringY, y);
        }
        if (rotate !== undefined) {
          grabTargetRotate.set(rotate);
          if (immediate) snapMotionValue(grabSpringRotate, rotate);
        }
      },
      onPauseAutomaticMotion: () => controllerRef.current?.setGrabPaused(true),
      onResumeAutomaticMotion: () => controllerRef.current?.setGrabPaused(false),
      onRestartAutomaticMotion: () => controllerRef.current?.restart(),
      reducedMotion,
      initiallyBlocked: grabBlocked,
      initiallyVisible: typeof document === 'undefined'
        || document.visibilityState !== 'hidden',
    });
    grabControllerRef.current = grabController;
    const handleVisibilityChange = () => {
      grabController.setVisible(document.visibilityState !== 'hidden');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      grabController.stop();
      if (grabControllerRef.current === grabController) {
        grabControllerRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    grabSpringRotate,
    grabSpringX,
    grabSpringY,
    grabTargetRotate,
    grabTargetX,
    grabTargetY,
    clampedGrabSpringRotate,
    clampedGrabSpringX,
    clampedGrabSpringY,
    reducedMotion,
  ]);

  useEffect(() => {
    grabControllerRef.current?.setBlocked(grabBlocked);
  }, [grabBlocked]);

  useLayoutEffect(() => {
    const measure = () => {
      const stageWidth = stageRef.current?.getBoundingClientRect().width ?? 0;
      const characterWidth = characterRef.current?.offsetWidth ?? 0;
      if (!hasLunchmateProfileMeasurements(stageWidth, characterWidth)) return;
      const changed = stageWidth !== lastMeasurementRef.current.stageWidth
        || characterWidth !== lastMeasurementRef.current.characterWidth;
      lastMeasurementRef.current = { stageWidth, characterWidth };
      setMotionReady(true);
      if (changed) controllerRef.current?.remeasure();
      grabControllerRef.current?.remeasure();
    };
    measureRef.current = measure;
    const cancelInitialMeasurement = scheduleLunchmateProfileInitialMeasurement(measure);
    const handleResize = () => measure();
    window.addEventListener('resize', handleResize);
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(measure);
    if (resizeObserver && stageRef.current && characterRef.current) {
      resizeObserver.observe(stageRef.current);
      resizeObserver.observe(characterRef.current);
    }

    return () => {
      cancelInitialMeasurement();
      if (imageLoadFrameRef.current !== null) {
        cancelAnimationFrame(imageLoadFrameRef.current);
        imageLoadFrameRef.current = null;
      }
      measureRef.current = () => undefined;
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!motionReady) return undefined;
    const controller = createLunchmateProfileMotionController({
      getBounds: () => calculateLunchmateProfileTravelBounds(
        stageRef.current?.getBoundingClientRect().width ?? 0,
        characterRef.current?.getBoundingClientRect().width ?? 0,
      ),
      onChange: setSnapshot,
      reducedMotion,
      initiallyVisible: typeof document === 'undefined'
        || document.visibilityState !== 'hidden',
      initiallySuspended: suspended,
    });
    controllerRef.current = controller;
    const handleVisibilityChange = () => {
      controller.setVisible(document.visibilityState !== 'hidden');
    };
    controller.start();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      controller.stop();
      if (controllerRef.current === controller) controllerRef.current = null;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [motionReady, reducedMotion]);

  useEffect(() => {
    controllerRef.current?.setSuspended(suspended);
  }, [suspended]);

  const handleCharacterImageLoad = useCallback(() => {
    measureRef.current();
    if (
      typeof requestAnimationFrame !== 'function'
      || typeof cancelAnimationFrame !== 'function'
    ) return;
    if (imageLoadFrameRef.current !== null) {
      cancelAnimationFrame(imageLoadFrameRef.current);
    }
    imageLoadFrameRef.current = requestAnimationFrame(() => {
      imageLoadFrameRef.current = null;
      measureRef.current();
    });
  }, []);

  const emotionMotion = useMemo(
    () => resolveLunchmateRoomEmotionMotion(
      snapshot.emotionMotion,
      snapshot.animationsEnabled && !reducedMotion,
    ),
    [reducedMotion, snapshot.animationsEnabled, snapshot.emotionMotion],
  );

  const handleGrabPointerDown = useCallback(
    (pointer: Omit<LunchmateProfileGrabPointer, 'initialVisualX' | 'initialVisualY'>) => {
      const movingLayerEl = stageRef.current?.querySelector<HTMLElement>(
        '[data-lunchmate-profile-grab-position="true"]',
      );
      const renderedCharacter = characterRef.current?.getBoundingClientRect();
      const fixedAnchor = stageRef.current?.querySelector<HTMLElement>(
        '[data-lunchmate-profile-grab-anchor="true"]',
      )?.getBoundingClientRect();
      const visualOffset = readLunchmateProfileTransformOffset(movingLayerEl)
        ?? readLunchmateProfileVisualOffset(movingLayerEl?.getBoundingClientRect(), fixedAnchor)
        ?? readLunchmateProfileVisualOffset(renderedCharacter, fixedAnchor);
      return grabControllerRef.current?.pointerDown({
        ...pointer,
        initialVisualX: visualOffset?.x ?? snapshot.x,
        initialVisualY: visualOffset?.y ?? 0,
      }) ?? false;
    },
    [snapshot.x],
  );
  const handleGrabPointerMove = useCallback(
    (pointerId: number, clientX: number, clientY: number) => (
      grabControllerRef.current?.pointerMove(pointerId, clientX, clientY) ?? false
    ),
    [],
  );
  const handleGrabPointerUp = useCallback(
    (pointerId: number) => (
      grabControllerRef.current?.pointerUp(pointerId) ?? false
    ),
    [],
  );
  const handleGrabPointerCancel = useCallback(
    (pointerId: number) => (
      grabControllerRef.current?.pointerCancel(pointerId) ?? false
    ),
    [],
  );
  const handleGrabLostPointerCapture = useCallback(
    (pointerId: number) => (
      grabControllerRef.current?.lostPointerCapture(pointerId) ?? false
    ),
    [],
  );

  return {
    ...snapshot,
    stageRef,
    characterRef,
    assetKey: resolveLunchmateProfileAssetKey(
      snapshot.status,
      snapshot.facing,
      snapshot.frame,
    ),
    motionReady,
    reducedMotion,
    emotionMotion,
    grab: {
      ...grabSnapshot,
      isActive: grabSnapshot.phase !== 'idle',
      hasVisualControl: grabSnapshot.phase === 'grabbed'
        || grabSnapshot.phase === 'landing'
        || grabSnapshot.phase === 'recovering'
        || (
          grabSnapshot.phase === 'pressing'
          && (grabSnapshot.x !== 0 || grabSnapshot.y !== 0)
        ),
      positionX: reducedMotion ? grabTargetX : clampedGrabSpringX,
      positionY: reducedMotion ? grabTargetY : clampedGrabSpringY,
      pendulumRotate: reducedMotion
        ? grabTargetRotate
        : clampedGrabSpringRotate,
      handlePointerDown: handleGrabPointerDown,
      handlePointerMove: handleGrabPointerMove,
      handlePointerUp: handleGrabPointerUp,
      handlePointerCancel: handleGrabPointerCancel,
      handleLostPointerCapture: handleGrabLostPointerCapture,
      consumeClickSuppression: () => (
        grabControllerRef.current?.consumeClickSuppression() ?? false
      ),
    },
    handleCharacterImageLoad,
  };
}
