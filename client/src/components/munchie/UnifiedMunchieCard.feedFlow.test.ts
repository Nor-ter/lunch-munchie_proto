import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'UnifiedMunchieCard.tsx'), 'utf8');

describe('UnifiedMunchieCard feed flow', () => {
  it('keeps the feed template artwork static instead of using it as navigation', () => {
    expect(source).toContain('data-ui="munchie-template-artwork"');
    expect(source).not.toContain('const courseDetailPath');
    expect(source).not.toContain('onClick={() => go(courseDetailPath)}');
  });

  it('saves an unliked feed reaction to the server when its template is double-tapped', () => {
    expect(source).toContain('const lastArtworkTapAtRef = useRef(0)');
    expect(source).toContain('onPointerUp={handleArtworkPointerUp}');
    expect(source).toContain('elapsed >= 60 && elapsed <= 320');
    expect(source).toContain("fetch('/api/feed-like'");
    expect(source).toContain('if (!liked) void togglePostLike()');
    expect(source).toContain('touch-manipulation');
  });

  it('preserves saved map origin when opening a course from saved feed detail', () => {
    expect(source).toContain("detailOrigin === 'saved' && savedView");
    expect(source).toContain('getSavedCourseDetailPath(course.id, post.id, savedView)');
    expect(source).toContain('onClick={() => go(courseMapPath)}');
  });

  it('places the compact Home and Profile review over the bottom of the template', () => {
    expect(source).toContain('data-ui="compact-one-line-review"');
    expect(source).toContain("homeSummary ? 'bottom-2' : 'bottom-9'");
    expect(source).toContain('!bg-[#FFF8F4]/46');
    expect(source).toContain('pointer-events-none absolute inset-x-2');
  });

  it('uses the author profile photo in place of the emoji when available', () => {
    expect(source).toContain('function FeedAuthorAvatar');
    expect(source).toContain('post.authorImage ?');
    expect(source).toContain('referrerPolicy="no-referrer"');
  });

  it('shows a translucent one-line review that gains a shaded backdrop when pressed', () => {
    expect(source).toContain('const [reviewRevealed, setReviewRevealed] = useState(false)');
    expect(source).toContain('setReviewRevealed(value => !value)');
    expect(source).toContain('aria-pressed={reviewRevealed}');
    expect(source).toContain("animate={{ opacity: reviewRevealed ? 1 : 0 }}");
    expect(source).toContain('bg-gradient-to-t from-[#241712]/85 via-[#241712]/45 to-transparent');
    expect(source).toContain('<OneLineReviewBox');
    expect(source).toContain('backdrop-blur-[1px]');
    expect(source).toContain('!bg-[#FFF8F4]/46 !text-[#3B2A23]');
    expect(source).toContain('line-clamp-1');
    expect(source).toContain('{post.caption}');
  });
});
