import { courses as sharedCourses } from '@lunchie-munchie/shared';
import type { Course } from '@/types/course';

export function toMobileCourse(course: (typeof sharedCourses)[number]): Course {
  return {
    id: course.id,
    authorHandle: `@${course.authorId}`,
    authorBadge: course.category,
    followerCount: `${Math.max(1, Math.round(course.likesCount / 100))}k`,
    title: course.title,
    hashtags: course.hashtags,
    distanceKm: course.totalDistance,
    durationHours: Math.max(0.5, Math.round((course.totalDuration / 60) * 10) / 10),
    saveCount: course.savesCount,
    places: course.places.map((place) => ({
      id: place.id,
      name: place.name,
      rating: 4.5,
      distance: `${Math.max(120, Math.round(course.totalDistance * 1000 / course.places.length))}m`,
      category: place.category,
      priceLevel: 2,
      coords: place.coords,
    })),
  };
}

export const MOCK_COURSES: Course[] = sharedCourses.map(toMobileCourse);
export const MOCK_COURSE: Course = MOCK_COURSES[0];
