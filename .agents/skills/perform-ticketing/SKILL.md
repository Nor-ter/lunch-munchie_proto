---
name: perform-ticketing
description: Turn minimal Lunchie Munchie bug reports into consistent ClickUp-ready tickets, or execute an existing ticket through conflict-safe reproduction, implementation, validation, and simple human phone sign-off. Use when creating, triaging, fixing, or verifying a bug ticket; keep open-ended UX redesign in a separate improvement ticket.
---

# Perform Ticketing

Keep the human workflow small and move investigation, repository safety, and validation into the AI workflow.

## Choose the mode

- **Create or triage a ticket:** read [references/ticket-contract.md](references/ticket-contract.md). Convert a short observation into the standard A–D ticket, deduplicate it, and put AI-owned detail in section D.
- **Execute a ticket:** read both [references/ticket-contract.md](references/ticket-contract.md) and [references/execution-playbook.md](references/execution-playbook.md). Reproduce, fix, validate, and hand off for human verification.
- **Verify a completed fix:** read the Human verification section of [references/ticket-contract.md](references/ticket-contract.md). Do not reopen implementation unless the same steps still reproduce the bug.

## Minimal human input

Accept the report even when it contains only:

```text
Bug Type: User Behaviour | Consistency | Basic Functionality | Unintended Behaviour
A. Bug Description: what the person saw
B. Steps to Reproduce: the shortest tap sequence
C. Expected Outcome: what should happen
```

Section D is optional for the human. The AI must generate or refresh it from repository evidence before implementation. Normalize `Not Intentional`, `Not Inentional`, and similar labels to `Unintended Behaviour` without blocking intake.

Infer device, route, login state, severity, and scope when evidence makes them clear. Ask only when a missing choice prevents reproduction or would materially change the intended behavior.

## Human verification contract

The human receives only:

- a verification URL that contains the fix;
- the original steps from section B;
- `Reproduced before fix: Yes / No`;
- `Reproduced after fix: Yes / No`;
- `Sign-off: Fixed / Not Fixed`.

Never mark a ticket `Done` on AI evidence alone. Stop at `Human Verification` until a person repeats the same flow on a real phone and signs off. A production URL cannot verify an unmerged fix; provide a deployed preview URL or clearly state that deployment is still pending.

## ClickUp boundary

When ClickUp access is available and the user authorizes task creation or updates, create or update the Backlog task directly. Otherwise output a ready-to-paste task. Do not assign people, change due dates, close duplicates, or move status unless the current request authorizes that external change.

Keep one independently verifiable symptom per ticket. Link related or duplicate tasks instead of combining unrelated fixes.
