import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lunchmateChickenAssets } from '@/constants/lunchmateAssets';
import {
  calculateLunchmateRoomTravelBounds,
  createLunchmateRoomCenterStayPlan,
  createLunchmateRoomMotionController,
  hasLunchmateRoomMeasurements,
  LUNCHMATE_ROOM_WALK_FRAME_MS,
  resolveLunchmateRoomAssetKey,
  resolveLunchmateRoomEmotionMotion,
  scheduleLunchmateRoomInitialMeasurement,
  selectLunchmateRoomEmotion,
  type LunchmateRoomMotionSnapshot,
} from './useLunchmateRoomMotion';

const PUBLIC_ROOT = join(process.cwd(), 'client', 'public');
const FOODIE_ROOM_SOURCE = readFileSync(
  join(process.cwd(), 'client', 'src', 'pages', 'FoodieRoomPage.tsx'),
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
  join(process.cwd(), 'client', 'src', 'hooks', 'useLunchmateRoomMotion.ts'),
  'utf8',
);

const MOTION_ASSET_KEYS = [
  'side-walk-left-1',
  'side-walk-left-2',
  'side-walk-right-1',
  'side-walk-right-2',
  'happy',
  'surprised',
  'sleepy',
  'crying',
] as const;

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

function createControllerHarness(reducedMotion = false) {
  const snapshots: LunchmateRoomMotionSnapshot[] = [];
  const controller = createLunchmateRoomMotionController({
    getBounds: () => calculateLunchmateRoomTravelBounds(300, 156),
    onChange: snapshot => snapshots.push(snapshot),
    reducedMotion,
  });
  return { controller, snapshots };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Lunchmate Room motion assets', () => {
  it('registers every requested transparent 950px motion sprite', () => {
    MOTION_ASSET_KEYS.forEach((assetKey) => {
      expect(lunchmateChickenAssets[assetKey].src).toBe(
        `/assets/lunchmate/chicken/chicken-${assetKey}.png?v=chicken-motion-v1`,
      );
      const header = readPngHeader(publicPath(lunchmateChickenAssets[assetKey].src));
      expect(header).toEqual({
        signature: '89504e470d0a1a0a',
        width: 950,
        height: 950,
        colorType: 6,
      });
    });
  });

  it('maps walking, turning, and emotion states to one current sprite', () => {
    expect(resolveLunchmateRoomAssetKey('walking-left', 1, 'left')).toBe('side-walk-left-1');
    expect(resolveLunchmateRoomAssetKey('walking-left', 2, 'left')).toBe('side-walk-left-2');
    expect(resolveLunchmateRoomAssetKey('walking-right', 1, 'right')).toBe('side-walk-right-1');
    expect(resolveLunchmateRoomAssetKey('walking-right', 2, 'right')).toBe('side-walk-right-2');
    expect(resolveLunchmateRoomAssetKey('happy', 2)).toBe('happy');
    expect(resolveLunchmateRoomAssetKey('idle', 2)).toBe('idle');
    expect(resolveLunchmateRoomAssetKey('turning-left', 1, 'front')).toBe('idle');
    expect(resolveLunchmateRoomAssetKey('turning-left', 1, 'left')).toBe('side-walk-left-1');
  });
});

describe('Lunchmate Room motion rules', () => {
  it('uses measured positive dimensions and a 16px edge gap', () => {
    expect(hasLunchmateRoomMeasurements(390, 156)).toBe(true);
    expect(hasLunchmateRoomMeasurements(0, 156)).toBe(false);
    expect(hasLunchmateRoomMeasurements(390, 0)).toBe(false);
    expect(calculateLunchmateRoomTravelBounds(390, 156)).toEqual({
      minX: -101,
      maxX: 101,
    });
    expect(calculateLunchmateRoomTravelBounds(156, 156)).toEqual({
      minX: 0,
      maxX: 0,
    });
  });

  it('measures immediately and once again on the next animation frame', () => {
    const measure = vi.fn();
    let frameCallback: FrameRequestCallback | undefined;
    const cancelAnimationFrameMock = vi.fn();
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frameCallback = callback;
      return 17;
    }));
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock);

    const cleanup = scheduleLunchmateRoomInitialMeasurement(measure);
    expect(measure).toHaveBeenCalledTimes(1);
    frameCallback?.(16);
    expect(measure).toHaveBeenCalledTimes(2);
    cleanup();
    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(17);
  });

  it('keeps crying at the final ten-percent boundary', () => {
    expect(selectLunchmateRoomEmotion(0.399, null)).toBe('happy');
    expect(selectLunchmateRoomEmotion(0.4, null)).toBe('surprised');
    expect(selectLunchmateRoomEmotion(0.649, null)).toBe('surprised');
    expect(selectLunchmateRoomEmotion(0.65, null)).toBe('sleepy');
    expect(selectLunchmateRoomEmotion(0.899, null)).toBe('sleepy');
    expect(selectLunchmateRoomEmotion(0.9, null)).toBe('crying');
  });

  it('never selects the immediately previous emotion', () => {
    expect(selectLunchmateRoomEmotion(0, 'happy')).toBe('surprised');
    expect(selectLunchmateRoomEmotion(0.999, 'crying')).toBe('sleepy');
    expect(selectLunchmateRoomEmotion(0.999, null, true)).toBe('sleepy');
  });

  it('keeps each center stay between five and eight seconds with pose transitions', () => {
    const shortestInitial = createLunchmateRoomCenterStayPlan(() => 0, true);
    const shortestReturn = createLunchmateRoomCenterStayPlan(() => 0);
    const longestInitial = createLunchmateRoomCenterStayPlan(() => 0.999999, true);

    expect(shortestInitial).toEqual({
      totalMs: 5380,
      settleMs: 3000,
      poseInMs: 140,
      emotionMs: 1800,
      poseOutMs: 140,
      postEmotionIdleMs: 300,
    });
    expect(shortestReturn).toEqual({
      totalMs: 5000,
      settleMs: 450,
      poseInMs: 140,
      emotionMs: 1800,
      poseOutMs: 140,
      postEmotionIdleMs: 2470,
    });
    expect(longestInitial).toEqual({
      totalMs: 8000,
      settleMs: 3000,
      poseInMs: 180,
      emotionMs: 2300,
      poseOutMs: 180,
      postEmotionIdleMs: 2340,
    });
  });

  it('switches the emotion source once at the pose-transition midpoint', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { controller, snapshots } = createControllerHarness();

    controller.start();
    vi.advanceTimersByTime(2999);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'idle',
      activity: 'center-settle',
      scaleY: 1,
    });
    vi.advanceTimersByTime(1);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'idle',
      activity: 'emotion-pose-transition',
      scaleY: 0.97,
      poseTransitionMs: 70,
      emotionMotion: 'none',
    });
    vi.advanceTimersByTime(69);
    expect(snapshots.at(-1)?.status).toBe('idle');
    vi.advanceTimersByTime(1);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'happy',
      activity: 'emotion-pose-transition',
      scaleY: 1,
      poseTransitionMs: 70,
      emotionMotion: 'none',
    });

    const sourceKeys = snapshots
      .filter(snapshot => (
        snapshot.activity === 'center-settle'
        || snapshot.activity === 'emotion-pose-transition'
      ))
      .map(snapshot => resolveLunchmateRoomAssetKey(
        snapshot.status,
        snapshot.frame,
        snapshot.facing,
      ));
    expect(sourceKeys.filter((key, index) => key !== sourceKeys[index - 1]))
      .toEqual(['idle', 'happy']);

    vi.advanceTimersByTime(70);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'happy',
      activity: 'center-emotion',
      scaleY: 1,
      emotionMotion: 'happy',
    });
    controller.stop();
  });

  it('returns to idle with the same midpoint pose transition before walking', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { controller, snapshots } = createControllerHarness();

    controller.start();
    vi.advanceTimersByTime(4940);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'happy',
      activity: 'emotion-pose-transition',
      scaleY: 0.97,
      emotionMotion: 'none',
    });
    vi.advanceTimersByTime(70);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'idle',
      activity: 'emotion-pose-transition',
      scaleY: 1,
    });
    vi.advanceTimersByTime(70);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'idle',
      activity: 'center-idle',
      x: 0,
    });
    vi.advanceTimersByTime(300);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'turning-left',
      facing: 'front',
      scaleX: 0.86,
      poseTransitionMs: 80,
    });
    vi.advanceTimersByTime(80);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'turning-left',
      facing: 'left',
      scaleX: 1,
    });
    vi.advanceTimersByTime(80);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'walking-left',
      waypoint: 'left',
      x: -56,
      positionTransitionMs: 1800,
      emotionMotion: 'none',
    });
    vi.advanceTimersByTime(LUNCHMATE_ROOM_WALK_FRAME_MS);
    expect(snapshots.at(-1)).toMatchObject({ status: 'walking-left', frame: 2 });
    controller.stop();
  });

  it('patrols center → left → center → right → center in order', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { controller, snapshots } = createControllerHarness();

    controller.start();
    vi.advanceTimersByTime(5540);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'walking-left',
      waypoint: 'left',
      x: -56,
    });
    vi.advanceTimersByTime(1800);
    expect(snapshots.at(-1)).toMatchObject({
      activity: 'edge-hold',
      waypoint: 'left',
      x: -56,
    });
    vi.advanceTimersByTime(800 + 160);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'walking-right',
      waypoint: 'center',
      x: 0,
    });
    vi.advanceTimersByTime(1800 + 160);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'idle',
      activity: 'center-settle',
      waypoint: 'center',
      facing: 'front',
      x: 0,
    });
    vi.advanceTimersByTime(5000 + 160);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'walking-right',
      waypoint: 'right',
      x: 56,
    });
    vi.advanceTimersByTime(1800 + 800 + 160);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'walking-left',
      waypoint: 'center',
      x: 0,
    });
    vi.advanceTimersByTime(1800 + 160);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'idle',
      waypoint: 'center',
      facing: 'front',
      x: 0,
    });
    controller.stop();
  });

  it('never starts emotion motion while walking, turning, or holding an edge', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { controller, snapshots } = createControllerHarness();

    controller.start();
    vi.advanceTimersByTime(10_260);
    const travelSnapshots = snapshots.filter(snapshot => (
      snapshot.activity === 'walking'
      || snapshot.activity === 'turning'
      || snapshot.activity === 'edge-hold'
    ));
    expect(travelSnapshots.length).toBeGreaterThan(0);
    expect(travelSnapshots.every(snapshot => snapshot.emotionMotion === 'none')).toBe(true);
    controller.stop();
  });

  it('allows crying at most once before the full left-right cycle resets', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    const { controller, snapshots } = createControllerHarness();

    controller.start();
    vi.advanceTimersByTime(3090);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'crying',
      activity: 'emotion-pose-transition',
    });
    vi.advanceTimersByTime(11_960);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'idle',
      activity: 'emotion-pose-transition',
      waypoint: 'center',
    });
    vi.advanceTimersByTime(90);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'sleepy',
      activity: 'emotion-pose-transition',
      waypoint: 'center',
    });
    controller.stop();
  });

  it('defines distinct one-shot motions without opacity', () => {
    const happy = resolveLunchmateRoomEmotionMotion('happy');
    const surprised = resolveLunchmateRoomEmotionMotion('surprised');
    const sleepy = resolveLunchmateRoomEmotionMotion('sleepy');
    const crying = resolveLunchmateRoomEmotionMotion('crying');

    expect(happy.transition.duration).toBe(0.7);
    expect(happy.animate.y).toEqual([0, 1, -3, -1, 0]);
    expect(happy.animate.rotate).toEqual([0, 0, -1.5, 1, 0]);
    expect(happy.animate.scaleX).toEqual([1, 1.02, 0.99, 1, 1]);
    expect(happy.animate.scaleY).toEqual([1, 0.96, 1.02, 1, 1]);
    expect(Math.min(...(happy.animate.y as number[]))).toBe(-3);
    expect((happy.animate.y as number[]).at(-1)).toBe(0);
    expect((happy.animate.rotate as number[]).at(-1)).toBe(0);
    expect((happy.animate.scaleX as number[]).at(-1)).toBe(1);
    expect((happy.animate.scaleY as number[]).at(-1)).toBe(1);
    expect(surprised.transition.duration).toBe(0.35);
    expect(surprised.animate.scale).toEqual([1, 1.04, 1]);
    expect(sleepy.transition.duration).toBe(1.6);
    expect(sleepy.animate.rotate).toEqual([0, 2, 0, 2, 0]);
    expect(sleepy.animate.y).toEqual([0, 2, 0, 2, 0]);
    expect(crying.transition.duration).toBe(0.6);
    expect(crying.animate.x).toEqual([0, -1, 1, -1, 0]);
    [happy, surprised, sleepy, crying].forEach((motion) => {
      expect(motion.animate).not.toHaveProperty('opacity');
      expect(motion.transition).not.toHaveProperty('repeat');
    });
  });

  it('keeps idle, walking, and reduced-motion happy on the static neutral pose', () => {
    const idle = resolveLunchmateRoomEmotionMotion('none');
    const reducedHappy = resolveLunchmateRoomEmotionMotion('happy', false);

    expect(idle).toEqual({
      id: 'none',
      animate: {
        x: 0,
        y: 0,
        rotate: 0,
        scale: 1,
        scaleX: 1,
        scaleY: 1,
      },
      transition: { duration: 0 },
    });
    expect(reducedHappy).toEqual(idle);
    expect(resolveLunchmateRoomAssetKey('walking-left', 1, 'left'))
      .toBe('side-walk-left-1');
  });

  it('disables every automatic pose motion for reduced motion', () => {
    vi.useFakeTimers();
    const { controller, snapshots } = createControllerHarness(true);

    controller.start();
    vi.advanceTimersByTime(20_000);

    expect(snapshots).toEqual([{
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
      animationsEnabled: false,
    }]);
    expect(resolveLunchmateRoomEmotionMotion('sleepy', false)).toMatchObject({
      id: 'none',
      transition: { duration: 0 },
    });
    expect(vi.getTimerCount()).toBe(0);
    controller.stop();
  });

  it('starts the scheduler only once even if start is called twice', () => {
    vi.useFakeTimers();
    const { controller, snapshots } = createControllerHarness();

    controller.start();
    controller.start();
    expect(snapshots.filter(snapshot => snapshot.activity === 'center-settle'))
      .toHaveLength(1);
    expect(vi.getTimerCount()).toBe(1);
    controller.stop();
  });

  it('pauses the current timer while hidden and resumes without duplication', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { controller, snapshots } = createControllerHarness();

    controller.start();
    vi.advanceTimersByTime(1000);
    controller.setVisible(false);
    expect(snapshots.at(-1)?.animationsEnabled).toBe(false);
    vi.advanceTimersByTime(5000);
    expect(snapshots.at(-1)?.status).toBe('idle');
    expect(vi.getTimerCount()).toBe(0);

    controller.setVisible(true);
    expect(snapshots.at(-1)?.animationsEnabled).toBe(true);
    vi.advanceTimersByTime(1999);
    expect(snapshots.at(-1)?.activity).toBe('center-settle');
    vi.advanceTimersByTime(1);
    expect(snapshots.at(-1)).toMatchObject({
      status: 'idle',
      activity: 'emotion-pose-transition',
      scaleY: 0.97,
    });
    expect(vi.getTimerCount()).toBe(1);
    controller.stop();
  });

  it('clears both phase and walking-frame timers on cleanup', () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { controller } = createControllerHarness();

    controller.start();
    vi.advanceTimersByTime(5540);
    expect(vi.getTimerCount()).toBe(2);
    controller.stop();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('FoodieRoom motion integration contract', () => {
  it('renders one opaque chicken PNG inside separate position and pose wrappers', () => {
    expect(FOODIE_ROOM_SOURCE).toContain('className="relative h-[270px]');
    expect(FOODIE_ROOM_SOURCE).toContain(
      'className="absolute inset-x-0 bottom-11 z-10 flex justify-center"',
    );
    expect(FOODIE_ROOM_SOURCE).toContain('size={156}');
    expect(FOODIE_ROOM_SOURCE).toContain(
      'transform: `translate3d(${roomMotion.x}px, 0, 0)`',
    );
    expect(FOODIE_ROOM_SOURCE).toContain(
      'transform: `scaleX(${roomMotion.scaleX}) scaleY(${roomMotion.scaleY})`',
    );
    expect(FOODIE_ROOM_SOURCE).toContain(
      'chickenAssetKeyOverride={roomMotion.assetKey}',
    );
    expect(FOODIE_ROOM_SOURCE).toContain(
      'onChickenImageLoad={roomMotion.handleCharacterImageLoad}',
    );
    expect(RENDERER_SOURCE.match(/data-lunchmate-layer="chicken-base"/g)).toHaveLength(1);
    expect(RENDERER_SOURCE).not.toContain('data-lunchmate-layer="chicken-previous"');
    expect(RENDERER_SOURCE).not.toContain('chickenPreviousAssetKey');
    expect(RENDERER_SOURCE).not.toContain('chickenCrossfadeMs');
    expect(RENDERER_SOURCE).toContain('style={{ objectPosition: \'center bottom\', userSelect: \'none\', opacity: 1 }}');
  });

  it('keeps every costume layer mounted inside both moving wrappers', () => {
    const outerWrapper = FOODIE_ROOM_SOURCE.indexOf('ref={roomMotion.characterRef}');
    const innerWrapper = FOODIE_ROOM_SOURCE.indexOf('scaleX(${roomMotion.scaleX})', outerWrapper);
    const renderer = FOODIE_ROOM_SOURCE.indexOf('<LunchmateCharacterRenderer', innerWrapper);
    const loadout = FOODIE_ROOM_SOURCE.indexOf('loadout={draftLoadout}', renderer);

    expect(outerWrapper).toBeGreaterThan(-1);
    expect(innerWrapper).toBeGreaterThan(outerWrapper);
    expect(renderer).toBeGreaterThan(innerWrapper);
    expect(loadout).toBeGreaterThan(renderer);
    expect(RENDERER_SOURCE).toContain('{renderAccessories(backLayers)}');
    expect(RENDERER_SOURCE).toContain('{renderAccessories(frontBodyLayers)}');
    expect(RENDERER_SOURCE).toContain('{renderAccessories(faceAccessoryLayers)}');
  });

  it('auto-measures on layout and image load without a user-input start gate', () => {
    expect(HOOK_SOURCE).toContain('useLayoutEffect(() =>');
    expect(HOOK_SOURCE).toContain('scheduleLunchmateRoomInitialMeasurement(measure)');
    expect(HOOK_SOURCE).toContain('hasLunchmateRoomMeasurements(stageWidth, characterWidth)');
    expect(HOOK_SOURCE).toContain('if (!motionReady) return undefined');
    expect(HOOK_SOURCE).toContain('controller.start()');
    expect(HOOK_SOURCE).toContain('const handleCharacterImageLoad = useCallback');
    expect(HOOK_SOURCE).not.toContain("addEventListener('click'");
    expect(HOOK_SOURCE).not.toContain("addEventListener('pointer");
  });

  it('preloads sprites and cleans RAF, visibility, resize, and observer work', () => {
    expect(HOOK_SOURCE).toContain('preloadLunchmateRoomMotionAssets()');
    expect(HOOK_SOURCE).toContain("document.addEventListener('visibilitychange'");
    expect(HOOK_SOURCE).toContain("document.removeEventListener('visibilitychange'");
    expect(HOOK_SOURCE).toContain("window.addEventListener('resize'");
    expect(HOOK_SOURCE).toContain("window.removeEventListener('resize'");
    expect(HOOK_SOURCE).toContain('cancelAnimationFrame(imageLoadFrameRef.current)');
    expect(HOOK_SOURCE).toContain('resizeObserver?.disconnect()');
    expect(HOOK_SOURCE).toContain('controller.stop()');
    expect(HOOK_SOURCE).not.toContain('localStorage');
  });
});
