import { Course, Restaurant } from '@/contexts/AppContext';
import { CoursePlace } from '@/types/course';

export type CourseMapPoint = { x: number; y: number };

export type CourseMapSegment = {
  from: CourseMapPoint;
  to: CourseMapPoint;
  path: string;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Builds the shared, road-like route geometry used by feed cards, the viewer,
 * and the editor. Stops remain fixed to their data-backed coordinates; only
 * the line between them receives a deterministic alternating bend.
 */
export function getCurvedCourseSegments(points: CourseMapPoint[]): CourseMapSegment[] {
  return points.slice(1).map((to, index) => {
    const from = points[index]!;
    const previous = points[index - 1] ?? from;
    const next = points[index + 2] ?? to;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy) || 1;
    const direction = index % 2 === 0 ? 1 : -1;
    const bend = clamp(distance * 0.2, 5, 12) * direction;
    const perpendicularX = (-dy / distance) * bend;
    const perpendicularY = (dx / distance) * bend;

    const control1 = {
      x: from.x + (to.x - previous.x) * 0.28 + perpendicularX,
      y: from.y + (to.y - previous.y) * 0.28 + perpendicularY,
    };
    const control2 = {
      x: to.x - (next.x - from.x) * 0.28 + perpendicularX,
      y: to.y - (next.y - from.y) * 0.28 + perpendicularY,
    };

    return {
      from,
      to,
      path: `M ${from.x} ${from.y} C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${to.x} ${to.y}`,
    };
  });
}

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
