import { Course, Restaurant } from '@/contexts/AppContext';
import { CoursePlace } from '@/types/course';

export type CourseMapPoint = { x: number; y: number };

export function getOrderedCourseStops(course: Course) {
  return [...course.stops].sort((a, b) => a.order - b.order);
}

export function getCourseMapPoints(restaurants: Restaurant[]): CourseMapPoint[] {
  if (restaurants.length === 0) return [];
  if (restaurants.length === 1) return [{ x: 50, y: 50 }];

  const lats = restaurants.map((restaurant) => restaurant.lat);
  const lngs = restaurants.map((restaurant) => restaurant.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latRange = maxLat - minLat || 0.01;
  const lngRange = maxLng - minLng || 0.01;

  return restaurants.map((restaurant) => {
    const nx = (restaurant.lng - minLng) / lngRange;
    const ny = 1 - (restaurant.lat - minLat) / latRange;
    return { x: 15 + nx * 70, y: 15 + ny * 70 };
  });
}

export function getCourseRestaurants(
  course: Course,
  getRestaurantById: (id: string) => Restaurant | undefined,
) {
  return getOrderedCourseStops(course)
    .map((stop) => ({
      stop,
      restaurant: getRestaurantById(stop.placeId),
    }))
    .filter((entry): entry is { stop: Course['stops'][number]; restaurant: Restaurant } =>
      Boolean(entry.restaurant),
    );
}

export function getCoursePlacesFromStops(
  course: Course,
  getRestaurantById: (id: string) => Restaurant | undefined,
): CoursePlace[] {
  const entries = getCourseRestaurants(course, getRestaurantById);
  const points = getCourseMapPoints(entries.map((entry) => entry.restaurant));

  return entries.map(({ stop, restaurant }, index) => ({
    id: restaurant.id,
    name: restaurant.name,
    rating: restaurant.rating,
    distance: restaurant.distance,
    category: restaurant.category,
    priceLevel: restaurant.priceRange,
    time: stop.startTime,
    imageUrl: restaurant.image,
    coords: points[index] ?? { x: 50, y: 50 },
  }));
}
