---
description: 팔로우 기능을 Phase(0~5) 단위로 순차 구현한다. 설계 근거는 follow-feature-workflow.md.
argument-hint: <Phase 번호 0~5, 생략 시 다음 미완 Phase>
---

구현 대상 Phase: **$ARGUMENTS** (비어 있으면 아래 §진행상태 판단으로 다음 미완 Phase 하나만 실행)

## 규칙
- **설계 단일 출처**: `docs/workflow/follow-feature-workflow.md`. 먼저 이 문서를 읽고, 지정 Phase 절만 정확히 따른다. 문서에 없는 결정은 임의로 하지 말고 질문.
- `.claude/CLAUDE.md` 의 스택·안전 게이트·"증상 하나=원인 하나 금지" 원칙을 그대로 적용한다.
- **한 번에 한 Phase만.** 다음 Phase로 넘어가지 말고, 끝나면 검증 결과와 함께 멈춰 사람 확인을 기다린다.
- 새 라이브러리 도입 금지(필요 시 제안 후 대기).

## 진행상태 판단 (Phase 인자 생략 시)
아래 산출물 존재 여부로 다음 미완 Phase를 정한다:
- Phase 0: `supabase/migrations/*follow_rls_and_rpc.sql`
- Phase 1: `mobile/types/db.ts` 의 `UserFollow`, `shared/schema.ts` 의 `userFollows`
- Phase 2: `mobile/services/followsApi.ts`
- Phase 3: `mobile/hooks/useToggleFollow.ts` (및 useFollow* 일습)
- Phase 4: `mobile/components/FollowButton.tsx` 등 3종
- Phase 5: work-log 에 검증 사이클 append

## Phase별 작업 (문서 §7 프롬프트를 근거로 실행)

### Phase 0 — 마이그레이션 (RLS + 트리거 + RPC)
- 문서 §5 전체를 읽고 `supabase/migrations/<현재타임스탬프>_follow_rls_and_rpc.sql` 생성.
- §5.1(RLS 6개) + §5.2(handle_new_user 트리거) + §5.2.1(backfill) + §5.3(follow/unfollow RPC) SQL 포함.
- 참고: `supabase/migrations/20260707000000_commit_course_items_rpc.sql`, `..._remote_schema.sql`.
- ⚠️ **적용 명령 실행 금지**(`db push`/`db reset`/원격 적용은 안전 게이트). 파일만 만들고,
  SQL Editor 검증 쿼리(정책 존재·RPC 멱등·자기팔로우 차단)를 사람에게 제시한 뒤 대기.

### Phase 1 — 타입 동기화
- 문서 §1.1, §2 근거. `mobile/types/db.ts` 에 `User`, `UserFollow` 추가 + `shared/schema.ts` 에 `userFollows` drizzle 정의를 remote_schema 와 1:1 동기화.
- 참고: `mobile/types/db.ts`, `shared/schema.ts`. 타입체크 통과까지.

### Phase 2 — service layer
- 문서 §6.1 근거. `mobile/services/followsApi.ts` 순수함수 6종 구현(followUser/unfollowUser/getIsFollowing/getFollowCounts/getFollowers/getFollowing).
- RPC 호출 + FK 없음 → `itemsApi.getItems` 식 2쿼리 조인 + orphan 제외 + count 집계.
- 참고: `mobile/services/itemsApi.ts`, `coursesApi.ts`, `mobile/lib/supabase.ts`.

### Phase 3 — hooks
- 문서 §6.2 근거. `mobile/hooks/` 에 useIsFollowing/useFollowCounts/useFollowers/useFollowing/useToggleFollow.
- useToggleFollow: useMutation + 낙관적 업데이트 + 실패 롤백 + 성공 시 queryKey 무효화.
- 참고: `mobile/hooks/useItems.ts`, `useCourse.ts`.

### Phase 4 — UI
- 문서 §4 근거. NativeWind 로 `FollowButton.tsx`, `ProfileStats.tsx`, `FollowerListSheet.tsx`.
- 참고: `mobile/components/` 기존 스타일, `mobile/app/course/[id]/edit.tsx` 훅 사용 패턴.

### Phase 5 — 검증
- `backend-verifier` 서브에이전트로 문서 §8.1 화면-우회 SQL 레시피 수행.
- `security-auditor` 서브에이전트로 GATE. **PASS 전 완료 선언 금지.**
- 결과를 `docs/workflow/google-maps-integration-work-log.md` 에 append.

## 종료 보고
사람에게: (a) 이번 Phase 산출물, (b) 검증 결과, (c) 승인 대기 중인 게이트 명령(있으면), (d) 다음 Phase 번호.
