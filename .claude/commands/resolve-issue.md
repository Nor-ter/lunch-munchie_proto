---
description: 증상 한 줄을 받아 6단계 자율 이슈 해결 루프를 실행한다
argument-hint: <증상 한 문장>
---

증상: **$ARGUMENTS**

아래 6단계 루프를 실행한다. `CLAUDE.md` 규칙을 따르고, 각 단계 결과를 간단히 보고한다.

## 1. TRIAGE
- 증상을 한 문장으로 정규화하고 태그 부여(`auth`/`rls`/`edge-function`/`client-key`/`build`/`data-state`).
- **외부 장애 선제 확인**: status.supabase.com / Google Cloud status. 장애면 여기서 멈추고 사람에게 통지.

## 2. RCA LOOP
- `issue-debugger` 서브에이전트를 호출해 로그 사다리를 따라 근본원인을 파게 한다.
- 결과가 "미해결(3회 실패/원인 불명)"이면 사람에게 요약 보고 후 대기.

## 3. FIX
- 근본원인마다 가장 작은 변경으로 하나씩 수정.
- 수정 명령이 안전 게이트 항목(`db reset`/`deploy`/`secrets set`/키 삭제·재발급/`.env` 쓰기 등)이면 **실행 전 사람 승인 요청**. (훅이 자동 차단하지만 그 전에 이유를 설명하고 승인을 구할 것.)

## 4. VERIFY
- `backend-verifier` 서브에이전트로 화면-우회 검증(SQL insert + 딥링크) 수행.
- 증상이 아직 남으면 2번으로 돌아가 로그 사다리 한 칸 더.

## 5. GATE
- `security-auditor` 서브에이전트를 호출. **PASS 전에는 "완료" 선언 금지.**
- BLOCK이면 차단 사유를 리포트하고, 필요한 조치는 사람 승인 대상으로 정리.

## 6. LOG
- 이번 사이클을 `docs/workflow/google-maps-integration-work-log.md`에 append:
  `증상 → 확인한 원인 층들 → 해결 → 남은 TODO` 형식.

## 최종 보고
사람에게: (a) 무엇이 원인이었나, (b) 무엇을 고쳤나, (c) 승인 대기 중인 항목, (d) 남은 보안/미완료 TODO.
