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
    expect(savedSource).toContain('setPendingUnsaveCourseId(record.courseId)');
    expect(savedSource).toContain('저장을 취소할까요?');
    expect(savedSource).toContain('confirmUnsave');
  });

  it('presents every saved item as a course without restaurant/course filters', () => {
    expect(savedSource).toContain('저장한 코스를 한곳에 모았어요');
    expect(savedSource).toContain('{savedCourseRecords.length}개');
    expect(savedSource).toContain('visibleRecords.map(record =>');
    expect(savedSource).toContain('savedCourseRecords');
    expect(savedSource).not.toContain("localStorage.getItem('lm_saved')");
    expect(savedSource).not.toContain('aria-label="저장 항목 필터"');
    expect(savedSource).not.toContain('SavedFilter');
    expect(savedSource).not.toContain('Munchie 먼치픽');
    expect(savedSource).not.toContain('Lunchie 런치픽');
    expect(savedSource).not.toContain('getSavedTabFromSearch');
  });

  it('uses the canonical stop count and exposes missing place data honestly', () => {
    expect(savedSource).toContain('return stops?.length ?? 0');
    expect(savedSource).toContain('const placeCount = getCoursePlaceCount(record.course.stops)');
    expect(savedSource).toContain('`${placeCount}곳 코스`');
    expect(savedSource).toContain("'장소 정보 없음'");
    expect(savedSource).not.toContain("'restaurant' ? '식당' : '코스'");
  });

  it('requests location only for explicit nearby sorting and labels straight-line distance honestly', () => {
    expect(savedSource).toContain('onClick={requestNearbySort}');
    expect(savedSource).toContain('navigator.geolocation.getCurrentPosition');
    expect(savedSource).toContain('첫 장소까지 직선거리');
    expect(savedSource).not.toContain('도보거리');
  });
});
