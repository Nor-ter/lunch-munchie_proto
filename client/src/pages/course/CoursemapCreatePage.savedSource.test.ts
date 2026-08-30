import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'CoursemapCreatePage.tsx'), 'utf8');

describe('CoursemapCreatePage saved course source', () => {
  it('hydrates a journal draft from the account-scoped saved course snapshot', () => {
    expect(source).toContain('savedCourseRecords.find(record => record.courseId === sourceCourseId)');
    expect(source).toContain('getCourseById(sourceCourseId) ?? sourceSavedRecord?.course');
    expect(source).toContain('sourceSavedRecord?.restaurants.find(item => item.id === stop.placeId)');
  });

  it('publishes source lineage with a stable idempotency key', () => {
    expect(source).toContain("'Idempotency-Key': publishIdempotencyKeyRef.current");
    expect(source).toContain('...(sourceCourseId ? { sourceCourseId } : {})');
  });
});
