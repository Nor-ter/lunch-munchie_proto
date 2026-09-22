import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  MAX_FEED_STORY_OVERLAYS,
  MAX_FEED_STORY_TEXT_LENGTH,
  type FeedStoryOverlay,
  type FeedStorySlide,
} from '@/lib/feedStory';
import FeedStoryEditor, {
  addFeedStoryOverlay,
  clampFeedStoryOverlay,
  createFeedStoryEditorOverlay,
  removeFeedStoryOverlay,
  updateFeedStoryOverlay,
} from './FeedStoryEditor';

const overlay = (id: string, text = id): FeedStoryOverlay => ({
  id,
  kind: 'text',
  text,
  x: 50,
  y: 50,
  width: 60,
  tone: 'dark',
  size: 'md',
  align: 'center',
});

const slides = (): FeedStorySlide[] => [
  { id: 'slide-a', photo: '/photos/uploads/author/a.jpg', overlays: [overlay('overlay-a', '첫 사진 정보')] },
  { id: 'slide-b', photo: '/photos/uploads/author/b.jpg', overlays: [overlay('overlay-b', '둘째 사진 정보')] },
];

describe('FeedStoryEditor helpers', () => {
  it('creates only structured preset overlays without accepting HTML, CSS, or URLs', () => {
    const created = createFeedStoryEditorOverlay(
      'restaurant_name',
      [{ id: 'restaurant-1', name: '담소식당' }],
      0,
      'overlay-new',
    );

    expect(created).toEqual(expect.objectContaining({
      id: 'overlay-new',
      kind: 'restaurant_name',
      restaurantId: 'restaurant-1',
      text: '담소식당',
      tone: 'light',
      size: 'sm',
      align: 'center',
      x: 70,
      y: 13,
      width: 38,
    }));
    expect(created).not.toHaveProperty('html');
    expect(created).not.toHaveProperty('css');
    expect(created).not.toHaveProperty('url');
  });

  it('keeps overlay changes isolated to the selected slide and enforces the model limit', () => {
    const original = slides();
    const added = addFeedStoryOverlay(original, 'slide-b', overlay('overlay-new'));

    expect(added[0]).toBe(original[0]);
    expect(added[0]?.overlays.map(item => item.id)).toEqual(['overlay-a']);
    expect(added[1]?.overlays.map(item => item.id)).toEqual(['overlay-b', 'overlay-new']);

    const fullSlides: FeedStorySlide[] = [{
      id: 'full',
      photo: '/photos/uploads/author/full.jpg',
      overlays: Array.from({ length: MAX_FEED_STORY_OVERLAYS }, (_, index) => overlay(`overlay-${index}`)),
    }];
    const rejected = addFeedStoryOverlay(fullSlides, 'full', overlay('overflow'));
    expect(rejected[0]?.overlays).toHaveLength(MAX_FEED_STORY_OVERLAYS);
    expect(rejected[0]).toBe(fullSlides[0]);
  });

  it('clamps drag positions and text length while preserving the selected element identity', () => {
    const source = overlay('moving');
    const clamped = clampFeedStoryOverlay(source, {
      x: 400,
      y: -50,
      width: 200,
      text: `문구\u0000${'가'.repeat(MAX_FEED_STORY_TEXT_LENGTH + 10)}`,
    });

    expect(clamped.id).toBe('moving');
    expect(clamped.width).toBe(92);
    expect(clamped.x).toBe(54);
    expect(clamped.y).toBe(10);
    expect(clamped.text).not.toContain('\u0000');
    expect(clamped.text).toHaveLength(MAX_FEED_STORY_TEXT_LENGTH);
  });

  it('updates and removes only one slide overlay immutably', () => {
    const original = slides();
    const updated = updateFeedStoryOverlay(original, 'slide-a', 'overlay-a', { tone: 'accent', align: 'left' });
    expect(updated[0]?.overlays[0]).toEqual(expect.objectContaining({ tone: 'accent', align: 'left' }));
    expect(updated[1]).toBe(original[1]);

    const removed = removeFeedStoryOverlay(updated, 'slide-a', 'overlay-a');
    expect(removed[0]?.overlays).toEqual([]);
    expect(removed[1]?.overlays).toEqual(original[1]?.overlays);
  });
});

describe('FeedStoryEditor markup', () => {
  it('renders one active slide with accessible navigation, thumbnails, and every overlay preset', () => {
    const html = renderToStaticMarkup(
      <FeedStoryEditor
        slides={slides()}
        onChange={vi.fn()}
        stops={[
          { placeId: 'restaurant-2', order: 2 },
          { placeId: 'restaurant-1', order: 1 },
        ]}
        restaurants={[
          { id: 'restaurant-1', name: '첫 식당' },
          { id: 'restaurant-2', name: '둘째 식당' },
        ]}
      />,
    );

    expect(html).toContain("aria-label=\"Photo editor\"");
    expect(html).toContain("aria-label=\"Previous photo\"");
    expect(html).toContain("aria-label=\"Next photo\"");
    expect(html).toContain("aria-roledescription=\"Edit slide\"");
    expect(html).toContain('data-story-ratio="4:5"');
    expect(html).toContain('aspect-[4/5]');
    expect(html).toContain('data-overlay-size="md"');
    expect(html).toContain("aria-label=\"Photo 1 of 2\"");
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('src="/photos/uploads/author/a.jpg"');
    expect(html).toContain('첫 사진 정보');
    expect(html).not.toContain('둘째 사진 정보');
    expect(html).toContain('Editing photo 1 only');
    expect(html).toContain('Select photo 1');
    expect(html).toContain('Select photo 2');
    for (const label of ['Course Map', 'Dish name', 'Restaurant name', 'Price', 'Caption', 'Text']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('h-11 w-11');
    expect(html).toContain("Style");
    expect(html).toContain("Simple");
    expect(html).toContain("Translucent");
    expect(html).toContain("Position");
    expect(html).toContain('Place at Top left');
    expect(html).toContain('Place at Centre');
    expect(html).toContain('Place at Bottom right');
    expect(html).toContain('Changes apply to this photo only.');
    expect(html).not.toContain('type="file"');
    expect(html).not.toContain('dangerouslySetInnerHTML');
  });

  it('renders an explicit empty state rather than an upload control', () => {
    const html = renderToStaticMarkup(
      <FeedStoryEditor slides={[]} onChange={vi.fn()} />,
    );

    expect(html).toContain("No photos to edit");
    expect(html).toContain("Add a photo to get started.");
    expect(html).not.toContain("Upload photo");
    expect(html).not.toContain('type="file"');
  });
});
