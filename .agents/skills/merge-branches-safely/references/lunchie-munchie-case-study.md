# Lunchie Munchie case study

## Integration boundary

The historical merge commit `8fe20f88` integrated source `sk_branch` (`fe34f347`) into target-before `8dcce36f`, producing `merge4_v2`. The source already contained the `merge4_v1` feature line, so several features arrived transitively rather than being authored directly on `sk_branch`.

## Transitive features observed through source

- `87a3e6ec`: display user name and the user's feed on Profile.
- `e892044f`: emphasize the selected restaurant on Course map and redirect to user Profile.
- `c5c53418`: preserve feed-list scroll location.
- `d6c2f0c6`: Saved page map/list toggle.

Classify these as `IMPORTED_TRANSITIVE` when the result and validation support the feature. Phrase the origin as `merge4_v1 -> sk_branch -> merge4_v2`, not simply “from sk_branch.”

## Direct source work

- `1c658ed8`: lunchmate room and costume updates.
- `fe34f347`: XP and level update.

Check data consumers before calling the XP work a direct import; a result that adapts both target and source contracts may be `COMBINED`.

## Protected target behavior

For the profile integration, the requested target-side invariants were:

- keep the left-side gimbap level indicator;
- keep the bento-styled “My Lunchbox” design;
- keep the hanger icon for the Lunchmate control.

Verify these as behavior and visual contracts across the relevant components. If the result matches target-before for the protected paths while source differs, classify them as `RETAINED_TARGET`.

## Lessons

- Inspect ancestry before attributing features to a branch.
- Track protected UI as named invariants, not only files.
- Treat field renames such as `lunchmateXp` to `lunchmateTotalXp` as cross-file migrations.
- Search for duplicate definitions after an apparently clean merge.
- Validate asset manifests, tests, type checks, and production builds independently.
