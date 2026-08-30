export const MAX_FEED_STORY_SLIDES = 6;
export const MAX_FEED_STORY_OVERLAYS = 6;
export const MAX_FEED_STORY_TEXT_LENGTH = 120;

export const FEED_STORY_OVERLAY_KINDS = [
  'course_map',
  'food_name',
  'restaurant_name',
  'price',
  'review',
  'text',
] as const;

export const FEED_STORY_OVERLAY_TONES = ['light', 'dark', 'accent'] as const;
export const FEED_STORY_OVERLAY_SIZES = ['sm', 'md', 'lg'] as const;
export const FEED_STORY_OVERLAY_ALIGNS = ['left', 'center', 'right'] as const;

export type FeedStoryOverlayKind = typeof FEED_STORY_OVERLAY_KINDS[number];
export type FeedStoryOverlayTone = typeof FEED_STORY_OVERLAY_TONES[number];
export type FeedStoryOverlaySize = typeof FEED_STORY_OVERLAY_SIZES[number];
export type FeedStoryOverlayAlign = typeof FEED_STORY_OVERLAY_ALIGNS[number];

/**
 * Feed overlay positions use the centre of the item as x/y, expressed as a
 * percentage of the 4:5 story canvas. `width` is also a canvas percentage.
 * Presentation values are presets rather than arbitrary CSS from the API.
 */
export interface FeedStoryOverlay {
  id: string;
  kind: FeedStoryOverlayKind;
  text?: string;
  restaurantId?: string;
  x: number;
  y: number;
  width: number;
  tone: FeedStoryOverlayTone;
  size: FeedStoryOverlaySize;
  align: FeedStoryOverlayAlign;
}

export interface FeedStorySlide {
  id: string;
  /** Canonical author-upload path returned by the feed API. */
  photo: string;
  overlays: FeedStoryOverlay[];
}

export interface FeedStoryPhotoAttribution {
  r2Path: string;
  classification: 'restaurant' | 'other';
  restaurantId?: string;
  source: 'gps_suggestion' | 'user_selected' | 'other';
}

export interface FeedStoryDefaultStop {
  id: string;
  name?: string | null;
  category?: string | null;
  address?: string | null;
}

export interface FeedStoryDefaultContext {
  title?: string | null;
  caption?: string | null;
  stops?: FeedStoryDefaultStop[];
  distanceKm?: number | null;
  durationLabel?: string | null;
  /** `photos`와 같은 순서의 사진별 식당 귀속. 인덱스 추측보다 우선한다. */
  photoRestaurantIds?: Array<string | null | undefined>;
}

interface NormalizeFeedStoryOptions {
  /** When supplied, slides pointing outside this canonical photo set are removed. */
  allowedPhotos?: Iterable<string>;
}

const kindSet = new Set<string>(FEED_STORY_OVERLAY_KINDS);
const toneSet = new Set<string>(FEED_STORY_OVERLAY_TONES);
const sizeSet = new Set<string>(FEED_STORY_OVERLAY_SIZES);
const alignSet = new Set<string>(FEED_STORY_OVERLAY_ALIGNS);

const cleanText = (value: unknown, limit = MAX_FEED_STORY_TEXT_LENGTH) => {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.trim().slice(0, limit);
  return cleaned || undefined;
};

/**
 * Resolves each canonical photo to its explicitly attributed course stop.
 * Missing/"other" attribution deliberately stays empty: callers must never
 * guess ownership from another photo or a catalogue cover.
 */
export function feedStoryRestaurantIdsForPhotos(
  photos: Array<string | null | undefined>,
  attributions: FeedStoryPhotoAttribution[] = [],
): Array<string | undefined> {
  const restaurantByPhoto = new Map<string, string>();
  for (const attribution of attributions) {
    if (attribution.classification !== 'restaurant') continue;
    const photo = cleanText(attribution.r2Path, 512);
    const restaurantId = cleanText(attribution.restaurantId, 160);
    if (!photo || !restaurantId || restaurantByPhoto.has(photo)) continue;
    restaurantByPhoto.set(photo, restaurantId);
  }
  return photos.map(photo => {
    const canonicalPhoto = cleanText(photo, 512);
    return canonicalPhoto ? restaurantByPhoto.get(canonicalPhoto) : undefined;
  });
}

/**
 * Applies a confirmed photo attribution to the visible restaurant overlay.
 * Classifying a photo as `other` removes the old restaurant label instead of
 * leaving stale text that falsely claims the photo belongs to that stop.
 */
export function setFeedStorySlideRestaurant(
  slide: FeedStorySlide,
  restaurant?: { id: string; name: string } | null,
): FeedStorySlide {
  return {
    ...slide,
    overlays: restaurant
      ? slide.overlays.map(overlay => overlay.kind === 'restaurant_name'
        ? { ...overlay, restaurantId: restaurant.id, text: restaurant.name }
        : overlay)
      : slide.overlays.filter(overlay => overlay.kind !== 'restaurant_name'),
  };
}

const cleanId = (value: unknown, fallback: string) => cleanText(value, 80) ?? fallback;

const uniqueId = (requested: string, fallback: string, seen: Set<string>) => {
  let candidate = seen.has(requested) ? fallback : requested;
  let suffix = 2;
  while (seen.has(candidate)) {
    candidate = `${fallback}-${suffix}`;
    suffix += 1;
  }
  seen.add(candidate);
  return candidate;
};

const clampNumber = (value: unknown, fallback: number, minimum: number, maximum: number) => {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(minimum, Math.min(maximum, number));
};

function normalizeOverlay(value: unknown, fallbackId: string): FeedStoryOverlay | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.kind !== 'string' || !kindSet.has(raw.kind)) return null;

  const kind = raw.kind as FeedStoryOverlayKind;
  const text = cleanText(raw.text);
  const restaurantId = cleanText(raw.restaurantId, 160);
  if (kind !== 'course_map' && !text && !(kind === 'restaurant_name' && restaurantId)) {
    return null;
  }

  return {
    id: cleanId(raw.id, fallbackId),
    kind,
    ...(text ? { text } : {}),
    ...(restaurantId ? { restaurantId } : {}),
    x: clampNumber(raw.x, 50, 0, 100),
    y: clampNumber(raw.y, 50, 0, 100),
    width: clampNumber(raw.width, 72, 10, 100),
    tone: typeof raw.tone === 'string' && toneSet.has(raw.tone)
      ? raw.tone as FeedStoryOverlayTone
      : 'light',
    size: typeof raw.size === 'string' && sizeSet.has(raw.size)
      ? raw.size as FeedStoryOverlaySize
      : 'md',
    align: typeof raw.align === 'string' && alignSet.has(raw.align)
      ? raw.align as FeedStoryOverlayAlign
      : 'left',
  };
}

/**
 * Normalizes untrusted API/editor input into the bounded story contract.
 * Unknown kinds and text-less text overlays are dropped instead of becoming
 * arbitrary DOM/CSS. Duplicate photos are collapsed to one slide.
 */
export function normalizeFeedStorySlides(
  value: unknown,
  options: NormalizeFeedStoryOptions = {},
): FeedStorySlide[] {
  if (!Array.isArray(value)) return [];
  const allowedPhotos = options.allowedPhotos
    ? new Set(Array.from(options.allowedPhotos, photo => cleanText(photo, 512)).filter((photo): photo is string => Boolean(photo)))
    : null;
  const seenPhotos = new Set<string>();
  const seenSlideIds = new Set<string>();
  // The server treats overlay ids as post-wide edit handles. Keep the browser
  // contract identical so a save round-trip never silently renames an overlay
  // from another slide.
  const seenOverlayIds = new Set<string>();
  const slides: FeedStorySlide[] = [];

  for (const rawValue of value) {
    if (slides.length >= MAX_FEED_STORY_SLIDES) break;
    if (!rawValue || typeof rawValue !== 'object') continue;
    const raw = rawValue as Record<string, unknown>;
    const photo = cleanText(raw.photo, 512);
    if (!photo || seenPhotos.has(photo) || (allowedPhotos && !allowedPhotos.has(photo))) continue;
    seenPhotos.add(photo);
    const slideIndex = slides.length;
    const requestedSlideId = cleanId(raw.id, `slide-${slideIndex}`);
    const slideId = uniqueId(requestedSlideId, `slide-${slideIndex}`, seenSlideIds);
    const overlays: FeedStoryOverlay[] = [];
    if (Array.isArray(raw.overlays)) {
      for (const rawOverlay of raw.overlays) {
        if (overlays.length >= MAX_FEED_STORY_OVERLAYS) break;
        const overlayIndex = overlays.length;
        const overlay = normalizeOverlay(rawOverlay, `overlay-${slideIndex}-${overlayIndex}`);
        if (!overlay) continue;
        const overlayId = uniqueId(
          overlay.id,
          `overlay-${slideIndex}-${overlayIndex}`,
          seenOverlayIds,
        );
        overlays.push(overlayId === overlay.id ? overlay : { ...overlay, id: overlayId });
      }
    }
    slides.push({
      id: slideId,
      photo,
      overlays,
    });
  }

  return slides;
}

function defaultTextOverlay(
  id: string,
  kind: FeedStoryOverlayKind,
  text: string,
  y: number,
  size: FeedStoryOverlaySize,
): FeedStoryOverlay {
  return {
    id,
    kind,
    text,
    x: 50,
    y,
    width: 88,
    tone: 'light',
    size,
    align: 'left',
  };
}

/** Converts legacy `photos + course metadata` into the same per-photo model. */
export function buildDefaultFeedStorySlides(
  photos: Array<string | null | undefined>,
  context: FeedStoryDefaultContext = {},
): FeedStorySlide[] {
  const seenPhotos = new Set<string>();
  const uniquePhotos = photos.flatMap((rawPhoto, originalIndex) => {
    const photo = cleanText(rawPhoto, 512);
    if (!photo || seenPhotos.has(photo)) return [];
    seenPhotos.add(photo);
    return [{ photo, originalIndex }];
  }).slice(0, MAX_FEED_STORY_SLIDES);
  const stops = context.stops ?? [];
  const stopNames = stops.map(stop => cleanText(stop.name)).filter((name): name is string => Boolean(name));
  const title = cleanText(context.title);
  const caption = cleanText(context.caption);
  const distance = typeof context.distanceKm === 'number' && Number.isFinite(context.distanceKm) && context.distanceKm > 0
    ? `${context.distanceKm}km`
    : undefined;
  const duration = cleanText(context.durationLabel, 40);
  const hasExplicitPhotoAttribution = Array.isArray(context.photoRestaurantIds);

  return uniquePhotos.map(({ photo, originalIndex }, slideIndex) => {
    const attributedRestaurantId = cleanText(context.photoRestaurantIds?.[originalIndex], 160);
    const stop = stops.find(item => item.id === attributedRestaurantId)
      ?? (hasExplicitPhotoAttribution
        ? undefined
        : (stops[slideIndex] ?? stops[0]));
    const stopName = cleanText(stop?.name);
    const displayTitle = stopName ?? title ?? '나만의 Munchie 코스';
    const details = [cleanText(stop?.category), cleanText(stop?.address), distance, duration]
      .filter((value): value is string => Boolean(value))
      .join(' · ');
    const overlays: FeedStoryOverlay[] = [];

    if (stops.length > 1) {
      overlays.push({
        id: `slide-${slideIndex}-course-map`,
        kind: 'course_map',
        x: 50,
        y: 18,
        width: 88,
        tone: 'light',
        size: 'sm',
        align: 'left',
      });
      if (title) {
        overlays.push(defaultTextOverlay(`slide-${slideIndex}-course-title`, 'text', title, 61, 'lg'));
      }
    }
    overlays.push({
      ...defaultTextOverlay(
        `slide-${slideIndex}-title`,
        'restaurant_name',
        displayTitle,
        stops.length > 1 ? 72 : (caption ? 72 : 80),
        stops.length > 1 ? 'md' : 'lg',
      ),
      ...(stop?.id ? { restaurantId: stop.id } : {}),
    });
    if (details) {
      overlays.push(defaultTextOverlay(`slide-${slideIndex}-details`, 'text', details, caption ? 81 : 90, 'sm'));
    }
    if (caption) {
      overlays.push(defaultTextOverlay(`slide-${slideIndex}-review`, 'review', caption, 91, 'md'));
    }

    return { id: `slide-${slideIndex}`, photo, overlays: overlays.slice(0, MAX_FEED_STORY_OVERLAYS) };
  });
}

/** Uses persisted per-photo slides when valid, otherwise builds legacy defaults. */
export function resolveFeedStorySlides(
  slides: unknown,
  photos: Array<string | null | undefined>,
  context: FeedStoryDefaultContext = {},
) {
  const legacyPhotos = Array.from(new Set(
    photos.map(photo => cleanText(photo, 512)).filter((photo): photo is string => Boolean(photo)),
  )).slice(0, MAX_FEED_STORY_SLIDES);
  const normalized = normalizeFeedStorySlides(slides, { allowedPhotos: legacyPhotos });
  const defaults = buildDefaultFeedStorySlides(legacyPhotos, context);
  if (normalized.length === 0) return defaults;

  // A partially-written legacy story must never hide another canonical author
  // photo. Preserve every valid customized slide, then fill any missing photo
  // from the same bounded default contract in canonical media order.
  const normalizedByPhoto = new Map(normalized.map(slide => [slide.photo, slide]));
  const defaultByPhoto = new Map(defaults.map(slide => [slide.photo, slide]));
  return legacyPhotos.flatMap(photo => {
    const slide = normalizedByPhoto.get(photo) ?? defaultByPhoto.get(photo);
    return slide ? [slide] : [];
  });
}
