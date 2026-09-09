import { useCallback, useEffect, useRef, useState } from 'react';
import type { LunchboxFoodItem } from '@/components/munchie/LunchboxBottomSheet';
import type { RemoveCapturedMunchieStorageResult } from '@/hooks/useCapturedMunchieCollection';
import { useLunchmateFlow } from '@/hooks/useLunchmateFlow';
import {
  capturedMunchieToLunchboxFoodItem,
  createCapturedMunchieFeedGate,
} from '@/lib/capturedMunchieFeeding';
import type { CapturedMunchie } from '@/types/munchieCapture';

interface UseCapturedMunchieFeedingOptions {
  items: readonly CapturedMunchie[];
  initialTotalXp: number;
  removeMunchie: (id: string) => Promise<RemoveCapturedMunchieStorageResult>;
  onTotalXpChange: (nextTotalXp: number) => void;
}

export type StartCapturedMunchieFeedingResult =
  | { status: 'started'; completion: Promise<boolean> }
  | { status: 'already-fed' }
  | { status: 'busy' };

export function useCapturedMunchieFeeding({
  items,
  initialTotalXp,
  removeMunchie,
  onTotalXpChange,
}: UseCapturedMunchieFeedingOptions) {
  const itemsRef = useRef(items);
  const pendingMunchieRef = useRef<CapturedMunchie | null>(null);
  const committedMunchieIdRef = useRef<string | null>(null);
  const feedGateRef = useRef(createCapturedMunchieFeedGate());
  const [feedingMunchieId, setFeedingMunchieId] = useState<string | null>(null);
  itemsRef.current = items;

  const persistConsumedMunchie = useCallback(async (item: LunchboxFoodItem) => {
    const pendingMunchie = pendingMunchieRef.current;
    if (!pendingMunchie || item.id !== `captured:${pendingMunchie.id}`) {
      throw new Error('The captured Munchie feeding transaction is no longer active.');
    }
    const result = await removeMunchie(pendingMunchie.id);
    if (!result.ok) throw new Error(result.message);
    committedMunchieIdRef.current = pendingMunchie.id;
  }, [removeMunchie]);

  const lunchmateFlow = useLunchmateFlow({
    initialState: 'foodAvailable',
    initialTotalXp,
    onFoodConsumed: persistConsumedMunchie,
    onTotalXpChange,
    onSuccessClose: () => undefined,
  });

  useEffect(() => {
    if (lunchmateFlow.levelUpEvent) lunchmateFlow.acknowledgeLevelUp();
  }, [lunchmateFlow.acknowledgeLevelUp, lunchmateFlow.levelUpEvent]);

  const feedMunchie = useCallback((
    requestedMunchie: CapturedMunchie,
  ): StartCapturedMunchieFeedingResult => {
    const munchie = itemsRef.current.find(item => item.id === requestedMunchie.id);
    if (!munchie) return { status: 'already-fed' };

    const gateResult = feedGateRef.current.tryStart(munchie, lunchmateFlow.isBusy);
    if (gateResult !== 'started') return { status: gateResult };

    pendingMunchieRef.current = munchie;
    committedMunchieIdRef.current = null;
    setFeedingMunchieId(munchie.id);
    const completion = lunchmateFlow.shareFood(
      capturedMunchieToLunchboxFoodItem(munchie),
    ).then(() => committedMunchieIdRef.current === munchie.id).finally(() => {
      feedGateRef.current.finish(munchie.id);
      if (pendingMunchieRef.current?.id === munchie.id) pendingMunchieRef.current = null;
      if (committedMunchieIdRef.current === munchie.id) committedMunchieIdRef.current = null;
      setFeedingMunchieId(current => current === munchie.id ? null : current);
    });
    return { status: 'started', completion };
  }, [lunchmateFlow.isBusy, lunchmateFlow.shareFood]);

  return {
    lunchmateFlow,
    feedingMunchieId,
    feedMunchie,
  };
}
