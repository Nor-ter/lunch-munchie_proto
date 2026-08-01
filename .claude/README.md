# 설치 가이드

이 `claude-config/` 폴더의 내용을 프로젝트 루트의 `.claude/` 로 옮기면 된다.
(`.claude` 는 이 세션에서 보호 경로라 임시로 `claude-config` 이름으로 만들었다.)

```bash
# 프로젝트 루트에서
mkdir -p .claude
cp -R claude-config/CLAUDE.md      .claude/CLAUDE.md      # 또는 루트에 그대로 둬도 됨
cp -R claude-config/settings.json  .claude/settings.json
cp -R claude-config/hooks          .claude/hooks
cp -R claude-config/agents         .claude/agents
cp -R claude-config/commands       .claude/commands
chmod +x .claude/hooks/safety-gate.sh

# autonomous-issue-resolution-system.md 는 설계 문서라 루트나 docs/ 에 보관
```

최종 구조:
```
프로젝트루트/
├── CLAUDE.md  (또는 .claude/CLAUDE.md)
├── autonomous-issue-resolution-system.md   ← 설계 문서
├── google-maps-integration-work-log.md     ← 기존 로그(LOG 단계에서 계속 append)
└── .claude/
    ├── settings.json
    ├── hooks/safety-gate.sh
    ├── agents/{issue-debugger,backend-verifier,security-auditor}.md
    └── commands/resolve-issue.md
```

## 사용
```
/resolve-issue 순서 변경 후 저장이 실패함
/implement-web-follow
```
그러면 TRIAGE → RCA → FIX → VERIFY → GATE → LOG 6단계가 자동으로 돈다.
파괴적/비용/보안 명령(`db reset`, `deploy`, `secrets set`, 키 삭제 등)만 훅이 가로채 승인을 요구한다.

웹 팔로우/로그인은 먼저 `pnpm harness:web-follow status`로 상태를 확인한다. 최신 Vite 화면은 5173,
Express API는 3000이다. `.claude/commands/implement-web-follow.md`와
`automation/web-follow-login/README.md`가 실행·증거 기록 계약이다.

## 훅 동작 확인
```bash
echo '{"tool_input":{"command":"supabase db reset"}}'  | .claude/hooks/safety-gate.sh; echo "exit=$?"  # exit=2 (차단)
echo '{"tool_input":{"command":"supabase functions serve"}}' | .claude/hooks/safety-gate.sh; echo "exit=$?"  # exit=0 (통과)
```

## 커스터마이즈 포인트
- 위험 명령을 더 막고 싶으면 `hooks/safety-gate.sh` 의 `BLOCK_RE` 에 패턴 추가.
- 자율성을 더 주려면 `BLOCK_RE` 에서 해당 패턴 제거(단, 배포·키·db reset 은 남겨두길 권장).
- 새 증상 유형이 생기면 `CLAUDE.md` 의 "로그 사다리" 에 태그와 조회 순서를 추가.
