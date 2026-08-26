import { describe, expect, it } from 'vitest';
import type { Course, Restaurant } from '@/contexts/AppContext';
import { getCoursePlacesFromFeedStops } from './courseMapSync';

describe('getCoursePlacesFromFeedStops', () => {
  it('builds geo-backed course places before the restaurant catalogue hydrates', () => {
    const course: Course = {
      id: 'course-1',
      title: 'Test',
      description: '',
      creatorId: 'user-1',
      tags: [],
      metadata: { duration: 60, distance: 1000, priceRange: 2 },
      stops: [
        { placeId: 'google_a', order: 1, startTime: '', endTime: '', isBookmarked: false },
        { placeId: 'google_b', order: 2, startTime: '', endTime: '', isBookmarked: false },
      ],
    };
    const getRestaurantById = () => undefined;

    expect(getCoursePlacesFromFeedStops([
      { placeId: 'google_a', latitude: -37.81, longitude: 144.96 },
      { placeId: 'google_b', latitude: -37.82, longitude: 144.97 },
    ], course, getRestaurantById)).toMatchObject([
      { id: 'google_a', latitude: -37.81, longitude: 144.96, name: '스팟 1' },
      { id: 'google_b', latitude: -37.82, longitude: 144.97, name: '스팟 2' },
    ]);
  });

  it('prefers hydrated restaurant names when the catalogue is available', () => {
    const course: Course = {
      id: 'course-1',
      title: 'Test',
      description: '',
      creatorId: 'user-1',
      tags: [],
      metadata: { duration: 60, distance: 1000, priceRange: 2 },
      stops: [{ placeId: 'google_a', order: 1, startTime: '', endTime: '', isBookmarked: false }],
    };
    const restaurant: Restaurant = {
      id: 'google_a',
      name: 'Queen Victoria Market',
      category: '마켓',
      tags: [],
      rating: 4.5,
      reviewCount: 100,
      distance: '1km',
      address: 'Queen St',
      image: '/photos/google/a.jpg',
      lat: -37.81,
      lng: 144.96,
      priceRange: 2,
      openHours: '',
      dietary: [],
      description: '',
    };

    expect(getCoursePlacesFromFeedStops([
      { placeId: 'google_a', latitude: -37.81, longitude: 144.96 },
    ], course, (id) => (id === 'google_a' ? restaurant : undefined))).toMatchObject([
      { id: 'google_a', name: 'Queen Victoria Market', latitude: -37.81, longitude: 144.96 },
    ]);
  });
});
