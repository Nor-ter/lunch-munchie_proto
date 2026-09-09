import type { CapturedMunchie } from '@/types/munchieCapture';

export interface MunchieSnackTimeSession {
  items: CapturedMunchie[];
  activeIndex: number;
  consumedIds: string[];
}

export type ConsumeSnackTimeMunchieResult = {
  state: MunchieSnackTimeSession;
  status: 'advanced' | 'complete' | 'ignored';
};

export function createMunchieSnackTimeSession(
  queuedIds: readonly string[],
  inventory: readonly CapturedMunchie[],
): MunchieSnackTimeSession {
  const inventoryById = new Map(inventory.map(item => [item.id, item]));
  const seen = new Set<string>();
  const items = queuedIds.flatMap((id) => {
    if (seen.has(id)) return [];
    seen.add(id);
    const item = inventoryById.get(id);
    return item && item.fedAt === undefined ? [item] : [];
  });
  return { items, activeIndex: 0, consumedIds: [] };
}

export function activeSnackTimeMunchie(session: MunchieSnackTimeSession | null) {
  return session?.items[session.activeIndex] ?? null;
}

export function waitingSnackTimeMunchies(session: MunchieSnackTimeSession | null) {
  if (!session) return [];
  return session.items.slice(session.activeIndex + 1);
}

export function consumeActiveSnackTimeMunchie(
  session: MunchieSnackTimeSession,
  munchieId: string,
): ConsumeSnackTimeMunchieResult {
  const active = activeSnackTimeMunchie(session);
  if (!active || active.id !== munchieId || session.consumedIds.includes(munchieId)) {
    return { state: session, status: 'ignored' };
  }

  const state = {
    ...session,
    activeIndex: session.activeIndex + 1,
    consumedIds: [...session.consumedIds, munchieId],
  };
  return {
    state,
    status: state.activeIndex >= state.items.length ? 'complete' : 'advanced',
  };
}

export function snackTimeSessionXpGain(
  session: MunchieSnackTimeSession | null,
  xpPerMunchie: number,
) {
  return (session?.consumedIds.length ?? 0) * xpPerMunchie;
}
