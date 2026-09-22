import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'CourseDetailPage.tsx'), 'utf8');

describe('CourseDetailPage feed like synchronization', () => {
  it('uses the Munchie feed post like state and action', () => {
    expect(source).toContain('likedFeedIds.includes(orphanPost.id)');
    expect(source).toContain('toggleFeedLike(orphanPost.id)');
    expect(source).toContain("aria-pressed={isCoursePostLiked}");
  });

  it('renders a thumbs-up icon instead of a heart', () => {
    expect(source).toContain('<ThumbsUp size={20}');
    expect(source).not.toContain('<Heart');
  });

  it('renders the linked feed like count without the share count', () => {
    expect(source).toContain("countLabel(orphanPost?.likes ?? 0, 'like')");
    expect(source).toContain('{orphanPost?.likes ?? 0}');
    expect(source).not.toContain('공유 ${orphanPost?.shares ?? 0}회');
    expect(source).not.toContain('{orphanPost?.shares ?? 0}');
  });

  it('shows the author level, a pin-only spot count, and the working follow control', () => {
    expect(source).toContain("const authorMeta = orphanPost ? 'Munchie creator'");
    expect(source).toContain('resolveFeedAuthorId(orphanPost)');
    expect(source).toContain("Creator level");
    expect(source).toContain("aria-label={countLabel(places.length, 'place')}");
    expect(source).toContain('<MapPin size={14}');
    expect(source).toContain('<FollowButton userId={authorId} />');
  });
});
