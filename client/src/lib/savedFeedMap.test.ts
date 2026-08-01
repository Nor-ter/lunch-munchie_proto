import { describe, expect, it } from 'vitest';
import type { Course, FeedPost, Restaurant } from '@/contexts/AppContext';
import { buildSavedFeedMapPoints } from './savedFeedMap';

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
});
