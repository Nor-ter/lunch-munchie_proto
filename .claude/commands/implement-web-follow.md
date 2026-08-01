---
description: 웹(Vite) 팔로우+Google 로그인 포팅을 Phase(0~4) 단위로 실행한다. 설계 근거는 web-follow-login-workflow.md. 인자 없으면 다음 미완 Phase 자동 판정.
---

구현 대상 Phase: **$ARGUMENTS** (비어 있으면 아래 §진행상태 판단으로 다음 미완 Phase 하나만 실행)

## 규칙
- **설계 단일 출처**: `docs/workflow/web-follow-login-workflow.md`. 먼저 이 문서를 읽고 지정 Phase 절만 정확히 따른다. 문서에 없는 결정은 임의로 하지 말고 질문.
- 이식 원본은 mobile: `mobile/services/{followsApi,authApi}.ts`, `mobile/hooks/use*.ts`, `mobile/components/{FollowButton,ProfileStats,FollowerListSheet,AccountBanner,LoginSheet}.tsx`, `mobile/lib/supabase.ts` — **원본을 실제로 읽고** 이식하라(기억으로 재작성 금지). mobile/ 은 절대 수정하지 않는다.
- `.claude/CLAUDE.md`의 스택·안전 게이트·"증상 하나=원인 하나 금지" 원칙 적용.
- **한 번에 한 Phase만.** 새 라이브러리는 문서 §4 Phase 0에 명시된 2종(@supabase/supabase-js, @tanstack/react-query) 외 금지(필요 시 제안 후 대기).
- **상태 판정은 반드시 실행 하네스 사용**: `pnpm harness:web-follow status`. 파일 하나의 존재나 work-log 문자열만으로 완료 판정하지 않는다.
- 안전 게이트(사람 승인/실행): 루트 `.env` 쓰기 · 대시보드 설정(Phase 3 게이트 3건) · 커밋. 게이트에 걸리면 이유를 설명하고 승인을 기다린다.

## 진행상태 판단 (Phase 인자 생략 시)
1. `pnpm harness:web-follow status`를 실행한다.
2. 출력의 `NEXT_PHASE=n`만 신뢰해 Phase 하나를 실행한다. `ALL_DONE`이면 종료한다.
3. Phase 구현 뒤 `pnpm harness:web-follow verify n`을 실행한다.
4. 브라우저/DB/보안/사람 확인은 실제 수행 후에만 `pnpm harness:web-follow evidence n <kind> pass "근거"`로 기록한다.
   입력 파일 fingerprint가 바뀌면 기존 증거는 자동 stale 처리된다.

## Phase 내장 검증 (모든 Phase 공통 — 웹은 자가검증 가능)
1. `pnpm run check` (루트 tsc) 통과.
2. **preview 브라우저 자가 E2E**: `.claude/launch.json`의 `dev`(Vite port 5173)로 서버 기동 →
   해당 Phase의 검증 포인트(문서 §4·§5)를 브라우저에서 직접 확인(read_page/computer/콘솔).
   스크린샷 또는 관찰 결과를 보고에 포함.
3. **DB 실측**: `web-verifier`로 SELECT-only 검증. Supabase CLI 명령 지원을 가정하지 말고 사용 가능한 연결 도구를 preflight한다. 관리자 SELECT 결과는 RLS 행동 검증을 대신하지 않는다.
4. Phase 4는 `web-verifier` → `web-auth-verifier` → `web-security-auditor` 순서로 실행한다. 모바일 전용 `backend-verifier`는 사용하지 않는다.

## 종료 보고 (루프 계약)
사람에게 보고: (a) 이번 Phase 산출물, (b) 검증 결과(브라우저 관찰 + DB 실측 포함), (c) 승인 대기 게이트(있으면 — 있으면 여기서 멈추고 다음 루프 진행 금지), (d) 다음 상태를 정확히 한 줄로:
- `PHASE <n> COMPLETE → NEXT <n+1>` (게이트 대기 없을 때)
- `PHASE <n> BLOCKED — <게이트 내용>` (사람 승인/실행 필요)
- `ALL DONE` (Phase 0~4 전부 완료)
`/loop /implement-web-follow`로 실행 중이라면: BLOCKED 또는 ALL DONE에서 루프를 멈춰라(ScheduleWakeup stop).
