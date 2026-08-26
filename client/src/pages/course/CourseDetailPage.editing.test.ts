import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CourseStop } from '@/contexts/AppContext';
import type { CoursePlace } from '@/types/course';
import {
  buildCourseStopsFromPlaces,
  syncCoursePlaceCoordinates,
} from './CourseDetailPage';

const place = (id: string, latitude: number, longitude: number): CoursePlace => ({
  id,
  name: id,
  rating: 0,
  distance: '',
  category: 'test',
  priceLevel: 1,
  coords: { x: 50, y: 50 },
  latitude,
  longitude,
});

describe('CourseDetailPage course editing', () => {
  it('persists the reordered place list as ordered course stops', () => {
    const existing: CourseStop[] = [
      { placeId: 'a', order: 1, startTime: '10:00', endTime: '11:00', isBookmarked: true },
      { placeId: 'b', order: 2, startTime: '', endTime: '', isBookmarked: false },
    ];

    expect(buildCourseStopsFromPlaces([place('b', 1, 1), place('a', 2, 2)], existing)).toEqual([
      { placeId: 'b', order: 1, startTime: '', endTime: '', isBookmarked: false },
      { placeId: 'a', order: 2, startTime: '10:00', endTime: '11:00', isBookmarked: true },
    ]);
  });

  it('recalculates fallback map positions when places are replaced or added', () => {
    const result = syncCoursePlaceCoordinates([
      place('west', -37.8, 144.9),
      place('east', -37.9, 145.1),
    ]);
    expect(result[0]?.coords).not.toEqual(result[1]?.coords);
    expect(result.every(item => item.coords.x >= 15 && item.coords.x <= 85)).toBe(true);
    expect(result.every(item => item.coords.y >= 15 && item.coords.y <= 85)).toBe(true);
  });

  it('exposes numbered replacement search plus add and delete controls', () => {
    const source = readFileSync(join(import.meta.dirname, 'CourseDetailPage.tsx'), 'utf8');
    expect(source).toContain('번 장소 검색 및 변경');
    expect(source).toContain('새 장소 추가');
    expect(source).toContain('onRemove={removeCoursePlace}');
    expect(source).toContain("updateCourse(appCourse.id");
    expect(source).toContain('replacementActive={isEditing && editingPlaceIndex === i}');
    expect(source).toContain('border-l-2 border-dashed');
    expect(source).toContain('fromSaved && isEditing');
    expect(source).toContain('게시물을 삭제하시겠습니까?');
    expect(source).toContain('코스맵과 먼치 피드 같이 삭제되며');
    expect(source).toContain("fetch(`/api/feed-post?courseId=${encodeURIComponent(id)}`");
    expect(source).toContain("method: 'DELETE'");
    expect(source).toContain("credentials: 'same-origin'");
    expect(source).toContain('deleteCourseWithFeed(id)');
    expect(source.indexOf('if (!response.ok)')).toBeLessThan(source.indexOf('deleteCourseWithFeed(id)'));
    expect(source).toContain('isAuthenticatedContentOwner(authorId, authenticatedUserId)');
    expect(source).not.toContain("authorId === profile.id || from === 'profile'");
    expect(source).toContain('ml-10 mt-3');
    expect(source).not.toContain('장소 이름을 입력하면 지도 위치까지 함께 변경돼요.');
  });
});
