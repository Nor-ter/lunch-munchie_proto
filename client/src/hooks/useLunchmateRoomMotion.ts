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
  useReducedMotion,
  type TargetAndTransition,
  type Transition,
} from 'framer-motion';
import {
  lunchmateChickenAssets,
  type LunchmateChickenAssetKey,
} from '@/constants/lunchmateAssets';

export type LunchmateRoomEmotion = 'happy' | 'surprised' | 'sleepy' | 'crying';
export type LunchmateRoomWalkingState = 'walking-left' | 'walking-right';
export type LunchmateRoomTurningState =
  | 'turning-left'
  | 'turning-right'
  | 'turning-front';
export type LunchmateRoomMotionStatus =
  | 'idle'
  | LunchmateRoomWalkingState
  | LunchmateRoomTurningState
  | LunchmateRoomEmotion;
export type LunchmateRoomWalkFrame = 1 | 2;
export type LunchmateRoomFacing = 'front' | 'left' | 'right';
export type LunchmateRoomWaypoint = 'center' | 'left' | 'right';
export type LunchmateRoomEmotionMotionId = 'none' | LunchmateRoomEmotion;
export type LunchmateRoomMotionActivity =
  | 'center-idle'
  | 'center-settle'
  | 'emotion-pose-transition'
  | 'center-emotion'
  | 'turning'
  | 'walking'
  | 'edge-hold';

export interface LunchmateRoomMotionSnapshot {
  status: LunchmateRoomMotionStatus;
  activity: LunchmateRoomMotionActivity;
  waypoint: LunchmateRoomWaypoint;
  facing: LunchmateRoomFacing;
  x: number;
  frame: LunchmateRoomWalkFrame;
  scaleX: number;
  scaleY: number;
  positionTransitionMs: number;
  poseTransitionMs: number;
  emotionMotion: LunchmateRoomEmotionMotionId;
  animationsEnabled: boolean;
}

export interface LunchmateRoomTravelBounds {
  minX: number;
  maxX: number;
}

export interface LunchmateRoomEmotionMotion {
  id: LunchmateRoomEmotionMotionId;
  animate: TargetAndTransition;
  transition: Transition;
}

export const LUNCHMATE_ROOM_EDGE_GAP_PX = 16;
export const LUNCHMATE_ROOM_CENTER_STAY_RANGE_MS = [5000, 8000] as const;
export const LUNCHMATE_ROOM_CENTER_MIN_IDLE_MS = 3000;
export const LUNCHMATE_ROOM_CENTER_POST_EMOTION_MS = 300;
export const LUNCHMATE_ROOM_CENTER_SETTLE_RANGE_MS = [450, 650] as const;
export const LUNCHMATE_ROOM_TURN_DURATION_RANGE_MS = [160, 200] as const;
export const LUNCHMATE_ROOM_EMOTION_POSE_TRANSITION_RANGE_MS = [140, 180] as const;
export const LUNCHMATE_ROOM_WALK_DURATION_RANGE_MS = [1800, 2300] as const;
export const LUNCHMATE_ROOM_EDGE_HOLD_RANGE_MS = [800, 1200] as const;
export const LUNCHMATE_ROOM_EMOTION_DURATION_RANGE_MS = [1800, 2300] as const;
export const LUNCHMATE_ROOM_WALK_FRAME_MS = 200;

export const LUNCHMATE_ROOM_MOTION_ASSET_KEYS = [
  'idle',
  'side-walk-left-1',
  'side-walk-left-2',
  'side-walk-right-1',
  'side-walk-right-2',
  'happy',
  'surprised',
  'sleepy',
  'crying',
] as const satisfies readonly LunchmateChickenAssetKey[];

const INITIAL_ROOM_MOTION: LunchmateRoomMotionSnapshot = {
  status: 'idle',
  activity: 'center-idle',
  waypoint: 'center',
  facing: 'front',
  x: 0,
  frame: 1,
  scaleX: 1,
  scaleY: 1,
  positionTransitionMs: 0,
  poseTransitionMs: 0,
  emotionMotion: 'none',
  animationsEnabled: true,
};

const EMOTION_WEIGHTS: readonly {
  emotion: LunchmateRoomEmotion;
  weight: number;
}[] = [
  { emotion: 'happy', weight: 0.4 },
  { emotion: 'surprised', weight: 0.25 },
  { emotion: 'sleepy', weight: 0.25 },
  { emotion: 'crying', weight: 0.1 },
];

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

export interface LunchmateRoomCenterStayPlan {
  totalMs: number;
  settleMs: number;
  poseInMs: number;
  emotionMs: number;
  poseOutMs: number;
  postEmotionIdleMs: number;
}

export function createLunchmateRoomCenterStayPlan(
  random: () => number,
  initialCenter = false,
): LunchmateRoomCenterStayPlan {
  const settleMs = initialCenter
    ? LUNCHMATE_ROOM_CENTER_MIN_IDLE_MS
    : durationFromRandom(LUNCHMATE_ROOM_CENTER_SETTLE_RANGE_MS, random);
  const poseInMs = durationFromRandom(
    LUNCHMATE_ROOM_EMOTION_POSE_TRANSITION_RANGE_MS,
    random,
  );
  const emotionMs = durationFromRandom(
    LUNCHMATE_ROOM_EMOTION_DURATION_RANGE_MS,
    random,
  );
  const poseOutMs = durationFromRandom(
    LUNCHMATE_ROOM_EMOTION_POSE_TRANSITION_RANGE_MS,
    random,
  );
  const minimumTotalMs = Math.max(
    LUNCHMATE_ROOM_CENTER_STAY_RANGE_MS[0],
    settleMs
      + poseInMs
      + emotionMs
      + poseOutMs
      + LUNCHMATE_ROOM_CENTER_POST_EMOTION_MS,
  );
  const totalMs = Math.round(
    minimumTotalMs
      + ((LUNCHMATE_ROOM_CENTER_STAY_RANGE_MS[1] - minimumTotalMs)
        * clampRandom(random())),
  );

  return {
    totalMs,
    settleMs,
    poseInMs,
    emotionMs,
    poseOutMs,
    postEmotionIdleMs: totalMs
      - settleMs
      - poseInMs
      - emotionMs
      - poseOutMs,
  };
}

export function calculateLunchmateRoomTravelBounds(
  stageWidth: number,
  characterWidth: number,
  edgeGap = LUNCHMATE_ROOM_EDGE_GAP_PX,
): LunchmateRoomTravelBounds {
  const safeStageWidth = Number.isFinite(stageWidth) ? Math.max(0, stageWidth) : 0;
  const safeCharacterWidth = Number.isFinite(characterWidth)
    ? Math.max(0, characterWidth)
    : 0;
  const safeGap = Number.isFinite(edgeGap) ? Math.max(0, edgeGap) : 0;
  const travel = Math.max(0, (safeStageWidth - safeCharacterWidth) / 2 - safeGap);

  return { minX: travel === 0 ? 0 : -travel, maxX: travel };
}

export function hasLunchmateRoomMeasurements(
  stageWidth: number,
  characterWidth: number,
) {
  return Number.isFinite(stageWidth)
    && stageWidth > 0
    && Number.isFinite(characterWidth)
    && characterWidth > 0;
}

export function scheduleLunchmateRoomInitialMeasurement(
  measure: () => void,
) {
  measure();
  if (
    typeof requestAnimationFrame !== 'function'
    || typeof cancelAnimationFrame !== 'function'
  ) return () => undefined;

  const frameId = requestAnimationFrame(measure);
  return () => cancelAnimationFrame(frameId);
}

export function selectLunchmateRoomEmotion(
  randomValue: number,
  previousEmotion: LunchmateRoomEmotion | null,
  excludeCrying = false,
): LunchmateRoomEmotion {
  const candidates = EMOTION_WEIGHTS.filter(candidate => (
    candidate.emotion !== previousEmotion
    && (!excludeCrying || candidate.emotion !== 'crying')
  ));
  const totalWeight = candidates.reduce((total, candidate) => total + candidate.weight, 0);
  const target = clampRandom(randomValue) * totalWeight;
  let accumulated = 0;

  for (const candidate of candidates) {
    accumulated += candidate.weight;
    if (target < accumulated) return candidate.emotion;
  }

  return candidates[candidates.length - 1].emotion;
}

export function resolveLunchmateRoomAssetKey(
  status: LunchmateRoomMotionStatus,
  frame: LunchmateRoomWalkFrame,
  facing: LunchmateRoomFacing = 'front',
): LunchmateChickenAssetKey {
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

const NEUTRAL_EMOTION_TARGET: TargetAndTransition = {
  x: 0,
  y: 0,
  rotate: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
};

export function resolveLunchmateRoomEmotionMotion(
  emotion: LunchmateRoomEmotionMotionId,
  animationsEnabled = true,
): LunchmateRoomEmotionMotion {
  if (!animationsEnabled || emotion === 'none') {
    return {
      id: 'none',
      animate: NEUTRAL_EMOTION_TARGET,
      transition: { duration: 0 },
    };
  }

  if (emotion === 'happy') {
    return {
      id: emotion,
      animate: {
        x: 0,
        y: [0, 1, -3, -1, 0],
        rotate: [0, 0, -1.5, 1, 0],
        scale: 1,
        scaleX: [1, 1.02, 0.99, 1, 1],
        scaleY: [1, 0.96, 1.02, 1, 1],
      },
      transition: {
        duration: 0.7,
        times: [0, 0.2, 0.48, 0.72, 1],
        ease: 'easeInOut',
      },
    };
  }

  if (emotion === 'surprised') {
    return {
      id: emotion,
      animate: {
        x: 0,
        y: [0, -1, 0],
        rotate: 0,
        scale: [1, 1.04, 1],
        scaleY: 1,
      },
      transition: {
        duration: 0.35,
        times: [0, 0.45, 1],
        ease: 'easeInOut',
      },
    };
  }

  if (emotion === 'sleepy') {
    return {
      id: emotion,
      animate: {
        x: 0,
        y: [0, 2, 0, 2, 0],
        rotate: [0, 2, 0, 2, 0],
        scale: 1,
        scaleY: 1,
      },
      transition: {
        duration: 1.6,
        times: [0, 0.24, 0.48, 0.74, 1],
        ease: 'easeInOut',
      },
    };
  }

  return {
    id: emotion,
    animate: {
      x: [0, -1, 1, -1, 0],
      y: 0,
      rotate: [0, -0.5, 0.5, -0.5, 0],
      scale: 1,
      scaleY: 1,
    },
    transition: {
      duration: 0.6,
      times: [0, 0.24, 0.5, 0.76, 1],
      ease: 'easeInOut',
    },
  };
}

interface LunchmateRoomMotionControllerOptions {
  getBounds: () => LunchmateRoomTravelBounds;
  onChange: (snapshot: LunchmateRoomMotionSnapshot) => void;
  random?: () => number;
  now?: () => number;
  reducedMotion?: boolean;
  initiallyVisible?: boolean;
}

interface LunchmateRoomMotionController {
  start: () => void;
  stop: () => void;
  setVisible: (visible: boolean) => void;
  remeasure: () => void;
  getSnapshot: () => LunchmateRoomMotionSnapshot;
}

type LunchmateRoomScheduleStep =
  | 'center-settle'
  | 'emotion-pose-in-first'
  | 'emotion-pose-in-second'
  | 'center-emotion'
  | 'emotion-pose-out-first'
  | 'emotion-pose-out-second'
  | 'center-post-emotion'
  | 'turning-first-half'
  | 'turning-second-half'
  | 'walking-to-edge'
  | 'edge-hold'
  | 'walking-to-center';

type PausedSchedule =
  | {
      kind: 'timer';
      step: LunchmateRoomScheduleStep;
      remainingMs: number;
      callback: () => void;
    }
  | {
      kind: 'walking';
      step: 'walking-to-edge' | 'walking-to-center';
      remainingMs: number;
      targetX: number;
      direction: LunchmateRoomWalkingState;
      callback: () => void;
    }
  | {
      kind: 'turning';
      step: 'turning-first-half' | 'turning-second-half';
      remainingMs: number;
      targetScaleX: number;
      callback: () => void;
    }
  | {
      kind: 'pose';
      step:
        | 'emotion-pose-in-first'
        | 'emotion-pose-in-second'
        | 'emotion-pose-out-first'
        | 'emotion-pose-out-second';
      remainingMs: number;
      targetScaleY: number;
      callback: () => void;
    };

export function createLunchmateRoomMotionController({
  getBounds,
  onChange,
  random = Math.random,
  now = Date.now,
  reducedMotion = false,
  initiallyVisible = true,
}: LunchmateRoomMotionControllerOptions): LunchmateRoomMotionController {
  let snapshot = { ...INITIAL_ROOM_MOTION };
  let started = false;
  let stopped = false;
  let visible = initiallyVisible;
  let phaseTimer: ReturnType<typeof setTimeout> | null = null;
  let frameTimer: ReturnType<typeof setInterval> | null = null;
  let deadline = 0;
  let scheduleStep: LunchmateRoomScheduleStep | null = null;
  let scheduledCallback: (() => void) | null = null;
  let pausedSchedule: PausedSchedule | null = null;
  let lastEmotion: LunchmateRoomEmotion | null = null;
  let nextEdge: Exclude<LunchmateRoomWaypoint, 'center'> = 'left';
  let activeEdge: Exclude<LunchmateRoomWaypoint, 'center'> | null = null;
  let cryingShownInCycle = false;
  let initialCenter = true;
  let selectedEmotion: LunchmateRoomEmotion = 'happy';
  let centerPoseInMs = 0;
  let centerEmotionDurationMs = 0;
  let centerPoseOutMs = 0;
  let centerPostEmotionDurationMs = LUNCHMATE_ROOM_CENTER_POST_EMOTION_MS;
  let walkStartX = 0;
  let walkTargetX = 0;
  let walkStartedAt = 0;
  let walkDurationMs = 0;
  let scaleStartX = 1;
  let scaleTargetX = 1;
  let scaleXStartedAt = 0;
  let scaleXDurationMs = 0;
  let scaleStartY = 1;
  let scaleTargetY = 1;
  let scaleYStartedAt = 0;
  let scaleYDurationMs = 0;

  const emit = (nextSnapshot: LunchmateRoomMotionSnapshot) => {
    snapshot = nextSnapshot;
    onChange(nextSnapshot);
  };

  const clearTimers = () => {
    if (phaseTimer !== null) clearTimeout(phaseTimer);
    if (frameTimer !== null) clearInterval(frameTimer);
    phaseTimer = null;
    frameTimer = null;
  };

  const clampX = (x: number) => {
    const bounds = getBounds();
    return Math.min(bounds.maxX, Math.max(bounds.minX, x));
  };

  const currentWalkingX = () => {
    if (
      (scheduleStep !== 'walking-to-edge' && scheduleStep !== 'walking-to-center')
      || walkDurationMs <= 0
    ) return snapshot.x;
    const progress = Math.min(1, Math.max(0, (now() - walkStartedAt) / walkDurationMs));
    return walkStartX + ((walkTargetX - walkStartX) * progress);
  };

  const currentTurningScaleX = () => {
    if (
      (scheduleStep !== 'turning-first-half' && scheduleStep !== 'turning-second-half')
      || scaleXDurationMs <= 0
    ) return snapshot.scaleX;
    const progress = Math.min(1, Math.max(0, (now() - scaleXStartedAt) / scaleXDurationMs));
    return scaleStartX + ((scaleTargetX - scaleStartX) * progress);
  };

  const currentPoseScaleY = () => {
    if (
      (
        scheduleStep !== 'emotion-pose-in-first'
        && scheduleStep !== 'emotion-pose-in-second'
        && scheduleStep !== 'emotion-pose-out-first'
        && scheduleStep !== 'emotion-pose-out-second'
      )
      || scaleYDurationMs <= 0
    ) return snapshot.scaleY;
    const progress = Math.min(1, Math.max(0, (now() - scaleYStartedAt) / scaleYDurationMs));
    return scaleStartY + ((scaleTargetY - scaleStartY) * progress);
  };

  const schedulePhaseTimer = (
    step: LunchmateRoomScheduleStep,
    durationMs: number,
    callback: () => void,
  ) => {
    scheduleStep = step;
    scheduledCallback = callback;
    deadline = now() + durationMs;
    phaseTimer = setTimeout(() => {
      phaseTimer = null;
      scheduleStep = null;
      scheduledCallback = null;
      callback();
    }, durationMs);
  };

  const beginScaleXTransition = (
    targetScaleX: number,
    durationMs: number,
    step: 'turning-first-half' | 'turning-second-half',
    callback: () => void,
  ) => {
    scaleStartX = snapshot.scaleX;
    scaleTargetX = targetScaleX;
    scaleXStartedAt = now();
    scaleXDurationMs = durationMs;
    emit({
      ...snapshot,
      scaleX: targetScaleX,
      poseTransitionMs: durationMs,
    });
    schedulePhaseTimer(step, durationMs, callback);
  };

  const beginScaleYTransition = (
    targetScaleY: number,
    durationMs: number,
    step:
      | 'emotion-pose-in-first'
      | 'emotion-pose-in-second'
      | 'emotion-pose-out-first'
      | 'emotion-pose-out-second',
    callback: () => void,
  ) => {
    scaleStartY = snapshot.scaleY;
    scaleTargetY = targetScaleY;
    scaleYStartedAt = now();
    scaleYDurationMs = durationMs;
    emit({
      ...snapshot,
      activity: 'emotion-pose-transition',
      scaleY: targetScaleY,
      poseTransitionMs: durationMs,
      emotionMotion: 'none',
    });
    schedulePhaseTimer(step, durationMs, callback);
  };

  const beginTurning = (
    targetFacing: LunchmateRoomFacing,
    onComplete: () => void,
  ) => {
    if (stopped || !visible || reducedMotion) return;
    const totalDurationMs = durationFromRandom(
      LUNCHMATE_ROOM_TURN_DURATION_RANGE_MS,
      random,
    );
    const firstHalfMs = Math.floor(totalDurationMs / 2);
    const secondHalfMs = totalDurationMs - firstHalfMs;
    const turningStatus: LunchmateRoomTurningState = targetFacing === 'front'
      ? 'turning-front'
      : targetFacing === 'left'
        ? 'turning-left'
        : 'turning-right';

    emit({
      ...snapshot,
      status: turningStatus,
      activity: 'turning',
      scaleX: 1,
      scaleY: 1,
      positionTransitionMs: 0,
      poseTransitionMs: 0,
      emotionMotion: 'none',
    });
    beginScaleXTransition(0.86, firstHalfMs, 'turning-first-half', () => {
      emit({
        ...snapshot,
        facing: targetFacing,
        frame: 1,
        poseTransitionMs: 0,
      });
      beginScaleXTransition(1, secondHalfMs, 'turning-second-half', onComplete);
    });
  };

  const beginWalkingSegment = (
    direction: LunchmateRoomWalkingState,
    targetX: number,
    durationMs: number,
    step: 'walking-to-edge' | 'walking-to-center',
    onArrival: () => void,
    waypoint: LunchmateRoomWaypoint,
  ) => {
    if (stopped || !visible || reducedMotion) return;
    walkStartX = clampX(snapshot.x);
    walkTargetX = clampX(targetX);
    walkStartedAt = now();
    walkDurationMs = Math.max(0, durationMs);
    emit({
      status: direction,
      activity: 'walking',
      waypoint,
      facing: direction === 'walking-left' ? 'left' : 'right',
      x: walkTargetX,
      frame: 1,
      scaleX: 1,
      scaleY: 1,
      positionTransitionMs: walkDurationMs,
      poseTransitionMs: 0,
      emotionMotion: 'none',
      animationsEnabled: true,
    });
    frameTimer = setInterval(() => {
      emit({
        ...snapshot,
        frame: snapshot.frame === 1 ? 2 : 1,
      });
    }, LUNCHMATE_ROOM_WALK_FRAME_MS);
    schedulePhaseTimer(step, walkDurationMs, onArrival);
  };

  function arriveAtEdge() {
    if (stopped || !visible || reducedMotion) return;
    if (frameTimer !== null) {
      clearInterval(frameTimer);
      frameTimer = null;
    }
    const edge = activeEdge ?? 'left';
    const bounds = getBounds();
    const edgeX = edge === 'left' ? bounds.minX : bounds.maxX;
    emit({
      ...snapshot,
      activity: 'edge-hold',
      waypoint: edge,
      x: edgeX,
      positionTransitionMs: 0,
    });
    schedulePhaseTimer(
      'edge-hold',
      durationFromRandom(LUNCHMATE_ROOM_EDGE_HOLD_RANGE_MS, random),
      returnToCenter,
    );
  }

  function returnToCenter() {
    if (stopped || !visible || reducedMotion) return;
    const direction: LunchmateRoomWalkingState = activeEdge === 'left'
      ? 'walking-right'
      : 'walking-left';
    const targetFacing: LunchmateRoomFacing = direction === 'walking-left'
      ? 'left'
      : 'right';
    beginTurning(targetFacing, () => {
      beginWalkingSegment(
        direction,
        0,
        durationFromRandom(LUNCHMATE_ROOM_WALK_DURATION_RANGE_MS, random),
        'walking-to-center',
        arriveAtCenter,
        'center',
      );
    });
  }

  function arriveAtCenter() {
    if (stopped || !visible || reducedMotion) return;
    if (frameTimer !== null) {
      clearInterval(frameTimer);
      frameTimer = null;
    }
    emit({
      ...snapshot,
      waypoint: 'center',
      x: 0,
      positionTransitionMs: 0,
    });
    beginTurning('front', () => {
      if (activeEdge === 'right') cryingShownInCycle = false;
      activeEdge = null;
      enterCenter();
    });
  }

  const departCenter = () => {
    if (stopped || !visible || reducedMotion) return;
    const bounds = getBounds();
    if (bounds.maxX <= bounds.minX) {
      enterCenter();
      return;
    }
    activeEdge = nextEdge;
    nextEdge = activeEdge === 'left' ? 'right' : 'left';
    const direction: LunchmateRoomWalkingState = activeEdge === 'left'
      ? 'walking-left'
      : 'walking-right';
    const targetFacing: LunchmateRoomFacing = activeEdge;
    beginTurning(targetFacing, () => {
      const currentBounds = getBounds();
      beginWalkingSegment(
        direction,
        activeEdge === 'left' ? currentBounds.minX : currentBounds.maxX,
        durationFromRandom(LUNCHMATE_ROOM_WALK_DURATION_RANGE_MS, random),
        'walking-to-edge',
        arriveAtEdge,
        activeEdge ?? 'left',
      );
    });
  };

  const finishEmotionPoseOut = () => {
    if (stopped || !visible || reducedMotion) return;
    emit({
      status: 'idle',
      activity: 'center-idle',
      waypoint: 'center',
      facing: 'front',
      x: 0,
      frame: 1,
      scaleX: 1,
      scaleY: 1,
      positionTransitionMs: 0,
      poseTransitionMs: 0,
      emotionMotion: 'none',
      animationsEnabled: true,
    });
    schedulePhaseTimer(
      'center-post-emotion',
      centerPostEmotionDurationMs,
      departCenter,
    );
  };

  const beginEmotionPoseOut = () => {
    if (stopped || !visible || reducedMotion) return;
    const firstHalfMs = Math.floor(centerPoseOutMs / 2);
    const secondHalfMs = centerPoseOutMs - firstHalfMs;
    emit({ ...snapshot, emotionMotion: 'none' });
    beginScaleYTransition(0.97, firstHalfMs, 'emotion-pose-out-first', () => {
      emit({
        ...snapshot,
        status: 'idle',
        poseTransitionMs: 0,
      });
      beginScaleYTransition(
        1,
        secondHalfMs,
        'emotion-pose-out-second',
        finishEmotionPoseOut,
      );
    });
  };

  const finishEmotionPoseIn = () => {
    if (stopped || !visible || reducedMotion) return;
    emit({
      ...snapshot,
      activity: 'center-emotion',
      scaleY: 1,
      poseTransitionMs: 0,
      emotionMotion: selectedEmotion,
    });
    schedulePhaseTimer(
      'center-emotion',
      centerEmotionDurationMs,
      beginEmotionPoseOut,
    );
  };

  const beginEmotionPoseIn = () => {
    if (stopped || !visible || reducedMotion) return;
    selectedEmotion = selectLunchmateRoomEmotion(
      random(),
      lastEmotion,
      cryingShownInCycle,
    );
    lastEmotion = selectedEmotion;
    if (selectedEmotion === 'crying') cryingShownInCycle = true;
    const firstHalfMs = Math.floor(centerPoseInMs / 2);
    const secondHalfMs = centerPoseInMs - firstHalfMs;

    beginScaleYTransition(0.97, firstHalfMs, 'emotion-pose-in-first', () => {
      emit({
        ...snapshot,
        status: selectedEmotion,
        poseTransitionMs: 0,
      });
      beginScaleYTransition(
        1,
        secondHalfMs,
        'emotion-pose-in-second',
        finishEmotionPoseIn,
      );
    });
  };

  function enterCenter() {
    if (stopped || !visible || reducedMotion) return;
    const centerPlan = createLunchmateRoomCenterStayPlan(random, initialCenter);
    initialCenter = false;
    centerPoseInMs = centerPlan.poseInMs;
    centerEmotionDurationMs = centerPlan.emotionMs;
    centerPoseOutMs = centerPlan.poseOutMs;
    centerPostEmotionDurationMs = centerPlan.postEmotionIdleMs;

    emit({
      status: 'idle',
      activity: 'center-settle',
      waypoint: 'center',
      facing: 'front',
      x: 0,
      frame: 1,
      scaleX: 1,
      scaleY: 1,
      positionTransitionMs: 0,
      poseTransitionMs: 0,
      emotionMotion: 'none',
      animationsEnabled: true,
    });
    schedulePhaseTimer(
      'center-settle',
      centerPlan.settleMs,
      beginEmotionPoseIn,
    );
  }

  const pause = () => {
    const isWalking = scheduleStep === 'walking-to-edge'
      || scheduleStep === 'walking-to-center';
    if (isWalking && scheduledCallback) {
      const currentX = clampX(currentWalkingX());
      pausedSchedule = {
        kind: 'walking',
        step: scheduleStep as 'walking-to-edge' | 'walking-to-center',
        remainingMs: Math.max(0, deadline - now()),
        targetX: walkTargetX,
        direction: snapshot.status as LunchmateRoomWalkingState,
        callback: scheduledCallback,
      };
      clearTimers();
      scheduleStep = null;
      scheduledCallback = null;
      emit({
        ...snapshot,
        x: currentX,
        positionTransitionMs: 0,
        animationsEnabled: false,
      });
      return;
    }

    const isTurning = scheduleStep === 'turning-first-half'
      || scheduleStep === 'turning-second-half';
    if (isTurning && scheduledCallback) {
      const currentScaleX = currentTurningScaleX();
      pausedSchedule = {
        kind: 'turning',
        step: scheduleStep as 'turning-first-half' | 'turning-second-half',
        remainingMs: Math.max(0, deadline - now()),
        targetScaleX: scaleTargetX,
        callback: scheduledCallback,
      };
      clearTimers();
      scheduleStep = null;
      scheduledCallback = null;
      emit({
        ...snapshot,
        scaleX: currentScaleX,
        poseTransitionMs: 0,
        animationsEnabled: false,
      });
      return;
    }

    const isPoseTransition = scheduleStep === 'emotion-pose-in-first'
      || scheduleStep === 'emotion-pose-in-second'
      || scheduleStep === 'emotion-pose-out-first'
      || scheduleStep === 'emotion-pose-out-second';
    if (isPoseTransition && scheduledCallback) {
      const currentScaleY = currentPoseScaleY();
      pausedSchedule = {
        kind: 'pose',
        step: scheduleStep as
          | 'emotion-pose-in-first'
          | 'emotion-pose-in-second'
          | 'emotion-pose-out-first'
          | 'emotion-pose-out-second',
        remainingMs: Math.max(0, deadline - now()),
        targetScaleY: scaleTargetY,
        callback: scheduledCallback,
      };
      clearTimers();
      scheduleStep = null;
      scheduledCallback = null;
      emit({
        ...snapshot,
        scaleY: currentScaleY,
        poseTransitionMs: 0,
        animationsEnabled: false,
      });
      return;
    }

    if (scheduleStep && scheduledCallback) {
      pausedSchedule = {
        kind: 'timer',
        step: scheduleStep,
        remainingMs: Math.max(0, deadline - now()),
        callback: scheduledCallback,
      };
    }
    clearTimers();
    scheduleStep = null;
    scheduledCallback = null;
    emit({ ...snapshot, animationsEnabled: false });
  };

  const resume = () => {
    if (stopped || reducedMotion) return;
    const pending = pausedSchedule;
    pausedSchedule = null;
    emit({ ...snapshot, animationsEnabled: true });
    if (!pending) {
      enterCenter();
      return;
    }
    if (pending.kind === 'walking') {
      beginWalkingSegment(
        pending.direction,
        pending.targetX,
        pending.remainingMs,
        pending.step,
        pending.callback,
        snapshot.waypoint,
      );
      return;
    }
    if (pending.kind === 'turning') {
      beginScaleXTransition(
        pending.targetScaleX,
        pending.remainingMs,
        pending.step,
        pending.callback,
      );
      return;
    }
    if (pending.kind === 'pose') {
      beginScaleYTransition(
        pending.targetScaleY,
        pending.remainingMs,
        pending.step,
        pending.callback,
      );
      return;
    }
    schedulePhaseTimer(pending.step, pending.remainingMs, pending.callback);
  };

  return {
    start() {
      if (started || stopped) return;
      started = true;
      emit({
        ...INITIAL_ROOM_MOTION,
        animationsEnabled: visible && !reducedMotion,
      });
      if (reducedMotion) return;
      if (visible) {
        enterCenter();
      } else {
        const centerPlan = createLunchmateRoomCenterStayPlan(random, true);
        initialCenter = false;
        centerPoseInMs = centerPlan.poseInMs;
        centerEmotionDurationMs = centerPlan.emotionMs;
        centerPoseOutMs = centerPlan.poseOutMs;
        centerPostEmotionDurationMs = centerPlan.postEmotionIdleMs;
        pausedSchedule = {
          kind: 'timer',
          step: 'center-settle',
          remainingMs: centerPlan.settleMs,
          callback: beginEmotionPoseIn,
        };
      }
    },
    stop() {
      stopped = true;
      clearTimers();
      pausedSchedule = null;
      scheduleStep = null;
      scheduledCallback = null;
    },
    setVisible(nextVisible) {
      if (visible === nextVisible || stopped) return;
      visible = nextVisible;
      if (!visible) {
        pause();
      } else if (started) {
        resume();
      }
    },
    remeasure() {
      if (stopped || !visible) return;
      const isWalking = scheduleStep === 'walking-to-edge'
        || scheduleStep === 'walking-to-center';
      if (isWalking && scheduledCallback) {
        const currentX = clampX(currentWalkingX());
        const remainingMs = Math.max(0, deadline - now());
        const direction = snapshot.status as LunchmateRoomWalkingState;
        const currentStep = scheduleStep as 'walking-to-edge' | 'walking-to-center';
        const callback = scheduledCallback;
        clearTimers();
        scheduleStep = null;
        scheduledCallback = null;
        emit({ ...snapshot, x: currentX, positionTransitionMs: 0 });
        if (visible) {
          const bounds = getBounds();
          const targetX = currentStep === 'walking-to-center'
            ? 0
            : activeEdge === 'left'
              ? bounds.minX
              : bounds.maxX;
          beginWalkingSegment(
            direction,
            targetX,
            remainingMs,
            currentStep,
            callback,
            snapshot.waypoint,
          );
        }
        return;
      }
      if (
        scheduleStep === 'turning-first-half'
        || scheduleStep === 'turning-second-half'
        || scheduleStep === 'emotion-pose-in-first'
        || scheduleStep === 'emotion-pose-in-second'
        || scheduleStep === 'emotion-pose-out-first'
        || scheduleStep === 'emotion-pose-out-second'
      ) return;
      const bounds = getBounds();
      const nextX = snapshot.waypoint === 'center'
        ? 0
        : snapshot.waypoint === 'left'
          ? bounds.minX
          : bounds.maxX;
      if (nextX !== snapshot.x) {
        emit({ ...snapshot, x: nextX, positionTransitionMs: 0 });
      }
    },
    getSnapshot() {
      return snapshot;
    },
  };
}

function preloadLunchmateRoomMotionAssets() {
  if (typeof Image === 'undefined') return;
  LUNCHMATE_ROOM_MOTION_ASSET_KEYS.forEach((assetKey) => {
    const source = lunchmateChickenAssets[assetKey];
    const image = new Image();
    image.srcset = source.srcSet;
    image.src = source.src;
  });
}

type LunchmateRoomMotionValue = Omit<
  LunchmateRoomMotionSnapshot,
  'emotionMotion'
> & {
  stageRef: RefObject<HTMLDivElement | null>;
  characterRef: RefObject<HTMLDivElement | null>;
  assetKey: LunchmateChickenAssetKey;
  reducedMotion: boolean;
  motionReady: boolean;
  emotionMotion: LunchmateRoomEmotionMotion;
  handleCharacterImageLoad: () => void;
};

export function useLunchmateRoomMotion(): LunchmateRoomMotionValue {
  const stageRef = useRef<HTMLDivElement>(null);
  const characterRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<LunchmateRoomMotionController | null>(null);
  const measureRef = useRef<() => void>(() => undefined);
  const lastMeasurementRef = useRef({ stageWidth: 0, characterWidth: 0 });
  const imageLoadFrameRef = useRef<number | null>(null);
  const reducedMotion = useReducedMotion() ?? false;
  const [motionReady, setMotionReady] = useState(false);
  const [snapshot, setSnapshot] = useState<LunchmateRoomMotionSnapshot>(
    INITIAL_ROOM_MOTION,
  );

  useEffect(() => {
    preloadLunchmateRoomMotionAssets();
  }, []);

  useLayoutEffect(() => {
    const measure = () => {
      const stageWidth = stageRef.current?.getBoundingClientRect().width ?? 0;
      const characterWidth = characterRef.current?.getBoundingClientRect().width ?? 0;
      if (!hasLunchmateRoomMeasurements(stageWidth, characterWidth)) return;
      const dimensionsChanged = stageWidth !== lastMeasurementRef.current.stageWidth
        || characterWidth !== lastMeasurementRef.current.characterWidth;
      lastMeasurementRef.current = { stageWidth, characterWidth };
      setMotionReady(true);
      if (dimensionsChanged) controllerRef.current?.remeasure();
    };
    measureRef.current = measure;

    const cancelInitialMeasurement = scheduleLunchmateRoomInitialMeasurement(measure);
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
    const getBounds = () => calculateLunchmateRoomTravelBounds(
      stageRef.current?.getBoundingClientRect().width ?? 0,
      characterRef.current?.getBoundingClientRect().width ?? 0,
    );
    const controller = createLunchmateRoomMotionController({
      getBounds,
      onChange: setSnapshot,
      reducedMotion,
      initiallyVisible: typeof document === 'undefined'
        || document.visibilityState !== 'hidden',
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

  return {
    ...snapshot,
    stageRef,
    characterRef,
    assetKey: resolveLunchmateRoomAssetKey(
      snapshot.status,
      snapshot.frame,
      snapshot.facing,
    ),
    reducedMotion,
    motionReady,
    emotionMotion,
    handleCharacterImageLoad,
  };
}
