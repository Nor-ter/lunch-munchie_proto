import { describe, expect, it } from 'vitest';
import { resolveCourseDetailBackPath, shouldShowSavedCopyEdit } from './CourseDetailPage';

describe('CourseDetailPage back navigation', () => {
  it('returns legacy template-detail feed entries to the template list', () => {
    expect(resolveCourseDetailBackPath('template-detail', 'feed')).toBe('/templates');
    expect(resolveCourseDetailBackPath('template-detail', null)).toBe('/templates');
  });

  it('returns saved and profile template entries to their originating lists', () => {
    expect(resolveCourseDetailBackPath('template-detail', 'saved')).toBe('/saved');
    expect(resolveCourseDetailBackPath('template-detail', 'profile')).toBe('/profile');
  });

  it('returns saved feed course entries to the exact feed detail', () => {
    expect(resolveCourseDetailBackPath('saved', null, 'f2')).toBe('/feed/f2?from=saved');
    expect(resolveCourseDetailBackPath('saved', null, 'f2', 'map'))
      .toBe('/feed/f2?from=saved&savedView=map');
    expect(resolveCourseDetailBackPath('saved', null)).toBe('/saved');
  });

  it('preserves existing back paths for non-template entries', () => {
    expect(resolveCourseDetailBackPath('feed', null)).toBe('/saved');
    expect(resolveCourseDetailBackPath('explore', null)).toBe('/explore/places');
  });

  it('shows copy-to-edit only for courses opened from saved feed details', () => {
    expect(shouldShowSavedCopyEdit('saved')).toBe(true);
    expect(shouldShowSavedCopyEdit('feed')).toBe(false);
    expect(shouldShowSavedCopyEdit('template-detail')).toBe(false);
  });
});
