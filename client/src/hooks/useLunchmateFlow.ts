import { useCallback, useEffect, useRef, useState } from 'react';
import type { LunchboxFoodItem } from '@/components/munchie/LunchboxBottomSheet';
import type { FoodieBuddyUiState } from '@/components/munchie/FoodieBuddy';
import {
  createLunchmateProgressUpdate,
  getLunchmateProgressSnapshot,
  normalizeLunchmateTotalXp,
  type LunchmateLevelUpEvent,
} from '@/utils/lunchmateProgress';

const FAIL_ONCE_FOOD_ID = 'preview-strawberry-cake';

class LunchmateMockError extends Error {}

function abortError() {
  return new DOMException('Mock lunchmate flow aborted', 'AbortError');
}

function waitForMock(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }

    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, ms);
    const handleAbort = () => {
      window.clearTimeout(timeoutId);
      signal.removeEventListener('abort', handleAbort);
      reject(abortError());
    };

    signal.addEventListener('abort', handleAbort, { once: true });
  });
}

async function shareBiteMock(item: LunchboxFoodItem, attempt: number, signal: AbortSignal) {
  await waitForMock(400, signal);

  // 실패 경로를 직접 확인할 수 있도록 딸기 케이크의 첫 요청만 실패시킨다.
  if (item.id === FAIL_ONCE_FOOD_ID && attempt === 1) {
    throw new LunchmateMockError('미리보기 요청이 잠시 실패했어요. 선택한 음식으로 다시 시도해 주세요.');
  }

  return {
    xpGained: item.xpPreview,
    message: `${item.placeholder ?? '🍽️'} 맛있는 한입! +${item.xpPreview} XP`,
  };
}

interface UseLunchmateFlowOptions {
  initialState?: FoodieBuddyUiState;
  initialTotalXp?: number;
  onTotalXpChange: (totalXp: number) => void;
  onSuccessClose: () => void;
}

export function useLunchmateFlow({
  initialState = 'foodAvailable',
  initialTotalXp = 0,
  onTotalXpChange,
  onSuccessClose,
}: UseLunchmateFlowOptions) {
  const normalizedInitialTotalXp = normalizeLunchmateTotalXp(initialTotalXp);
  const [state, setState] = useState<FoodieBuddyUiState>(initialState);
  const [selectedFood, setSelectedFood] = useState<LunchboxFoodItem | null>(null);
  const [previewXp, setPreviewXp] = useState(normalizedInitialTotalXp);
  const [previousPreviewXp, setPreviousPreviewXp] = useState(normalizedInitialTotalXp);
  const [lastXpGain, setLastXpGain] = useState(0);
  const [resultMessage, setResultMessage] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [levelUpEvents, setLevelUpEvents] = useState<LunchmateLevelUpEvent[]>([]);
  const attemptsRef = useRef(new Map<string, number>());
  const activeControllerRef = useRef<AbortController | null>(null);
  const isRunningRef = useRef(false);
  const previewXpRef = useRef(normalizedInitialTotalXp);

  useEffect(() => () => activeControllerRef.current?.abort(), []);
  useEffect(() => {
    const nextTotalXp = normalizeLunchmateTotalXp(initialTotalXp);
    if (isRunningRef.current || previewXpRef.current === nextTotalXp) return;
    previewXpRef.current = nextTotalXp;
    setPreviousPreviewXp(nextTotalXp);
    setPreviewXp(nextTotalXp);
  }, [initialTotalXp]);

  const beginSelecting = useCallback(() => {
    if (isRunningRef.current) return false;
    setSelectedFood(null);
    setErrorMessage(undefined);
    setResultMessage(undefined);
    setState('selectingFood');
    return true;
  }, []);

  const selectFood = useCallback((item: LunchboxFoodItem) => {
    if (isRunningRef.current || item.quantity <= 0) return;
    setSelectedFood(item);
    setErrorMessage(undefined);
    setState('selectingFood');
  }, []);

  const cancel = useCallback(() => {
    activeControllerRef.current?.abort();
    activeControllerRef.current = null;
    isRunningRef.current = false;
    setSelectedFood(null);
    setErrorMessage(undefined);
    setResultMessage(undefined);
    setState(initialState);
  }, [initialState]);

  const acknowledgeLevelUp = useCallback(() => {
    setLevelUpEvents(events => events.slice(1));
  }, []);

  const shareFood = useCallback(async (item: LunchboxFoodItem) => {
    if (isRunningRef.current || item.quantity <= 0) return;

    isRunningRef.current = true;
    setSelectedFood(item);
    setErrorMessage(undefined);
    setState('submitting');

    const controller = new AbortController();
    activeControllerRef.current = controller;
    const attempt = (attemptsRef.current.get(item.id) ?? 0) + 1;
    attemptsRef.current.set(item.id, attempt);

    try {
      const result = await shareBiteMock(item, attempt, controller.signal);
      const progressUpdate = createLunchmateProgressUpdate(
        previewXpRef.current,
        result.xpGained,
      );
      previewXpRef.current = progressUpdate.nextTotalXp;
      setPreviousPreviewXp(progressUpdate.previousTotalXp);
      setPreviewXp(progressUpdate.nextTotalXp);
      onTotalXpChange(progressUpdate.nextTotalXp);
      setLastXpGain(result.xpGained);
      setResultMessage(result.message);
      onSuccessClose();

      // Sheet exit(0.3s) 뒤에 전달 표현을 시작해 overlay에 가려지지 않게 한다.
      await waitForMock(300, controller.signal);
      setState('sharingAnimation');
      await waitForMock(500, controller.signal);
      setState('reaction');

      await waitForMock(650, controller.signal);
      setState('idle');
      setSelectedFood(null);
      if (progressUpdate.levelUpEvents.length > 0) {
        setLevelUpEvents(events => [...events, ...progressUpdate.levelUpEvents]);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setErrorMessage(error instanceof LunchmateMockError
        ? error.message
        : '미리보기 요청에 실패했어요. 음식은 차감되지 않았으니 다시 시도해 주세요.');
      setState('error');
    } finally {
      if (activeControllerRef.current === controller) {
        activeControllerRef.current = null;
        isRunningRef.current = false;
      }
    }
  }, [onSuccessClose, onTotalXpChange]);

  return {
    state,
    selectedFood,
    progressSnapshot: getLunchmateProgressSnapshot(previewXp),
    previousProgressSnapshot: getLunchmateProgressSnapshot(previousPreviewXp),
    lastXpGain,
    resultMessage,
    errorMessage,
    levelUpEvent: levelUpEvents[0] ?? null,
    isBusy: state === 'submitting' || state === 'sharingAnimation' || state === 'reaction',
    beginSelecting,
    selectFood,
    shareFood,
    cancel,
    acknowledgeLevelUp,
  };
}
