import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'CourseDetailPage.tsx'), 'utf8');

describe('CourseDetailPage map hydration', () => {
  it('waits for geo-backed places instead of flashing the legacy photo SVG map', () => {
    expect(source).toContain('getCoursePlacesFromFeedStops');
    expect(source).toContain('mapReady ? (');
    expect(source).toContain('places={mapGeoPlaces}');
    expect(source).toContain('지도 불러오는 중…');
    expect(source).not.toContain('width={430}');
  });

  it('renders the feed author photo when it is available', () => {
    expect(source).toContain('<AuthorAvatar');
    expect(source).toContain('authorAvatarImage');
    expect(source).not.toContain('{orphanPost?.authorEmoji ||');
  });
});
