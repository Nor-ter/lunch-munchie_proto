#!/usr/bin/env bash
# PreToolUse 안전 게이트: 파괴적/비용/보안 명령을 가로채 사람 승인을 요구한다.
# Claude Code가 Bash 툴을 호출할 때 stdin 으로 JSON({tool_input:{command}})을 넘겨준다.
# exit 2 + stderr 메시지 => 실행 차단 & 그 메시지를 Claude에게 전달(승인 요청 유도).
# exit 0 => 통과(자율 실행).

input="$(cat)"
cmd="$(printf '%s' "$input" | (jq -r '.tool_input.command // empty' 2>/dev/null || sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p'))"

# 승인이 필요한 위험 패턴 (확장 정규식)
BLOCK_RE='supabase[[:space:]]+db[[:space:]]+reset|supabase[[:space:]]+functions[[:space:]]+deploy|supabase[[:space:]]+secrets[[:space:]]+set|migration[[:space:]]+(repair|revert)|drop[[:space:]]+(table|schema|database)|truncate[[:space:]]|gcloud[[:space:]].*keys[[:space:]]+(delete|create)|regenerate|rm[[:space:]]+-[^[:space:]]*r|git[[:space:]]+push[[:space:]]+(-f|.*--force)|pnpm[[:space:]]+(add|install)|npm[[:space:]]+(install|i)|(^|[[:space:]])(tee|cp|mv|sed[[:space:]]+-i)[[:space:]].*\.env|>[[:space:]]*\.env'

if printf '%s' "$cmd" | grep -Eiq "$BLOCK_RE"; then
  echo "🚧 안전 게이트: 이 명령은 파괴적·비용·보안 영향이 있어 자동 실행이 차단됐습니다." >&2
  echo "   명령: $cmd" >&2
  echo "   진행하려면 사람에게 이유를 설명하고 명시적 승인을 받은 뒤, 사용자가 직접 실행하거나 승인 확인 후 재시도하세요." >&2
  exit 2
fi

exit 0
