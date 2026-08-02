# Feature provenance

## Manifest schema

Pass a JSON document to `scripts/feature_provenance.py`:

```json
{
  "features": [
    {
      "name": "Saved map/list toggle",
      "intent": "import",
      "paths": ["client/src/pages/SavedPage.tsx"],
      "origin_ref": "merge4_v1",
      "notes": "Map and list views remain switchable"
    },
    {
      "name": "Hanger lunchmate button",
      "intent": "retain",
      "paths": ["client/src/components/FoodieBuddy.tsx"]
    }
  ]
}
```

`intent` is `import`, `retain`, or `combine`. Paths must be repository-relative and should be narrow enough to represent the feature. Add multiple paths when the behavior crosses UI, state, API, assets, or tests. `origin_ref` is optional evidence for distinguishing direct from transitive source ancestry.

## Automated comparison

The script compares Git object identities for every declared path at:

- `merge-base`
- `target-before`
- `source`
- `result`

It emits the observed relationship, likely classification, unique commits touching the paths, and confidence. Equality proves file-state relationships, not user-visible behavior.

## Confidence rules

- `HIGH`: Result exactly matches a side for all feature paths, ancestry supports the origin, and relevant validation passes.
- `MEDIUM`: File evidence is consistent but paths contain multiple features or semantic validation is incomplete.
- `LOW`: Result differs from both sides, origin ref is missing, paths are broad, or tests do not isolate the feature.

Use `UNKNOWN` instead of forcing a label when features share files and symbol-level inspection is needed. Upgrade an automated result only after inspecting symbols, tests, and conflict-resolution decisions.

Assign `REGRESSED` only from failed feature-level validation or direct semantic inspection. A changed file hash alone cannot prove regression because retained and imported features often share a component.

## Required report columns

| Feature | Intent | Classification | Origin path | Evidence | Confidence | Validation |
|---|---|---|---|---|---|---|

For past merge audits, report both the branch named by the user and the historical commit path. A feature may have arrived through `source` while originally being implemented on another branch.
