# 하드코딩 데이터 DB 연동 계획 (Frontend DB Integration Plan)

프론트엔드(`AppContext.tsx` 및 일부 페이지)에 하드코딩되어 있는 `MOCK_RESTAURANTS`, `MOCK_COURSES` 등의 더미 데이터를 제거하고, 실제 구축된 SQLite DB로부터 데이터를 가져와 연동하기 위한 계획입니다.

## User Review Required

> [!IMPORTANT]
> 기존에 제공해주신 ERD(데이터베이스 설계)와 프론트엔드 컴포넌트(React)에서 요구하는 데이터 필드 이름이 약간 다릅니다. (예: 프론트엔드 `lat/lng` vs DB `latitude/longitude`) 
> 이 계획에서는 **백엔드 API 라우트(`server/routes.ts`)에서 DB 데이터를 프론트엔드 형식에 맞게 변환(Mapping)**하여 전달하는 방식으로 진행하고자 합니다. 이 접근법에 동의하시면 승인해 주세요.

## Proposed Changes

### 1. 백엔드 시드 데이터 주입 (DB Seeding)
#### [NEW] [server/seed.ts](file:///Users/jonghopark/Documents/GitHub/lunch-munchie_proto/server/seed.ts)
- `AppContext.tsx`에 있던 `MOCK_RESTAURANTS`와 `MOCK_COURSES` 데이터를 SQLite DB 스키마(ERD 기준)에 맞춰 변환한 뒤 DB에 초기 데이터(Seed)로 주입하는 스크립트를 작성합니다.
- 서버 시작 시 데이터가 비어있으면 이 시드 데이터를 삽입하도록 구성합니다.

### 2. 백엔드 API 라우트 보강 (API Routes Mapping)
#### [MODIFY] [server/routes.ts](file:///Users/jonghopark/Documents/GitHub/lunch-munchie_proto/server/routes.ts)
- `GET /api/restaurants` 라우트에서 조회한 DB 데이터를 프론트엔드 `Restaurant` 인터페이스(`image`, `lat`, `lng` 등)에 맞게 매핑하여 반환합니다.
- `GET /api/courses` 엔드포인트를 추가하여 코스 정보를 조회 및 매핑하여 반환합니다.

### 3. 프론트엔드 컨텍스트 수정 (AppContext)
#### [MODIFY] [client/src/contexts/AppContext.tsx](file:///Users/jonghopark/Documents/GitHub/lunch-munchie_proto/client/src/contexts/AppContext.tsx)
- 파일 상단의 `MOCK_RESTAURANTS` 및 `MOCK_COURSES` 하드코딩 배열을 모두 제거합니다.
- `useEffect`를 사용하여 앱 마운트 시 `fetch('/api/restaurants')` 및 `fetch('/api/courses')`를 호출해 서버(DB)로부터 데이터를 불러옵니다.
- `isLoading` 상태를 추가하여 데이터를 불러오는 중일 때의 처리를 돕습니다.

### 4. 하드코딩 의존성 제거 (Page Components)
#### [MODIFY] [client/src/pages/QuickMatchPage.tsx](file:///Users/jonghopark/Documents/GitHub/lunch-munchie_proto/client/src/pages/QuickMatchPage.tsx)
#### [MODIFY] [client/src/pages/TourModePage.tsx](file:///Users/jonghopark/Documents/GitHub/lunch-munchie_proto/client/src/pages/TourModePage.tsx)
- 파일 상단에 하드코딩된 데이터(`MOCK_RESTAURANTS`)를 직접 Import해서 쓰는 부분들을 모두 `useApp().restaurants`에서 가져오도록 수정합니다.

## Verification Plan
### Automated Tests
- `pnpm run check`를 통해 프론트엔드와 백엔드의 타입 무결성을 다시 확인합니다.
### Manual Verification
- 브라우저를 열어 앱 진입 시, 하드코딩이 아닌 SQLite DB로부터 성공적으로 음식점과 코스 리스트가 불러와져 화면에 렌더링되는지 확인합니다.
