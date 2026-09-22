import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  BadgeDollarSign,
  ChevronLeft,
  ChevronRight,
  Map as RouteMapIcon,
  MessageSquareQuote,
  Store,
  Trash2,
  Type,
  Utensils,
} from 'lucide-react';
import {
  MAX_FEED_STORY_OVERLAYS,
  MAX_FEED_STORY_TEXT_LENGTH,
  type FeedStoryOverlay,
  type FeedStoryOverlayAlign,
  type FeedStoryOverlayKind,
  type FeedStoryOverlaySize,
  type FeedStoryOverlayTone,
  type FeedStorySlide,
} from '@/lib/feedStory';
import FeedStoryOverlayVisual from './FeedStoryOverlayVisual';

export interface FeedStoryEditorStop {
  id?: string;
  placeId?: string;
  restaurantId?: string;
  name?: string | null;
  order?: number;
}

export interface FeedStoryEditorRestaurant {
  id: string;
  name: string;
}

export interface FeedStoryEditorProps {
  slides: FeedStorySlide[];
  onChange: (slides: FeedStorySlide[]) => void;
  stops?: FeedStoryEditorStop[];
  restaurants?: FeedStoryEditorRestaurant[];
  className?: string;
}

const OVERLAY_CHOICES: Array<{
  kind: FeedStoryOverlayKind;
  label: string;
  Icon: typeof RouteMapIcon;
}> = [
  { kind: 'course_map', label: "Course Map", Icon: RouteMapIcon },
  { kind: 'food_name', label: "Dish name", Icon: Utensils },
  { kind: 'restaurant_name', label: "Restaurant name", Icon: Store },
  { kind: 'price', label: "Price", Icon: BadgeDollarSign },
  { kind: 'review', label: "Caption", Icon: MessageSquareQuote },
  { kind: 'text', label: "Text", Icon: Type },
];

const TONE_OPTIONS: Array<{ value: FeedStoryOverlayTone; label: string }> = [
  { value: 'light', label: "Simple" },
  { value: 'dark', label: "Translucent" },
  { value: 'accent', label: "Accent" },
];

const POSITION_OPTIONS = [
  { x: 18, y: 16, label: "Top left" },
  { x: 50, y: 16, label: "Top centre" },
  { x: 82, y: 16, label: "Top right" },
  { x: 18, y: 50, label: "Middle left" },
  { x: 50, y: 50, label: "Centre" },
  { x: 82, y: 50, label: "Middle right" },
  { x: 18, y: 84, label: "Bottom left" },
  { x: 50, y: 84, label: "Bottom centre" },
  { x: 82, y: 84, label: "Bottom right" },
] as const;

const SIZE_OPTIONS: Array<{ value: FeedStoryOverlaySize; label: string }> = [
  { value: 'sm', label: "Small" },
  { value: 'md', label: "Medium" },
  { value: 'lg', label: "Large" },
];

const ALIGN_OPTIONS: Array<{
  value: FeedStoryOverlayAlign;
  label: string;
  Icon: typeof AlignLeft;
}> = [
  { value: 'left', label: "Align left", Icon: AlignLeft },
  { value: 'center', label: "Align centre", Icon: AlignCenter },
  { value: 'right', label: "Align right", Icon: AlignRight },
];

const overlayKindLabel = (kind: FeedStoryOverlayKind) => (
  OVERLAY_CHOICES.find(choice => choice.kind === kind)?.label ?? "Info"
);

const stopRestaurantId = (stop: FeedStoryEditorStop) => (
  stop.restaurantId ?? stop.placeId ?? stop.id ?? ''
);

function cleanEditorText(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .slice(0, MAX_FEED_STORY_TEXT_LENGTH);
}

function createEditorId(prefix: string) {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

function orderedRestaurantOptions(
  stops: FeedStoryEditorStop[],
  restaurants: FeedStoryEditorRestaurant[],
) {
  const restaurantById = new Map(restaurants.map(restaurant => [restaurant.id, restaurant]));
  return stops
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .flatMap((stop) => {
      const id = stopRestaurantId(stop);
      if (!id) return [];
      const name = stop.name?.trim() || restaurantById.get(id)?.name?.trim();
      return name ? [{ id, name }] : [];
    })
    .filter((option, index, all) => all.findIndex(item => item.id === option.id) === index);
}

function defaultOverlayText(
  kind: FeedStoryOverlayKind,
  restaurants: Array<{ id: string; name: string }>,
) {
  if (kind === 'course_map') {
    return restaurants.length > 0
      ? restaurants.map((restaurant, index) => `${index + 1}. ${restaurant.name}`).join(' → ')
      : "Course Map";
  }
  if (kind === 'restaurant_name') return restaurants[0]?.name ?? "Restaurant name";
  if (kind === 'food_name') return "Dish name";
  if (kind === 'price') return "Price";
  if (kind === 'review') return "Add a caption";
  return "Add some text";
}

export function clampFeedStoryOverlay(
  overlay: FeedStoryOverlay,
  patch: Partial<FeedStoryOverlay> = {},
): FeedStoryOverlay {
  const widthValue = typeof patch.width === 'number' && Number.isFinite(patch.width)
    ? patch.width
    : overlay.width;
  const width = Math.max(20, Math.min(92, widthValue));
  const xValue = typeof patch.x === 'number' && Number.isFinite(patch.x) ? patch.x : overlay.x;
  const yValue = typeof patch.y === 'number' && Number.isFinite(patch.y) ? patch.y : overlay.y;
  return {
    ...overlay,
    ...patch,
    ...(typeof patch.text === 'string' ? { text: cleanEditorText(patch.text) } : {}),
    width,
    x: Math.max(width / 2, Math.min(100 - width / 2, xValue)),
    y: Math.max(10, Math.min(92, yValue)),
  };
}

export function createFeedStoryEditorOverlay(
  kind: FeedStoryOverlayKind,
  restaurants: Array<{ id: string; name: string }> = [],
  _existingCount = 0,
  id = createEditorId('overlay'),
): FeedStoryOverlay {
  const preset: Record<FeedStoryOverlayKind, Pick<FeedStoryOverlay, 'x' | 'y' | 'width' | 'tone' | 'size' | 'align'>> = {
    restaurant_name: { x: 70, y: 13, width: 38, tone: 'light', size: 'sm', align: 'center' },
    food_name: { x: 70, y: 23, width: 44, tone: 'light', size: 'lg', align: 'center' },
    price: { x: 70, y: 33, width: 38, tone: 'light', size: 'md', align: 'center' },
    course_map: { x: 70, y: 47, width: 42, tone: 'light', size: 'sm', align: 'center' },
    review: { x: 70, y: 60, width: 42, tone: 'light', size: 'md', align: 'center' },
    text: { x: 70, y: 72, width: 44, tone: 'light', size: 'sm', align: 'center' },
  };
  const placement = preset[kind];
  const restaurantId = kind === 'restaurant_name' ? restaurants[0]?.id : undefined;
  return clampFeedStoryOverlay({
    id,
    kind,
    text: defaultOverlayText(kind, restaurants),
    ...(restaurantId ? { restaurantId } : {}),
    ...placement,
  });
}

export function addFeedStoryOverlay(
  slides: FeedStorySlide[],
  slideId: string,
  overlay: FeedStoryOverlay,
) {
  return slides.map(slide => slide.id !== slideId
    ? slide
    : slide.overlays.length >= MAX_FEED_STORY_OVERLAYS
      ? slide
      : { ...slide, overlays: [...slide.overlays, overlay] });
}

export function updateFeedStoryOverlay(
  slides: FeedStorySlide[],
  slideId: string,
  overlayId: string,
  patch: Partial<FeedStoryOverlay>,
) {
  return slides.map(slide => slide.id !== slideId
    ? slide
    : {
        ...slide,
        overlays: slide.overlays.map(overlay => (
          overlay.id === overlayId ? clampFeedStoryOverlay(overlay, patch) : overlay
        )),
      });
}

export function removeFeedStoryOverlay(
  slides: FeedStorySlide[],
  slideId: string,
  overlayId: string,
) {
  return slides.map(slide => slide.id !== slideId
    ? slide
    : { ...slide, overlays: slide.overlays.filter(overlay => overlay.id !== overlayId) });
}

export default function FeedStoryEditor({
  slides,
  onChange,
  stops = [],
  restaurants = [],
  className = '',
}: FeedStoryEditorProps) {
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(
    () => slides[0]?.overlays[0]?.id ?? null,
  );
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    slideId: string;
    overlayId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const restaurantOptions = useMemo(
    () => orderedRestaurantOptions(stops, restaurants),
    [restaurants, stops],
  );
  const selectedSlide = slides[selectedSlideIndex] ?? null;
  const selectedOverlay = selectedSlide?.overlays.find(overlay => overlay.id === selectedOverlayId) ?? null;

  useEffect(() => {
    setSelectedSlideIndex(current => Math.max(0, Math.min(slides.length - 1, current)));
  }, [slides.length]);

  useEffect(() => {
    if (!selectedSlide?.overlays.some(overlay => overlay.id === selectedOverlayId)) {
      setSelectedOverlayId(null);
    }
  }, [selectedOverlayId, selectedSlide]);

  const selectSlide = (index: number) => {
    if (slides.length === 0) return;
    const nextIndex = (index + slides.length) % slides.length;
    setSelectedSlideIndex(nextIndex);
    setSelectedOverlayId(slides[nextIndex]?.overlays[0]?.id ?? null);
  };

  const addOverlay = (kind: FeedStoryOverlayKind) => {
    if (!selectedSlide || selectedSlide.overlays.length >= MAX_FEED_STORY_OVERLAYS) return;
    const overlay = createFeedStoryEditorOverlay(
      kind,
      restaurantOptions,
      selectedSlide.overlays.length,
    );
    onChange(addFeedStoryOverlay(slides, selectedSlide.id, overlay));
    setSelectedOverlayId(overlay.id);
  };

  const updateSelected = (patch: Partial<FeedStoryOverlay>) => {
    if (!selectedSlide || !selectedOverlay) return;
    onChange(updateFeedStoryOverlay(slides, selectedSlide.id, selectedOverlay.id, patch));
  };

  const removeSelected = () => {
    if (!selectedSlide || !selectedOverlay) return;
    onChange(removeFeedStoryOverlay(slides, selectedSlide.id, selectedOverlay.id));
    setSelectedOverlayId(null);
  };

  const beginOverlayDrag = (event: PointerEvent<HTMLButtonElement>, overlay: FeedStoryOverlay) => {
    if (event.button !== 0) return;
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds || !selectedSlide) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedOverlayId(overlay.id);
    const pointerX = ((event.clientX - bounds.left) / bounds.width) * 100;
    const pointerY = ((event.clientY - bounds.top) / bounds.height) * 100;
    dragRef.current = {
      pointerId: event.pointerId,
      slideId: selectedSlide.id,
      overlayId: overlay.id,
      offsetX: overlay.x - pointerX,
      offsetY: overlay.y - pointerY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveOverlay = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!drag || !bounds || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100 + drag.offsetX;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100 + drag.offsetY;
    onChange(updateFeedStoryOverlay(slides, drag.slideId, drag.overlayId, { x, y }));
  };

  const handleOverlayKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    overlay: FeedStoryOverlay,
  ) => {
    const delta = event.shiftKey ? 5 : 1;
    const patch = event.key === 'ArrowLeft'
      ? { x: overlay.x - delta }
      : event.key === 'ArrowRight'
        ? { x: overlay.x + delta }
        : event.key === 'ArrowUp'
          ? { y: overlay.y - delta }
          : event.key === 'ArrowDown'
            ? { y: overlay.y + delta }
            : null;
    if (!patch || !selectedSlide) return;
    event.preventDefault();
    setSelectedOverlayId(overlay.id);
    onChange(updateFeedStoryOverlay(slides, selectedSlide.id, overlay.id, patch));
  };

  if (!selectedSlide) {
    return (
      <section className={`rounded-2xl border border-dashed border-[#E2CFC5] bg-white/70 px-5 py-10 text-center ${className}`} aria-label="Photo editor">
        <strong className="text-[14px] text-[#46342C]">No photos to edit</strong>
        <p className="mt-1 text-[11px] font-semibold text-[#9C857A]">Add a photo to get started.</p>
      </section>
    );
  }

  return (
    <section className={className} aria-label="Photo editor">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => selectSlide(selectedSlideIndex - 1)}
          aria-label="Previous photo"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E9D6CC] bg-white text-[#5D483E] shadow-sm active:scale-95"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0 text-center">
          <p className="text-[13px] font-black text-[#3C2A23]">Editing photo {selectedSlideIndex + 1} only</p>
          <p className="mt-0.5 text-[10px] font-bold text-[#9B8277]" aria-live="polite" aria-atomic="true">
            Photo {selectedSlideIndex + 1} of {slides.length}
          </p>
        </div>
        <button
          type="button"
          onClick={() => selectSlide(selectedSlideIndex + 1)}
          aria-label="Next photo"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E9D6CC] bg-white text-[#5D483E] shadow-sm active:scale-95"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div
        ref={canvasRef}
        data-ui="feed-story-editor-canvas"
        data-story-ratio="4:5"
        className="relative mx-auto isolate aspect-[4/5] w-full max-w-[390px] touch-pan-y select-none overflow-hidden rounded-[22px] border border-[#E6D2C8] bg-[#30211B] shadow-[0_14px_34px_rgba(72,43,31,0.18)] [container-type:inline-size]"
        role="group"
        aria-roledescription="Edit slide"
        aria-label={`Photo ${selectedSlideIndex + 1} of ${slides.length}`}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            selectSlide(selectedSlideIndex - 1);
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            selectSlide(selectedSlideIndex + 1);
          }
        }}
        onPointerMove={moveOverlay}
        onPointerUp={() => { dragRef.current = null; }}
        onPointerCancel={() => { dragRef.current = null; }}
        onClick={() => setSelectedOverlayId(null)}
      >
        <img
          src={selectedSlide.photo}
          alt={`Post photo ${selectedSlideIndex + 1}`}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50" aria-hidden="true" />
        {selectedSlide.overlays.map((overlay) => (
          <button
            key={overlay.id}
            type="button"
            data-overlay-id={overlay.id}
            onPointerDown={event => beginOverlayDrag(event, overlay)}
            onKeyDown={event => handleOverlayKeyDown(event, overlay)}
            onClick={event => { event.stopPropagation(); setSelectedOverlayId(overlay.id); }}
            aria-label={`Move and edit ${overlayKindLabel(overlay.kind)} overlay`}
            aria-pressed={selectedOverlayId === overlay.id}
            className={`absolute z-10 touch-none cursor-grab border-0 bg-transparent p-0 active:cursor-grabbing ${selectedOverlayId === overlay.id ? 'rounded-xl ring-2 ring-[#FFE16A] ring-offset-2 ring-offset-black/20' : ''}`}
            style={{
              left: `${overlay.x}%`,
              top: `${overlay.y}%`,
              width: `${overlay.width}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <FeedStoryOverlayVisual
              overlay={overlay}
              places={restaurantOptions}
              fallbackText={overlayKindLabel(overlay.kind)}
            />
          </button>
        ))}
      </div>

      <ol className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Choose photo">
        {slides.map((slide, index) => (
          <li key={slide.id} className="shrink-0">
            <button
              type="button"
              onClick={() => selectSlide(index)}
              aria-label={`Select photo ${index + 1}`}
              aria-current={index === selectedSlideIndex ? 'true' : undefined}
              className={`relative h-14 w-14 overflow-hidden rounded-xl border-2 bg-[#EEE2DA] active:scale-95 ${index === selectedSlideIndex ? 'border-[#E94D55]' : 'border-white'}`}
            >
              <img src={slide.photo} alt="" className="h-full w-full object-cover" draggable={false} />
              <span className="absolute bottom-0 left-0 rounded-tr-lg bg-black/60 px-1.5 py-0.5 text-[9px] font-black text-white">{index + 1}</span>
              <span className="absolute right-0 top-0 rounded-bl-lg bg-[#E94D55]/90 px-1.5 py-0.5 text-[8px] font-black text-white">{slide.overlays.length}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-4 rounded-2xl border border-[#EBDDD5] bg-white px-3 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] font-black text-[#45332B]">Add details</p>
          <span className="text-[10px] font-bold tabular-nums text-[#9C8277]">
            {selectedSlide.overlays.length} / {MAX_FEED_STORY_OVERLAYS}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {OVERLAY_CHOICES.map(({ kind, label, Icon }) => (
            <button
              key={kind}
              type="button"
              onClick={() => addOverlay(kind)}
              disabled={selectedSlide.overlays.length >= MAX_FEED_STORY_OVERLAYS}
              className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-[#FFF1EC] px-2 text-[10px] font-black text-[#BE4D52] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon size={13} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {selectedOverlay && (
        <section className="mt-3 rounded-2xl border border-[#E8D7CE] bg-white px-3 py-3 shadow-sm" aria-label={`Edit ${overlayKindLabel(selectedOverlay.kind)}`}>
          <div className="flex items-center justify-between gap-3">
            <strong className="text-[12px] text-[#45332B]">Edit {overlayKindLabel(selectedOverlay.kind)}</strong>
            <button
              type="button"
              onClick={removeSelected}
              aria-label={`Delete ${overlayKindLabel(selectedOverlay.kind)}`}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF0F0] text-[#D84950] active:scale-95"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {selectedOverlay.kind === 'restaurant_name' && restaurantOptions.length > 0 && (
            <label className="mt-2 block text-[10px] font-black text-[#816B60]">

              Linked restaurant
              <select
                value={selectedOverlay.restaurantId ?? ''}
                onChange={(event) => {
                  const restaurant = restaurantOptions.find(option => option.id === event.target.value);
                  updateSelected({
                    restaurantId: restaurant?.id,
                    ...(restaurant ? { text: restaurant.name } : {}),
                  });
                }}
                className="mt-1 h-11 w-full rounded-xl border border-[#E3D4CC] bg-[#FFFDFC] px-3 text-[12px] font-bold text-[#45332B] outline-none focus:border-[#E75B60]"
              >
                {restaurantOptions.map(restaurant => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}
              </select>
            </label>
          )}

          {selectedOverlay.kind === 'course_map' ? (
            <p className="mt-2 rounded-xl bg-[#FFF5F0] px-3 py-2.5 text-[10px] font-bold leading-relaxed text-[#816B60]">

              Your Course Map follows your restaurant order. Adjust its look below.
            </p>
          ) : (
            <label className="mt-2 block text-[10px] font-black text-[#816B60]">

              Display text
              <textarea
                value={selectedOverlay.text ?? ''}
                onChange={event => updateSelected({ text: event.target.value })}
                maxLength={MAX_FEED_STORY_TEXT_LENGTH}
                rows={selectedOverlay.kind === 'review' ? 3 : 2}
                className="mt-1 w-full resize-none rounded-xl border border-[#E3D4CC] bg-[#FFFDFC] px-3 py-2.5 text-[12px] font-semibold text-[#45332B] outline-none focus:border-[#E75B60]"
              />
            </label>
          )}

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <fieldset>
              <legend className="text-[10px] font-black text-[#816B60]">Style</legend>
              <div className="mt-1 grid grid-cols-3 gap-1">
                {TONE_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateSelected({ tone: option.value })}
                    aria-pressed={selectedOverlay.tone === option.value}
                    className={`min-h-11 rounded-xl px-2 text-[10px] font-black ${selectedOverlay.tone === option.value ? 'bg-[#44332C] text-white' : 'bg-[#F8F0EB] text-[#806B60]'}`}
                  >{option.label}</button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-[10px] font-black text-[#816B60]">Size</legend>
              <div className="mt-1 grid grid-cols-3 gap-1">
                {SIZE_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateSelected({ size: option.value })}
                    aria-pressed={selectedOverlay.size === option.value}
                    className={`min-h-11 rounded-xl px-2 text-[10px] font-black ${selectedOverlay.size === option.value ? 'bg-[#44332C] text-white' : 'bg-[#F8F0EB] text-[#806B60]'}`}
                  >{option.label}</button>
                ))}
              </div>
            </fieldset>
          </div>

          <fieldset className="mt-3">
            <legend className="text-[10px] font-black text-[#816B60]">Position</legend>
            <div className="mt-1 grid grid-cols-3 gap-1 rounded-xl bg-[#F8F0EB] p-1.5">
              {POSITION_OPTIONS.map(position => (
                <button
                  key={position.label}
                  type="button"
                  onClick={() => updateSelected({ x: position.x, y: position.y })}
                  aria-label={`Place at ${position.label}`}
                  className="flex min-h-10 items-center justify-center rounded-lg bg-white text-[9px] font-black text-[#806B60] shadow-sm active:scale-95"
                >
                  {position.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-3">
            <legend className="text-[10px] font-black text-[#816B60]">Alignment</legend>
            <div className="mt-1 grid grid-cols-3 gap-1">
              {ALIGN_OPTIONS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateSelected({ align: value })}
                  aria-label={label}
                  aria-pressed={selectedOverlay.align === value}
                  className={`flex min-h-11 items-center justify-center rounded-xl ${selectedOverlay.align === value ? 'bg-[#44332C] text-white' : 'bg-[#F8F0EB] text-[#806B60]'}`}
                ><Icon size={16} /></button>
              ))}
            </div>
          </fieldset>

          <label className="mt-3 block text-[10px] font-black text-[#816B60]">

            Width
            <input
              type="range"
              min="20"
              max="92"
              step="1"
              value={selectedOverlay.width}
              onChange={event => updateSelected({ width: Number(event.target.value) })}
              className="mt-2 w-full accent-[#E94D55]"
              aria-label="Overlay width"
            />
          </label>
          <p className="mt-2 rounded-xl bg-[#FFF6EF] px-3 py-2 text-[10px] font-semibold leading-relaxed text-[#8A7165]">Changes apply to this photo only. Drag or use the arrow keys to move items.</p>
        </section>
      )}
    </section>
  );
}
