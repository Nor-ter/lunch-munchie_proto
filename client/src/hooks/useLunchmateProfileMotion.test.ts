import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lunchmateChickenAssets } from '@/constants/lunchmateAssets';
import {
  calculateLunchmateProfileGrabBounds,
  calculateLunchmateProfileTravelBounds,
  clampLunchmateProfileGrabOffset,
  createLunchmateProfileGrabController,
  createLunchmateProfileMotionController,
  hasLunchmateProfileMeasurements,
  LUNCHMATE_PROFILE_EDGE_HOLD_RANGE_MS,
  LUNCHMATE_PROFILE_EMOTION_DURATION_RANGE_MS,
  LUNCHMATE_PROFILE_CENTER_PAUSE_RANGE_MS,
  LUNCHMATE_PROFILE_INITIAL_IDLE_RANGE_MS,
  LUNCHMATE_PROFILE_GRAB_LANDING_MS,
  LUNCHMATE_PROFILE_GRAB_MAX_ROTATE_DEG,
  LUNCHMATE_PROFILE_MAX_OFFSET_PX,
  LUNCHMATE_PROFILE_LONG_PRESS_MS,
  LUNCHMATE_PROFILE_LONG_PRESS_MOVE_THRESHOLD_PX,
  LUNCHMATE_PROFILE_POST_EMOTION_RANGE_MS,
  LUNCHMATE_PROFILE_POST_SITTING_RANGE_MS,
  LUNCHMATE_PROFILE_PRE_SITTING_RANGE_MS,
  LUNCHMATE_PROFILE_SITTING_RANGE_MS,
  LUNCHMATE_PROFILE_WALK_DURATION_RANGE_MS,
  LUNCHMATE_PROFILE_WALK_FRAME_MS,
  resolveLunchmateProfileAssetKey,
  resolveLunchmateProfilePresentationAsset,
  scheduleLunchmateProfileInitialMeasurement,
  selectLunchmateProfileEmotion,
  type LunchmateProfileMotionSnapshot,
  type LunchmateProfilePointerCaptureTarget,
} from './useLunchmateProfileMotion';

const PUBLIC_ROOT = join(process.cwd(), 'client', 'public');
const FOODIE_BUDDY_SOURCE = readFileSync(
  join(process.cwd(), 'client', 'src', 'components', 'munchie', 'FoodieBuddy.tsx'),
  'utf8',
);
const PROFILE_SOURCE = readFileSync(
  join(process.cwd(), 'client', 'src', 'pages', 'ProfilePage.tsx'),
  'utf8',
);
const RENDERER_SOURCE = readFileSync(
  join(
    process.cwd(),
    'client',
    'src',
    'components',
    'munchie',
    'LunchmateCharacterRenderer.tsx',
  ),
  'utf8',
);
const HOOK_SOURCE = readFileSync(
  join(process.cwd(), 'client', 'src', 'hooks', 'useLunchmateProfileMotion.ts'),
  'utf8',
);

function publicPath(assetUrl: string) {
  return join(PUBLIC_ROOT, assetUrl.split('?')[0].replace(/^\//, ''));
}

function readPngHeader(path: string) {
  const png = readFileSync(path);
  return {
    signature: png.subarray(0, 8).toString('hex'),
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
    colorType: png[25],
  };
}

function createHarness(options?: {
  reducedMotion?: boolean;
  initiallySuspended?: boolean;
}) {
  const snapshots: LunchmateProfileMotionSnapshot[] = [];
  const controller = createLunchmateProfileMotionController({
    getBounds: () => calculateLunchmateProfileTravelBounds(390, 86),
    onChange: snapshot => snapshots.push(snapshot),
    reducedMotion: options?.reducedMotion,
    initiallySuspended: options?.initiallySuspended,
  });
  return { controller, snapshots };
}

function createGrabHarness(options?: {
  reducedMotion?: boolean;
  initiallyBlocked?: boolean;
}) {
  const snapshots: ReturnType<
    ReturnType<typeof createLunchmateProfileGrabController>['getSnapshot']
  >[] = [];
  const target: LunchmateProfilePointerCaptureTarget = {
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
    hasPointerCapture: vi.fn(() => true),
  };
  const targetChanges: Array<{
    x?: number;
    y?: number;
    rotate?: number;
    immediate?: boolean;
  }> = [];
  const rendered = { x: 0, y: 0, rotate: 0 };
  const pauseAutomaticMotion = vi.fn();
  const resumeAutomaticMotion = vi.fn();
  const restartAutomaticMotion = vi.fn();
  const bounds = {
    minX: -24,
    maxX: 32,
    minY: -36,
    maxY: 0,
  };
  const controller = createLunchmateProfileGrabController({
    getBounds: () => ({ ...bounds }),
    getRendered: () => ({ ...rendered }),
    toStageLocal: (clientX, clientY) => ({ x: clientX, y: clientY }),
    onChange: snapshot => snapshots.push(snapshot),
    onTargetChange: (nextTarget) => {
      targetChanges.push(nextTarget);
      if (nextTarget.x !== undefined) rendered.x = nextTarget.x;
      if (nextTarget.y !== undefined) rendered.y = nextTarget.y;
      if (nextTarget.rotate !== undefined) rendered.rotate = nextTarget.rotate;
    },
    onPauseAutomaticMotion: pauseAutomaticMotion,
    onResumeAutomaticMotion: resumeAutomaticMotion,
    onRestartAutomaticMotion: restartAutomaticMotion,
    random: () => 0,
    reducedMotion: options?.reducedMotion,
    initiallyBlocked: options?.initiallyBlocked,
  });
  const pointer = {
    pointerId: 7,
    isPrimary: true,
    clientX: 190,
    clientY: 90,
    initialVisualX: 18,
    target,
  };
  return {
    controller,
    snapshots,
    target,
    targetChanges,
    rendered,
    pauseAutomaticMotion,
    resumeAutomaticMotion,
    restartAutomaticMotion,
    bounds,
    pointer,
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Lunchmate Profile sitting asset and bounds', () => {
  it('registers the supplied transparent grabbed PNG', () => {
    expect(lunchmateChickenAssets.grabbed.src)
      .toBe('/assets/lunchmate/chicken/chicken-grabbed.png?v=chicken-grabbed-v1');
    expect(readPngHeader(publicPath(lunchmateChickenAssets.grabbed.src))).toEqual({
      signature: '89504e470d0a1a0a',
      width: 950,
      height: 950,
      colorType: 6,
    });
  });

  it('registers the supplied transparent sitting PNG', () => {
    expect(lunchmateChickenAssets.sitting.src)
      .toBe('/assets/lunchmate/chicken/chicken-sitting.png?v=chicken-sitting-v1');
    expect(readPngHeader(publicPath(lunchmateChickenAssets.sitting.src))).toEqual({
      signature: '89504e470d0a1a0a',
      width: 950,
      height: 950,
      colorType: 6,
    });
  });

  it('uses the smaller of the measured safe range and 44px', () => {
    expect(calculateLunchmateProfileTravelBounds(390, 86)).toEqual({
      minX: -44,
      maxX: 44,
    });
    expect(calculateLunchmateProfileTravelBounds(120, 86)).toEqual({
      minX: -1,
      maxX: 1,
    });
    expect(calculateLunchmateProfileTravelBounds(86, 86)).toEqual({
      minX: 0,
      maxX: 0,
    });
    expect(hasLunchmateProfileMeasurements(390, 86)).toBe(true);
    expect(hasLunchmateProfileMeasurements(0, 86)).toBe(false);
  });

  it('maps side frames and sitting without changing the idle source', () => {
    expect(resolveLunchmateProfileAssetKey('idle', 'front', 1)).toBe('idle');
    expect(resolveLunchmateProfileAssetKey('walking-left', 'left', 2))
      .toBe('side-walk-left-2');
    expect(resolveLunchmateProfileAssetKey('walking-right', 'right', 1))
      .toBe('side-walk-right-1');
    expect(resolveLunchmateProfileAssetKey('sitting', 'front', 1)).toBe('sitting');
    expect(resolveLunchmateProfileAssetKey('happy', 'front', 1)).toBe('happy');
  });

  it('measures immediately and again on the next animation frame', () => {
    const measure = vi.fn();
    let frameCallback: FrameRequestCallback | undefined;
    const cancelAnimationFrameMock = vi.fn();
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frameCallback = callback;
      return 29;
    }));
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock);

    const cleanup = scheduleLunchmateProfileInitialMeasurement(measure);
    expect(measure).toHaveBeenCalledTimes(1);
    frameCallback?.(16);
    expect(measure).toHaveBeenCalledTimes(2);
    cleanup();
    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(29);
  });
});

describe('Lunchmate Profile long-press grab controller', () => {
  it('derives a full-stage safe area independent from the 44px patrol range', () => {
    const bounds = calculateLunchmateProfileGrabBounds(
      { left: 0, right: 390, top: 0, bottom: 150, width: 390, height: 150 },
      { left: 152, right: 238, top: 59, bottom: 150, width: 86, height: 91 },
    );

    expect(bounds).toEqual({
      minX: -137,
      maxX: 137,
      minY: -52,
      maxY: 0,
    });
    expect(clampLunchmateProfileGrabOffset(-100, 20, bounds)).toEqual({
      x: -100,
      y: 0,
    });
    expect(Math.abs(bounds.maxX)).toBeGreaterThan(135);
    expect(Math.abs(bounds.minX)).toBeGreaterThan(135);
    expect(bounds.maxX).toBeGreaterThan(LUNCHMATE_PROFILE_MAX_OFFSET_PX);
  });

  it('waits 400ms, swaps to grabbed once, and captures only after success', () => {
    vi.useFakeTimers();
    const {
      controller,
      snapshots,
      target,
      targetChanges,
      pauseAutomaticMotion,
      pointer,
    } = createGrabHarness();

    expect(controller.pointerDown(pointer)).toBe(true);
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'pressing',
      assetKeyOverride: null,
    });
    vi.advanceTimersByTime(LUNCHMATE_PROFILE_LONG_PRESS_MS - 1);
    expect(snapshots.at(-1)?.assetKeyOverride).toBeNull();
    expect(target.setPointerCapture).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'grabbed',
      assetKeyOverride: 'grabbed',
      x: 18,
      y: -12,
      scaleX: 1.03,
      scaleY: 1.03,
    });
    expect(target.setPointerCapture).toHaveBeenCalledTimes(1);
    expect(target.setPointerCapture).toHaveBeenCalledWith(pointer.pointerId);
    expect(pauseAutomaticMotion).toHaveBeenCalledTimes(1);
    expect(targetChanges).toContainEqual({
      x: 18,
      y: 0,
      rotate: 0,
      immediate: true,
    });
    controller.stop();
  });

  it('ignores non-primary pointers', () => {
    vi.useFakeTimers();
    const { controller, pointer, target } = createGrabHarness();

    expect(controller.pointerDown({ ...pointer, isPrimary: false })).toBe(false);
    vi.advanceTimersByTime(LUNCHMATE_PROFILE_LONG_PRESS_MS);
    expect(controller.getSnapshot().phase).toBe('idle');
    expect(target.setPointerCapture).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    controller.stop();
  });

  it('cancels before activation at the 8px movement threshold', () => {
    vi.useFakeTimers();
    const {
      controller,
      snapshots,
      target,
      pointer,
    } = createGrabHarness();

    controller.pointerDown(pointer);
    expect(controller.pointerMove(
      pointer.pointerId,
      pointer.clientX + LUNCHMATE_PROFILE_LONG_PRESS_MOVE_THRESHOLD_PX,
      pointer.clientY,
    )).toBe(false);
    vi.advanceTimersByTime(LUNCHMATE_PROFILE_LONG_PRESS_MS);

    expect(controller.getSnapshot()).toMatchObject({
      phase: 'idle',
      assetKeyOverride: null,
    });
    expect(target.setPointerCapture).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    controller.stop();
  });

  it('keeps the grabbed source while dragging and clamps both axes', () => {
    vi.useFakeTimers();
    const { controller, pointer } = createGrabHarness();

    controller.pointerDown(pointer);
    vi.advanceTimersByTime(LUNCHMATE_PROFILE_LONG_PRESS_MS);
    expect(controller.pointerMove(pointer.pointerId, 400, -100)).toBe(true);
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'grabbed',
      assetKeyOverride: 'grabbed',
      x: 32,
      y: -36,
      rotate: -LUNCHMATE_PROFILE_GRAB_MAX_ROTATE_DEG,
    });
    expect(controller.pointerMove(pointer.pointerId, -100, 300)).toBe(true);
    expect(controller.getSnapshot()).toMatchObject({
      assetKeyOverride: 'grabbed',
      x: -24,
      y: 0,
      rotate: LUNCHMATE_PROFILE_GRAB_MAX_ROTATE_DEG,
    });
    expect(controller.pointerMove(
      pointer.pointerId,
      pointer.clientX + 10,
      pointer.clientY,
    )).toBe(true);
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'grabbed',
      x: 28,
    });
    controller.stop();
  });

  it('updates spring targets without emitting React snapshots on every move', () => {
    vi.useFakeTimers();
    const { controller, snapshots, targetChanges, pointer } = createGrabHarness();

    controller.pointerDown(pointer);
    vi.advanceTimersByTime(LUNCHMATE_PROFILE_LONG_PRESS_MS);
    const snapshotCount = snapshots.length;
    controller.pointerMove(pointer.pointerId, pointer.clientX + 80, pointer.clientY);

    expect(snapshots).toHaveLength(snapshotCount);
    expect(targetChanges.at(-1)).toMatchObject({
      rotate: -LUNCHMATE_PROFILE_GRAB_MAX_ROTATE_DEG,
    });
    vi.advanceTimersByTime(79);
    expect(targetChanges.at(-1)?.rotate)
      .toBe(-LUNCHMATE_PROFILE_GRAB_MAX_ROTATE_DEG);
    vi.advanceTimersByTime(1);
    expect(targetChanges.at(-1)).toMatchObject({ rotate: 0 });
    controller.stop();
  });

  it('reclamps the current target after resize without snapping to center', () => {
    vi.useFakeTimers();
    const { controller, bounds, targetChanges, pointer } = createGrabHarness();

    controller.pointerDown(pointer);
    vi.advanceTimersByTime(LUNCHMATE_PROFILE_LONG_PRESS_MS);
    controller.pointerMove(pointer.pointerId, pointer.clientX + 100, pointer.clientY);
    expect(controller.getSnapshot().x).toBe(32);

    bounds.maxX = 20;
    controller.remeasure();
    expect(controller.getSnapshot().x).toBe(20);
    expect(targetChanges.at(-1)).toMatchObject({ x: 20 });
    expect(controller.getSnapshot().x).not.toBe(0);
    controller.stop();
  });

  it('lands with grabbed, swaps once at the midpoint, then returns to idle', () => {
    vi.useFakeTimers();
    const {
      controller,
      snapshots,
      target,
      restartAutomaticMotion,
      pointer,
    } = createGrabHarness();

    controller.pointerDown(pointer);
    vi.advanceTimersByTime(LUNCHMATE_PROFILE_LONG_PRESS_MS);
    expect(controller.pointerUp(pointer.pointerId)).toBe(true);
    expect(snapshots.at(-1)).toMatchObject({
      phase: 'landing',
      assetKeyOverride: 'grabbed',
      x: 0,
      y: 0,
      scaleY: 0.95,
    });
    expect(controller.consumeClickSuppression()).toBe(true);
    expect(controller.consumeClickSuppression()).toBe(false);
    vi.advanceTimersByTime(LUNCHMATE_PROFILE_GRAB_LANDING_MS / 2);
    expect(snapshots.at(-1)).toMatchObject({
      phase: 'landing',
      assetKeyOverride: 'idle',
      scaleY: 1,
    });
    vi.advanceTimersByTime(LUNCHMATE_PROFILE_GRAB_LANDING_MS / 2);
    expect(snapshots.at(-1)).toMatchObject({
      phase: 'recovering',
      assetKeyOverride: 'idle',
    });
    vi.advanceTimersByTime(1000);
    expect(snapshots.at(-1)).toMatchObject({
      phase: 'idle',
      assetKeyOverride: null,
    });
    expect(target.releasePointerCapture).toHaveBeenCalledTimes(1);
    expect(restartAutomaticMotion).toHaveBeenCalledTimes(1);
    controller.stop();
  });

  it('cleans pointercancel, lost capture, blocking, and all timers', () => {
    vi.useFakeTimers();
    const { controller, pointer } = createGrabHarness();

    controller.pointerDown(pointer);
    expect(controller.pointerCancel(pointer.pointerId)).toBe(true);
    expect(controller.getSnapshot().phase).toBe('idle');

    controller.pointerDown(pointer);
    vi.advanceTimersByTime(LUNCHMATE_PROFILE_LONG_PRESS_MS);
    expect(controller.lostPointerCapture(pointer.pointerId)).toBe(true);
    vi.advanceTimersByTime(LUNCHMATE_PROFILE_GRAB_LANDING_MS + 1000);
    expect(controller.getSnapshot().phase).toBe('idle');

    controller.pointerDown(pointer);
    controller.setBlocked(true);
    expect(controller.getSnapshot().phase).toBe('idle');
    expect(vi.getTimerCount()).toBe(0);
    controller.stop();
  });

  it('keeps grab usable but removes lift/landing animation for reduced motion', () => {
    vi.useFakeTimers();
    const { controller, pointer } = createGrabHarness({ reducedMotion: true });

    controller.pointerDown(pointer);
    vi.advanceTimersByTime(LUNCHMATE_PROFILE_LONG_PRESS_MS);
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'grabbed',
      assetKeyOverride: 'grabbed',
      rotate: 0,
      scaleX: 1,
      scaleY: 1,
      transitionMs: 0,
    });
    controller.pointerUp(pointer.pointerId);
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'idle',
      x: 0,
      y: 0,
      rotate: 0,
    });
    expect(vi.getTimerCount()).toBe(0);
    controller.stop();
  });
});

describe('Lunchmate Profile patrol controller', () => {
  it('uses the compact Profile timing ranges', () => {
    expect(LUNCHMATE_PROFILE_INITIAL_IDLE_RANGE_MS).toEqual([2500, 3500]);
    expect(LUNCHMATE_PROFILE_EMOTION_DURATION_RANGE_MS).toEqual([1800, 2200]);
    expect(LUNCHMATE_PROFILE_POST_EMOTION_RANGE_MS).toEqual([300, 500]);
    expect(LUNCHMATE_PROFILE_WALK_DURATION_RANGE_MS).toEqual([900, 1150]);
    expect(LUNCHMATE_PROFILE_EDGE_HOLD_RANGE_MS).toEqual([350, 550]);
    expect(LUNCHMATE_PROFILE_CENTER_PAUSE_RANGE_MS).toEqual([600, 900]);
    expect(LUNCHMATE_PROFILE_PRE_SITTING_RANGE_MS).toEqual([500, 800]);
    expect(LUNCHMATE_PROFILE_SITTING_RANGE_MS).toEqual([4500, 6500]);
    expect(LUNCHMATE_PROFILE_POST_SITTING_RANGE_MS).toEqual([2000, 3000]);
  });

  it('starts without user input and follows center → left → center → right → center → sitting', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { controller, snapshots } = createHarness();

    controller.start();
    expect(snapshots.at(-1)).toMatchObject({
      status: 'idle',
      activity: 'idle-wait',
      x: 0,
    });
    vi.advanceTimersByTime(2499);
    expect(snapshots.at(-1)?.status).toBe('idle');
    vi.advanceTimersByTime(161);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'happy',
      activity: 'center-emotion',
      x: 0,
      emotionMotion: 'happy',
    });
    vi.advanceTimersByTime(1800 + 160 + 300 + 160);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'walking-left',
      activity: 'walking',
      x: -44,
      positionTransitionMs: 900,
      emotionMotion: 'none',
    });
    vi.advanceTimersByTime(900);
    expect(snapshots.at(-1)).toMatchObject({
      activity: 'edge-hold',
      x: -44,
    });
    vi.advanceTimersByTime(350 + 160 + 900 + 160);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'idle',
      activity: 'center-pause',
      x: 0,
    });
    vi.advanceTimersByTime(600 + 160);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'walking-right',
      activity: 'walking',
      x: 44,
    });
    vi.advanceTimersByTime(900 + 350 + 160 + 900 + 160 + 500 + 160);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'sitting',
      activity: 'sitting',
      facing: 'front',
      x: 0,
    });
    expect(snapshots.every(snapshot => Math.abs(snapshot.x) <= 44)).toBe(true);
    controller.stop();
  });

  it('alternates walking frames every 225ms only while walking', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { controller, snapshots } = createHarness();

    controller.start();
    vi.advanceTimersByTime(5080);
    expect(snapshots.at(-1)).toMatchObject({ status: 'walking-left', frame: 1 });
    vi.advanceTimersByTime(LUNCHMATE_PROFILE_WALK_FRAME_MS);
    expect(snapshots.at(-1)).toMatchObject({ status: 'walking-left', frame: 2 });
    controller.stop();
  });

  it('keeps sitting centered for at least 4.5 seconds before returning to idle', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { controller, snapshots } = createHarness();

    controller.start();
    vi.advanceTimersByTime(11_440);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'sitting',
      activity: 'sitting',
      x: 0,
    });
    vi.advanceTimersByTime(4499);
    expect(snapshots.at(-1)?.status).toBe('sitting');
    vi.advanceTimersByTime(161);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'idle',
      activity: 'post-sitting-idle',
      x: 0,
    });
    controller.stop();
  });

  it('centers and normalizes to standing as soon as an interaction starts', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { controller, snapshots } = createHarness();

    controller.start();
    vi.advanceTimersByTime(5500);
    expect(snapshots.at(-1)?.activity).toBe('walking');
    controller.setSuspended(true);
    expect(snapshots.at(-1)).toMatchObject({
      activity: 'source-transition',
      x: 0,
      interactionReady: false,
    });
    vi.advanceTimersByTime(160);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'idle',
      activity: 'suspended',
      facing: 'front',
      x: 0,
      interactionReady: true,
    });
    expect(vi.getTimerCount()).toBe(0);
    controller.stop();
  });

  it('pauses a manual grab at the currently rendered walking x without centering', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { controller, snapshots } = createHarness();

    controller.start();
    vi.advanceTimersByTime(5080);
    vi.advanceTimersByTime(300);
    controller.setGrabPaused(true);
    expect(snapshots.at(-1)?.activity).toBe('walking');
    expect(snapshots.at(-1)!.x).toBeLessThan(0);
    expect(snapshots.at(-1)!.x).toBeGreaterThan(-44);
    expect(vi.getTimerCount()).toBe(0);

    controller.setGrabPaused(false);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    controller.stop();
  });

  it('shows standing before feeding when an interaction interrupts sitting', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { controller, snapshots } = createHarness();

    controller.start();
    vi.advanceTimersByTime(11_440);
    expect(resolveLunchmateProfilePresentationAsset(
      resolveLunchmateProfileAssetKey(
        snapshots.at(-1)!.status,
        snapshots.at(-1)!.facing,
        snapshots.at(-1)!.frame,
      ),
      true,
      snapshots.at(-1)!.interactionReady,
    )).toBe('sitting');

    controller.setSuspended(true);
    vi.advanceTimersByTime(160);
    const standing = snapshots.at(-1)!;
    expect(standing).toMatchObject({
      status: 'idle',
      interactionReady: true,
    });
    expect(resolveLunchmateProfilePresentationAsset(
      resolveLunchmateProfileAssetKey(
        standing.status,
        standing.facing,
        standing.frame,
      ),
      true,
      standing.interactionReady,
    )).toBe('feeding');
    controller.stop();
  });

  it('runs exactly one center emotion per cycle and never during travel or sitting', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { controller, snapshots } = createHarness();

    controller.start();
    vi.advanceTimersByTime(11_440);

    const centerEmotions = snapshots.filter(snapshot => (
      snapshot.activity === 'center-emotion'
    ));
    expect(centerEmotions).toHaveLength(1);
    expect(centerEmotions[0]).toMatchObject({
      status: 'happy',
      x: 0,
      emotionMotion: 'happy',
    });
    const nonEmotionPhases = snapshots.filter(snapshot => (
      snapshot.activity === 'walking'
      || snapshot.activity === 'edge-hold'
      || snapshot.activity === 'sitting'
    ));
    expect(nonEmotionPhases.every(snapshot => snapshot.emotionMotion === 'none'))
      .toBe(true);
    controller.stop();
  });

  it('does not repeat the immediately previous Profile emotion', () => {
    expect(selectLunchmateProfileEmotion(0, null)).toBe('happy');
    expect(selectLunchmateProfileEmotion(0, 'happy')).toBe('surprised');
    expect(selectLunchmateProfileEmotion(0.999999, 'crying')).toBe('sleepy');
  });

  it('returns to standing idle before the first walking source transition', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { controller, snapshots } = createHarness();

    controller.start();
    vi.advanceTimersByTime(4460);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'happy',
      activity: 'source-transition',
      emotionMotion: 'none',
    });
    vi.advanceTimersByTime(160);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'idle',
      activity: 'post-emotion-idle',
      x: 0,
    });
    vi.advanceTimersByTime(299);
    expect(snapshots.at(-1)?.activity).toBe('post-emotion-idle');
    vi.advanceTimersByTime(1);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'idle',
      activity: 'source-transition',
      x: 0,
    });
    controller.stop();
  });

  it('restarts from the initial idle wait after an interaction ends', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { controller, snapshots } = createHarness({ initiallySuspended: true });

    controller.start();
    expect(snapshots.at(-1)).toMatchObject({
      activity: 'suspended',
      interactionReady: true,
    });
    expect(vi.getTimerCount()).toBe(0);
    controller.setSuspended(false);
    expect(snapshots.at(-1)).toMatchObject({
      activity: 'idle-wait',
      status: 'idle',
      x: 0,
      interactionReady: false,
    });
    vi.advanceTimersByTime(2499);
    expect(snapshots.at(-1)?.activity).toBe('idle-wait');
    vi.advanceTimersByTime(1);
    expect(snapshots.at(-1)?.activity).toBe('source-transition');
    controller.stop();
  });

  it('keeps reduced motion centered and timer-free', () => {
    vi.useFakeTimers();
    const { controller, snapshots } = createHarness({ reducedMotion: true });

    controller.start();
    vi.advanceTimersByTime(30_000);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({
      status: 'idle',
      x: 0,
      animationsEnabled: false,
    });
    expect(vi.getTimerCount()).toBe(0);
    controller.stop();
  });

  it('pauses while hidden, resumes once, and clears timers on stop', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { controller, snapshots } = createHarness();

    controller.start();
    vi.advanceTimersByTime(1000);
    controller.setVisible(false);
    expect(snapshots.at(-1)?.animationsEnabled).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(10_000);
    controller.setVisible(true);
    expect(snapshots.at(-1)?.animationsEnabled).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(1499);
    expect(snapshots.at(-1)?.status).toBe('idle');
    controller.stop();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('Profile motion integration contract', () => {
  it('routes only through the explicit Room button, not the banner or character', () => {
    expect(FOODIE_BUDDY_SOURCE).not.toContain(
      'className="absolute inset-0 z-0 rounded-3xl bg-transparent',
    );
    expect(FOODIE_BUDDY_SOURCE.match(/aria-label="런치메이트룸 열기"/g))
      .toHaveLength(1);
    expect(FOODIE_BUDDY_SOURCE).toContain('onClick={openFoodieRoom}');
    expect(FOODIE_BUDDY_SOURCE).toContain('type="button"');
    expect(FOODIE_BUDDY_SOURCE).toContain(
      'data-lunchmate-profile-grab={profileMotion.grab.phase}',
    );
    expect(FOODIE_BUDDY_SOURCE).not.toContain('onClick={profileMotion.grab');
  });

  it('keeps the fixed feeding target while moving only the character visual', () => {
    expect(FOODIE_BUDDY_SOURCE).toContain(
      'data-lunchmate-profile-grab-anchor="true"',
    );
    expect(FOODIE_BUDDY_SOURCE).toContain('touchAction: \'none\'');
    expect(FOODIE_BUDDY_SOURCE).toContain('onPointerDown={(event) =>');
    expect(FOODIE_BUDDY_SOURCE).toContain('onPointerCancel={(event) =>');
    expect(FOODIE_BUDDY_SOURCE).toContain('onLostPointerCapture={(event) =>');
    expect(FOODIE_BUDDY_SOURCE).toContain(
      'profileMotion.grab.handleLostPointerCapture(event.pointerId)',
    );
    expect(FOODIE_BUDDY_SOURCE).toContain(
      'profileMotion.grab.consumeClickSuppression()',
    );
  });

  it('uses independent damped springs for position and pendulum rotation', () => {
    expect(HOOK_SOURCE).toContain('const grabSpringX = useSpring(grabTargetX');
    expect(HOOK_SOURCE).toContain('stiffness: 310');
    expect(HOOK_SOURCE).toContain('damping: 27');
    expect(HOOK_SOURCE).toContain('mass: 0.8');
    expect(HOOK_SOURCE).toContain(
      'const grabSpringRotate = useSpring(grabTargetRotate',
    );
    expect(HOOK_SOURCE).toContain('stiffness: 170');
    expect(HOOK_SOURCE).toContain('damping: 13');
    expect(HOOK_SOURCE).toContain('mass: 0.9');
  });

  it('keeps the drop target fixed and moves only the inner 86px wrapper', () => {
    const dropTarget = FOODIE_BUDDY_SOURCE.indexOf('ref={foodDropTargetRef}');
    const character = FOODIE_BUDDY_SOURCE.indexOf('ref={profileMotion.characterRef}', dropTarget);
    const translate = FOODIE_BUDDY_SOURCE.indexOf(
      'transform: `translate3d(${profileAutomaticX}px, 0, 0)`',
      character,
    );

    expect(dropTarget).toBeGreaterThan(-1);
    expect(character).toBeGreaterThan(dropTarget);
    expect(translate).toBeGreaterThan(character);
    expect(FOODIE_BUDDY_SOURCE).toContain(
      'className={`pointer-events-auto w-[86px] will-change-transform',
    );
    expect(FOODIE_BUDDY_SOURCE).toContain(
      'data-lunchmate-profile-grab-position="true"',
    );
    expect(FOODIE_BUDDY_SOURCE).toContain(
      'data-lunchmate-profile-pendulum="true"',
    );
    expect(FOODIE_BUDDY_SOURCE).toContain("transformOrigin: '50% 7%'");
    expect(FOODIE_BUDDY_SOURCE).toContain(
      'data-lunchmate-profile-grab-pose="true"',
    );
    expect(FOODIE_BUDDY_SOURCE).toContain('const LUNCHMATE_RENDER_SIZE = 86');
    expect(FOODIE_BUDDY_SOURCE).toContain("height: 'clamp(144px, 38vw, 150px)'");
  });

  it('keeps one opaque PNG and uses the squash midpoint source swap', () => {
    expect(FOODIE_BUDDY_SOURCE).toContain(
      'chickenAssetKeyOverride={profileChickenAsset}',
    );
    expect(RENDERER_SOURCE.match(/data-lunchmate-layer="chicken-base"/g)).toHaveLength(1);
    expect(RENDERER_SOURCE).not.toContain('data-lunchmate-layer="chicken-previous"');
    expect(RENDERER_SOURCE).toContain('opacity: 1');
    expect(HOOK_SOURCE).toContain('beginPoseHalf(0.97');
    expect(HOOK_SOURCE).toContain('status: targetStatus');
    expect(HOOK_SOURCE).toContain('beginPoseHalf(1');
    expect(HOOK_SOURCE).not.toContain('opacity');
    expect(FOODIE_BUDDY_SOURCE).toContain(
      'animate={profileMotion.emotionMotion.animate}',
    );
    expect(FOODIE_BUDDY_SOURCE).toContain(
      'transition={profileMotion.emotionMotion.transition}',
    );
  });

  it('suspends for Lunchbox, drag, and feeding without changing stored profile data', () => {
    expect(FOODIE_BUDDY_SOURCE).toContain(
      'suspended: isFeeding || isFoodDragging || isLunchboxOpen',
    );
    expect(PROFILE_SOURCE).toContain("isLunchboxOpen={activeSheet === 'lunchbox'}");
    expect(FOODIE_BUDDY_SOURCE).toContain(
      'resolveLunchmateProfilePresentationAsset(',
    );
    expect(FOODIE_BUDDY_SOURCE).toContain(
      'const profileChickenAsset = isFeeding',
    );
    expect(FOODIE_BUDDY_SOURCE).toContain(
      'disabled={!onLunchboxOpen || profileMotion.grab.isActive}',
    );
    expect(HOOK_SOURCE).not.toContain('localStorage');
    expect(HOOK_SOURCE).not.toContain('lm_profile');
    expect(PROFILE_SOURCE).toContain('foodDropTargetRef={foodieDropTargetRef}');
  });

  it('auto-measures and cleans every lifecycle resource without user input', () => {
    expect(HOOK_SOURCE).toContain('useLayoutEffect(() =>');
    expect(HOOK_SOURCE).toContain('scheduleLunchmateProfileInitialMeasurement(measure)');
    expect(HOOK_SOURCE).toContain('if (!motionReady) return undefined');
    expect(HOOK_SOURCE).toContain('controller.start()');
    expect(HOOK_SOURCE).toContain("document.addEventListener('visibilitychange'");
    expect(HOOK_SOURCE).toContain("document.removeEventListener('visibilitychange'");
    expect(HOOK_SOURCE).toContain("window.addEventListener('resize'");
    expect(HOOK_SOURCE).toContain("window.removeEventListener('resize'");
    expect(HOOK_SOURCE).toContain('resizeObserver?.disconnect()');
    expect(HOOK_SOURCE).toContain('controller.stop()');
    expect(HOOK_SOURCE).not.toContain("addEventListener('click'");
    expect(HOOK_SOURCE).not.toContain("addEventListener('pointer");
  });
});
