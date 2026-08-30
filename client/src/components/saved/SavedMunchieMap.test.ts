import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'SavedMunchieMap.tsx'), 'utf8');

describe('SavedMunchieMap course drill-down', () => {
  it('shows one average-position marker per saved course in overview mode', () => {
    expect(source).toContain('groupSavedFeedMapPointsByCourse(points)');
    expect(source).toContain("data-mode={selectedCourse ? 'course-detail' : 'course-overview'}");
    expect(source).toContain('!selectedCourse && courseGroups.map');
    expect(source).toContain('data-ui="saved-course-centroid"');
  });

  it('hides other courses and shows the selected course places and route', () => {
    expect(source).toContain("useDirections(directionStops, 'walking')");
    expect(source).toContain('toSavedCourseRoutePath(routeCoordinates)');
    expect(source).not.toContain('routeCoordinates.length >= 2 ? routeCoordinates : directionStops');
    expect(source).toContain('routePath.length >= 2');
    expect(source).toContain('<Polyline');
    expect(source).toContain('selectedCourse.points.map((point, index)');
    expect(source).toContain('data-ui="saved-course-place"');
  });

  it('exposes loading and failure instead of drawing a straight fallback route', () => {
    expect(source).toContain('data-route-state=');
    expect(source).toContain('isDirectionsLoading');
    expect(source).toContain('isDirectionsError');
    expect(source).toContain('도보 경로를 불러오지 못했어요');
  });

  it('returns to all saved courses when the detail is unselected', () => {
    expect(source).toContain('aria-label="전체 저장 코스 보기"');
    expect(source).toContain('onSelectedFeedIdChange(null)');
    expect(source).toContain('<X size={14} />');
    expect(source).not.toContain('전체 코스\n');
  });

  it('opens the existing restaurant detail sheet from a selected place marker', () => {
    expect(source).toContain('onClick={() => setSelectedPlaceId(point.id)}');
    expect(source).toContain('상세정보 보기');
    expect(source).toContain('<RestaurantDetailSheet');
    expect(source).toContain('restaurantId={selectedPlace.restaurantId}');
    expect(source).toContain('presentation="modal"');
  });

  it('never substitutes a restaurant catalogue image for missing author media', () => {
    expect(source).toContain('selectedCourse.post.missingOriginalMedia');
    expect(source).toContain('작성자가 등록한 음식 사진 없음');
    expect(source).not.toContain('selectedCourse.post.photos[0] ?? selectedCourse.points[0]?.imageUrl');
  });
});
