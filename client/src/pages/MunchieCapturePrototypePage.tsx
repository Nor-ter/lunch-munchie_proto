import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Camera, ChevronLeft, ImagePlus, LoaderCircle, Sparkles, Utensils } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import { useHistoryState } from 'wouter/use-browser-location';
import LunchmateCharacterRenderer from '@/components/munchie/LunchmateCharacterRenderer';
import MunchieCaptureContainer, {
  CapturedMunchieVisual,
} from '@/components/munchie/MunchieCaptureContainer';
import { useApp } from '@/contexts/AppContext';
import { useCapturedMunchieCollection } from '@/hooks/useCapturedMunchieCollection';
import { useCapturedMunchieFeeding } from '@/hooks/useCapturedMunchieFeeding';
import { fileToResizedDataUrl } from '@/lib/imageUtils';
import { CAPTURED_MUNCHIE_XP } from '@/lib/capturedMunchieFeeding';
import {
  EMPTY_MUNCHIE_HATCH_QUEUE,
  isMunchieQueued,
  munchieHatchQueueReducer,
} from '@/lib/munchieHatchQueue';
import {
  activeSnackTimeMunchie,
  consumeActiveSnackTimeMunchie,
  createMunchieSnackTimeSession,
  snackTimeSessionXpGain,
  waitingSnackTimeMunchies,
  type MunchieSnackTimeSession,
} from '@/lib/munchieSnackTimeSession';
import {
  CAPTURE_SEGMENTATION_CENTER_POINT,
  captureSegmentationDecision,
  segmentCapturedMunchie,
  type CaptureSegmentationMetrics,
  type CaptureSegmentationResult,
} from '@/lib/munchieCaptureSegmentation';
import {
  expandInteractionRect,
  isMunchieDrag,
  isPointInsideRect,
} from '@/lib/munchieTankInteraction';
import { normalizedPointFromClient } from '@/lib/munchieSegmentationSpike';
import type { CapturedMunchie, MunchieCapturePhase } from '@/types/munchieCapture';
import {
  lunchmateLoadoutFromProfile,
  lunchmateTotalXpFromProfile,
} from '@/utils/lunchmateProfile';

const PROCESSING_MINIMUM_MS = 650;
const PROCESSING_PAINT_SETTLE_MS = 75;
const SNACK_WAITING_SLOTS = [
  { leftPercent: 18, topPx: 18, rotationDeg: -5 },
  { leftPercent: 82, topPx: 18, rotationDeg: 5 },
  { leftPercent: 8, topPx: 62, rotationDeg: -7 },
  { leftPercent: 92, topPx: 62, rotationDeg: 7 },
  { leftPercent: 28, topPx: 70, rotationDeg: -3 },
  { leftPercent: 72, topPx: 70, rotationDeg: 3 },
] as const;

function waitForProcessingMoment() {
  return new Promise<void>(resolve => window.setTimeout(resolve, PROCESSING_MINIMUM_MS));
}

function waitForNextPaint() {
  return new Promise<void>(resolve => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.setTimeout(resolve, PROCESSING_PAINT_SETTLE_MS);
      });
    });
  });
}

function isProfileTankNavigationState(value: unknown): value is { fromProfile: true } {
  return Boolean(value && typeof value === 'object' && (value as { fromProfile?: unknown }).fromProfile === true);
}

interface HatchFlight {
  id: string;
  munchie: CapturedMunchie;
  left: number;
  top: number;
  width: number;
  deltaX: number;
  deltaY: number;
}

type SnackTimeStage = 'arriving' | 'noticing' | 'feeding' | 'celebrating' | 'complete' | 'error';

interface SnackFoodMotion {
  deltaX: number;
  deltaY: number;
}

interface SnackDragGesture {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  dragging: boolean;
}

interface ManualSegmentationCapture {
  source: string;
  message: string;
}

export default function MunchieCapturePrototypePage() {
  const [location, navigate] = useLocation();
  const navigationState = useHistoryState<unknown>();
  const { profile, updateProfile } = useApp();
  const collection = useCapturedMunchieCollection(profile.id);
  const [phase, setPhase] = useState<MunchieCapturePhase>(() => (
    collection.items.length > 0 ? 'collection' : 'capture'
  ));
  const [processingPreview, setProcessingPreview] = useState<string | null>(null);
  const [processingIsTakingLong, setProcessingIsTakingLong] = useState(false);
  const [manualSegmentation, setManualSegmentation] = useState<ManualSegmentationCapture | null>(null);
  const [activeMunchieId, setActiveMunchieId] = useState<string | null>(null);
  const [highlightedMunchieId, setHighlightedMunchieId] = useState<string | null>(null);
  const [selectedMunchieId, setSelectedMunchieId] = useState<string | null>(null);
  const [snackSession, setSnackSession] = useState<MunchieSnackTimeSession | null>(null);
  const [hatchFlight, setHatchFlight] = useState<HatchFlight | null>(null);
  const [hatchDragActive, setHatchDragActive] = useState(false);
  const [hatchQueue, dispatchHatchQueue] = useReducer(
    munchieHatchQueueReducer,
    EMPTY_MUNCHIE_HATCH_QUEUE,
  );
  const [snackTimeStage, setSnackTimeStage] = useState<SnackTimeStage>('arriving');
  const [snackFoodMotion, setSnackFoodMotion] = useState<SnackFoodMotion | null>(null);
  const [snackDrag, setSnackDrag] = useState<SnackFoodMotion | null>(null);
  const [snackDropActive, setSnackDropActive] = useState(false);
  const [snackFoodBouncing, setSnackFoodBouncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const manualSegmentationImageRef = useRef<HTMLButtonElement>(null);
  const selectedMunchieElementRef = useRef<HTMLButtonElement | null>(null);
  const hatchRef = useRef<HTMLButtonElement>(null);
  const hatchTransitionMunchieIdRef = useRef<string | null>(null);
  const snackFoodRef = useRef<HTMLButtonElement>(null);
  const snackLunchmateRef = useRef<HTMLDivElement>(null);
  const snackDragGestureRef = useRef<SnackDragGesture | null>(null);
  const snackDragClickSuppressedRef = useRef(false);
  const snackTimerRef = useRef<number | null>(null);
  const snackStartGuardRef = useRef(false);
  const requestIdRef = useRef(0);
  const phaseRef = useRef(phase);
  const highlightTimerRef = useRef<number | null>(null);
  const processingPreviewObjectUrlRef = useRef<string | null>(null);
  const loadedInventoryProfileRef = useRef<string | null>(null);
  const hatchQueueProfileRef = useRef(profile.id);
  const shouldReduceMotion = useReducedMotion() ?? false;
  const lunchmateLoadout = useMemo(
    () => lunchmateLoadoutFromProfile(profile.lunchmateLoadout),
    [profile.lunchmateLoadout],
  );
  const persistLunchmateTotalXp = useCallback((nextTotalXp: number) => {
    updateProfile({ lunchmateTotalXp: nextTotalXp });
  }, [updateProfile]);
  const feeding = useCapturedMunchieFeeding({
    items: collection.items,
    initialTotalXp: lunchmateTotalXpFromProfile(profile),
    removeMunchie: collection.removeMunchie,
    onTotalXpChange: persistLunchmateTotalXp,
  });
  const isProfileTankRoute = location === '/profile/munchie-tank';
  phaseRef.current = phase;
  const releaseProcessingPreview = useCallback(() => {
    const objectUrl = processingPreviewObjectUrlRef.current;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    processingPreviewObjectUrlRef.current = null;
    setProcessingPreview(null);
  }, []);

  const handleBackToProfile = () => {
    if (isProfileTankNavigationState(navigationState) && window.history.length > 1) {
      window.history.back();
      return;
    }
    navigate('/profile', { replace: true });
  };

  useEffect(() => () => {
    requestIdRef.current += 1;
    if (highlightTimerRef.current !== null) window.clearTimeout(highlightTimerRef.current);
    if (snackTimerRef.current !== null) window.clearTimeout(snackTimerRef.current);
    const objectUrl = processingPreviewObjectUrlRef.current;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    processingPreviewObjectUrlRef.current = null;
  }, []);

  useEffect(() => {
    if (phase !== 'processing') {
      setProcessingIsTakingLong(false);
      return;
    }
    const timer = window.setTimeout(() => setProcessingIsTakingLong(true), 5000);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (
      collection.isLoading
      || collection.loadedProfileId !== profile.id
      || loadedInventoryProfileRef.current === profile.id
    ) return;
    loadedInventoryProfileRef.current = profile.id;
    setPhase(collection.items.length > 0 ? 'collection' : 'capture');
  }, [collection.isLoading, collection.items.length, collection.loadedProfileId, profile.id]);

  useEffect(() => {
    if (hatchQueueProfileRef.current === profile.id) return;
    hatchQueueProfileRef.current = profile.id;
    dispatchHatchQueue({ type: 'clear' });
  }, [profile.id]);

  const beginCapture = () => {
    collection.clearStorageError();
    setErrorMessage(null);
    setManualSegmentation(null);
    setSelectedMunchieId(null);
    selectedMunchieElementRef.current = null;
    inputRef.current?.click();
  };

  const reportSegmentationMetrics = (metrics: CaptureSegmentationMetrics) => {
    if (!import.meta.env.DEV) return;
    console.info('[Munchie Capture] MediaPipe CPU segmentation', metrics);
  };

  const persistCapturedMunchie = async (
    source: string,
    cutoutImage: string | undefined,
    requestId: number,
    usedOriginalFallback = false,
  ) => {
    if (requestIdRef.current !== requestId) return;
    const result = await collection.addCapturedMunchie(source, cutoutImage);
    if (requestIdRef.current !== requestId) return;
    if (!result.ok) {
      setErrorMessage(result.message);
      toast.error(result.message);
      setPhase(collection.items.length > 0 ? 'collection' : 'error');
      return;
    }
    setManualSegmentation(null);
    setActiveMunchieId(result.item.id);
    setHighlightedMunchieId(null);
    setPhase('reveal');
    if (usedOriginalFallback) toast.info('이번 Munchie는 원본 사진으로 담았어요.');
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please choose an image file.');
      setPhase('error');
      return;
    }
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    releaseProcessingPreview();
    const previewUrl = URL.createObjectURL(file);
    processingPreviewObjectUrlRef.current = previewUrl;
    setProcessingPreview(previewUrl);
    setManualSegmentation(null);
    setErrorMessage(null);
    setPhase('processing');

    try {
      await waitForNextPaint();
      const processingMoment = waitForProcessingMoment();
      const resizedImage = await fileToResizedDataUrl(file, 720, 0.78);
      let segmentationResult: CaptureSegmentationResult | null;
      try {
        [segmentationResult] = await Promise.all([
          segmentCapturedMunchie(resizedImage, CAPTURE_SEGMENTATION_CENTER_POINT),
          processingMoment,
        ]);
        reportSegmentationMetrics(segmentationResult.metrics);
      } catch {
        await processingMoment;
        segmentationResult = null;
      }
      if (requestIdRef.current !== requestId) return;

      const decision = captureSegmentationDecision(
        'automatic',
        segmentationResult?.status === 'success',
      );
      if (decision === 'request-manual') {
        setManualSegmentation({
          source: resizedImage,
          message: segmentationResult?.status === 'failure'
            ? `자동 결과가 자연스럽지 않았어요. (${segmentationResult.metrics.maskAreaPercent.toFixed(1)}%)`
            : '자동으로 Munchie를 찾지 못했어요.',
        });
        setPhase('manualSegmentation');
        return;
      }

      await persistCapturedMunchie(
        resizedImage,
        segmentationResult?.status === 'success' ? segmentationResult.cutoutImage : undefined,
        requestId,
      );
    } catch {
      if (requestIdRef.current !== requestId) return;
      setErrorMessage('We could not turn that photo into a Munchie. Please try another image.');
      setPhase('error');
    }
  };

  const retrySegmentationAtPoint = async (point: { x: number; y: number }) => {
    if (!manualSegmentation) return;
    const requestId = requestIdRef.current;
    const source = manualSegmentation.source;
    setProcessingPreview(source);
    setPhase('processing');
    await waitForNextPaint();

    try {
      const result = await segmentCapturedMunchie(source, point);
      reportSegmentationMetrics(result.metrics);
      if (requestIdRef.current !== requestId) return;
      const decision = captureSegmentationDecision('manual', result.status === 'success');
      await persistCapturedMunchie(
        source,
        decision === 'use-cutout' && result.status === 'success' ? result.cutoutImage : undefined,
        requestId,
        decision === 'use-original',
      );
    } catch {
      if (requestIdRef.current === requestId) {
        await persistCapturedMunchie(source, undefined, requestId, true);
      }
    }
  };

  const handleManualSegmentationClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const point = normalizedPointFromClient(
      event.clientX,
      event.clientY,
      event.currentTarget.getBoundingClientRect(),
    );
    void retrySegmentationAtPoint(point);
  };

  const useOriginalSegmentationFallback = () => {
    if (!manualSegmentation) return;
    const requestId = requestIdRef.current;
    const source = manualSegmentation.source;
    setProcessingPreview(source);
    setPhase('processing');
    void persistCapturedMunchie(source, undefined, requestId, true);
  };

  const completeDrop = () => {
    if (!activeMunchieId) return;
    setSelectedMunchieId(null);
    selectedMunchieElementRef.current = null;
    setPhase('collection');
    setHighlightedMunchieId(activeMunchieId);
    toast.success('새 Munchie가 도착했어요 ✨');
    if (highlightTimerRef.current !== null) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedMunchieId(null);
      highlightTimerRef.current = null;
    }, 1800);
  };

  const selectedMunchie = collection.items.find(item => item.id === selectedMunchieId) ?? null;
  const snackMunchie = activeSnackTimeMunchie(snackSession);
  const waitingSnackMunchies = waitingSnackTimeMunchies(snackSession);
  const queuedMunchies = hatchQueue.queuedIds
    .map(id => collection.items.find(item => item.id === id))
    .filter((item): item is CapturedMunchie => item !== undefined);
  const transitioningOrQueuedMunchieIds = hatchFlight
    ? [...hatchQueue.queuedIds, hatchFlight.id]
    : hatchQueue.queuedIds;
  const selectedMunchieIsQueued = selectedMunchie
    ? isMunchieQueued(hatchQueue, selectedMunchie.id)
    : false;
  const hatchIsActive = Boolean(
    hatchDragActive
    || hatchFlight
    || hatchQueue.queuedIds.length > 0
    || (selectedMunchie && !selectedMunchieIsQueued),
  );
  const queueSpacingPx = queuedMunchies.length <= 1
    ? 0
    : Math.min(22, 300 / (queuedMunchies.length - 1));
  const queueWidthPx = queuedMunchies.length === 0
    ? 0
    : 38 + queueSpacingPx * (queuedMunchies.length - 1);

  const selectTankMunchie = useCallback((
    munchie: CapturedMunchie,
    element: HTMLButtonElement,
  ) => {
    selectedMunchieElementRef.current = element;
    setSelectedMunchieId(munchie.id);
  }, []);

  const sendMunchieThroughHatch = useCallback((
    munchie: CapturedMunchie,
    element: HTMLElement,
  ) => {
    if (
      hatchFlight
      || hatchTransitionMunchieIdRef.current !== null
      || feeding.lunchmateFlow.isBusy
      || isMunchieQueued(hatchQueue, munchie.id)
    ) return false;
    if (munchie.fedAt !== undefined) {
      toast.info('Lunchmate가 이미 맛있게 먹었어요 ♡');
      return false;
    }

    const munchieBounds = element.getBoundingClientRect();
    const hatchBounds = hatchRef.current?.getBoundingClientRect();
    if (!munchieBounds || !hatchBounds) {
      toast.error('Snack Time으로 보내지 못했어요. 다시 시도해 주세요.');
      return false;
    }

    hatchTransitionMunchieIdRef.current = munchie.id;
    setHatchDragActive(false);
    setHatchFlight({
      id: munchie.id,
      munchie,
      left: munchieBounds.left,
      top: munchieBounds.top,
      width: munchieBounds.width,
      deltaX: hatchBounds.left + hatchBounds.width / 2 - (munchieBounds.left + munchieBounds.width / 2),
      deltaY: hatchBounds.top + hatchBounds.height / 2 - (munchieBounds.top + munchieBounds.height / 2),
    });
    return true;
  }, [feeding.lunchmateFlow.isBusy, hatchFlight, hatchQueue]);

  const startQueuedSnackTime = useCallback(() => {
    if (hatchFlight || feeding.lunchmateFlow.isBusy) return;
    const nextSession = createMunchieSnackTimeSession(
      hatchQueue.queuedIds,
      collection.items,
    );
    dispatchHatchQueue({ type: 'clear' });
    if (nextSession.items.length === 0) {
      toast.info('Snack Time을 기다리는 Munchie가 없어요.');
      return;
    }

    setSnackSession(nextSession);
    setSnackFoodMotion(null);
    setSnackTimeStage('arriving');
    snackStartGuardRef.current = false;
    setPhase('snackTime');
  }, [collection.items, feeding.lunchmateFlow.isBusy, hatchFlight, hatchQueue.queuedIds]);

  const beginSnackFeeding = useCallback((dragOffset: SnackFoodMotion = { deltaX: 0, deltaY: 0 }) => {
    if (snackStartGuardRef.current || !snackSession || !snackMunchie) return;
    snackStartGuardRef.current = true;

    const foodBounds = snackFoodRef.current?.getBoundingClientRect();
    const lunchmateBounds = snackLunchmateRef.current?.getBoundingClientRect();
    if (foodBounds && lunchmateBounds) {
      const originalFoodCenterX = foodBounds.left + foodBounds.width / 2 - dragOffset.deltaX;
      const originalFoodCenterY = foodBounds.top + foodBounds.height / 2 - dragOffset.deltaY;
      setSnackFoodMotion({
        deltaX: lunchmateBounds.left + lunchmateBounds.width / 2 - originalFoodCenterX,
        deltaY: lunchmateBounds.top + lunchmateBounds.height * 0.42 - originalFoodCenterY,
      });
    }
    setSnackDrag(null);
    setSnackDropActive(false);
    setSnackTimeStage('feeding');

    const result = feeding.feedMunchie(snackMunchie);
    if (result.status !== 'started') {
      if (result.status === 'already-fed') toast.info('Lunchmate가 이미 맛있게 먹었어요 ♡');
      setSnackTimeStage('error');
      return;
    }
    void result.completion.then((committed) => {
      if (!committed) {
        setSnackTimeStage('error');
        return;
      }
      const advancement = consumeActiveSnackTimeMunchie(snackSession, snackMunchie.id);
      if (advancement.status === 'ignored') {
        setSnackTimeStage('error');
        return;
      }
      setSnackSession(advancement.state);
      setSnackTimeStage('celebrating');
      snackTimerRef.current = window.setTimeout(() => {
        collection.releaseRemovedMunchieResources([snackMunchie.id]);
        setSnackFoodMotion(null);
        snackDragGestureRef.current = null;
        setSnackDrag(null);
        setSnackDropActive(false);
        setSnackFoodBouncing(false);
        snackStartGuardRef.current = false;
        setSnackTimeStage(advancement.status === 'complete' ? 'complete' : 'arriving');
        snackTimerRef.current = null;
      }, shouldReduceMotion ? 200 : 750);
    });
  }, [collection, feeding, snackMunchie, snackSession, shouldReduceMotion]);

  const resetSnackDrag = useCallback(() => {
    snackDragGestureRef.current = null;
    setSnackDrag(null);
    setSnackDropActive(false);
  }, []);

  const handleSnackPointerDown = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (snackTimeStage !== 'noticing' || event.button !== 0) return;
    snackDragClickSuppressedRef.current = false;
    snackDragGestureRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      dragging: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [snackTimeStage]);

  const handleSnackPointerMove = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const gesture = snackDragGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || snackTimeStage !== 'noticing') return;
    const deltaX = event.clientX - gesture.startClientX;
    const deltaY = event.clientY - gesture.startClientY;
    const dragging = gesture.dragging || isMunchieDrag(deltaX, deltaY);
    if (!dragging) return;

    event.preventDefault();
    const lunchmateBounds = snackLunchmateRef.current?.getBoundingClientRect();
    const overLunchmate = lunchmateBounds
      ? isPointInsideRect(
          { x: event.clientX, y: event.clientY },
          expandInteractionRect(lunchmateBounds, 40),
        )
      : false;
    snackDragGestureRef.current = { ...gesture, dragging: true };
    setSnackDrag({ deltaX, deltaY });
    setSnackDropActive(overLunchmate);
  }, [snackTimeStage]);

  const handleSnackPointerUp = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const gesture = snackDragGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - gesture.startClientX;
    const deltaY = event.clientY - gesture.startClientY;
    const dragged = gesture.dragging || isMunchieDrag(deltaX, deltaY);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!dragged) {
      snackDragGestureRef.current = null;
      return;
    }

    snackDragClickSuppressedRef.current = true;
    const lunchmateBounds = snackLunchmateRef.current?.getBoundingClientRect();
    const droppedOnLunchmate = lunchmateBounds
      ? isPointInsideRect(
          { x: event.clientX, y: event.clientY },
          expandInteractionRect(lunchmateBounds, 40),
        )
      : false;
    snackDragGestureRef.current = null;
    if (droppedOnLunchmate) {
      beginSnackFeeding({ deltaX, deltaY });
      return;
    }
    setSnackDrag(null);
    setSnackDropActive(false);
  }, [beginSnackFeeding]);

  const finishSnackTime = useCallback(() => {
    if (feeding.lunchmateFlow.isBusy) return;
    if (snackTimerRef.current !== null) {
      window.clearTimeout(snackTimerRef.current);
      snackTimerRef.current = null;
    }
    snackStartGuardRef.current = false;
    hatchTransitionMunchieIdRef.current = null;
    selectedMunchieElementRef.current = null;
    setSelectedMunchieId(null);
    setSnackFoodMotion(null);
    resetSnackDrag();
    setSnackFoodBouncing(false);
    setSnackTimeStage('arriving');
    const consumedIds = snackSession?.consumedIds ?? [];
    setSnackSession(null);
    setPhase('collection');
    window.requestAnimationFrame(() => {
      collection.releaseRemovedMunchieResources(consumedIds);
    });
  }, [collection, feeding.lunchmateFlow.isBusy, resetSnackDrag, snackSession]);

  const showContainer = phase === 'reveal' || phase === 'dropping' || phase === 'collection';

  if (collection.isLoading) {
    return (
      <main className="min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top,#FFFDF9_0%,#FFF4EC_46%,#FBE5DC_100%)] px-4 pb-12 pt-[max(28px,env(safe-area-inset-top))] text-[#3B2A22]">
        <div className="mx-auto w-full max-w-[430px] text-center">
          <h1 className="text-[28px] font-black tracking-[-0.04em]">Munchie Tank</h1>
          <LoaderCircle className="mx-auto mt-16 animate-spin text-[#ED565B]" size={30} aria-hidden="true" />
          <p className="mt-3 text-[12px] font-bold text-[#9B7A6C]">Munchie를 불러오는 중이에요…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top,#FFFDF9_0%,#FFF4EC_46%,#FBE5DC_100%)] px-4 pb-12 pt-[max(28px,env(safe-area-inset-top))] text-[#3B2A22]">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="mx-auto w-full max-w-[430px]">
        <header className="relative text-center">
          {isProfileTankRoute && (
            <button
              type="button"
              onClick={handleBackToProfile}
              aria-label="프로필로 돌아가기"
              className="absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-white/55 text-[#6E5044] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#ED565B]/45"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
          )}
          <h1 className="text-[28px] font-black tracking-[-0.04em]">Munchie Tank</h1>
        </header>

        <AnimatePresence
          mode="wait"
          initial={false}
        >
          {phase === 'capture' && (
            <motion.section
              key="capture"
              className="mt-12 text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0 } }}
            >
              <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-[42px] border border-white/90 bg-white/65 text-[#ED5A5F] shadow-[0_18px_36px_rgba(121,69,50,0.12)] backdrop-blur">
                <Camera size={48} strokeWidth={1.7} aria-hidden="true" />
              </div>
              <p className="mx-auto mt-7 max-w-[280px] text-[18px] font-black leading-7">
                먹은 음식을 찍어<br />나만의 Munchie로 모아보세요.
              </p>
              <button
                type="button"
                onClick={beginCapture}
                className="mt-8 inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#ED565B] px-8 text-[15px] font-black text-white shadow-[0_12px_24px_rgba(223,72,78,0.28)] transition-transform active:scale-[0.98]"
              >
                <Camera size={19} aria-hidden="true" /> Munchie 찍기
              </button>
              <p className="mt-3 text-[11px] font-semibold text-[#AD9285]">모바일에서는 카메라, 데스크톱에서는 파일을 선택할 수 있어요.</p>
            </motion.section>
          )}

          {phase === 'processing' && (
            <motion.section
              key="processing"
              data-testid="munchie-processing"
              className="mt-10 text-center"
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0 } }}
              onAnimationComplete={() => {
                if (phaseRef.current !== 'processing') releaseProcessingPreview();
              }}
              aria-live="polite"
            >
              <div className="relative mx-auto h-52 w-52">
                <motion.div
                  className="absolute inset-0 rounded-[56px] border-2 border-dashed border-[#EF8B82]/65"
                  animate={shouldReduceMotion ? { opacity: 1 } : { rotate: 360 }}
                  transition={shouldReduceMotion ? { duration: 0.1 } : { duration: 2.6, repeat: Infinity, ease: 'linear' }}
                />
                <motion.div
                  className="absolute inset-4 overflow-hidden rounded-[46px] bg-white shadow-[0_20px_42px_rgba(104,60,44,0.18)]"
                  animate={shouldReduceMotion ? { scale: 1 } : { scale: [1, 1.025, 1] }}
                  transition={shouldReduceMotion ? { duration: 0 } : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {processingPreview ? (
                    <img src={processingPreview} alt="선택한 음식" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[#D96A6D]" aria-hidden="true">
                      <Utensils size={42} />
                    </span>
                  )}
                  {!shouldReduceMotion && (
                    <motion.div
                      className="absolute inset-0 bg-[linear-gradient(115deg,transparent_28%,rgba(255,255,255,0.7)_48%,transparent_68%)]"
                      animate={{ x: ['-120%', '120%'] }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                </motion.div>
                {!shouldReduceMotion && [
                  { className: '-right-1 top-7', delay: 0 },
                  { className: '-left-2 top-24', delay: 0.35 },
                  { className: 'bottom-5 right-2', delay: 0.7 },
                ].map((sparkle, index) => (
                  <motion.span
                    key={sparkle.className}
                    className={`absolute text-[#ED7776] ${sparkle.className}`}
                    initial={{ opacity: 0.25, scale: 0.72 }}
                    animate={{ opacity: [0.25, 1, 0.25], scale: [0.72, 1.08, 0.72], rotate: [0, 10, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: sparkle.delay, ease: 'easeInOut' }}
                    aria-hidden="true"
                  >
                    <Sparkles size={index === 1 ? 15 : 18} />
                  </motion.span>
                ))}
              </div>
              <div className="mt-7 flex items-center justify-center gap-2">
                <LoaderCircle className={shouldReduceMotion ? '' : 'animate-spin'} size={20} aria-hidden="true" />
                <p className="text-[20px] font-black">
                  Munchie를 만들고 있어요 ✨
                  {!shouldReduceMotion && (
                    <span className="ml-1 inline-flex w-5 justify-between" aria-hidden="true">
                      {[0, 1, 2].map(index => (
                        <motion.span
                          key={index}
                          animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
                          transition={{ duration: 0.9, repeat: Infinity, delay: index * 0.16 }}
                        >
                          ·
                        </motion.span>
                      ))}
                    </span>
                  )}
                </p>
              </div>
              <p className="mt-2 text-[12px] font-semibold leading-5 text-[#A9897A]">
                {processingIsTakingLong ? (
                  <>조금만 기다려주세요 🍽️<br />Munchie를 예쁘게 다듬고 있어요</>
                ) : (
                  '음식에서 Munchie를 쏙 꺼내는 중이에요'
                )}
              </p>
            </motion.section>
          )}

          {phase === 'manualSegmentation' && manualSegmentation && (
            <motion.section
              key="manual-segmentation"
              className="mt-8 text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <p className="text-[18px] font-black">음식이나 접시의 가운데를 톡 눌러주세요</p>
              <p id="manual-segmentation-help" className="mx-auto mt-2 max-w-[310px] text-[12px] leading-5 text-[#96796D]">
                {manualSegmentation.message}<br />누른 곳을 기준으로 Munchie를 다시 찾아볼게요.
              </p>
              <button
                ref={manualSegmentationImageRef}
                type="button"
                onClick={handleManualSegmentationClick}
                aria-describedby="manual-segmentation-help"
                aria-label="음식이나 접시의 가운데를 선택해 다시 배경 제거하기"
                className="relative mx-auto mt-5 block max-w-full overflow-hidden rounded-[28px] border-2 border-white/90 bg-white/55 p-2 shadow-[0_18px_38px_rgba(104,60,44,0.16)] outline-none focus-visible:ring-4 focus-visible:ring-[#ED565B]/45"
                style={{ touchAction: 'manipulation' }}
              >
                <img
                  src={manualSegmentation.source}
                  alt="배경 제거 지점을 다시 선택할 음식 사진"
                  draggable={false}
                  className="max-h-[430px] max-w-full rounded-[20px] object-contain"
                />
                <span
                  className="pointer-events-none absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-[#ED565B]/80 shadow-[0_2px_8px_rgba(68,34,25,0.42)]"
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                onClick={useOriginalSegmentationFallback}
                className="mt-4 text-[11px] font-bold text-[#9A7F72] underline decoration-[#CBA99B]/70 underline-offset-4"
              >
                원본 사진으로 담기
              </button>
            </motion.section>
          )}

          {showContainer && (
            <motion.section
              key="container"
              className="mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center justify-between px-3">
                <div>
                  <p className="text-[16px] font-black">Munchie Tank</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#A68879]">내가 모은 Munchie들</p>
                </div>
                <span className="rounded-full bg-white/55 px-3 py-1.5 text-[10px] font-bold text-[#A47F70] shadow-sm">
                  Munchie {collection.items.length}
                </span>
              </div>

              <MunchieCaptureContainer
                items={collection.items}
                activeMunchieId={activeMunchieId}
                entrancePhase={phase === 'reveal' ? 'reveal' : phase === 'dropping' ? 'dropping' : 'settled'}
                highlightedMunchieId={highlightedMunchieId}
                selectedMunchieId={selectedMunchieId}
                queuedMunchieIds={transitioningOrQueuedMunchieIds}
                interactionDisabled={phase !== 'collection' || hatchFlight !== null}
                onMunchieSelect={selectTankMunchie}
                getHatchBounds={() => hatchRef.current?.getBoundingClientRect() ?? null}
                onHatchProximityChange={setHatchDragActive}
                onMunchieDropOnHatch={sendMunchieThroughHatch}
                onRevealComplete={() => setPhase('dropping')}
                onDropComplete={completeDrop}
              />

              {phase === 'collection' && (
                <motion.div
                  className="relative -mt-5 text-center"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {queuedMunchies.length > 0 && (
                    <div
                      className="absolute left-1/2 top-[-34px] z-50 h-[42px] -translate-x-1/2"
                      style={{ width: queueWidthPx }}
                      role="group"
                      aria-label={`Hatch Queue에 Munchie ${queuedMunchies.length}개`}
                    >
                      {queuedMunchies.map((munchie, index) => (
                        <motion.button
                          key={munchie.id}
                          type="button"
                          aria-label={`Hatch Queue에서 ${index + 1}번째 Munchie 빼기`}
                          title="Queue에서 빼기"
                          onClick={() => {
                            dispatchHatchQueue({ type: 'dequeue', id: munchie.id });
                            if (selectedMunchieId === munchie.id) {
                              setSelectedMunchieId(null);
                              selectedMunchieElementRef.current = null;
                            }
                          }}
                          className="absolute bottom-0 block w-[38px] select-none border-0 bg-transparent p-0 outline-none focus-visible:rounded-[34%] focus-visible:ring-4 focus-visible:ring-[#ED565B]/45"
                          style={{ left: index * queueSpacingPx, zIndex: index + 1 }}
                          initial={{ opacity: 0, y: -8, scale: 0.72 }}
                          animate={{ opacity: 1, y: 0, scale: 1, rotate: index % 2 === 0 ? -3 : 3 }}
                          exit={{ opacity: 0, y: -6, scale: 0.72 }}
                          transition={{ duration: shouldReduceMotion ? 0.1 : 0.24, ease: 'easeOut' }}
                        >
                          <CapturedMunchieVisual munchie={munchie} />
                        </motion.button>
                      ))}
                    </div>
                  )}

                  <motion.button
                    ref={hatchRef}
                    type="button"
                    disabled={hatchFlight !== null || (!selectedMunchie && hatchQueue.queuedIds.length === 0)}
                    aria-label={selectedMunchie && !selectedMunchieIsQueued
                      ? '선택한 Munchie를 Hatch Queue에 담기'
                      : hatchQueue.queuedIds.length > 0
                        ? `Hatch Queue에 Munchie ${hatchQueue.queuedIds.length}개. Snack Time 준비됨`
                        : 'Munchie를 먼저 선택하세요'}
                    onClick={() => {
                      if (selectedMunchie && !selectedMunchieIsQueued && selectedMunchieElementRef.current) {
                        sendMunchieThroughHatch(selectedMunchie, selectedMunchieElementRef.current);
                        return;
                      }
                      if (hatchQueue.queuedIds.length > 0) {
                        startQueuedSnackTime();
                      }
                    }}
                    className={`relative mx-auto block h-[64px] w-[116px] overflow-visible border-0 bg-transparent outline-none focus-visible:rounded-[50%] focus-visible:ring-4 focus-visible:ring-[#ED565B]/35 disabled:cursor-default ${hatchIsActive ? 'drop-shadow-[0_8px_13px_rgba(184,85,76,0.24)]' : 'drop-shadow-[0_7px_10px_rgba(112,66,49,0.14)]'}`}
                    animate={hatchIsActive && !shouldReduceMotion
                      ? { scale: [1, 1.035, 1], y: [0, -2, 0] }
                      : { scale: 1, y: 0 }}
                    transition={{ duration: 0.9, repeat: hatchIsActive ? Infinity : 0, repeatDelay: 0.5 }}
                  >
                    <span className="pointer-events-none absolute left-1/2 top-0 h-5 w-12 -translate-x-1/2 rounded-b-[18px] bg-[#DCA08F]/18" />
                    <span className={`pointer-events-none absolute inset-x-3 top-3 z-20 h-5 rounded-[50%] border-[3px] ${hatchIsActive ? 'border-[#EE8A82] bg-[#865044]/52 shadow-[0_0_0_5px_rgba(237,119,118,0.1),inset_0_5px_8px_rgba(75,38,31,0.2)]' : 'border-white/90 bg-[#916054]/34 shadow-[inset_0_5px_8px_rgba(75,38,31,0.13)]'}`} />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 text-[9px] font-black uppercase tracking-[0.16em] text-[#A6786C]">
                      Hatch
                    </span>
                    {hatchIsActive && (
                      <Sparkles className="pointer-events-none absolute right-0 top-0 z-30 text-[#EE7772]" size={15} aria-hidden="true" />
                    )}
                  </motion.button>

                  <p className="mt-3 text-[11px] font-semibold text-[#A48678]">
                    {hatchQueue.queuedIds.length > 0
                      ? `${hatchQueue.queuedIds.length}개의 Munchie가 Snack Time을 기다려요 ✨`
                      : selectedMunchie
                        ? 'Munchie를 Hatch로 끌어 Queue에 담아요 ✨'
                        : 'Munchie를 톡 건드려 골라보세요.'}
                  </p>

                  {(errorMessage || collection.storageError) && (
                    <p role="status" className="mb-3 text-center text-[12px] font-bold text-[#C4494D]">
                      {errorMessage ?? collection.storageError}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setPhase('capture');
                      window.requestAnimationFrame(beginCapture);
                    }}
                    className="mx-auto mt-4 flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#E8BBB1]/80 bg-white/42 px-4 text-[12px] font-black text-[#C56A6D] shadow-sm transition-transform active:scale-[0.98]"
                  >
                    <ImagePlus size={17} aria-hidden="true" /> + Munchie 찍기
                  </button>
                </motion.div>
              )}
            </motion.section>
          )}

          {phase === 'snackTime' && snackSession && (
            <motion.section
              key="snack-time"
              className="relative mt-5 min-h-[640px] overflow-hidden rounded-[38px] border border-white/80 bg-[linear-gradient(180deg,#FFF9F1_0%,#F9E8DE_58%,#EFCFC0_100%)] px-5 pb-6 pt-5 shadow-[0_24px_54px_rgba(103,61,45,0.16)]"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              transition={{ duration: shouldReduceMotion ? 0.16 : 0.42, ease: [0.32, 0.72, 0, 1] }}
            >
              <div className="pointer-events-none absolute inset-x-12 top-0 h-5 rounded-b-[50%] bg-[#B97C69]/16 shadow-inner" />
              <div className="pointer-events-none absolute -left-12 top-36 h-44 w-44 rounded-full bg-white/38 blur-2xl" />
              <div className="pointer-events-none absolute -right-14 bottom-28 h-52 w-52 rounded-full bg-[#ECA58E]/18 blur-2xl" />

              <div className="relative z-10 text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#D76869]">From the Feed Hatch</p>
                <h2 className="mt-1 text-[25px] font-black tracking-[-0.04em]">Snack Time ✨</h2>
                <p className="mt-1 text-[11px] font-semibold text-[#9B7A6C]">
                  {Math.min(snackSession.activeIndex + 1, snackSession.items.length)} / {snackSession.items.length} · Tank 아래 Lunchmate의 작은 방
                </p>
              </div>

              <div className="relative z-10 mt-4 h-[350px]">
                <div className="pointer-events-none absolute inset-x-[13%] bottom-1 h-20 rounded-[50%] border border-white/70 bg-[#EAB7A6]/28 shadow-[inset_0_5px_12px_rgba(166,92,73,0.1)]" />
                {waitingSnackMunchies.map((munchie, index) => {
                  const slot = SNACK_WAITING_SLOTS[index % SNACK_WAITING_SLOTS.length];
                  const layer = Math.floor(index / SNACK_WAITING_SLOTS.length);
                  return (
                    <div
                      key={munchie.id}
                      className="pointer-events-none absolute z-20 w-[48px] -translate-x-1/2"
                      style={{
                        left: `${slot.leftPercent}%`,
                        top: slot.topPx + layer * 9,
                      }}
                      aria-hidden="true"
                    >
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.76 }}
                        animate={{ opacity: 0.78, y: 0, scale: 1, rotate: slot.rotationDeg }}
                        transition={{ duration: shouldReduceMotion ? 0.1 : 0.28, delay: index * 0.04 }}
                      >
                        <CapturedMunchieVisual munchie={munchie} />
                      </motion.div>
                    </div>
                  );
                })}

                {snackMunchie && (
                  <motion.button
                    key={snackMunchie.id}
                  ref={snackFoodRef}
                  type="button"
                  disabled={snackTimeStage !== 'noticing'}
                  aria-label="Snack Time Munchie. 끌어서 Lunchmate에게 주세요. Enter 또는 Space로 톡 건드릴 수 있어요."
                  className="absolute left-1/2 top-6 z-30 ml-[-46px] w-[92px] cursor-grab select-none border-0 bg-transparent p-0 outline-none focus-visible:rounded-[34%] focus-visible:ring-4 focus-visible:ring-[#ED565B]/45 active:cursor-grabbing disabled:cursor-default"
                  style={{ touchAction: 'none' }}
                  initial={{ y: shouldReduceMotion ? -12 : -82, opacity: 0, scale: 0.74 }}
                  animate={snackTimeStage === 'arriving'
                    ? { y: 0, opacity: 1, scale: 1, x: 0, rotate: 0 }
                    : snackTimeStage === 'noticing'
                      ? snackDrag
                        ? {
                            x: snackDrag.deltaX,
                            y: snackDrag.deltaY,
                            opacity: 1,
                            scale: shouldReduceMotion ? 1 : 1.08,
                            rotate: shouldReduceMotion ? 0 : (snackDrag.deltaX >= 0 ? 4 : -4),
                            filter: 'drop-shadow(0 16px 12px rgba(83,48,36,0.36))',
                          }
                        : snackFoodBouncing
                          ? shouldReduceMotion
                            ? { x: 0, y: 0, opacity: 1, scale: [1, 1.025, 1], rotate: 0 }
                            : { x: 0, y: [0, -8, 1, 0], opacity: 1, scale: [1, 1.05, 0.99, 1], rotate: [0, 3, -1, 0] }
                          : { x: 0, y: 0, opacity: 1, scale: 1, rotate: 0, filter: 'drop-shadow(0 0 0 rgba(0,0,0,0))' }
                      : snackTimeStage === 'feeding'
                        ? {
                            x: snackFoodMotion?.deltaX ?? 0,
                            y: snackFoodMotion?.deltaY ?? 115,
                            scale: 0.42,
                            rotate: snackMunchie.placement.rotationDeg > 0 ? 8 : -8,
                            opacity: [1, 1, 0.8, 0],
                          }
                        : { opacity: 0, scale: 0.42 }}
                  transition={snackTimeStage === 'feeding'
                    ? { duration: shouldReduceMotion ? 0.18 : 0.65, ease: [0.32, 0.72, 0, 1] }
                    : snackDrag
                      ? { duration: 0 }
                      : snackFoodBouncing
                        ? { duration: shouldReduceMotion ? 0.2 : 0.38, ease: 'easeOut' }
                        : snackTimeStage === 'arriving'
                          ? { duration: shouldReduceMotion ? 0.14 : 0.48, ease: 'easeOut' }
                          : { type: 'spring', stiffness: 420, damping: 27 }}
                  onPointerDown={handleSnackPointerDown}
                  onPointerMove={handleSnackPointerMove}
                  onPointerUp={handleSnackPointerUp}
                  onPointerCancel={resetSnackDrag}
                  onClick={() => {
                    if (snackDragClickSuppressedRef.current) {
                      snackDragClickSuppressedRef.current = false;
                      return;
                    }
                    if (snackTimeStage === 'noticing') setSnackFoodBouncing(true);
                  }}
                  onAnimationComplete={() => {
                    if (snackTimeStage === 'arriving' && !snackStartGuardRef.current) {
                      setSnackTimeStage('noticing');
                    }
                    if (snackFoodBouncing) setSnackFoodBouncing(false);
                  }}
                  >
                    <CapturedMunchieVisual munchie={snackMunchie} />
                  </motion.button>
                )}

                <div
                  ref={snackLunchmateRef}
                  className={`absolute bottom-0 left-1/2 z-20 flex h-[230px] w-[230px] -translate-x-1/2 items-end justify-center rounded-[46%] transition-shadow ${snackDropActive ? 'shadow-[0_0_0_12px_rgba(237,119,118,0.1),0_0_34px_rgba(237,119,118,0.25)]' : ''}`}
                >
                  <motion.div
                    className="flex h-full w-full items-end justify-center"
                    animate={snackDropActive && !shouldReduceMotion ? { scale: [1, 1.035, 1], y: [0, -3, 0] } : { scale: 1, y: 0 }}
                    transition={{ duration: 0.58, repeat: snackDropActive ? Infinity : 0 }}
                  >
                    <LunchmateCharacterRenderer
                      flowState={snackDropActive ? 'foodAvailable' : feeding.lunchmateFlow.state}
                      loadout={lunchmateLoadout}
                      size={218}
                      renderSize="room"
                      artwork="chicken"
                      fallback={profile.foodieChar}
                    />
                  </motion.div>
                  {snackDropActive && (
                    <Sparkles className="pointer-events-none absolute right-2 top-10 text-[#EE7772]" size={22} aria-hidden="true" />
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {(feeding.lunchmateFlow.state === 'reaction' || snackTimeStage === 'celebrating') && (
                    <motion.div
                      key="reaction"
                      className="absolute right-2 top-28 z-40 rounded-2xl border border-[#F0C9BC] bg-white/94 px-3 py-2 text-center shadow-lg"
                      initial={{ opacity: 0, scale: 0.78, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <p className="text-[12px] font-black">Yum! ♡</p>
                      <p className="text-[11px] font-black text-[#E05257]">+20 XP</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {(snackTimeStage === 'celebrating' || snackTimeStage === 'complete') && (
                <motion.div
                  className="relative z-10 mx-auto mt-2 max-w-[300px] rounded-2xl border border-white/90 bg-white/68 px-4 py-3 shadow-sm backdrop-blur"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[12px] font-black">
                      Lv.{feeding.lunchmateFlow.progressSnapshot.level} {feeding.lunchmateFlow.progressSnapshot.levelName}
                    </p>
                    <p className="text-[11px] font-black text-[#D94E53]">{feeding.lunchmateFlow.progressSnapshot.totalXp} XP</p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EBD6CB]">
                    <motion.div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#ED7776,#F5A06D)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${feeding.lunchmateFlow.progressSnapshot.progressPercent}%` }}
                      transition={{ duration: shouldReduceMotion ? 0.1 : 0.45, ease: 'easeOut' }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] font-semibold text-[#9F8174]">
                    {feeding.lunchmateFlow.progressSnapshot.xpIntoCurrentLevel} / {feeding.lunchmateFlow.progressSnapshot.xpRequiredForNextLevel} XP
                  </p>
                </motion.div>
              )}

              <div className="relative z-10 mt-4 min-h-16 text-center" aria-live="polite">
                {snackTimeStage === 'arriving' && (
                  <p className="text-[12px] font-bold text-[#9B7769]">
                    {snackSession.activeIndex === 0
                      ? 'Munchie들이 Hatch에서 내려오고 있어요…'
                      : '다음 Munchie가 준비되고 있어요…'}
                  </p>
                )}
                {snackTimeStage === 'noticing' && (
                  <div>
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-[12px] font-black text-[#C05B5F]">Munchie를 Lunchmate에게 줘보세요 ✨</p>
                      <button
                        type="button"
                        onClick={() => beginSnackFeeding()}
                        aria-label="선택한 Munchie를 Lunchmate에게 주기"
                        title="Lunchmate에게 주기"
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/90 bg-white/72 text-[#B65358] shadow-sm outline-none hover:scale-105 focus-visible:ring-2 focus-visible:ring-[#ED565B]/55"
                      >
                        <Utensils size={12} aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={finishSnackTime}
                      className="mt-2 text-[10px] font-bold text-[#9A7F72] underline decoration-[#CBA99B]/70 underline-offset-2"
                    >
                      Back to Tank
                    </button>
                  </div>
                )}
                {snackTimeStage === 'feeding' && <p className="text-[13px] font-black text-[#B45156]">냠냠!</p>}
                {snackTimeStage === 'celebrating' && (
                  <p className="text-[13px] font-black text-[#B45156]">Lunchmate loved it ♡</p>
                )}
                {snackTimeStage === 'complete' && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <p className="text-[15px] font-black text-[#B45156]">Snack Time Complete ✨</p>
                    <p className="mt-1 text-[12px] font-bold text-[#8F7064]">
                      {snackSession.consumedIds.length} Munchies enjoyed
                    </p>
                    <p className="mt-0.5 text-[12px] font-black text-[#E05257]">
                      +{snackTimeSessionXpGain(snackSession, CAPTURED_MUNCHIE_XP)} XP
                    </p>
                  </motion.div>
                )}
                {snackTimeStage === 'error' && (
                  <p role="alert" className="text-[12px] font-bold text-[#B33E43]">
                    {feeding.lunchmateFlow.errorMessage ?? 'Snack Time을 마치지 못했어요. Munchie와 XP는 안전해요.'}
                  </p>
                )}
                {(snackTimeStage === 'complete' || snackTimeStage === 'error') && (
                  <button
                    type="button"
                    onClick={finishSnackTime}
                    className="mt-3 h-10 rounded-xl border border-[#E39A8D] bg-white/80 px-5 text-[12px] font-black text-[#BD565A] shadow-sm"
                  >
                    Back to Tank
                  </button>
                )}
              </div>
            </motion.section>
          )}

          {phase === 'error' && (
            <motion.section
              key="error"
              className="mx-auto mt-14 max-w-[340px] rounded-[28px] border border-[#F0D3CA] bg-white/75 p-6 text-center shadow-lg"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              role="alert"
            >
              <p className="text-3xl" aria-hidden="true">📷</p>
              <p className="mt-4 text-[16px] font-black">That photo did not make it through.</p>
              <p className="mt-2 text-[12px] leading-5 text-[#987D70]">{errorMessage}</p>
              <button type="button" onClick={beginCapture} className="mt-6 h-12 rounded-2xl bg-[#ED565B] px-6 text-[14px] font-black text-white">
                Try another photo
              </button>
              {collection.items.length > 0 && (
                <button type="button" onClick={() => setPhase('collection')} className="mt-3 block w-full text-[12px] font-bold text-[#9A7F72]">
                  Back to collection
                </button>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {hatchFlight && (
          <motion.div
            key={hatchFlight.id}
            className="pointer-events-none fixed z-[100]"
            style={{
              left: hatchFlight.left,
              top: hatchFlight.top,
              width: hatchFlight.width,
            }}
            initial={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
            animate={shouldReduceMotion
              ? { y: hatchFlight.deltaY, scale: 0.55, opacity: 0 }
              : {
                  x: hatchFlight.deltaX,
                  y: hatchFlight.deltaY,
                  scale: 0.28,
                  rotate: hatchFlight.munchie.placement.rotationDeg > 0 ? 7 : -7,
                  opacity: [1, 1, 0.72, 0],
                }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.18 : 0.52, ease: [0.32, 0.72, 0, 1] }}
            onAnimationComplete={() => {
              if (hatchTransitionMunchieIdRef.current !== hatchFlight.id) return;
              dispatchHatchQueue({ type: 'enqueue', id: hatchFlight.id });
              hatchTransitionMunchieIdRef.current = null;
              setHatchFlight(null);
              setSelectedMunchieId(null);
              selectedMunchieElementRef.current = null;
            }}
            aria-hidden="true"
          >
            <CapturedMunchieVisual munchie={hatchFlight.munchie} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
