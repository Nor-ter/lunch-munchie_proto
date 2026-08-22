# Minimal bug ticket contract

## Human-authored input

The reporter should need less than two minutes. Preserve their wording and do not require technical diagnosis.

```md
Bug Type: <User Behaviour | Consistency | Basic Functionality | Unintended Behaviour>

## A. Bug Description
<What happened, in one or two sentences>

## B. Steps to Reproduce
1. <Open or tap>
2. <Next action>
3. <Observe the bug>

## C. Expected Outcome
<What the user expected, in one sentence>

## D. Note for AI
<!-- The AI owns this section. The reporter may leave it blank. -->
```

Use the title:

```text
[Bug Type][Surface] User-visible symptom
```

Examples of `Surface` are `Login`, `Quick Match`, `Session`, `Swipe`, `Results`, `Feed`, `Course`, `Profile`, `Follow`, `Saved`, and `Lunchmate`.

## AI-enriched section D

Before implementation, replace or extend section D with concise evidence. Do not make the human fill these fields.

```md
## D. Note for AI

- Ticket ID:
- Severity: P0 | P1 | P2 | P3
- Environment and route:
- Device/login conditions:
- Reproduction result:
- Suspected ownership:
- Related commits, branches, PRs, or tickets:
- Protected behaviour:
- Intended scope:
- Non-goals:
- Required validation:
- Verification URL: Pending

### AI completion report

- Root cause:
- Changed behaviour:
- Files changed:
- Tests and checks:
- Regression risks:
- Known limitations:
- Verification URL:
```

Severity is AI-triaged:

- `P0`: security, data loss, broad outage, or unusable production app.
- `P1`: a core user journey cannot be completed and has no reasonable workaround.
- `P2`: the journey works but is unreliable, confusing, inconsistent, or has a workaround.
- `P3`: cosmetic or low-impact defect.

## Status flow

```text
Backlog → AI Working → Human Verification → Signed Off
                    ↘ Needs Reproduction
                    ↘ Blocked
Human Verification → AI Working          (still reproduced)
Human Verification → Follow-up Ticket    (different symptom)
```

Use `Done` only if the workspace maps it to `Signed Off`. AI completion alone is not sign-off.

## Human verification

Show this compact block at handoff:

```md
### Phone verification

- Verification URL: <preview or production URL containing the fix>
- Repeat: Section B exactly
- Reproduced before fix: Yes / No
- Reproduced after fix: Yes / No
- Sign-off: Fixed / Not Fixed
```

Interpretation:

- **After fix = No:** the human may sign off `Fixed`.
- **After fix = Yes:** return the same ticket to `AI Working` and identify only the first step where reality differed.
- **A different issue appears:** keep this ticket focused and create a linked follow-up ticket.
