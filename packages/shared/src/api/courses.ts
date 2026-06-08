import { CourseFilterSchema, type Course, type CourseFilter } from '../types/domain';
import { courses } from '../data/mock';

export function filterCourses(input: Partial<CourseFilter>): Course[] {
  const filter = CourseFilterSchema.parse(input);
  const matched = courses.filter(course => {
    if (filter.region && course.region !== filter.region) return false;
    if (filter.category && course.category !== filter.category) return false;
    if (filter.maxDistanceKm && course.totalDistance > filter.maxDistanceKm) return false;
    if (filter.maxDurationMin && course.totalDuration > filter.maxDurationMin) return false;
    if (filter.tags.length > 0 && !filter.tags.every(tag => course.tags.includes(tag))) return false;
    return true;
  });

  return [...matched].sort((a, b) => {
    if (filter.sortBy === 'recent') return b.createdAt.localeCompare(a.createdAt);
    if (filter.sortBy === 'nearby') return a.totalDistance - b.totalDistance;
    if (filter.sortBy === 'mz') return Number(b.tags.includes('mz')) - Number(a.tags.includes('mz'));
    return b.likesCount - a.likesCount;
  });
}

export function getCourseById(id: string): Course | undefined {
  return courses.find(course => course.id === id);
}
