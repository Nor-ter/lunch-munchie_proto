import { describe, expect, it } from 'vitest';
import {
  buildDefaultFeedStorySlides,
  feedStoryRestaurantIdsForPhotos,
  MAX_FEED_STORY_OVERLAYS,
  MAX_FEED_STORY_SLIDES,
  MAX_FEED_STORY_TEXT_LENGTH,
  normalizeFeedStorySlides,
  resolveFeedStorySlides,
  setFeedStorySlideRestaurant,
} from './feedStory';

describe('feed story model', () => {
  it('bounds slide and overlay counts and clamps presentation geometry', () => {
    const slides = normalizeFeedStorySlides(Array.from({ length: 8 }, (_, slideIndex) => ({
      id: `story-${slideIndex}`,
      photo: `/photos/uploads/author/photo-${slideIndex}.jpg`,
      overlays: Array.from({ length: 8 }, (_, overlayIndex) => ({
        id: `overlay-${overlayIndex}`,
        kind: 'text',
        text: 'x'.repeat(MAX_FEED_STORY_TEXT_LENGTH + 40),
        x: -20,
        y: 140,
        width: 2,
        tone: 'not-a-tone',
        size: 'not-a-size',
        align: 'not-an-align',
      })),
    })));

    expect(slides).toHaveLength(MAX_FEED_STORY_SLIDES);
    expect(slides[0]?.overlays).toHaveLength(MAX_FEED_STORY_OVERLAYS);
    expect(slides[0]?.overlays[0]).toMatchObject({
      x: 0,
      y: 100,
      width: 10,
      tone: 'light',
      size: 'md',
      align: 'left',
    });
    expect(slides[0]?.overlays[0]?.text).toHaveLength(MAX_FEED_STORY_TEXT_LENGTH);
  });

  it('allows only canonical photos, known kinds and preset presentation values', () => {
    const slides = normalizeFeedStorySlides([
      {
        photo: '/photos/uploads/author/allowed.jpg',
        overlays: [
          { kind: 'restaurant_name', restaurantId: 'restaurant-1', x: 50, y: 70, width: 80, tone: 'accent', size: 'lg', align: 'center' },
          { kind: 'script', text: '<script>alert(1)</script>' },
          { kind: 'price', text: '' },
          { kind: 'course_map' },
        ],
      },
      { photo: '/photos/uploads/other/not-allowed.jpg', overlays: [] },
    ], { allowedPhotos: ['/photos/uploads/author/allowed.jpg'] });

    expect(slides).toHaveLength(1);
    expect(slides[0]?.overlays).toEqual([
      expect.objectContaining({ kind: 'restaurant_name', restaurantId: 'restaurant-1', tone: 'accent', size: 'lg', align: 'center' }),
      expect.objectContaining({ kind: 'course_map' }),
    ]);
  });

  it('repairs duplicate slide and overlay ids so one edit target cannot alias another', () => {
    const repeatedOverlay = {
      id: 'same-overlay',
      kind: 'text',
      text: '정보',
      x: 50,
      y: 50,
      width: 60,
      tone: 'dark',
      size: 'md',
      align: 'center',
    };
    const slides = normalizeFeedStorySlides([
      {
        id: 'same-slide',
        photo: '/photos/uploads/author/a.jpg',
        overlays: [repeatedOverlay, { ...repeatedOverlay, text: '두 번째 정보' }],
      },
      {
        id: 'same-slide',
        photo: '/photos/uploads/author/b.jpg',
        overlays: [repeatedOverlay],
      },
    ]);

    expect(new Set(slides.map(slide => slide.id)).size).toBe(2);
    expect(new Set(slides[0]?.overlays.map(overlay => overlay.id)).size).toBe(2);
    const allOverlayIds = slides.flatMap(slide => slide.overlays.map(overlay => overlay.id));
    expect(new Set(allOverlayIds).size).toBe(allOverlayIds.length);
  });

  it('deduplicates photos and builds photo-specific defaults for legacy posts', () => {
    const slides = buildDefaultFeedStorySlides([
      '/photos/uploads/author/a.jpg',
      '/photos/uploads/author/a.jpg',
      '/photos/uploads/author/b.jpg',
    ], {
      title: '저녁 코스',
      caption: '두 곳 모두 좋았어요',
      stops: [
        { id: 'a', name: '첫 번째 식당', category: '한식' },
        { id: 'b', name: '두 번째 식당', category: '카페' },
      ],
    });

    expect(slides).toHaveLength(2);
    expect(slides[0]?.overlays).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'course_map' }),
      expect.objectContaining({ kind: 'restaurant_name', text: '첫 번째 식당', restaurantId: 'a' }),
      expect.objectContaining({ kind: 'review', text: '두 곳 모두 좋았어요' }),
    ]));
    expect(slides[1]?.overlays).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'restaurant_name', text: '두 번째 식당', restaurantId: 'b' }),
    ]));
  });

  it('uses explicit photo attribution before photo index when choosing restaurant overlays', () => {
    const slides = buildDefaultFeedStorySlides([
      '/photos/uploads/author/cafe.jpg',
      '/photos/uploads/author/meal.jpg',
    ], {
      stops: [
        { id: 'meal', name: '점심 식당', category: '한식' },
        { id: 'cafe', name: '후식 카페', category: '카페' },
      ],
      photoRestaurantIds: ['cafe', 'meal'],
    });

    expect(slides[0]?.overlays).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'restaurant_name', text: '후식 카페', restaurantId: 'cafe' }),
    ]));
    expect(slides[1]?.overlays).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'restaurant_name', text: '점심 식당', restaurantId: 'meal' }),
    ]));
  });

  it('does not guess a restaurant by photo index when explicit attribution is missing', () => {
    const [slide] = buildDefaultFeedStorySlides([
      '/photos/uploads/author/unclassified.jpg',
    ], {
      title: '저녁 코스',
      stops: [
        { id: 'meal', name: '점심 식당', category: '한식' },
        { id: 'cafe', name: '후식 카페', category: '카페' },
      ],
      photoRestaurantIds: [undefined],
    });

    expect(slide?.overlays).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'restaurant_name', text: '저녁 코스' }),
    ]));
    expect(slide?.overlays).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'restaurant_name', restaurantId: 'meal' }),
    ]));
    expect(slide?.overlays).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'restaurant_name', restaurantId: 'cafe' }),
    ]));
  });

  it('does not assign a one-stop restaurant to a photo explicitly classified as other', () => {
    const [slide] = buildDefaultFeedStorySlides([
      '/photos/uploads/author/receipt.jpg',
    ], {
      title: '저녁 기록',
      stops: [{ id: 'meal', name: '점심 식당', category: '한식' }],
      photoRestaurantIds: [undefined],
    });

    expect(slide?.overlays).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'restaurant_name', text: '저녁 기록' }),
    ]));
    expect(slide?.overlays).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'restaurant_name', restaurantId: 'meal' }),
    ]));
  });

  it('matches restaurant attribution by canonical photo path and never guesses other photos', () => {
    expect(feedStoryRestaurantIdsForPhotos([
      '/photos/uploads/author/cafe.jpg',
      '/photos/uploads/author/meal.jpg',
      '/photos/uploads/author/other.jpg',
    ], [
      {
        r2Path: '/photos/uploads/author/meal.jpg',
        classification: 'restaurant',
        restaurantId: 'meal',
        source: 'user_selected',
      },
      {
        r2Path: '/photos/uploads/author/cafe.jpg',
        classification: 'restaurant',
        restaurantId: 'cafe',
        source: 'gps_suggestion',
      },
      {
        r2Path: '/photos/uploads/author/other.jpg',
        classification: 'other',
        source: 'other',
      },
    ])).toEqual(['cafe', 'meal', undefined]);
  });

  it('removes a stale restaurant label when a photo is reclassified as other', () => {
    const slide = setFeedStorySlideRestaurant({
      id: 'slide-a',
      photo: '/photos/uploads/author/a.jpg',
      overlays: [
        { id: 'restaurant', kind: 'restaurant_name', text: '이전 식당', restaurantId: 'old', x: 50, y: 70, width: 70, tone: 'dark', size: 'lg', align: 'left' },
        { id: 'review', kind: 'review', text: '한줄평', x: 50, y: 90, width: 70, tone: 'light', size: 'md', align: 'left' },
      ],
    }, null);

    expect(slide.overlays).toEqual([
      expect.objectContaining({ id: 'review', kind: 'review', text: '한줄평' }),
    ]);
  });

  it('prefers valid persisted slides and falls back to legacy photos otherwise', () => {
    const custom = resolveFeedStorySlides([
      { photo: '/photos/uploads/author/a.jpg', overlays: [{ kind: 'food_name', text: '비빔밥' }] },
    ], ['/photos/uploads/author/a.jpg'], { title: '기본 제목' });
    expect(custom[0]?.overlays[0]).toMatchObject({ kind: 'food_name', text: '비빔밥' });

    const fallback = resolveFeedStorySlides([
      { photo: '/photos/uploads/other/untrusted.jpg', overlays: [{ kind: 'text', text: '다른 사진' }] },
    ], ['/photos/uploads/author/a.jpg'], { title: '기본 제목' });
    expect(fallback[0]?.photo).toBe('/photos/uploads/author/a.jpg');
    expect(fallback[0]?.overlays).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'restaurant_name', text: '기본 제목' }),
    ]));
  });

  it('keeps customized slides while backfilling canonical photos missing from a partial story', () => {
    const slides = resolveFeedStorySlides([
      { photo: '/photos/uploads/author/b.jpg', overlays: [{ kind: 'food_name', text: '커스텀 메뉴' }] },
    ], [
      '/photos/uploads/author/a.jpg',
      '/photos/uploads/author/b.jpg',
      '/photos/uploads/author/c.jpg',
    ], { title: '기본 코스' });

    expect(slides.map(slide => slide.photo)).toEqual([
      '/photos/uploads/author/a.jpg',
      '/photos/uploads/author/b.jpg',
      '/photos/uploads/author/c.jpg',
    ]);
    expect(slides[1]?.overlays).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'food_name', text: '커스텀 메뉴' }),
    ]));
  });
});
