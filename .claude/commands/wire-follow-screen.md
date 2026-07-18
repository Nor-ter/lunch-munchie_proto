---
description: 팔로우 컴포넌트를 실제 화면(탭바+프로필)에 배선한다. Phase(0~5) 단위. 설계 근거는 follow-screen-wiring-workflow.md.
argument-hint: <Phase 번호 0~5, 생략 시 다음 미완 Phase>
---

구현 대상 Phase: **$ARGUMENTS** (비어 있으면 아래 §진행상태 판단으로 다음 미완 Phase 하나만 실행)

## 규칙
- **설계 단일 출처**: `docs/workflow/follow-screen-wiring-workflow.md`. 먼저 이 문서를 읽고 지정 Phase 절만 정확히 따른다. 문서에 없는 결정은 임의로 하지 말고 질문.
- `.claude/CLAUDE.md` 의 스택·안전 게이트·"증상 하나=원인 하나 금지" 원칙 적용.
- **한 번에 한 Phase만.** 끝나면 검증 결과 + 다음 Phase 번호를 보고하고 멈춰 사람 확인을 기다린다.
- **새 라이브러리 금지.** 네비게이션은 **Expo Router만**(React Navigation 직접 config 금지).
- **데이터 현실 원칙(문서 §2)**: 웹 `ProfilePage.tsx` 는 참고용 mock. 실 `public.users` 컬럼에 없는 값(이모지/스와이프 스탯/카테고리/식단)에 배선하지 말고 defer(숨김/플레이스홀더). DB 변경이 필요하면 마이그레이션 = 안전 게이트 → 제안 후 대기.

## 진행상태 판단 (Phase 인자 생략 시)
- Phase 0: `mobile/hooks/useUser.ts` + `followsApi.getUser`
- Phase 1: `mobile/app/(tabs)/_layout.tsx`
- Phase 2: `mobile/components/ProfileView.tsx`
- Phase 3: `mobile/app/(tabs)/profile.tsx` + `mobile/app/profile/[id].tsx`
- Phase 4: 코스 작성자 탭 → 프로필 이동 배선 + 시트 행 탭 이동
- Phase 5: work-log 에 배선 검증 사이클 append

## Phase별 작업 (문서 §5 프롬프트를 근거로 실행)

### Phase 0 — 단일 유저 조회
- 문서 §2, §4.1. `followsApi.getUser(userId)` + `hooks/useUser.ts`(queryKey ['user',userId]).
- 참고: `mobile/services/coursesApi.ts`, `mobile/hooks/useCourse.ts`, `mobile/types/db.ts`.

### Phase 1 — 탭바 도입 (Expo Router Tabs)
- 문서 §3.1. `app/(tabs)/_layout.tsx` + '프로필' 탭 필수, 나머지 탭은 자리만.
- 톤 참고: `client/src/components/TabBar.tsx`. 구현은 Expo Router `Tabs`. 참고: `mobile/app/_layout.tsx`.

### Phase 2 — ProfileView 컴포넌트
- 문서 §2, §3.2, §4.2. `components/ProfileView.tsx`(props userId): 헤더(useUser) + FollowButton + ProfileStats + FollowerListSheet(visible/mode 소유).
- defer 항목 빈 배선 금지. 톤 참고: `client/src/pages/ProfilePage.tsx`. 데이터는 실 스키마.
- 참고: `mobile/components/{ProfileStats,FollowButton,FollowerListSheet,AddRestaurantSheet}.tsx`, `mobile/constants/theme.ts`.

### Phase 3 — 화면 라우트 배선
- 문서 §3.1. `(tabs)/profile.tsx`(내 uid=useCurrentUserId) + `profile/[id].tsx`(useLocalSearchParams) 둘 다 `<ProfileView>` 공유.
- 참고: `mobile/app/course/[id]/edit.tsx`, `mobile/hooks/useCurrentUserId.ts`.

### Phase 4 — 진입 동선
- 문서 §3.3. (1) 코스 작성자 탭 → `/profile/<author_id>`, (2) FollowerListSheet 행 탭 → `/profile/<id>`.
- 참고: `mobile/app/course/[id]/edit.tsx`, `mobile/components/FollowerListSheet.tsx`.

### Phase 5 — 검증
- 문서 §6. 시뮬레이터 실제 왕복 확인(스크린샷/로그) → `backend-verifier`(UI 경로가 같은 RPC 타는지) → `security-auditor` GATE(PASS 전 완료 금지) → work-log append.

## 종료 보고
사람에게: (a) 이번 Phase 산출물, (b) 검증 결과, (c) 승인 대기 게이트(있으면), (d) 다음 Phase 번호.
