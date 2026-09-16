# [Build #1] Whole-product English copy audit

## A. Scope

`first-prototype` 발표용 웹 앱의 전체 route와 공통 component, constants, demo data, error/toast 및 accessibility copy를 검토했다. 이전 Korean → English 작업 위에서 기존 영어의 자연스러움과 일관성을 추가로 다듬은 작업이다.

- Home/Discover, onboarding/sign-in, Munchie Feed/detail/edit, Saved, Profile/other profile.
- Lunchiken room, wardrobe, lunchbox, progress/rewards.
- Course creation/detail/edit/navigation, templates, story sharing, tour pages.
- Lunchie Mode: Quick Match settings, invite/join/lobby, swiping/voting, waiting, result/winner, map.
- Admin 및 라우팅되지 않는 legacy client component도 정적 조사에 포함했다.
- 별도 Expo `mobile` 앱은 이번 발표용 웹 구현 범위 밖이다. 이 앱의 영어화 완료를 주장하지 않는다.

수정 전 239개 파일에서 문자열·JSX·동적 template 후보 8,977개를 수집했다. 내부 값과 asset metadata도 포함한 **조사 후보 수**이며 실제 visible copy 개수가 아니다. 런타임 사용자/API 데이터는 수집·번역하지 않았다.

전체 수집본: [copy register](../../outputs/copy-audit/copy-register.md), [source context JSON](../../outputs/copy-audit/inventory.json).
변경 결정 내역: [copy changes](../../outputs/copy-audit/copy-changes.md).
최종 문자열: [final inventory](../../outputs/copy-audit/final-inventory.json).
이번 추가 작업은 제품 소스 57개와 테스트 24개 파일을 변경했다. 파일 목록: [changed files](../../outputs/copy-audit/changed-files.json). 이전 영어화 작업의 누적 파일 목록은 [기존 보고서](first-prototype-english-ui-review.md) 참조.

## B. Copy changes

수정 전 주요 화면의 현재/제안 copy와 용어 기준을 대화에 제시한 뒤 구현했다. 자연스러운 기존 Save, Cancel, Done, Try again, Discover, Saved, Profile 등은 유지했다.

| 화면 | 기존 | 최종 |
|---|---|---|
| Home | Pick a meal together with Lunchie! | Not sure where to eat? Ask Lunchie. |
| Home | Explore food courses with Munchie! | Find your next food adventure. |
| Onboarding | Lunch picks for you | Your next favourite spot awaits |
| People selector | Solo / 2 / 4 / 10 | 1 / 2 / 4 / 10 |
| Accessibility | 30 people — quick select | Choose 30 people |
| Voting | Waiting for everyone's picks | Waiting for the votes |
| Result CTA | See results 🎉 | See the winner |
| Photo counter | Menu photos 3 photos · 1 selected | Photo 1 of 3 |
| Saved | This Munchie Pick will leave your saved list. | You can save this post again anytime. |
| Room | RUNCHICKEN ROOM | Lunchiken's room |
| Generic error | An unexpected error occurred. | Something went wrong. |
| Delete confirmation | Confirm | Delete |
| Sharing fallback | Featured menu coming soon | Menu unavailable |

용어 기준:

- Lunchie Munchie, Lunchie, Munchie, Lunchie Mode, Quick Match, Lunchiken의 기존 이름을 유지한다. 내부 Lunchmate identifiers는 변경하지 않는다.
- 투표 과정은 **vote**, 결과는 **winner**. 결과 기록/공유 카드의 브랜드 **Lunchie Pick**은 유지한다. 일반 선택 문장에서 자연스러운 pick까지 기계적으로 없애지 않는다.
- **Munchie Feed**는 기능 이름, 개별 게시물은 **post**.
- **course**는 여러 정류장을 잇는 코스, **Course Map**은 시각화된 지도. 검색/추가 대상은 **place**, 코스 안의 항목은 **stop**.
- **restaurant**는 Quick Match의 식당과 상세 정보, **spot**은 발견을 권하는 짧은 소개 문구에서 사용한다.
- 호주/글로벌 영어의 favourite, customisable, straight away 등을 사용한다. 제목은 sentence case를 기본으로 하되 기존 장식용 대문자 배지는 유지한다.
- XP로 표시를 통일하고, person/people, stop/stops, photo/photos 등은 작은 `countLabel` helper로 처리한다. i18n dependency나 구조는 추가하지 않았다.

화면에 노출되는 demo caption/bio는 샘플임을 사전에 알리고 반복적인 “Visited … Loved …” 표현을 다듬었다. 원래 사람 이름, restaurant/place 이름 및 실제 사용자 caption/course name은 유지했다. 저장된 Quick Match 결과를 실제 방문 기록처럼 설명하지 않도록 안내도 정정했다.

## C. Korean text remaining

[최종 한글 literal 목록](../../outputs/copy-audit/korean-literals.json)은 client source 158개와 public asset metadata 36개, 총 194개를 포함한다. 주석과 test description은 별도 검색 결과에 남아 있다.

- **사용자/data 보존:** 지민 등 이름, 성수동 등 지역, 실제 place names. 런타임 사용자 게시물·이름·해시태그는 번역하지 않는다.
- **내부 호환 값:** 맛집/혼밥 등 태그, dietary/category alias와 사진 검색용 lookup 값. UI display label만 영어로 표시하며 API 값은 유지한다.
- **개발자 자료:** console 메시지, 주석, test description, 한글 데이터 보존/이전 UI 부재를 확인하는 fixture와 assertion.
- **의도적 제외:** 화면에서 읽지 않는 asset manifest 설명, 별도 mobile 앱, backend/shared/data 및 문서.

이전 작업의 영어 relative-time 처리를 유지했다. 정적 문구 재검색과 mocked UI의 한글 표시 검사를 수행했다. 사용자 데이터에서 한글이 표시되는 것은 허용한다.

## D. Layout

- 360 / 390 / 430 × 844 Chromium: Home, Feed, Saved, Profile, room, Quick Match settings, course creation, templates, onboarding, empty lobby와 feed/profile sheets 확인.
- 기존 Playwright는 390px에서 실제 fixture 기반 lobby, voting/deck, photo progress, result transition, session replacement도 확인한다.
- document overflow/한글 노출 검사 및 Profile Save 버튼이 bottom navigation 위에 있는지 검증했다.
- 360 Home, 390 settings, 430 create 화면의 스크린샷을 직접 확인했다. 이번 copy polish에서 CSS/layout 변경은 추가하지 않았다. 이전 번역 작업의 Profile sheet 하단 padding 조정은 유지했다.
- 실기기, 실제 Google sign-in, live Maps/Places와 production API는 검증하지 않았다. 로컬 지도는 unavailable 상태로 확인했다.

## E. Validation

- TypeScript: PASS.
- Current-source Vitest: 662 tests 검증. 전체 실행의 660 PASS 뒤 마지막 XP 문구 기대값 2건을 수정했고, 해당 두 파일의 68 tests가 모두 PASS했다. `--exclude 'outputs/**'`를 사용했다.
- Playwright: 27 PASS, 0 skipped, 0 flaky.
- Production build: PASS. 기존 bundle-size warning은 유지된다.
- `npm run test:precommit`: FAIL. 실패한 17개 suite / 6개 test는 모두 기존 `outputs/profile-lunchmate-fix` 보관본에 속한다. 현재 소스는 실패하지 않았다. 보관본의 누락 import, 이전 copy assertion, Playwright suite의 Vitest 수집 문제이며 수정 범위 밖이다. 보관본이나 assertion을 완화하지 않았다. 이 체인의 Playwright/build 단계는 실행되지 않았으므로 별도 통과 결과를 위에 기록했다.
- 조사용 baseline은 `.snapshot` 데이터 확장자로 저장해 테스트 수집 대상에서 제외했다.
- Cloudflare policy와 `git diff --check`: PASS. 검토는 메인 에이전트가 수행했고 sub-agent는 사용하지 않았다.

## F. Git

Branch = `first-prototype`. 새 branch, merge/rebase, commit/push, deployment를 하지 않았다. backend/DB/migration/shared contract/dependency/env 변경 없음. 기존 작업 파일과 `debug.log`를 보존했다. 화면 검토용 로컬 URL: http://localhost:5173/.
