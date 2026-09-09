import { describe, expect, it } from 'vitest';
import { createCapturedMunchie } from './munchieCapture';
import {
  activeSnackTimeMunchie,
  consumeActiveSnackTimeMunchie,
  createMunchieSnackTimeSession,
  snackTimeSessionXpGain,
  waitingSnackTimeMunchies,
} from './munchieSnackTimeSession';

const image = 'data:image/jpeg;base64,bXVuY2hpZQ==';
const inventory = ['A', 'B', 'C'].map((id, index) => ({
  ...createCapturedMunchie(image, index),
  id,
}));

describe('multi-Munchie Snack Time session', () => {
  it('takes the full queue in order and exposes one active Munchie', () => {
    const session = createMunchieSnackTimeSession(['A', 'B', 'C'], inventory);

    expect(session.items.map(item => item.id)).toEqual(['A', 'B', 'C']);
    expect(activeSnackTimeMunchie(session)?.id).toBe('A');
    expect(waitingSnackTimeMunchies(session).map(item => item.id)).toEqual(['B', 'C']);
  });

  it('advances A, B and C only after the current active item is consumed', () => {
    const initial = createMunchieSnackTimeSession(['A', 'B', 'C'], inventory);
    const afterA = consumeActiveSnackTimeMunchie(initial, 'A');
    const afterB = consumeActiveSnackTimeMunchie(afterA.state, 'B');
    const afterC = consumeActiveSnackTimeMunchie(afterB.state, 'C');

    expect(afterA.status).toBe('advanced');
    expect(activeSnackTimeMunchie(afterA.state)?.id).toBe('B');
    expect(afterB.status).toBe('advanced');
    expect(activeSnackTimeMunchie(afterB.state)?.id).toBe('C');
    expect(afterC.status).toBe('complete');
    expect(activeSnackTimeMunchie(afterC.state)).toBeNull();
    expect(afterC.state.consumedIds).toEqual(['A', 'B', 'C']);
    expect(snackTimeSessionXpGain(afterC.state, 20)).toBe(60);
  });

  it('ignores out-of-order and duplicate consumption', () => {
    const initial = createMunchieSnackTimeSession(['A', 'B', 'C'], inventory);
    const outOfOrder = consumeActiveSnackTimeMunchie(initial, 'B');
    const afterA = consumeActiveSnackTimeMunchie(initial, 'A');
    const duplicateA = consumeActiveSnackTimeMunchie(afterA.state, 'A');

    expect(outOfOrder).toEqual({ state: initial, status: 'ignored' });
    expect(duplicateA).toEqual({ state: afterA.state, status: 'ignored' });
  });

  it('deduplicates queue IDs and excludes missing or legacy-fed items', () => {
    const fedB = { ...inventory[1]!, fedAt: 123, xpGranted: 20 };
    const session = createMunchieSnackTimeSession(
      ['A', 'A', 'missing', 'B', 'C'],
      [inventory[0]!, fedB, inventory[2]!],
    );

    expect(session.items.map(item => item.id)).toEqual(['A', 'C']);
  });
});
