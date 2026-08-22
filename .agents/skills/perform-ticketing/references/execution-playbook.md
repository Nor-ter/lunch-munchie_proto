# AI execution playbook

Use this only when an AI is asked to investigate or fix a ticket.

## 1. Establish the current truth

- Read repository instructions and inspect the worktree before changing anything.
- Confirm the ticket is based on the current product, not an already-fixed historical build.
- Inspect the latest `origin/main`, recent commits affecting the surface, open related branches or PRs when accessible, and nearby tests.
- Preserve uncommitted and untracked work. Never use destructive recovery to make the tree clean.
- Load `feature-branch-delivery` for code-changing work and keep one ticket on one dedicated branch.

Record relevant findings in section D. Do not paste an exhaustive Git history into the ticket.

## 2. Reproduce before diagnosing

- Follow section B against the stated URL and device class.
- Observe visible state, route, loading/error state, console or network evidence when available, and whether login/session data changes the result.
- Repeat only enough to establish a reliable reproduction rate.
- If the bug is phone-only, use available responsive/browser evidence but preserve `Needs Reproduction` until a real-phone observation confirms it.
- If it cannot be reproduced, vary only plausible conditions such as login state, viewport, browser family, refresh/session restore, network delay, and permission denial. Do not guess a code fix.

Set `Needs Reproduction` when evidence remains insufficient and state the smallest missing fact.

## 3. Prevent collisions

- Trace the user action through UI state, API consumer, API producer, and persistence only as far as the symptom requires.
- Identify behavior introduced or intentionally protected by recent work before editing shared components.
- Separate a defect from a redesign: restore violated expected behavior in the bug ticket; create a linked UX improvement for intentional flow or visual changes.
- Avoid unrelated refactors, dependency upgrades, formatting churn, schema rewrites, and changes to deployment or secrets.
- If another active ticket owns the same root cause, link or consolidate it rather than producing competing fixes. Do not close an external task without authorization.

## 4. Implement the smallest complete fix

- Fix the root cause rather than hiding the symptom or removing the failing interaction.
- Preserve authentication boundaries, session recovery, API contracts, D1 migration order, Cloudflare bindings, responsive behavior, and existing accessibility behavior unless the ticket explicitly changes one of them.
- Add or update a regression test that represents the reported behavior when practical.
- Do not merge, deploy, migrate production data, modify secrets, or force-push without the required authority.

## 5. Validate proportionately

Run focused tests first, then the repository quality gate required by the affected scope. For user-flow bugs, verify the exact section B sequence in a browser or preview in addition to automated tests.

The AI completion report must distinguish:

- what failed and why;
- what changed;
- what intentionally stayed unchanged;
- automated checks and their results;
- anything that could not be verified;
- the exact preview or production URL that contains the fix.

Warnings are not failures, but record warnings that could affect this ticket. Do not claim success when the verification URL does not yet contain the commit.

## 6. Hand off, do not self-sign

Update the task to `Human Verification` only after the fix is available at the supplied verification URL. Present the compact Phone verification block from `ticket-contract.md` and reuse section B unchanged.

If the human selects `Not Fixed`, treat their first divergent step as new evidence, re-open investigation on the same branch when appropriate, and refresh section D. If they report a different symptom, create or propose a linked ticket instead of silently expanding scope.
