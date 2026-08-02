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

For each protected feature, trace the complete behavior chain: entry control, state, rendering, persistence/API, navigation, and tests. A feature is preserved only when the chain still works.

When a result intentionally differs from both sides, record the resolution as `COMBINED` and explain which behavior came from each side.
