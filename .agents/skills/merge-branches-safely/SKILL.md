---
name: merge-branches-safely
description: Audit, plan, execute, recover, and explain Git branch merges while preserving selected target behavior and proving merged features actually work. Use when Codex must merge or inspect branches, trace direct or transitive ancestry, protect target-side behavior, resolve semantic conflicts, diagnose code-present-but-broken integrations, verify a merge, or report imported, retained, combined, excluded, or regressed features.
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

Record requested behavior as a feature manifest before editing. Mark each feature with intent `import`, `retain`, or `combine`, plus the smallest reliable set of paths and optional symbols. For every material feature, add a behavior contract: entrypoint, preconditions, user actions, observable outcomes, transition/interrupt edge cases, and result-level validation evidence. Read [behavior-verification.md](references/behavior-verification.md) for the schema and proof levels. If scope is ambiguous, continue with safe read-only analysis and ask only before a materially different write.

## Run the workflow

1. Inspect status, current branch, refs, merge base, unique commits, prior merges, and changed paths. Do not fetch unless current remote state is required and the user authorized network-changing workflow.
2. Run `scripts/merge_audit.py` to generate reproducible ancestry evidence. Read [strategy-selection.md](references/strategy-selection.md) when choosing merge, cherry-pick, or manual transplant.
3. Build a feature manifest. Include target behaviors the user requires unchanged, even when they span multiple files. Recover acceptance behavior from source tests, product code, issue context, and user-visible flows; do not reduce a feature to the files that contain it.
4. Run `scripts/feature_provenance.py` before integration with a prospective result when available. Treat its classifications as evidence, not semantic truth.
5. Execute the selected strategy only in `execute` mode. Preserve unrelated dirty-worktree changes. Stop if they overlap the merge scope and cannot be separated safely.
6. Resolve conflicts by user-visible behavior and data contracts. Read [semantic-conflicts.md](references/semantic-conflicts.md). Search for duplicate definitions, stale field names, asset mismatches, tests that encode the superseded branch, and guards or lifecycle states that can leave imported code unreachable.
7. Prove each feature at the behavior level before broad gates. Trace presence -> reachability -> operability -> transition safety -> result integration. For stateful or interactive features, test the normal path plus repeated, interrupted, disabled/loading, and cleanup/retry states that can make behavior intermittent. Source-string assertions, path equality, type checks, and builds are not feature-level proof.
8. Validate narrowly first, then run type checks, relevant tests, the full suite, and a production build when available. Prefer a deterministic state/controller test plus a browser or integration journey through the real entrypoint for interactive behavior. Verify protected behaviors explicitly against the result.
9. Run `scripts/verify_merge.py` and the post-merge provenance report with `--require-behavior-contract`; use `--require-passed-validation` before declaring `execute` or `recover` complete. Compare predicted and actual outcomes.
10. Report the exact target, source, result, validation results, unresolved risks, and a feature table with classification, origin path, Git confidence, behavior status, evidence, and confidence.

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

Treat automated Git classifications as tentative until behavior validation passes. If declared paths match source but the acceptance flow fails, classify the feature `REGRESSED`. If validation is missing or `not_run`, report `NOT_VERIFIED` and do not state that the feature works.

## Apply safety gates

- Do not assume a clean textual merge is a correct feature merge.
- Do not treat code presence, a source-string test, type success, or a production build as proof that an interactive feature works.
- Do not silently choose source for files containing protected target behavior.
- Do not overwrite or discard unrelated user changes.
- Do not use `reset --hard`, forced checkout, rebase, force-push, or broad deletion without explicit authorization.
- Do not claim a feature origin from filenames alone. Cite commits, paths, symbols, tests, or manual resolution decisions.
- Do not mark completion while required validations fail. Report failures and their scope.
- Do not carry source-branch validation forward as result evidence; rerun the acceptance flow on the actual result.

## Load project precedent

Read [lunchie-munchie-case-study.md](references/lunchie-munchie-case-study.md) when working in Lunchie Munchie or when the source contains earlier feature branches. It documents the protected profile UI and the transitive `merge4_v1` feature path without turning those project-specific decisions into universal rules.
