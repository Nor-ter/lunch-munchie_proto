# first-prototype into main integration

- Target-before: `004be2fc413dfca6d77e141487f0c855983fdc41`
- Source: `28c2ef69c02963a7a34c57b72024b435e63ce2fb`
- Merge base: `19aceff21ad23f9b054c675e67835ad447c4d410`
- Source-only work: profile grab E2E stabilization and English prototype conversion.

The resolution imports the English UI and restores the English Home screen with Home, Feed, Quick Match, Saved and Profile tabs. It retains main's newer Quick Match accordion layout, 30-person controls, active-session replacement, restaurant detail sheet, card flip, menu-photo progress and current session contracts. Home-related return links target `/`; Quick Match remains directly reachable at `/lunchie/settings`.

The two untracked `docs/product/feed-first-*.md` files present before integration are user-owned and excluded from the merge commit. No schema, migration or deployment configuration changes are introduced by this integration.

Result-level validation passed: `npm run test:precommit` completed with the policy check, TypeScript, 111 Vitest files / 672 tests, 31 Playwright journeys and a Vite production build. Focused Home/Quick Match navigation, English responsive copy, current session replacement, menu-photo progress and repeated profile-character grab journeys also passed. Playwright uses synthetic fixtures and mocked APIs; production OAuth, database and multi-device behavior remain outside this local proof.
