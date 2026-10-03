export const PHOTO_REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const;
export const PHOTO_KINDS = ['dish', 'table', 'interior', 'storefront', 'other', 'unclassified'] as const;

export type PhotoReviewStatus = typeof PHOTO_REVIEW_STATUSES[number];
export type PhotoKind = typeof PHOTO_KINDS[number];

export type PhotoReviewRecord = {
  review_status: PhotoReviewStatus;
  kind: PhotoKind;
  has_person: number;
  quality: number | null;
  review_notes: string | null;
};

export type PhotoReviewUpdate = {
  reviewStatus: PhotoReviewStatus;
  kind: PhotoKind;
  hasPerson: 0 | 1;
  quality: number | null;
  reviewNotes: string | null;
};

type ParseResult =
  | { ok: true; value: PhotoReviewUpdate }
  | { ok: false; error: string };

export function escapePhotoSearchTerm(value: string): string {
  return value.replace(/[\\%_]/g, character => `\\${character}`);
}

export function parsePhotoReviewUpdate(
  body: unknown,
  current: PhotoReviewRecord,
): ParseResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: "Invalid review details." };
  }
  const input = body as Record<string, unknown>;
  const supported = ['reviewStatus', 'kind', 'hasPerson', 'quality', 'reviewNotes'];
  if (!supported.some(key => Object.hasOwn(input, key))) {
    return { ok: false, error: "No review changes provided." };
  }

  const reviewStatus = input.reviewStatus ?? current.review_status;
  if (!PHOTO_REVIEW_STATUSES.includes(reviewStatus as PhotoReviewStatus)) {
    return { ok: false, error: "Invalid review status." };
  }

  const kind = input.kind ?? current.kind;
  if (!PHOTO_KINDS.includes(kind as PhotoKind)) {
    return { ok: false, error: "Invalid photo type." };
  }

  const hasPersonValue = input.hasPerson ?? Boolean(current.has_person);
  if (typeof hasPersonValue !== 'boolean') {
    return { ok: false, error: "Invalid people flag." };
  }

  const qualityValue = Object.hasOwn(input, 'quality') ? input.quality : current.quality;
  if (qualityValue !== null && (typeof qualityValue !== 'number' || !Number.isFinite(qualityValue) || qualityValue < 0 || qualityValue > 1)) {
    return { ok: false, error: "Quality scores must be between 0 and 1." };
  }

  const notesValue = Object.hasOwn(input, 'reviewNotes') ? input.reviewNotes : current.review_notes;
  if (notesValue !== null && typeof notesValue !== 'string') {
    return { ok: false, error: "Invalid review notes." };
  }
  const reviewNotes = typeof notesValue === 'string' ? notesValue.trim() : null;
  if (reviewNotes && reviewNotes.length > 500) {
    return { ok: false, error: "Review notes must be 500 characters or fewer." };
  }

  return {
    ok: true,
    value: {
      reviewStatus: reviewStatus as PhotoReviewStatus,
      kind: kind as PhotoKind,
      hasPerson: hasPersonValue ? 1 : 0,
      quality: qualityValue as number | null,
      reviewNotes: reviewNotes || null,
    },
  };
}
