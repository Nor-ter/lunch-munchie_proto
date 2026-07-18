# 웹 팔로우 + Google 로그인 작업 로그

하네스 실행 증거와 승인 게이트 결과를 Phase별로 기록한다. 최종 완료 시에만 `FINAL_GATE: PASS`를 추가한다.

## 현재 상태

- FINAL_GATE: PENDING
- 자동 상태: `pnpm harness:web-follow status`

## 2026-07-15 구현 사이클

- Phase 0: AuthBootstrap 추가, 익명 세션 준비 후 AppContext 렌더, legacy id 최초 승계와 이후 계정 전환 분리.
  브라우저 identity aligned=true, 최근 익명 사용자/프로필 프로비저닝 집계 확인.
- Phase 1: followsApi/authApi와 TanStack Query 훅 8종 포팅. OAuth query/hash 충돌 파서 단위 테스트 포함.
  운영 DB에서 RLS 정책 6개, follow RPC 2개 확인.
- Phase 2: 실 팔로우 카운트·목록 시트·타인 프로필·작성자 진입·self-follow 숨김 구현.
  Playwright route/empty-state 검증 통과. 라이브 follow/unfollow 왕복은 승인 전 미실행.
- Phase 3: 프로필 로그인 배너·Google 시트·충돌 확인 다이얼로그·로그아웃→익명 복귀 구현.
  실제 Google 계정 클릭스루와 대시보드 설정은 사람 게이트.

### UX 보정

- 프로필 본문 로그인 배너 제거. 햄버거 → 프로필 설정의 계정 섹션에서만 로그인/로그아웃 제공.
- 프로필 설정은 `document.body` 포털의 좌우 여백 없는 전체 viewport 폭 바텀시트로 변경.
- OAuth 복귀 URL에 `google_profile=ask`를 붙이고 설정 시트를 자동으로 연다.
- Google 이름/사진 자동 동기화를 제거하고 확인 다이얼로그 동의 후에만 local profile과 `public.users`를 업데이트한다.

### UX 보정 2

- 전체 viewport 폭 설정 시트 변경을 롤백하고 기존 중앙 정렬 `max-width: 430px` 바텀시트로 복원.
- 설정 계정 섹션을 표준 Google 로고 + 흰색 테두리 버튼 디자인으로 변경하고 버튼에서 OAuth를 바로 시작.
- Google 이름/사진 가져오기는 최초 OAuth 복귀 한 번만 묻고 응답을 localStorage에 기록.
- 로그인 후 설정 화면의 수동 “Google 프로필 가져오기” 버튼 제거.

### UX 보정 3

- 로그인된 `Google 계정` 카드를 누르면 연결된 Google 프로필 사진, 이름, 이메일을 확인하는 계정 상세 바텀시트가 열린다.
- 로그아웃 액션은 계정 카드에서 상세 바텀시트로 이동했다.
