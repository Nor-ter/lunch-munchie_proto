import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'UnifiedMunchieCard.tsx'), 'utf8');

describe('UnifiedMunchieCard feed flow', () => {
  it('renders only the author-upload food hero and course overlay in the feed body', () => {
    expect(source).toContain("import FoodHeroCourseOverlay");
    expect(source).toContain('<FoodHeroCourseOverlay');
    expect(source).toContain('photos={post.missingOriginalMedia ? [] : post.photos}');
    expect(source).toContain('slides={post.storySlides}');
    expect(source).toContain('photoRestaurantIds={photoRestaurantIds}');
    expect(source).toContain('feedStoryRestaurantIdsForPhotos(post.photos, post.photoAttributions)');
    expect(source).toContain('stops={foodHeroStops}');
    expect(source).not.toContain('<TemplateArtwork');
    expect(source).not.toContain('photoSources={post.photos}');
    expect(source).not.toContain('<button type="button" onClick={() => go(compactDetailPath)}');
    expect(source).toContain('onActivate={() => go(compactDetailPath)}');
  });

  it('saves an unliked feed reaction to the server when its food hero is double-tapped', () => {
    expect(source).toContain('const lastArtworkTapAtRef = useRef(0)');
    expect(source).toContain('onPointerUp={handleArtworkPointerUp}');
    expect(source).toContain('onPointerDown={handleArtworkPointerDown}');
    expect(source).toContain('Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 8');
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

  it('uses the same food-first course summary in compact Home and Profile cards', () => {
    expect(source).toContain('compactDetailPath');
    expect(source).toContain('caption={post.caption}');
    expect(source).toMatch(/compact\s+eager\s+onActivate/);
    expect(source).not.toContain('compact-one-line-review');
  });

  it('retains the canonical post title when an older course is outside the bounded catalogue', () => {
    expect(source).toContain("title: post.title ?? ''");
  });

  it('uses the author profile photo in place of the emoji when available', () => {
    expect(source).toContain('function FeedAuthorAvatar');
    expect(source).toContain("import { AuthorAvatar } from '@/components/ui/AuthorAvatar'");
    expect(source).toContain('image={post.authorImage}');
    expect(source).toContain('emoji={post.authorEmoji}');
  });

  it('uses the source compact identity styling and native feed sharing action', () => {
    expect(source).toContain('<FeedAuthorAvatar post={post} className="flex h-full w-full items-center justify-center" />');
    expect(source).toContain('text-[10px] font-semibold');
    expect(source).toContain('const shareFeedPost = async () =>');
    expect(source).toContain('void shareFeedPost()');
    expect(source).not.toContain('/share?post=');
  });

  it('requires login before mutating saved state and preserves the OAuth return path', () => {
    expect(source).toContain('if (!interactive || !requireLogin()) return;');
    expect(source).toContain('? await unsaveCourse(course.id)');
    expect(source).toContain(': await saveCourse(course.id)');
    expect(source).toContain('if (!succeeded)');
    expect(source).toContain('startGoogleAuth(window.location.pathname + window.location.search)');
  });

  it('does not present unverified distance or duration as course facts', () => {
    expect(source).not.toContain('distanceKm={course.metadata.distance}');
    expect(source).not.toContain('durationMinutes={course.metadata.duration}');
  });
});
