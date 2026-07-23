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

  it('renders the linked feed like and share counts in course metadata', () => {
    expect(source).toContain('좋아요 ${orphanPost?.likes ?? 0}개');
    expect(source).toContain('{orphanPost?.likes ?? 0}');
    expect(source).toContain('공유 ${orphanPost?.shares ?? 0}회');
    expect(source).toContain('{orphanPost?.shares ?? 0}');
  });

  it('shows the author level, a pin-only spot count, and the working follow control', () => {
    expect(source).not.toContain('Munchie creator');
    expect(source).toContain('작성자 레벨 Lv.');
    expect(source).toContain('aria-label={`스팟 ${places.length}개`}');
    expect(source).toContain('<MapPin size={14}');
    expect(source).toContain('<FollowButton userId={authorId} />');
  });
});
