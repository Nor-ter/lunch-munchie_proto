# [Build #1] Consumer copy refinement — latest review

This review supersedes the Home and related copy decisions in the earlier English-copy audit. It applies the user's more direct, less slogan-like wording.

## A. Scope

- Branch confirmed as `first-prototype`; the existing uncommitted working tree was preserved.
- Before implementation, collected 8,980 string/JSX/template candidates across 240 client files, including constants, demo data, accessibility labels and legacy components. These are candidates, not a count of visible UI strings. Internal values were included for exclusion review.
- Audited the presentation web routes: Home, onboarding/auth, Feed/detail/edit, Saved, Profile/Lunchiken, course creation/detail/navigation/sharing, templates, Quick Match/settings/join/lobby/swipe/voting/results/map, tour and admin. Natural existing copy was retained where appropriate.
- This pass changed **31 product-source files and 4 test files**. Full list: [changed files](../../outputs/copy-refinement/changed-files.json).
- Separate Expo `mobile` source remains outside the presentation web implementation. No physical-device verification is claimed.

Review artifacts: [complete pre-edit copy register](../../outputs/copy-refinement/copy-register.md), [source context](../../outputs/copy-refinement/before.json), [copy decisions](../../outputs/copy-refinement/copy-changes.md), [final inventory](../../outputs/copy-refinement/after.json). Snapshots use `.snapshot`, so they are not collected as tests.

## B. Copy changes

| Screen | Current → final |
|---|---|
| Home top | Not sure where to eat? Ask Lunchie. → **Decide where to eat.** |
| Home top | Find your next food adventure. → **Discover where to go next.** |
| LUNCHIE | Let Lunchie help you decide. → **Choose a place together.** |
| MUNCHIE | Explore courses worth sharing. → **Explore food courses.** |
| People selector | **1 / 2 / 4 / 10 / 20 / 30**, with 1 person / 2 people accessibility labels; removed the remaining Just me label |
| Lobby title | 손이에요's lunch session → **Lunch with 손이에요** |
| Lobby subtitle | Host 손이에요 · 1/2 people → **Hosted by 손이에요 · 1 of 2 joined** |
| Capacity | 1 spots left → **1 spot left** |
| Waiting for friends | 1 person joined. Waiting for the rest. → **1 joined. Waiting for 1 more.** |
| Loading | Finding places that suit your taste. → **Finding places you might like.** |
| Swipe | First round / Final round → **Round 1 / Round 2** |
| Swipe | See something you fancy? → **See anything you like?** |
| Menu hint | Tap → View menu → **Tap to view menu** |
| Category | 이탈리안 → **Italian**, at display boundaries only |
| Voting | Waiting for the votes → **Waiting for everyone to vote** |
| Progress | First-round progress / 1 / 2 finished → **Round 1 progress / 1 of 2 finished** |
| Host action | Continue now → **Continue with current votes** |
| Result | Your winner is ready. → **We have a winner.** |
| Result CTA | See the winner → **View details** |
| Result details | Pick again → **Try another** |
| Next stop | After your meal … → **Coffee or dessert next?** |
| Next-stop instruction | Head home to … → **Head to Today's journey on Home to choose your next stop.** |
| Sharing | Create share card → **Create a share card** |
| Saved | All the food adventures you want to try. → **Everything you’ve saved for later.** |
| Saved CTA | Explore Munchie Feed → **Browse Munchie Feed** |
| Feed empty state | Turn a tasty day out into a post. → **Share your latest food find.** |

Action checks:

- The host button calls the existing `/force` action for the current round. It advances using the current votes; request method/body and server behavior are unchanged.
- The result CTA switches from the visible winner summary to `WinnerScreen`, so **View details** describes its action. The floating waiting companion still uses **See the winner**, since it returns from another page to the result flow.
- **Today's journey** is the existing section on Home, not a standalone route. Copy names both the section and Home accurately.
- Session titles are formatted only when they match the known automatic title or default fallback. Custom titles and names are unchanged. The original session name remains in state/API data.

Terminology: Lunchie Munchie, Lunchie, Munchie, Lunchie Mode, Quick Match, Lunchiken and Course Map retain their canonical names. A **course** contains **stops**; **food courses** is the Home description; **Course Map** is the visual map. Use **vote/winner**, **post/Munchie Feed**, **restaurant** for the voting catalogue and details, **place** for search and general choosing, and **spot** for an available place in a group or natural discovery wording. `Solo` remains only in an internal legacy lookup alias/identifiers, not the people selector.

## C. Korean text remaining

[Remaining Korean candidates](../../outputs/copy-refinement/korean-remaining.json): 212 literals, including public asset metadata. The count increases because the display-only category dictionary explicitly contains Korean lookup keys; this does not add Korean visible copy.

- Names, actual place names and user/API content remain unchanged.
- Korean category/tag/dietary keys and compatibility aliases remain as data. Known category labels are displayed in English, including restaurant cards, details, summaries and share cards. Unknown/custom categories are preserved.
- Console messages, comments, tests and non-rendered asset metadata remain. The separate mobile app and backend/shared data were not rewritten.
- The stored automatic `…'s lunch session` pattern remains for API compatibility; it is formatted for display. Admin's descriptive “First-round selections” is grammatical, while round status UI uses Round 1/2.
- Previous English relative-time formatting is preserved.

## D. Existing English cleanup

Removed all visible `food adventure` phrases and the remaining Just me label. Replaced slogan-like onboarding/template/404 lines with direct descriptions. Kept the user's accepted **Lunch is sorted**, **The votes are in**, **Good food is worth sharing**, **Be the first to share**, and Saved empty-state guidance.

## E. Layout

- 360 / 390 / 430 × 844 Chromium checks cover the existing ten main screens and sheets, plus new populated lobby → swipe → waiting → result → result-details flows.
- New tests preserve the Korean username, display Italian for the Korean category, check document and button overflow, and verify the real CTA transitions and unchanged force-request payload.
- Direct screenshot review: 360 Home/waiting, 390 result, 430 details. No CSS/layout redesign was required. Actual word spaces were added to the inline progress count for readable text and accessibility.
- Screenshots: `test-results/copy-refinement.e2e-lobby-voting-and-result-copy-fits-{360,390,430}px/` and the existing `english-ui` screenshot directories.
- Live Maps/Places, real sign-in and physical phones were not verified; API fixtures were local and mocked.

## F. Validation

- TypeScript: PASS.
- Vitest: **666 PASS**, using `--exclude outputs/**` to avoid the pre-existing archived checkout.
- Playwright: **30 PASS**, 0 skipped, 0 flaky. Includes three new viewport flows and the existing 27 tests.
- Production build: PASS; existing bundle-size warning remains.
- `npm run test:precommit`: FAIL only in `outputs/profile-lunchmate-fix` (17 failed suites / 6 failed tests). Current-source tests passed. Archived missing imports/stale assertions and Playwright suites collected by Vitest are unchanged. Its chained Playwright/build steps did not run; those checks were run separately.
- Cloudflare policy and `git diff --check`: PASS. No unrelated assertions were weakened.

## G. Git

`first-prototype` throughout. No new branch, merge, rebase, commit, push or deployment. No backend, DB, migrations, API payload/contract, dependencies or environment-file changes. Existing modifications and `debug.log` preserved. Main agent performed the scope review; no sub-agents used.
