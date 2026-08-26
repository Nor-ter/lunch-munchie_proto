# Semantic conflict checks

Text conflict markers cover only overlapping lines. After resolving them, inspect these silent conflict classes:

- duplicate components, functions, styles, routes, or exports;
- old and new schema fields used simultaneously;
- changed context/provider shape without all consumers updated;
- target UI preserved visually but wired to source-incompatible state;
- source assets referenced without corresponding files or manifests;
- tests copied from one side while implementation follows the other;
- selected-item state, navigation, scroll restoration, or persistence lost across component boundaries;
- compatibility aliases that hide rather than complete a migration.
- source feature code that remains present but is unreachable behind merged `blocked`, `disabled`, `loading`, `suspended`, auth, or feature-flag conditions;
- two independently valid state machines whose combined timers, cleanup, priority, or transition guards reject repeated or interrupted input;
- a fixed hit target, selector, or derived coordinate that no longer follows the source-side visual element after animation or layout changes;
- happy-path tests that wait for idle and therefore miss re-entry during landing, recovery, retry, or another transient state.

For each protected feature, trace the complete behavior chain: entry control, guards, state transitions, rendering, persistence/API, navigation, cleanup, and tests. Exercise the action from every material transient or competing state identified on either branch. A feature is preserved only when the chain works on the merged result, including repeated or interrupted use.

When a result intentionally differs from both sides, record the resolution as `COMBINED` and explain which behavior came from each side.
