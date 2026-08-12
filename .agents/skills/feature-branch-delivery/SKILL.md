---
name: feature-branch-delivery
description: Plan, implement, validate, and merge one product feature safely from a dedicated Git branch into main. Use when Codex needs to turn a feature request or bug fix into a bounded branch, assess existing feature branches or pull requests, prepare a merge-ready change, resolve semantic Git conflicts, preserve data migrations and protected behavior, or report exactly what a merge adds.
---

# Feature Branch Delivery

Treat a branch as one releasable product slice. Keep each request traceable from acceptance criteria to tests and its merge result.

## Start with a feature contract

State the outcome, non-goals, acceptance criteria, affected UI/API/D1/deployment behavior, protected behavior, and related branches or PRs. Before creating or reusing a branch, run:

```bash
node .agents/skills/feature-branch-delivery/scripts/feature-preflight.mjs main
```

Use [feature-manifest.md](references/feature-manifest.md) in the PR or task. Audit an active feature branch before creating a duplicate.

## Implement one bounded feature

- Confirm `main` and the worktree state before branching; name the branch by intent.
- Keep unrelated refactors, formatting, and dependency upgrades out of the feature branch.
- Add new ordered migrations; never rewrite an already-applied migration.
- Never commit secrets or `.dev.vars`.
- Run the project pre-commit hook and focused tests during work, then the complete required quality gate before a PR.

## Prepare and execute the merge

Run this read-only readiness report before review or merge:

```bash
node .agents/skills/feature-branch-delivery/scripts/merge-readiness.mjs main
```

Require acceptance-criteria tests, CI, review, migration/deployment notes, and a rollback/mitigation path. Use `$merge-branches-safely` for an actual merge, non-trivial ancestry, or conflicts.

## Resolve conflicts by behavior

Read [conflict-playbook.md](references/conflict-playbook.md). Resolve UI by the user flow; APIs by producer/consumer contracts; D1 through forward migrations; tests by the behavior they protect. Do not blindly choose “ours” or “theirs”.

Never use `reset --hard`, forced checkout, rebase, force-push, broad deletion, or destructive recovery without explicit authorization. Ask when resolution changes the agreed product behavior or could lose data.

## Close with evidence

After merging to `main`, verify the defined outcome in the designated environment. Report source, target, PR/merge commit, deployment, imported/retained/combined behavior, tests/CI, migration status, and rollback path. A clean textual merge is not delivery.
