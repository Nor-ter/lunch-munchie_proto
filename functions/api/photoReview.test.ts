import { describe, expect, it } from 'vitest';
import { escapePhotoSearchTerm, parsePhotoReviewUpdate, type PhotoReviewRecord } from './photoReview';

const current: PhotoReviewRecord = {
  review_status: 'pending',
  kind: 'unclassified',
  has_person: 0,
  quality: null,
  review_notes: null,
};

describe('restaurant photo review validation', () => {
  it('accepts a complete reversible moderation update', () => {
    expect(parsePhotoReviewUpdate({
      reviewStatus: 'approved',
      kind: 'dish',
      hasPerson: false,
      quality: 0.92,
      reviewNotes: '음식이 선명하게 보임',
    }, current)).toEqual({
      ok: true,
      value: {
        reviewStatus: 'approved',
        kind: 'dish',
        hasPerson: 0,
        quality: 0.92,
        reviewNotes: '음식이 선명하게 보임',
      },
    });
  });

  it('rejects unsupported status, kind, person values and quality ranges', () => {
    expect(parsePhotoReviewUpdate({ reviewStatus: 'deleted' }, current).ok).toBe(false);
    expect(parsePhotoReviewUpdate({ kind: 'portrait' }, current).ok).toBe(false);
    expect(parsePhotoReviewUpdate({ hasPerson: 1 }, current).ok).toBe(false);
    expect(parsePhotoReviewUpdate({ quality: 1.1 }, current).ok).toBe(false);
  });

  it('escapes wildcard characters used by the D1 LIKE filter', () => {
    expect(escapePhotoSearchTerm('50%_cafe\\')).toBe('50\\%\\_cafe\\\\');
  });
});
