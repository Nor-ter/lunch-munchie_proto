# 🍱 Lunchie Munchie — Unified Prototype

> 오늘 무엇을 먹을지 빠르게 결정하고, 맛집 코스를 만들고 공유하는 통합 프로토타입

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)](https://vite.dev/)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express)](https://expressjs.com/)
[![Vitest](https://img.shields.io/badge/Vitest-2-6E9F18?logo=vitest)](https://vitest.dev/)

## 현재 상태

- 기준 브랜치: `tl_branch`
- 최신 기능 기준: `tl_branch` 최신 HEAD (`2026-07-13`)
- 개발 단계: 웹 중심 통합 프로토타입
- 검증 상태: TypeScript 검사, 테스트 17개, 프로덕션 빌드 통과
- 데이터 모드: PostgreSQL 연결 또는 mock/in-memory 폴백
- 주요 미완료 사항: 실제 운영 DB·인증·배포 환경 검증, UI 전체 E2E 테스트, 번들 최적화

## 제품 구성

Lunchie Munchie는 두 가지 핵심 경험을 하나의 앱으로 제공합니다.

| 모드 | 목적 | 주요 흐름 |
|---|---|---|
| **Lunchie Mode** | 혼자 또는 그룹이 빠르게 식당 결정 | 설정 → 초대/참여 → 스와이프 → 그룹 결정 → 결과/길찾기 |
| **Munchie Mode** | 맛집 코스 탐색·제작·공유 | 피드 → 코스 상세 → 편집 → 템플릿/스킨 적용 → 저장·공유 |

## 주요 기능

### Lunchie Mode — Quick Match

- 솔로 및 그룹 세션 생성
- 초대 링크·토큰을 통한 세션 참여
- 참여 인원 제한, 준비 상태, 마감 시간 관리
- 식단, 예산, 거리, 카테고리 등 추천 조건 설정
- 음식점 카드 스와이프와 체류시간(`dwell_ms`) 이벤트 수집
- 실제 덱 크기를 반영한 예선 완료 판정
- 추천 엔진 Top 2 기반 대각선 듀얼 결승 UI
- `둘 다 별로 · 다른 곳` 탈출구와 재추천
- 그룹 least-misery 집계와 Top 2 결승 투표
- 3지선다, `REROLL`, `NO_CONSENSUS` 합의 실패 처리
- 결과 화면, Google 길찾기, 결과 공유
- 길찾기 후 복귀해도 우승 결과 유지
- 초대 세션 API timeout 조정 및 세션 안정성 개선

### 추천 엔진 및 결정 모델

- 맥락 기반 추천 컨텍스트와 인텐트→카테고리 필터
- 아이템 피처와 사용자 취향 벡터 기반 스코어링
- 단기 노출 피로도와 재소비 포만감/갈망 모델
- 음식 연쇄 및 occasion 시퀀스 반영
- Contextual Bandit과 Thompson Sampling
- 그룹 least-misery 취향 합성
- 듀얼 선택을 pairwise 고신뢰 선호 신호로 학습
- `CHOOSE`, `SURVEY`, `COURSE_SAVE`, `REROLL`, `ABANDON`, `WINNER` 이벤트 지원
- 결정적 A/B 배정, feature 효과 분석, 엔진 메커니즘 및 데이터 신뢰성 지표

### 오늘의 여정

- 우승 결과를 오늘의 여정 시작점으로 저장
- `GET /api/journey/today`에서 오늘의 스톱과 다음 스톱 제안 제공
- DB 우선 조회 후 메모리 이벤트 폴백
- 홈 화면의 `오늘의 여정` 카드
- 추천 시간대에 맞는 기본 인텐트와 카테고리 추천

### Munchie Feed

- Munchie 전용 피드와 게시물 작성 화면
- 코스맵·작성자·식당 정보가 포함된 피드 카드
- Foodie Buddy 프로필 표현
- 식당 상세 바텀시트
- 코스 템플릿 카드와 스킨 프레임
- 홈·탐색·저장·프로필 화면 간 통합 내비게이션

### 코스맵 탐색·편집

- 코스 목록, 상세 정보, 장소 및 경로 표시
- 코스 스톱 순서 기반 지도 좌표·경로 동기화
- 단계별 컬러 라인과 마커, 흰색 외곽선
- 태그별 공통 컬러 팔레트
- 드래그 앤 드롭 순서 변경
- 장소 추가·삭제와 시간 편집
- 기존 코스를 복사해 편집
- 저장한 코스와 생성한 코스를 프로필·저장 화면에 연결
- 명시적 경로 이동으로 상세→편집→공유 간 뒤로가기 안정화

### 공유 템플릿 및 커스터마이징

- 코스 공유 이미지 생성
- CD 케이스, 티켓, 영수증, 런치 트레이 스크랩북 템플릿
- 템플릿 미리보기 이미지 제공
- 코스맵 템플릿 선택
- 스킨 선택·적용 및 공유 화면 반영
- `html-to-image`/`html2canvas` 기반 이미지 출력

### 분석 화면

- `/metrics` 엔진·제품 지표 대시보드
- 데이터 신뢰성, 만족도, 피로도, feature 효과, A/B readout
- 이벤트 디버그 및 집계 API

## 화면 경로

| 경로 | 화면 |
|---|---|
| `/` | 홈 및 모드 진입 |
| `/onboarding` | 온보딩 |
| `/feed` | Munchie 피드 |
| `/feed/new` | 피드 게시물 작성 |
| `/course/:id` | 코스 상세 |
| `/course/:id/edit` | 코스 편집 |
| `/course/:id/share` | 코스 공유 |
| `/courses/:id/navigate` | 코스 길찾기 |
| `/saved` | 저장한 코스 |
| `/profile` | 프로필·생성 코스 |
| `/lunchie/settings` | Lunchie 조건 설정 |
| `/session/lobby` | 세션 대기실 |
| `/join/:token` | 초대 세션 참여 |
| `/lunchie/swipe` | 스와이프 및 그룹 결정 |
| `/lunchie/results` | 결정 결과 |
| `/lunchie/map` | 결과 지도 |
| `/metrics` | 지표 대시보드 |

## API

모든 엔드포인트는 `/api` 아래에 등록됩니다.

| Method | Path | 설명 |
|---|---|---|
| `GET` | `/users` | 사용자 조회 |
| `POST` | `/users` | 사용자 생성 |
| `POST` | `/sessions/create` | Lunchie 세션 생성 |
| `GET` | `/sessions/:token` | 세션 조회 |
| `POST` | `/sessions/:token/join` | 세션 참여 |
| `POST` | `/sessions/:token/ready` | 준비 상태 변경 |
| `POST` | `/sessions/:token/status` | 세션 상태 변경 및 그룹 결정 진행 |
| `GET` | `/sessions/:token/results` | 스와이프·투표 결과 조회 |
| `GET` | `/restaurants` | 조건별 음식점 조회 |
| `GET` | `/courses` | 코스와 스톱 조회 |
| `POST` | `/swipes` | 스와이프 기록 |
| `POST` | `/events` | 행동·추천 이벤트 기록 |
| `POST` | `/recommend` | 엔진 추천 요청 |
| `GET` | `/journey/today` | 오늘의 스톱과 다음 스톱 제안 |
| `GET` | `/events/_debug` | 개발용 이벤트 조회 |
| `GET` | `/metrics` | 엔진·제품 지표 집계 |

## 데이터 구조

`shared/schema.ts`의 Drizzle/Zod 모델을 클라이언트와 서버가 함께 사용합니다.

- 사용자: `users`
- 음식점: `restaurants`
- 코스: `courses`, `course_items`
- Lunchie 세션: `sessions`, `session_members`, `swipes`
- 추천·분석: 컨텍스트, 노출, 선택, 결과 이벤트

`DATABASE_URL`이 있으면 PostgreSQL을 사용합니다. 일부 개발 흐름은 DB가 없어도 mock 데이터나 메모리 이벤트로 동작하지만, 영속성과 전체 API 동작을 검증하려면 DB 연결이 필요합니다.

## 기술 스택

| 영역 | 기술 |
|---|---|
| Web | React 19, TypeScript 5.6, Vite 7 |
| Routing | Wouter |
| UI/Motion | Tailwind CSS, Radix UI, Framer Motion |
| Forms/Validation | React Hook Form, Zod |
| Course editor | dnd-kit |
| Map | Leaflet, React Leaflet, Google Maps 연동 |
| Share | html-to-image, html2canvas, QRCode |
| API | Express, TypeScript |
| Data | Drizzle ORM, PostgreSQL |
| Test | Vitest, TypeScript compiler |
| Mobile prototype | Expo, NativeWind (`mobile/`) |

## 시작하기

### 요구사항

- Node.js 22 권장
- Corepack
- pnpm 10.4.1 (`package.json`의 `packageManager` 기준)

### 설치 및 실행

```bash
corepack enable
pnpm install
pnpm dev
```

기본 개발 명령은 Vite 클라이언트와 Express 서버를 동시에 실행합니다.

```bash
pnpm dev:client   # 클라이언트만 실행
pnpm dev:server   # API 서버만 실행
pnpm seed         # DB 시드
pnpm preview      # 프로덕션 빌드 미리보기
```

### 환경 변수

루트에 `.env`를 만들고 필요한 값을 설정합니다.

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
VITE_FRONTEND_FORGE_API_KEY=
```

- `DATABASE_URL`: PostgreSQL/Drizzle 연결에 필요
- `VITE_FRONTEND_FORGE_API_KEY`: Google Maps 프록시 연동을 사용할 때 선택적으로 설정
- 실제 키와 `.env` 파일은 Git에 커밋하지 않습니다.

## 검증

```bash
pnpm check     # TypeScript 타입 검사
pnpm test      # Vitest 테스트
pnpm build     # 클라이언트 + 서버 프로덕션 빌드
```

2026-07-13 현재 검증 결과:

- TypeScript 검사 통과
- 테스트 파일 3개 통과
- 테스트 17개 통과
- Vite 클라이언트 및 Express 서버 빌드 성공
- 클라이언트 메인 JS 번들 약 1.69 MB로 코드 분할 최적화 필요

## 프로젝트 구조

```text
client/                 React 웹 앱
  public/templates/     코스 공유 템플릿 이미지
  src/components/       공통·Munchie·공유 컴포넌트
  src/pages/            페이지 및 Lunchie/Munchie 흐름
server/                 Express API와 추천 엔진
  engine/               추천·그룹 결정·이벤트·스코어링
shared/                 공통 스키마, 엔진 타입, 인텐트
mobile/                 Expo 모바일 프로토타입
docs/                   제품·엔진·프로세스 문서와 산출물
```

## 업데이트 내역

### 2026-07-13 — 새 코스 생성·템플릿 완성 흐름 개편

- 새 코스 생성 완료 시 코스 상세 대신 `Munchie 템플릿 에디터 / 공유하기`로 즉시 연결
- 새 코스의 제목·장소·사진·거리·소요 시간을 실제 생성 데이터로 공유 템플릿에 반영
- 새 코스에서 선택·변경한 사진을 보존해 템플릿 드래그·확대·회전 편집으로 연결
- 공유 화면 하단을 코랄 색상의 기존 공유 버튼과 `템플릿 완성 및 홈으로` 버튼의 2열 UI로 개편
- 템플릿 완성 시 Munchie Mode의 Template 탭으로 복귀하도록 완료 동선 추가

### 2026-07-13 — Munchie 음식 태그 필터 통합

- Munchie Mode의 필터를 `전체 · 맛집 · 데이트코스 · 혼밥 · 카페 · 펍나이트 · 브런치 · 디저트 · 가성비`의 음식 중심 체계로 전면 교체
- Munchie Feed, Munchie Template, 코스 탐색, 저장 목록의 필터 순서와 명칭을 공통 상수로 통합
- Lunchie 취향 설정과 코스 상세 태그도 동일한 음식 태그 체계를 사용하도록 일괄 적용
- 기존 코랄 중심 디자인 시스템을 유지하면서 새 태그별 칩 색상을 기존 팔레트로 연결
- 이전 `데이트 코스`, `혼자 여행`, `전시/문화`, `액티비티`, `맛집 투어` 태그를 새 태그로 자동 정규화하는 호환 로직 추가
- 로컬 저장 코스·피드와 API 응답 데이터에도 태그 정규화를 적용해 기존 사용자 데이터 유지

### 2026-07-13 — 피드 미리보기·알림 센터·Munchie 템플릿 에디터

- Munchie Feed 작성 흐름을 `코스 선택 → 사진/한줄평 작성 → 미리보기 → 게시 완료` 4단계로 개편
- 미리보기에서 실제 피드 카드 형태를 확인하고 수정 화면으로 돌아가거나 최종 게시할 수 있도록 변경
- Lunchie 결승 공유 카드의 임시 로고를 공식 캐릭터 마크와 워드마크 이미지로 교체
- 예선전 시작 화면에 부유하는 Lunchie Munchie 공식 로고와 약 3초 진행 바를 적용
- 홈의 리뷰·오늘의 여정 카드를 상시 토글 가능한 전구 알림 센터로 통합
- 전구 점등·소등, 배경 딤 모달, 최근 리뷰 응답, 최신 여정 최대 5개 조회 기능 추가
- `GET /api/journey/history`를 추가하고 DB 실패 시 메모리 이벤트 히스토리로 폴백
- 코스 공유 화면을 `Munchie 템플릿 에디터 / 공유하기`로 변경
- 기존 공유 캐러셀을 ZIP 디자인 기반 9:16 템플릿 19개로 전면 교체하고 약 2MB로 최적화
- 공유 옵션을 Instagram 스토리, 앱 링크 공유, 이미지 저장 3개로 단순화
- 코스 편집에서 장소 사진을 사용자가 직접 업로드·교체하고 공유 화면까지 유지하도록 연결
- 템플릿 사진의 자유 드래그, 두 손가락 핀치·마우스 휠 확대/축소, 회전 핸들 각도 조절 지원
- 사진 hover·터치 시 추가·삭제·회전 아이콘을 표시하고 바깥 영역 선택 시 자동으로 숨기도록 개선
- 편집 컨트롤은 최종 공유 이미지에서 제외하고, 선택 템플릿의 사진만 렌더링하도록 성능 개선
- 이미지 디코딩 대기와 허용 호스트 기반 동일 출처 이미지 프록시를 추가해 PNG 저장 안정화
- 최근 여정 선택 로직 단위 테스트를 추가해 전체 자동 테스트를 17개로 확대
- Munchie Feed·Template에서 코스 상세를 열고 돌아올 때 각각 출발 탭이 유지되도록 복귀 경로 수정
- 새 피드 작성 종료 시 Feed 탭, 새 코스 만들기 취소 시 Template 탭으로 복귀하도록 작성 흐름의 탭 상태 유지

### 2026-07-13 — 랜딩·Munchie·프로필·Quick Match UX 개선

- 홈 랜딩의 좌우 스와이프 안내 문구를 제거하고 카드 UI를 간결하게 정리
- 홈 Munchie 카드에서 작성자 한줄평을 먼저 보여준 뒤, 숨김 댓글을 제외한 인기 피드 답글을 5초 간격으로 순환 표시
- 답글 로테이션 영역 높이를 고정해 텍스트가 바뀌어도 카드 크기가 변하지 않도록 개선
- 댓글 숨김 상태를 공통 판정 함수로 통합해 홈·피드·식당 상세에서 문자열·숫자 형태의 과거 저장값까지 일관되게 제외
- Munchie Mode의 `코스맵` 탭을 `Munchie Template`으로 변경
- Munchie Feed 카드에서 코스 제목 이동 링크를 제거하고, 작성자 한줄평을 큰 따옴표가 적용된 고정 인용문 디자인으로 변경
- Munchie Feed와 Template 화면의 플로팅 작성 버튼이 화면 하단에서 밀리는 문제를 수정
- 프로필의 `나의 코스맵`을 `나의 템플릿`으로 변경하고, 2행·3열과 다음 열 미리보기가 보이는 가로 스와이프 레이아웃 적용
- 프로필 통계 순서를 `팔로워 → 팔로잉 → 좋아요`로 변경
- 저장목록의 `Munchie 코스맵` 명칭을 `Munchie 템플릿`으로 통일
- 원본 런먼이 GIF의 8개 프레임에서 번호·설명·테두리를 제외한 캐릭터 애니메이션 자산을 제작
- Quick Match 설정 화면에서는 런먼이 애니메이션을 제거하고 세션 로비의 `투표 시작하기` 버튼 아래로 이동
- 예선전 시작 로딩 화면의 기존 로고를 검정 배경에 맞춘 런먼이 점프 애니메이션으로 교체

### 2026-07-13 — Munchie 피드 및 코스맵 커스터마이징

- Munchie 피드와 새 게시물 작성 화면 추가
- 피드 카드, Foodie Buddy, 식당 상세 시트 추가
- 코스맵 템플릿 카드·스킨 프레임·스킨 선택기 추가
- CD, 티켓, 영수증, 런치 트레이 공유 템플릿 추가
- 홈, 탐색, 저장, 프로필, 코스 상세·편집·공유 화면 통합 개선
- 이미지 처리 유틸리티와 템플릿·크리에이터·스킨 상수 추가

### 2026-07-02 — 세션·결승 플로우 안정화

- 초대 세션 API timeout 조정
- 결승 대기 화면 완료 배지 오류 수정
- 길찾기에서 돌아올 때 결과가 유실되던 문제 수정
- 그룹 결승전 대각선 듀얼 애니메이션 복원
- 덱이 목표 카드 수보다 적을 때 예선이 끝나지 않던 문제 수정
- 실제 덱 크기와 `targetCount` 불일치로 결과 화면에 진입하지 못하던 문제 수정

### 2026-06-29 — 그룹 결정 모델

- least-misery 집계와 Top 2 그룹 결승 투표
- 3지선다 그룹 결정 UI
- 세대(`generation`) 기반 결정 라우팅
- 미움 후보를 제외한 `REROLL` 재스와이프
- 합의 실패(`NO_CONSENSUS`) 처리
- 그룹 결정 모델·데이터 수집·워크플로우 문서화

### 2026-06-26 — 오늘의 여정 및 추천 인텐트

- 인텐트↔카테고리 매핑과 추천 필터
- 오늘의 스톱 추출 및 `/api/journey/today`
- 우승 결과를 오늘의 여정 이벤트로 연결
- 홈 `오늘의 여정` 카드
- Vitest 설정과 엔진 단위 테스트 추가

### 2026-06-23~25 — 추천 엔진·계측 고도화

- 취향, 피로도, 포만감, 음식 연쇄 서브스코어러
- Contextual Bandit과 Thompson Sampling
- 그룹 취향 합성과 듀얼 pairwise 학습
- 명시적 신호 및 cross-city 전이
- 데이터 신뢰성부터 A/B readout까지 단계별 메트릭 대시보드
- 솔로/그룹 인원 설정, 참여 제한, 추천 맥락 반영
- 결승 무한루프와 중도 이탈 오탐 수정

### 이전 통합 업데이트

- Lunchie 예선→결승→우승 전체 스와이프 플로우
- 세션 생성·초대·참여·준비·결과 집계 API
- 코스 피드, 상세, 드래그 편집, 지도 경로 동기화
- 코스 태그 및 단계별 지도 컬러 통합
- 공유 이미지 템플릿과 Expo 모바일 프로토타입
- React Context 기반 API/mock 하이브리드 데이터 계층

## 알려진 제한사항

- 운영 환경 DB와 인증·권한 모델은 추가 검증이 필요합니다.
- 자동 테스트는 추천 인텐트, 그룹 결정, 이벤트 중심이며 UI E2E 범위는 아직 없습니다.
- 클라이언트 번들이 500 kB 권장 크기를 초과하므로 dynamic import와 manual chunk 분리가 필요합니다.
- 일부 기능은 mock/in-memory 폴백에 의존하므로 서버 재시작 시 데이터가 유지되지 않을 수 있습니다.
- 랜딩 페이지 일부 디자인은 실험 단계입니다.

## 문서

- [통합 기능 명세](./docs/SPEC.md)
- [프로토타입 평가 요약](./docs/Prototype-Evaluation-Summary.md)
- [기획·엔진 산출물 목록](./docs/DELIVERABLES.md)
- [기술 스택 요구사항](./TECH_STACK_REQUIREMENTS.md)
- [와이어프레임 구조](./wireframe_structure.md)
- [데이터 구조 구현 계획](./1-implementation_plan.md)
- [데이터 마이그레이션 계획](./2-migration_plan.md)
- [DB 계획](./3-DB_plan.md)
- [코스맵 오버레이 계획](./4-overlay_map_plan.md)
- [업데이트 와이어프레임](./5-update_wireframe.md)
