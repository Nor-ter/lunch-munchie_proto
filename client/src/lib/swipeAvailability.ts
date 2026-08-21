import type { QuickMatchSessionStatus } from './quickMatch';

export type SwipeAvailability =
  | 'loading'
  | 'ready'
  | 'api-error'
  | 'catalog-empty'
  | 'no-matches'
  | 'session-missing'
  | 'session-invalid'
  | 'session-not-started';

export function classifySwipeAvailability(input: {
  loading: boolean;
  hasSession: boolean;
  isMember: boolean;
  status?: QuickMatchSessionStatus;
  catalogLoaded: boolean;
  catalogCount: number;
  candidateCount: number;
}): SwipeAvailability {
  if (input.loading) return 'loading';
  if (!input.hasSession) return 'session-missing';
  if (!input.isMember || input.status === 'cancelled' || input.status === 'expired' || input.status === 'completed' || input.status === 'left') {
    return 'session-invalid';
  }
  if (input.status === 'waiting') return 'session-not-started';
  if (!input.catalogLoaded) return 'api-error';
  if (input.catalogCount === 0) return 'catalog-empty';
  if (input.candidateCount === 0) return 'no-matches';
  return 'ready';
}
