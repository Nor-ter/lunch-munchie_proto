import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const savedSource = readFileSync(join(import.meta.dirname, 'SavedPage.tsx'), 'utf8');
const cardSource = readFileSync(
  join(import.meta.dirname, '..', 'components', 'munchie', 'UnifiedMunchieCard.tsx'),
  'utf8',
);

describe('SavedPage list bookmark presentation', () => {
  it('shares the saved bookmark button design with the feed detail card', () => {
    expect(cardSource).toContain('export const SAVED_BOOKMARK_BUTTON_CLASS');
    expect(cardSource).toContain('h-10 w-10');
    expect(cardSource).toContain('rounded-xl bg-[#FFE2DF] text-[#D94E55]');
    expect(savedSource).toContain('${SAVED_BOOKMARK_BUTTON_CLASS}');
    expect(savedSource).toContain('origin-bottom-right scale-[0.8]');
    expect(savedSource).toContain('<Bookmark size={20} strokeWidth={2} fill="currentColor" />');
    expect(savedSource).not.toContain('BookmarkX');
    expect(savedSource).toContain('setPendingUnsaveCourseId(post.courseId)');
    expect(savedSource).toContain('저장을 취소할까요?');
    expect(savedSource).toContain('confirmUnsave');
  });

  it('presents every saved item as a course without restaurant/course filters', () => {
    expect(savedSource).toContain('저장한 코스를 한곳에 모았어요');
    expect(savedSource).toContain('savedPosts.length + journeyStops.length');
    expect(savedSource).toContain('{savedCourseCount}개');
    expect(savedSource).not.toContain('aria-label="저장 항목 필터"');
    expect(savedSource).not.toContain('SavedFilter');
    expect(savedSource).not.toContain('Munchie 먼치픽');
    expect(savedSource).not.toContain('Lunchie 런치픽');
    expect(savedSource).not.toContain('getSavedTabFromSearch');
  });

  it('treats one restaurant as a one-place course', () => {
    expect(savedSource).toContain('Math.max(stops?.length ?? 0, 1)');
    expect(savedSource).toContain('{getCoursePlaceCount(post.stops)}곳 코스');
    expect(savedSource).toContain('1곳 코스');
    expect(savedSource).not.toContain("'restaurant' ? '식당' : '코스'");
  });
});
