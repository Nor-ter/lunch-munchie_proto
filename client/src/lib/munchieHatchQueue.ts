export interface MunchieHatchQueueState {
  queuedIds: string[];
}

export type MunchieHatchQueueAction =
  | { type: 'enqueue'; id: string }
  | { type: 'dequeue'; id: string }
  | { type: 'clear' };

export const EMPTY_MUNCHIE_HATCH_QUEUE: MunchieHatchQueueState = {
  queuedIds: [],
};

export function enqueueMunchie(
  state: MunchieHatchQueueState,
  id: string,
): MunchieHatchQueueState {
  if (state.queuedIds.includes(id)) return state;
  return { queuedIds: [...state.queuedIds, id] };
}

export function dequeueMunchie(
  state: MunchieHatchQueueState,
  id: string,
): MunchieHatchQueueState {
  if (!state.queuedIds.includes(id)) return state;
  return { queuedIds: state.queuedIds.filter(queuedId => queuedId !== id) };
}

export function clearMunchieHatchQueue(
  state: MunchieHatchQueueState,
): MunchieHatchQueueState {
  if (state.queuedIds.length === 0) return state;
  return EMPTY_MUNCHIE_HATCH_QUEUE;
}

export function isMunchieQueued(
  state: MunchieHatchQueueState,
  id: string,
) {
  return state.queuedIds.includes(id);
}

export function munchieHatchQueueReducer(
  state: MunchieHatchQueueState,
  action: MunchieHatchQueueAction,
): MunchieHatchQueueState {
  switch (action.type) {
    case 'enqueue':
      return enqueueMunchie(state, action.id);
    case 'dequeue':
      return dequeueMunchie(state, action.id);
    case 'clear':
      return clearMunchieHatchQueue(state);
  }
}
