import type { Course } from '@/types/course';
import { COURSE_COLOR_PALETTE } from '@/constants/courseTheme';

const STOP_COLORS = COURSE_COLOR_PALETTE.map((color) => color.base);

/** 성수동 맛집 투어 — c1 share page showcase data */
export const COURSE_C1: Course = {
  id: 'c1',
  authorHandle: 'whale_jenny',
  authorBadge: 'WHALE',
  followerCount: '12.4k',
  title: 'A delicious day',
  subtitle: 'A day of delicious memories 😋',
  note: 'Lunch, coffee and a few delicious detours.',
  region: '성수동',
  date: '2024.05.18 SAT',
  weather: 'SUNNY 22°C',
  hashtags: ['lunch_to_bar', 'food_tour', '성수동'],
  distanceKm: 8.2,
  durationHours: 6.5,
  saveCount: 2450,
  places: [
    {
      id: 'place-1',
      name: '온더보더 성수점',
      rating: 4.7,
      distance: '0km',
      category: 'Mexican',
      label: 'Lunch',
      time: '12:30',
      caption: 'Delicious tacos and fajitas!',
      color: STOP_COLORS[0],
      priceLevel: 2,
      imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=200&q=80',
      coords: { x: 24, y: 68 },
    },
    {
      id: 'place-2',
      name: '어니언 성수',
      rating: 4.9,
      distance: '0.8km',
      category: 'Bakery',
      label: 'Café',
      time: '14:00',
      caption: 'The salt bread is a must!',
      color: STOP_COLORS[1],
      priceLevel: 2,
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&q=80',
      coords: { x: 42, y: 52 },
    },
    {
      id: 'place-3',
      name: '대림창고',
      rating: 4.7,
      distance: '1.2km',
      category: 'Brunch',
      label: 'Brunch',
      time: '16:00',
      caption: 'Brunch with warehouse vibes',
      color: STOP_COLORS[2],
      priceLevel: 3,
      imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&q=80',
      coords: { x: 58, y: 38 },
    },
  ],
};

export const MOCK_COURSE: Course = {
  id: 'demo-1',
  authorHandle: 'whale_jenny',
  authorBadge: 'WHALE',
  followerCount: '12.4k',
  title: 'A date in Yeonnam',
  hashtags: ['Date', '연남동', 'café_tour'],
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
      coords: { x: 25, y: 35 },
    },
    {
      id: 'place-2',
      name: 'Burger Index',
      rating: 4.4,
      distance: '240m',
      category: 'American',
      priceLevel: 2,
      coords: { x: 58, y: 15 },
    },
    {
      id: 'place-3',
      name: 'Ssang-mun Pho',
      rating: 4.7,
      distance: '180m',
      category: 'Vietnamese',
      priceLevel: 1,
      coords: { x: 75, y: 48 },
    },
  ],
};

export function getCourseById(id?: string): Course {
  if (id === 'c1') return COURSE_C1;
  return MOCK_COURSE;
}
