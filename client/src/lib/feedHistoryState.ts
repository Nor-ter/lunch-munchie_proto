import { FOOD_FILTER_TAGS, type TagType } from '@/constants/foodTags';
import type { FeedLocationFilter } from '@/contexts/AppContext';

const FEED_HISTORY_STATE_KEY = '__lunchieMunchieFeed';
const FEED_SCROLL_STORAGE_KEY = 'lm:scroll:/feed';

export type FeedViewState = {
  activeFilter: TagType | 'all';
  searchOpen: boolean;
  searchInput: string;
  showFilters: boolean;
  draftCenter: { lat: number; lng: number } | null;
  draftRadiusKm: number;
  appliedLocation: FeedLocationFilter | null;
};

type FeedHistoryEntry = {
  restoreOnBack?: boolean;
  scrollTop?: number;
  viewState?: FeedViewState;
};

export const DEFAULT_FEED_VIEW_STATE: FeedViewState = {
  activeFilter: 'all',
  searchOpen: false,
  searchInput: '',
  showFilters: true,
  draftCenter: null,
  draftRadiusKm: 5,
  appliedLocation: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readHistoryEntry(): FeedHistoryEntry | null {
  if (typeof window === 'undefined' || !isRecord(window.history.state)) return null;
  const entry = window.history.state[FEED_HISTORY_STATE_KEY];
  return isRecord(entry) ? entry as FeedHistoryEntry : null;
}

function updateHistoryEntry(patch: Partial<FeedHistoryEntry>) {
  if (typeof window === 'undefined') return;
  const currentState = isRecord(window.history.state) ? window.history.state : {};
  const currentEntry = readHistoryEntry() ?? {};
  window.history.replaceState({
    ...currentState,
    [FEED_HISTORY_STATE_KEY]: { ...currentEntry, ...patch },
  }, '', window.location.href);
}

function isPoint(value: unknown): value is { lat: number; lng: number } {
  return isRecord(value) && Number.isFinite(value.lat) && Number.isFinite(value.lng);
}

function isLocationFilter(value: unknown): value is FeedLocationFilter {
  return isRecord(value)
    && Number.isFinite(value.latitude)
    && Number.isFinite(value.longitude)
    && Number.isFinite(value.radiusKm);
}

function normalizeViewState(value: unknown): FeedViewState | null {
  if (!isRecord(value)) return null;
  const activeFilter = FOOD_FILTER_TAGS.some(filter => filter.value === value.activeFilter)
    ? value.activeFilter as TagType | 'all'
    : 'all';
  return {
    activeFilter,
    searchOpen: typeof value.searchOpen === 'boolean' ? value.searchOpen : false,
    searchInput: typeof value.searchInput === 'string' ? value.searchInput.slice(0, 40) : '',
    showFilters: typeof value.showFilters === 'boolean' ? value.showFilters : true,
    draftCenter: isPoint(value.draftCenter) ? value.draftCenter : null,
    draftRadiusKm: Number.isFinite(value.draftRadiusKm)
      ? Math.max(1, Math.min(30, Number(value.draftRadiusKm)))
      : 5,
    appliedLocation: isLocationFilter(value.appliedLocation) ? value.appliedLocation : null,
  };
}

export function readRestorableFeedViewState(): FeedViewState | null {
  const entry = readHistoryEntry();
  return entry?.restoreOnBack ? normalizeViewState(entry.viewState) : null;
}

export function saveFeedViewState(viewState: FeedViewState) {
  updateHistoryEntry({ viewState });
}

export function markFeedProfileNavigation(viewState: FeedViewState) {
  updateHistoryEntry({ restoreOnBack: true, viewState });
}

export function readFeedScrollTop() {
  if (typeof window === 'undefined') return 0;
  const historyScrollTop = readHistoryEntry()?.scrollTop;
  if (typeof historyScrollTop === 'number' && Number.isFinite(historyScrollTop) && historyScrollTop >= 0) {
    return historyScrollTop;
  }
  const storedScrollTop = Number(window.sessionStorage.getItem(FEED_SCROLL_STORAGE_KEY));
  return Number.isFinite(storedScrollTop) && storedScrollTop > 0 ? storedScrollTop : 0;
}

export function saveFeedScrollTop(value: number) {
  if (typeof window === 'undefined') return;
  const scrollTop = Math.max(0, value);
  updateHistoryEntry({ scrollTop });
  window.sessionStorage.setItem(FEED_SCROLL_STORAGE_KEY, String(scrollTop));
}

export function saveFeedScrollTopFallback(value: number) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(FEED_SCROLL_STORAGE_KEY, String(Math.max(0, value)));
}
