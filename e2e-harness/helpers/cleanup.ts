/** Reverse-order cleanup survives assertion failures and makes reruns safe. */
export function cleanupStack() {
  const undo: Array<() => Promise<void>> = [];
  return {
    add(action: () => Promise<void>) { undo.unshift(action); },
    async run() {
      for (const action of undo.splice(0)) {
        await action().catch(error => console.warn('[e2e cleanup]', error));
      }
    },
  };
}
