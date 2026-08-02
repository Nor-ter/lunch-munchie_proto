# Strategy selection

## Prefer a merge commit when

- The user wants the complete source branch integrated.
- Source history and authorship should remain visible.
- A two-parent commit will make the integration boundary easier to audit.

## Prefer cherry-pick when

- The requested scope is a known, small set of independent commits.
- Source contains unrelated work that must not enter target.
- Commit order and dependencies have been verified.

## Prefer a manual transplant when

- The requested result combines selected behavior from both sides and source commits cannot be applied safely as units.
- The user cares about the resulting behavior more than retaining source commit topology.

## Scope mismatch gate

Before choosing a strategy, compare:

1. commits unique to source;
2. commits unique to target;
3. merges already contained in source;
4. changed paths against requested features;
5. schema, assets, tests, and generated files coupled to those paths.

If source contains transitive features, disclose them before execution. Do not equate `source..target` file counts with feature scope.
