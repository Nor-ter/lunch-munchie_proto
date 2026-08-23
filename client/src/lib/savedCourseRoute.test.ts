import { describe, expect, it } from 'vitest';
import { toSavedCourseRoutePath } from './savedCourseRoute';

describe('toSavedCourseRoutePath', () => {
  it('renders the decoded Directions route', () => {
    expect(toSavedCourseRoutePath([
      { latitude: -37.81, longitude: 144.96 },
      { latitude: -37.812, longitude: 144.965 },
      { latitude: -37.82, longitude: 144.97 },
    ])).toEqual([
      { lat: -37.81, lng: 144.96 },
      { lat: -37.812, lng: 144.965 },
      { lat: -37.82, lng: 144.97 },
    ]);
  });

  it('does not invent a straight route when Directions has no path', () => {
    expect(toSavedCourseRoutePath([])).toEqual([]);
    expect(toSavedCourseRoutePath([
      { latitude: -37.81, longitude: 144.96 },
    ])).toEqual([]);
  });
});
