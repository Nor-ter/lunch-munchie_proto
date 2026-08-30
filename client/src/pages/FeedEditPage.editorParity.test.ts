import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const editSource = readFileSync(join(import.meta.dirname, 'FeedEditPage.tsx'), 'utf8');
const createSource = readFileSync(join(import.meta.dirname, 'course', 'CoursemapCreatePage.tsx'), 'utf8');

describe('Munchie feed story editor parity', () => {
  it('uses the same per-slide photo, crop, and overlay tools for create and edit', () => {
    expect(createSource).toContain('export function StoryPhotoStep');
    expect(createSource).toContain('export function PhotoEditorModal');
    expect(editSource).toContain('<StoryPhotoStep');
    expect(editSource).toContain('<FeedStoryEditor');
    expect(editSource).toContain('<PhotoEditorModal');
    expect(editSource).not.toContain('<DecorateStep');
  });

  it('loads the canonical direct-detail record instead of relying on the bounded feed cache', () => {
    expect(editSource).toContain('fetchFeedDetailById(id)');
    expect(editSource).toContain('savedCourseRecordFromApi({');
    expect(editSource).toContain('const record = remoteRecord ?? cachedRecord');
    expect(editSource).not.toContain('getCoursemapDecor(');
    expect(editSource).not.toContain('fromFeedPhotoPlacements(');
  });

  it('persists photo ordering, per-photo attribution, and story overlays atomically', () => {
    expect(editSource).toContain('feedPhotos: serverPhotos');
    expect(editSource).toContain('feedDecor: serverPlaced');
    expect(editSource).toContain('storySlides: serverStorySlides');
    expect(editSource).toContain('photoAttributions: serverAttributions');
    expect(editSource).toContain('originalSrc: src');
  });

  it('adopts the normalized PATCH response before synchronizing every feed surface', () => {
    expect(editSource).toContain('payload.storySlides ?? serverStorySlides');
    expect(editSource).toContain('payload.photoAttributions ?? serverAttributions');
    expect(editSource).toContain('updateFeedPost(post.id');
    expect(editSource).toContain('await refreshFeedPosts()');
  });

  it('never offers restaurant catalogue covers as editable author story media', () => {
    expect(editSource).toContain('Array.from(new Set(post.photos))');
    expect(editSource).not.toContain('course.heroImage');
  });
});
