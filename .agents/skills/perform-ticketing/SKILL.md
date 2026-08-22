---
name: perform-ticketing
description: Turn minimal Lunchie Munchie bug reports, including a title and phone screenshot alone, into reproduced ClickUp-ready tickets, or execute a ticket through conflict-safe implementation, validation, and simple human phone sign-off. Use when creating, triaging, fixing, or verifying a bug ticket; keep open-ended UX redesign in a separate improvement ticket.
---

# Perform Ticketing

Keep the human workflow small and move investigation, repository safety, and validation into the AI workflow.

## Choose the mode

- **Create or triage a ticket:** read [references/ticket-contract.md](references/ticket-contract.md). Accept a title and bug screenshot as sufficient intake, reproduce the flow in production, and return the standard A–D ticket with AI-owned detail in section D.
- **Execute a ticket:** read both [references/ticket-contract.md](references/ticket-contract.md) and [references/execution-playbook.md](references/execution-playbook.md). Reproduce, fix, validate, and hand off for human verification.
- **Verify a completed fix:** read the Human verification section of [references/ticket-contract.md](references/ticket-contract.md). Do not reopen implementation unless the same steps still reproduce the bug.

## Minimal human input

Keep the ClickUp task name and description simple. The task name must be `[Surface] User-visible symptom`; never include Bug Type, severity, or priority in the name. Store Bug Type only in the ClickUp custom field.

The preferred intake is only:

- the intended ClickUp task title; and
- one phone screenshot showing the bug.

Inspect the screenshot, then open `https://lunchie-munchie.pages.dev` and attempt to reproduce the same flow before drafting the ticket. Infer the Bug Type custom field and complete A–D from observed evidence. Preserve the supplied title unless its surface label needs a small normalization; never add Bug Type to it.

Do not invent taps, login state, device-specific behavior, or expected behavior that the screen and live flow do not support. If the bug cannot be reproduced outside the reporter's phone, still complete A–D, label the reproduction result accurately in D, and ask for only the single missing condition that blocks reliable reproduction.

Also accept a report already written in the following exact A–D structure:

```md
#### A. Bug Description
- <What the person saw>

#### B. Steps to Reproduce
1. <The shortest tap sequence>

#### C. Expected Outcome
- <What should happen>

#### D. Note for AI
- `/perform-ticketing`으로 처리한다.
- 최신 main과 운영 환경에서 먼저 재현하고, 관련 기존 기능과 충돌하지 않게 수정한다.
- 수정본이 포함된 검증 URL을 제공하고 `Human Verification`에서 멈춘다.
- 사람이 실제 폰으로 Sign-off하기 전에는 Done 처리하지 않는다.
```

The human may reuse section D unchanged on every bug. The AI may append concise evidence inside D, but must preserve the four A–D headings and should place lengthy investigation or completion reports in ClickUp comments. Normalize `Not Intentional`, `Not Inentional`, and similar custom-field labels to `Unintended Behaviour` without blocking intake.

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
