import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'CoursemapCreatePage.tsx'), 'utf8');
const createStep = source.slice(
  source.indexOf('{step === 1 && ('),
  source.indexOf('{step === 2 && ('),
);

describe('CoursemapCreatePage story photo create flow', () => {
  it('replaces the legacy collage only in the new-post step', () => {
    expect(source).toContain('export function DecorateStep');
    expect(source).toContain('export function StoryPhotoStep');
    expect(createStep).toContain('<StoryPhotoStep');
    expect(createStep).toContain('<FeedStoryEditor');
    expect(createStep).not.toContain('<DecorateStep');
  });

  it('supports a bounded, ordered, author-uploaded slide set', () => {
    expect(source).toContain('MAX_FEED_STORY_SLIDES - placed.length');
    expect(source).toContain('type="file" accept="image/*" multiple');
    expect(source).toContain('moveStoryPhoto(current, activePhoto.id, -1)');
    expect(source).toContain('moveStoryPhoto(current, activePhoto.id, 1)');
    expect(source).toContain('aria-label="선택 사진 삭제"');
    expect(source).toContain("index === 0 ? '대표'");
    expect(source).toContain('첫 번째 사진이 피드와 저장 목록의 대표 사진');
  });

  it('enters a fixed 4:5 crop and captures restaurant or other attribution', () => {
    expect(source).toContain('cropAspect={4 / 5}');
    expect(source).toContain('aria-label="4:5 사진 자르기 및 편집"');
    expect(source).toContain('aria-label="선택 사진 식당 귀속"');
    expect(source).toContain('<option value="other">기타 사진</option>');
    expect(source).toContain("source: 'user_selected'");
    expect(source).toContain('photoRestaurantIds: storyPhotos.map');
    expect(source).toContain('onUpdateAttribution={updatePhotoAttribution}');
  });

  it('keeps primary controls at least 44px and makes them accessible', () => {
    expect(source).toContain('aria-label="사진 앞으로 이동"');
    expect(source).toContain('aria-label="사진 뒤로 이동"');
    expect(source).toContain('className="flex h-11 w-11');
    expect(source).toContain('className="mt-1.5 h-11 w-full');
  });
});
