import { useCallback, useEffect, useRef, useState } from 'react';
import type { InteractiveSegmenter } from '@mediapipe/tasks-vision';
import { Crosshair, ImagePlus, LoaderCircle } from 'lucide-react';
import {
  calculateInferenceDimensions,
  calculateMaskAreaPercent,
  createInferenceCanvas,
  createPinnedInteractiveSegmenter,
  createTransparentSegmentationResult,
  describeSegmentationSpeed,
  INFERENCE_LONG_EDGE_OPTIONS,
  MAGIC_TOUCH_MODEL_URL,
  MEDIAPIPE_TASKS_VISION_VERSION,
  MEDIAPIPE_WASM_BASE_URL,
  normalizedPointFromClient,
  POSITIVE_BRUSH_MODE,
  SEGMENTATION_DELEGATES,
  segmentationRunKey,
  type InferenceLongEdge,
  type NormalizedSegmentationPoint,
  type SegmentationDelegate,
} from '@/lib/munchieSegmentationSpike';

interface SegmentationMetrics {
  delegate: SegmentationDelegate;
  inferenceLongEdge: InferenceLongEdge;
  inferenceWidth: number;
  inferenceHeight: number;
  modelInitializationMs: number;
  setImageMs: number;
  segmentMs: number;
  totalMs: number;
  maskAreaPercent: number;
}

interface InitializedSegmenter {
  delegate: SegmentationDelegate;
  segmenter: InteractiveSegmenter;
  initializationMs: number;
  encodedImageKey: string | null;
}

interface ComparisonResult {
  status: 'running' | 'success' | 'error';
  metrics?: SegmentationMetrics;
  error?: string;
}

const CENTER_POINT: NormalizedSegmentationPoint = { x: 0.5, y: 0.5 };

function formatMetric(value: number | null, suffix: string) {
  return value === null ? '—' : `${value.toFixed(1)} ${suffix}`;
}

export default function MunchieSegmentationTestPage() {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [targetPoint, setTargetPoint] = useState<NormalizedSegmentationPoint>(CENTER_POINT);
  const [selectedDelegate, setSelectedDelegate] = useState<SegmentationDelegate>('CPU');
  const [selectedLongEdge, setSelectedLongEdge] = useState<InferenceLongEdge>(720);
  const [metrics, setMetrics] = useState<SegmentationMetrics | null>(null);
  const [comparisonResults, setComparisonResults] = useState<Record<string, ComparisonResult>>({});
  const [status, setStatus] = useState<'idle' | 'initializing' | 'segmenting' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const segmentersRef = useRef(new Map<SegmentationDelegate, InitializedSegmenter>());
  const segmenterPromisesRef = useRef(new Map<SegmentationDelegate, Promise<InitializedSegmenter>>());
  const originalUrlRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);
  const disposedRef = useRef(false);

  useEffect(() => () => {
    disposedRef.current = true;
    requestIdRef.current += 1;
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    segmentersRef.current.forEach(({ segmenter }) => segmenter.close());
    segmenterPromisesRef.current.forEach((promise, delegate) => {
      promise.then((initialized) => {
        if (initialized !== segmentersRef.current.get(delegate)) initialized.segmenter.close();
      }).catch(() => undefined);
    });
  }, []);

  const initializeSegmenter = useCallback(async (delegate: SegmentationDelegate) => {
    const existingSegmenter = segmentersRef.current.get(delegate);
    if (existingSegmenter) return existingSegmenter;
    const existingPromise = segmenterPromisesRef.current.get(delegate);
    if (existingPromise) return existingPromise;

    const promise = (async (): Promise<InitializedSegmenter> => {
      const startedAt = performance.now();
      const segmenter = await createPinnedInteractiveSegmenter(delegate);
      const initialized = {
        delegate,
        segmenter,
        initializationMs: performance.now() - startedAt,
        encodedImageKey: null,
      };
      if (disposedRef.current) {
        segmenter.close();
        throw new Error('The segmentation page was closed during initialization.');
      }
      segmentersRef.current.set(delegate, initialized);
      return initialized;
    })();
    segmenterPromisesRef.current.set(delegate, promise);
    try {
      return await promise;
    } catch (error) {
      segmenterPromisesRef.current.delete(delegate);
      throw error;
    }
  }, []);

  const segmentAtPoint = useCallback(async (
    point: NormalizedSegmentationPoint,
    delegate: SegmentationDelegate = selectedDelegate,
    inferenceLongEdge: InferenceLongEdge = selectedLongEdge,
  ) => {
    const image = imageRef.current;
    if (!image || !originalUrl) return;
    const requestId = requestIdRef.current + 1;
    const runKey = segmentationRunKey(delegate, inferenceLongEdge);
    requestIdRef.current = requestId;
    setTargetPoint(point);
    setMetrics(null);
    setErrorMessage(null);
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = null;
    setResultUrl(null);
    setComparisonResults((current) => ({
      ...current,
      [runKey]: { status: 'running' },
    }));
    setStatus(segmentersRef.current.has(delegate) ? 'segmenting' : 'initializing');
    await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));

    const totalStartedAt = performance.now();
    let failureStage: 'initialization' | 'setImage' | 'segment' = 'initialization';
    try {
      const initialized = await initializeSegmenter(delegate);
      if (requestId !== requestIdRef.current || originalUrl !== originalUrlRef.current) return;

      const inferenceDimensions = calculateInferenceDimensions(
        image.naturalWidth,
        image.naturalHeight,
        inferenceLongEdge,
      );
      const encodedImageKey = `${originalUrl}:${inferenceDimensions.width}x${inferenceDimensions.height}`;
      let setImageMs = 0;
      if (initialized.encodedImageKey !== encodedImageKey) {
        const inferenceCanvas = createInferenceCanvas(image, inferenceLongEdge);
        failureStage = 'setImage';
        const setImageStartedAt = performance.now();
        initialized.segmenter.setImage(inferenceCanvas);
        setImageMs = performance.now() - setImageStartedAt;
        initialized.encodedImageKey = encodedImageKey;
      }

      setStatus('segmenting');
      await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));
      failureStage = 'segment';
      const segmentStartedAt = performance.now();
      const mask = initialized.segmenter.segment([{
        brushMode: POSITIVE_BRUSH_MODE,
        point: [point],
        isCompleted: true,
      }]);
      const segmentMs = performance.now() - segmentStartedAt;
      const maskWidth = mask.width;
      const maskHeight = mask.height;
      const maskValues = new Float32Array(mask.getAsFloat32Array());
      mask.close();

      const nextResultUrl = await createTransparentSegmentationResult(
        image,
        maskValues,
        maskWidth,
        maskHeight,
      );
      if (requestId !== requestIdRef.current || originalUrl !== originalUrlRef.current) {
        URL.revokeObjectURL(nextResultUrl);
        return;
      }

      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = nextResultUrl;
      setResultUrl(nextResultUrl);
      const nextMetrics: SegmentationMetrics = {
        delegate,
        inferenceLongEdge,
        inferenceWidth: inferenceDimensions.width,
        inferenceHeight: inferenceDimensions.height,
        modelInitializationMs: initialized.initializationMs,
        setImageMs,
        segmentMs,
        totalMs: performance.now() - totalStartedAt,
        maskAreaPercent: calculateMaskAreaPercent(maskValues),
      };
      setMetrics(nextMetrics);
      setComparisonResults((current) => ({
        ...current,
        [runKey]: { status: 'success', metrics: nextMetrics },
      }));
      setStatus('ready');
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      const reason = error instanceof Error ? error.message : 'MediaPipe segmentation failed.';
      const message = delegate === 'GPU' && failureStage === 'initialization'
        ? `GPU unsupported / initialization failed: ${reason}`
        : `${delegate} ${failureStage} failed: ${reason}`;
      setComparisonResults((current) => ({
        ...current,
        [runKey]: { status: 'error', error: message },
      }));
      setErrorMessage(message);
      setStatus('error');
    }
  }, [initializeSegmenter, originalUrl, selectedDelegate, selectedLongEdge]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please choose an image file.');
      setStatus('error');
      return;
    }

    requestIdRef.current += 1;
    segmentersRef.current.forEach((initialized) => {
      initialized.encodedImageKey = null;
    });
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    const nextOriginalUrl = URL.createObjectURL(file);
    originalUrlRef.current = nextOriginalUrl;
    resultUrlRef.current = null;
    setOriginalUrl(nextOriginalUrl);
    setResultUrl(null);
    setFileName(file.name);
    setTargetPoint(CENTER_POINT);
    setMetrics(null);
    setComparisonResults({});
    setErrorMessage(null);
    setStatus('initializing');
  };

  const handleOriginalClick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (status === 'initializing' || status === 'segmenting') return;
    const point = normalizedPointFromClient(
      event.clientX,
      event.clientY,
      event.currentTarget.getBoundingClientRect(),
    );
    void segmentAtPoint(point);
  };

  const isWorking = status === 'initializing' || status === 'segmenting';

  return (
    <main className="min-h-dvh bg-[#FFF8F1] px-4 pb-16 pt-[max(28px,env(safe-area-inset-top))] text-[#3B2A22]">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="mx-auto w-full max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-[#EACFC3] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#DF555A]">Phase 1C-1 performance spike</p>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.04em]">Munchie Segmentation Test</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#876E62]">
              Center point로 자동 실행한 뒤, 원하는 음식이나 그릇을 한 번 클릭해 positive point를 바꿔보세요.
            </p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isWorking}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#ED565B] px-5 text-sm font-black text-white shadow-[0_10px_22px_rgba(223,72,78,0.24)] disabled:cursor-wait disabled:opacity-60"
          >
            <ImagePlus size={18} aria-hidden="true" /> Upload food photo
          </button>
        </header>

        <section className="mt-5 grid gap-4 rounded-[26px] border border-[#E8CEC2] bg-white/70 p-4 sm:grid-cols-[auto_auto_1fr] sm:items-end">
          <fieldset disabled={isWorking}>
            <legend className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#96796D]">Delegate</legend>
            <div className="flex gap-2">
              {SEGMENTATION_DELEGATES.map((delegate) => (
                <button
                  key={delegate}
                  type="button"
                  aria-pressed={selectedDelegate === delegate}
                  onClick={() => setSelectedDelegate(delegate)}
                  className={`h-10 min-w-20 rounded-xl border px-4 text-sm font-black transition ${selectedDelegate === delegate ? 'border-[#DB555A] bg-[#ED565B] text-white' : 'border-[#E1C8BD] bg-white text-[#72594E]'}`}
                >
                  {delegate}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset disabled={isWorking}>
            <legend className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#96796D]">Inference long edge</legend>
            <div className="flex gap-2">
              {INFERENCE_LONG_EDGE_OPTIONS.map((longEdge) => (
                <button
                  key={longEdge}
                  type="button"
                  aria-pressed={selectedLongEdge === longEdge}
                  onClick={() => setSelectedLongEdge(longEdge)}
                  className={`h-10 rounded-xl border px-3 text-sm font-black transition ${selectedLongEdge === longEdge ? 'border-[#DB555A] bg-[#FFF0E8] text-[#C6464B]' : 'border-[#E1C8BD] bg-white text-[#72594E]'}`}
                >
                  {longEdge}px
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            disabled={!originalUrl || isWorking}
            onClick={() => void segmentAtPoint(targetPoint, selectedDelegate, selectedLongEdge)}
            className="h-11 rounded-xl bg-[#3B2A22] px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40 sm:justify-self-end"
          >
            Run selected combination
          </button>
        </section>

        {!originalUrl ? (
          <section className="mt-8 flex min-h-[420px] flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-[#E6B9AA] bg-white/55 text-center">
            <Crosshair size={42} className="text-[#E06768]" aria-hidden="true" />
            <p className="mt-5 text-lg font-black">음식 사진을 선택해 주세요.</p>
            <p className="mt-2 text-sm text-[#92786C]">사진은 기기 안에서 선택한 MediaPipe delegate로 처리됩니다.</p>
          </section>
        ) : (
          <>
            <section className="mt-7 grid gap-5 lg:grid-cols-2">
              <article className="rounded-[28px] border border-[#EAD4CA] bg-white/80 p-4 shadow-[0_16px_36px_rgba(104,60,44,0.08)]">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-black">Original image</h2>
                    <p className="max-w-[260px] truncate text-xs text-[#9A8074]">{fileName}</p>
                  </div>
                  <span className="rounded-full bg-[#FFF0E8] px-3 py-1 text-xs font-bold text-[#CC5558]">
                    x {targetPoint.x.toFixed(3)} · y {targetPoint.y.toFixed(3)}
                  </span>
                </div>
                <div className="flex min-h-[360px] items-center justify-center rounded-[22px] bg-[#EFE5DE] p-3">
                  <div className="relative inline-block max-w-full">
                    <img
                      ref={imageRef}
                      src={originalUrl}
                      alt="Original uploaded food"
                      className={`block max-h-[520px] max-w-full rounded-xl object-contain ${isWorking ? 'cursor-wait' : 'cursor-crosshair'}`}
                      onLoad={() => void segmentAtPoint(CENTER_POINT)}
                      onClick={handleOriginalClick}
                    />
                    <span
                      className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-[#ED565B] shadow-[0_2px_8px_rgba(68,34,25,0.5)]"
                      style={{ left: `${targetPoint.x * 100}%`, top: `${targetPoint.y * 100}%` }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </article>

              <article className="rounded-[28px] border border-[#EAD4CA] bg-white/80 p-4 shadow-[0_16px_36px_rgba(104,60,44,0.08)]">
                <div className="mb-3">
                  <h2 className="font-black">Transparent result</h2>
                  <p className="text-xs text-[#9A8074]">음식과 해당 접시/그릇이 하나의 silhouette면 성공</p>
                </div>
                <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-[22px] bg-[linear-gradient(45deg,#EEE3DB_25%,transparent_25%),linear-gradient(-45deg,#EEE3DB_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#EEE3DB_75%),linear-gradient(-45deg,transparent_75%,#EEE3DB_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0px] p-3">
                  {resultUrl && (
                    <img src={resultUrl} alt="Transparent segmentation result" className="max-h-[520px] max-w-full object-contain drop-shadow-[0_14px_12px_rgba(73,43,31,0.2)]" />
                  )}
                  {isWorking && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FFF8F1]/86 text-center backdrop-blur-sm" aria-live="polite">
                      <LoaderCircle size={32} className="animate-spin text-[#E1575C]" aria-hidden="true" />
                      <p className="mt-4 font-black">{status === 'initializing' ? 'Loading pinned MagicTouch model...' : 'Segmenting target object...'}</p>
                    </div>
                  )}
                  {!resultUrl && !isWorking && status !== 'error' && (
                    <p className="text-sm font-bold text-[#90776B]">Result will appear here.</p>
                  )}
                </div>
              </article>
            </section>

            <section className="mt-5 grid gap-3 rounded-[26px] border border-[#E8CEC2] bg-[#3B2A22] p-5 text-[#FFF8F1] sm:grid-cols-4 lg:grid-cols-8" aria-label="Segmentation performance">
              <div className="rounded-2xl bg-white/8 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D8BEB2]">Delegate</p>
                <p className="mt-1 text-lg font-black">{metrics?.delegate ?? '—'}</p>
              </div>
              <div className="rounded-2xl bg-white/8 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D8BEB2]">Inference size</p>
                <p className="mt-1 text-lg font-black">{metrics ? `${metrics.inferenceLongEdge}px` : '—'}</p>
              </div>
              <div className="rounded-2xl bg-white/8 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D8BEB2]">Actual dimensions</p>
                <p className="mt-1 text-lg font-black">{metrics ? `${metrics.inferenceWidth}×${metrics.inferenceHeight}` : '—'}</p>
              </div>
              {[
                ['Model initialization', metrics?.modelInitializationMs ?? null, 'ms'],
                ['setImage', metrics?.setImageMs ?? null, 'ms'],
                ['segment', metrics?.segmentMs ?? null, 'ms'],
                ['Total', metrics?.totalMs ?? null, 'ms'],
                ['Mask area', metrics?.maskAreaPercent ?? null, '%'],
              ].map(([label, value, suffix]) => (
                <div key={String(label)} className="rounded-2xl bg-white/8 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#D8BEB2]">{label}</p>
                  <p className="mt-1 text-lg font-black">{formatMetric(value as number | null, suffix as string)}</p>
                </div>
              ))}
            </section>

            {metrics && (
              <p className="mt-3 rounded-xl bg-[#FFF0E8] px-4 py-3 text-sm font-black text-[#B94A4F]">
                Speed assessment: {describeSegmentationSpeed(metrics.segmentMs)}
              </p>
            )}

            <section className="mt-5 overflow-hidden rounded-[26px] border border-[#E8CEC2] bg-white/80">
              <div className="border-b border-[#E8CEC2] px-5 py-4">
                <h2 className="font-black">CPU / GPU comparison</h2>
                <p className="mt-1 text-xs text-[#8E7468]">같은 사진과 현재 positive point로 각 조합을 선택한 뒤 실행하세요.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left text-xs">
                  <thead className="bg-[#FFF4ED] text-[10px] uppercase tracking-[0.1em] text-[#8E7468]">
                    <tr>
                      <th className="px-4 py-3">Delegate</th>
                      <th className="px-4 py-3">Requested</th>
                      <th className="px-4 py-3">Actual</th>
                      <th className="px-4 py-3">Init</th>
                      <th className="px-4 py-3">setImage</th>
                      <th className="px-4 py-3">Segment</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SEGMENTATION_DELEGATES.flatMap((delegate) => (
                      INFERENCE_LONG_EDGE_OPTIONS.map((longEdge) => {
                        const result = comparisonResults[segmentationRunKey(delegate, longEdge)];
                        const rowMetrics = result?.metrics;
                        return (
                          <tr key={`${delegate}-${longEdge}`} className="border-t border-[#F0DED5]">
                            <td className="px-4 py-3 font-black">{delegate}</td>
                            <td className="px-4 py-3 font-bold">{longEdge}px</td>
                            <td className="px-4 py-3">{rowMetrics ? `${rowMetrics.inferenceWidth}×${rowMetrics.inferenceHeight}` : '—'}</td>
                            <td className="px-4 py-3">{formatMetric(rowMetrics?.modelInitializationMs ?? null, 'ms')}</td>
                            <td className="px-4 py-3">{formatMetric(rowMetrics?.setImageMs ?? null, 'ms')}</td>
                            <td className="px-4 py-3 font-black">{formatMetric(rowMetrics?.segmentMs ?? null, 'ms')}</td>
                            <td className="px-4 py-3">{formatMetric(rowMetrics?.totalMs ?? null, 'ms')}</td>
                            <td className={`max-w-[260px] px-4 py-3 font-bold ${result?.status === 'error' ? 'text-[#B33E43]' : 'text-[#6F5A50]'}`}>
                              {!result && 'Not run'}
                              {result?.status === 'running' && 'Running…'}
                              {result?.status === 'success' && rowMetrics && describeSegmentationSpeed(rowMetrics.segmentMs)}
                              {result?.status === 'error' && result.error}
                            </td>
                          </tr>
                        );
                      })
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <p className="mt-3 text-xs leading-5 text-[#8E7468]">
              @mediapipe/tasks-vision {MEDIAPIPE_TASKS_VISION_VERSION} · selected {selectedDelegate} / {selectedLongEdge}px · MagicTouch int8 model v1 · manual click reuses setImage only for the same delegate, photo and inference dimensions
              {' '}· transparent output remaps the smaller mask onto the original image aspect ratio (up to 1200px)
            </p>
          </>
        )}

        {errorMessage && (
          <div role="alert" className="mt-5 rounded-2xl border border-[#E9A6A5] bg-[#FFF0EE] px-4 py-3 text-sm font-bold text-[#B33E43]">
            {errorMessage}
          </div>
        )}
      </div>
    </main>
  );
}
