# 웹(Vite) Google Maps + Places + Directions 워크플로우 설계

> Lunchie Munchie · Vite + React(Wouter) + Express · 후속 문서
> 선행(이식 원본): `mobile/services/{edgeFunctions,placesApi,directionsApi}.ts`, `mobile/lib/polyline.ts`,
> `mobile/hooks/{usePlacesSearch,useDirections}.ts`, `mobile/components/{CourseMap,AddRestaurantSheet}.tsx`
> 관련: `course-edit-restaurant-crud-workflow.md`(Edge Function 프록시 원칙), `web-follow-login-workflow.md`(하네스·supabase-js 기반)
> 목적: 모바일이 Edge Function 프록시로 Google Places/Directions 실 식당을 가져오고 Google Maps로 그리던 기능을
> **웹에 포팅**한다. 백엔드(Edge Function 4종)는 이미 배포·검증됨 — 순수 프론트 작업.

---

## 0. 이 문서의 사용법

1. 현재 상태(§1) 실측 완료 — 신뢰.
2. 설계 결정(§2) 사용자 확정 — 재논의 금지.
3. Phase 0~4 순차 실행: `/implement-web-maps [N]` — 상태 판정은 **반드시 `pnpm harness:web-maps status`**의
   `NEXT_PHASE`. `/loop /implement-web-maps`로 자율 순차. 각 Phase 내장 검증 통과해야 완료.
4. `.claude/CLAUDE.md` 6단계 루프·안전 게이트·"증상 하나=원인 하나 금지" 적용.

**안전 게이트(사람)**: dep 설치 · 루트 `.env` 쓰기 · Google Cloud 웹 키 발급/제한 · 커밋.
**자율 허용**: 코드 편집 · `pnpm run check`/`harness verify` · preview 브라우저 조작 · read-only DB · dev 서버.

---

## 1. 현재 상태 (실측)

### 1.1 백엔드는 이미 끝나 있다
- Edge Function 4종 **전부 ACTIVE(v2) 배포**: `places-search` / `places-autocomplete` / `place-details` / `directions`.
  `_shared/cors.ts` = `Access-Control-Allow-Origin: *`(웹 호출 허용), `verify_jwt: true`.
- 웹은 follow Phase 0에서 **익명 세션(JWT)** 확보 완료 → `supabase.functions.invoke`가 세션 access token을
  자동 첨부하므로 **웹에서 그대로 호출 가능**. Google 서버 키는 Edge Function env에만 존재(클라 노출 0).
- → **DB 마이그레이션·서버·Edge Function 수정 0.**

### 1.2 웹 현황 / 이식 격차
- 실 식당: `CourseEditPage`가 로컬 `restaurants`(=/api/restaurants → DB→OSM→MOCK)를 문자열 필터만. Google Places 호출 전무.
- 지도: `LunchieMapPage`/`CourseNavigatePage`/`TourModePage`/`CourseEditorPage`=react-leaflet(OSM), 코스 미리보기=`CourseMapSvg`(SVG), `TourMapPage`=SVG. **Google Maps 실사용 0**(`components/Map.tsx`는 forge 프록시 데모, 미import 죽은 코드).
- 웹 Google Maps **브라우저 키 없음**(`.env`에 `VITE_GOOGLE*` 없음).
- 기존 자산: `@tanstack/react-query`·`client/src/lib/supabase.ts`(follow Phase 0), shadcn/ui, Tailwind v4, framer-motion, sonner.

### 1.3 이식 원본 (모바일, 검증 완료)
| 원본 | 내용 | 이식 |
|---|---|---|
| `mobile/services/edgeFunctions.ts` | `invokeEdgeFunction` (supabase.functions.invoke 래퍼, {code,message} 정규화) | 그대로 |
| `mobile/services/placesApi.ts` | searchPlaces/autocompletePlaces/getPlaceDetails/generateSessionToken/타입 | 그대로 |
| `mobile/services/directionsApi.ts` | getDirections(coords, mode) → {encoded polyline, distance, duration} | 그대로 |
| `mobile/lib/polyline.ts` | decodePolyline(encoded) → LatLng[] | 그대로(순수함수) |
| `mobile/hooks/usePlacesSearch.ts` | autocomplete + debounce + 세션토큰, queryKey ['placesAutocomplete',…] | 그대로 |
| `mobile/hooks/useDirections.ts` | 좌표 5자리 반올림 queryKey, directions 조회 | 그대로 |
| `mobile/components/CourseMap.tsx` | react-native-maps 마커+Polyline | **웹 재작성**(@vis.gl/react-google-maps) |
| `mobile/components/AddRestaurantSheet.tsx` | autocomplete→details→restaurants upsert 흐름 | **웹 전용 탐색화면으로 재작성** |

---

## 2. 설계 결정 (사용자 확정)

- **지도**: **Google Maps JS로 교체**(`@vis.gl/react-google-maps` — Google 공식 React 래퍼). 이번엔 코스 지도 우선,
  Leaflet 페이지 전면 교체는 후속.
- **Places**: **전용 식당 탐색 화면 신규**(`PlaceExplorePage`) — 로컬 필터는 그대로 두고 Google 실검색을 별도 UX로.
- **directions 포함**: 코스 지도에 도보 경로 폴리라인.
- **불변 원칙(모바일 §2 계승)**: 클라이언트에서 Google 직접 호출 금지. **반드시 Edge Function 경유**(서버 키 보호).

---

## 3. 아키텍처

```
client/src/
├── lib/{supabase.ts(기존), polyline.ts(신규)}
├── services/{edgeFunctions,placesApi,directionsApi}.ts   (mobile 이식)
├── hooks/{usePlacesSearch,useDirections}.ts              (mobile 이식)
├── components/map/
│   ├── MapProvider.tsx     (APIProvider — App에 마운트, VITE_GOOGLE_MAPS_API_KEY)
│   └── CourseMap.tsx       (Map + AdvancedMarker 순번핀 + google.maps.Polyline 경로)
└── pages/PlaceExplorePage.tsx   (신규 /explore/places — Places 검색→지도/리스트→코스 추가)
```

---

## 4. Phase 순차 구현 (0~4) — 상태·완료는 `pnpm harness:web-maps`가 판정

### Phase 0 — Google Maps 로더 + 브라우저 키
- **[dep 게이트]** `pnpm add @vis.gl/react-google-maps`.
- **[.env 게이트]** 루트 `.env` + `.env.example`에 `VITE_GOOGLE_MAPS_API_KEY`.
- **[대시보드 게이트 — 사람]** Google Cloud **웹 브라우저 키 신규**: Maps JavaScript API 활성화 +
  Application restriction=HTTP referrers(`http://localhost:5173/*` + 발표 origin) + API restriction=Maps JS.
  모바일 SDK 키 재사용 불가(플랫폼 제한 상이).
- `client/src/components/map/MapProvider.tsx`(`<APIProvider apiKey>` 래핑) — `App.tsx`에 마운트.
- 검증: preview에서 Google 지도 타일 렌더(키 유효). harness evidence: `browser`, `human-mapkey`.

### Phase 1 — Edge Function 서비스/훅 포팅
- `edgeFunctions.ts`/`placesApi.ts`/`directionsApi.ts`/`lib/polyline.ts` 이식(alias `@/lib/supabase`),
  `hooks/usePlacesSearch.ts`/`useDirections.ts` 이식.
- 검증: preview 콘솔에서 `searchPlaces('...')` → **실제 Google 식당 결과** 수신. harness evidence: `edge-invoke`.

### Phase 2 — Google 코스 지도 (마커 + 경로)
- `components/map/CourseMap.tsx`(마커 순번 + `useDirections`→`decodePolyline`→`google.maps.Polyline`).
- 코스 미리보기 `CourseMapSvg` 사용처에 `CourseMap` 스왑.
- 검증: preview 지도에 마커+경로선. harness evidence: `browser`, `edge-invoke`.

### Phase 3 — 전용 식당 탐색 화면
- `/explore/places` 라우트 + `PlaceExplorePage.tsx`: 자동완성→place-details(선택1회)→지도/리스트→"코스에 추가".
  진입 링크 배선(문서에서 확정). 세션토큰+debounce로 비용 억제.
- 검증: 실 식당 검색→표시→추가 왕복. harness evidence: `browser`, `edge-invoke`.

### Phase 4 — 최종 게이트
- `web-verifier`(Edge Function 4종·DB) → `web-security-auditor`(서버 키 부재·웹 키 referrer 제한·`grep VITE_`·gitignore)
  → `docs/workflow/web-maps-places-work-log.md` append. `harness verify 4`(check+build). PASS 전 완료 금지.

---

## 5. 검증 포인트 / 흔한 실패
- 지도 안 뜸 → 키 미발급/referrer 미허용/Maps JS API 비활성. 브라우저 콘솔 `Google Maps JavaScript API error` 코드 확인.
- `searchPlaces` 401/403 → 익명 세션 미확보(JWT 없음) 또는 Edge Function verify_jwt. follow Phase 0 부팅 배선 확인.
- Places 결과 빈값 → Edge Function env의 서버 키/API 활성 문제(Edge Function Logs) — 클라 문제로 오인 금지.
- 비용: Places는 호출당 과금 — 자동완성 세션토큰 + debounce 필수(모바일과 동일).
- dev 서버는 **5173**(Vite)로 검증. 3000은 낡은 dist.

## 6. 완료 정의 (DoD)
- [ ] Google 지도 타일 렌더(웹 키 유효, referrer 제한)
- [ ] `searchPlaces`/`getDirections` Edge Function 웹 익명 JWT로 왕복(실 데이터)
- [ ] 코스 지도: 마커 순번 + 도보 경로 폴리라인
- [ ] 전용 탐색 화면: 실 식당 검색→지도/리스트→코스 추가
- [ ] 브라우저 번들에 서버 키 부재 · 웹 키 referrer 제한 (web-security-auditor PASS)
- [ ] work-log append + `harness verify 4` PASS

## 7. 스코프 밖 (후속)
- Leaflet 페이지(navigate/lunchie/tour) 전면 Google 교체 · Directions 대체교통수단 · RN 재적용 · Apple/기타 지도.
