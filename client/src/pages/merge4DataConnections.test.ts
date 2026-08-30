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

  it('uses the authenticated server collection as the canonical Saved course list', () => {
    const savedSource = readClientSource('SavedPage.tsx');
    const contextSource = readClientSource('../contexts/AppContext.tsx');
    const apiSource = readClientSource('../services/savedCoursesApi.ts');
    expect(contextSource).toContain('const response = await fetchSavedCourses()');
    expect(contextSource).toContain('setSavedCourseRecords(records)');
    expect(apiSource).toContain('"/api/saved-courses"');
    expect(apiSource).toContain('credentials: "same-origin"');
    expect(savedSource).toContain('savedCourseRecords');
    expect(savedSource).toContain('저장한 코스를 한곳에 모았어요');
    expect(savedSource).not.toContain("localStorage.getItem('lm_saved')");
    expect(savedSource).not.toContain('Munchie 먼치픽');
    expect(savedSource).not.toContain('Lunchie 런치픽');
  });

  it('renders canonical feed media without substituting course covers', () => {
    const artworkSource = readClientSource('../components/munchie/FoodHeroCourseOverlay.tsx');
    const cardSource = readClientSource('../components/munchie/UnifiedMunchieCard.tsx');
    expect(artworkSource).toContain('getAuthorPhotoSources');
    expect(artworkSource).toContain("data-state={activeSlide && !slideFailed ? 'photo' : 'empty'}");
    expect(artworkSource).toContain('작성자가 등록한 음식 사진이 없어요');
    expect(artworkSource).toContain('다른 사진으로 자동 대체하지 않아요');
    expect(cardSource).toContain('photos={post.missingOriginalMedia ? [] : post.photos}');
    expect(cardSource).toContain('slides={post.storySlides}');
    expect(cardSource).not.toContain('photoSources={post.photos}');
  });

  it('waits for template data, authenticates saves, and keeps profile removal as a local archive', () => {
    const source = readClientSource('TemplateDetailPage.tsx');
    expect(source).toContain('&& isLoading');
    expect(source).toContain('startGoogleAuth(window.location.pathname + window.location.search)');
    expect(source).toContain('const succeeded = isSaved');
    expect(source).toContain('? await unsaveCourse(course.id)');
    expect(source).toContain(': await saveCourse(course.id)');
    expect(source).toContain('deleteProfileTemplate(course.id)');
    expect(source).toContain('archiveTemplate');
    expect(source).not.toContain("method: 'DELETE'");
  });
});
