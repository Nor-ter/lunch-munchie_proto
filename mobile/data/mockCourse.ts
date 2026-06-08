import type { Course } from '@/types/course';

// Yannam-dong (연남동) area – approximate real LatLngs
export const MOCK_COURSE: Course = {
  id: 'demo-1',
  authorHandle: 'whale_jenny',
  authorBadge: 'WHALE',
  followerCount: '12.4k',
  title: '연남동 데이트 코스',
  hashtags: ['데이트', '연남동', '카페투어'],
  distanceKm: 2.1,
  durationHours: 4,
  saveCount: 1240,
  places: [
    {
      id: 'place-1',
      name: 'Mokchon Ramen',
      rating: 4.6,
      distance: '120m',
      category: 'Japanese',
      priceLevel: 2,
      coords: { lat: 37.5668, lng: 126.9238 },
    },
    {
      id: 'place-2',
      name: 'Burger Index',
      rating: 4.4,
      distance: '240m',
      category: 'American',
      priceLevel: 2,
      coords: { lat: 37.5675, lng: 126.9257 },
    },
    {
      id: 'place-3',
      name: 'Ssang-mun Pho',
      rating: 4.7,
      distance: '180m',
      category: 'Vietnamese',
      priceLevel: 1,
      coords: { lat: 37.5659, lng: 126.9264 },
    },
    {
      id: 'place-4',
      name: 'Café Monologue',
      rating: 4.5,
      distance: '300m',
      category: 'Cafe',
      priceLevel: 2,
      coords: { lat: 37.5648, lng: 126.9243 },
    },
  ],
};
