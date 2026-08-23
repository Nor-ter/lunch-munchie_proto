# 🍱 Lunchie Munchie — Unified Prototype

> 오늘 무엇을 먹을지 빠르게 결정하고(Lunchie), 다녀온 맛집 코스를 피드·코스맵으로 만들어 공유하는(Munchie) 통합 프로토타입

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)](https://vite.dev/)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express)](https://expressjs.com/)
[![Vitest](https://img.shields.io/badge/Vitest-2-6E9F18?logo=vitest)](https://vitest.dev/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages%20%2B%20D1-F38020?logo=cloudflare)](https://www.cloudflare.com/)

> **README 최종 업데이트: 2026-08-23** · **최신 코드 반영: 2026-08-22** (`c1d12bc4`)

---

## 목차

**1. 제품 이해**
- [1.1 제품 구성](#11-제품-구성)
- [1.2 현재 상태 요약](#12-현재-상태-요약)

**2. 기능 명세 (현재 기준)**
- [2.1 Lunchie Mode — Quick Match](#21-lunchie-mode--quick-match)
- [2.2 추천 엔진 및 결정 모델](#22-추천-엔진-및-결정-모델)
- [2.3 오늘의 여정](#23-오늘의-여정)
- [2.4 Munchie Feed](#24-munchie-feed)
- [2.5 코스맵 탐색·편집](#25-코스맵-탐색편집)
- [2.6 공유 템플릿 및 커스터마이징](#26-공유-템플릿-및-커스터마이징)
- [2.7 프로필·저장·알림](#27-프로필저장알림)
- [2.8 관리자 분석 대시보드](#28-관리자-분석-대시보드)
- [2.9 디자인 시스템 규격](#29-디자인-시스템-규격)

**3. 기술 레퍼런스**
- [3.1 화면 경로](#31-화면-경로)
- [3.2 API](#32-api)
- [3.3 데이터 구조](#33-데이터-구조)
- [3.4 기술 스택](#34-기술-스택)
- [3.5 프로젝트 구조](#35-프로젝트-구조)

**4. 개발 가이드**
- [4.1 요구사항](#41-요구사항)
- [4.2 처음 한 번: 로컬 개발 환경](#42-처음-한-번-로컬-개발-환경)
- [4.3 환경 변수 (`.dev.vars`)](#43-환경-변수-devvars)
- [4.4 자주 겪는 설치 문제](#44-자주-겪는-설치-문제)
- [4.5 LAN 기기에서 테스트할 때](#45-lan-기기에서-테스트할-때)
- [4.6 테스트와 커밋](#46-테스트와-커밋)

**5. 운영·배포**
- [5.1 Cloudflare CI/CD 흐름](#51-cloudflare-cicd-흐름)
- [5.2 GitHub Actions Secrets](#52-github-actions-secrets)
- [5.3 관리자 대시보드 접근 정책](#53-관리자-대시보드-접근-정책)
- [5.4 권한·운영 정책](#54-권한운영-정책)

**6. 브랜치 통합 상태**
- [6.1 `tl_branch`](#61-tl_branch)
- [6.2 `main_Photo_Editing_Bug_Fixing_Branch`](#62-main_photo_editing_bug_fixing_branch)

**7. 참고**
- [7.1 운영 제약과 검증 범위](#71-운영-제약과-검증-범위)
- [7.2 문서 정합성 결정사항](#72-문서-정합성-결정사항)
- [7.3 관련 문서](#73-관련-문서)

**8. [변경 이력 (주요 업데이트 · 최신순)](#8-변경-이력-주요-업데이트--최신순)**

**9. [전체 Git 커밋 기록 (최신순)](#9-전체-git-커밋-기록-최신순)**

---

# 1. 제품 이해

## 1.1 제품 구성

Lunchie Munchie는 두 가지 핵심 경험을 하나의 앱으로 제공합니다.

| 모드 | 목적 | 주요 흐름 |
|---|---|---|
| **Lunchie Mode** | 혼자 또는 그룹이 빠르게 식당 결정 | 설정 → 초대/참여 → 스와이프 → 그룹 결정 → 결과/길찾기 |
| **Munchie Mode** | 맛집 여정을 피드와 코스맵으로 제작·공유 | 통합 에디터 → Munchie Feed → 코스맵 상세 → 9:16 스토리 공유 |

## 1.2 현재 상태 요약

| 항목 | 값 |
| --- | --- |
| README 최종 업데이트 | **2026-08-23** |
| 최신 코드 커밋일 | **2026-08-22** |
| 최신 커밋 | [`c1d12bc4`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c1d12bc476d7ec8b372a20b9468cc377ea642990) |
| 운영 URL | <https://lunchie-munchie.pages.dev> |
| 배포·통합 브랜치 | `main`, `production` 모두 `c1d12bc4`로 동기화 |
| 운영 런타임 | Cloudflare Pages Functions + D1 + R2 + Durable Objects |
| 로컬 호환 런타임 | Express 개발 서버 + 파일·메모리 폴백 |
| 로컬 품질 게이트 | TypeScript → Vitest → Playwright E2E → Pages 빌드 |
| 전체 Git 이력 | **370개 커밋**, 51개 날짜, 일반 296개·병합 74개 |
| Git 집계 기간 | 2026-05-25 ~ 2026-08-22 |

---

# 2. 기능 명세 (현재 기준)

## 2.1 Lunchie Mode — Quick Match

### 세션 생성과 설정

- 솔로(`혼자`) 및 그룹(`같이`) 세션 생성, 2~8명 초대 인원 조절
  - `같이`에서 선택한 인원은 `혼자` 모드로 전환했다가 돌아와도 유지
- 초대 링크·토큰을 통한 세션 참여
- 참여 인원 제한, 준비 상태, 마감 시간 관리
- **마감 시간 설정 (1~15분)** — 대형 원형 타이머 UI
  - 원형 다이얼 드래그, 키보드 방향키, 중앙 숫자 직접 입력, 위·아래 증감 버튼 지원
  - 예상 종료 시각 표시, 5분·10분·15분 빠른 선택 제공
  - 원 밖의 중복 입력창과 안내 문구는 제거된 상태
- **검색 거리** — 1km, 2km, 3km, 4km, 5km+ 체계
  - 250m 간격의 눈금자형 범위 컨트롤
  - 프로필의 Lunchmate 캐릭터가 선택 방향에 따라 좌우 보행 모션으로 이동
- **취향 선택** — `COFFEE`, `FOODIE`, `DESSERT`, `RANDOM` 카드 (현재 선택 강조)
- **분위기 태그** — 설명과 아이콘이 포함된 직접 선택 카드
- **Dietary preferences** — 영어 선택 카드
  - Vegan, Vegetarian, Gluten-Free, Halal, Carnivore, Small Appetite, Buffet, Asian
  - `No` 드롭다운에서 Beef, Seafood, Lamb, Pork, Nuts 복수 제외 가능
- 사용자에게 노출되던 평점 및 1인 예산 설정은 제거
  - 기존 세션 API 호환을 위해 예산 필드는 내부 기본값으로 계속 전달
- `세션 만들고 초대하기` 버튼은 floating이 아닌 Dietary 카드 다음의 일반 문서 흐름에 배치
- 진행 중인 세션이 있으면 새 세션을 중복 생성하지 않고 대기실 또는 투표 화면으로 복귀

### 대기실·초대·세션 시작

- 초대받은 참여자에게 호스트용 QR·방 관리 UI를 노출하지 않고 참여 완료 화면만 제공
- 호스트가 세션을 시작하면 모든 참여자가 별도의 준비 동작 없이 같은 예선전으로 자동 이동
- 세션 상태를 **1초 간격**으로 동기화하여 호스트와 참여자의 시작 타이밍 일치
- 대기실 뒤로가기는 홈이 아닌 `/lunchie/settings`로 연결
- 대기 애니메이션은 고정 GIF가 아닌 사용자 프로필의 Lunchmate 캐릭터
- `VITE_INVITE_ORIGIN`으로 LAN 또는 HTTPS 터널 주소가 포함된 QR 초대 링크 생성 지원
  - 설정값이 없거나 유효하지 않으면 현재 브라우저 origin을 안전하게 사용
- Quick Match 설정과 세션 대기실에서도 홈과 동일한 flat 하단 내비게이션 표시 (대기실에서는 Lunchie 탭 활성 유지)

### 투표·대기·결승 흐름

- 음식점 카드 스와이프와 체류시간(`dwell_ms`) 이벤트 수집
- 왼쪽 `싫어요` 스와이프에 실제 유리 파손 PNG와 단계별 균열·미세 균열·유리 반사 레이어 적용
- 실제 덱 크기를 반영한 예선 완료 판정
- 예선 완료 인원과 서버 결과 상태를 기준으로 진행률을 복구하여, 완료 후에도 `0/N명`으로 남는 대기 오류 방지
- 세션이나 결승 후보가 일시적으로 준비되지 않았을 때 빈 화면 대신 복구·로딩 UI 제공
- 추천 엔진 Top 2 기반 **대각선 듀얼 결승 UI** (그룹 결승전도 솔로 모드와 동일한 사선 대결 구도로 통일)
- `둘 다 별로 · 다른 곳` 탈출구와 재추천
- 그룹 least-misery 집계와 Top 2 결승 투표
- 3지선다, `REROLL`, `NO_CONSENSUS` 합의 실패 처리
- 결과 화면, Google 길찾기, 결과 공유 / 길찾기 후 복귀해도 우승 결과 유지
- 그룹 대기·결과·공유 화면의 로고는 사용자 장비가 반영된 런치킨 캐릭터
- 결과 카드의 음식점 이미지를 원형 영역에 안정적으로 렌더링하고 공유 카드에도 동일한 런치킨 브랜드 적용
- 초대 세션 API timeout 조정 및 세션 안정성 개선

### 런치 투표 대기 도우미

- 예선 투표를 끝낸 사용자가 기다리는 동안 Munchie Feed를 둘러볼 수 있는 **런치킨 플로팅 도우미**
- 활성 Lunchie 세션에서 대기 중일 때만 전역 표시하며, 다른 세션이나 일반 Munchie 이용 중에는 숨김
- 남은 투표 시간을 말풍선으로 안내하고, 결승·재추천 단계가 열리면 투표 페이지 복귀 동작 제공
- 런치킨 터치 시 표정·점프·말풍선이 변하는 간단한 상호작용
- 결과 API는 **읽기 전용**으로 조회하여 기존 세션·투표 데이터를 변경하지 않음

## 2.2 추천 엔진 및 결정 모델

- 맥락 기반 추천 컨텍스트와 인텐트→카테고리 필터
- 아이템 피처와 사용자 취향 벡터 기반 스코어링
- 단기 노출 피로도와 재소비 포만감/갈망 모델
- 음식 연쇄 및 occasion 시퀀스 반영
- Contextual Bandit과 Thompson Sampling
- 그룹 least-misery 취향 합성
- 듀얼 선택을 pairwise 고신뢰 선호 신호로 학습
- 명시적 신호 및 cross-city 전이
- 지원 이벤트: `CHOOSE`, `SURVEY`, `COURSE_SAVE`, `REROLL`, `ABANDON`, `WINNER`
- 결정적 A/B 배정, feature 효과 분석, 엔진 메커니즘 및 데이터 신뢰성 지표
- 세대(`generation`) 기반 결정 라우팅, 미움 후보를 제외한 `REROLL` 재스와이프
- 메뉴 taxonomy·가격·식단 근거를 사용한 예산·식단 하드 필터
- 서버 추천 slate에 그룹 스와이프를 귀속하고 학습 근거를 서버 권위 데이터로 유지
- 카탈로그 규모에 따른 그룹 덱 편향 제거와 추천 근거·정책 기여도 추적

## 2.3 오늘의 여정

- 우승 결과를 오늘의 여정 시작점으로 저장
- 운영 환경의 `GET /api/journey-today`에서 오늘의 스톱 조회
- 운영 환경의 `GET /api/journey?days=30`에서 기간별 여정 히스토리 조회
- 로컬 Express 호환 API에서는 `/api/journey/today`, `/api/journey/history`와 메모리 이벤트 폴백 지원
- 홈 화면의 `오늘의 여정` 카드
- 추천 시간대에 맞는 기본 인텐트와 카테고리 추천

## 2.4 Munchie Feed

- 피드와 코스맵을 하나의 게시물로 다루는 **통합 Munchie Feed**
- 홈에서는 4:3 요약 카드, Feed 화면에서는 한줄평·사진·코스맵이 결합된 전체 카드 제공
- 한 게시물당 방문 장소를 **최대 3곳**으로 제한하고, 과거 4곳 이상 데이터도 3곳 이하로 정규화
- 기존 카드·코스 선택·스킨 편집 흐름을 제거하고 `+ Munchie Feed` 통합 에디터로 일원화
- 한줄평 입력 확장, 댓글 조회, 좋아요 반응, 신고 및 작성자 댓글 숨김
- 게시물 더보기에서 작성자 상세정보 확인, 레스토랑 상세에서 사진·기본 정보·메뉴 사진 제공
- 홈 Munchie 카드의 한줄평을 주기적으로 갱신하고 가로 스와이프로 다음 피드 탐색
- 60px 런치킨 캐릭터의 floating·blink 모션과 순서별 숫자 마커 기반의 Munchie 전용 시각 체계
- Feed 상단에 템플릿 팔레트 버튼 + 필터 버튼, 새 글 작성 `+`는 오른쪽 하단 플로팅 버튼
- 피드 카드의 공유 버튼은 스토리 꾸미기 화면으로 이동하지 않고, 피드 상세 링크를 네이티브 공유하거나 클립보드에 복사
- 지도 위치·검색 반경 필터와 서버 권위 페이지네이션·개인화 피드
- 업로드 사진의 코스 식당 귀속, 카탈로그 사진·메뉴 인덱스와 안전한 사진 폴백

### 음식 태그 필터 체계

`전체 · 맛집 · 데이트코스 · 혼밥 · 카페 · 펍나이트 · 브런치 · 디저트 · 가성비`

- Munchie Feed, Munchie Template, 코스 탐색, 저장 목록의 필터 순서와 명칭을 공통 상수로 통합
- Lunchie 취향 설정과 코스 상세 태그도 동일 체계 사용
- 이전 `데이트 코스`, `혼자 여행`, `전시/문화`, `액티비티`, `맛집 투어` 태그는 자동 정규화
- 로컬 저장 코스·피드와 API 응답 데이터에도 태그 정규화 적용

## 2.5 코스맵 탐색·편집

- 한줄평과 최대 3곳의 장소·코스맵을 정한 뒤, 템플릿 단계에서 사진을 꾸미는 **통합 에디터**
- 코스 목록, 상세 정보, 장소 및 잘리지 않는 전체 경로 표시
- 코스 스톱 순서 기반 지도 좌표·경로 동기화
- `#FC3F4E`, `#FE9800`, `#F39DA8` 순서별 숫자 핀과 코랄 팔레트 기반 단계별 경로
- 지도 사진을 핀 중심으로 터치·드래그해 지도 요소 확인 (지도 높이 `270px`)
- 코스 순서 카드는 첫 터치로 하이라이트, 같은 카드를 두 번째 터치할 때 레스토랑 상세정보 표시
- 장소 추가·삭제, 템플릿 사진 업로드·위치·크기 편집과 시간 정보 관리
- 기존 코스를 복사해 편집
- 저장한 코스와 생성한 코스를 프로필·저장 화면에 연결
- 명시적 경로 이동으로 상세→편집→공유 간 뒤로가기 안정화
- 서버 기반 Google Places 검색으로 실제 장소를 추가하고 설정 누락을 화면에서 안내

### 사진 편집 (코스맵 작성 플로우)

- 업로드 사진은 **원본 비율**로 배치
- 휠 또는 두 손가락 핀치로 비율을 유지한 채 확대·축소, 두 손가락 회전
- 가로·세로 슬라이더 UI는 제거, 선택 사진은 회전·포토에디터·삭제 중심의 간단한 컨트롤
- 포토에디터는 원본 이미지를 기준으로 열리며, 1:1 작업대가 아닌 원본 비율 그대로 보면서 크롭
- 포토에디터 내 자르기 도구 제공, 저장 시 원본 비율 캔버스에서 선택 크롭 영역을 결과물에 반영
- 최대 6장까지 사진 추가 가능

## 2.6 공유 템플릿 및 커스터마이징

### 템플릿 자산

- **4:3 맛집 피드 템플릿 총 29종** — 원본 `munchie-01`~`munchie-10` 10개 + 9:16 스토리 디자인에서 변환한 19개
  - 변환 시 원본 픽셀을 보존한 540×720 피드 자산으로 제작
  - 디자인 유형별 사진 슬롯을 연결하고, 인쇄된 사진 영역을 투명 프레임으로 처리해 실제 앨범 사진 렌더링 지원
  - `/templates`의 별도 `스토리 공유 템플릿` 섹션을 제거하고 모든 디자인을 `맛집 피드 템플릿`으로 통합
- 코스맵 작성 플로우의 4:3 템플릿은 `munchie-01.png` ~ `munchie-10.png` 10종
  - 템플릿은 최상단 프레임 레이어, 업로드 사진과 그리기 레이어는 템플릿 아래에 배치
  - 템플릿 선택 단계에서 팔레트 버튼·안내 문구·카운터를 제거하고, 좌우 화살표 및 빈 영역 스와이프로 이동
- 모든 템플릿은 **배경 → 사진 → 프레임**의 3개 레이어로 분리
  - 프레임은 불투명하게 유지하면서 사진만 실제 프레임 내부 윤곽에 맞춰 가려지도록 투명 오버레이 생성
- 사진 없는 기본 상태로 확인하는 4:3 템플릿 브라우저 제공

### 스토리 공유 (9:16)

- 먼치피드 게시물의 **정확한 ID**를 공유 화면에 전달하여 동일 코스의 다른 게시물이 선택되는 문제 방지
- 기존 피드의 템플릿·사진 앨범·배치·드로잉을 수정 없이 그대로 사용하는 **읽기 전용 공유 미리보기**
- `피드`와 `맵` 중 Instagram 스토리에 담을 화면을 선택 — 두 화면 모두 정확한 9:16 비율로 렌더링
- 공유 화면의 사진 업로드·교체·삭제·회전·드래그 기능은 제거하고 원본 피드를 고정
- 모바일 공유 시 1080px PNG 생성, 피드 링크 복사와 기기 저장 지원
- 게시 완료 화면의 `Munchie 홈으로` / `공유하기` 버튼을 통한 공유 흐름
- 이미지 디코딩 대기와 허용 호스트 기반 동일 출처 이미지 프록시로 PNG 저장 안정화
- `html-to-image` / `html2canvas` 기반 이미지 출력

## 2.7 프로필·저장·알림

- 프로필의 나의 피드를 **2열**로 표시하고, 통합 카드 클릭 후 한줄평 수정·댓글 관리 지원
- 내 게시물 댓글은 삭제하지 않고 **숨김 처리**하며 피드·홈·식당 상세에 공통 반영
  - 댓글 숨김 상태는 공통 판정 함수로 통합해 문자열·숫자 형태의 과거 저장값까지 일관되게 제외
- 저장 목록 명칭은 `Munchie 먼치픽`, 2열 무한 세로 스크롤
- 오늘의 여정과 내 피드의 새 좋아요·싫어요·댓글을 상단 알림 센터에서 통합 확인
  - 확인한 알림은 목록에서 제거하고, 모두 확인하면 `더이상 새로운 알람이 없어요` 상태 표시
- 알림·홈·저장목록·마이프로필에서 연 피드나 템플릿은 상세 화면 뒤로가기로 각각의 출발 화면에 복귀
- 프로필·저장 목록에서 구형 카드와 중복 컴포넌트를 제거하고 최신 통합 피드 형식으로 통일
- 프로필 통계 순서: `팔로워 → 팔로잉 → 좋아요`
- 공개 `@handle` 편집·표시, 이름·핸들 기반 사용자 검색과 팔로우 관계 조회
- 프로필 Lunchmate 캐릭터의 드래그·착지·다시 잡기 동작과 E2E 회귀 테스트

## 2.8 관리자 분석 대시보드

- `/admin` 관리자 전용 엔진·제품 지표 대시보드
- 데이터 신뢰성, 만족도, 피로도, feature 효과, A/B readout
- 이벤트 디버그 및 집계 API
- **개인 정보 비노출 원칙**: 개인별 프로필·정확 위치·원본 이벤트는 표시하지 않음
  - 로그인/익명 이용자 수, 세션 퍼널, 추천 수락률, 모델 버전 로그, 카테고리 기반 익명 취향 분포만 집계 표시
- 카탈로그 상태·사진 커버리지, 추천 근거와 정책 기여도 분석

## 2.9 디자인 시스템 규격

| 항목 | 값 |
|---|---|
| 하단 내비게이션 높이 | Safe Area 포함 `88px` (전 화면 공통, flat 형태) |
| 프로필 탭 아이콘 | `51px` (다른 탭과 활성·비활성 상태 및 터치 영역 동일) |
| 홈 상단 아이콘 버튼 | `40px` 원형 |
| 런치킨 캐릭터 | `60px`, floating + 2회 blink를 별도 레이어로 분리해 동시 실행 |
| 홈 헤더 문구 | `22px`, 중앙 정렬, `#935B5C` |
| Munchie Feed 제목 | `#DB2837` |
| 새 피드 작성 버튼 | `65×65px` 고정 원형 `+`, 하단 바 상단과 `43px` 간격 |
| 예선 X·하트 버튼 | `75×75px`, 간격 `32px` |
| 세션 로비 버튼 | 링크 복사·공유 `#FCB3A8`, 본문 텍스트 `#3E2922` |
| WAITING 배지 | `13.5px`, `78×36px` 중앙 정렬 |
| 코스 핀 컬러 | `#FC3F4E`, `#FE9800`, `#F39DA8` |
| 라이트 모드 고정 | 모바일 브라우저의 자동 다크모드 재색상 차단 (공유 결과 포함) |

---

# 3. 기술 레퍼런스

## 3.1 화면 경로

| 경로 | 화면 |
|---|---|
| `/` | 홈 및 모드 진입 |
| `/onboarding` | 온보딩 |
| `/auth/login` | Google 로그인 |
| `/auth/callback` | 로그인 콜백 처리 |
| `/explore/places` | 장소 탐색 |
| `/feed` | Munchie 피드 |
| `/feed/:id` | 피드 상세 |
| `/feed/:id/edit` | 피드 편집 |
| `/feed/new` | 통합 에디터(`/coursemap/new`)로 이동 |
| `/coursemap/new` | Munchie Feed·코스맵 통합 작성 |
| `/course/:id` | 코스 상세 |
| `/course/:id/edit` | 통합 에디터로 이동 |
| `/course/:id/share` | 원본 피드·맵 9:16 스토리 미리보기·공유 |
| `/course/:id/feeds` | 코스와 연결된 Munchie 후기 |
| `/templates` | 통합 4:3 맛집 피드 템플릿 브라우저 |
| `/courses/:id/navigate` | 코스 길찾기 |
| `/saved` | 저장한 코스 |
| `/profile` | 프로필·생성 코스 |
| `/profile/:id` | 다른 사용자 프로필 |
| `/profile/foodie-room` | Lunchmate 방·코스튬 |
| `/lunchie/settings` | Lunchie 조건 설정 |
| `/session/lobby` | 세션 대기실 |
| `/join/:token` | 초대 세션 참여 |
| `/lunchie/swipe` | 스와이프 및 그룹 결정 |
| `/lunchie/results` | 결정 결과 |
| `/lunchie/map` | 결과 지도 |
| `/admin` | 관리자 전용 지표 대시보드 |

## 3.2 API

운영 환경은 `functions/api/[[path]].ts`의 Cloudflare Pages Functions/Hono API를 사용합니다. 아래 경로에는 `/api` 접두사가 생략되어 있습니다.

### 인증·Google Places

| Method | Path | 설명 |
|---|---|---|
| `GET` | `/auth/google/start` | Google OAuth 시작 |
| `GET` | `/auth/google/callback` | Google OAuth 콜백 |
| `GET` | `/auth/session` | 현재 로그인 세션 조회 |
| `POST` | `/auth/logout` | 로그인 세션 종료 |
| `POST` | `/places-autocomplete` | 장소 검색어 자동완성 |
| `POST` | `/location-autocomplete` | 지역 검색어 자동완성 |
| `POST` | `/location-details` | 선택 지역 상세 조회 |
| `POST` | `/place-details` | Google 장소 상세 조회 |
| `POST` | `/directions` | 코스 경로 조회 |

### 사용자·프로필

| Method | Path | 설명 |
|---|---|---|
| `PATCH` | `/profile` | 로그인 사용자 프로필 수정 |
| `POST` | `/uploads` | 프로필·피드 사진을 R2에 업로드 |
| `GET` | `/users/search` | 공개 핸들·표시 이름으로 사용자 검색 |
| `GET` | `/users/:id` | 공개 사용자 프로필 조회 |
| `GET` | `/users/:id/follows` | 팔로워·팔로잉 수 조회 |
| `GET` | `/users/:id/follow` | 현재 사용자의 팔로우 상태 조회 |
| `POST` | `/users/:id/follow` | 사용자 팔로우 |
| `DELETE` | `/users/:id/follow` | 사용자 언팔로우 |
| `GET` | `/users/:id/followers` | 팔로워 목록 조회 |
| `GET` | `/users/:id/following` | 팔로잉 목록 조회 |

### Lunchie 세션

| Method | Path | 설명 |
|---|---|---|
| `POST` | `/sessions/create` | Lunchie 세션 생성 |
| `GET` | `/sessions/:token` | 세션 조회 |
| `POST` | `/sessions/:token/join` | 세션 참여 |
| `POST` | `/sessions/:token/ready` | 준비 상태 변경 |
| `POST` | `/sessions/:token/status` | 세션 상태 변경 및 그룹 결정 진행 |
| `GET` | `/sessions/:token/results` | 스와이프·투표 결과 조회 |
| `POST` | `/sessions/:token/cancel` | 세션 취소 |
| `POST` | `/sessions/:token/leave` | 세션 나가기 |
| `POST` | `/sessions/:token/force` | 세션 진행 복구 |

### 콘텐츠·추천·여정

| Method | Path | 설명 |
|---|---|---|
| `GET` | `/restaurants` | 조건별 음식점 조회 |
| `GET` | `/courses` | 코스와 스톱 조회 |
| `POST` | `/courses` | 코스와 스톱 생성 |
| `POST` | `/swipes` | 스와이프 기록 |
| `POST` | `/events` | 행동·추천 이벤트 기록 |
| `POST` | `/recommend` | 엔진 추천 요청 |
| `POST` | `/journey-winner` | Lunchie 결정 결과를 여정에 저장 |
| `GET` | `/journey-today` | 오늘의 여정과 다음 스톱 제안 |
| `GET` | `/journey` | 지정 기간의 여정 히스토리 조회 |

### 피드·미디어·신고

| Method | Path | 설명 |
|---|---|---|
| `GET` | `/feed` | 페이지네이션·위치 필터 피드 조회 |
| `POST` | `/feed-like` | 피드 좋아요 상태 변경 |
| `PATCH` | `/feed-post` | 피드 게시물 수정 |
| `DELETE` | `/feed-post` | 피드 게시물 삭제 |
| `PATCH` | `/course-media` | 코스 미디어 수정 |
| `POST` | `/feed-comment` | 피드 댓글 작성 |
| `POST` | `/reports` | 피드·사용자 신고 접수 |

### 상태·관리자·공개 사진

| Method | Path | 설명 |
|---|---|---|
| `GET` | `/health` | D1·R2·Durable Objects 바인딩 상태 확인 |
| `GET` | `/admin/metrics` | 관리자 전용 제품·추천·익명 취향 집계 |
| `GET` | `/metrics` | 폐기된 공개 지표 경로 (`410 Gone`) |
| `GET` | `/photos/*` | R2 공개 사진 전달 (`/api` 접두사 예외) |

### 로컬 Express 호환 API

`pnpm dev`의 `server/routes.ts`는 기존 로컬 개발 흐름을 위해 아래 호환 경로를 제공합니다. 운영 Cloudflare API와 경로가 다른 여정 API를 혼용하지 않습니다.

| Method | Path | 설명 |
|---|---|---|
| `GET/POST` | `/users` | 로컬 사용자 조회·생성 |
| `GET/POST` | `/sessions/*` | 세션 생성·조회·참여·상태·결과 호환 API |
| `GET` | `/restaurants`, `/courses` | 로컬 음식점·코스 조회 |
| `POST` | `/swipes`, `/events`, `/recommend` | 스와이프·이벤트·추천 처리 |
| `GET` | `/journey/today` | 로컬 오늘의 여정 조회 |
| `GET` | `/journey/history` | 로컬 최근 여정 히스토리 조회 |
| `GET` | `/events/_debug`, `/metrics` | 로컬 개발·지표 확인 |
| `GET` | `/image-proxy` | 허용된 외부 이미지 프록시 |

## 3.3 데이터 구조

`shared/schema.ts`의 Drizzle/Zod 모델을 클라이언트와 서버가 함께 사용합니다.

| 도메인 | 테이블·모델 |
|---|---|
| 사용자 | `users` |
| 음식점 | `restaurants` |
| 코스 | `courses`, `course_items` |
| Lunchie 세션 | `sessions`, `session_members`, `swipes` |
| 추천·분석 | 컨텍스트, 노출, 선택, 결과 이벤트 |

- `DATABASE_URL`이 있으면 PostgreSQL을 사용합니다.
- 일부 개발 흐름은 DB가 없어도 mock 데이터나 메모리 이벤트로 동작하지만, **영속성과 전체 API 동작을 검증하려면 DB 연결이 필요**합니다.
- 운영 환경의 단일 기준은 Cloudflare D1 + Pages Functions의 Google 세션입니다.
- 사진 원본은 R2, 공유 세션 상태는 Durable Objects를 사용합니다.
- D1 마이그레이션은 `migrations/` 번호 순서를 지키며 이미 적용된 파일은 수정하지 않습니다.

## 3.4 기술 스택

| 영역 | 기술 |
|---|---|
| Web | React 19, TypeScript 5.6, Vite 7 |
| Routing | Wouter |
| UI/Motion | Tailwind CSS, Radix UI, Framer Motion |
| Forms/Validation | React Hook Form, Zod |
| Course editor | dnd-kit |
| Map | Leaflet, React Leaflet, Google Maps 연동 |
| Share | html-to-image, html2canvas, QRCode |
| API | Cloudflare Pages Functions, Hono, TypeScript |
| Data | Cloudflare D1, R2, Durable Objects |
| Test | Vitest, Playwright, TypeScript compiler |
| Mobile prototype | Expo, NativeWind (`mobile/`) |

## 3.5 프로젝트 구조

```text
client/                 React 웹 앱
  public/               이미지·템플릿 자산
  src/components/       공통·Lunchie·Munchie·공유 컴포넌트
  src/pages/            화면과 사용자 흐름
functions/api/          Cloudflare Pages Functions API
server/                 Express 호환 API와 추천 엔진
  data/photos/          운영 원본 캐시 (Git 미포함)
  engine/               추천·그룹 결정·이벤트·스코어링
shared/                 공통 스키마·엔진 타입·인텐트
migrations/             순서가 보장된 D1 마이그레이션
scripts/                데이터·배포·R2 복원 도구
e2e/                    Playwright E2E
docs/                   제품·엔진·프로세스 문서
```

---

# 4. 개발 가이드

## 4.1 요구사항

- Node.js **22 이상** (Cloudflare CI도 Node 22 사용)
- Corepack 및 pnpm (`package.json`의 `packageManager` 기준)
- 로컬 Pages/Functions 실행에는 **Cloudflare 로그인·운영 토큰이 필요하지 않음** (`wrangler login` 불필요)

## 4.2 처음 한 번: 로컬 개발 환경

> ⚠️ `.dev.vars`는 프로젝트 관리자에게 별도로 전달받아 **먼저** 프로젝트 최상단에 넣습니다.
> `cp .dev.vars.example .dev.vars`는 전달받은 로그인 설정을 빈 값으로 덮어쓰므로 **실행하지 않습니다.**

```bash
# 0. Node 22인지 확인합니다. 22 미만이면 Node 22를 설치/선택합니다.
node -v

# 1. pnpm을 활성화합니다. 이 컴퓨터에서 한 번만 하면 됩니다.
corepack enable

# 2. main의 잠금 파일과 정확히 같은 의존성을 설치합니다.
pnpm install --frozen-lockfile

# 3. 내 컴퓨터 전용 D1에 스키마와 데모 식당 데이터를 준비합니다.
pnpm cf:d1:migrate:local
pnpm cf:d1:seed:local

# 4. React 화면 + Pages Functions API + 로컬 D1을 한 번에 실행합니다.
pnpm dev:pages
# http://localhost:8788
```

- 정상 기동 시 Wrangler 로그에 `Ready on http://localhost:8788`이 표시됩니다.
- 로컬 D1 바인딩은 `.wrangler/state/v3/d1` 아래의 `lunchie-db`를 사용합니다.
- 3번 명령(`cf:d1:migrate:local`, `cf:d1:seed:local`)은 **로컬 D1을 새로 만들거나 마이그레이션해야 할 때만** 다시 실행합니다.
- 단순 `pnpm dev`는 이 데모의 Cloudflare D1·R2·Google OAuth Functions를 검증하지 않으므로 **사용하지 않습니다.**
- `MEDIA_ORIGIN`은 `.dev.vars`에서 Wrangler가 읽으므로 macOS·Linux·Windows PowerShell 모두 같은 명령을 사용합니다.
- `server/data/photos/`는 Git에 넣지 않는 운영 원본 캐시이므로 팀원이 내려받을 파일이 아닙니다. 로컬 시드는 `drive_ingest.json`의 사진 경로와 `MEDIA_ORIGIN`을 사용해 원본 파일 없이도 식당 카탈로그를 채웁니다. 즉, 로컬에서 식당·세션·추천은 검증하지만 **운영 R2 원본 429장을 내려받거나 복제하지 않습니다.**

## 4.3 환경 변수 (`.dev.vars`)

`.dev.vars`는 `package.json`과 같은 위치(프로젝트 최상단)에 둡니다.
이 파일에는 로컬 Functions만 읽는 비밀값이 있으므로 **절대 커밋하거나 재공유하지 않습니다.**
저장소에 보이지 않는 것이 정상이며 `.gitignore`로 의도적으로 제외됩니다.

```dotenv
GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="..."
AUTH_SESSION_SECRET="긴-무작위-문자열"
# /admin을 볼 Google 계정. 쉼표로 여러 명을 등록할 수 있다.
ADMIN_EMAILS="owner@example.com,developer@example.com"
# 로컬은 운영 R2 원본을 복제하지 않고, 공개 사진 URL만 읽는다.
MEDIA_ORIGIN="https://lunchie-munchie.pages.dev"
```

Google Cloud OAuth 클라이언트의 **Authorized redirect URIs**에는 다음 둘 다 등록합니다.

```text
http://localhost:8788/api/auth/google/callback
https://lunchie-munchie.pages.dev/api/auth/google/callback
```

## 4.4 자주 겪는 설치 문제

| 증상 | 원인·해결 |
|---|---|
| `corepack enable`에서 macOS `EACCES ... /usr/local/bin/pnpm` | Node를 설치한 관리자 권한이 필요한 경우. `sudo corepack enable`을 **한 번만** 실행하고 터미널을 새로 연 뒤 1번부터 계속합니다. |
| `pnpm: command not found` | Corepack이 아직 활성화되지 않았거나 새 터미널이 이전 PATH를 쓰는 경우. `corepack enable` 후 터미널을 다시 열어 확인합니다. |

전역 shim 생성을 피하려면 Corepack을 통해 pnpm을 직접 실행합니다.

```bash
corepack pnpm install
corepack pnpm cf:d1:migrate:local
corepack pnpm cf:d1:seed:local
corepack pnpm dev:pages
```

## 4.5 LAN 기기에서 테스트할 때

- 로컬 Pages 개발 서버는 `0.0.0.0`에서 수신하도록 설정되어 있어 같은 네트워크의 휴대폰 테스트가 가능합니다.
- `http://<개발-PC의-LAN-IP>:8788`처럼 **보안 컨텍스트가 아닌 주소**에서는 일부 브라우저가 `crypto.randomUUID()`를 제공하지 않습니다. 이벤트 로거는 이 경우 시간값과 난수를 조합한 idempotency key로 대체해, 분석 이벤트 때문에 세션 생성이나 화면 이동이 중단되지 않도록 합니다.
- HTTPS 또는 `http://localhost:8788`에서는 기존과 동일하게 `crypto.randomUUID()`를 사용합니다. 대체 키는 **분석 이벤트 중복 방지에만** 사용하며 인증·세션·사용자 식별에는 사용하지 않습니다.
- Google OAuth 로그인은 사설 LAN IP의 HTTP callback을 사용하지 않습니다. 개발 PC에서는 `http://localhost:8788`, 다른 기기에서는 HTTPS로 배포된 Pages 주소를 사용합니다.
- 다른 기기에서 QR 초대 링크를 열려면 빌드 시 `VITE_INVITE_ORIGIN`에 그 기기가 접근할 수 있는 LAN 또는 HTTPS 터널 origin을 지정합니다. `/join` 경로나 초대 토큰은 포함하지 않습니다.

```dotenv
VITE_INVITE_ORIGIN="http://192.168.1.25:8788"
```

## 4.6 테스트와 커밋

```bash
pnpm test:precommit  # 타입 → Vitest → 로컬 Playwright E2E → Pages 빌드
git switch -c feature/short-description
git add <files>
git commit -m "feat: short description"
git push -u origin feature/short-description
```

- `.githooks/pre-commit`은 먼저 **staged Cloudflare 정책 검사**를 하고, 이어서 위 품질 게이트를 모든 일반 커밋 전에 자동 실행합니다.
- Cloudflare의 미승인 리소스·원격 Wrangler 명령·비밀값을 추가하면 즉시 실패하며 커밋되지 않습니다.
- 라이브 E2E는 운영 인증이 필요하므로 커밋 훅에서는 실행하지 않고 릴리스 전 별도 실행합니다.

```bash
pnpm test:e2e:live
```

- 테스트 범위와 새 기능에 반드시 추가해야 할 케이스는 [커밋 품질 게이트 문서](./docs/testing/precommit-testing.md)를 따릅니다.
- 긴급 상황의 `--no-verify`는 예외이며, **병합/배포 전에 반드시 정상 게이트를 통과**해야 합니다.

---

# 5. 운영·배포

## 5.1 Cloudflare CI/CD 흐름

```text
feature branch → Pull Request → Quality gate 통과 → main 병합
  → D1 migration → Durable Object Worker → Pages production deploy
```

- [`.github/workflows/quality.yml`](./.github/workflows/quality.yml): 모든 PR·브랜치 푸시에서 품질 게이트를 실행합니다.
- [`.github/workflows/deploy-cloudflare.yml`](./.github/workflows/deploy-cloudflare.yml): `main`에 병합될 때만 운영 배포합니다. 스키마를 먼저 적용하고 Worker, Pages 순서로 배포합니다.
- 운영 공개 URL은 계속 공개이며, 미리보기/관리 화면만 Cloudflare Access 정책으로 보호합니다.

## 5.2 GitHub Actions Secrets

저장소 **Settings → Secrets and variables → Actions**에 다음 Repository secrets를 추가합니다.
토큰 값과 `.dev.vars`는 절대 코드·로그·PR에 넣지 않습니다.

| Secret | 용도 | 최소 Cloudflare 권한 |
| --- | --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 계정 식별자 | 비밀값 아님이나 Actions secret으로 보관 |
| `CLOUDFLARE_WORKER_DEPLOY_TOKEN` | Durable Object Worker와 Pages 배포 | Account: Workers Scripts Edit, Durable Objects Edit, Pages Edit |
| `CLOUDFLARE_D1_MIGRATIONS_TOKEN` | 운영 D1 마이그레이션만 | Account: D1 Edit (`lunchie-db` 범위) |

- 토큰은 Cloudflare Dashboard → **Manage account → Account API tokens**에서 만들고, 가능한 한 Lunchie Munchie 리소스로 범위를 제한합니다.
- 배포 토큰에 **R2 읽기/쓰기, 사용자 관리, Zone/DNS, Billing 권한을 넣지 않습니다.** CI는 사진을 업로드하지 않으므로 R2 토큰도 추가하지 않습니다.
- Cloudflare Pages Secrets(`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SESSION_SECRET`)는 **GitHub Actions secret으로 복제하지 않습니다.** 한 번만 Cloudflare에 저장합니다.

```bash
pnpm cf:auth:secrets
```

## 5.3 관리자 대시보드 접근 정책

- `/admin`은 공개 링크나 앱 메뉴에 노출하지 않으며, **Google 로그인과 `ADMIN_EMAILS` 허용 목록을 모두 통과한 계정만** 볼 수 있습니다.
- 운영 환경에서는 Cloudflare Pages 프로젝트의 **Settings → Variables and Secrets → Add**에서 `ADMIN_EMAILS`를 **Secret**으로 등록합니다.
- 값은 대시보드 접근을 허용할 Google 이메일을 쉼표로 구분한 문자열입니다.
- 이 값은 **GitHub Secrets나 저장소 파일에 넣지 않습니다.**

## 5.4 권한·운영 정책

- Cloudflare 접근은 **Lunchie Munchie 리소스만** 허용하며, 개발자는 운영 쓰기 권한 없이 PR과 자동 배포로 작업합니다.
- 운영 수동 명령은 일반 개발자가 실행하지 않습니다. 중대 장애에서만 승인된 break-glass 절차로 실행하고, 일반 배포는 GitHub Actions를 사용합니다.
- 허용 리소스, 토큰별 정확한 명령 범위, 금지 항목, 데이터 변경과 비상 절차는 [CI/CD · Cloudflare 접근 정책](./docs/process/ci-cd-cloudflare-access-policy.md)을 **단일 기준**으로 따릅니다.

---

# 6. 브랜치 통합 상태

## 6.1 `tl_branch`

- 최종 기능 커밋: **2026-08-07** · `8060c7a6`
- Quick Match 설정·투표 대기·결승·Munchie 공유 기능은 2026-08-14에 `production`으로 통합되었습니다.
- 현재는 별도 진행 브랜치가 아니라 통합 완료된 이력 브랜치입니다.

## 6.2 `main_Photo_Editing_Bug_Fixing_Branch`

- 최종 기능 커밋: **2026-08-08** · `b9ec26ba`
- 사진 편집·템플릿·피드 에디터 변경은 2026-08-14에 `production`으로 통합되었습니다.
- 원본 4:3 템플릿 10개와 변환 템플릿 19개는 현재 하나의 29종 카탈로그로 공존합니다.
- 현재는 별도 진행 브랜치가 아니라 통합 완료된 이력 브랜치입니다.

---

# 7. 참고

## 7.1 운영 제약과 검증 범위

- Google OAuth, D1, R2, Durable Objects는 해당 Cloudflare 바인딩과 비밀값이 있어야 완전하게 동작합니다.
- 로컬 Pages는 로컬 D1과 `MEDIA_ORIGIN`을 사용하며 운영 R2 원본을 복제하지 않습니다.
- 사전 커밋 게이트에는 TypeScript, Vitest, 로컬 Playwright E2E와 Pages 빌드가 포함됩니다.
- 운영 인증이 필요한 live E2E는 `pnpm test:e2e:live`로 별도 실행합니다.
- `/admin`은 Google 로그인과 `ADMIN_EMAILS` 허용 목록이 모두 필요합니다.

## 7.2 문서 정합성 결정사항

| 항목 | 현재 기준 |
| --- | --- |
| 서버 런타임 | 운영은 Cloudflare Pages Functions + Hono, Express는 로컬·호환 개발 경로 |
| 데이터 | 운영은 D1·R2·Durable Objects, `DATABASE_URL` PostgreSQL은 Express 개발 호환 경로 |
| E2E | 로컬 Playwright E2E는 사전 커밋 게이트 포함, 운영 인증 live E2E는 별도 |
| 패키지 매니저 | pnpm을 단일 기준으로 사용 |
| 템플릿 | 원본 4:3 10종 + 변환 4:3 19종 = 29종, 9:16 공유 원본은 19종 |
| 브랜치 | `tl_branch`와 사진 편집 브랜치는 모두 `production` 통합 완료 |
| 테스트 수 | 고정 숫자 대신 CI와 `pnpm test:precommit` 결과를 기준으로 확인 |

## 7.3 관련 문서

- [통합 기능 명세](./docs/SPEC.md)
- [프로토타입 평가 요약](./docs/Prototype-Evaluation-Summary.md)
- [기획·엔진 산출물 목록](./docs/DELIVERABLES.md)
- [커밋 품질 게이트](./docs/testing/precommit-testing.md)
- [CI/CD · Cloudflare 접근 정책](./docs/process/ci-cd-cloudflare-access-policy.md)
- [로컬 Cloudflare 개발](./docs/workflow/local-cloudflare-development.md)
- [기술 스택 요구사항](./TECH_STACK_REQUIREMENTS.md)
- [와이어프레임 구조](./wireframe_structure.md)
- [데이터 구조 구현 계획](./1-implementation_plan.md)
- [데이터 마이그레이션 계획](./2-migration_plan.md)
- [DB 계획](./3-DB_plan.md)
- [코스맵 오버레이 계획](./4-overlay_map_plan.md)
- [업데이트 와이어프레임](./5-update_wireframe.md)

---

# 8. 변경 이력 (주요 업데이트 · 최신순)

> 최신 코드 반영일은 **2026-08-22**입니다. 주요 기능을 최신순으로 정리하며 SHA 단위 기록은 9장에서 확인합니다.

## 2026-08-22 — 프로필 조작·지도 기반 Munchie 기능 복구

- 프로필 Lunchmate 캐릭터의 포인터 추적·착지·다시 잡기 동작과 E2E 테스트를 안정화했습니다.
- Munchie Feed에 지도 위치·검색 반경 필터를 추가하고 서버 기반 Google Places 검색을 복구했습니다.
- Google OAuth 설정 누락을 로그인 화면에서 명확히 안내하도록 개선했습니다.

## 2026-08-21 — 운영 Google Maps 배포 설정 정비

- 프로덕션 빌드의 Google Maps 키 주입과 두 환경변수 이름 호환을 CI에 반영했습니다.
- `main`과 `production`을 최신 코드로 동기화했습니다.

## 2026-08-19 — 추천 학습 근거의 서버 권위 강화

- 추천 학습 근거를 서버 기록 기준으로 통일하고 운영 브랜치에 반영했습니다.

## 2026-08-17 — 세션·사진·피드 운영 안정성 보강

- 공유 Lunchie 세션, 카드 사진 hydration과 레거시 사진을 복구했습니다.
- 개인화 페이지네이션 피드·안전한 사진 정책·그룹 덱 공정성을 적용했습니다.
- 사진 메타데이터 D1 마이그레이션을 분할하고 로컬 Pages 문서를 보완했습니다.

## 2026-08-14 — 통합 브랜치 반영·식단 테스트 안정화

- 사진 편집·템플릿·Quick Match UI를 `production`에 통합하고 식단 폴백 테스트를 안정화했습니다.

## 2026-08-12 — 추천 근거·그룹 세션 귀속 개선

- 그룹 스와이프를 서버 slate에 귀속하고 메뉴 taxonomy 근거를 추천에 반영했습니다.
- 기능 브랜치 전달 절차를 추가했습니다.

## 2026-08-11 — 메뉴·사진 데이터 근거 확장

- 메뉴 가격·식단 필터, 카탈로그 메뉴·사진 인덱스와 업로드 사진 식당 귀속을 추가했습니다.
- 관리자 사진 커버리지 지표를 정정했습니다.

## 2026-08-10 — Quick Match·프로필 핸들·관리자 화면 개편

- 인원 설정 세로 휠, 멈춘 세션 복구, 공개 `@handle`과 사용자 검색을 추가했습니다.
- 관리자 대시보드를 데스크톱 반응형으로 개편하고 카탈로그·정책 분석을 추가했습니다.

## 2026-08-09 — 위치 기반 Lunchie·추천 분석 강화

- 세션 반경·식사 인텐트 필터와 위치 권한 폴백을 강화했습니다.
- 추천 근거와 정책 기여도를 저장하는 보호된 관리자 분석을 구축했습니다.

## 2026-08-08 — Munchie 템플릿·피드 에디터 개선

- 템플릿·사진 편집과 피드 작성·공유 UX를 통합했습니다.

## 2026-08-07 — Lunchie 투표·Munchie 공유 통합

- Quick Match 설정·그룹 투표·결승과 9:16 공유, Lunchmate 대기 도우미를 통합했습니다.

## 2026-08-05 — 프로필·저장·로컬 실행 안정화

- 저장 삭제 확인, 작성자 사진, 프로필 이름·인증·미디어와 Windows 로컬 실행을 개선했습니다.

## 2026-08-04 — Quick Match·게스트 프로필·로컬 데이터 개선

- Quick Match 설정, 게스트 프로필, 로컬 D1 시드와 LAN 이벤트 호환성을 개선했습니다.

## 2026-08-03 — Google 세션 전환·Cloudflare 변경 정책

- 웹 Supabase 런타임을 제거하고 Google 세션으로 전환했으며 Cloudflare 승인 정책을 적용했습니다.

## 2026-08-02 — 데이터 흐름 복구·안전한 병합 절차

- 인증 전 프로필과 데이터 기반 클라이언트 흐름을 복구하고 안전한 병합 절차를 추가했습니다.

## 2026-08-01 — D1 기반 세션·피드·프로필 운영 전환

- Lunchie 초대·여정·저장과 Munchie 피드·사진·프로필을 서버 권위 데이터로 통합했습니다.
- pnpm·Playwright 품질 게이트와 Cloudflare 전달 가이드를 정비했습니다.

## 2026-07-31 — 추천 엔진 감사·확률 모델 보정

- propensity·평판 사전확률·`contextFit`을 보정하고 엔진 감사·D1 전환 계획을 문서화했습니다.

## 2026-07-27 — Drive 실데이터 기반 전환

- mock 대신 Drive 실데이터를 사용하고 사진 자체 서빙·EXIF GPS·지오코딩을 적용했습니다.

## 2026-07-26 — 실사진 카탈로그·피처 스토어 연결

- Drive 실사진 118곳 카탈로그와 피처 스토어를 실제 서빙 흐름에 연결했습니다.

## 2026-07-25 — Drive 사진 인제스천 완료

- Drive 사진 인제스천으로 추천 콜드스타트를 완화하고 관련 문서를 갱신했습니다.

## 2026-07-24 — Lunchmate·저장 화면 개선

- Lunchmate 방·코스튬·XP·레벨과 저장 화면 지도·목록 전환을 추가했습니다.

## 2026-07-23 — 프로필·코스맵·피드 상태 보존

- 프로필 표시, 코스맵 식당 강조·작성자 이동, 피드 스크롤·장식 상태 보존을 적용했습니다.

## 2026-07-22 — 모바일 UI·Lunchie 세션·Munchie 코스맵 정돈

- 모든 공통 하단 내비게이션의 표시 높이를 Safe Area 포함 `88px`로 통일하고, 본문·고정 액션·플로팅 버튼의 하단 여백을 공통 토큰으로 연결
- 홈·Munchie Feed·저장목록·프로필 하단 바의 상단 모서리와 돌출 효과를 제거해 화면 전체 폭에 맞닿는 플랫한 형태로 통일
- 프로필 탭 아이콘을 `51px`로 확대하되 다른 탭 아이콘과 활성·비활성 상태 및 터치 영역은 유지
- 홈 상단을 40px 공통 원형 아이콘 버튼과 60px 런치킨 캐릭터로 정리하고, 캐릭터 floating과 두 번의 blink를 별도 레이어로 분리해 동시 실행
- 홈 알림과 프로필 설정 버튼에 공통 Safe Area 위치 래퍼를 적용하고, 홈 헤더 두 문구를 22px·중앙 정렬·`#935B5C`로 유지
- Lunchie 선택 카드를 컴팩트하게 조정하고 Quick Match 버튼과 겹치지 않는 실제 레이아웃 간격으로 재구성
- 홈 Munchie 카드의 프로필 여백과 작성자명·한줄평 색상/굵기를 정돈하고 카드 내부 댓글의 싫어요 UI를 제거
- Munchie Feed 제목을 `#DB2837`로 변경하고 새 피드 작성 버튼을 `65×65px`, 하단 바 상단과 `43px` 간격인 고정 원형 `+` 버튼으로 변경
- Munchie Template 화면에서 제목·위치·식당 목록·연결 피드 영역을 제거하고 템플릿, 태그, 시간, 스팟 수, 작성자 한줄평만 한 화면 흐름으로 정리
- 템플릿의 저장·상세 코스 보기와 코스맵의 복사해서 편집 액션 바를 높이 `88px`인 공통 하단 액션 스타일로 통일하고 불필요한 chevron 제거
- 코스맵 보기의 지도 높이를 `270px`로 조정하고 지도·장소 목록의 과일 핀을 1~3번 숫자 마커와 지정 색상으로 교체
- 코스맵 작성 첫 단계에서 직접 사진 업로드·교체·삭제 UI를 제거하고, 장소 선택 이후 템플릿 꾸미기 단계의 사진 편집 흐름은 유지
- 코스맵 식당 상세에서 이미지 위 텍스트·그라데이션과 음수 여백을 제거하고 식당명·정보·메뉴를 일반 세로 흐름으로 배치하며 Munchie 후기 조회 영역 제거
- Lunchie 설정의 `Swipe 시작하기` 이모지를 제거하고 로비의 투표 CTA와 공통 스타일로 통일했으며 세션 생성 토스트를 Safe Area 아래 상단에 표시
- 세션 로비의 링크 복사·공유 버튼을 `#FCB3A8`, 본문 텍스트를 `#3E2922`로 정리하고 WAITING을 `13.5px`·`78×36px` 중앙 정렬 배지로 확대
- 예선 X·하트 버튼을 `75×75px`로 조정하고 기존 `32px` 간격과 투표 모션을 유지했으며, 결승 CTA의 아이콘을 제거하고 두 버튼 크기를 통일
- Cloudflare Pages Functions의 Google 세션과 D1을 인증·데이터의 단일 기준으로 사용
- ✅ TypeScript 검사, Vitest 테스트 파일 21개·테스트 249개, Vite·Express 프로덕션 빌드 통과

## 2026-07-21 — 홈·Munchie Feed·템플릿 레이어 전면 개편

- 홈 랜딩에서 불필요한 영문 보조 문구를 제거하고 로고·알림·메인 카피·음식 이미지의 크기와 간격을 모바일 기준으로 재정렬
- Lunchie 섹션의 커피·밥·디저트 카드를 실제 음식 이미지로 교체하고 좌우 카드를 자연스럽게 기울였으며, Quick Match 버튼을 중앙 카드와 겹치는 코랄 CTA로 개편
- Lunchie와 Munchie 섹션의 좌우 여백과 카드 시작선을 통일하고 홈 Munchie 카드는 이미지·작성자·게시일·신고 메뉴만 간결하게 노출
- 하단 탭 바에 Munchie 전용 아이콘을 적용하고 중앙 Lunchie 아이콘을 기준으로 전체 아이콘 크기와 간격을 균등하게 조정
- 알림 버튼에 브랜드 컬러와 터치 모션을 적용하고, 확인한 알림은 목록에서 제거하며 모두 확인하면 `더이상 새로운 알람이 없어요` 상태를 표시
- 알림·홈·저장목록·마이프로필에서 연 피드나 템플릿은 상세 화면의 뒤로가기로 각각의 출발 화면에 복귀하도록 이동 상태를 보존
- Munchie Feed 헤더 문구를 `다녀온 맛집 코스피드를 함께 공유해요`로 정리하고 카드 하단의 좋아요·댓글·코스맵·공유·저장 아이콘을 동일한 크기와 컬러로 통일
- 카드 내부의 상시 댓글 입력창을 제거하고 말풍선 버튼으로 여는 전체 폭 하단 댓글 시트에서 댓글·답글·반응·신고·추가 입력을 처리하도록 변경
- 홈·저장목록·마이프로필의 Munchie 카드를 공용 컴포넌트로 통합하고, 슬림한 한줄평과 상세·수정·댓글 동작을 화면 목적에 맞게 일관되게 적용
- 코스맵 상세의 지도 사진과 중복 한줄평을 제거하고 주소·소요 시간·스팟 수를 정돈했으며, 템플릿 상세에서는 `PLACES IN TEMPLATE` 위에 작성자 한줄평을 표시
- Munchie Feed 작성·수정 화면에서 템플릿 위 사진을 직접 업로드하고 위치·크기·회전을 편집할 수 있게 했으며, 사진은 최대 6장까지 추가 가능
- 사진 편집 컨트롤에 시계·반시계 방향 회전을 모두 제공하고 피드 관련 사용자 문구를 `Munchie Feed`로 통일
- 모든 템플릿을 배경→사진→프레임의 3개 레이어로 분리하고, 프레임은 불투명하게 유지하면서 사진만 실제 프레임 내부 윤곽에 맞춰 가려지도록 투명 오버레이를 생성
- ✅ TypeScript 검사, Vitest 테스트 파일 21개·테스트 248개, Vite·Express 프로덕션 빌드 통과

## 2026-07-20 — Munchie Feed·코스맵·스토리 공유 전면 통합

- 기존 Munchie 카드, 코스 선택 페이지, 별도 코스 편집 페이지, 스킨·팔레트 흐름을 제거하고 피드와 코스맵을 동시에 만드는 단일 에디터로 통합
- 모든 신규·기존 게시물의 장소를 최대 3곳으로 제한하고 4곳 이상인 과거 데이터·사진·시드 데이터를 3곳 이하로 정규화
- 홈 랜딩의 Lunchie·Munchie 영역 비율과 로고·선택 카드·Quick Match 배치를 모바일 화면에 자연스럽게 재구성
- 홈 Munchie 영역을 4:3 전체 카드가 보이는 가로 캐러셀로 변경하고, 카드 자체가 아닌 각 게시물의 한줄평만 주기적으로 갱신
- Munchie Feed 전체 카드의 검정 테두리와 흐림·불투명 배경을 제거하고 앱의 소프트 코랄 팔레트와 자연스러운 아이콘 색상으로 통일
- Feed 작성 버튼 문구를 `+ Munchie Feed`로 변경하고, 게시 완료 후 `Munchie 홈으로` 또는 9:16 공유 화면으로 이동
- 공용 따옴표형 한줄평 박스를 도입해 피드·코스 상세·편집·저장 화면의 표현을 통일
- 한줄평을 클릭하면 입력 영역과 댓글 목록을 확장하고 댓글 좋아요·싫어요·신고, 작성자 댓글 숨김 기능 제공
- 코스맵 상세의 한줄평·공유·저장·지도·통계·연결 피드·코스 순서를 기본 카드 UI로 재설계
- 지도 사진을 과일 핀 중심으로 드래그할 수 있게 하고 코스 경로가 잘리지 않도록 지도 영역과 좌표 계산 개선
- 코스 순서의 첫 터치는 선택 하이라이트, 동일 항목의 두 번째 터치는 레스토랑 상세정보 표시로 변경
- 레스토랑 상세 화면에 기본 정보, 메뉴 사진, 해당 장소가 포함된 Munchie Feed 후기를 함께 표시
- 프로필의 중복 피드 컴포넌트를 제거하고 나의 피드를 2열로 표시하며 한줄평 수정·댓글 숨김 관리 지원
- 저장 목록 명칭을 `Munchie 먼치픽`으로 변경하고 저장된 Munchie 맵을 2열로 계속 스크롤해 탐색하도록 개편
- Feed 헤더의 선물 아이콘을 팔레트 아이콘으로 교체하고 4:3·9:16 기본 템플릿 전체를 확인하는 전용 브라우저 추가
- 9:16 스토리 공유 화면에서 사진을 템플릿 위에서 직접 추가·삭제·드래그·핀치·휠 확대/축소·양방향 회전 가능하도록 구현
- 선택 사진의 왼쪽 위 `+`, 오른쪽 위 `−`, 왼쪽 아래 반시계 회전, 오른쪽 아래 시계 회전 컨트롤을 제공하고 템플릿 배경 터치 시 숨김
- 9:16 템플릿 하단에 사진을 가리지 않는 50% 투명도의 한줄평 인용 박스를 배치하고 최종 결과를 PNG로 저장
- 코스맵 공유 아이콘과 게시 완료 공유 버튼을 모든 9:16 템플릿 선택 화면으로 연결하고 Instagram 스토리·앱 링크·이미지 저장 지원
- 런치킨 캐릭터와 모션 자산, 과일 코스 핀, 4:3 템플릿 자산을 추가하고 관련 화면에 일괄 반영
- 오늘의 여정과 내 피드의 좋아요·싫어요·댓글 알림을 홈 상단 알림 센터에 통합
- ✅ TypeScript 검사, Vitest 테스트 파일 21개·테스트 248개, Vite·Express 프로덕션 빌드 통과

## 2026-07-13 — 새 코스 생성·템플릿 완성 흐름 개편

- 새 코스 생성 완료 시 코스 상세 대신 `Munchie 템플릿 에디터 / 공유하기`로 즉시 연결
- 새 코스의 제목·장소·사진·거리·소요 시간을 실제 생성 데이터로 공유 템플릿에 반영
- 새 코스에서 선택·변경한 사진을 보존해 템플릿 드래그·확대·회전 편집으로 연결
- 공유 화면 하단을 코랄 색상의 기존 공유 버튼과 `템플릿 완성 및 홈으로` 버튼의 2열 UI로 개편
- 템플릿 완성 시 Munchie Mode의 Template 탭으로 복귀하도록 완료 동선 추가

## 2026-07-13 — Munchie 음식 태그 필터 통합

- Munchie Mode의 필터를 `전체 · 맛집 · 데이트코스 · 혼밥 · 카페 · 펍나이트 · 브런치 · 디저트 · 가성비`의 음식 중심 체계로 전면 교체
- Munchie Feed, Munchie Template, 코스 탐색, 저장 목록의 필터 순서와 명칭을 공통 상수로 통합
- Lunchie 취향 설정과 코스 상세 태그도 동일한 음식 태그 체계를 사용하도록 일괄 적용
- 기존 코랄 중심 디자인 시스템을 유지하면서 새 태그별 칩 색상을 기존 팔레트로 연결
- 이전 `데이트 코스`, `혼자 여행`, `전시/문화`, `액티비티`, `맛집 투어` 태그를 새 태그로 자동 정규화하는 호환 로직 추가
- 로컬 저장 코스·피드와 API 응답 데이터에도 태그 정규화를 적용해 기존 사용자 데이터 유지

## 2026-07-13 — 피드 미리보기·알림 센터·Munchie 템플릿 에디터

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

## 2026-07-13 — 랜딩·Munchie·프로필·Quick Match UX 개선

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

## 2026-07-13 — Munchie 피드 및 코스맵 커스터마이징

- Munchie 피드와 새 게시물 작성 화면 추가
- 피드 카드, Foodie Buddy, 식당 상세 시트 추가
- 코스맵 템플릿 카드·스킨 프레임·스킨 선택기 추가
- CD, 티켓, 영수증, 런치 트레이 공유 템플릿 추가
- 홈, 탐색, 저장, 프로필, 코스 상세·편집·공유 화면 통합 개선
- 이미지 처리 유틸리티와 템플릿·크리에이터·스킨 상수 추가

## 2026-07-02 — 세션·결승 플로우 안정화

- 초대 세션 API timeout 조정
- 결승 대기 화면 완료 배지 오류 수정
- 길찾기에서 돌아올 때 결과가 유실되던 문제 수정
- 그룹 결승전 대각선 듀얼 애니메이션 복원
- 덱이 목표 카드 수보다 적을 때 예선이 끝나지 않던 문제 수정
- 실제 덱 크기와 `targetCount` 불일치로 결과 화면에 진입하지 못하던 문제 수정

## 2026-06-29 — 그룹 결정 모델

- least-misery 집계와 Top 2 그룹 결승 투표
- 3지선다 그룹 결정 UI
- 세대(`generation`) 기반 결정 라우팅
- 미움 후보를 제외한 `REROLL` 재스와이프
- 합의 실패(`NO_CONSENSUS`) 처리
- 그룹 결정 모델·데이터 수집·워크플로우 문서화

## 2026-06-26 — 오늘의 여정 및 추천 인텐트

- 인텐트↔카테고리 매핑과 추천 필터
- 오늘의 스톱 추출 및 `/api/journey/today`
- 우승 결과를 오늘의 여정 이벤트로 연결
- 홈 `오늘의 여정` 카드
- Vitest 설정과 엔진 단위 테스트 추가

## 2026-06-23~25 — 추천 엔진·계측 고도화

- 취향, 피로도, 포만감, 음식 연쇄 서브스코어러
- Contextual Bandit과 Thompson Sampling
- 그룹 취향 합성과 듀얼 pairwise 학습
- 명시적 신호 및 cross-city 전이
- 데이터 신뢰성부터 A/B readout까지 단계별 메트릭 대시보드
- 솔로/그룹 인원 설정, 참여 제한, 추천 맥락 반영
- 결승 무한루프와 중도 이탈 오탐 수정

## 이전 통합 업데이트

- Lunchie 예선→결승→우승 전체 스와이프 플로우
- 세션 생성·초대·참여·준비·결과 집계 API
- 코스 피드, 상세, 드래그 편집, 지도 경로 동기화
- 코스 태그 및 단계별 지도 컬러 통합
- 공유 이미지 템플릿과 Expo 모바일 프로토타입
- React Context 기반 API/mock 하이브리드 데이터 계층

---

# 9. 전체 Git 커밋 기록 (최신순)

> `production`의 `c1d12bc4`에서 도달 가능한 **370개 커밋**을 빠짐없이 기록합니다. 날짜는 Git committer date 기준입니다.

<details open>
<summary><strong>2026-08-22</strong> — 9개 커밋</summary>

- **병합** [`c1d12bc4`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c1d12bc476d7ec8b372a20b9468cc377ea642990) — Merge pull request #50 from Nor-ter/fix/profile-grab-e2e-ci · Inseong-Hwang-dev
- **변경** [`fb35c49e`](https://github.com/Nor-ter/lunch-munchie_proto/commit/fb35c49e6822fc7e10b01f570bf95a6750dccd8a) — fix: keep profile regrab e2e on gesture, not clipped box pixels · Inseonghhwang
- **병합** [`d2cb457a`](https://github.com/Nor-ter/lunch-munchie_proto/commit/d2cb457a3d7d4854702e949d6a705012a8d63a15) — Merge pull request #49 from Nor-ter/codex/restore-coursemap-places · Inseong-Hwang-dev
- **변경** [`7e4ec3c5`](https://github.com/Nor-ter/lunch-munchie_proto/commit/7e4ec3c58bc037ff1ab9480c5646d21477cb4123) — fix: freeze profile grab using the painted CSS translate · Inseonghhwang
- **변경** [`792d391d`](https://github.com/Nor-ter/lunch-munchie_proto/commit/792d391d94370514570a00b5ee922605ee4a3559) — fix: freeze profile grab at the painted landing position · Inseonghhwang
- **변경** [`463234b1`](https://github.com/Nor-ter/lunch-munchie_proto/commit/463234b1d6f3e97f65b97239f8164d5f26fcd62f) — fix: make profile lunchmate grab follow the pointer · Inseonghhwang
- **변경** [`0cab38c1`](https://github.com/Nor-ter/lunch-munchie_proto/commit/0cab38c13ef07709ad0f7695859e09842ccb61ab) — fix: surface missing Google OAuth config on login · Inseonghhwang
- **변경** [`909c5228`](https://github.com/Nor-ter/lunch-munchie_proto/commit/909c5228f0b435e6f28ebd429c98780f906a0e7a) — feat: filter the Munchie feed by map location and radius · Inseonghhwang
- **변경** [`aac49d1d`](https://github.com/Nor-ter/lunch-munchie_proto/commit/aac49d1d5fddf73163e3a52a24eddeb3cdc45bef) — feat: restore server-backed Google Places on coursemap create · Inseonghhwang

</details>

<details>
<summary><strong>2026-08-21</strong> — 6개 커밋</summary>

- **병합** [`87a536ed`](https://github.com/Nor-ter/lunch-munchie_proto/commit/87a536ed00a21c201df877eb5a9208bdaec556c7) — Merge pull request #48 from Nor-ter/codex/merge-production-into-main · Inseong-Hwang-dev
- **병합** [`c2ac65bf`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c2ac65bfc54a5ef834d2c616b7dce953a7f32991) — Merge latest main into production integration · Inseonghhwang
- **병합** [`22bdb77d`](https://github.com/Nor-ter/lunch-munchie_proto/commit/22bdb77d45527ce025242503d7d14d83860f8ed2) — Merge pull request #47 from Nor-ter/codex/support-both-google-maps-env-names · Jongho Park
- **변경** [`cac3233d`](https://github.com/Nor-ter/lunch-munchie_proto/commit/cac3233df256060ff6c08de63b206f6800285442) — ci: support both Google Maps env names · Jongho Park
- **병합** [`e965e1a3`](https://github.com/Nor-ter/lunch-munchie_proto/commit/e965e1a3fc856e49f7437d7fe028984c36b8ab02) — Merge pull request #46 from Nor-ter/codex/configure-production-google-maps · Jongho Park
- **변경** [`6de7669e`](https://github.com/Nor-ter/lunch-munchie_proto/commit/6de7669e29279251e49830bf3532e4a41c85fbd0) — ci: inject Google Maps key into production build · Jongho Park

</details>

<details>
<summary><strong>2026-08-19</strong> — 3개 커밋</summary>

- **병합** [`b05802c1`](https://github.com/Nor-ter/lunch-munchie_proto/commit/b05802c17204b43c923f89c03de12b920ccf3fc3) — Merge production into main · Inseonghhwang
- **병합** [`c1508ec5`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c1508ec528b2f2dd18484e80d99833114f3025b8) — Merge pull request #45 from Nor-ter/codex/fix-learning-evidence-attribution · Jongho Park
- **변경** [`1cde1e7d`](https://github.com/Nor-ter/lunch-munchie_proto/commit/1cde1e7df75320fce2b64462fd9dcac6b8d2607a) — fix: make learning evidence server authoritative · Jongho Park

</details>

<details>
<summary><strong>2026-08-17</strong> — 16개 커밋</summary>

- **병합** [`b260f438`](https://github.com/Nor-ter/lunch-munchie_proto/commit/b260f438f4dc7e3c7dd9e0fd3fd39849d980c47c) — Merge pull request #44 from Nor-ter/codex/fix-d1-photo-migration-size · Jongho Park
- **변경** [`7579d27e`](https://github.com/Nor-ter/lunch-munchie_proto/commit/7579d27e2ae6f624f8281981dc3c774d917e3255) — fix: split D1 photo metadata migration · Jongho Park
- **병합** [`7d6cbb13`](https://github.com/Nor-ter/lunch-munchie_proto/commit/7d6cbb138d3f2a4873582d60455b6c75673ed75f) — Merge pull request #43 from Nor-ter/codex/demo-photo-feed-safety · Jongho Park
- **변경** [`b99e6349`](https://github.com/Nor-ter/lunch-munchie_proto/commit/b99e634968ba497c990e4e402711dd67dc6bff4a) — fix: restore safe photo and feed ranking metadata · Jongho Park
- **병합** [`7c81ca2d`](https://github.com/Nor-ter/lunch-munchie_proto/commit/7c81ca2daf636e1aa9448fdc6ab018a250f35f72) — Merge pull request #42 from Nor-ter/codex/demo-session-reliability · Jongho Park
- **변경** [`cfc1417b`](https://github.com/Nor-ter/lunch-munchie_proto/commit/cfc1417b55da6c611b12392a33e5892d74a44fa8) — fix: make shared lunchie sessions durable · Jongho Park
- **병합** [`3e0344a9`](https://github.com/Nor-ter/lunch-munchie_proto/commit/3e0344a9b177c96253c4f8135634e36b564a8c37) — Merge pull request #41 from Nor-ter/codex/repair-session-photo-hydration · Jongho Park
- **변경** [`e403e469`](https://github.com/Nor-ter/lunch-munchie_proto/commit/e403e469146fafceef986b5c01edebcfa3e959c5) — fix: recover lunchie card photo hydration · Jongho Park
- **병합** [`31bd56e7`](https://github.com/Nor-ter/lunch-munchie_proto/commit/31bd56e730131e7401abc027748a74adb2fb85a2) — Merge pull request #40 from Nor-ter/codex/restore-production-lunchie-photos · Jongho Park
- **변경** [`d4a91e23`](https://github.com/Nor-ter/lunch-munchie_proto/commit/d4a91e2311bd3689abc8c73d57fcc41eb0bbc91a) — fix: restore legacy restaurant photos in lunchie · Jongho Park
- **병합** [`41ae44e2`](https://github.com/Nor-ter/lunch-munchie_proto/commit/41ae44e26ffa0cfb61f175cbf4bfa7bee328d197) — Merge pull request #39 from Nor-ter/codex/group-algorithm-fairness · Jongho Park
- **병합** [`e19b463a`](https://github.com/Nor-ter/lunch-munchie_proto/commit/e19b463a2ec9ed48da0ade86fa96fbf47d88fdc1) — Merge pull request #38 from Nor-ter/codex/local-dev-guide-recovery · Jongho Park
- **변경** [`f28b0685`](https://github.com/Nor-ter/lunch-munchie_proto/commit/f28b0685f82ccb903d085fa81e02ce6dc438c56b) — fix: remove group deck catalogue-size bias · Jongho Park
- **변경** [`b5e07240`](https://github.com/Nor-ter/lunch-munchie_proto/commit/b5e07240576578b048fc23745fb8bb00a3b0366a) — docs: make local pages setup reproducible · Jongho Park
- **병합** [`fcbd72ea`](https://github.com/Nor-ter/lunch-munchie_proto/commit/fcbd72ea91840857f99f3d1b8b90dbc95866befd) — Merge pull request #37 from Nor-ter/codex/demo-feed-delivery · Jongho Park
- **변경** [`c390fb81`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c390fb81771a7aef5647555d20c04c38334b88f7) — feat: personalise paged feed and safe lunchie photos · Jongho Park

</details>

<details>
<summary><strong>2026-08-14</strong> — 3개 커밋</summary>

- **변경** [`e0de0b21`](https://github.com/Nor-ter/lunch-munchie_proto/commit/e0de0b21da6c06a2c1092d43e16dae8f15750676) — test(lunchie): make dietary fallback timezone-safe · Inseong-Hwang-dev
- **병합** [`065a6112`](https://github.com/Nor-ter/lunch-munchie_proto/commit/065a61124c61989a5176999510a072e3f2169255) — Merge photo editing and template updates into production · Inseong-Hwang-dev
- **병합** [`c8335fa2`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c8335fa2615d6d14074d19d1d3fa571fa7c6f1d7) — Merge sk_branch Quick Match UI into production · Inseong-Hwang-dev

</details>

<details>
<summary><strong>2026-08-12</strong> — 6개 커밋</summary>

- **병합** [`6ae4c451`](https://github.com/Nor-ter/lunch-munchie_proto/commit/6ae4c4512f68d749d8b9a16c84bed131380d6ef9) — Merge pull request #36 from PlanJoker/codex/feature-branch-delivery · Jongho Park
- **변경** [`81bcca23`](https://github.com/Nor-ter/lunch-munchie_proto/commit/81bcca23369e6f9c00782476bd830c8dcd9e455f) — feat(skills): add feature branch delivery workflow · Jongho Park
- **병합** [`ab532e39`](https://github.com/Nor-ter/lunch-munchie_proto/commit/ab532e39d986319129fced3e556e4771385b9484) — Merge pull request #35 from PlanJoker/codex/group-slate-attribution · Jongho Park
- **변경** [`5672b94f`](https://github.com/Nor-ter/lunch-munchie_proto/commit/5672b94f4f016930881fe30b4aa6d0ef9fcb43de) — fix(engine): attribute group session swipes to server slates · Jongho Park
- **병합** [`d758565e`](https://github.com/Nor-ter/lunch-munchie_proto/commit/d758565eaa1c6c7f79ae927413daacd49ae30fb3) — Merge pull request #34 from PlanJoker/codex/menu-taxonomy-evidence · Jongho Park
- **변경** [`517f3803`](https://github.com/Nor-ter/lunch-munchie_proto/commit/517f3803300c9385608d07599a7f5e7b0a340b76) — feat(engine): enrich ranking with menu taxonomy evidence · Jongho Park

</details>

<details>
<summary><strong>2026-08-11</strong> — 14개 커밋</summary>

- **병합** [`d3576f48`](https://github.com/Nor-ter/lunch-munchie_proto/commit/d3576f485de56e33049b50f8ab14b04b2a8d9d18) — Merge pull request #33 from PlanJoker/codex/menu-evidence-budget-filter · Jongho Park
- **변경** [`f377fbd5`](https://github.com/Nor-ter/lunch-munchie_proto/commit/f377fbd529ec156f7ac00d8be8181015deabb72b) — feat(engine): apply budget from menu price evidence · Jongho Park
- **병합** [`e82cfb74`](https://github.com/Nor-ter/lunch-munchie_proto/commit/e82cfb74a23151e9d8d136b1fb45278c3f3193df) — Merge pull request #32 from PlanJoker/codex/menu-evidence-dietary-filter · Jongho Park
- **변경** [`912ba870`](https://github.com/Nor-ter/lunch-munchie_proto/commit/912ba8707a70e88637afd781ffb5680a7bf309ee) — feat(engine): enforce dietary filters from menu evidence · Jongho Park
- **병합** [`d843e290`](https://github.com/Nor-ter/lunch-munchie_proto/commit/d843e2900fc890b7991072835918b21fdb0d221e) — Merge pull request #31 from PlanJoker/codex/menu-index-normalization · Jongho Park
- **변경** [`254d5488`](https://github.com/Nor-ter/lunch-munchie_proto/commit/254d5488f08c006f555f4a1bb2deee303e2e824c) — feat(data): index catalogue menu metadata · Jongho Park
- **병합** [`c98fbda9`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c98fbda9401bc05c769c12ffdaf54f118faf0829) — Merge pull request #30 from PlanJoker/codex/photo-attribution-flow · Jongho Park
- **변경** [`cbcc4fe0`](https://github.com/Nor-ter/lunch-munchie_proto/commit/cbcc4fe08879f1b50e8922d0fddc5d46ebe47140) — feat(feed): attribute uploaded photos to course restaurants · Jongho Park
- **병합** [`9bae4694`](https://github.com/Nor-ter/lunch-munchie_proto/commit/9bae4694953e842d663012cac6e1933f3ef16ddf) — Merge pull request #29 from PlanJoker/codex/catalogue-photo-index · Jongho Park
- **변경** [`41c25758`](https://github.com/Nor-ter/lunch-munchie_proto/commit/41c25758949244256713f3fa455e83a4886f1311) — feat(data): index catalogue photo metadata · Jongho Park
- **병합** [`3bf818c8`](https://github.com/Nor-ter/lunch-munchie_proto/commit/3bf818c8f2c786e3a84e604f30d0ef9b46dc6b7b) — Merge pull request #28 from PlanJoker/codex/admin-photo-index-label · Jongho Park
- **변경** [`bd591f5d`](https://github.com/Nor-ter/lunch-munchie_proto/commit/bd591f5db58afc7dcbbdacb312eb5c5874475c4a) — fix(admin): clarify photo metadata metric · Jongho Park
- **병합** [`f40685fe`](https://github.com/Nor-ter/lunch-munchie_proto/commit/f40685feec8ececeabbb97fef771b81da9b5e657) — Merge pull request #27 from PlanJoker/codex/fix-catalogue-total · Jongho Park
- **변경** [`9d4142a8`](https://github.com/Nor-ter/lunch-munchie_proto/commit/9d4142a8119222685b7ae6a4ae16a8821d40a672) — fix(admin): use catalogue restaurant total for coverage · Jongho Park

</details>

<details>
<summary><strong>2026-08-10</strong> — 18개 커밋</summary>

- **변경** [`47a38bf6`](https://github.com/Nor-ter/lunch-munchie_proto/commit/47a38bf6a767d26ecea89e4b3c6161804ba9ea21) — feat(lunchie): unify people count with a vertical wheel · Inseong-Hwang-dev
- **변경** [`3d1e71a5`](https://github.com/Nor-ter/lunch-munchie_proto/commit/3d1e71a574e210f39d5523a96c164e3366d0f77e) — fix(lunchie): clear stuck Quick Match sessions without credentials · Inseong-Hwang-dev
- **병합** [`69929f07`](https://github.com/Nor-ter/lunch-munchie_proto/commit/69929f07b81fcc591f93f5d27176cfb7b5094a81) — Merge pull request #26 from PlanJoker/codex/admin-catalogue-health · Jongho Park
- **변경** [`21b6579e`](https://github.com/Nor-ter/lunch-munchie_proto/commit/21b6579e6d98a0823380e858fc3434548763f6ba) — feat(admin): add catalogue health analytics · Jongho Park
- **병합** [`1e8befa4`](https://github.com/Nor-ter/lunch-munchie_proto/commit/1e8befa40f6d7414b5ef340abcebaf3dd8d76b46) — merge: integrate merge4_v3_hi social features · Inseong-Hwang-dev
- **변경** [`a31cd342`](https://github.com/Nor-ter/lunch-munchie_proto/commit/a31cd342322e6507e8cefa4156a1393c88b97b8d) — update lunchie page · elliekw
- **병합** [`b10dcc9f`](https://github.com/Nor-ter/lunch-munchie_proto/commit/b10dcc9f880eef3e0d444e60f8e1f170e329a733) — merge: integrate tl_branch UI into production · Inseong-Hwang-dev
- **병합** [`277133cb`](https://github.com/Nor-ter/lunch-munchie_proto/commit/277133cb291244952131e2c37bb9831605387933) — Merge pull request #25 from PlanJoker/codex/admin-full-viewport · Jongho Park
- **변경** [`6d2e5ee3`](https://github.com/Nor-ter/lunch-munchie_proto/commit/6d2e5ee36ef4f7df2f177a747b8de224b25ff361) — fix(admin): render dashboard outside mobile app shell · Jongho Park
- **변경** [`2d14d46b`](https://github.com/Nor-ter/lunch-munchie_proto/commit/2d14d46b6bdce070eb11c0764e4ba57cbf0afeec) — feat(feed): search users by name or @handle · Inseong-Hwang-dev
- **변경** [`49f31b6b`](https://github.com/Nor-ter/lunch-munchie_proto/commit/49f31b6ba73f09cc38e169b9feec51d878810e93) — feat(profile): edit and display public @handle · Inseong-Hwang-dev
- **변경** [`6da7c2ee`](https://github.com/Nor-ter/lunch-munchie_proto/commit/6da7c2ee6f8761bc27d2475722f8b7639f59f583) — feat(handles): add public @handle schema and user search API · Inseong-Hwang-dev
- **병합** [`880a2d1f`](https://github.com/Nor-ter/lunch-munchie_proto/commit/880a2d1fbb2503307f8214191e7786882f253bca) — Merge pull request #24 from PlanJoker/codex/responsive-admin-dashboard · Jongho Park
- **변경** [`a983e14b`](https://github.com/Nor-ter/lunch-munchie_proto/commit/a983e14bc7e5f15acc61973c3d883eec90c802c2) — fix(admin): make dashboard responsive · Jongho Park
- **병합** [`47a7a7f1`](https://github.com/Nor-ter/lunch-munchie_proto/commit/47a7a7f141d0fa7b1048ba60af302860731b3193) — Merge pull request #23 from PlanJoker/codex/desktop-admin-dashboard · Jongho Park
- **변경** [`f920750c`](https://github.com/Nor-ter/lunch-munchie_proto/commit/f920750c48a3328a54d7b84eb7802dedbee437b2) — feat(admin): make dashboard desktop-first · Jongho Park
- **병합** [`f92abe49`](https://github.com/Nor-ter/lunch-munchie_proto/commit/f92abe49f03d98c86e0eb8e5ccf18c08c30e2586) — Merge pull request #22 from PlanJoker/codex/policy-contribution-insights · Jongho Park
- **변경** [`216af076`](https://github.com/Nor-ter/lunch-munchie_proto/commit/216af076e0c9f010989132eaeb7f80667b50af8c) — feat(admin): explain policy contributions · Jongho Park

</details>

<details>
<summary><strong>2026-08-09</strong> — 22개 커밋</summary>

- **병합** [`2ba5a259`](https://github.com/Nor-ter/lunch-munchie_proto/commit/2ba5a259697cc5bc33f21fd30c39451fe077f00c) — Merge pull request #21 from PlanJoker/codex/algorithm-evidence-dashboard · Jongho Park
- **변경** [`775ec2f4`](https://github.com/Nor-ter/lunch-munchie_proto/commit/775ec2f42cb92aaa6d73bfed51c9f5a66b2414c9) — feat(engine): persist recommendation evidence and insights · Jongho Park
- **병합** [`20f8d3ea`](https://github.com/Nor-ter/lunch-munchie_proto/commit/20f8d3ea939d66432439e9dea012b0147a00637b) — Merge pull request #20 from PlanJoker/codex/admin-analytics-dashboard · Jongho Park
- **변경** [`b41ef566`](https://github.com/Nor-ter/lunch-munchie_proto/commit/b41ef5665ff48a5fdc9e0a2a370ff6255018094c) — feat(admin): add protected analytics dashboard · Jongho Park
- **병합** [`16aa54a9`](https://github.com/Nor-ter/lunch-munchie_proto/commit/16aa54a9250180bc34095657261c4fe10b26969a) — Merge pull request #19 from PlanJoker/codex/always-show-location-label · Jongho Park
- **변경** [`4084b8bd`](https://github.com/Nor-ter/lunch-munchie_proto/commit/4084b8bdeaa39e145ce82d181c7a0c5ce60f3d8d) — fix(location): always show resolved locality · Jongho Park
- **병합** [`2828e178`](https://github.com/Nor-ter/lunch-munchie_proto/commit/2828e1784188997604106104e55e69e0c5ccad07) — Merge pull request #18 from PlanJoker/codex/local-location-label · Jongho Park
- **변경** [`119cc0f2`](https://github.com/Nor-ter/lunch-munchie_proto/commit/119cc0f27250350d2c586d64af89aaaf6abee3bf) — feat(location): resolve locality locally · Jongho Park
- **병합** [`11a55966`](https://github.com/Nor-ter/lunch-munchie_proto/commit/11a5596660c8fe12993f45dce529670f4d98ed5e) — Merge pull request #17 from PlanJoker/fix/lunchie-radius-copy · Jongho Park
- **변경** [`594e881a`](https://github.com/Nor-ter/lunch-munchie_proto/commit/594e881a968f09918dd7dc8f3fa3037a94e42bd6) — fix: clarify Lunchie radius and hide coordinates · Jongho Park
- **병합** [`c99afe30`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c99afe306c4fe47a689e9d2424170fcae210351e) — Merge pull request #16 from PlanJoker/fix/location-permission-guidance · Jongho Park
- **변경** [`c652a124`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c652a1245234a732975f9f825c9a1a6c0b82fe6d) — fix: prompt for location when choosing Lunchie radius · Jongho Park
- **병합** [`d80bee2d`](https://github.com/Nor-ter/lunch-munchie_proto/commit/d80bee2d99fb8ab8fbafeca32bb7d1ce2e53e491) — Merge pull request #15 from PlanJoker/fix/location-optional · Jongho Park
- **변경** [`027872ff`](https://github.com/Nor-ter/lunch-munchie_proto/commit/027872ff0166fe3157be232f42453d964801f5e0) — fix: allow Lunchie sessions without location permission · Jongho Park
- **병합** [`a952d27e`](https://github.com/Nor-ter/lunch-munchie_proto/commit/a952d27ed12f89cee3a019e62743ae6d1e8d516d) — Merge pull request #14 from PlanJoker/fix/lunchie-solo-start-feedback · Jongho Park
- **변경** [`0d07d9d9`](https://github.com/Nor-ter/lunch-munchie_proto/commit/0d07d9d97cb71535ded6551518495e15622e02dc) — fix: explain empty Lunchie session candidates · Jongho Park
- **병합** [`9f985c91`](https://github.com/Nor-ter/lunch-munchie_proto/commit/9f985c91a019e3bb42bb3c355ff71b449d86629f) — Merge pull request #13 from PlanJoker/fix/lunchie-distance-context · Jongho Park
- **변경** [`ce63e8ed`](https://github.com/Nor-ter/lunch-munchie_proto/commit/ce63e8ed3c5ece086704a41af51b473b192d9066) — feat: show Lunchie location context and distances · Jongho Park
- **병합** [`4c0b77ea`](https://github.com/Nor-ter/lunch-munchie_proto/commit/4c0b77ea830d77e9aa2c4d35d040e9a9097336e5) — Merge pull request #12 from PlanJoker/fix/lunchie-radius-hard-filter · Jongho Park
- **변경** [`670845d8`](https://github.com/Nor-ter/lunch-munchie_proto/commit/670845d887d296cf13ad58b3709f7b4a1a83aaed) — fix: enforce Lunchie session radius · Jongho Park
- **병합** [`509be6e8`](https://github.com/Nor-ter/lunch-munchie_proto/commit/509be6e8829759c4eefe82414f9fb62bc111f671) — Merge pull request #11 from PlanJoker/fix/lunchie-intent-hard-filter · Jongho Park
- **변경** [`4275785c`](https://github.com/Nor-ter/lunch-munchie_proto/commit/4275785c3358ec717da219a005cd89b1f0073001) — fix: enforce Lunchie meal intent in shared slate · Jongho Park

</details>

<details>
<summary><strong>2026-08-08</strong> — 1개 커밋</summary>

- **변경** [`b9ec26ba`](https://github.com/Nor-ter/lunch-munchie_proto/commit/b9ec26ba575fbd000b9b7c5e2c8802ff87654661) — Update Munchie templates and feed editor UX · Seungyeon Jung

</details>

<details>
<summary><strong>2026-08-07</strong> — 1개 커밋</summary>

- **변경** [`8060c7a6`](https://github.com/Nor-ter/lunch-munchie_proto/commit/8060c7a65336776c4ba302065d22c40c506b9b11) — feat: unify Lunchie voting and Munchie sharing · John Lee

</details>

<details>
<summary><strong>2026-08-05</strong> — 11개 커밋</summary>

- **변경** [`073b216a`](https://github.com/Nor-ter/lunch-munchie_proto/commit/073b216a96d29a974ea6defd0b660a4d195900dd) — feat(saved): confirm before removing saved course · Inseong-Hwang-dev
- **변경** [`f5206a81`](https://github.com/Nor-ter/lunch-munchie_proto/commit/f5206a8167f02aa4674bb3fc3de2d6da542a65ca) — feat(feed): show author profile photos · Inseong-Hwang-dev
- **병합** [`ac71416a`](https://github.com/Nor-ter/lunch-munchie_proto/commit/ac71416a1d76d2d5158720f0f59781e3b187c6fe) — merge: integrate profile settings updates · Inseong-Hwang-dev
- **변경** [`4c3b0582`](https://github.com/Nor-ter/lunch-munchie_proto/commit/4c3b05825b35ad6fe41f502ba55862fcf776098d) — fix: persist profile name · Inseong-Hwang-dev
- **변경** [`dcb9d1fd`](https://github.com/Nor-ter/lunch-munchie_proto/commit/dcb9d1fd12f15ec698511145675449ff65337ba0) — feat: simplify profile settings · Inseong-Hwang-dev
- **병합** [`3ae1f5c1`](https://github.com/Nor-ter/lunch-munchie_proto/commit/3ae1f5c19ec6ec1ce0b256c5ceec60ee597c6bd2) — Merge branch 'main' into merge4_v3_hi · Inseong-Hwang-dev
- **변경** [`c28b6bec`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c28b6becbdb19681b5a3923cce08fc8d9849564c) — fix: stabilize profile auth and media loading · Seungyeon Jung
- **병합** [`51b82ba7`](https://github.com/Nor-ter/lunch-munchie_proto/commit/51b82ba70bd6454e94829e7962f16d43ff4a5ac9) — Merge branch 'sj-branch' · Seungyeon Jung
- **변경** [`5bc2602d`](https://github.com/Nor-ter/lunch-munchie_proto/commit/5bc2602de377964522e24f063207b2e88ad48e7c) — docs: update local setup guide · Seungyeon Jung
- **병합** [`0b418649`](https://github.com/Nor-ter/lunch-munchie_proto/commit/0b418649873a03f5b4bba7e52254fc28e41cb973) — Merge pull request #10 from PlanJoker/fix/windows-local-pages-setup · Jongho Park
- **변경** [`54a80569`](https://github.com/Nor-ter/lunch-munchie_proto/commit/54a80569f38952c06ba8b6d7297604173c39335e) — fix: support Windows Pages local development · Jongho Park

</details>

<details>
<summary><strong>2026-08-04</strong> — 6개 커밋</summary>

- **변경** [`9a81be3e`](https://github.com/Nor-ter/lunch-munchie_proto/commit/9a81be3efdf2aa8f5b295128592f041c964e7a87) — fix: make tl_branch local setup reliable · John Lee
- **병합** [`f6851cfc`](https://github.com/Nor-ter/lunch-munchie_proto/commit/f6851cfc420f80536dd0c5bfffd18a37eba99a12) — Merge pull request #9 from PlanJoker/fix/local-d1-seed-without-photo-cache · Jongho Park
- **변경** [`d8595116`](https://github.com/Nor-ter/lunch-munchie_proto/commit/d8595116ad4e714504a7dd0d21e1deb4e4e44973) — fix: seed local d1 without photo cache · Jongho Park
- **변경** [`5c7e77ed`](https://github.com/Nor-ter/lunch-munchie_proto/commit/5c7e77ed03ab885f98436f88b6c3339293e233f9) — fix: show guest profile preview instead of bare login screen · Inseong-Hwang-dev
- **변경** [`41ee81ab`](https://github.com/Nor-ter/lunch-munchie_proto/commit/41ee81abb0768fa2bac9dafa751c036d48e59b11) — feat: refine Lunchie Quick Match experience · John Lee
- **변경** [`0b74cbb3`](https://github.com/Nor-ter/lunch-munchie_proto/commit/0b74cbb30939f86f581d4ce15df528250b532657) — fix: keep LAN event logging compatible · John Lee

</details>

<details>
<summary><strong>2026-08-03</strong> — 10개 커밋</summary>

- **병합** [`239f1b9c`](https://github.com/Nor-ter/lunch-munchie_proto/commit/239f1b9cc0cc6372cdb8835ddaa60780945be3d2) — Merge pull request #8 from PlanJoker/chore/remove-supabase-web-runtime · Jongho Park
- **변경** [`54e79576`](https://github.com/Nor-ter/lunch-munchie_proto/commit/54e7957623ca43d1724947d6eaf09a828bb4ca67) — chore: remove supabase web runtime · Jongho Park
- **병합** [`4f820183`](https://github.com/Nor-ter/lunch-munchie_proto/commit/4f8201837824f5d3e27e147a48eec3b7a2445662) — Merge pull request #7 from PlanJoker/chore/cloudflare-policy-precommit · Jongho Park
- **변경** [`e0401b4a`](https://github.com/Nor-ter/lunch-munchie_proto/commit/e0401b4a1ffa7f2dd8240f0147bf55991a01ec20) — chore: block unapproved cloudflare changes · Jongho Park
- **병합** [`d4b7d214`](https://github.com/Nor-ter/lunch-munchie_proto/commit/d4b7d214a24f8e157348f3f2944bea2f6e38115d) — Merge pull request #6 from PlanJoker/docs/cloudflare-cicd-access-policy · Jongho Park
- **변경** [`93a52570`](https://github.com/Nor-ter/lunch-munchie_proto/commit/93a52570f35fdd24d9a7a526b2f5e0478b110ec4) — docs: define cloudflare ci access policy · Jongho Park
- **병합** [`ebee3efa`](https://github.com/Nor-ter/lunch-munchie_proto/commit/ebee3efa751ace4e6c247e7ac3ae45b917dd37e1) — Merge pull request #5 from PlanJoker/fix/profile-google-session-state · Jongho Park
- **변경** [`d5ad87e9`](https://github.com/Nor-ter/lunch-munchie_proto/commit/d5ad87e90c92982124679a6cbacba26ab534746d) — fix: use Google session for profile auth state · Jongho Park
- **병합** [`189f38b2`](https://github.com/Nor-ter/lunch-munchie_proto/commit/189f38b228e6b514ce1df90169607e399b6dc5f8) — Merge pull request #4 from PlanJoker/fix/login-route-compatibility · Jongho Park
- **변경** [`f0b9d9d3`](https://github.com/Nor-ter/lunch-munchie_proto/commit/f0b9d9d3ff6a43c2540765f83669a749a14fd42a) — fix: restore legacy login route · Jongho Park

</details>

<details>
<summary><strong>2026-08-02</strong> — 5개 커밋</summary>

- **변경** [`6f418a7d`](https://github.com/Nor-ter/lunch-munchie_proto/commit/6f418a7d001532b0524411ec1c5f173f6a56660a) — feat: add Claude safe merge skill wrapper · Inseong-Hwang-dev
- **변경** [`f6ed4224`](https://github.com/Nor-ter/lunch-munchie_proto/commit/f6ed42249c3cb349821297fa9136adb2129e6eca) — profile page loading issue before authenticated · Inseong-Hwang-dev
- **병합** [`7fa881a0`](https://github.com/Nor-ter/lunch-munchie_proto/commit/7fa881a0681154177979c4daae6a95fc7da30fd0) — merge: integrate hi_merge4 interaction flows · Inseong-Hwang-dev
- **변경** [`832757b7`](https://github.com/Nor-ter/lunch-munchie_proto/commit/832757b77f630b31ec1b42261ae08bbc9f3516b5) — fix: restore data-backed client flows · Inseong-Hwang-dev
- **변경** [`669f2191`](https://github.com/Nor-ter/lunch-munchie_proto/commit/669f219148c0b57755da694e869a82bc77a9a512) — feat: add safe merge workflow skill · Inseong-Hwang-dev

</details>

<details>
<summary><strong>2026-08-01</strong> — 26개 커밋</summary>

- **변경** [`c3cd5bbb`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c3cd5bbb171f796746449ab6db1efcbec2a7b123) — docs: correct quality gate test count · Jongho Park
- **병합** [`c84d729a`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c84d729aadb9510501512fa8dc04ffc9b43fcc20) — Merge pull request #3 from PlanJoker/integration/merge4-v2-data · Jongho Park
- **병합** [`d45dc329`](https://github.com/Nor-ter/lunch-munchie_proto/commit/d45dc329a36d18e9a7906ab19df8e2e8e9449428) — merge: integrate data services into UI v2 baseline · Jongho Park
- **병합** [`6f35a552`](https://github.com/Nor-ter/lunch-munchie_proto/commit/6f35a552abf64deeae41e8144462a8c5362fe1b4) — merge: establish UI v2 as main baseline · Jongho Park
- **변경** [`e6a3640a`](https://github.com/Nor-ter/lunch-munchie_proto/commit/e6a3640a3680bd4655f906f2cb0ad5e481219929) — ci: enable pnpm before dependency installation · Jongho Park
- **변경** [`186cb540`](https://github.com/Nor-ter/lunch-munchie_proto/commit/186cb5408d6d9f70cfb8220057bcd3ba10e73fa4) — docs: add local development and Cloudflare delivery guide · Jongho Park
- **변경** [`71e84492`](https://github.com/Nor-ter/lunch-munchie_proto/commit/71e84492ef887118f72c491be7fb4ddfa235a951) — test: enforce local quality gate before commits · Jongho Park
- **변경** [`4c6e54da`](https://github.com/Nor-ter/lunch-munchie_proto/commit/4c6e54da2c16aba7f7d22612636b92dfe610c00d) — test: isolate Playwright live specs from Vitest · Jongho Park
- **변경** [`e3fbaf7f`](https://github.com/Nor-ter/lunch-munchie_proto/commit/e3fbaf7f8823e4d721794bf6223e8b0883edace5) — fix: make course deletion permanent and explicit · Jongho Park
- **변경** [`bef27dcd`](https://github.com/Nor-ter/lunch-munchie_proto/commit/bef27dcd4cd4f7a32d378fc9e43a71f100b10376) — feat: stabilize shared Lunchie sessions and local media · Jongho Park
- **변경** [`6185e273`](https://github.com/Nor-ter/lunch-munchie_proto/commit/6185e2739ef54d4fb3c3181261d7cd89b9b2e0d8) — Revert "ci: automate worker deployment workflow" · Jongho Park
- **변경** [`ade6f73a`](https://github.com/Nor-ter/lunch-munchie_proto/commit/ade6f73a22107250bf3e29f31bb501adb5c76218) — ci: automate worker deployment workflow · Jongho Park
- **변경** [`0fcd6527`](https://github.com/Nor-ter/lunch-munchie_proto/commit/0fcd652772cbf744f8789231ea3f320f96c2544f) — fix: prevent inviting into solo Lunchie sessions · Jongho Park
- **변경** [`9c8fa1d9`](https://github.com/Nor-ter/lunch-munchie_proto/commit/9c8fa1d9083939aa5a6db373e49040938354aa08) — fix: persist Lunchie invitations in Pages D1 · Jongho Park
- **변경** [`be51e487`](https://github.com/Nor-ter/lunch-munchie_proto/commit/be51e487f85692aeb14342f2a9ca85b6398405c2) — fix: keep Lunchie journey out of home · Jongho Park
- **변경** [`c489a5fc`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c489a5fc590e6058266c101d99053ab938803f67) — fix: unify saved Lunchie picks with journey records · Jongho Park
- **변경** [`efcfcfb8`](https://github.com/Nor-ter/lunch-munchie_proto/commit/efcfcfb8a6ccb303ab9c8ffb72e4a0a6dd8a8854) — feat: group Lunchie picks into daily journeys · Jongho Park
- **변경** [`0242989d`](https://github.com/Nor-ter/lunch-munchie_proto/commit/0242989db67f207b36cc9c2635c4a40db305be19) — fix: make feed deletion server-authoritative · Jongho Park
- **변경** [`3f2b750e`](https://github.com/Nor-ter/lunch-munchie_proto/commit/3f2b750e18d9b5dde46f1d96a71543e426eb538f) — fix: persist profile avatars on server · Jongho Park
- **변경** [`0e531a78`](https://github.com/Nor-ter/lunch-munchie_proto/commit/0e531a78483b8937154bcd09f4b62d14ed0f9986) — fix: render public profiles from D1 identity and feed data · Jongho Park
- **변경** [`81f9ed00`](https://github.com/Nor-ter/lunch-munchie_proto/commit/81f9ed003ac41bb5df44aeb55b960934b19c9f70) — test: enforce feed media consistency across detail views · Jongho Park
- **변경** [`8b167e8a`](https://github.com/Nor-ter/lunch-munchie_proto/commit/8b167e8ad3763e7a9c7fd6841d2a6e4ef90872c6) — feat: normalize canonical course media records · Jongho Park
- **변경** [`c6615fcc`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c6615fccf985d9fed72394479d805f38a1276c88) — fix: never substitute course covers for feed media · Jongho Park
- **변경** [`3d5bb285`](https://github.com/Nor-ter/lunch-munchie_proto/commit/3d5bb285424d5f76c58c94a3b3b335c01ea17699) — fix: require original feed photos and prevent cover duplication · Jongho Park
- **변경** [`12939183`](https://github.com/Nor-ter/lunch-munchie_proto/commit/12939183d8fd1c4e5919fe574f646b1626185399) — fix: render fallback photo for legacy empty feed decor · Jongho Park
- **변경** [`75b8308d`](https://github.com/Nor-ter/lunch-munchie_proto/commit/75b8308d81a4ef5c2283f25c4b16dc50f91fcb55) — feat: persist social feed media and harden platform flows · Jongho Park

</details>

<details>
<summary><strong>2026-07-31</strong> — 5개 커밋</summary>

- **변경** [`4cc3659a`](https://github.com/Nor-ter/lunch-munchie_proto/commit/4cc3659a9463401a128f94beff1402bba38667f0) — docs(engine): 탐색·활용 정책 설계 — 유저 플로우 기반 (승인 대기) · JonghoPark5635
- **변경** [`d9fd3c59`](https://github.com/Nor-ter/lunch-munchie_proto/commit/d9fd3c596ef9e68818b05af23507e5f6fb45826b) — fix(engine): P1 — contextFit 피처 기반 교체 + 절편 항 (감사 개선 2·3) · JonghoPark5635
- **변경** [`80293d26`](https://github.com/Nor-ter/lunch-munchie_proto/commit/80293d268551dc59260e30cf53335b94451e7e7b) — fix(engine): P0 — propensity 마진 포함확률 + 평판 사전확률 (감사 치명 1·3) · JonghoPark5635
- **변경** [`8de5e9ab`](https://github.com/Nor-ter/lunch-munchie_proto/commit/8de5e9abc29eb0bb6c003ca0e1e5e9a9bd92fa99) — docs(engine): 런치 엔진 감사 — 치명 3건 실측 확인 + Cloudflare 계획 D1 확정 · JonghoPark5635
- **변경** [`152807ce`](https://github.com/Nor-ter/lunch-munchie_proto/commit/152807ce19025dae2b330fd159506df8e7cc90f7) — docs(infra): Cloudflare 마이그레이션 계획 — 이미지·DB·알고리즘 · JonghoPark5635

</details>

<details>
<summary><strong>2026-07-27</strong> — 3개 커밋</summary>

- **변경** [`97fbbb3a`](https://github.com/Nor-ter/lunch-munchie_proto/commit/97fbbb3a6fd92d43bcaa43dffab33f448ebc13bc) — feat(munchie): 피드·코스를 드라이브 실데이터로 생성 (서울 mock 제거) · JonghoPark5635
- **변경** [`356a3b46`](https://github.com/Nor-ter/lunch-munchie_proto/commit/356a3b4681821dc4f7e6fe7a706405cee2b65299) — fix(lunchie): 사진을 우리 서버에서 직접 서빙 (드라이브 핫링크 차단 해결) · JonghoPark5635
- **변경** [`c16b5d26`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c16b5d2672554c79172b0953092b525a0d430334) — feat(lunchie): 실좌표 확보 — 사진 EXIF GPS + Nominatim 지오코딩 · JonghoPark5635

</details>

<details>
<summary><strong>2026-07-26</strong> — 6개 커밋</summary>

- **변경** [`265f1a41`](https://github.com/Nor-ter/lunch-munchie_proto/commit/265f1a41b9bda414439234353a738a1242bd1643) — feat(lunchie): 실데이터 전용 카탈로그 — 드라이브 118곳만 서빙, 스톡 사진 전면 제거 · JonghoPark5635
- **변경** [`0a48ce4c`](https://github.com/Nor-ter/lunch-munchie_proto/commit/0a48ce4c74655ce255502b1dcdffec3d682017d4) — feat(lunchie): 드라이브 실사진을 앱에 서빙 + mock 시드 제거 · JonghoPark5635
- **변경** [`f3bcfc5a`](https://github.com/Nor-ter/lunch-munchie_proto/commit/f3bcfc5a7581779ac31f36cf20e57d2c1f938374) — fix(lunchie): 피처 스토어 실서빙 연결 + 영문 카테고리 룰 (콜드스타트 실동작) · JonghoPark5635
- **변경** [`14beed17`](https://github.com/Nor-ter/lunch-munchie_proto/commit/14beed175e2eee8f52866a60c8ffa0d1eb7bd547) — Improved saved course, exploring feature · Inseong-Hwang-dev
- **변경** [`ca725d06`](https://github.com/Nor-ter/lunch-munchie_proto/commit/ca725d06d75d1a0dad0e3457618d0200ce5519af) — Improved munchie feed, course detail flow · Inseong-Hwang-dev
- **병합** [`8fe20f88`](https://github.com/Nor-ter/lunch-munchie_proto/commit/8fe20f88fc5f5b277a4df2a92b16e98537a35be1) — merge: integrate sk profile updates · Inseong-Hwang-dev

</details>

<details>
<summary><strong>2026-07-25</strong> — 4개 커밋</summary>

- **변경** [`fa8fdfaf`](https://github.com/Nor-ter/lunch-munchie_proto/commit/fa8fdfafb68f0d3fd85f6dd7aaafaad2207f7374) — docs(lunchie): 인제스천 스펙 상태 갱신 — 완료 · JonghoPark5635
- **변경** [`9c7a571e`](https://github.com/Nor-ter/lunch-munchie_proto/commit/9c7a571e785c7686d203a231bc300de703b762a8) — feat(lunchie): 드라이브 사진 인제스천 — 피처 스토어로 콜드스타트 해소 · JonghoPark5635
- **변경** [`4e34804e`](https://github.com/Nor-ter/lunch-munchie_proto/commit/4e34804e784f0e6c4b159fcd83c54b328ecf8dd7) — docs(lunchie): 인제스천 계획 개정 — 외부 추론 API 미사용, 하네스 에이전트 전용 · JonghoPark5635
- **변경** [`840ac1be`](https://github.com/Nor-ter/lunch-munchie_proto/commit/840ac1be12bf05afda472150a31a7b9aeb0826c9) — docs(lunchie): 드라이브 사진 인제스천 계획 — 콜드스타트 해소 · JonghoPark5635

</details>

<details>
<summary><strong>2026-07-24</strong> — 4개 커밋</summary>

- **변경** [`fe34f347`](https://github.com/Nor-ter/lunch-munchie_proto/commit/fe34f3476e63ee696391d94300a07f83e58d054a) — xp and level update · elliekw
- **변경** [`1c658ed8`](https://github.com/Nor-ter/lunch-munchie_proto/commit/1c658ed8b5eebbce9927857ab9887ec855aded9f) — lunchmate room update - room, costume · elliekw
- **변경** [`8dcce36f`](https://github.com/Nor-ter/lunch-munchie_proto/commit/8dcce36fbcf09140163c1d7e660c8915e75a07f5) — fix: consolidate munchie and lunchmate updates · John Lee
- **변경** [`d6c2f0c6`](https://github.com/Nor-ter/lunch-munchie_proto/commit/d6c2f0c6a4e86cb8001847d19703df10697c8429) — Saved page: map/list toggle (should be confirmed with team) · Inseong-Hwang-dev

</details>

<details>
<summary><strong>2026-07-23</strong> — 7개 커밋</summary>

- **변경** [`c5c53418`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c5c53418e1fc7595425a899889a4dc1259680200) — Save feed list scroll location · Inseong-Hwang-dev
- **변경** [`e892044f`](https://github.com/Nor-ter/lunch-munchie_proto/commit/e892044f756aca8523e0bd74b20df0d7c1d9621e) — Course map: emphasise selected resto & redirection to user profile · Inseong-Hwang-dev
- **변경** [`87a3e6ec`](https://github.com/Nor-ter/lunch-munchie_proto/commit/87a3e6ec4e9933fe5f23867c6a25721ae9d497f3) — Profile: display user name & the user's feed · Inseong-Hwang-dev
- **변경** [`bd9b7ff7`](https://github.com/Nor-ter/lunch-munchie_proto/commit/bd9b7ff794e377414bdd8466d8c6c42d60b0ae72) — fix: persist munchie post decorations · John Lee
- **변경** [`b81007e7`](https://github.com/Nor-ter/lunch-munchie_proto/commit/b81007e75485ea8b7acd098eb27a6e16dd10fdb6) — fix: stabilize coursemap posting · John Lee
- **변경** [`2287d363`](https://github.com/Nor-ter/lunch-munchie_proto/commit/2287d363a4889ba31d57315f72f7d425c61c9b46) — feat: finalize checkpoint 4 testing updates · John Lee
- **변경** [`94666ff2`](https://github.com/Nor-ter/lunch-munchie_proto/commit/94666ff2f28353641ba94cbdc8de737846bafb60) — docs: update README for merge4 integration · John Lee

</details>

<details>
<summary><strong>2026-07-22</strong> — 2개 커밋</summary>

- **병합** [`d59bbe1f`](https://github.com/Nor-ter/lunch-munchie_proto/commit/d59bbe1f24992a71ab290f3bc23d4962397d4548) — Merge origin/sj_branch into merge4_v1 · Inseong-Hwang-dev
- **변경** [`7ae5cd2b`](https://github.com/Nor-ter/lunch-munchie_proto/commit/7ae5cd2b8239199389871eaad27b8299a0367adb) — feat: refine mobile Lunchie and Munchie UI · Seungyeon Jung

</details>

<details>
<summary><strong>2026-07-21</strong> — 3개 커밋</summary>

- **변경** [`057059a5`](https://github.com/Nor-ter/lunch-munchie_proto/commit/057059a5ff56c84be113d5a5c0a435ac52b02360) — fix: restore home notification interactions · John Lee
- **병합** [`47645f6a`](https://github.com/Nor-ter/lunch-munchie_proto/commit/47645f6aa608a6848074a05d9eb8f8cdf9a560e6) — Merge origin/sk_branch into merge4_v1 · Inseong-Hwang-dev
- **변경** [`855a76bd`](https://github.com/Nor-ter/lunch-munchie_proto/commit/855a76bdd2e9480a183efb507bc5d4f793bfa92b) — feat: unify Lunchie Munchie feed experience · John Lee

</details>

<details>
<summary><strong>2026-07-20</strong> — 2개 커밋</summary>

- **변경** [`69b23bee`](https://github.com/Nor-ter/lunch-munchie_proto/commit/69b23beef21ca3267528b77f0371d74464f11b45) — profile character update · elliekw
- **변경** [`bd6812b5`](https://github.com/Nor-ter/lunch-munchie_proto/commit/bd6812b5c1b37e9afe87cebe64b7c68b2e9a5642) — feat: unify Munchie feed and course map flow · John Lee

</details>

<details>
<summary><strong>2026-07-18</strong> — 11개 커밋</summary>

- **병합** [`927351ea`](https://github.com/Nor-ter/lunch-munchie_proto/commit/927351ea202960761f11f54405afd10d85aec066) — Merge branch 'sk_branch' of https://github.com/PlanJoker/lunch-munchie_proto into sk_branch · elliekw
- **변경** [`aaf6330d`](https://github.com/Nor-ter/lunch-munchie_proto/commit/aaf6330d06f7178426846fe583acfb748542805c) — 선별테스트 완료 · elliekw
- **변경** [`f98e7674`](https://github.com/Nor-ter/lunch-munchie_proto/commit/f98e767430eccdff2a8e61b09081ae43ce7718b9) — feed 사진 선택 시 크롭 기능 · Inseonghhwang
- **변경** [`33551e83`](https://github.com/Nor-ter/lunch-munchie_proto/commit/33551e8381d32bdee23aa348d6b8dc994421c87f) — feat: unify Munchie landing and feed · John Lee
- **병합** [`fe88da88`](https://github.com/Nor-ter/lunch-munchie_proto/commit/fe88da884bf4af3810953b59223997e22ae2e775) — Merge branch 'merge3_v1_experiment' into tl_branch · John Lee
- **변경** [`e30ffcca`](https://github.com/Nor-ter/lunch-munchie_proto/commit/e30ffccae6e8ca610d6ac89ba2e416ed4192151b) — Restore experiment navigation bar design · Inseonghhwang
- **병합** [`680b8db8`](https://github.com/Nor-ter/lunch-munchie_proto/commit/680b8db8b8910c5fdfe5a5a776d65e07d05dbbab) — Merge origin/sk_branch into merge3_v1_experiment · Inseonghhwang
- **변경** [`3ef5ddd6`](https://github.com/Nor-ter/lunch-munchie_proto/commit/3ef5ddd636a512a988d262f682784cb4c2a1cb54) — gitignore · Inseonghhwang
- **병합** [`89a84a46`](https://github.com/Nor-ter/lunch-munchie_proto/commit/89a84a46290258b62b964a105dfeb5e735d12253) — Merge origin/merge3_v1 into merge3_v1_experiment · Inseonghhwang
- **변경** [`ef672014`](https://github.com/Nor-ter/lunch-munchie_proto/commit/ef6720149a11795acc31d8b10a854bda8c21a1c9) — google map, places api · Inseonghhwang
- **변경** [`2146cc36`](https://github.com/Nor-ter/lunch-munchie_proto/commit/2146cc364d82551773e58dbd57a75cc0449098ce) — docs: add team update summary · John Lee

</details>

<details>
<summary><strong>2026-07-17</strong> — 2개 커밋</summary>

- **변경** [`376b8c3e`](https://github.com/Nor-ter/lunch-munchie_proto/commit/376b8c3e2ea9f3c878a255661656052ae30cca74) — git ignore (codex .aritfacts files) · Inseonghhwang
- **변경** [`d0bfd498`](https://github.com/Nor-ter/lunch-munchie_proto/commit/d0bfd4986f4b0bfd3200279a24163058cc29ba5e) — lunchiemate room update · elliekw

</details>

<details>
<summary><strong>2026-07-16</strong> — 7개 커밋</summary>

- **변경** [`124fe4b5`](https://github.com/Nor-ter/lunch-munchie_proto/commit/124fe4b51ba4f443db355bd782c5c61eed8116a6) — login & follow in web ver · Inseonghhwang
- **변경** [`e8b1a021`](https://github.com/Nor-ter/lunch-munchie_proto/commit/e8b1a02168c1ec79a9198a59d84cd9ec2e90280f) — Phase 2C — FoodieRoom item UI&local preview · elliekw
- **변경** [`cd7b386a`](https://github.com/Nor-ter/lunch-munchie_proto/commit/cd7b386a5366f281cd19041f83aa044c1eabc4a9) — LunchmateCharacterRenderer layer extend · elliekw
- **변경** [`9df20e79`](https://github.com/Nor-ter/lunch-munchie_proto/commit/9df20e7959e711f8f82d797eb2c1bc97add0fc65) — setup FoodieRoom · elliekw
- **변경** [`285db9d5`](https://github.com/Nor-ter/lunch-munchie_proto/commit/285db9d543e3c1ee0edc1f3590e807e973601761) — update LunchmateLevelUpModal · elliekw
- **변경** [`0b6fe844`](https://github.com/Nor-ter/lunch-munchie_proto/commit/0b6fe844c5e8ec1d8eebf9cc9a3a25bd5015de55) — feat(profile): add lunchmate preview interaction flow · elliekw
- **변경** [`83f2148e`](https://github.com/Nor-ter/lunch-munchie_proto/commit/83f2148eac0ff988ac73ddb06d9e4f927b056848) — extend existing FoodieBuddy status · elliekw

</details>

<details>
<summary><strong>2026-07-14</strong> — 2개 커밋</summary>

- **변경** [`81570517`](https://github.com/Nor-ter/lunch-munchie_proto/commit/81570517066518a1e7795ad1205a8c24128e1f93) — munchie feed 변경2 · Seungyeon Jung
- **변경** [`b58743bc`](https://github.com/Nor-ter/lunch-munchie_proto/commit/b58743bc539b5972ccb2a3093140bdea3fcbb0e0) — munchie feed 변경 · Seungyeon Jung

</details>

<details>
<summary><strong>2026-07-13</strong> — 13개 커밋</summary>

- **병합** [`f8c2d0de`](https://github.com/Nor-ter/lunch-munchie_proto/commit/f8c2d0deee897467848af26b89168689381d55fa) — Merge 'origin/data-jp-v3' into tl_revise · Inseonghhwang
- **병합** [`a8c2a038`](https://github.com/Nor-ter/lunch-munchie_proto/commit/a8c2a03870d1afed821537d4198e22d9cce3ad3b) — Merge branch 'hi_merge2' into tl_revise · Inseonghhwang
- **변경** [`74bf3be4`](https://github.com/Nor-ter/lunch-munchie_proto/commit/74bf3be4333d7be66ece950a57cfa1e3c52d0a14) — package json files changed · Inseonghhwang
- **변경** [`b29adbe0`](https://github.com/Nor-ter/lunch-munchie_proto/commit/b29adbe07ac57e10a746ebabe1b54bb585e37087) — feat: enhance Munchie feed and course templates with new routes and UI improvements · Inseonghhwang
- **변경** [`97149b2b`](https://github.com/Nor-ter/lunch-munchie_proto/commit/97149b2bcbc517af18960cd3732285f7f1ace740) — fix: continue new courses into template sharing · John Lee
- **변경** [`4a5c3015`](https://github.com/Nor-ter/lunch-munchie_proto/commit/4a5c3015985ff9bad6828096a1f4b42104f472c8) — feat: unify munchie food tag filters · John Lee
- **변경** [`0ca9fc28`](https://github.com/Nor-ter/lunch-munchie_proto/commit/0ca9fc283938b0678b505b8fb342812af4c1eb6c) — fix: restore source tabs after creation flows · John Lee
- **변경** [`846eb0ac`](https://github.com/Nor-ter/lunch-munchie_proto/commit/846eb0acf6974a1f8b211b0afa7fd607d2443579) — fix: preserve Munchie tab after course navigation · John Lee
- **변경** [`e57ba51f`](https://github.com/Nor-ter/lunch-munchie_proto/commit/e57ba51f29dd1cdf2ecdcaa5ac98d9a3ba7638db) — feat: add Munchie template editor and journey alerts · John Lee
- **변경** [`df3293da`](https://github.com/Nor-ter/lunch-munchie_proto/commit/df3293dac6df8736f28acaf45a5686d6656ce200) — feat: refine Munchie UI and Lunchie animations · John Lee
- **변경** [`c1842a14`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c1842a14ccda99c20e9abf6274653d21f79b1925) — docs: update README with current project status · John Lee
- **변경** [`d99f883a`](https://github.com/Nor-ter/lunch-munchie_proto/commit/d99f883a2341faa20c7f7491554a095a5781cc6b) — feat: add Munchie feed and course map customization · John Lee
- **변경** [`398e6701`](https://github.com/Nor-ter/lunch-munchie_proto/commit/398e6701bb130a81b4b7524282e5a1d0bf847aea) — Authentication & Course Editor using Google Map API (implemented in React Native) · Inseonghhwang

</details>

<details>
<summary><strong>2026-07-10</strong> — 7개 커밋</summary>

- **변경** [`6807f9da`](https://github.com/Nor-ter/lunch-munchie_proto/commit/6807f9da0981189c0e0ba533a378773690dd3c94) — feat(lunchie): 솔로 결승 계속 거절 시 그룹과 동일한 마지막 기회·포기 안내 추가 · JonghoPark5635
- **변경** [`8531872c`](https://github.com/Nor-ter/lunch-munchie_proto/commit/8531872cbf9f91028a828e0dad927642f559ecf1) — fix(lunchie): 솔로 마지막 1개 후보 자동 확정 → 그룹처럼 한 번 더 확인 · JonghoPark5635
- **변경** [`ae7d0aed`](https://github.com/Nor-ter/lunch-munchie_proto/commit/ae7d0aed2d4f9621251939edd69c76394a97f9eb) — fix(lunchie): 솔로 '둘 다 별로' 무한 루프 — 새 덱 없이 phase만 리셋해 즉시 재결정되던 버그 · JonghoPark5635
- **변경** [`10a1de3b`](https://github.com/Nor-ter/lunch-munchie_proto/commit/10a1de3b87f20450657145b9a241b6359df5dd99) — feat(lunchie): 홈 여정 카드 통합(피드백 상시화·카테고리 진입) + 메뉴 상세 좌우 넘기기 · JonghoPark5635
- **변경** [`e1a9ee8f`](https://github.com/Nor-ter/lunch-munchie_proto/commit/e1a9ee8fe8bb928575e3f6d14e08742d7690b8d6) — feat(lunchie): 메뉴판에 소스 카테고리 구조·재료 설명 반영 + 항목별 상세 화면 · JonghoPark5635
- **변경** [`6f0311b9`](https://github.com/Nor-ter/lunch-munchie_proto/commit/6f0311b97617eee4478a86b2c01610925d189be3) — fix(lunchie): 인텐트 선택·여정 타임라인·리롤 흐름 4건 수정 · JonghoPark5635
- **변경** [`01c50335`](https://github.com/Nor-ter/lunch-munchie_proto/commit/01c50335a41cfa3ed5bcc5f67dff8cc5220ebd21) — feat(lunchie): 실제 메뉴 데이터를 웹서비스에 연결 — 카드 탭 첫 화면 = 메뉴리스트 · JonghoPark5635

</details>

<details>
<summary><strong>2026-07-09</strong> — 5개 커밋</summary>

- **변경** [`1383b406`](https://github.com/Nor-ter/lunch-munchie_proto/commit/1383b40684836ebebd853bb948e1a4d48dc2c65e) — feat(menu): 10곳 메뉴 직접 추출 — 가격·비건/글루텐프리 태그·사진 (333개 요리) · JonghoPark5635
- **변경** [`c52d931a`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c52d931a78d806e55ea18230fed9266ecffbe308) — feat(menu): og:image 대표 사진 추출 — LLM 콜 없이 무료 · JonghoPark5635
- **변경** [`4f05dbd4`](https://github.com/Nor-ter/lunch-munchie_proto/commit/4f05dbd49db13b685b2477f2fcf8fdc8457f2651) — data(menu): 실제 메뉴 추출 결과 — 10곳·372개 요리 · JonghoPark5635
- **변경** [`dd31f048`](https://github.com/Nor-ter/lunch-munchie_proto/commit/dd31f0485bef362be34c643d0d7a4f5297d12808) — feat(menu): 메뉴 페이지 링크 추적 + max_tokens 상향 · JonghoPark5635
- **변경** [`d4cae57d`](https://github.com/Nor-ter/lunch-munchie_proto/commit/d4cae57df4389fa218502dd0ed6355b58d8080a1) — fix(menu): LLM 응답 파싱 견고화 — 균형 잡힌 첫 {…}만 추출 · JonghoPark5635

</details>

<details>
<summary><strong>2026-07-06</strong> — 3개 커밋</summary>

- **변경** [`398f0aa9`](https://github.com/Nor-ter/lunch-munchie_proto/commit/398f0aa96a2ca6fb83a7923d7243d3a4a21d4ede) — feat(menu): menus.json → DB 로더 (loadMenus) · JonghoPark5635
- **변경** [`bc0092d7`](https://github.com/Nor-ter/lunch-munchie_proto/commit/bc0092d7db11e9792d59d439f99edb8dbf9d6805) — docs(lunchie): 그룹 결정 스펙 — D(호스트 지금 진행) 구현 완료 표시 · JonghoPark5635
- **변경** [`761f4e01`](https://github.com/Nor-ter/lunch-munchie_proto/commit/761f4e0110b93f14e8eea88f1d999f98b259a97f) — feat(lunchie): 그룹 결정 D — 호스트 '지금 진행' (노쇼 대기 스킵) · JonghoPark5635

</details>

<details>
<summary><strong>2026-07-05</strong> — 7개 커밋</summary>

- **변경** [`2a36375d`](https://github.com/Nor-ter/lunch-munchie_proto/commit/2a36375dec5bc9fbbab0e8f85dcfe9bbeb9f87d9) — feat(data): OSM 인제스트에 베이커리·아이스크림 추가 — 2115곳, dessert 139 · JonghoPark5635
- **변경** [`817a3adf`](https://github.com/Nor-ter/lunch-munchie_proto/commit/817a3adf79b020b72ff9a4bdef32e1d45a3d54f7) — feat(lunchie): 카드 사진 카테고리 폴백 + OSM 출처 표기 · JonghoPark5635
- **변경** [`b2503993`](https://github.com/Nor-ter/lunch-munchie_proto/commit/b250399379bc36449612a7366d549013f9f7bb81) — feat(data): 서버 폴백을 인제스트 멜번 OSM 데이터로 — 앱이 실데이터로 동작 · JonghoPark5635
- **변경** [`c5c7dc5e`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c5c7dc5ee0a1d9068defdadfcce8e96b7fe6623a) — feat(data): 메뉴 추출 파이프라인 스켈레톤 (extractMenu + 배치) · JonghoPark5635
- **변경** [`7ab4b0ee`](https://github.com/Nor-ter/lunch-munchie_proto/commit/7ab4b0ee9fa8d61a984bf6630127ab905f873d96) — refactor(lunchie): intent 분류 규칙 기반화 — 멜번 영문 taxonomy 지원 · JonghoPark5635
- **변경** [`db99abee`](https://github.com/Nor-ter/lunch-munchie_proto/commit/db99abee0815a90bded6be8591f2f3a06bbf78e8) — feat(data): 멜번 시드 SQL 생성 + restaurants.website 컬럼 · JonghoPark5635
- **변경** [`86c89cd8`](https://github.com/Nor-ter/lunch-munchie_proto/commit/86c89cd887879052e29be9c4ab32058d0b53ec23) — feat(data): 멜번 식당 OSM 인제스트 — 1978곳 (자유 사용, ODbL) · JonghoPark5635

</details>

<details>
<summary><strong>2026-07-03</strong> — 3개 커밋</summary>

- **변경** [`0d38eecd`](https://github.com/Nor-ter/lunch-munchie_proto/commit/0d38eecd11201dea9f0b65588797bc5006186a3b) — '다시 고르기' 버튼 수정 & 스와이핑 로직 중 총 식당 개수 dp 수정 · Inseonghhwang
- **변경** [`00ed64f7`](https://github.com/Nor-ter/lunch-munchie_proto/commit/00ed64f7420b068c320152597ac6d4bb9e8db537) — chore: env.enc 추적 해제 + .gitignore에 *.enc 추가 · JonghoPark5635
- **변경** [`9016ac61`](https://github.com/Nor-ter/lunch-munchie_proto/commit/9016ac6177ba6ed0c9d60acf8cb6668d99a446e2) — report pdf · JonghoPark5635

</details>

<details>
<summary><strong>2026-07-02</strong> — 8개 커밋</summary>

- **변경** [`31d26944`](https://github.com/Nor-ter/lunch-munchie_proto/commit/31d269443ba785ea9ef0a35f1ee74a8584335ea3) — 초대 세션 수정 (api timeout 시간 조정) · Inseonghhwang
- **변경** [`c1e4638c`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c1e4638c8dccf6dfd748baa56e604506c261ff9c) — fix(lunchie): 결승 대기 화면 완료 배지 오류 + 길찾기 뒤로가기 시 결과 유실 · Inseonghhwang
- **변경** [`59583de8`](https://github.com/Nor-ter/lunch-munchie_proto/commit/59583de876b09249547988b5914c6a89e26af59d) — fix(lunchie): 그룹 결승전 화면을 merge2_v1의 대각선 듀얼 애니메이션으로 복원 · Inseonghhwang
- **변경** [`20106935`](https://github.com/Nor-ter/lunch-munchie_proto/commit/201069354835e8793240d80acb42a7b4af33ee09) — fix(lunchie): 덱이 targetCount보다 작을 때(예: 4장) 예선 완료 판정 안 되는 버그 · Inseonghhwang
- **변경** [`e289859c`](https://github.com/Nor-ter/lunch-munchie_proto/commit/e289859c3dde2f04c237190ec783e2fc6a788f42) — fix(lunchie): 결과 화면 진입 안 되는 버그 — targetCount가 실제 스와이프 덱 크기와 불일치 · Inseonghhwang
- **병합** [`ee64e5bd`](https://github.com/Nor-ter/lunch-munchie_proto/commit/ee64e5bdb682c171854e15f9fb40ee255f146e2a) — Merge branch 'data-jp-v3' into merge2_v1 · Inseonghhwang
- **병합** [`4bcf302a`](https://github.com/Nor-ter/lunch-munchie_proto/commit/4bcf302aabd0eb0b98ac26f6270400ebac854504) — Merge branch 'sj_branch' into merge2_v1 · Inseonghhwang
- **변경** [`c0986c42`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c0986c4229bfef0bd48c28e77b87b6e645bac3e1) — Landing Page design (not updated yet) · Inseonghhwang

</details>

<details>
<summary><strong>2026-06-30</strong> — 1개 커밋</summary>

- **병합** [`0d633867`](https://github.com/Nor-ter/lunch-munchie_proto/commit/0d6338671f70a6e9b5464a0fb796f7fe5fe185fd) — Merge branch 'sj_branch' into merge2_v1 · Inseonghhwang

</details>

<details>
<summary><strong>2026-06-29</strong> — 15개 커밋</summary>

- **변경** [`3e5c01d2`](https://github.com/Nor-ter/lunch-munchie_proto/commit/3e5c01d2e9434cfe7d1f753d3d66fbfe96869523) — docs(lunchie): 그룹 결정 스펙 상태표 갱신 — C·B·E·G 구현 완료, D 남음 · JonghoPark5635
- **변경** [`0957edce`](https://github.com/Nor-ter/lunch-munchie_proto/commit/0957edce06c049651b7629b8441d323413bd7dae) — feat(lunchie): 그룹 결정 C 클라이언트 — 3지선다·REROLL 재스와이프·합의실패 (Stage 3/3) · JonghoPark5635
- **변경** [`ab8034f5`](https://github.com/Nor-ter/lunch-munchie_proto/commit/ab8034f5ab7de5f1b01f817af165f28db0196db2) — animation generate · Inseonghhwang
- **변경** [`16daa49d`](https://github.com/Nor-ter/lunch-munchie_proto/commit/16daa49d2a9acf080149a5d65b3e1374e20368c0) — feat(lunchie): 그룹 결정 세대(generation) 라우트 배선 (Stage 2/3) · JonghoPark5635
- **변경** [`a0496b28`](https://github.com/Nor-ter/lunch-munchie_proto/commit/a0496b284e69a6be67e9a179b795c2adbd9247e5) — feat(lunchie): 그룹 결정 C 코어 — 3지선다·REROLL·NO_CONSENSUS (decideGroup) · JonghoPark5635
- **변경** [`3a2d0506`](https://github.com/Nor-ter/lunch-munchie_proto/commit/3a2d05061c4e5f9eee3ebf64561853320597a7df) — docs(lunchie): 수집 데이터 스펙(G) + 후보수 분기 + 런치엔진 PDF · JonghoPark5635
- **변경** [`61f7b02e`](https://github.com/Nor-ter/lunch-munchie_proto/commit/61f7b02ec141871a8fcd937ee67b6d75b768d007) — docs(lunchie): 그룹 결정 C 확정 — reroll(미움 빼고 새 후보) + 합의 실패 · JonghoPark5635
- **변경** [`43fea91f`](https://github.com/Nor-ter/lunch-munchie_proto/commit/43fea91f01c18527803282b4389520e3ccecdc0e) — docs(lunchie): 결정 메커니즘 PDF에 그룹 결정(하이브리드) 추가 · JonghoPark5635
- **변경** [`ea9d6bc7`](https://github.com/Nor-ter/lunch-munchie_proto/commit/ea9d6bc738c244b05b40b94cd0dfaabba26476cc) — docs(lunchie): 그룹 결정 모델 스펙 — 하이브리드 (least-misery→투표) · JonghoPark5635
- **변경** [`3a1b2aed`](https://github.com/Nor-ter/lunch-munchie_proto/commit/3a1b2aedbcbefb099e0624c0a0dddf333cfcfbae) — feat(lunchie): 그룹 결승 투표 UI + 뷰어별 로컬 결승 제거 (클라) · JonghoPark5635
- **변경** [`689db89b`](https://github.com/Nor-ter/lunch-munchie_proto/commit/689db89b2f276257f904365120c514a4cb954a1a) — feat(lunchie): 그룹 결정 — least-misery 집계 + top-2 결승 투표 (서버) · JonghoPark5635
- **변경** [`3f7cfef9`](https://github.com/Nor-ter/lunch-munchie_proto/commit/3f7cfef9df5029538048586c5333256bdfd824a9) — docs(lunchie): 결정 메커니즘 다이어그램 — '둘 다 별로' & 재진입 · JonghoPark5635
- **변경** [`458e1896`](https://github.com/Nor-ter/lunch-munchie_proto/commit/458e1896d5cc0001f1e2a4e60a00ebfe6d2c7ca9) — docs(lunchie): 시행착오 로그 추가 — 검토한 모든 아이디어 (채택/폐기/변경/보류) · JonghoPark5635
- **변경** [`628bb038`](https://github.com/Nor-ter/lunch-munchie_proto/commit/628bb038cd31c3b485bf7016a1caa18a4f6f07a4) — docs(lunchie): 워크플로우 비교 다이어그램 상세화 · JonghoPark5635
- **변경** [`18786017`](https://github.com/Nor-ter/lunch-munchie_proto/commit/187860175fe531e44ff1a69b4ed9a3b6f70cbf88) — docs(lunchie): 유저 워크플로우 변경 보고서 (Before/After 비교) · JonghoPark5635

</details>

<details>
<summary><strong>2026-06-26</strong> — 11개 커밋</summary>

- **변경** [`fd7a31a3`](https://github.com/Nor-ter/lunch-munchie_proto/commit/fd7a31a3b14006139617bfe16899598282cae0c1) — feat(lunchie): 홈 '오늘의 여정' 카드 + recommend 시간 기본 인텐트 · JonghoPark5635
- **변경** [`ce51567f`](https://github.com/Nor-ter/lunch-munchie_proto/commit/ce51567f7172c4c357994cb54f139826b585cb88) — feat(lunchie): 우승화면 하루 여정 씨앗 + WINNER intent · JonghoPark5635
- **변경** [`25b81c2c`](https://github.com/Nor-ter/lunch-munchie_proto/commit/25b81c2c3a2ce00774c4a5621b956595974f816b) — fix(lunchie): todayStops DB 우선 조회 (memEvents 폴백) · JonghoPark5635
- **변경** [`d6f8ad37`](https://github.com/Nor-ter/lunch-munchie_proto/commit/d6f8ad37c52effc310b7130f232753b77d166d12) — feat(lunchie): GET /api/journey/today — 오늘 스톱 + 다음-스톱 제안 · JonghoPark5635
- **변경** [`13e9d6e1`](https://github.com/Nor-ter/lunch-munchie_proto/commit/13e9d6e1481e6b664c77f5063a6b316e23db2def) — feat(lunchie): 오늘의 스톱 추출 (selectTodayStops/todayStops) · JonghoPark5635
- **변경** [`29e38114`](https://github.com/Nor-ter/lunch-munchie_proto/commit/29e381148ecd34e550ec31b35b128c55089a57df) — feat(lunchie): recommend 인텐트 카테고리 필터 · JonghoPark5635
- **변경** [`96c7920d`](https://github.com/Nor-ter/lunch-munchie_proto/commit/96c7920dfa444859bd352131e3442374fba74e34) — feat(lunchie): RecContext에 intent 필드 추가 · JonghoPark5635
- **변경** [`e7ee566c`](https://github.com/Nor-ter/lunch-munchie_proto/commit/e7ee566c82809a5833426624c32722f54e7ac159) — feat(lunchie): vitest 루트 설정 추가 · JonghoPark5635
- **변경** [`c9d55418`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c9d55418cf72a2f9ed1410779a0d1f89c040dbda) — feat(lunchie): 인텐트↔카테고리 매핑 모듈 + vitest 스크립트 · JonghoPark5635
- **변경** [`6ae70e99`](https://github.com/Nor-ter/lunch-munchie_proto/commit/6ae70e99bb286ce9938a313964609b4b3faecbfc) — docs(lunchie): 하루 여정 Phase 1 구현 계획 (8 태스크, TDD+curl+브라우저) · JonghoPark5635
- **변경** [`a491241f`](https://github.com/Nor-ter/lunch-munchie_proto/commit/a491241faab8eb9e49639af38da130ee39b46495) — docs(lunchie): 하루 여정 모드 Phase 1 설계 스펙 + 플로우 PDF · JonghoPark5635

</details>

<details>
<summary><strong>2026-06-25</strong> — 4개 커밋</summary>

- **변경** [`36c99f0e`](https://github.com/Nor-ter/lunch-munchie_proto/commit/36c99f0ea5c106e987278fd5d2bd4805b4b49084) — feat(lunchie): 정원(인원수) 복원 — 참여 제한 + 이벤트 분석 · JonghoPark5635
- **변경** [`2e86bd16`](https://github.com/Nor-ter/lunch-munchie_proto/commit/2e86bd16e7c7eddacb74dd77118c4addb65e302f) — feat(lunchie): 동행(혼자/같이)에 의미 부여 — 추천에 반영 · JonghoPark5635
- **변경** [`ca1d9149`](https://github.com/Nor-ter/lunch-munchie_proto/commit/ca1d91496f0dc5fe09a4c32d584295f31bae1f68) — fix(lunchie): 인원수 1명(혼자) 허용 — 솔로 전제와 일치 · JonghoPark5635
- **변경** [`82348632`](https://github.com/Nor-ter/lunch-munchie_proto/commit/82348632bff5386549e67526235d94ad9fde1a22) — feat(lunchie): CHOOSE 신뢰도 가중 + 결과정답 갭(SURVEY·COURSE_SAVE·REROLL) · JonghoPark5635

</details>

<details>
<summary><strong>2026-06-24</strong> — 11개 커밋</summary>

- **변경** [`aecf74dd`](https://github.com/Nor-ter/lunch-munchie_proto/commit/aecf74dd81a274e31fdad0dc3a5a2a92faba9375) — fix(lunchie): 결승전 무한루프 수정 — 자동 전환/만료 effect를 예선 중에만 · JonghoPark5635
- **변경** [`112ddf3c`](https://github.com/Nor-ter/lunch-munchie_proto/commit/112ddf3cd3abfda96a0e108f077f9a5e8455f090) — docs(engine): 결정 플로우 v2 (통일) — 이론 반영 · JonghoPark5635
- **변경** [`a6ea9a80`](https://github.com/Nor-ter/lunch-munchie_proto/commit/a6ea9a8032bd5b29fe2c57480629e5873e3dead3) — feat(engine): 듀얼 pairwise 취향 학습 (결론 반영 — 듀얼=최고급 신호) · JonghoPark5635
- **변경** [`ab4ac1eb`](https://github.com/Nor-ter/lunch-munchie_proto/commit/ab4ac1eb0c854fe7162e83c92248b66dc5197205) — refactor(lunchie): 결정 플로우 통일 — 미니 토너먼트 제거, 엔진 top-2 듀얼 + 탈출구 · JonghoPark5635
- **변경** [`e608a748`](https://github.com/Nor-ter/lunch-munchie_proto/commit/e608a74800bf876ac5a1dd47ff8649edced16a04) — feat(lunchie): 듀얼 "둘 다 별로 · 다른 곳" 탈출구 (forced-choice 회피) · JonghoPark5635
- **변경** [`7736d577`](https://github.com/Nor-ter/lunch-munchie_proto/commit/7736d577e14e13e1c0c4cc16be30c686780522be) — fix(lunchie): 스와이프 체류시간(dwell_ms) 실제 수집 배선 · JonghoPark5635
- **변경** [`f1e8583b`](https://github.com/Nor-ter/lunch-munchie_proto/commit/f1e8583b8e73c46f820d255f0f3c92a61ab171da) — feat(lunchie): 미니 토너먼트(3~4 좋아요 → 준결승) + 이탈 오탐 수정 · JonghoPark5635
- **변경** [`f569b176`](https://github.com/Nor-ter/lunch-munchie_proto/commit/f569b17645c30da87bb77a690649dc324ae9e016) — feat(lunchie): 중도 이탈(ABANDON) 명시 구현 · JonghoPark5635
- **변경** [`9a78aa2d`](https://github.com/Nor-ter/lunch-munchie_proto/commit/9a78aa2dfc8aa73fe9c853aa9b0d39f4348d5001) — fix(lunchie): 유저 플로우를 결정-플로우 이론·엔진에 일치 · JonghoPark5635
- **변경** [`be595eef`](https://github.com/Nor-ter/lunch-munchie_proto/commit/be595eef9ad160ca0032be0ec3c6e61e0c068d47) — feat(engine): v4 명시 신호 + cross-city 전이 (로드맵 완성) · JonghoPark5635
- **변경** [`bd629d36`](https://github.com/Nor-ter/lunch-munchie_proto/commit/bd629d3629561de0e48c76d00e76ce0026e150b7) — feat(engine): v3b 그룹 합의 — least-misery 취향 합성 (v3 완성) · JonghoPark5635

</details>

<details>
<summary><strong>2026-06-23</strong> — 18개 커밋</summary>

- **변경** [`8193d700`](https://github.com/Nor-ter/lunch-munchie_proto/commit/8193d700ed95e7b8519ef7b8a14928c6cafebec8) — feat(engine): v3a contextual bandit — Thompson Sampling (베이지안 취향) · JonghoPark5635
- **변경** [`e6cb8aed`](https://github.com/Nor-ter/lunch-munchie_proto/commit/e6cb8aed1947efc7e6cf8e61e4de5b1fcf401bb9) — feat(engine): v2 음식 연쇄 (occasion 시퀀스, Munchie 엔진 · v2 완성) · JonghoPark5635
- **변경** [`2b3226bb`](https://github.com/Nor-ter/lunch-munchie_proto/commit/2b3226bb837f82f66a3390f99de45055d5c40669) — feat(engine): v2 satiation 재소비 갈망 (±w7, 엔진 시그니처) · JonghoPark5635
- **변경** [`1197d4d4`](https://github.com/Nor-ter/lunch-munchie_proto/commit/1197d4d4daeb14c393947c65d70f05ab64ad62dc) — feat(engine): v1 단기 노출 피로 서브스코어러 (v1 완성) · JonghoPark5635
- **변경** [`d5b281d4`](https://github.com/Nor-ter/lunch-munchie_proto/commit/d5b281d4f27da02ea5f060d4d631322575f57431) — feat(engine): v0.5 아이템 피처 + v1 취향 벡터 서브스코어러 · JonghoPark5635
- **변경** [`b14dafeb`](https://github.com/Nor-ter/lunch-munchie_proto/commit/b14dafeb6386afa7772c9b626591d5909a474583) — docs(engine): 아키텍처 설계 PDF 박제 · JonghoPark5635
- **변경** [`618c5699`](https://github.com/Nor-ter/lunch-munchie_proto/commit/618c56990739eb693380e4b71dcea7fa8085a520) — refactor(metrics): 레거시 중복 차트 정리 · JonghoPark5635
- **변경** [`a6004f53`](https://github.com/Nor-ter/lunch-munchie_proto/commit/a6004f537d668747780095c45bf4375021bf4083) — feat(engine+metrics): 진짜 A/B — 결정적 배정 + 처치차이 + readout (Tier 4) · JonghoPark5635
- **변경** [`0bd02331`](https://github.com/Nor-ter/lunch-munchie_proto/commit/0bd0233148fd3d22ea0400f9ce158bef408257be) — feat(metrics): 일반 feature 효과 분석기 (Tier 3) · JonghoPark5635
- **변경** [`9ec61176`](https://github.com/Nor-ter/lunch-munchie_proto/commit/9ec61176de732303edae2f0ae4ff8e0030e7d5ec) — feat(metrics): 엔진 메커니즘 패널 (Tier 2 · 가설 검증) · JonghoPark5635
- **변경** [`b920f79b`](https://github.com/Nor-ter/lunch-munchie_proto/commit/b920f79b2b6ce539b96414c5b7a9bc52cc375345) — feat(metrics): 만족(결과) ⟂ 피로(여정) 2-패널 + 2×2 (Tier 1 north star) · JonghoPark5635
- **변경** [`ea433bcd`](https://github.com/Nor-ter/lunch-munchie_proto/commit/ea433bcd759cb0fb4edd2fdee13ee2445873e4c7) — feat(engine): 맥락 보강 — 계측 갭 메우기 (Phase 0b) · JonghoPark5635
- **변경** [`6e3a9099`](https://github.com/Nor-ter/lunch-munchie_proto/commit/6e3a9099e143957abff9aecf98ce0448295ca6ca) — feat(metrics): 데이터 신뢰성(Tier 0) 패널 + 무한차원 분포화 · JonghoPark5635
- **변경** [`55609419`](https://github.com/Nor-ter/lunch-munchie_proto/commit/55609419aa78829aac8f9a78f63a5b77a8872238) — feat(engine): 지표 대시보드 (/metrics) + /api/metrics 집계 · JonghoPark5635
- **변경** [`fe2c5d64`](https://github.com/Nor-ter/lunch-munchie_proto/commit/fe2c5d649422e913e1e3c74366a00c99e1821388) — feat(engine): 결승 후보 score tiebreak (좁히기 v0) · JonghoPark5635
- **변경** [`b52b9b29`](https://github.com/Nor-ter/lunch-munchie_proto/commit/b52b9b2974892ad617462c071a89122d4bdc9687) — feat(engine): 결승 듀얼(DUEL) pairwise 로깅 · JonghoPark5635
- **변경** [`c3609b70`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c3609b70adba41f58f11d63063a51744eaa1308e) — feat(engine): v0 추천 엔진 + UI 연결 (로깅·propensity·diet 필터) · JonghoPark5635
- **변경** [`81331b53`](https://github.com/Nor-ter/lunch-munchie_proto/commit/81331b533d3e5e55248ba6aacb471656e09294ac) — docs: organize Lunchie/Munchie strategy & engine PDFs into docs/ · JonghoPark5635

</details>

<details>
<summary><strong>2026-06-20</strong> — 8개 커밋</summary>

- **변경** [`e39d0280`](https://github.com/Nor-ter/lunch-munchie_proto/commit/e39d0280ec09e551de4493b1744f3fd00cbed422) — Improve course map UI and navigation · Seungyeon Jung
- **변경** [`8e435c36`](https://github.com/Nor-ter/lunch-munchie_proto/commit/8e435c366286a0ded14b5211ad52b90a84e53f8b) — ds_store · Inseonghhwang
- **변경** [`1c87a168`](https://github.com/Nor-ter/lunch-munchie_proto/commit/1c87a1684e211c386bd59fd2126596d216477460) — 스와이핑 effect (샤이닝 & 금) -&gt; 확인 요망 · Inseonghhwang
- **변경** [`9a631c62`](https://github.com/Nor-ter/lunch-munchie_proto/commit/9a631c62f866de1fb40e8f3c54435eceed604ab9) — 메뉴 탭 flip 효과 · Inseonghhwang
- **변경** [`698a0cce`](https://github.com/Nor-ter/lunch-munchie_proto/commit/698a0cce4eea7be5144c9ba2e178be20b5faf22f) — 메뉴 탭 정육면체 모션 (추가 확인 필요) · Inseonghhwang
- **변경** [`1e822695`](https://github.com/Nor-ter/lunch-munchie_proto/commit/1e822695041333d66804663c11c7950d8e5ea841) — 스와이핑 시작 화면 로고 위치 수정 · Inseonghhwang
- **변경** [`ca9d03fc`](https://github.com/Nor-ter/lunch-munchie_proto/commit/ca9d03fc8a85807aa42cb94f96afe3dd702cd7e7) — 세션 -&gt; 스와이핑 모드 easy out 추가 (confirm required) · Inseonghhwang
- **변경** [`32794048`](https://github.com/Nor-ter/lunch-munchie_proto/commit/327940482fb7f9f694c0c8611d204a7360ba2ef0) — 랜딩 페이지에서 Lunchie Mode 들어갈 때 슬라이딩 애니메이션 & 상세설정 버튼 누를 때 효과 · Inseonghhwang

</details>

<details>
<summary><strong>2026-06-18</strong> — 1개 커밋</summary>

- **변경** [`c9ed5d26`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c9ed5d26b63b63e819fc51065da4f971283fd6c8) — Update course map docs and styling · Seungyeon Jung

</details>

<details>
<summary><strong>2026-06-13</strong> — 1개 커밋</summary>

- **변경** [`86616a63`](https://github.com/Nor-ter/lunch-munchie_proto/commit/86616a63b57e87b8e23809a8356b63bb4b633e37) — 스와이핑 로고 업데이트 (위치 align 요망) · Inseonghhwang

</details>

<details>
<summary><strong>2026-06-11</strong> — 21개 커밋</summary>

- **변경** [`2e6a49a5`](https://github.com/Nor-ter/lunch-munchie_proto/commit/2e6a49a5e2c50993aeef0fbeec07584a872f50d6) — LunchieSettingsPage UI 수정 & 세션 만들기/투표 로직 수정 · Inseonghhwang
- **병합** [`ba49484f`](https://github.com/Nor-ter/lunch-munchie_proto/commit/ba49484fc4f99739007729b8cb3629d8fe62e85b) — Merge origin/merge1_v3: UI 스타일 통합 및 LunchieSettings 배경색 충돌 해결 · Inseonghhwang
- **변경** [`613de74b`](https://github.com/Nor-ter/lunch-munchie_proto/commit/613de74bb1b9484fb698d5883aa74aa3e0ea60d7) — Lunchie mode 초대 로직 수정, UI (sj_branch) merge · Inseonghhwang
- **변경** [`d295126b`](https://github.com/Nor-ter/lunch-munchie_proto/commit/d295126beea2664b5707c98a7f0c6ec090bfe467) — feat: 전체 페이지 배경색 #FCF4EE로 통일 · John Lee
- **변경** [`9cc855f7`](https://github.com/Nor-ter/lunch-munchie_proto/commit/9cc855f7d8b6658246ef4a3de99bef2eb06a00ae) — feat: 코스탐색 Munchie Mode 타이틀 UI 개선 · John Lee
- **변경** [`f201309a`](https://github.com/Nor-ter/lunch-munchie_proto/commit/f201309a658d07ca5757130d7da21581485d2e73) — feat: 코스탐색 페이지 타이틀 수정 · John Lee
- **변경** [`109e2751`](https://github.com/Nor-ter/lunch-munchie_proto/commit/109e27510eb046bd576a50f08a18095fae575f9a) — feat: 홈 Munchie Mode 카드를 코스탐색 페이지와 동일한 스타일로 변경 · John Lee
- **변경** [`795d9dd4`](https://github.com/Nor-ter/lunch-munchie_proto/commit/795d9dd4d86277f002173a5775e03f8d56c4033a) — feat: 홈화면 헤더 텍스트 정렬 통일 · John Lee
- **변경** [`d46582e6`](https://github.com/Nor-ter/lunch-munchie_proto/commit/d46582e63877ebfe972d79fea1b69e8961dabaa6) — feat: '이번주 사람들이 많이 저장한 코스' Munchie Mode 타이틀에 맞춰 정렬 (paddingLeft: 20) · John Lee
- **변경** [`a6320b75`](https://github.com/Nor-ter/lunch-munchie_proto/commit/a6320b75b31761f44c5debb6078209da7b9f0bb7) — feat: 홈화면 타이틀 스타일 조정 · John Lee
- **변경** [`986b3c2f`](https://github.com/Nor-ter/lunch-munchie_proto/commit/986b3c2fd3f4c04618b88b0361c22e2178bae5e7) — feat: 한글 Pretendard, 영문 Baloo 2 폰트 분리 적용 · John Lee
- **변경** [`85d218bb`](https://github.com/Nor-ter/lunch-munchie_proto/commit/85d218bba6545e8b4652f4e39f139e8f00d51d7e) — feat: 전체 폰트 Baloo 2 (cursive)로 통일 · John Lee
- **변경** [`eec2814c`](https://github.com/Nor-ter/lunch-munchie_proto/commit/eec2814caea2e66afdbe5705d1adc7270577c64e) — feat: 전체 폰트 Pretendard로 통일 · John Lee
- **변경** [`62ef627f`](https://github.com/Nor-ter/lunch-munchie_proto/commit/62ef627fc0a0e37da354f3d4377aad9116611276) — feat: navigation bar UI 업데이트 · John Lee
- **변경** [`4d88257a`](https://github.com/Nor-ter/lunch-munchie_proto/commit/4d88257ad5d0beee40c28fc04ab87febaa28c4cf) — sj_branch merge · Inseonghhwang
- **변경** [`93611d91`](https://github.com/Nor-ter/lunch-munchie_proto/commit/93611d9159d956066015811b8ca10b9cda8e4d05) — sj_branch merge · Inseonghhwang
- **변경** [`4d32b271`](https://github.com/Nor-ter/lunch-munchie_proto/commit/4d32b2710e4ddde73eb79be4aa6c2869ae373173) — Update tab bar icons · Seungyeon Jung
- **변경** [`2efbe05a`](https://github.com/Nor-ter/lunch-munchie_proto/commit/2efbe05a4ead9a12728f687d53cd1ba4b7874276) — Update landing page design · Seungyeon Jung
- **변경** [`d74c889e`](https://github.com/Nor-ter/lunch-munchie_proto/commit/d74c889ebc61ffdb7f25df82078cba19f3d2cdeb) — 코스맵 공유 업데이트, 코스맵 만들기 업데이트 & 코스맵 이미지 저장 & 코스맵 편집 · Inseonghhwang
- **변경** [`0fd7a197`](https://github.com/Nor-ter/lunch-munchie_proto/commit/0fd7a1979484ba749ae7f3caf3f14db3b631c9f4) — 스와이핑 애니매이션 & 음식점 고르기 결승전 · Inseonghhwang
- **변경** [`fd635cf6`](https://github.com/Nor-ter/lunch-munchie_proto/commit/fd635cf6cd021be8c7f25af4b85f8edd3e8f108a) — 결승화면 수정 · Inseonghhwang

</details>

<details>
<summary><strong>2026-06-10</strong> — 3개 커밋</summary>

- **변경** [`0269118e`](https://github.com/Nor-ter/lunch-munchie_proto/commit/0269118e8533a8f7633b02f91518b4984c87bb47) — Lunchie 모드 UI 수정 & JP 브랜치 merge · Inseonghhwang
- **변경** [`86bf3e5f`](https://github.com/Nor-ter/lunch-munchie_proto/commit/86bf3e5f144280a95cfda60b669b8d228cac712d) — Lunchie 모드 UI 수정 & JP 브랜치 기능 merge · Inseonghhwang
- **변경** [`c3f3be2d`](https://github.com/Nor-ter/lunch-munchie_proto/commit/c3f3be2df33d30508d02dd956e6bd5331089517a) — Update theme colour · Inseonghhwang

</details>

<details>
<summary><strong>2026-06-08</strong> — 10개 커밋</summary>

- **병합** [`147b6348`](https://github.com/Nor-ter/lunch-munchie_proto/commit/147b634811641a190db2784519bb8c3556e004bc) — merge: origin/data-jp into merge1_v1 · Inseonghhwang
- **변경** [`ca408dbf`](https://github.com/Nor-ter/lunch-munchie_proto/commit/ca408dbf4d21bc25794a0a5b9026a0db804a0a92) — nav bar 수정 · Inseonghhwang
- **변경** [`7e969a6c`](https://github.com/Nor-ter/lunch-munchie_proto/commit/7e969a6c67f4385ccef2e5238ff2dafb962133b8) — landing page update · Inseonghhwang
- **변경** [`6e8a2764`](https://github.com/Nor-ter/lunch-munchie_proto/commit/6e8a2764ff040b798aa755b7b7a305a1feda2ab5) — landing page update · Inseonghhwang
- **변경** [`8c52c6ba`](https://github.com/Nor-ter/lunch-munchie_proto/commit/8c52c6ba906d2c3c7835e771df04a00e6c646cfc) — 코스 data 추가 · JonghoPark5635
- **변경** [`8ea2e851`](https://github.com/Nor-ter/lunch-munchie_proto/commit/8ea2e851831b584945ffbccfa19be06afe004863) — new command (from taehoon) · Inseonghhwang
- **변경** [`fb4f002b`](https://github.com/Nor-ter/lunch-munchie_proto/commit/fb4f002ba354873518a79a1eedd930e7073fec2d) — new command (from taehoon) · Inseonghhwang
- **변경** [`cb3b53e9`](https://github.com/Nor-ter/lunch-munchie_proto/commit/cb3b53e9d3d212513c9c47ba257f5ec104f05d54) — first merge · Inseonghhwang
- **변경** [`eb5f656c`](https://github.com/Nor-ter/lunch-munchie_proto/commit/eb5f656cac05ae2f16195d00d68837907fe5296c) — first merge · Inseonghhwang
- **변경** [`0e6294af`](https://github.com/Nor-ter/lunch-munchie_proto/commit/0e6294af1e18ea6486048ca8b47e130bc1b61b37) — merge1 branch · Inseonghhwang

</details>

<details>
<summary><strong>2026-06-05</strong> — 2개 커밋</summary>

- **변경** [`cbfca97f`](https://github.com/Nor-ter/lunch-munchie_proto/commit/cbfca97f0245d66e7d39eca9cca833929c59575e) — fix: resolve typescript compilation errors on Vercel Node builder · JonghoPark5635
- **변경** [`56dcd59d`](https://github.com/Nor-ter/lunch-munchie_proto/commit/56dcd59d6c51deaecf1545ddffdcdac250ef8100) — update db · JonghoPark5635

</details>

<details>
<summary><strong>2026-06-04</strong> — 2개 커밋</summary>

- **변경** [`3e8a8d00`](https://github.com/Nor-ter/lunch-munchie_proto/commit/3e8a8d00301126a296aa4f02355e1f52b8df0bfa) — docs: Update README.md - Add v3 changelog for sj_branch & tl_branch merge and ongoing development · Seungyeon Jung
- **변경** [`5a6fd4db`](https://github.com/Nor-ter/lunch-munchie_proto/commit/5a6fd4dbf05c56c2f5ce01edd548313a1468a6d8) — feat: Lunchie Mode 토너먼트 풀 플로우 + 디자인 리뉴얼 · John Lee

</details>

<details>
<summary><strong>2026-05-25</strong> — 1개 커밋</summary>

- **변경** [`693cba53`](https://github.com/Nor-ter/lunch-munchie_proto/commit/693cba532a3378c59efc3dad28e7a6530fdde84c) — feat: Lunchie Munchie Web Prototype v2 — Quick Match + Tour Mode · Manus

</details>
