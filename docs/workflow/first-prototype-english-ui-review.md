# [Build #1] Prototype English UI — review handoff

## Scope

- Branch: first-prototype. No branch creation, merge, rebase, commit, push or deployment.
- Presentation web prototype (client): home, onboarding/auth, feed/detail/edit, saved, profile/other profile, Lunchiken room/wardrobe/lunchbox, course creation/detail/navigation, templates/story sharing, Lunchie settings/lobby/invite/swipe/results/map, tour pages and admin UI. Legacy client pages were included in the string scan.
- Separate Expo app (mobile) was inventoried but is outside the presentation web implementation; its Korean UI remains.
- Backend, shared contracts, DB, migrations, dependencies, environment files and user data are unchanged. Existing untracked debug.log is preserved.

## Copy decisions

| Korean | English |
|---|---|
| 저장 / 저장한 코스 | Save / Saved courses |
| 저장 navigation | Saved |
| 취소 / 완료 / 다시 시도 | Cancel / Done / Try again |
| 코스 만들기 / 코스맵 | Create course / Course Map |
| 한줄평 | Quick review |
| 프로필 / 방 꾸미기 / 옷장 | Profile / Decorate room / Wardrobe |
| 런치킨 / 런치메이트 character UI | Lunchiken |
| 런치 / 빠른 매칭 | Lunchie / Quick Match |
| 1일 전 / 2주 전 | 1d ago / 2w ago |

Existing Lunchie Munchie, Lunchie Mode, Munchie Feed and Course Map naming is retained. Internal Lunchmate identifiers and filenames are unchanged. Australian English follows the Melbourne context.

Mock course captions, sample post captions, author bios and preset/template descriptions were translated as demo copy. Person names, handles and real place names were preserved. Custom user hashtags are preserved in editors and share templates. Known catalogue tag labels and dietary controls use English display mappings while submitting the original values. Korean API error text uses an English fallback at display boundaries. Admin learning status copy is selected by its existing status code. No localisation dependency or runtime translation architecture was introduced.

## Korean remaining

The first AST scan found 2,086 Korean string/text occurrences (1,581 unique strings), including data and internal keys. The final client scan found 158 remaining literals, categorised below. This count excludes comments and tests.

- Data: demo names (지민, 제니, 민수, 하늘, 도윤, 서아, 김민지); actual names/locations (온더보더 성수점, 어니언 성수, 대림창고, 성수동, 연남동). User/API captions, names and place content are not translated.
- Compatibility keys: foodTags values/legacy aliases, dietary arrays and aliases, foodPhotos category lookup keys, default category preferences and classification values. English labels are applied only at UI boundaries.
- Developer material: console messages, comments, test descriptions, Korean user-data fixtures and assertions that verify preservation or absence of retired UI.
- Intentionally outside web scope: mobile app, backend/shared data and mappings, asset manifests and documentation. No mobile UI pass is claimed.

Detailed read-only inventory and scan artifacts: outputs/english-ui/inventory.json, strings.json, remaining-final.json.

## Layout

- Automated Chromium checks at 360 / 390 / 430 × 844: home, feed, saved, profile, room, Quick Match settings, course creation, templates, onboarding and empty lobby; feed filters and profile settings sheets also captured.
- Assertions check document language, visible Korean UI, document horizontal overflow and access to the profile Save button above bottom navigation.
- Visual samples checked: 360px Quick Match and profile settings, 390px course creation and feed filters, 430px profile settings.
- Only layout change: extra scroll padding below the profile settings content, keeping Save reachable after English text wraps.
- Local Google Maps is not configured; maps were verified in their unavailable/loading UI states. Live maps/Places, real Google sign-in, production backend behavior and physical phones were not verified.
- Screenshots: test-results/english-ui.e2e-English-prototype-screens-fit-{360,390,430}px/.

## Validation

- TypeScript: PASS (npm run check).
- Vitest: PASS, 661 tests, with --exclude 'outputs/**' to separate the existing archived checkout.
- Production build: PASS (npm run build). Existing large-bundle warning remains.
- Playwright: PASS, 27 tests (24 existing flows + 3 viewport tests). No skipped or flaky tests.
- npm run test:precommit: FAIL in Vitest because outputs/profile-lunchmate-fix contains an existing archived checkout. All reported failed files are under that directory: stale UI assertions, missing imports/files and Playwright suites collected by Vitest. No unrelated assertions, archived files or test configuration were weakened/changed. Its chained Playwright/build stages did not run; they were run separately.
- Cloudflare policy: PASS. git diff --check: PASS. No backend/API/schema/env changes.

## Changed files

### Product source (106)

- client/index.html
- client/src/components/MenuItemDetail.tsx
- client/src/components/TabBar.tsx
- client/src/components/admin/AdminPhotoReviewPanel.tsx
- client/src/components/auth/AccountBanner.tsx
- client/src/components/auth/AuthBootstrap.tsx
- client/src/components/auth/LoginSheet.tsx
- client/src/components/course/CourseMap.tsx
- client/src/components/feed/FeedRadiusMap.tsx
- client/src/components/follow/FollowButton.tsx
- client/src/components/follow/FollowerListSheet.tsx
- client/src/components/follow/ProfileStats.tsx
- client/src/components/lunchie/LunchieWaitingCompanion.tsx
- client/src/components/lunchie/QuickMatchRestaurantDetailSheet.tsx
- client/src/components/lunchie/SessionManagementMenu.tsx
- client/src/components/lunchie/WinnerShareCard.tsx
- client/src/components/map/CourseMap.tsx
- client/src/components/munchie/FoodieBuddy.tsx
- client/src/components/munchie/FruitCharacter.tsx
- client/src/components/munchie/LunchboxBottomSheet.tsx
- client/src/components/munchie/LunchkinCharacter.tsx
- client/src/components/munchie/LunchmateCharacterRenderer.tsx
- client/src/components/munchie/LunchmateLevelUpModal.tsx
- client/src/components/munchie/LunchmateProgressSheet.tsx
- client/src/components/munchie/LunchmateWardrobePanel.tsx
- client/src/components/munchie/PhotoCropEditor.tsx
- client/src/components/munchie/RestaurantDetailSheet.tsx
- client/src/components/munchie/ShareTemplateInfoSheet.tsx
- client/src/components/munchie/SkinPicker.tsx
- client/src/components/munchie/TemplateInfoSheet.tsx
- client/src/components/munchie/TemplateLayers.tsx
- client/src/components/munchie/TemplatePhotoPositionEditor.tsx
- client/src/components/munchie/UnifiedMunchieCard.tsx
- client/src/components/saved/SavedMunchieMap.tsx
- client/src/components/share/FoodCourseMap.tsx
- client/src/components/share/templates/DarkStoryTemplate.tsx
- client/src/components/share/templates/FoodCourseDarkTemplate.tsx
- client/src/components/share/templates/ListTemplate.tsx
- client/src/components/share/templates/MinimalTemplate.tsx
- client/src/components/share/templates/PngTemplate.tsx
- client/src/components/share/templates/StatsCardTemplate.tsx
- client/src/components/share/templates/StoryTemplate.tsx
- client/src/components/share/templates/StravaClassicTemplate.tsx
- client/src/constants/courseTheme.ts
- client/src/constants/coursemapTemplates.ts
- client/src/constants/foodTags.ts
- client/src/constants/lunchboxFoods.ts
- client/src/constants/lunchmateItems.ts
- client/src/constants/lunchmateLevelIcons.ts
- client/src/constants/lunchmateRoomThemes.ts
- client/src/constants/shareTemplates.ts
- client/src/constants/skins.ts
- client/src/contexts/AppContext.tsx
- client/src/data/demoAuthors.ts
- client/src/data/driveFeed.ts
- client/src/data/mockCourse.ts
- client/src/hooks/useLunchmateFlow.ts
- client/src/hooks/useProfileFeed.ts
- client/src/lib/courseMapSync.ts
- client/src/lib/feedApi.ts
- client/src/lib/imageUtils.ts
- client/src/lib/lobbyPresentation.ts
- client/src/lib/lunchieShare.ts
- client/src/lib/quickMatch.ts
- client/src/lib/restaurantPresentation.ts
- client/src/pages/AdminDashboardPage.tsx
- client/src/pages/AuthCallbackPage.tsx
- client/src/pages/AuthLoginPage.tsx
- client/src/pages/CourseDetailPage.tsx
- client/src/pages/CourseFeedsPage.tsx
- client/src/pages/CourseNavigatePage.tsx
- client/src/pages/ExplorePage.tsx
- client/src/pages/FeedDetailPage.tsx
- client/src/pages/FeedEditPage.tsx
- client/src/pages/FoodieRoomPage.tsx
- client/src/pages/HomePage.tsx
- client/src/pages/LunchieMapPage.tsx
- client/src/pages/LunchieResultsPage.tsx
- client/src/pages/LunchieSettingsPage.tsx
- client/src/pages/LunchieSwipePage.tsx
- client/src/pages/MetricsPage.tsx
- client/src/pages/MunchieFeedPage.tsx
- client/src/pages/OnboardingPage.tsx
- client/src/pages/OtherProfilePage.tsx
- client/src/pages/PlaceExplorePage.tsx
- client/src/pages/ProfilePage.tsx
- client/src/pages/RestaurantDetailPage.tsx
- client/src/pages/SavedPage.tsx
- client/src/pages/SessionJoinPage.tsx
- client/src/pages/SessionLobbyPage.tsx
- client/src/pages/StorySharePage.tsx
- client/src/pages/TemplateDetailPage.tsx
- client/src/pages/TemplatesBrowsePage.tsx
- client/src/pages/TourMapPage.tsx
- client/src/pages/TourModePage.tsx
- client/src/pages/course/CourseDetailPage.tsx
- client/src/pages/course/CourseFeedsPage.tsx
- client/src/pages/course/CoursemapCreatePage.tsx
- client/src/services/authApi.ts
- client/src/services/edgeFunctions.ts
- client/src/services/followsApi.ts
- client/src/services/restaurantsApi.ts
- client/src/services/sessionApi.ts
- client/src/utils/lunchmateProgress.ts
- client/src/lib/dietaryLabel.ts
- client/src/lib/uiErrorMessage.ts

### Tests

- client/src/components/lunchie/LunchieWaitingCompanion.test.ts
- client/src/components/munchie/LunchboxBottomSheet.test.ts
- client/src/components/munchie/LunchmateCharacterRenderer.test.ts
- client/src/components/munchie/LunchmateRoomRenderer.test.ts
- client/src/components/munchie/LunchmateWardrobePanel.test.ts
- client/src/components/munchie/RestaurantDetailSheet.presentation.test.ts
- client/src/components/munchie/UnifiedMunchieCard.ownership.test.ts
- client/src/components/saved/SavedMunchieMap.test.ts
- client/src/contexts/AppContext.anonymousIdentity.test.ts
- client/src/hooks/useLunchmateProfileMotion.test.ts
- client/src/lib/courseMapSync.test.ts
- client/src/lib/lobbyPresentation.test.ts
- client/src/lib/lunchieShare.test.ts
- client/src/lib/quickMatch.test.ts
- client/src/pages/AuthPages.test.ts
- client/src/pages/FeedDetailPage.navigation.test.ts
- client/src/pages/LunchieMapPage.test.ts
- client/src/pages/LunchieSettingsPage.presentation.test.ts
- client/src/pages/LunchieSwipePage.photoSource.test.ts
- client/src/pages/LunchieSwipePage.recovery.test.ts
- client/src/pages/LunchieSwipePage.unified.test.ts
- client/src/pages/MunchieFeedPage.pagination.test.ts
- client/src/pages/MunchieFeedPage.search.test.ts
- client/src/pages/ProfilePage.profileSync.test.ts
- client/src/pages/SavedPage.presentation.test.ts
- client/src/pages/SessionJoinPage.ux.test.ts
- client/src/pages/course/CourseDetailPage.actions.test.ts
- client/src/pages/course/CourseDetailPage.editing.test.ts
- client/src/pages/course/CourseDetailPage.likeSync.test.ts
- client/src/pages/course/CourseDetailPage.map.test.ts
- client/src/pages/course/CoursemapCreatePage.places.test.ts
- e2e/admin-photo-review.e2e.spec.ts
- e2e/auth-boundaries.e2e.spec.ts
- e2e/feed-deletion.e2e.spec.ts
- e2e/feed-filters.e2e.spec.ts
- e2e/home-quick-match-deck.e2e.spec.ts
- e2e/lunchie-map.e2e.spec.ts
- e2e/profile-character-grab.e2e.spec.ts
- e2e/profile-feed-sync.e2e.spec.ts
- e2e/quick-match.e2e.spec.ts
- client/src/lib/uiErrorMessage.test.ts
- e2e/english-ui.e2e.spec.ts

### Handoff documentation

- docs/workflow/first-prototype-english-ui-review.md
- docs/workflow/google-maps-integration-work-log.md

## Review URL

http://localhost:5173/ (local Vite server; not deployed).
