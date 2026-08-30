import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readClientSource = (path: string) => readFileSync(join(import.meta.dirname, path), 'utf8');

describe('merge4_v1_jp client connections', () => {
  it('persists Munchie reactions through the existing server APIs', () => {
    const source = readClientSource('../components/munchie/UnifiedMunchieCard.tsx');
    expect(source).toContain("fetch('/api/feed-comment'");
    expect(source).toContain("fetch('/api/feed-like'");
    expect(source).toContain("fetch('/api/reports'");
    expect(source).toContain('logCourseFeedImpression');
  });

  it('persists Munchie edits and new posts before updating the UI cache', () => {
    const editSource = readClientSource('FeedEditPage.tsx');
    const createSource = readClientSource('course/CoursemapCreatePage.tsx');
    expect(editSource).toContain("fetch('/api/feed-post'");
    expect(editSource).toContain("method: 'PATCH'");
    expect(createSource).toContain("fetch('/api/uploads'");
    expect(createSource).toContain("fetch('/api/courses'");
    expect(createSource).toContain('await refreshFeedPosts()');
  });

  it('uses server journey history in the unified Saved restaurant/course list', () => {
    const source = readClientSource('SavedPage.tsx');
    expect(source).toContain("fetch('/api/journey?days=30'");
    expect(source).toContain('groupJourneyByDay');
    expect(source).toContain('savedPosts.length + journeyStops.length');
    expect(source).toContain('저장한 식당과 코스를 한곳에 모았어요');
    expect(source).not.toContain('Munchie 먼치픽');
    expect(source).not.toContain('Lunchie 런치픽');
  });

  it('renders canonical feed media without substituting course covers', () => {
    const artworkSource = readClientSource('../components/munchie/TemplateArtwork.tsx');
    const cardSource = readClientSource('../components/munchie/UnifiedMunchieCard.tsx');
    expect(artworkSource).toContain('photoSources === undefined');
    expect(artworkSource).toContain('Math.max(photos.length, 1)');
    expect(cardSource).toContain('post.decor ?? embeddedDecor');
    expect(cardSource).toContain('post.missingOriginalMedia');
  });

  it('waits for template data and keeps deletion as a local archive', () => {
    const source = readClientSource('TemplateDetailPage.tsx');
    expect(source).toContain('&& isLoading');
    expect(source).toContain('deleteProfileTemplate(course.id)');
    expect(source).toContain('archiveTemplate');
    expect(source).not.toContain("method: 'DELETE'");
  });
});
