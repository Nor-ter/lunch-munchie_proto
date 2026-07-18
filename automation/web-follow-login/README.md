# Web follow/login harness

이 디렉터리는 Claude Code `/loop`에 종속되지 않는 실행 계약이다. AI는 한 Phase의 코드를 구현하고,
하네스의 구조·타입 검사와 실제 브라우저/DB/사람 증거를 모두 통과시킨 뒤에만 다음 Phase로 간다.

```bash
pnpm harness:web-follow status
pnpm harness:web-follow verify 0
pnpm harness:web-follow evidence 0 browser pass "5173에서 uid 일치 확인"
pnpm harness:web-follow evidence 0 db-read pass "익명 사용자와 프로필 row 확인"
```

- 상태와 증거는 gitignored `.artifacts/web-follow-login/state.json`에 원자적으로 기록된다.
- 증거는 해당 Phase 파일의 fingerprint에 묶인다. 입력 파일이 바뀌면 자동으로 stale 처리된다.
- 브라우저 기준 origin은 `http://localhost:5173`; `3000`은 Express/API다.
- `human-oauth`는 Google 계정 클릭스루와 대시보드 허용 URL 확인 후에만 pass로 기록한다.
- 라이브 DB write, `.env` 수정, 의존성 설치, 대시보드 변경, commit/push는 하네스 밖 사람 승인 게이트다.
