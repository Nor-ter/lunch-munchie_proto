# 코스맵 편집 → 식당 편집/추가/삭제 구현 워크플로우 설계

> Lunchie Munchie · 먼치모드(Munch Mode) · React Native + Expo
> 대상: `app/course/[id]/edit.tsx` 이후 "실제 데이터로 식당을 편집·추가·삭제" 기능
> 지역 기준: **Melbourne, AU** · 외부 데이터: **Google Places / Directions API**
> 목적: 이 문서를 근거로 Claude Code와 순차 청크 구현 진행

---

## 0. 이 문서의 사용법

각 화면은 "웹 프로토타입 = 무엇을 보여줄지 참고", "코드 = RN 방식으로 새로" 원칙으로 진행한다.
이 문서는 그 중 **식당 CRUD(편집/추가/삭제)** 흐름 하나만 다룬다. 순서는:

1. 데이터 소스 결정 (§1) — 선택 확정 필요
2. 아키텍처·스키마·API 설계 확정 (§2~§5)
3. Phase 0~6 순차 구현 (§6)
4. 각 Phase의 Claude Code 프롬프트를 그대로 붙여넣어 실행 (§7)

스택은 이미 확정된 constitution을 따른다. **새 라이브러리 도입 금지, 필요 시 제안 후 대기.**

| 레이어 | 확정 스택 |
|---|---|
| 플랫폼 | React Native + Expo, Expo Router |
| 스타일 | NativeWind |
| 상태 | Zustand(client) + TanStack Query(server) |
| 제스처/애니 | Reanimated 3, Gesture Handler, draggable-flatlist |
| 지도 | **Google Maps (`react-native-maps`, `PROVIDER_GOOGLE`)** ← Mapbox에서 교체 |
| 백엔드 | Supabase (PostgreSQL + PostGIS + Realtime + Storage) |
| 외부 API | Google Maps SDK, Google Places API, Google Directions API |
| 금지 | Redux, Firebase, axios 직접, styled-components, Leaflet(RN), React Navigation 직접 config |

> **스택 변경 이력**: 지도 렌더링을 Mapbox(`@rnmapbox/maps`) → Google Maps(`react-native-maps`)로 전환. 설정은 §4.5 참조.

---

## 1. 데이터 소스: 두 방식 트레이드오프 (미정 → 결정 필요)

식당 데이터의 **source of truth**를 어디에 둘지가 이 기능 전체 설계를 가른다. 두 안을 비교한다.

### 안 A — Supabase 우선 + Places 보강 (권장)

코스와 그 안의 식당(stop)은 **Supabase에 저장**한다. Google Places는 (a) 식당 추가 시 검색/주변탐색, (b) 신규 식당의 상세정보(좌표·영업시간·평점·사진) 1회 조회 후 **Supabase에 스냅샷 캐싱** 용도로만 호출한다.

- 장점: Places 호출 횟수 최소화 → **비용/쿼터 유리**. 코스는 오프라인/재접속에도 안정적. Realtime 구독으로 협업/멀티기기 동기화 가능. PostGIS로 거리·경로 쿼리를 서버에서 처리.
- 단점: 스냅샷이 시간이 지나면 stale(폐업·시간변경). → `place_details` 캐시에 TTL(예: 30일) 두고 만료 시 재조회로 완화.
- 정합성 원칙: **좌표·place_id·이름은 Supabase 스냅샷이 진실**, 평점·영업중 여부 같은 휘발성 필드는 상세화면 진입 시 Places로 lazy refresh.

### 안 B — Google Places 직접 의존

편집할 때마다 식당 정보를 Places API로 직접 조회. Supabase에는 코스 구성(순서, place_id 목록, 사용자 메모)만 저장.

- 장점: 항상 최신 데이터. 스키마 단순(스냅샷 테이블 불필요).
- 단점: 화면 진입/편집마다 Place Details 호출 → **비용·레이턴시 급증**, Places 쿼터에 앱 안정성이 종속. 오프라인 시 코스가 이름/사진 없이 빈 카드로 표시됨. Google **캐싱 정책** 상 place_id 외 필드의 장기 저장에 제약이 있어 스냅샷 활용도 제한.

### 비교표

| 기준 | A: Supabase 우선 | B: Places 직접 |
|---|---|---|
| Places 호출량 | 낮음(추가/refresh 시만) | 높음(진입·편집마다) |
| 월 API 비용 | 낮음 | 높음 |
| 오프라인/재접속 | 강함 | 약함 |
| 데이터 최신성 | TTL 기반, 약간 지연 | 항상 최신 |
| Realtime 협업 | 자연스러움 | 별도 설계 필요 |
| 스키마 복잡도 | 중(스냅샷+캐시) | 낮음 |
| Google 정책 리스크 | 낮음(place_id+짧은 캐시) | 낮음 |

### 권고

**안 A 채택.** 비용·오프라인·협업 이점이 크고, TTL 기반 lazy refresh로 최신성 단점을 대부분 상쇄한다. 이 문서의 나머지는 안 A를 전제로 작성하되, §2 스키마에서 안 B로도 전환 가능하도록 place_id를 1급 키로 유지한다. (안 B로 갈 경우 `restaurants` 스냅샷 테이블을 제거하고 `course_stops`에 place_id만 남기면 됨.)

---

## 2. 아키텍처 (레이어)

```
┌──────────────────────────────────────────────────────────┐
│ UI (Expo Router screens / components)                     │
│  edit.tsx · AddRestaurantSheet · StopCard · MapPreview    │
└──────────────┬────────────────────────┬───────────────────┘
               │ 사용자 액션              │ 지도/경로
┌──────────────▼───────────┐  ┌──────────▼───────────────────┐
│ Client state (Zustand)   │  │ Server cache (TanStack Query) │
│  편집 중 draft, dirty,    │  │  useCourse / useStops /       │
│  낙관적 순서, 선택 상태    │  │  usePlacesSearch / useDirections│
└──────────────┬───────────┘  └──────────┬───────────────────┘
               │                          │
        ┌──────▼──────────────────────────▼──────┐
        │ Service layer (순수 함수, RN 비의존)     │
        │  coursesApi · stopsApi · placesApi ·    │
        │  directionsApi  (fetch 기반, no axios)  │
        └──────┬───────────────────────┬──────────┘
               │ Supabase JS            │ Edge Function proxy
        ┌──────▼──────────┐     ┌───────▼──────────────────────┐
        │ Supabase        │     │ Supabase Edge Function        │
        │  Postgres+PostGIS│    │  /places-search /place-details│
        │  Realtime·Storage│     │  /directions  (Google 키 보관)│
        └─────────────────┘     └───────┬──────────────────────┘
                                         │
                                 ┌───────▼─────────┐
                                 │ Google APIs     │
                                 │ Places·Directions│
                                 └─────────────────┘
```

**핵심 원칙**

- Google API 키는 **절대 RN 번들에 넣지 않는다.** 모든 Google 호출은 Supabase Edge Function 프록시를 경유(키는 Edge Function env). 클라이언트는 프록시만 호출.
- `services/*`는 RN·React에 의존하지 않는 순수 함수 → 웹 랜딩(Next.js)과 추후 공유 가능.
- 편집 중 상태는 Zustand `editStore`(draft)로만 관리하고, "저장" 시점에만 Supabase에 커밋. TanStack Query는 서버 진실을 캐시하고 mutation 후 invalidate.

---

## 3. 데이터 모델 (실제 Supabase 스키마 기준)

> 이 절은 가정된 스키마가 아니라 **운영 중인 실제 DB 스키마**를 반영한다. 이미 여러 기능
> (`swipes`, `rec_events`, `sessions`, `course_items`)이 `restaurants.id`를 참조하므로 **기존
> 컬럼·id·타입은 건드리지 않고**, Google 연동에 필요한 컬럼만 **덧붙인다(additive).**

### 3.1 실제 테이블 구조 (관련 부분만)

식당은 `restaurants`가 정식 테이블(source of truth)이고, 코스 안의 식당 항목은 `course_items`가
`restaurant_id`(내부 text id)로 참조한다. 즉 **이 앱은 이미 "안 A"(Supabase 우선) 구조다.**
설계 초안의 `course_stops`/`place_id`/`geom`은 폐기하고 아래 실제 명칭으로 대체한다.

| 설계 초안 명칭 | → 실제 스키마 |
|---|---|
| `course_stops` 테이블 | `course_items` |
| `position` | `order_index` (int) |
| `place_id` (Google) | `restaurant_id` (내부 id) + `restaurants.google_place_id` (신규) |
| `note` | `memo` |
| `restaurants.geom` / `fetched_at` | 없음 → PostGIS는 보류, TTL은 `synced_at` 신규 |

```
courses(id text PK, author_id text, title, description, hero_image, category, region,
        tags jsonb, hashtags jsonb, total_distance float8, total_duration int,
        likes_count, saves_count, comments_count, route_polyline, share_image_url,
        is_public bool, created_at)          -- id/컬럼 변경 없음

course_items(id text PK, course_id text, restaurant_id text, order_index int,
        start_time text, end_time text, is_bookmarked bool, memo text, created_at)
        -- 편집 대상 테이블. order_index = 정렬 순서

restaurants(id text PK, name, category('기타' default), address, latitude float8,
        longitude float8, rating float8, review_count int, price_level int,
        short_description, tags jsonb, dietary_options jsonb, photos jsonb,
        menu_items jsonb, phone_number, business_hours text)
        -- swipes/rec_events/sessions/course_items 가 restaurants.id 참조 → id 불변
```

### 3.2 이번에 적용할 마이그레이션 (무손상 · additive only)

`restaurants`의 기존 컬럼·id는 그대로 두고, Google 브릿지 컬럼 3개만 추가한다. 기존에 연결된
어떤 기능도 깨지지 않는다(새 컬럼은 nullable 또는 default 보유).

```sql
alter table restaurants
  add column if not exists google_place_id text unique,   -- Google place_id 브릿지(중복제거/refresh 키)
  add column if not exists synced_at       timestamptz,   -- 마지막 Google 동기화 시각(TTL 판정)
  add column if not exists source          text not null default 'seed';  -- 'seed' | 'google'
```

- ✅ **적용 완료**: 실제 DB에 `restaurants_google_place_id_key`(UNIQUE) 확인됨. 위 마이그레이션은 이미 반영된 상태.
- `google_place_id`는 nullable → 기존 seed 데이터는 NULL 유지(Postgres는 NULL 중복 허용해 unique 충돌 없음).
- **`rating`/`price_level`의 NOT NULL은 풀지 않는다.** Google이 값을 안 줄 때는 insert 레이어(§4 프록시)에서 기본값을 채운다: `rating → 0`, `price_level → 2`. UI는 `review_count === 0`이면 "평점 없음"으로 표시.
- **타입 변경 보류**: `created_at`(timestamp→timestamptz), `business_hours`(text→jsonb)는 기존 읽기/쓰기 코드를 깨뜨리고 이 기능에 불필요하므로 이번엔 하지 않는다(§9 열린 결정으로 이월).
- **PostGIS 보류**: `geom`/gist 인덱스 없음. 서버측 근접 검색은 당분간 Google Nearby로 대체. 필요 시 후속 마이그레이션에서 `geom` 추가.
- **ORM 동기화**: text id + snake_case + jsonb 패턴 → Drizzle 등 코드 스키마가 있을 가능성이 큼. 위 3개 컬럼을 코드 스키마에도 반영하고 타입 재생성할 것.

### 3.3 order_index(정렬) 처리 — ✅ 확정

실제 제약 확인 결과: `course_items`에는 **PK(id)만 있고 `unique(course_id, order_index)` 제약이 없다.**
따라서 재정렬은 **가장 단순한 방식**으로 확정한다.

- 커밋 시 draft 배열 순서대로 각 item의 `order_index`를 0..n-1로 재부여해 **upsert만** 한다.
  임시 offset/float-gap 트릭 불필요.
- 다만 표시 쿼리는 항상 `order by order_index` 로 정렬해 읽는다(중복 order_index가 물리적으로
  막혀 있진 않으므로, 앱이 커밋 시 항상 0..n-1 연속값으로 정규화해 일관성 유지).

### 3.4 FK 부재 — 앱에서 무결성 보장 (주의)

실제 제약 확인 결과 **`course_items`에 외래키가 하나도 없다**(`course_id`, `restaurant_id` 모두
FK 아님). 결과적으로:

- **코스 삭제 시 DB cascade가 없다** → 삭제 로직에서 해당 코스의 `course_items`를 앱이 직접 지워야 함.
- **orphan 방지도 앱 책임** → 추가 시 존재하는 `restaurant_id`만 넣도록 코드에서 보장(§4 add 흐름은
  place-details upsert 후 실제 id를 받아 넣으므로 자연히 충족).
- (선택) 무결성을 DB로 끌어올리려면 후속 마이그레이션에서 FK 추가 가능. 단 기존 데이터에 orphan이
  있으면 FK 생성이 실패하므로, 추가 전 orphan 정리 필요 → 이번 범위에선 보류.

### 3.5 RLS — ✅ 진단 완료 · 정책 추가 필요

**진단**: `pg_policies` 결과가 0행 = RLS가 켜져 있는데 **정책이 하나도 없다 → 전면 차단(deny-all)**.
추가로 `auth.users=0`, `public.users=0`, supabase 클라이언트 파일 없음 → **인증 미구축, RN이
supabase-js로 이 테이블을 직접 접근하고 있지 않음**(현재 데이터는 seed, 접근은 Drizzle 직접
연결 등 RLS 우회 경로로 추정). 따라서 지금 deny-all은 아무것도 깨뜨리지 않지만, **RN 클라이언트가
supabase-js(anon 키)를 붙이는 순간 식당 CRUD가 전부 막힌다.**

**결정(권장): 패턴 1 — Supabase Auth + 클라이언트 직접 접근 + RLS 정책.**
- MVP에는 **익명 인증(`supabase.auth.signInAnonymously()`)**으로 시작 → 기기마다 `auth.uid()` 확보,
  RLS 즉시 동작. 이후 소셜/이메일 로그인으로 승격.
- 코스 생성 시 `author_id = auth.uid()::text`로 저장(기존 컬럼 타입 text 유지, uuid를 text로 캐스팅).
- `restaurants` **쓰기는 Edge Function(service_role, RLS 우회) 전용** → authenticated 클라이언트용
  write 정책은 만들지 않는다(deny-all 유지 = 클라이언트가 식당 데이터를 임의 변조 못 함).

**RLS 정책 초안** (SQL Editor에서 적용, 적용 후 실제 로그인 세션으로 CRUD 검증):

```sql
-- restaurants: 읽기 공개 / 쓰기는 서버(service_role)만 (write 정책 없음 = 차단 유지)
create policy restaurants_read on restaurants for select using (true);

-- courses: 공개 코스 또는 본인 코스 읽기, 본인 코스만 수정
create policy courses_select on courses for select
  using (is_public = true or author_id = auth.uid()::text);
create policy courses_modify on courses for all
  using (author_id = auth.uid()::text)
  with check (author_id = auth.uid()::text);

-- course_items: 소속 코스가 공개거나 본인 것이면 읽기, 본인 코스일 때만 편집/추가/삭제
create policy course_items_select on course_items for select
  using (exists (select 1 from courses c
                 where c.id = course_items.course_id
                   and (c.is_public = true or c.author_id = auth.uid()::text)));
create policy course_items_modify on course_items for all
  using (exists (select 1 from courses c
                 where c.id = course_items.course_id and c.author_id = auth.uid()::text))
  with check (exists (select 1 from courses c
                 where c.id = course_items.course_id and c.author_id = auth.uid()::text));
```

- 주의: 기존 seed 코스의 `author_id`는 현재 로그인 uuid와 안 맞으므로, 익명 세션에선 `is_public=true`
  인 것만 보인다. 편집 테스트는 **본인이 만든(내 auth.uid()로 author_id가 박힌) 코스**로 해야 통과.
- `for all` 정책은 insert/update/delete를 모두 커버한다.

---

## 4. Google API 사용 설계 (Edge Function 프록시)

| 기능 | Google API | 프록시 엔드포인트 | 캐싱 |
|---|---|---|---|
| 식당 검색(텍스트) | Places Text Search | `POST /places-search` | 세션 단위 |
| 주변 대체 식당 | Places Nearby Search | `POST /places-nearby` | 세션 단위 |
| 자동완성 | Places Autocomplete | `POST /places-autocomplete` | session token 사용 |
| 신규 식당 상세 | Place Details | `POST /place-details` | **restaurants 테이블에 스냅샷** |
| 코스 경로 | Directions API | `POST /directions` | 좌표해시 키로 단기 캐시 |

**설계 규칙**

- Melbourne 바이어스: Nearby/Autocomplete에 `locationBias`(멜번 중심 + 반경) 또는 코스 첫 stop 좌표 기준 반경 적용.
- Autocomplete는 **session token**으로 묶어 Details 호출과 한 세션으로 과금(비용 절감).
- Place Details 응답은 `restaurants`에 upsert(`google_place_id` 매칭, `source='google'`, `synced_at=now()`) 후, 클라이언트에는 정규화된 형태로 반환. 이미 `google_place_id`로 캐시가 있고 `synced_at`이 TTL 이내면 Google 호출 생략. Google이 안 주는 `rating`/`price_level`은 `0`/`2` 기본값으로 채워 NOT NULL 유지.
- 프록시는 클라이언트 요청을 검증(필드 화이트리스트)하고 필요한 Google `fields`만 요청해 과금 최소화.
- 실패/쿼터 초과 시 프록시가 표준 에러 형태(`{ code, message }`)로 정규화 → 클라이언트 재시도/토스트 처리 일관화.

---

## 4.5 Google Maps 설정 (지도 렌더링 · react-native-maps)

지도 표시는 `react-native-maps`로 하고 Google 프로바이더를 강제한다. 이건 **네이티브 지도 SDK**라서 Places/Directions와 **키 종류가 다르다.**

### 필요한 Google Cloud API (콘솔에서 "사용 설정")

| 키 종류 | 사용 설정할 API | 어디서 쓰나 | 키 위치 |
|---|---|---|---|
| **클라이언트 키** | Maps SDK for **Android**, Maps SDK for **iOS** | 앱에서 지도 타일 렌더 | `app.config` (네이티브 빌드에 주입) |
| **서버 키** | Places API (New), Directions API | Supabase Edge Function 프록시 | Edge Function env (§4) |

> 클라이언트 키와 서버 키는 **분리해서 각각 발급**한다. 클라이언트 키는 앱에 노출되므로 반드시 앱 제한(패키지명+SHA-1 / iOS bundle id)을 걸어야 하고, 서버 키는 API 제한(Places/Directions만) + IP 제한을 건다.

### app.config.ts — 여기에 클라이언트 키를 넣는다

```ts
// app.config.ts (Expo)
export default {
  expo: {
    // ...
    ios: {
      config: {
        // 👉 ADD KEY: Maps SDK for iOS 키
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY,
      },
    },
    android: {
      config: {
        googleMaps: {
          // 👉 ADD KEY: Maps SDK for Android 키
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY,
        },
      },
    },
    plugins: ["react-native-maps"], // config plugin
  },
};
```

```bash
# .env  (git 커밋 금지)
# 👉 ADD KEY: 아래 두 값을 발급받아 채운다
EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY=
EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY=
```

> Expo Go에서는 커스텀 네이티브 키가 안 붙으므로 **development build**(`npx expo run:android` / `run:ios` 또는 EAS build)로 확인해야 한다.

### 지도 컴포넌트 (Mapbox → react-native-maps 치환 포인트)

```tsx
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from "react-native-maps";

<MapView provider={PROVIDER_GOOGLE} style={{ flex: 1 }} initialRegion={melbourne}>
  {stops.map((s, i) => (
    <Marker key={s.id} coordinate={{ latitude: s.lat, longitude: s.lng }} title={s.name} />
  ))}
  <Polyline coordinates={routeCoords} strokeWidth={4} />  {/* Directions 결과 */}
</MapView>
```

- 마커 = `<Marker>`, 경로 = `<Polyline>`(좌표는 Directions 프록시 결과).
- Melbourne 초기 카메라: `initialRegion = { latitude: -37.8136, longitude: 144.9631, latitudeDelta, longitudeDelta }`.

---

## 5. 데이터 플로우 (편집 / 추가 / 삭제)

> 명칭: stop = `course_items` 한 행, 정렬 = `order_index`, 식당 참조 = `restaurant_id`.

**진입**
1. `edit.tsx` 마운트 → `useCourse(id)` + `useItems(id)`로 `courses` + `course_items ⨝ restaurants` 조회(Supabase join).
2. 서버 데이터를 Zustand `editStore`에 draft로 복제. 이후 편집은 draft에서만.

**순서 편집(drag-to-reorder)**
1. draggable-flatlist onDragEnd → draft의 `order_index` 재계산(낙관적) → 지도/경로 즉시 갱신(`useDirections` 재호출은 debounce).
2. `dirty=true`. 저장 버튼 활성화.

**추가(add)**
1. `AddRestaurantSheet` 오픈 → 검색/자동완성(`usePlacesSearch`, 프록시).
2. 후보 선택 → `place-details` 프록시 호출 → `restaurants`에 upsert(`google_place_id` 매칭, 내부 `id` 확보) → draft.items에 새 `course_item`(restaurant_id + 임시 order_index) append.
3. dirty=true.

**삭제(delete)**
1. StopCard swipe-to-delete(Reanimated) → draft.items에서 제거 + `order_index` 재정렬(낙관적) → 지도/경로 갱신.
2. Undo 스낵바(선택) → 미커밋이라 draft 복원만으로 되돌림.

**저장(commit)**
1. 저장 시 draft ↔ 서버 diff 계산(추가/삭제/순서변경된 course_item).
2. `itemsApi.commit(courseId, diff)` → Supabase 트랜잭션(delete → 남은 item `order_index` 0..n-1 upsert → insert new). unique 제약 없음(§3.3)이라 offset 트릭 불필요.
3. 성공 → `invalidateQueries(['items', courseId])`, dirty=false, 토스트.
4. Realtime 구독 중이면 타 기기 자동 반영.

---

## 6. 구현 Phase 분할

각 Phase는 독립 커밋 단위. Claude Code에는 §7의 대응 프롬프트를 순서대로 투입한다.

- **Phase 0 — 기반 배선**: Supabase 마이그레이션(§3 스키마 + RLS), TanStack Query provider, Zustand `editStore` 스캐폴딩, 타입 정의(`types/course.ts`).
- **Phase 1 — 읽기 경로**: `services/coursesApi`, `services/stopsApi`(read), `useCourse`/`useStops` 훅. `edit.tsx`가 실데이터로 stop 리스트+지도 렌더(편집 없이 표시만).
- **Phase 2 — 로컬 편집(순서/삭제)**: draft 동기화, draggable-flatlist 순서변경, swipe-to-delete, 낙관적 지도 갱신. 아직 저장 안 함.
- **Phase 3 — Edge Function 프록시**: `places-search`, `places-autocomplete`, `place-details`, `directions` 4개 함수 배포 + Google 키 설정. 로컬 curl 검증.
- **Phase 4 — 추가(add)**: `services/placesApi`, `usePlacesSearch`, `AddRestaurantSheet` UI, place-details 스냅샷 → draft append.
- **Phase 5 — 저장(commit) + 경로**: diff 커밋 트랜잭션, `useDirections`로 react-native-maps `<Polyline>` 경로, invalidate/토스트/Undo.
- **Phase 6 — 마감**: TTL lazy refresh, 에러/빈상태/로딩 처리, Realtime 구독(선택), 검증 체크리스트.

의존: 0 → 1 → 2 → (3 → 4) → 5 → 6. Phase 3은 2와 병행 가능.

---

## 7. 검증 체크리스트

- [ ] 진입 시 실데이터 item이 order_index 순으로 표시되고 지도 마커가 일치한다.
- [ ] drag 재정렬 후 지도 순서/번호가 즉시 갱신된다(미저장 상태 표시).
- [ ] swipe 삭제 후 Undo 로 복원된다(커밋 전).
- [ ] 추가 검색은 타이핑 중 Place Details를 호출하지 않는다(선택 시 1회만). — 네트워크 로그로 확인.
- [ ] Google 식당 추가 시 rating/price_level 미제공이어도 insert 성공(0/2 기본값)한다.
- [ ] 저장 후 재진입 시 순서/추가/삭제가 서버에 정확히 반영된다.
- [ ] 오프라인/재접속 시 코스가 이름·사진과 함께 표시된다(restaurants 캐시 동작).
- [ ] 익명 로그인 세션에서 공개 코스 select + 본인 코스 course_items CRUD가 RLS를 통과한다.
- [ ] 남의 비공개 코스는 안 보이고, 남의 코스 course_items는 수정 안 된다(RLS 격리 확인).
- [ ] Google 키가 RN 번들/네트워크 요청에 노출되지 않는다(프록시만 호출).
- [ ] order_index 정렬이 충돌 없이 커밋된다(동시 순서변경 케이스 포함).
- [ ] 마이그레이션 후 기존 기능(swipes/rec_events/sessions/기존 course 표시)이 회귀 없이 동작한다.
- [ ] TTL(synced_at) 만료 식당이 상세 진입 시 refresh 된다.

---

## 8. 열린 결정 사항

1. **데이터 소스**: 실제 스키마가 이미 안 A 구조로 확정됨(restaurants=진실, course_items=참조). 추가 조치 불필요.
2. ✅ **order_index 재정렬**: unique 제약 없음 확인 → 단순 0..n-1 upsert로 확정(§3.3).
3. ✅ **RLS/인증**: 정책 0개(deny-all) + 인증 미구축 확인 → 패턴 1(Supabase Auth 익명 로그인 + RLS 정책 추가)로 확정(§3.5). 정책은 Phase 0에서 적용.
4. **보류 마이그레이션**: `created_at` timestamp→timestamptz, `business_hours` text→jsonb. 소비 코드 함께 고칠 때 별도 진행(기존 기능 깨짐 방지).
5. Realtime 구독: MVP 포함 여부(Phase 6 선택).
6. Autocomplete 도입 범위: Text Search만으로 시작할지, Autocomplete+session token까지 갈지(비용 vs UX).
