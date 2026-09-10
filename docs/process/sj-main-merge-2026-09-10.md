# sj_branch UI integration into main

Target-before: `19aceff21ad23f9b054c675e67835ad447c4d410`.
Source: `d25ca9253b06cef604fafec2dceb9e3d72740f14`.
Merge base: `92846a0c`.

Source-only commits: `f80073b6` (settings UI), `d25ca925` (default route and four tabs).

| Feature | Classification | Evidence | Confidence |
| --- | --- | --- | --- |
| Settings accordion, order and independent clear controls | COMBINED | Source layout with main Korean labels, 30-person controls and session replacement; settings E2E including reload | High for local tested flows |
| Quick Match default and four tabs | COMBINED | Root redirects to settings; retained main icon style; home remains at `/home` through header control | High for local tested flows |
| Home deck, notifications | RETAINED_TARGET / COMBINED routing | Home component unchanged; home deck E2E; notification return link updated to `/home?notifications=1` | High for deck, structural check for notification link |
| Session, detail sheet, photo locking and card flip | RETAINED_TARGET | Main implementation unchanged; Quick Match E2E and card-flip unit checks | High for local tested flows |
| Maps, feed ownership/deletion, profiles and admin | RETAINED_TARGET | Main implementations preserved; map, feed, profile and admin regression E2E | High for local tested flows |

Validation: `npm run test:precommit` exit 0; TypeScript, policy check, 108 unit-test files / 663 tests, 24 Playwright tests and Vite build passed. `git diff --check` passed.

Playwright uses local synthetic fixtures and mocked APIs. This merge does not establish production database, OAuth or live multi-device correctness; pre-existing application defects are outside this UI integration. No source unique commit is dropped. The source home-removal behavior is deliberately combined with a retained home access path to satisfy the no-feature-loss requirement.
