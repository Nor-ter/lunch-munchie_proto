import { create } from 'zustand';
import type { Course } from '@/types/course';
import { MOCK_COURSES } from '@/data/mockCourse';

interface CourseStore {
  courses: Course[];
  savedIds: string[];
  saveCourse: (courseId: string) => void;
  unsaveCourse: (courseId: string) => void;
  updateCourse: (updated: Course) => void;
}

export const useCourseStore = create<CourseStore>((set) => ({
  courses: MOCK_COURSES,
  savedIds: MOCK_COURSES.map((course) => course.id),

  saveCourse: (id) =>
    set((s) => ({ savedIds: s.savedIds.includes(id) ? s.savedIds : [...s.savedIds, id] })),

  unsaveCourse: (id) =>
    set((s) => ({ savedIds: s.savedIds.filter((i) => i !== id) })),

  updateCourse: (updated) =>
    set((s) => ({
      courses: s.courses.map((c) => (c.id === updated.id ? updated : c)),
    })),
}));
