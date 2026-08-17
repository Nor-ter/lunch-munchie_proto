export type SessionSwipeAction = 'LIKE' | 'DISLIKE' | 'SYSTEM';

export interface SessionSwipeInput {
  id?: string;
  sessionId: string;
  userId: string;
  restaurantId: string;
  round: number;
  action: SessionSwipeAction;
  createdAt?: string;
}

type RequestLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface PersistSessionSwipeOptions {
  request?: RequestLike;
  attempts?: number;
  retryDelay?: (attempt: number) => Promise<void>;
}

function swipeRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `swipe_${crypto.randomUUID()}`;
  }
  return `swipe_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function defaultRetryDelay(attempt: number) {
  await new Promise(resolve => setTimeout(resolve, 150 * attempt));
}

/**
 * Persist one session signal before the UI advances.
 *
 * A single request id is retained across retries. The API/D1 uniqueness
 * constraint therefore makes a lost response safe to retry without creating
 * another vote.
 */
export async function persistSessionSwipe(
  input: SessionSwipeInput,
  options: PersistSessionSwipeOptions = {},
) {
  const request = options.request ?? fetch;
  const attempts = Math.max(1, options.attempts ?? 3);
  const retryDelay = options.retryDelay ?? defaultRetryDelay;
  const body = JSON.stringify({
    id: input.id ?? swipeRequestId(),
    session_id: input.sessionId,
    user_id: input.userId,
    restaurant_id: input.restaurantId,
    round: input.round,
    swipe_action: input.action,
    created_at: input.createdAt ?? new Date().toISOString(),
  });

  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await request('/api/swipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (response.ok) return;

      const payload = await response.json().catch(() => ({})) as { error?: string };
      const error = Object.assign(
        new Error(payload.error ?? '선택을 저장하지 못했어요.'),
        { retryable: response.status >= 500 },
      );
      if (response.status < 500 || attempt === attempts) throw error;
      lastError = error;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('선택을 저장하지 못했어요.');
      if ('retryable' in lastError && lastError.retryable === false) throw lastError;
      if (attempt === attempts) throw lastError;
    }
    await retryDelay(attempt);
  }
  throw lastError ?? new Error('선택을 저장하지 못했어요.');
}
