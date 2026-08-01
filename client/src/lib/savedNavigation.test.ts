import { describe, expect, it } from 'vitest';
import {
  getSavedFeedDetailPath,
  getSavedReturnPath,
  getSavedViewFromSearch,
} from './savedNavigation';

describe('saved map/list return navigation', () => {
  it('carries map origin into the saved feed detail URL', () => {
    expect(getSavedFeedDetailPath('f2', 'map')).toBe('/feed/f2?from=saved&savedView=map');
  });

  it('returns map-origin feed details to map view', () => {
    expect(getSavedReturnPath('from=saved&savedView=map')).toBe('/saved?view=map');
  });

  it('uses list view for list-origin and legacy saved feed links', () => {
    expect(getSavedReturnPath('from=saved')).toBe('/saved?view=list');
    expect(getSavedViewFromSearch('view=list')).toBe('list');
    expect(getSavedViewFromSearch('view=map')).toBe('map');
  });
});
