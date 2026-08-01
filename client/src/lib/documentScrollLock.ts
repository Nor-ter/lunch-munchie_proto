type ScrollLockDocument = Pick<Document, 'body' | 'querySelector'>;

interface InertTargetState {
  count: number;
  wasInert: boolean;
}

interface DocumentLockState {
  count: number;
  originalOverflow: string;
  inertTargets: Map<HTMLElement, InertTargetState>;
}

const DOCUMENT_SCROLL_LOCK_KEY = '__lunchieDocumentScrollLocks';
const scrollLockGlobal = globalThis as typeof globalThis & {
  [DOCUMENT_SCROLL_LOCK_KEY]?: WeakMap<ScrollLockDocument, DocumentLockState>;
};
const lockStates = scrollLockGlobal[DOCUMENT_SCROLL_LOCK_KEY]
  ?? new WeakMap<ScrollLockDocument, DocumentLockState>();
scrollLockGlobal[DOCUMENT_SCROLL_LOCK_KEY] = lockStates;

// HMR 이전 모듈이 남긴 잠금은 새 overlay가 없는 경우 즉시 복구한다.
if (typeof document !== 'undefined' && !lockStates.get(document)?.count) {
  if (document.body.style.overflow === 'hidden') document.body.style.overflow = '';
  document.querySelector<HTMLElement>('.app-shell')?.removeAttribute('inert');
}

/**
 * Clears a lock left behind by a previous app instance (for example after HMR).
 * Call this before React mounts; active overlays will acquire their own lock.
 */
export function clearStaleDocumentScrollLock(doc: ScrollLockDocument = document) {
  if (lockStates.get(doc)?.count) return;
  if (doc.body.style.overflow === 'hidden') doc.body.style.overflow = '';
  doc.querySelector<HTMLElement>('.app-shell')?.removeAttribute('inert');
}

/** Locks document scrolling until every active overlay has released its lock. */
export function acquireDocumentScrollLock({
  doc = document,
  inertSelector,
}: {
  doc?: ScrollLockDocument;
  inertSelector?: string;
} = {}) {
  let state = lockStates.get(doc);
  if (!state) {
    state = {
      count: 0,
      // A pre-existing `hidden` value is a stale lock from the old modal code.
      originalOverflow: doc.body.style.overflow === 'hidden' ? '' : doc.body.style.overflow,
      inertTargets: new Map(),
    };
    lockStates.set(doc, state);
  }

  if (state.count === 0) {
    state.originalOverflow = doc.body.style.overflow === 'hidden' ? '' : doc.body.style.overflow;
  }
  state.count += 1;
  doc.body.style.overflow = 'hidden';

  const inertTarget = inertSelector
    ? doc.querySelector<HTMLElement>(inertSelector)
    : null;
  if (inertTarget) {
    const targetState = state.inertTargets.get(inertTarget);
    if (targetState) {
      targetState.count += 1;
    } else {
      state.inertTargets.set(inertTarget, {
        count: 1,
        wasInert: inertTarget.hasAttribute('inert'),
      });
      inertTarget.setAttribute('inert', '');
    }
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;

    if (inertTarget) {
      const targetState = state.inertTargets.get(inertTarget);
      if (targetState) {
        targetState.count -= 1;
        if (targetState.count === 0) {
          if (!targetState.wasInert) inertTarget.removeAttribute('inert');
          state.inertTargets.delete(inertTarget);
        }
      }
    }

    state.count = Math.max(0, state.count - 1);
    if (state.count === 0) {
      doc.body.style.overflow = state.originalOverflow;
      lockStates.delete(doc);
    }
  };
}
