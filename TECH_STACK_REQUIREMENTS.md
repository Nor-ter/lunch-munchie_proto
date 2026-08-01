# Lunchie Munchie — Tech Stack Requirements (단일 기준 문서)

> **이 문서의 목적**
> 이 프로젝트는 여러 코딩 에이전트(Claude Code, Codex, Cursor, Manus, Antigravity 등)와 여러 역할(개발·디자인·PM·데이터)이 함께 개발한다.
> 에이전트나 작업자가 바뀌어도 **tech stack이 일관되게 유지**되도록, 모든 코드 생성/수정 작업은 이 문서의 규칙을 따른다.
>
> **AGENT INSTRUCTION (모든 코딩 에이전트는 작업 전 반드시 읽을 것)**
> - 새 라이브러리·프레임워크·서비스를 도입하기 전에 이 문서의 [승인된 스택](#2-승인된-스택-approved-stack)에 있는지 확인한다.
> - 목록에 없는 기술이 필요하면 **임의로 도입하지 말고**, [9. 스택 변경 절차](#9-스택-변경-절차)를 따른다.
> - 같은 문제를 해결하는 기술이 이미 승인 목록에 있으면 **반드시 그것을 사용**한다 (예: 상태관리에 Redux 금지 → Zustand 사용).
> - 작업 결과물은 [4. 레이어별 규칙](#4-레이어별-규칙)과 [7. 코딩 컨벤션](#7-코딩-컨벤션)을 위반하면 안 된다.

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [승인된 스택 (Approved Stack)](#2-승인된-스택-approved-stack)
3. [금지 목록 (Do NOT Use)](#3-금지-목록-do-not-use)
4. [레이어별 규칙](#4-레이어별-규칙)
5. [프로젝트 구조](#5-프로젝트-구조)
6. [플랫폼 분리 규칙 (앱 vs 웹)](#6-플랫폼-분리-규칙-앱-vs-웹)
7. [코딩 컨벤션](#7-코딩-컨벤션)
8. [환경변수 / API 키 규칙](#8-환경변수--api-키-규칙)
9. [스택 변경 절차](#9-스택-변경-절차)
10. [에이전트 작업 체크리스트](#10-에이전트-작업-체크리스트)

---

## 1. 프로젝트 개요

**Lunchie Munchie** (package: `lunchie-munchie`) — 점심/맛집 코스를 탐색·편집·공유하는 모바일 앱.

| 항목 | 값 |
|---|---|
| 주요 플랫폼 | 모바일 앱 (iOS / Android) |
| 앱 프레임워크 | React Native + Expo |
| 웹 (보조) | Next.js — **공유 링크 랜딩페이지 전용** |
| 언어 | TypeScript (앱·웹 공통) / Python (ML 마이크로서비스만) |
| 백엔드 | Supabase (PostgreSQL) |
| 모노레포 | Turborepo |

**중요**: 이 프로젝트의 "메인"은 React Native 앱이다. 웹(Next.js)은 공유 랜딩페이지에만 쓴다. 자세한 분리 규칙은 [6번](#6-플랫폼-분리-규칙-앱-vs-웹).

---

## 2. 승인된 스택 (Approved Stack)

> 아래 표에 있는 기술만 사용한다. 각 행은 "이 문제 영역(Domain)에는 이 기술(Tool)을 쓴다"는 **단일 정답(single source of truth)** 이다.
> `Status` 컬럼: `STABLE` = 확정, 변경 시 [9번 절차](#9-스택-변경-절차) 필요 / `PLANNED` = 도입 예정, 사용 시점 도래하면 STABLE로 전환.

### 2-1. 모바일 앱 (`apps/mobile`)

| Domain (문제 영역) | Approved Tool | Status | 비고 |
|---|---|---|---|
| 프레임워크 | React Native + Expo (SDK 최신) | STABLE | bare workflow 아님, **managed (Expo)** |
| 언어 | TypeScript | STABLE | `any` 남용 금지 |
| 라우팅 | Expo Router | STABLE | 파일 기반 라우팅 |
| 스타일링 | NativeWind | STABLE | Tailwind 문법. StyleSheet 직접 작성 최소화 |
| 로컬/전역 상태 | Zustand | STABLE | 클라이언트 상태 전용 |
| 서버 데이터 페칭/캐싱 | TanStack Query | STABLE | 서버 상태 전용. Zustand에 서버 데이터 저장 금지 |
| 애니메이션 | Reanimated 3 | STABLE | |
| 제스처 | React Native Gesture Handler | STABLE | |
| 드래그 정렬 리스트 | react-native-draggable-flatlist | STABLE | 코스 식당 순서 변경 |
| 지도 | @rnmapbox/maps (Mapbox) | STABLE | 실제 지도 뷰 |
| 2D 그래픽 / 공유카드 | react-native-skia | STABLE | 공유 카드 오프스크린 렌더링 |
| 벡터 그래픽 | react-native-svg | STABLE | 코스맵 마커·경로 |
| 뷰 → 이미지 캡처 | react-native-view-shot | STABLE | PNG / transparent PNG 추출 |
| 외부 공유 | expo-sharing | STABLE | IG·메시지 공유 시트 |
| 갤러리 저장 | expo-media-library | STABLE | |
| 클립보드 | expo-clipboard | STABLE | 링크 복사 |
| 위치 | expo-location | STABLE | GPS |
| 푸시 알림 | Expo Push Notifications | PLANNED | FCM + APNs |
| 폼 검증 | react-hook-form + zod | STABLE | |

### 2-2. 백엔드 / 데이터

| Domain | Approved Tool | Status | 비고 |
|---|---|---|---|
| DB | Supabase (PostgreSQL) | STABLE | Firebase 금지 |
| 인증 | Supabase Auth | STABLE | |
| 실시간 | Supabase Realtime | STABLE | 좋아요·댓글·매칭 동기화 |
| 파일 저장 | Supabase Storage | STABLE | 공유 이미지 등 |
| 서버 로직 (경량) | Supabase Edge Functions | STABLE | 코스 fork, 단순 로직 |
| 지리 쿼리 | PostGIS | STABLE | 반경 검색 등 |
| ML 마이크로서비스 | Python FastAPI | PLANNED | 매칭·추천·TSP 라우팅. Railway 배포 |
| 벡터 추천 | pgvector | PLANNED | 유사 코스 추천 |

### 2-3. 외부 API

| Domain | Approved Tool | Status | 비고 |
|---|---|---|---|
| 식당 검색·상세 | Google Places API | STABLE | |
| 경로 계산 | Google Directions API | STABLE | 경유지 루트 |
| 지도 타일 | Mapbox | STABLE | |
| 한국 로컬 데이터 | Kakao Local API | PLANNED | 선택적 |

### 2-4. 웹 (`apps/web` — 공유 랜딩페이지 전용)

| Domain | Approved Tool | Status | 비고 |
|---|---|---|---|
| 프레임워크 | Next.js | STABLE | **랜딩페이지 전용**, 앱 기능 구현 금지 |
| 스타일링 | Tailwind CSS | STABLE | |
| 데이터 | Supabase JS Client | STABLE | 앱과 동일 DB |

### 2-5. 공통 인프라

| Domain | Approved Tool | Status |
|---|---|---|
| 모노레포 | Turborepo | STABLE |
| 패키지 매니저 | pnpm | STABLE |
| CI/CD | GitHub Actions + Expo EAS Build | STABLE |
| 공유 코드 | `packages/shared` (타입·API 함수·유틸) | STABLE |

---

## 3. 금지 목록 (Do NOT Use)

> 아래는 자주 잘못 도입되는 기술이다. **이미 승인된 대안이 있으므로 사용하지 않는다.**

| 사용 금지 | 이유 | 대신 사용 |
|---|---|---|
| Redux / MobX / Recoil | 상태관리 표준 1개 유지 | Zustand (클라이언트) + TanStack Query (서버) |
| Firebase / Firestore | DB 표준은 Supabase | Supabase |
| axios / fetch 직접 데이터 페칭 | 캐싱·상태 일관성 | TanStack Query |
| styled-components / Emotion | 스타일 표준 1개 유지 | NativeWind |
| React Navigation 직접 설정 | Expo Router로 통일 | Expo Router |
| Leaflet / react-leaflet | 웹 프로토타입 잔재, 앱에선 부적합 | @rnmapbox/maps |
| html2canvas | 웹 전용, RN 미지원 | react-native-view-shot |
| Next.js로 앱 핵심 기능 구현 | 웹은 랜딩 전용 | React Native 앱 |
| Expo bare workflow / eject | managed workflow 유지 | Expo managed |
| CSS-in-JS 런타임 | 성능·일관성 | NativeWind (빌드타임) |

---

## 4. 레이어별 규칙

### 4-1. 상태관리 — 가장 자주 깨지는 규칙

```
클라이언트 상태 (UI 상태, 편집 중 데이터, 폼 입력)
   → Zustand 또는 컴포넌트 로컬 useState/useReducer

서버 상태 (DB에서 온 데이터, 캐싱 필요)
   → TanStack Query

❌ 절대 금지: 서버에서 받은 데이터를 Zustand에 복사해서 보관
   → 캐시 무효화·동기화가 깨진다. TanStack Query 캐시를 단일 출처로.
```

### 4-2. 스타일링

```
- 모든 스타일은 NativeWind className으로 작성
- 인라인 StyleSheet는 NativeWind로 표현 불가능한 경우에만 (예: 동적 계산값)
- 브랜드 컬러는 tailwind.config의 토큰으로 정의 후 사용
  → coral: '#FF6B6B' (Soft Coral). 하드코딩 #FF6B6B 반복 금지
```

### 4-3. 데이터 페칭

```
- 모든 Supabase / 외부 API 호출은 packages/shared 또는 lib/ 의 함수로 래핑
- 컴포넌트에서 직접 supabase.from(...) 호출 금지 → 래퍼 함수 경유
- 래퍼 함수는 TanStack Query의 queryFn으로 연결
```

### 4-4. 지도 / 그래픽

```
- 실제 지도 (현재 위치, 실제 좌표) → @rnmapbox/maps
- 추상화된 코스맵 (격자 + 번호 마커 + 점선) → react-native-svg
- 공유용 카드 이미지 렌더링 → react-native-skia
- 코스맵 SVG 로직은 hooks/useCourseMapSvg.ts 한 곳에서 관리 (edit·share 공용)
```

---

## 5. 프로젝트 구조

```
lunchie-munchie/                  # Turborepo 루트
├── apps/
│   ├── mobile/                   # React Native + Expo (메인)
│   │   ├── app/                  # Expo Router 화면
│   │   │   ├── (tabs)/
│   │   │   └── course/[id]/
│   │   │       ├── index.tsx     # 코스 상세
│   │   │       ├── edit.tsx      # 코스맵 편집
│   │   │       └── share.tsx     # 공유하기
│   │   ├── components/
│   │   │   ├── course-map/       # 코스맵 SVG
│   │   │   ├── share-templates/  # 공유 카드 (Skia)
│   │   │   └── ui/
│   │   ├── hooks/
│   │   ├── lib/                  # supabase, places API 래퍼
│   │   └── data/                 # mock 데이터
│   └── web/                      # Next.js (공유 랜딩페이지만)
│       └── app/course/[id]/page.tsx
├── packages/
│   └── shared/                   # 타입, API 함수, 유틸 (앱·웹 공유)
│       ├── types/
│       └── api/
└── services/
    └── ml/                       # Python FastAPI (PLANNED)
```

**규칙**
- 앱·웹이 공통으로 쓰는 타입/함수는 반드시 `packages/shared`에 둔다 (중복 정의 금지).
- 화면 파일은 `apps/mobile/app/` 아래 Expo Router 규칙을 따른다.

---

## 6. 플랫폼 분리 규칙 (앱 vs 웹)

이 프로젝트에서 가장 혼동되기 쉬운 부분이다. 명확히 구분한다.

```
React Native 앱 (apps/mobile) — 다음을 전부 구현
  - 코스맵 탐색·편집·공유
  - 그룹 매칭, 스와이프 투표
  - 피드, 좋아요, 댓글, 저장
  - QR 초대, 푸시 알림
  - 즉 "앱의 모든 기능"

Next.js 웹 (apps/web) — 다음만 구현
  - 공유 링크 랜딩페이지 (/course/[id])
  - 앱 미설치 유저용 코스맵 미리보기 (읽기 전용)
  - OG 태그 (카카오톡·슬랙 미리보기)
  - "앱에서 열기" / "앱 다운로드" CTA
```

| 판단 기준 | 앱 (RN) | 웹 (Next.js) |
|---|---|---|
| 유저가 데이터를 생성/수정? | O | X (읽기 전용) |
| 네이티브 기능(GPS·카메라·딥링크)? | O | X |
| 로그인 필요? | O | X (공개 미리보기) |

> **에이전트 주의**: "공유 화면을 웹으로 만들어줘"라는 요청이 와도, 그것이 *앱 내부의 공유 화면*(`apps/mobile/.../share.tsx`)인지 *외부 랜딩페이지*(`apps/web`)인지 구분한다. 앱 내부 공유 화면은 **React Native로** 구현한다.

---

## 7. 코딩 컨벤션

```
언어
- TypeScript strict 모드. any 사용 시 주석으로 사유 명시
- 타입은 packages/shared/types 에 정의, 화면에서 재정의 금지

네이밍
- 컴포넌트: PascalCase (CourseMapCard.tsx)
- 훅: useCamelCase (useCourseShare.ts)
- 화면 파일: Expo Router 규칙 (index.tsx, [id].tsx)

스타일
- NativeWind className 우선
- 브랜드 컬러는 tailwind.config 토큰 사용 (coral)

데이터
- Supabase/외부 API는 lib/ 또는 packages/shared/api 래퍼 경유
- 컴포넌트 내부 직접 호출 금지

상태
- 클라이언트 → Zustand / useState
- 서버 → TanStack Query
- 두 경계를 섞지 않는다
```

---

## 8. 환경변수 / API 키 규칙

```
- 앱에서 접근하는 변수는 EXPO_PUBLIC_ 접두사 필수
- API 키는 코드·커맨드·채팅에 직접 입력 금지
- .env.local (Git 제외) / .env.example (Git 포함, 값 비움) 한 쌍 유지
```

| 변수명 | 용도 |
|---|---|
| `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` | 식당 검색 |
| `EXPO_PUBLIC_SUPABASE_URL` | DB 연결 |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | DB 인증 |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | 지도 |
| `EXPO_PUBLIC_APP_SCHEME` | 딥링크 (`lunchie`) |

`app.json` 필수 설정:

```json
{
  "expo": {
    "scheme": "lunchie",
    "ios": {
      "infoPlist": {
        "LSApplicationQueriesSchemes": ["instagram", "instagram-stories"]
      }
    }
  }
}
```

---

## 9. 스택 변경 절차

승인 목록에 없는 기술이 필요하거나, 기존 스택을 바꿔야 할 때:

```
1. 에이전트는 임의로 도입하지 않는다. 작업을 멈추고 제안만 한다.
2. 제안 시 다음을 명시:
   - 어떤 Domain의 문제인가
   - 기존 승인 스택으로 해결 불가능한 이유
   - 제안 기술과 대안 비교
3. 사람(개발 리드)이 검토 후 이 문서의 [2번 표]에 추가/수정한다.
4. 문서가 업데이트된 후에만 새 기술을 사용한다.
```

> 핵심 원칙: **이 문서가 바뀌기 전에는 어떤 에이전트도 스택을 바꾸지 않는다.**

---

## 10. 에이전트 작업 체크리스트

> 모든 코딩 에이전트는 작업 완료 전 아래를 self-check 한다.

```
[ ] 새로 추가한 라이브러리가 전부 [2. 승인된 스택]에 있는가?
[ ] [3. 금지 목록]의 기술을 사용하지 않았는가?
[ ] 상태관리가 클라이언트/서버 경계를 지켰는가? (Zustand vs TanStack Query)
[ ] 스타일을 NativeWind로 작성했는가? (브랜드 컬러는 토큰 사용)
[ ] Supabase/API 호출을 래퍼 함수로 감쌌는가?
[ ] 앱 기능을 Next.js에 구현하지 않았는가? (플랫폼 분리)
[ ] 공유 타입/함수를 packages/shared에 두었는가?
[ ] API 키를 코드에 하드코딩하지 않았는가?
[ ] 승인 목록에 없는 기술이 필요했다면, 도입하지 않고 제안만 했는가?
```

---

> **이 문서가 스택에 관한 단일 기준(single source of truth)이다.**
> 코드와 이 문서가 충돌하면 이 문서가 우선한다. 변경은 [9번 절차](#9-스택-변경-절차)로만.
