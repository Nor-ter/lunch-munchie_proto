# Behavior verification after a merge

Git ancestry proves where code came from. It does not prove that a user can reach or operate the feature in the merged application. Use this reference for interactive UI, stateful workflows, API-backed features, background jobs, or any feature whose paths share state with other branch work.

## Behavior contract

Add an `acceptance` object to every material feature in the manifest:

```json
{
  "name": "Profile character grab",
  "intent": "combine",
  "paths": [
    "client/src/components/munchie/FoodieBuddy.tsx",
    "client/src/hooks/useLunchmateProfileMotion.ts"
  ],
  "acceptance": {
    "entrypoint": "/profile",
    "preconditions": ["authenticated profile is visible"],
    "actions": ["press the visible character", "move at least 4px", "release"],
    "observables": ["character enters grabbed state", "shadow follows the same position"],
    "edge_cases": [
      "re-grab during landing",
      "grab while a tap-expression timer is active",
      "pointer leaves the original hit area"
    ]
  },
  "validation": {
    "status": "passed",
    "evidence": ["npx playwright test e2e/profile-character-grab.e2e.spec.ts"]
  }
}
```

During planning, use `not_run` until the result exists. After integration, set `passed` only from current-result evidence. `user_confirmed` is acceptable when automation is impractical and the report identifies exactly what the user observed. Never copy a source-branch pass forward without rerunning it against the result.

## Prove the complete behavior chain

For each feature, distinguish these layers:

1. **Presence** — required code, route, assets, schema, and configuration exist.
2. **Reachability** — the intended user and preconditions can reach the entry control or endpoint.
3. **Operability** — the action drives the expected event, state, API/persistence, and rendered result.
4. **Transition safety** — loading, disabled, landing, recovering, retry, cancellation, stale state, and repeated input do not silently block the action.
5. **Result integration** — the check runs against the merged result in the relevant build or local deployment, not only an isolated helper.

A source-string assertion, file hash, type check, build, or component render proves only presence. A single happy-path unit test usually proves operability for one state, not transition safety.

## Derive edge cases instead of guessing

Inspect both sides for guards and lifecycle state:

- `disabled`, `blocked`, `suspended`, `loading`, `busy`, or authorization conditions;
- timers, animation phases, pointer capture, focus, navigation, retries, and cleanup;
- selectors or derived values whose priority changed during conflict resolution;
- providers, context values, API adapters, persistence, assets, and generated types;
- source tests that disappeared, became source-string assertions, or no longer exercise the result.

Build a compact state-transition matrix when a feature has more than one material state:

| Start state | Action | Expected transition | Observable | Repeat/interrupt case |
|---|---|---|---|---|
| idle | pointer move after press | pressing -> grabbed | character and shadow move | repeat after release |
| landing | press visible character | landing -> pressing | no snap to anchor | immediate re-grab |
| tap reaction | drag character | reaction remains non-blocking | grabbed expression wins | rapid tap then drag |

Test every row that can make the feature appear intermittent or unavailable. Prefer a deterministic controller/state test plus one browser or integration journey through the real entrypoint.

## Post-merge classification gate

- `passed` with relevant evidence: Git provenance classification may be reported as final.
- `failed`: classify the feature `REGRESSED`, even when all declared paths match source.
- `not_run` or missing behavior contract: keep the Git relationship as tentative, mark behavior `NOT_VERIFIED`, and do not claim the feature works.
- `user_confirmed`: report who confirmed which observable and retain residual risk for untested edges.

Run `feature_provenance.py` with `--require-behavior-contract` for a post-merge audit. Add `--require-passed-validation` before declaring an execute or recover task complete.
