# sj_branch UI integration into main

Target-before: `19aceff21ad23f9b054c675e67835ad447c4d410`.
Source: `d25ca9253b06cef604fafec2dceb9e3d72740f14`.
Merge base: `92846a0c`.

Source-only commits: `f80073b6` (settings UI), `d25ca925` (default route and four tabs).

| Feature | Classification | Evidence | Confidence |
| --- | --- | --- | --- |
| Settings accordion, order and independent clear controls | COMBINED | Source layout with main Korean labels, 30-person controls and session replacement; settings E2E including reload | High for local tested flows |
| Quick Match default and four tabs | COMBINED | Root redirects to settings; retained main icon style; home remains at `/home` through an explicit body button (see follow-up audit below) | High for local tested flows |
| Home deck, notifications | RETAINED_TARGET / COMBINED routing | Home component unchanged; home deck E2E; notification return link updated to `/home?notifications=1` | High for deck, structural check for notification link |
| Session, detail sheet, photo locking and card flip | RETAINED_TARGET | Main implementation unchanged; Quick Match E2E and card-flip unit checks | High for local tested flows |
| Maps, feed ownership/deletion, profiles and admin | RETAINED_TARGET | Main implementations preserved; map, feed, profile and admin regression E2E | High for local tested flows |

Validation: `npm run test:precommit` exit 0; TypeScript, policy check, 108 unit-test files / 663 tests, 24 Playwright tests and Vite build passed. `git diff --check` passed.

Playwright uses local synthetic fixtures and mocked APIs. This merge does not establish production database, OAuth or live multi-device correctness; pre-existing application defects are outside this UI integration. No source unique commit is dropped. The source home-removal behavior is deliberately combined with a retained home access path to satisfy the no-feature-loss requirement.

## Latest-per-feature follow-up

The original pass did not cover every UI decision or home-route consumer. Source ancestry alone is not proof of complete preservation.

- Retain target navigation styling from `f05c7ac1` (2026-08-26): outlined active icons, sizes, spacing and background. Source's filled icons predate that change; `d25ca925` changes tab order/default routing, not the fill policy.
- Import source header/back-button removal from `f80073b6` (2026-09-06), retaining target Korean copy. Preserve Home through an explicitly labeled `홈 · 오늘의 여정` body button instead of a back arrow.
- Correct the winner and invite-join home buttons to `/home`; update both home/settings slide directions. Default/restart routes remain Quick Match.
- Preserve source accordions, independent clears and settings order, plus target 30-person controls and session replacement logic. No API/schema/deployment changes.
- Acceptance: default entry still opens settings with four tabs; header has no back button; the explicit Home button reaches the existing swipe deck; both slide directions remain defined and session transitions remain unchanged.
- Evidence: focused Vitest route/presentation checks and the updated home-deck Playwright journey. Full gate results are reported with the delivery commit. Winner/join destination changes are source-reviewed, not separate browser acceptance journeys.
- Rollback: revert only the follow-up commit, not the original merge. Remote CI and production validation are not run by this local update.
