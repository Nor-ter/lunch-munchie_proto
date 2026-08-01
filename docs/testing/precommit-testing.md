# Commit quality gate

Every commit runs `npm run test:precommit` through `.githooks/pre-commit`.
`pnpm install` runs the repository-owned hook installer automatically. If a
worktree was created before this change, run `node scripts/installGitHooks.mjs`
once.

The local gate is deliberately deterministic and credential-free:

1. `pnpm check` — TypeScript type safety.
2. `pnpm test` — unit, component, engine, and API-pure tests.
3. `pnpm test:e2e` — local browser boundary tests with mocked auth.

It does **not** run the live E2E suite. That suite needs a captured
authentication state and an explicit deployment target, so it remains a
release/CI gate: `pnpm test:e2e:live` after creating the ignored
`config/e2e.config.local.json` from its example.

## Required test cases by change type

| Change | Minimum automated coverage |
| --- | --- |
| Login / logout / route guards | Anonymous pages never render a prototype identity; protected write routes redirect to OAuth; OAuth callback/session parsing tests pass. |
| Session | Invite → join → ready → deck → preliminary completion → final vote → DONE. Repeated result writes use the same idempotency key. |
| Recommendation | Hard dietary/category/budget filters run before ranking; slate order is deterministic for a fixed seed; recently exposed items are penalised but can reappear after cooldown. |
| Feed / course | Owner can permanently delete its own course and attached feed records; another user receives 403; photo URLs, template ID, and placement render identically in feed and detail. |
| Schema / migration | Local D1 migration applies on a fresh database and existing rows retain a valid default. |

When adding a behaviour, add its test in the same commit. A hook bypass
(`git commit --no-verify`) is only for a documented emergency and must be
followed by a passing gate before merge or deployment.
