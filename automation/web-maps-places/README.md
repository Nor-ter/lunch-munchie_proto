# Web maps/places harness

`web-follow-login` 하네스와 동형. Claude Code `/loop`에 종속되지 않는 실행 계약이다. AI는 한 Phase의 코드를
구현하고, 하네스의 구조·타입 검사와 실제 브라우저/Edge Function/사람 증거를 모두 통과시킨 뒤에만 다음 Phase로 간다.

```bash
pnpm harness:web-maps status
pnpm harness:web-maps verify 1
pnpm harness:web-maps evidence 1 edge-invoke pass "searchPlaces('스시') → 실제 Google 결과 수신"
```

- 상태·증거는 gitignored `.artifacts/web-maps-places/state.json`에 원자적으로 기록된다.
- 증거는 해당 Phase 파일 fingerprint에 묶인다. 입력 파일이 바뀌면 자동 stale 처리.
- 브라우저 기준 origin은 `http://localhost:5173`(Vite dev). `3000`은 Express/API·낡은 dist.
- 증거 종류:
  - `browser` — preview에서 지도 타일/마커/경로선/탐색 화면 렌더 확인.
  - `edge-invoke` — Places/Directions Edge Function 왕복(실제 Google 데이터 수신) 확인.
  - `db-read` — read-only DB 확인(restaurants upsert 등).
  - `security` — 브라우저 번들에 서버 키 부재 + 웹 키 referrer 제한.
  - `human-mapkey` — Google Cloud 웹 브라우저 키(Maps JS API + referrer 제한) 발급·확인 후에만 pass.
- 라이브 DB write, `.env` 수정, 의존성 설치, 대시보드 변경, commit/push는 하네스 밖 사람 승인 게이트.
