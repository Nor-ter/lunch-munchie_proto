# 웹 Google Maps + Places + Directions 연동 작업 로그

하네스 실행 증거와 승인 게이트 결과를 Phase별로 기록한다. 최종 완료 시에만 `FINAL_GATE: PASS`를 추가한다.

## 현재 상태

- FINAL_GATE: PASS
- 자동 상태: `pnpm harness:web-maps status` → `ALL_DONE`
- `web-security-auditor` PASS: 서버 키 미노출, Google 직접 호출 없음(전부 Edge Function 경유), 하드코딩
  시크릿 없음, `.env` gitignore 정상, XSS 벡터 없음. `pnpm run check` + `pnpm run build` 클린 통과.

## 2026-07-18 구현 사이클

- Phase 0: `@vis.gl/react-google-maps` 설치(사용자 직접), Google Cloud 웹 브라우저 키 발급(사용자 직접,
  Maps JavaScript API만 활성화 + Application restriction=Websites(`http://localhost:5173/*`)), 루트 `.env`에
  `VITE_GOOGLE_MAPS_API_KEY` 기록(사용자 직접). `MapProvider.tsx`로 `APIProvider` 래핑, `App.tsx`에 마운트.
  빈 Google 지도 타일 렌더 확인.
- Phase 1: `mobile/services/{edgeFunctions,placesApi,directionsApi}.ts`, `mobile/lib/polyline.ts`,
  `mobile/hooks/{usePlacesSearch,useDirections}.ts` 를 웹으로 포팅(alias만 `@/lib/supabase`로 교체, 로직
  변경 없음). `getPlaceDetails` 반환 타입만 웹 전용 `GoogleRestaurantRow`(snake_case DB row)로 분리해
  기존 `AppContext.Restaurant`(camelCase, mock 시절 필드 포함)와 충돌 방지. 브라우저 콘솔에서
  `searchPlaces()` 왕복 실행해 실제 Google 식당 결과 수신 확인 — 익명 세션 JWT로 Edge Function 호출 성공.
- Phase 2: `components/map/CourseMap.tsx` 신규(`@vis.gl/react-google-maps` 기반, mobile
  `CourseMap.tsx` 대응 포팅). 순번 마커(`AdvancedMarker`, `DEMO_MAP_ID`) + 경로 폴리라인
  (`routeCoordinates` 있으면 실경로, 없으면 마커 직선 연결 폴백). 마커/경로 렌더 브라우저 확인.
- Phase 3: `pages/PlaceExplorePage.tsx` 신규 — 자동완성 검색(세션 토큰+400ms debounce) → 후보 선택 →
  `getPlaceDetails`(선택당 1회) → `registerRestaurants`로 AppContext 즉시 반영 → `CourseMap`에 마커/리스트 →
  코스 제목 입력 → "코스 만들기"(`addCourse` 재사용). `/explore/places` 라우트 추가, Munchie Feed 헤더에
  진입 버튼 추가.
  - **회귀 발견·수정**: `web-verifier` 서브에이전트 Phase 4 감사 중 `useDirections`가 화면에 배선되지
    않아 경로 폴리라인이 죽은 코드였음을 발견(Phase 2 요구사항 "directions 포함" 미충족). `directionsPoints`
    계산 + `useDirections(directionsPoints, 'walking')` 호출 + `routeCoordinates` prop 전달 추가.
  - 재검증: 실제 두 식당(Patricia Coffee Brewers, Coffee Supreme — Melbourne) 검색·선택 후 지도에 순번
    마커 1·2 + 거리를 따라 꺾이는 실제 도보 경로 폴리라인 렌더 확인(직선이 아님 = directions Edge
    Function 응답이 실제 반영됨). 스크린샷으로 시각 확인, `getPlaceDetails`/`directions` 실호출 확인.

### 관찰된 무관 이슈 (범위 밖)

- 라이브 브라우저 재검증 중 `GET /api/restaurants`, `GET /api/courses`(Express 부팅 fetch, 이 트랙이
  건드리지 않는 기존 라우트)에서 500 확인. 서버 로그·콘솔 에러 없음, 앱은 기존 부트 데이터로 정상
  동작(별도 원인 — 이 트랙의 Supabase Edge Function 경로와 무관). 후속 조사 필요, 이번 사이클 범위 아님.

## 2026-07-18 확장 사이클 — 코스 편집/상세 화면 Google 지도 적용

사용자 요청으로 위 "스코프 결정"을 재검토·번복: `CourseEditPage`/`CourseDetailPage`가 실제로는 (mock이
아닌) `AppContext.courses`에 연결된 실 `Restaurant`(lat/lng 보유)를 쓰고 있어 데이터 비호환 우려가
근거 없었음이 확인됨.

- `types/course.ts`의 `CoursePlace`에 `latitude?`/`longitude?`/`address?` 추가.
  `lib/courseMapSync.ts`의 `getCoursePlacesFromStops`, `CourseEditPage.tsx`의 `restaurantToPlace`에서
  연결된 Restaurant의 실 값으로 채움.
- `components/course/CourseMapView.tsx` 신규 — 모든 place에 위경도가 있으면 Google 지도
  (`components/map/CourseMap`)를, 없으면(순수 mock 폴백 코스만 해당) 기존 SVG 그리드 지도로 폴백.
  `CourseEditPage.tsx`/`CourseDetailPage.tsx`의 `<CourseMap>` 사용을 `<CourseMapView>`로 교체.
  공유 템플릿 이미지 캡처 컴포넌트(`components/share/*`, `CourseSharePage.tsx`)는 기존 SVG 그대로 유지
  (html-to-image 캡처 호환성 때문에 여전히 범위 밖).
- 장소 리스트(`SortableItem`/`PlaceItem`)에 주소 라인 추가.
- `CourseEditPage`의 `RestaurantPickerSheet`(식당 추가 시트)가 기존엔 로컬 `restaurants` 배열만
  텍스트 필터링했음(Google Places 미사용) — `usePlacesSearch`+`getPlaceDetails` 배선해 실시간 Google
  검색 결과 섹션 추가(선택 시 `registerRestaurants`로 즉시 반영), 기존 "저장된 식당" 로컬 목록은 유지.
  두 목록 모두 주소 표시. `PlaceExplorePage.tsx`에 있던 Google row→Restaurant 매핑 함수를
  `lib/googlePlaces.ts`로 추출해 재사용(중복 제거).
- 라이브 검증: `/course/c3?from=template-detail...`, `/course/c3/edit?from=profile` 접속 시 실제 Google
  지도 타일 + 번호 마커(Melbourne Fitzroy 실 좌표) 렌더 확인, 장소 리스트에 실 도로명 주소 표시 확인.
  식당 추가 시트에서 "Bakery" 검색 → 실제 Google 결과 5건(주소 포함) 수신 확인, 선택 시
  `getPlaceDetails`→`registerRestaurants`→`addPlace` 정상 호출(코스가 이미 MAX_PLACES=4를 초과한
  기존 테스트 데이터라 상한 토스트로 차단되는 것까지 정확히 동작 확인).
- `pnpm run check` 클린.

## 2026-07-18 코스맵 pinning + connect + drawing (mobile edit.tsx 동작 포팅)

mobile `app/course/[id]/edit.tsx`의 지도 3동작을 웹 코스 지도에 이식:
- **pinning**: 각 장소를 순번 마커로 지도에 핀(`components/map/CourseMap`의 `AdvancedMarker`) — 이미 있음.
- **connect**: `CourseMapView`에서 `useDirections(순서 좌표, 'walking')` 호출 → directions Edge Function
  실제 도보 경로 좌표 수신. (기존엔 마커를 잇는 직선만 그렸음.)
- **drawing**: 그 경로를 `CourseMap`의 폴리라인으로 그림(경로 도착 전엔 마커 직선으로 폴백, 실패 시
  '직선 표시 중' 배지). 실제 도보 거리를 `도보 약 Xkm` 배지로 지도 좌상단에 표시(mobile 리스트 헤더의
  '도보 약 Xkm' 힌트 대응).
- 라이브 검증: `/course/c3?from=template-detail...`, `/course/c3/edit?from=profile` 모두 '도보 약 2.2km'
  배지 + 도로를 따라 꺾이는 실제 경로 폴리라인 렌더 확인(직선 아님 → directions 응답 실반영).
  `distanceMeters`는 directions Edge Function 성공 응답에서만 나오므로 배지 표시 = 실호출 증거.
- `pnpm run check` 클린.

### 스코프: 공유 템플릿 이미지 캡처용 SVG 지도는 계속 미교체

`components/share/*`, `CourseSharePage.tsx` 등 html-to-image로 정적 이미지를 캡처하는 컴포넌트들은
여전히 기존 `components/course/CourseMap.tsx`(추상 `{x,y}` SVG)를 사용한다. 이들은 비동기 타일 로딩·
CORS 제약이 있는 실시간 Google 지도를 캡처하기 어려워 범위 밖으로 유지. `CourseEditPage`/
`CourseDetailPage`의 "지도" 섹션(라이브 화면, 캡처 대상 아님)만 이번 사이클에서 Google 지도로 교체됨.
