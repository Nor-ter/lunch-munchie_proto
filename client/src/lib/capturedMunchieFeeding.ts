import type { LunchboxFoodItem } from '@/components/munchie/LunchboxBottomSheet';
import { displayImageForCapturedMunchie } from '@/lib/munchieCapture';
import type { CapturedMunchie } from '@/types/munchieCapture';

export const CAPTURED_MUNCHIE_XP = 20;

export function capturedMunchieToLunchboxFoodItem(
  munchie: CapturedMunchie,
): LunchboxFoodItem {
  return {
    id: `captured:${munchie.id}`,
    name: '오늘의 Munchie',
    image: displayImageForCapturedMunchie(munchie),
    placeholder: '🍽️',
    quantity: munchie.fedAt === undefined ? 1 : 0,
    unseenQuantity: 0,
    sourceLabel: 'Munchie Capture',
    xpPreview: CAPTURED_MUNCHIE_XP,
  };
}

export type CapturedMunchieFeedGateResult = 'started' | 'already-fed' | 'busy';

export interface CapturedMunchieFeedGate {
  readonly activeMunchieId: string | null;
  tryStart: (
    munchie: CapturedMunchie,
    lunchmateFlowBusy: boolean,
  ) => CapturedMunchieFeedGateResult;
  finish: (munchieId: string) => void;
}

export function createCapturedMunchieFeedGate(): CapturedMunchieFeedGate {
  let activeMunchieId: string | null = null;
  return {
    get activeMunchieId() {
      return activeMunchieId;
    },
    tryStart(munchie, lunchmateFlowBusy) {
      if (munchie.fedAt !== undefined) return 'already-fed';
      if (lunchmateFlowBusy || activeMunchieId !== null) return 'busy';
      activeMunchieId = munchie.id;
      return 'started';
    },
    finish(munchieId) {
      if (activeMunchieId === munchieId) activeMunchieId = null;
    },
  };
}
