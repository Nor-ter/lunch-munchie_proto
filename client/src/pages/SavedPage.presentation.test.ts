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
    expect(savedSource).toContain('Remove this saved pick?');
    expect(savedSource).toContain('confirmUnsave');
  });

  it('restores the selected map course from the selectedFeed query', () => {
    expect(savedSource).toContain("get('selectedFeed')");
    expect(savedSource).toContain('selectedFeedId={selectedMapFeedId}');
    expect(savedSource).toContain('onSelectedFeedIdChange={selectSavedMapFeed}');
  });

  it('uses Food Journey as the default and keeps Saved Courses available', () => {
    expect(savedSource).toContain('getSavedTabFromSearch(search)');
    expect(savedSource).toContain("get('tab') === 'coursemaps'");
    expect(savedSource).toContain('Food Journey');
    expect(savedSource).toContain('Saved Courses');
  });

  it('lets people add or update an after-meal rating from each decision', () => {
    expect(savedSource).toContain("fetch('/api/journey-rating'");
    expect(savedSource).toContain('Tap a star to update it');
    expect(savedSource).toContain('rateJourneyStop(stop, star)');
  });
});
