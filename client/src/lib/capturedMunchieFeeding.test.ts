import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  capturedMunchieToLunchboxFoodItem,
  CAPTURED_MUNCHIE_XP,
  createCapturedMunchieFeedGate,
} from './capturedMunchieFeeding';
import {
  createCapturedMunchie,
  markCapturedMunchieFedInCollection,
} from './munchieCapture';
import { createLunchmateProgressUpdate } from '@/utils/lunchmateProgress';

const originalImage = 'data:image/jpeg;base64,original';
const cutoutImage = 'data:image/webp;base64,cutout';

describe('captured Munchie feeding adapter', () => {
  it('adapts an unfed memory to a temporary +20 XP LunchboxFoodItem', () => {
    const munchie = createCapturedMunchie(originalImage, 0, cutoutImage);
    expect(capturedMunchieToLunchboxFoodItem(munchie)).toEqual({
      id: `captured:${munchie.id}`,
      name: '오늘의 Munchie',
      image: cutoutImage,
      placeholder: '🍽️',
      quantity: 1,
      unseenQuantity: 0,
      sourceLabel: 'Munchie Capture',
      xpPreview: 20,
    });
  });

  it('makes a fed memory unavailable without removing it', () => {
    const munchie = { ...createCapturedMunchie(originalImage, 0), fedAt: 123, xpGranted: 20 };
    expect(capturedMunchieToLunchboxFoodItem(munchie).quantity).toBe(0);
  });
});

describe('captured Munchie exactly-once feeding', () => {
  it('grants once, blocks an in-flight double tap and keeps collection length unchanged', () => {
    const first = createCapturedMunchie(originalImage, 0);
    const second = createCapturedMunchie(originalImage, 1);
    const gate = createCapturedMunchieFeedGate();
    let items = [first, second];
    let totalXp = 35;
    let feedingCalls = 0;

    expect(gate.tryStart(first, false)).toBe('started');
    feedingCalls += 1;
    expect(gate.tryStart(first, false)).toBe('busy');

    const firstCommit = markCapturedMunchieFedInCollection(items, first.id, CAPTURED_MUNCHIE_XP, 1000);
    expect(firstCommit.updated).toBe(true);
    items = firstCommit.items;
    totalXp = createLunchmateProgressUpdate(totalXp, CAPTURED_MUNCHIE_XP).nextTotalXp;
    gate.finish(first.id);

    expect(feedingCalls).toBe(1);
    expect(totalXp).toBe(55);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ fedAt: 1000, xpGranted: 20 });
    expect(gate.tryStart(items[0]!, false)).toBe('already-fed');
    expect(totalXp).toBe(55);

    expect(gate.tryStart(second, false)).toBe('started');
    feedingCalls += 1;
    const secondCommit = markCapturedMunchieFedInCollection(items, second.id, CAPTURED_MUNCHIE_XP, 2000);
    items = secondCommit.items;
    totalXp = createLunchmateProgressUpdate(totalXp, CAPTURED_MUNCHIE_XP).nextTotalXp;
    gate.finish(second.id);

    expect(feedingCalls).toBe(2);
    expect(totalXp).toBe(75);
    expect(items).toHaveLength(2);
    expect(items[1]).toMatchObject({ fedAt: 2000, xpGranted: 20 });
  });

  it('keeps the existing Lunchmate flow and removes captured inventory only through its success callback', () => {
    const source = readFileSync(
      join(process.cwd(), 'client', 'src', 'hooks', 'useCapturedMunchieFeeding.ts'),
      'utf8',
    );
    expect(source).toContain('useLunchmateFlow({');
    expect(source).toContain('await removeMunchie(pendingMunchie.id)');
    expect(source).toContain('onFoodConsumed: persistConsumedMunchie');
    expect(source).not.toContain('markMunchieFed(');
    expect(source).not.toContain('consumeLunchboxFood');
    expect(source).not.toContain('lunchboxInventory');
  });

  it('keeps Hatch queueing and Snack Time entry separate from the feeding call', () => {
    const pageSource = readFileSync(
      join(process.cwd(), 'client', 'src', 'pages', 'MunchieCapturePrototypePage.tsx'),
      'utf8',
    );
    const hatchStart = pageSource.indexOf('const sendMunchieThroughHatch');
    const queueStart = pageSource.indexOf('const startQueuedSnackTime');
    const snackStart = pageSource.indexOf('const beginSnackFeeding');
    const snackDropStart = pageSource.indexOf('const handleSnackPointerUp');
    const snackFinish = pageSource.indexOf('const finishSnackTime');

    expect(hatchStart).toBeGreaterThan(-1);
    expect(queueStart).toBeGreaterThan(hatchStart);
    expect(pageSource.slice(hatchStart, queueStart)).toContain('setHatchFlight({');
    expect(pageSource.slice(hatchStart, queueStart)).toContain('if (munchie.fedAt !== undefined)');
    expect(pageSource.slice(hatchStart, snackStart)).not.toContain('feedMunchie(');
    expect(pageSource.slice(queueStart, snackStart)).toContain('hatchQueue.queuedIds');
    expect(pageSource.slice(queueStart, snackStart)).toContain('createMunchieSnackTimeSession');
    expect(pageSource.slice(queueStart, snackStart)).toContain("dispatchHatchQueue({ type: 'clear' })");
    expect(pageSource.slice(queueStart, snackStart)).toContain("setPhase('snackTime')");
    expect(pageSource.slice(snackStart, snackFinish)).toContain('feeding.feedMunchie(snackMunchie)');
    expect(pageSource.slice(snackDropStart, snackFinish)).toContain('if (droppedOnLunchmate)');
    expect(pageSource.slice(snackDropStart, snackFinish)).toContain('beginSnackFeeding({ deltaX, deltaY })');
    expect(pageSource).toContain("phase === 'snackTime'");
    expect(pageSource).toContain('Back to Tank');
    expect(pageSource).not.toContain('const openFeedHatch');
    expect(pageSource).toContain('onMunchieSelect={selectTankMunchie}');
  });

  it('adds Hatch drag while keeping Tank tap playful and placement immutable', () => {
    const containerSource = readFileSync(
      join(process.cwd(), 'client', 'src', 'components', 'munchie', 'MunchieCaptureContainer.tsx'),
      'utf8',
    );
    expect(containerSource).toContain('<button');
    expect(containerSource).toContain('setTapReaction(current => ({');
    expect(containerSource).toContain('y: [0, -14, 2, 0]');
    expect(containerSource).toContain('x: [0, reactionDirection * 4, -reactionDirection, 0]');
    expect(containerSource).toContain('nearestMunchieIds');
    expect(containerSource).toContain('onPointerDown={handlePointerDown}');
    expect(containerSource).toContain('if (droppedOnHatch)');
    expect(containerSource).toContain('returnTankDragToOrigin()');
    expect(containerSource).toContain('createPortal(');
    expect(containerSource).not.toContain('onMunchiePlacementChange');
    expect(containerSource).not.toContain('updateMunchiePlacement');
    expect(containerSource).toContain('♡');
    expect(containerSource).not.toContain('>\n                        ✓\n');
  });

  it('adds the Hatch queue without changing the Tank or Snack Time presentation', () => {
    const pageSource = readFileSync(
      join(process.cwd(), 'client', 'src', 'pages', 'MunchieCapturePrototypePage.tsx'),
      'utf8',
    );

    expect(pageSource).toContain('onMunchieDropOnHatch={sendMunchieThroughHatch}');
    expect(pageSource).toContain('getHatchBounds={() => hatchRef.current?.getBoundingClientRect() ?? null}');
    expect(pageSource).toContain('queuedMunchieIds={transitioningOrQueuedMunchieIds}');
    expect(pageSource).toContain("dispatchHatchQueue({ type: 'enqueue', id: hatchFlight.id })");
    expect(pageSource).toContain("dispatchHatchQueue({ type: 'dequeue', id: munchie.id })");
    expect(pageSource).toContain('h-[64px] w-[116px]');
    expect(pageSource).toContain('Munchie를 Hatch로 끌어 Queue에 담아요 ✨');
    const tankStart = pageSource.indexOf('{showContainer && (');
    const snackTimeStart = pageSource.indexOf("{phase === 'snackTime'", tankStart);
    expect(pageSource.slice(tankStart, snackTimeStart)).not.toContain('<LunchmateCharacterRenderer');
    expect(pageSource.slice(snackTimeStart)).toContain('<LunchmateCharacterRenderer');
  });

  it('does not auto-feed on Snack Time entry and hides XP until successful feeding', () => {
    const pageSource = readFileSync(
      join(process.cwd(), 'client', 'src', 'pages', 'MunchieCapturePrototypePage.tsx'),
      'utf8',
    );
    const introCompletion = pageSource.indexOf("if (snackTimeStage === 'arriving'");
    const foodEnd = pageSource.indexOf('</motion.button>', introCompletion);

    expect(pageSource.slice(introCompletion, foodEnd)).toContain("setSnackTimeStage('noticing')");
    expect(pageSource.slice(introCompletion, foodEnd)).not.toContain('beginSnackFeeding(');
    expect(pageSource).toContain("(snackTimeStage === 'celebrating' || snackTimeStage === 'complete') && (");
    expect(pageSource).toContain('Munchie를 Lunchmate에게 줘보세요 ✨');
    expect(pageSource).toContain('선택한 Munchie를 Lunchmate에게 주기');
  });

  it('advances the multi-Munchie session and shows completion only after the last item', () => {
    const pageSource = readFileSync(
      join(process.cwd(), 'client', 'src', 'pages', 'MunchieCapturePrototypePage.tsx'),
      'utf8',
    );
    const snackStart = pageSource.indexOf('const beginSnackFeeding');
    const snackFinish = pageSource.indexOf('const finishSnackTime');
    const snackSource = pageSource.slice(snackStart, snackFinish);

    expect(snackSource).toContain('consumeActiveSnackTimeMunchie(snackSession, snackMunchie.id)');
    expect(snackSource).toContain("advancement.status === 'complete' ? 'complete' : 'arriving'");
    expect(pageSource).toContain('waitingSnackTimeMunchies(snackSession)');
    expect(pageSource).toContain('Snack Time Complete ✨');
    expect(pageSource).toContain('snackTimeSessionXpGain(snackSession, CAPTURED_MUNCHIE_XP)');
  });

  it('awaits inventory deletion before applying XP', () => {
    const flowSource = readFileSync(
      join(process.cwd(), 'client', 'src', 'hooks', 'useLunchmateFlow.ts'),
      'utf8',
    );
    const consume = flowSource.indexOf('await onFoodConsumed(item);');
    const preview = flowSource.indexOf('previewXpRef.current = progressUpdate.nextTotalXp;', consume);
    const xp = flowSource.indexOf('onTotalXpChange(progressUpdate.nextTotalXp);', consume);

    expect(consume).toBeGreaterThan(-1);
    expect(preview).toBeGreaterThan(consume);
    expect(xp).toBeGreaterThan(consume);
  });
});
