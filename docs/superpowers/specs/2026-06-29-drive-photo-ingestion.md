# 드라이브 사진 인제스천 — 콜드스타트 해소 계획 (하네스 스크랩 + 스키마)

- 날짜: 2026-06-29
- 상태: **계획(로직+문서) · 코드 미착수 · 열린 질문 2개**
- 소스: 팀 구글드라이브 `Restaurant/` — 폴더명 = 구글맵 레스토랑 이름, 폴더당 사진 3+장
  (정면 / 내부 / 메뉴판 / 개별 음식 / 테이블 세팅)
- 요구: 메타데이터 최대 수집 · **메뉴 사진은 정보만 추출하고 이미지는 저장 금지** · 토큰 최적화 ·
  기존 아키텍처에 축적(스키마/DB 개선 포함)

## 0. 왜 — 콜드스타트의 진짜 원인

`server/engine/features.ts`의 아이템 벡터 x_i가 **카테고리 정규식 + price_level만**으로 만들어진다(8차원).
→ **같은 카테고리의 두 식당은 피처가 동일** → 엔진이 식당을 구분 못 함. 유저 데이터가 쌓여도
아이템 쪽이 붕어빵이면 취향 학습이 못 붙는다. 드라이브 사진의 메뉴·분위기·시그니처 메타데이터가
이 구멍(식당별 고유 피처)을 메운다. features.ts 주석의 "피처 스토어" 자리가 이미 아키텍처에 있음.

## 1. 재사용 자산 (있는 것 위에 쌓는다)

| 자산 | 재사용 |
|---|---|
| `server/menu/extractMenu.ts` | NVIDIA NIM 비전 메뉴 추출(이미지→메뉴 JSON) — **메뉴판 사진 처리에 그대로** (Claude 토큰 0 경로) |
| `server/menu/runBatch.ts` → `server/data/menus.json` + `loadMenus.ts` | "배치 → data/*.json → 부팅 시 로드" 패턴 — 인제스천 산출물도 동일 패턴 |
| `restaurants.menu_items` JSONB (name/price/category/description/dietary) | 메뉴 스키마 계약 이미 존재 |
| DB 방화벽 메모리 | 라이브 DB write 불가 → **SQL은 대시보드 SQL Editor로, 앱은 로컬 JSON 폴백** 이중 산출 |

## 2. 하네스 스크랩 계획 (Workflow, 토큰 최적화)

원칙: **이미지를 보는 단계는 단 두 곳(분류·메뉴추출)뿐, 나머지는 전부 코드(토큰 0).**
이미지당 비전 1회 원칙 — 레저(ledger)로 멱등화해 재실행 시 재과금 없음.

```
Phase 0  다운로드+매니페스트          [코드, 토큰 0]
  드라이브 → 로컬 스크래치. manifest.json: {폴더(식당명), 파일, SHA-1, 크기}
  ingest_ledger와 대조 → 이미 처리한 해시 스킵 (멱등·증분)

Phase 1  사진 분류+메타데이터          [비전 ①: haiku, 4~6장/콜 배치]
  pipeline(식당들) → 에이전트가 식당 폴더 사진 일괄 판독, 이미지당:
  { kind: storefront|interior|menu|dish|table|other,
    dishes: [보이는 음식 추정], vibe_tags: [분위기], quality: 0~1 }
  → 이 시점에 메뉴판(kind=menu)이 식별됨

Phase 2  메뉴판 → 메뉴 정보만          [비전 ②: NIM 우선(Claude 토큰 0), 폴백 haiku]
  kind=menu 사진만 extractMenu 이미지 경로로 → {name, price, category, description}[]
  ★ 추출 즉시 매니페스트에 consumed 마크, 메뉴 이미지는 어떤 산출물에도 미포함 (요구사항)

Phase 3  식당 매칭+병합                [코드 + 저토큰 텍스트 1콜]
  폴더명(구글맵 이름) ↔ restaurants/melbourne_osm 정규화 매칭.
  애매한 것만 모아 텍스트 에이전트 1콜로 판정. 미존재 → 최소 신규 레코드(source='drive').

Phase 4  식당 프로파일 집계            [코드 위주 + 텍스트 1콜]
  메뉴 텍스트·dish 태그 → 맛 프로파일(spicy/salty/sweet/oily/light),
  dish 사진 빈도 → signature 후보, 메뉴 가격 → price_stats, vibe_tags 집계.
  키워드→맛 매핑만 전 식당 배치 1콜.

Phase 5  산출+검증                     [코드]
  (a) server/data/drive_ingest.json  — 앱 폴백 로딩 (loadMenus 패턴)
  (b) supabase seed SQL              — 대시보드 SQL Editor 적용용
  (c) 리포트 + 검증: 식당/사진/메뉴 수, 샘플, "메뉴 이미지 미저장" assert
```

**토큰 예산 감각** (사진 N장 기준): 보는 건 N번(분류) + 메뉴판 장수(추출, NIM이면 0).
분류는 haiku 저해상도 ≈ 1.2~1.6k tok/장 → 사진 100장이면 ≈ 15만 haiku 토큰 수준 + 텍스트 2콜.
Opus/Sonnet은 오케스트레이션·검증에만.

## 3. 스키마/DB 개선 (축적 구조)

기존 `photos: string[]` / `menu_items` JSONB는 출처·종류·신뢰도가 없어 축적에 부적합.
**4개 신설 + 1개 승격**, 기존 컬럼은 호환 유지:

```sql
-- ① 사진 메타 (메뉴 사진은 여기 안 들어감 — 추출 후 폐기)
restaurant_photos (
  id text PK, restaurant_id FK, drive_file_id text, url text,
  kind text CHECK IN (storefront, interior, dish, table, other),
  dishes jsonb, vibe_tags jsonb, quality real,
  contributor text, source text DEFAULT 'drive', created_at
)

-- ② 메뉴 (JSONB → 테이블 승격: 다중 소스 병합·업서트 가능)
restaurant_menu_items (
  id text PK, restaurant_id FK, name text, normalized_name text,
  price real, category text, description text, dietary jsonb,
  source text CHECK IN (website, drive_photo), confidence real,
  is_signature bool DEFAULT false, extracted_at,
  UNIQUE (restaurant_id, normalized_name, source)
)

-- ③ 피처 스토어 (콜드스타트 해소 지점 — features.ts가 읽는다)
restaurant_features (
  restaurant_id PK/FK,
  taste jsonb,            -- {spicy, salty, sweet, oily, light} 0~1 (메뉴·dish 기반)
  price_stats jsonb,      -- {min, max, median} 실측 메뉴가격
  signature_dishes jsonb, vibe_tags jsonb,
  feature_version text, updated_at
)

-- ④ 인제스천 레저 (멱등성 = 토큰 절약의 핵심)
ingest_ledger (
  file_hash text PK, drive_file_id text, restaurant_folder text,
  kind text, status text,   -- classified | menu_extracted | skipped
  processed_at
)
```

**엔진 통합** (콜드스타트 해소): `buildItemVector`가 `restaurant_features` 있으면
taste·price_stats로 x_i 구성, 없으면 기존 카테고리 룰 폴백.
→ 같은 카테고리라도 식당별 고유 벡터 → 스와이프 몇 번에도 식당 단위 학습이 붙는다.
(FEATURE_DIM 확장·임베딩은 v2 후속.)

**흐름**: Drive → (하네스) → drive_ingest.json + seed SQL → 로컬 폴백 즉시 반영 ·
Supabase는 SQL Editor 적용 → 서빙 시 features 우선 조회.

## 4. 결정 사항 (기본값 제안)

- 사진 바이너리는 저장 안 함 — **Drive URL/file_id만** DB에 (프로토타입, 스토리지 비용 0).
- 신규 식당(카탈로그 미존재)은 최소 레코드 + `needs_enrichment` 플래그 — Places 보강은
  서버 키 Edge Function 프록시로 후속(클라이언트 키 금지 원칙 준수).
- 팀원 이름(폴더 업로더)은 `contributor`에 — 기여 추적용.

## 5. 열린 질문 (승인 필요)

1. **드라이브 접근 경로** — 폴더가 무인증 열람 불가로 확인됨(로그인 요구).
   (a) 폴더를 "링크 있는 모든 사용자 보기"로 변경 → `gdown --folder` (가장 단순, 권장)
   (b) 사용자의 Chrome 로그인 세션으로 접근 (claude-in-chrome)
2. **gdown 설치 승인** — (a) 경로 선택 시 `pip install gdown` 1회 필요.

## 6. 다음 (승인 후 순서)

1. Phase 0 코드(다운로드+매니페스트) → 실측 N(식당·사진 수) 보고 → 토큰 예산 확정
2. Workflow 스크립트(Phase 1~5) 작성·실행
3. 스키마 마이그레이션 SQL + features.ts 통합 (별도 커밋)
