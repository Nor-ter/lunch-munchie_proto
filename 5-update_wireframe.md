# UI 및 라우트 구조 개선 및 스키마 계획 (UI/Route & Schema Improvement Plan)

제공해주신 와이어프레임(Wireframe) 이미지를 분석하여, **Lunchie Munchie** 앱의 UI 플로우, 라우트 구조, 그리고 이를 뒷받침하기 위한 데이터베이스 스키마 개선 계획을 정리했습니다.

## User Review Required

> [!IMPORTANT]
> 본 계획은 업로드된 디자인 이미지를 기반으로 기존 코드베이스(`App.tsx`, `schema.ts` 등)를 어떻게 변경할지 제안하는 문서입니다.
> 
> 리뷰 후 승인해주시면, 이 계획에 따라 **라우트 개편**, **새로운 페이지 UI 틀 제작**, **스키마 및 API 수정**을 진행하겠습니다.

## 1. UI 및 라우트 구조 (UI & Route Structure Plan)

기존에 산재되어 있던 라우트들을 "Lunchie Mode"와 "Munchie Mode" 두 가지 주요 플로우로 명확하게 재편합니다.

### A. 공통 & 홈 (Common & Home)
*   **`/` (Home Screen):** "Lunchie Mode"(빠른 매칭)와 "Munchie Mode"(코스 지도) 진입 버튼 제공.
*   **Bottom Navigation:** 홈(Home), 피드(Feeds), 코스 만들기(Create), 프로필(Profile) 등 하단 네비게이션을 통해 주요 페이지로 즉시 이동 가능하게 구성.

### B. Lunchie Mode 플로우 (빠른 점심 매칭)
현재의 `SessionCreate`, `QuickMatch` 등을 와이어프레임의 순서에 맞게 개편합니다.

1.  **`/lunchie/settings` (필터/설정 화면):** 거리, 인원수 등 필터 설정 (기존 `/session/create` 대체 및 UI 수정).
2.  **`/lunchie/swipe` (스와이프 매칭 화면):** 식당 카드를 좌우로 스와이프하여 호불호를 선택 (기존 `/quick-match` 대체).
3.  **`/lunchie/results` (매칭 결과 화면 - NEW):** *와이어프레임의 "최종 3개 중에 하나" 화면.* 스와이프 결과 가장 선호도가 높은 상위 3개 식당을 보여주고 최종 선택.
4.  **`/lunchie/map` (식당 경로 안내 - NEW):** 선택된 최종 식당으로 가는 지도를 표시.
5.  **`/restaurant/:id` (식당 상세 정보 - NEW):** 네이버/카카오 맵 스타일의 상세 식당 정보 (사진, 평점, 태그, 메뉴 등) 제공.

### C. Munchie Mode 플로우 (코스 지도 작성 및 공유)
현재의 `Explore`, `TourMode`, `CourseDetail` 등을 체계화합니다.

1.  **`/courses/feeds` (코스 피드 - 기존 `/explore` 대체):** "My Course Map Feeds"와 "Entire Course Map Feeds" 두 개의 탭으로 구성된 피드 페이지. 코스의 미니맵과 정보를 카드 형태로 제공.
2.  **`/courses/:id` (코스 상세 화면):** 선택한 코스의 전체 경로를 상단 지도에, 하단에 코스에 포함된 장소 리스트 렌더링. Edit 및 Share 버튼 포함.
3.  **`/courses/:id/edit` 또는 `/courses/new` (코스 에디터):** 상단에서 지도를 보며, 하단의 장소 리스트를 드래그 앤 드롭으로 순서 변경 및 장소 추가/삭제. (기존 `/tour-mode` 대체).
4.  **`/courses/:id/share` (코스 공유 화면 - NEW):** 인스타그램 스토리 스타일로 코스 정보를 예쁘게 렌더링하고, 이미지를 생성/공유할 수 있는 화면.

---

## 2. 데이터 테이블 및 스키마 계획 (Data Table & Schema Plan)

새로운 UI 플로우를 지원하기 위해 기존 `shared/schema.ts`에 일부 필드를 추가합니다.

### 추가/수정 대상 스키마

**1. `sessions` 테이블 (Lunchie Mode 매칭 상태 관리)**
*   **`top_restaurant_ids` (추가):** "최종 3개 중에 하나" 화면을 구현하기 위해, 그룹 스와이프 결과 상위 랭크된 식당 ID들의 배열(JSON)을 임시 저장할 필드.

**2. `courses` 테이블 (Munchie Mode 코스 정보)**
*   **`route_polyline` (추가):** 피드 화면에서 여러 코스의 지도를 빠르게 렌더링하기 위해, 장소들을 잇는 경로 정보(Polyline string)를 캐싱하여 저장.
*   **`share_image_url` (추가):** 공유하기 화면에서 생성된 인스타그램 스타일의 카드 이미지 URL을 저장.

**3. `restaurants` 테이블 (식당 상세 정보)**
*   **`menu_items` (추가):** 상세 화면에서 표시할 식당 메뉴 정보 (예: `[{ name: "라멘", price: 12000 }, ...]`) 저장.

### 스키마 코드 변경 예시 (shared/schema.ts)
```typescript
// restaurants 테이블 추가 사항
menu_items: text("menu_items", { mode: "json" }).$type<{name: string, price: number}[]>(),

// courses 테이블 추가 사항
route_polyline: text("route_polyline"),
share_image_url: text("share_image_url"),

// sessions 테이블 추가 사항
top_restaurant_ids: text("top_restaurant_ids", { mode: "json" }).$type<string[]>(),
```

## Verification Plan

### 실행 단계
1. **Schema Update:** `shared/schema.ts` 업데이트 및 Drizzle 마이그레이션 혹은 DB 재생성.
2. **Route Restructure:** `client/src/App.tsx`의 라우터 구조를 위 계획에 맞게 재정렬 및 파일명/폴더명 정리.
3. **UI Scaffold:** 새로 필요한 페이지(`Results`, `Share`, `Restaurant Detail` 등)의 빈 컴포넌트 뼈대 생성 및 연결.

위 내용으로 진행하는 것에 동의하시면 승인(Approve)을 부탁드립니다!
