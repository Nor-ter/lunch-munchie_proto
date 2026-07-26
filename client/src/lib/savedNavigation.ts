export type SavedViewMode = 'map' | 'list';

export function getSavedViewFromSearch(search: string): SavedViewMode {
  return new URLSearchParams(search).get('view') === 'map' ? 'map' : 'list';
}

export function getSavedFeedDetailPath(feedId: string, view: SavedViewMode) {
  return `/feed/${encodeURIComponent(feedId)}?from=saved&savedView=${view}`;
}

export function getSavedCourseDetailPath(
  courseId: string,
  feedId: string,
  view: SavedViewMode,
) {
  return `/course/${encodeURIComponent(courseId)}?from=saved&post=${encodeURIComponent(feedId)}&savedView=${view}`;
}

export function getSavedReturnPath(search: string, selectedFeedId?: string) {
  const view = new URLSearchParams(search).get('savedView') === 'map' ? 'map' : 'list';
  const selectedFeedQuery = view === 'map' && selectedFeedId
    ? `&selectedFeed=${encodeURIComponent(selectedFeedId)}`
    : '';
  return `/saved?view=${view}${selectedFeedQuery}`;
}
