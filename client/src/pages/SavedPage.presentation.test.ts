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

  it('combines saved sources behind one restaurant and course filter', () => {
    expect(savedSource).toContain('저장한 식당과 코스를 한곳에 모았어요');
    expect(savedSource).toContain('aria-label="저장 항목 필터"');
    expect(savedSource).toContain("['restaurant', '식당', Utensils]");
    expect(savedSource).toContain("['course', '코스', MapIcon]");
    expect(savedSource).toContain('savedPosts.length + journeyStops.length');
    expect(savedSource).not.toContain('Munchie 먼치픽');
    expect(savedSource).not.toContain('Lunchie 런치픽');
    expect(savedSource).not.toContain('getSavedTabFromSearch');
  });

  it('classifies one-stop posts as restaurants and multi-stop posts as courses', () => {
    expect(savedSource).toContain("post.stops?.length === 1 ? 'restaurant' : 'course'");
    expect(savedSource).toContain("getSavedPostKind(post) === 'restaurant' ? '식당' : '코스'");
    expect(savedSource).toContain("activeFilter === 'course' ? [] : journeyStops");
  });
});
