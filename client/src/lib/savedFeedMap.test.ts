import { describe, expect, it } from 'vitest';
import type { Course, FeedPost, Restaurant } from '@/contexts/AppContext';
import { buildSavedFeedMapPoints, groupSavedFeedMapPointsByCourse } from './savedFeedMap';

const post: FeedPost = {
  id: 'feed-1',
  authorId: 'user-1',
  authorName: '지민',
  authorEmoji: '😊',
  courseId: 'course-1',
  photos: [],
  caption: '성수동 저장 피드',
  skinId: 'default',
  likes: 3,
  saves: 1,
  comments: [],
  createdAt: '2026-07-23T00:00:00.000Z',
  tags: ['카페'],
};

const course: Course = {
  id: 'course-1',
  title: '성수 코스',
  description: '',
  heroImage: '',
  tags: ['카페'],
  hashtags: [],
  region: '성수',
  metadata: { distance: 1, duration: 60, placeCount: 2 },
  stops: [
    { placeId: 'restaurant-2', order: 2, startTime: '', endTime: '', isBookmarked: false },
    { placeId: 'restaurant-1', order: 1, startTime: '', endTime: '', isBookmarked: false },
  ],
  createdAt: '2026-07-23',
  isPublic: true,
  creatorId: 'user-1',
  savedCount: 1,
};

function restaurant(id: string, name: string, lat: number, lng: number): Restaurant {
  return {
    id,
    name,
    category: '카페',
    tags: ['카페'],
    rating: 4.8,
    reviewCount: 10,
    distance: '100m',
    address: `서울 ${name}`,
    image: `${id}.jpg`,
    lat,
    lng,
    priceRange: 2,
    openHours: '',
    dietary: [],
    description: '',
  };
}

describe('saved feed map adapter', () => {
  it('maps feed course stops to stable restaurant coordinates in course order', () => {
    const restaurants = [
      restaurant('restaurant-1', '첫 카페', 37.1, 127.1),
      restaurant('restaurant-2', '두 번째 카페', 37.2, 127.2),
    ];

    const points = buildSavedFeedMapPoints({
      posts: [post],
      getCourseById: (id) => id === course.id ? course : undefined,
      getRestaurantById: (id) => restaurants.find((item) => item.id === id),
    });

    expect(points.map((point) => point.restaurantId)).toEqual(['restaurant-1', 'restaurant-2']);
    expect(points[0]).toMatchObject({
      id: 'feed-1:restaurant-1',
      feedId: 'feed-1',
      courseId: 'course-1',
      latitude: 37.1,
      longitude: 127.1,
      expectedStopCount: 2,
    });
  });

  it('ignores locations that are missing until the DB provides valid coordinates', () => {
    const points = buildSavedFeedMapPoints({
      posts: [post],
      getCourseById: () => course,
      getRestaurantById: () => undefined,
    });

    expect(points).toEqual([]);
  });

  it('rejects the legacy 0,0 placeholder instead of mapping it as a real stop', () => {
    const points = buildSavedFeedMapPoints({
      posts: [post],
      getCourseById: () => course,
      getRestaurantById: (id) => restaurant(id, '좌표 없는 식당', 0, 0),
    });

    expect(points).toEqual([]);
  });

  it('marks a course route incomplete when only part of its expected stops can be mapped', () => {
    const points = buildSavedFeedMapPoints({
      posts: [post],
      getCourseById: () => course,
      getRestaurantById: (id) => id === 'restaurant-1'
        ? restaurant('restaurant-1', '첫 카페', 37.1, 127.1)
        : undefined,
    });

    const groups = groupSavedFeedMapPointsByCourse(points);

    expect(points).toHaveLength(1);
    expect(points[0]?.expectedStopCount).toBe(2);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      expectedStopCount: 2,
      routeComplete: false,
    });
  });

  it('groups each saved course at the average position while preserving its ordered places', () => {
    const restaurants = [
      restaurant('restaurant-1', '첫 카페', 37.1, 127.1),
      restaurant('restaurant-2', '두 번째 카페', 37.3, 127.5),
    ];
    const points = buildSavedFeedMapPoints({
      posts: [post],
      getCourseById: () => course,
      getRestaurantById: (id) => restaurants.find((item) => item.id === id),
    });

    const groups = groupSavedFeedMapPointsByCourse(points);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      id: 'feed-1',
      feedId: 'feed-1',
      courseId: 'course-1',
      latitude: 37.2,
      longitude: 127.3,
      expectedStopCount: 2,
      routeComplete: true,
    });
    expect(groups[0]?.points.map((point) => point.restaurantId)).toEqual([
      'restaurant-1',
      'restaurant-2',
    ]);
  });
});
