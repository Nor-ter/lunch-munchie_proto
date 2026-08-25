import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'AppContext.tsx'), 'utf8');

describe('feed deletion cache safety', () => {
  it('treats the first D1 feed page as canonical instead of merging stale local posts', () => {
    expect(source).toContain('setFeedPosts(remoteFeeds)');
    expect(source).not.toContain('if (Array.isArray(initialFeedItems) && initialFeedItems.length > 0)');
  });

  it('does not let an in-flight response restore a confirmed deleted course', () => {
    expect(source).toContain('const deletedCourseIdsRef = useRef(new Set<string>())');
    expect(source).toContain('deletedCourseIdsRef.current.add(courseId)');
    expect(source).toContain('.filter(post => !deletedCourseIdsRef.current.has(post.courseId))');
  });
});
