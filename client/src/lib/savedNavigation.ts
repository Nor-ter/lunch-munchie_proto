export type SavedViewMode = 'map' | 'list';

export function getSavedViewFromSearch(search: string): SavedViewMode {
  return new URLSearchParams(search).get('view') === 'map' ? 'map' : 'list';
}

export function getSavedFeedDetailPath(feedId: string, view: SavedViewMode) {
  return `/feed/${encodeURIComponent(feedId)}?from=saved&savedView=${view}`;
}

export function getSavedReturnPath(search: string) {
  const view = new URLSearchParams(search).get('savedView') === 'map' ? 'map' : 'list';
  return `/saved?view=${view}`;
}
