# Minimal bug ticket contract

## Human-authored input

The reporter should need less than two minutes. Preserve their wording and do not require technical diagnosis. Bug Type belongs only in the ClickUp custom field; do not repeat it in the task name or description.

Use the task name:

```text
[Surface] User-visible symptom
```

For example: `[Quick Match] 시작 후 음식점 카드가 표시되지 않음`.

Do not prepend `[Bug Type]`, severity, or priority. Examples of `Surface` are `Login`, `Quick Match`, `Session`, `Swipe`, `Results`, `Feed`, `Course`, `Profile`, `Follow`, `Saved`, and `Lunchmate`.

Keep the description in this exact format:

```md
#### A. Bug Description

- <What happened, in one or two sentences>

#### B. Steps to Reproduce

1. <Open or tap>
2. <Next action>
3. <Observe the bug>

#### C. Expected Outcome

- <What the user expected, in one sentence>

#### D. Note for AI

- `/perform-ticketing`으로 처리한다.
- 최신 main과 운영 환경에서 먼저 재현하고, 관련 기존 기능과 충돌하지 않게 수정한다.
- 수정본이 포함된 검증 URL을 제공하고 `Human Verification`에서 멈춘다.
- 사람이 실제 폰으로 Sign-off하기 전에는 Done 처리하지 않는다.
```

The four D bullets are reusable defaults. The reporter only changes A–C.

## AI-enriched section D

Before implementation, keep the A–D structure and append only concise evidence inside section D. Do not make the human fill these fields. Put a lengthy investigation or completion report in ClickUp comments rather than adding more top-level description sections.

```md
#### D. Note for AI

- <Keep the four standard instructions>
- AI Update — Severity:
- AI Update — Reproduction result:
- AI Update — Related commit, branch, PR, or ticket:
- AI Update — Protected behaviour and intended scope:
- AI Update — Required validation:
- AI Update — Verification URL: Pending
```

At completion, comment with root cause, changed and preserved behaviour, files, tests, risks, limitations, and the verification URL. Update the `Git Address`, `Git pushed?`, and `Task Complexity` fields when those values become known.

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
