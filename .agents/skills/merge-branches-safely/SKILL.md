---
name: merge-branches-safely
description: Audit, plan, execute, recover, and explain Git branch merges while preserving selected target behavior. Use when Codex must merge or inspect branches, determine why features arrived through direct or transitive ancestry, protect target-side UI or behavior, resolve semantic conflicts, verify a merge commit, or report which features were imported, retained, combined, excluded, or regressed.
---

# Merge Branches Safely

Treat a merge as a feature-integration task, not only a text-integration task. Preserve user-owned changes, gather read-only evidence first, and never start a destructive recovery operation without explicit approval.

## Choose a mode

- `audit`: Inspect an existing branch or merge commit without modifying Git state.
- `plan`: Produce an integration plan and predicted feature-provenance report.
- `execute`: Perform an approved merge, resolve conflicts, validate behavior, and report provenance.
- `recover`: Diagnose an incomplete or incorrect merge. Prefer additive fixes or a new branch; require approval before destructive operations.

## Establish the merge contract

Resolve these names before planning:

- `target`: Branch that will receive the result. Use the current branch as the candidate when the user omits it, but show the resolved target and source before an actual merge.
- `source`: Branch whose changes are being integrated.
- `merge-base`: Best common ancestor of target and source.
- `target-before`: Target tip immediately before integration.
- `result`: Final working tree or merge commit.

For audit of an existing two-parent merge, infer `target-before` from parent 1 and `source` from parent 2. State the inference. Do not call `target-before` the merge base.

Record requested behavior as a feature manifest before editing. Mark each feature with intent `import`, `retain`, or `combine`, plus the smallest reliable set of paths and optional symbols/tests. If scope is ambiguous, continue with safe read-only analysis and ask only before a materially different write.

## Run the workflow

1. Inspect status, current branch, refs, merge base, unique commits, prior merges, and changed paths. Do not fetch unless current remote state is required and the user authorized network-changing workflow.
2. Run `scripts/merge_audit.py` to generate reproducible ancestry evidence. Read [strategy-selection.md](references/strategy-selection.md) when choosing merge, cherry-pick, or manual transplant.
3. Build a feature manifest. Include target behaviors the user requires unchanged, even when they span multiple files.
4. Run `scripts/feature_provenance.py` before integration with a prospective result when available. Treat its classifications as evidence, not semantic truth.
5. Execute the selected strategy only in `execute` mode. Preserve unrelated dirty-worktree changes. Stop if they overlap the merge scope and cannot be separated safely.
6. Resolve conflicts by user-visible behavior and data contracts. Read [semantic-conflicts.md](references/semantic-conflicts.md). Search for duplicate definitions, stale field names, asset mismatches, and tests that encode the superseded branch.
7. Validate narrowly first, then run type checks, relevant tests, the full suite, and a production build when available. Verify protected behaviors explicitly.
8. Run `scripts/verify_merge.py` and the post-merge provenance report. Compare predicted and actual outcomes.
9. Report the exact target, source, result, validation results, unresolved risks, and a feature table with classification, origin path, evidence, and confidence.

## Classify feature provenance

Use these labels:

- `IMPORTED_DIRECT`: Implemented on source after source diverged from its declared origin.
- `IMPORTED_TRANSITIVE`: Reached source through an earlier ancestor or merged branch.
- `RETAINED_TARGET`: Result matches target-before instead of a different source implementation.
- `COMBINED`: Result differs from both sides and deliberately integrates both behaviors.
- `ALREADY_COMMON`: Relevant state is identical on both sides and was not newly introduced by this merge.
- `EXCLUDED_SOURCE`: Source-only behavior is intentionally absent from the result.
- `REGRESSED`: Required behavior is missing or validation fails after integration.
- `UNKNOWN`: Available Git evidence cannot support a reliable semantic conclusion.

Distinguish `IMPORTED_DIRECT` from `IMPORTED_TRANSITIVE` with commit ancestry, not branch names. Branch names are mutable labels. Use [feature-provenance.md](references/feature-provenance.md) for the manifest schema and confidence rules.

## Apply safety gates

- Do not assume a clean textual merge is a correct feature merge.
- Do not silently choose source for files containing protected target behavior.
- Do not overwrite or discard unrelated user changes.
- Do not use `reset --hard`, forced checkout, rebase, force-push, or broad deletion without explicit authorization.
- Do not claim a feature origin from filenames alone. Cite commits, paths, symbols, tests, or manual resolution decisions.
- Do not mark completion while required validations fail. Report failures and their scope.

## Load project precedent

Read [lunchie-munchie-case-study.md](references/lunchie-munchie-case-study.md) when working in Lunchie Munchie or when the source contains earlier feature branches. It documents the protected profile UI and the transitive `merge4_v1` feature path without turning those project-specific decisions into universal rules.
