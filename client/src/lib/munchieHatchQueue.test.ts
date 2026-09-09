import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EMPTY_MUNCHIE_HATCH_QUEUE,
  clearMunchieHatchQueue,
  dequeueMunchie,
  enqueueMunchie,
  isMunchieQueued,
  munchieHatchQueueReducer,
} from './munchieHatchQueue';

describe('Munchie Hatch Queue', () => {
  it('enqueues A, B and C in order without duplicates', () => {
    const withA = enqueueMunchie(EMPTY_MUNCHIE_HATCH_QUEUE, 'A');
    const withB = enqueueMunchie(withA, 'B');
    const withC = enqueueMunchie(withB, 'C');
    const duplicateA = enqueueMunchie(withC, 'A');

    expect(withA.queuedIds).toEqual(['A']);
    expect(withB.queuedIds).toEqual(['A', 'B']);
    expect(withC.queuedIds).toEqual(['A', 'B', 'C']);
    expect(duplicateA).toBe(withC);
  });

  it('dequeues only the requested Munchie and reports queue membership', () => {
    const state = { queuedIds: ['A', 'B', 'C'] };
    const withoutB = dequeueMunchie(state, 'B');

    expect(withoutB.queuedIds).toEqual(['A', 'C']);
    expect(isMunchieQueued(withoutB, 'A')).toBe(true);
    expect(isMunchieQueued(withoutB, 'B')).toBe(false);
    expect(dequeueMunchie(withoutB, 'missing')).toBe(withoutB);
  });

  it('supports reducer actions and clears only session state', () => {
    const withA = munchieHatchQueueReducer(EMPTY_MUNCHIE_HATCH_QUEUE, {
      type: 'enqueue',
      id: 'A',
    });
    const cleared = munchieHatchQueueReducer(withA, { type: 'clear' });

    expect(cleared).toEqual(EMPTY_MUNCHIE_HATCH_QUEUE);
    expect(clearMunchieHatchQueue(cleared)).toBe(cleared);
  });

  it('does not mutate inventory feeding fields or persist queue state', () => {
    const inventoryItem = { id: 'A', fedAt: undefined, xpGranted: undefined };
    const before = { ...inventoryItem };

    enqueueMunchie(EMPTY_MUNCHIE_HATCH_QUEUE, inventoryItem.id);

    expect(inventoryItem).toEqual(before);
    const helperSource = readFileSync(
      join(process.cwd(), 'client', 'src', 'lib', 'munchieHatchQueue.ts'),
      'utf8',
    );
    expect(helperSource).not.toContain('localStorage');
    expect(helperSource).not.toContain('indexedDB');
  });

  it('queues after Hatch travel without automatically starting Snack Time', () => {
    const pageSource = readFileSync(
      join(process.cwd(), 'client', 'src', 'pages', 'MunchieCapturePrototypePage.tsx'),
      'utf8',
    );
    const containerSource = readFileSync(
      join(process.cwd(), 'client', 'src', 'components', 'munchie', 'MunchieCaptureContainer.tsx'),
      'utf8',
    );
    const flightCompletion = pageSource.indexOf(
      'if (hatchTransitionMunchieIdRef.current !== hatchFlight.id) return;',
    );
    const flightEnd = pageSource.indexOf('aria-hidden="true"', flightCompletion);
    const completionSource = pageSource.slice(flightCompletion, flightEnd);

    expect(completionSource).toContain("dispatchHatchQueue({ type: 'enqueue', id: hatchFlight.id })");
    expect(completionSource).not.toContain("setPhase('snackTime')");
    expect(pageSource).toContain('queuedMunchieIds={transitioningOrQueuedMunchieIds}');
    expect(containerSource).toContain('opacity: 0.2');
  });
});
