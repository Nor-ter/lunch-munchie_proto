# Google API 프록시 (Supabase Edge Functions)

워크플로우 §4 / §4.5 구현. **Google 서버 키는 여기(Edge Function env)에만 존재**하고
클라이언트(모바일 앱)에는 절대 번들되지 않는다. 모바일은 이 4개 함수만 호출한다.

## 설계 결정 (스택 constitution)

- **새 npm/외부 의존성 0개.** Deno 런타임 표준 `Deno.serve` + native `fetch`만 사용했다.
  `@supabase/supabase-js`도 import 하지 않는다 — Edge Function에 자동 주입되는
  `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`로 PostgREST를 직접 fetch한다
  (`_shared/db.ts`). 새 라이브러리 도입에 해당하지 않으므로 중단·제안 없이 진행했다.
- Places 계열은 **Places API (New)**(`places.googleapis.com/v1/*`), 경로는 레거시
  **Directions API**(`maps.googleapis.com/maps/api/directions/json`) — §4.5 명시대로.
- 모든 함수는 `{code, message}` 에러 정규화(`_shared/errors.ts`), 필드 화이트리스트
  검증(`_shared/validate.ts`), Google 응답 필드 최소화(`X-Goog-FieldMask` /
  fields 파라미터)를 공통 적용한다. **클라이언트에는 Google 원본을 흘리지 않고
  정규화된 형태만 반환한다.**

## 환경변수

| 변수 | 값 출처 | 비고 |
|---|---|---|
| `SUPABASE_URL` | Supabase가 자동 주입 | 수동 설정 불필요 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase가 자동 주입 | 수동 설정 불필요. RLS 우회 → restaurants 쓰기는 이 경로로만 가능 |
| `GOOGLE_MAPS_SERVER_API_KEY` | **수동 설정 필요** | Places API (New) + Directions API 를 사용 설정한 **서버용** 키. 모바일 클라이언트 키(`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`)와는 **별개 키**를 발급해서 쓸 것(§4.5: 클라이언트 키 ≠ 서버 키, 서버 키는 API 제한 + IP 제한). |

```bash
# 배포 전 1회 (로컬 개발은 supabase/functions/.env.local 로도 가능 — 아래 로컬 테스트 참고)
supabase secrets set GOOGLE_MAPS_SERVER_API_KEY=<서버용_구글_키>
```

## 로컬 테스트

```bash
# 1) 로컬 개발용 시크릿 파일 (git 커밋 금지 — .gitignore 확인)
cat > supabase/functions/.env.local <<'EOF'
GOOGLE_MAPS_SERVER_API_KEY=<서버용_구글_키>
EOF

# 2) 로컬 함수 서버 기동 (--no-verify-jwt: curl 테스트 시 Authorization 생략 허용)
supabase functions serve --env-file supabase/functions/.env.local --no-verify-jwt
```

### 1. places-search — Places Text Search(New)

```bash
curl -i -X POST http://localhost:54321/functions/v1/places-search \
  -H "Content-Type: application/json" \
  -d '{ "query": "멜버른 카페" }'

# bias 커스텀 (예: 코스 첫 stop 좌표 기준)
curl -i -X POST http://localhost:54321/functions/v1/places-search \
  -H "Content-Type: application/json" \
  -d '{ "query": "brunch", "bias": { "lat": -37.8136, "lng": 144.9631, "radiusMeters": 2000 } }'
```

### 2. places-autocomplete — Autocomplete(New)

```bash
curl -i -X POST http://localhost:54321/functions/v1/places-autocomplete \
  -H "Content-Type: application/json" \
  -d '{ "input": "Brother Baba", "sessionToken": "11111111-1111-1111-1111-111111111111" }'
```

### 3. place-details — Place Details(New) + restaurants upsert

```bash
# sessionToken 은 위 autocomplete 에서 쓴 것과 같은 값을 넘겨 한 세션으로 과금(§4).
curl -i -X POST http://localhost:54321/functions/v1/place-details \
  -H "Content-Type: application/json" \
  -d '{ "placeId": "ChIJ...", "sessionToken": "11111111-1111-1111-1111-111111111111" }'

# 응답: { "restaurant": {...restaurants 행...}, "fromCache": boolean }
# 두 번째 호출부터는(30일 이내) fromCache=true 로 Google 재호출 없이 즉시 응답한다.
```

### 4. directions — Directions API

```bash
curl -i -X POST http://localhost:54321/functions/v1/directions \
  -H "Content-Type: application/json" \
  -d '{
    "coordinates": [
      { "lat": -37.8136, "lng": 144.9631 },
      { "lat": -37.8172, "lng": 144.9611 },
      { "lat": -37.8113, "lng": 144.9660 }
    ],
    "mode": "walking"
  }'

# 응답: { "polyline": "인코딩된 폴리라인", "distanceMeters": number, "durationSeconds": number, "fromCache": boolean }
```

## 에러 형태 (공통)

```json
{ "code": "invalid_request", "message": "query 는 필수 문자열입니다." }
```

`code` 종류: `invalid_request`(400, 검증 실패) · `google_api_error`(502, Google 실패/쿼터) ·
`db_error`(502, restaurants 조회/upsert 실패) · `config_error`(500, 키/env 누락) ·
`internal_error`(500, 그 외).

## 배포

```bash
supabase functions deploy places-search
supabase functions deploy places-autocomplete
supabase functions deploy place-details
supabase functions deploy directions
```
