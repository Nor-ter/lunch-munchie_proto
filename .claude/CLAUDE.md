# CLAUDE.md — 자율 이슈 해결 규칙

이 프로젝트에서 이슈를 조사·수정할 때 **항상** 이 규칙을 따른다. 상세 배경은 `autonomous-issue-resolution-system.md` 참고.

## 스택
- 백엔드: Supabase (Edge Functions `places-search` / `places-autocomplete` / `place-details` / `directions`, Postgres + RLS, Anonymous Auth)
- 앱: Expo / React Native. deep link scheme = `lunchie-munchie`
- 지도: Google Maps Platform. **키 원칙 — RN 앱에 Google 키를 직접 넣지 않는다.** 검색/경로는 서버 키 기반 Edge Function 프록시만 사용. 클라이언트 키(`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`)는 Maps SDK(iOS/Android)용으로만.

## 핵심 원칙
**"증상 하나 = 원인 하나"라고 절대 가정하지 않는다.** 고치고 → 재현하고 → 증상이 남으면 로그 사다리를 한 칸 더 내려간다.

## 6단계 루프 (모든 이슈에 적용)
1. **TRIAGE** — 증상 한 문장 정규화. 증상 태그(`auth`/`rls`/`edge-function`/`client-key`/`build`/`data-state`) 부여. **조사 전 외부 장애 먼저 확인**(status.supabase.com, Google Cloud status). 장애면 디버깅 중단.
2. **RCA LOOP** — 아래 로그 사다리를 순서대로. 한 번에 한 가설만 세우고 최소 수정 후 재현. 증상 남으면 다음 칸.
3. **FIX** — 가장 작은 변경으로 한 원인만. 안전 게이트 항목이면 실행 전 승인 요청.
4. **VERIFY** — 화면-우회 레시피로 백엔드 독립 검증.
5. **GATE** — `security-auditor` 통과 전엔 "완료" 선언 금지.
6. **LOG** — 사이클 회고를 `docs/workflow/google-maps-integration-work-log.md`에 append.

## 로그 사다리 (증상 태그별 조회 순서)
- **저장/쓰기 실패**(`auth`/`rls`/`data-state`): Metro·앱 콘솔 → Postgres Logs(에러코드: `42501`=RLS, NOT NULL 등) → **데이터 상태 직접 SQL 조회**("그 행이 실제로 존재/소유가 맞나") → API/Edge Function Logs.
- **검색/경로**(`edge-function`/`client-key`): Edge Function Logs → Google Cloud API 대시보드. **먼저 경로부터 확정**: add/검색은 서버 키 경로라 클라이언트 키 교체와 무관.
- **빌드**(`build`): xcodebuild/prebuild 전문 → `xcodebuild -showdestinations`로 Xcode↔iOS 런타임 호환 확인. 캐시 삭제는 만능 아님, 우선순위 낮게.

## 멈춤 규칙 (무한루프 방지)
- 같은 층에서 가설 3회 실패 → 사람에게 요약 보고(증상 + 시도 3개 + 각 로그 근거) 후 대기.
- 로그 사다리 최하단까지 원인 불명 → 사람 호출.
- 로그가 안 보임/5xx/타임아웃 → 내 설정 탓으로 오인 말고 status 먼저 확인.

## 화면-우회 검증 레시피
UI 미구현이어도 백엔드 검증:
1. `auth.users`에서 현재 익명 세션 uid 조회.
2. 그 uid를 `author_id`로 `courses` insert (NOT NULL 컬럼 `total_distance` 등 빠짐없이).
3. 기존 `restaurants` 참조하는 `course_items` insert.
4. `xcrun simctl openurl booted "lunchie-munchie://course/<id>/edit"` 로 직접 진입.
5. 테스트 행은 `source='test'` 태깅, 사이클 끝에 정리.
- 웹 프로토타입으로 코스 만들기 금지(인증 흐름 달라 author_id 불일치 재발 위험).

## 안전 게이트 — 실행 전 반드시 사람 승인
`supabase db reset` · `functions deploy` · `secrets set` · 마이그레이션 revert/repair · 테이블 DROP · `gcloud ...keys delete/create` · 키 regenerate · `.env` 쓰기 · `rm -rf` · `git push --force` · 프로덕션 대량 curl.
자율 허용: 읽기/로그·DB 조회, 로컬 테스트, 코드 편집, 로컬 테스트데이터 insert, `functions serve`(로컬).

## 종료 보안 체크리스트 (GATE)
- Google 키 클라이언트/서버 분리 + 각각 API restriction 있는가.
- Application restriction=None & 전체 API 허용된 방치 키 없는가.
- 클라이언트 빌드에 서버 키 노출 없는가(`grep EXPO_PUBLIC_`).
- `.env`, `env.enc` 가 `.gitignore` 에 있는가.
- 미완료 보안 TODO(Android SHA-1 제한 등) 명시 리포트.
