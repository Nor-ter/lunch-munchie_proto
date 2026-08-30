import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'AppContext.tsx'), 'utf8');

describe('AppContext canonical account state', () => {
  it('partitions private course drafts and never hydrates feed ownership from localStorage', () => {
    expect(source).toContain('`lm_courses:${initialAuthUserId}`');
    expect(source).toContain('courseStorageKey ? localStorage.getItem(courseStorageKey) : null');
    expect(source).not.toContain("localStorage.getItem('lm_feed_v3')");
    expect(source).not.toContain("localStorage.setItem('lm_feed_v3'");
  });

  it('ignores stale saved-list responses that cross a newer mutation', () => {
    expect(source).toContain('savedCoursesRequestEpochRef');
    expect(source).toContain('savedCoursesMutationEpochRef');
    expect(source).toContain('mutationEpoch !== savedCoursesMutationEpochRef.current');
    expect(source).toContain('Any GET started');
  });

  it('keeps the last good saved list on a transient refresh failure', () => {
    expect(source).toContain('A transient GET failure must not erase the last known-good server');
    expect(source).not.toContain("catch (error) {\n      setSavedCourseIds([]);");
    expect(source).not.toContain("catch (error) {\n      setSavedCourseRecords([]);");
  });

  it('normalizes embedded stop restaurants without merging private saves into the global catalogue', () => {
    expect(source).toContain('savedRestaurantFromApi(stop.restaurant)');
    expect(source).toContain('restaurants,');
    expect(source).not.toContain('records.flatMap(record => [record.course])');
  });
});
