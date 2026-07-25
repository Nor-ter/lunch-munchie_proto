# 드라이브 사진 인제스천 — 콜드스타트 해소 (하네스 에이전트 전용)

- 날짜: 2026-06-29
- 상태: **계획(로직+문서) · 코드 미착수 · 열린 질문 2개**
- 소스: 팀 구글드라이브 `Restaurant/` — 폴더명 = 구글맵 레스토랑 이름, 폴더당 사진 3+장
  (정면 / 내부 / 메뉴판 / 개별 음식 / 테이블 세팅)
- 요구: 메타데이터 최대 수집 · **메뉴 사진은 정보만 추출하고 이미지는 저장 금지** · 토큰 최적화 ·
  기존 아키텍처에 축적(스키마/DB 개선 포함)
- **수단 제약(확정): 외부 추론 API 미사용.** NVIDIA NIM(`extractMenu`)·기타 API 호출 경로를 쓰지 않고,
  **모든 판독을 하네스 서브에이전트가 수행**한다. → 이미지 비용이 전부 Claude 토큰이므로
  "무엇을·몇 픽셀로·몇 번 보는가"가 설계의 핵심.

## 0. 왜 — 콜드스타트의 진짜 원인

`server/engine/features.ts`의 아이템 벡터 x_i가 **카테고리 정규식 + price_level만**으로 만들어진다(8차원).
→ **같은 카테고리의 두 식당은 피처가 동일** → 엔진이 식당을 구분 못 함. 유저 데이터가 쌓여도
아이템 쪽이 붕어빵이면 취향 학습이 못 붙는다. 드라이브 사진의 메뉴·시그니처·분위기 메타데이터가
이 구멍(식당별 고유 피처)을 메운다. features.ts 주석의 "피처 스토어" 자리가 이미 아키텍처에 있음.

## 1. 재사용 자산 (코드 패턴만, 추론 경로는 미사용)

| 자산 | 재사용 여부 |
|---|---|
| `server/menu/extractMenu.ts` (NIM 비전) | ❌ **미사용** (외부 추론 API 제약) |
| `runBatch.ts` → `server/data/*.json` → `loadMenus.ts` | ✅ "배치 → data/json → 부팅 시 로드" **패턴**만 |
| `restaurants.menu_items` JSONB 계약 | ✅ 메뉴 필드 스키마(name/price/category/description/dietary) |
| DB 방화벽 메모리 | ✅ 라이브 write 불가 → **seed SQL(대시보드) + 로컬 JSON 폴백** 이중 산출 |

## 2. 하네스 설계 — 토큰이 곧 비용

### 원칙 5가지
1. **이미지는 "필요한 해상도로, 필요한 만큼만" 본다.** Claude 이미지 토큰은 픽셀 수에 비례한다.
   → 분류는 저해상도, 텍스트(메뉴판)는 그 사진에만 고해상도.
2. **한 사진에 대한 판독은 원칙적으로 1회.** 단 메뉴판만 2단계(저해상 분류 → 고해상 판독)인데,
   메뉴판은 식당당 0~1장이라 총량이 작다.
3. **폴더 단위 배치** — 식당 1곳(사진 3~8장)을 서브에이전트 1콜로 처리해 프롬프트 오버헤드를 분산.
4. **`schema` 강제 출력** — 산문 금지, 압축 JSON만 반환(출력 토큰 절감 + 파싱 불필요).
5. **메인 컨텍스트에 이미지를 절대 들이지 않는다.** 서브에이전트만 이미지를 보고, 나에게는
   텍스트 결과만 돌아온다. (내 컨텍스트 보존 = 세션 전체 비용 절감)

### 파이프라인

```
Phase 0  다운로드 + 매니페스트 + 리사이즈            [코드, 토큰 0]
  드라이브 → 로컬 스크래치. manifest.json {폴더(식당명), 파일, SHA-1, 크기}
  ledger 대조 → 처리 완료 해시 스킵 (증분·재과금 방지)
  ★ 사전 리사이즈 2종 생성: thumb(긴변 512) / text(긴변 1400, 메뉴판 후보용)
    → 원본을 그대로 보내면 토큰이 수 배로 뛴다. 이 한 단계가 최대 절감 포인트.

Phase 1  분류 + 메타 추출  [서브에이전트 · haiku · thumb(512) · 식당폴더=1콜]
  입력: 그 식당 thumb 전부. 출력(schema 강제):
  { photos: [{ file, kind: storefront|interior|menu|dish|table|other,
               dishes: [음식명 추정], vibe_tags: [분위기], quality: 0~1 }] }
  → 여기서 메뉴판(kind=menu)이 식별된다.

Phase 2  메뉴판 판독  [서브에이전트 · sonnet · text(1400) · kind=menu 만]
  가격·메뉴명 정확도가 중요 → 모델 상향, 해상도 상향. 대상은 소수(식당당 0~1장).
  출력: { items: [{name, price, category, description, dietary}] }
  ★ 판독 즉시 ledger에 menu_extracted 마크. 메뉴 이미지는 산출물·DB 어디에도 미포함.

Phase 3  식당 매칭        [코드 + 텍스트 1콜]
  폴더명 ↔ 기존 카탈로그 정규화 매칭. 애매한 것만 모아 텍스트 에이전트 1콜.
  미존재 → 최소 신규 레코드(source='drive', needs_enrichment).

Phase 4  프로파일 집계    [코드 + 텍스트 1콜]
  메뉴명·dishes → 맛 프로파일(spicy/salty/sweet/oily/light),
  dish 사진 빈도 → signature 후보, 메뉴 가격 → price_stats, vibe_tags 집계.
  키워드→맛 매핑만 전 식당 배치 1콜.

Phase 5  산출 + 검증      [코드, 토큰 0]
  (a) server/data/drive_ingest.json  (앱 폴백)
  (b) seed SQL              (대시보드 SQL Editor 적용)
  (c) 리포트 + assert: "메뉴 이미지 0건 저장" 자동 검증
```

### 토큰 예산 (사진 100장 · 식당 20곳 가정)

| 단계 | 계산 | 대략 |
|---|---|---|
| Phase 1 분류 | 100장 × 512px(≈400tok) + 20콜 오버헤드 | **haiku ≈ 55k** |
| Phase 2 메뉴 | 20장 × 1400px(≈1.8k) + 오버헤드 | **sonnet ≈ 40k** |
| Phase 3·4 텍스트 | 배치 2콜 | ≈ 10k |
| Phase 0·5 | 코드 | **0** |

실측 N은 Phase 0 후 확정. 재실행 시 ledger로 **증분만** 과금.

## 3. 스키마/DB 개선 (축적 구조)

기존 `photos: string[]` / `menu_items` JSONB는 출처·종류·신뢰도가 없어 축적에 부적합.
**4개 신설**, 기존 컬럼은 호환 유지:

```sql
-- ① 사진 메타 (메뉴 사진은 여기 안 들어감 — 판독 후 폐기)
restaurant_photos (
  id text PK, restaurant_id FK, drive_file_id text, url text,
  kind text CHECK IN (storefront, interior, dish, table, other),
  dishes jsonb, vibe_tags jsonb, quality real,
  contributor text, source text DEFAULT 'drive', created_at
)

-- ② 메뉴 (JSONB → 테이블 승격: 다중 소스 병합·업서트)
restaurant_menu_items (
  id text PK, restaurant_id FK, name text, normalized_name text,
  price real, category text, description text, dietary jsonb,
  source text CHECK IN (website, drive_photo), confidence real,
  is_signature bool DEFAULT false, extracted_at,
  UNIQUE (restaurant_id, normalized_name, source)
)

-- ③ 피처 스토어 ★ 콜드스타트 해소 지점 (features.ts가 읽는다)
restaurant_features (
  restaurant_id PK/FK,
  taste jsonb,            -- {spicy, salty, sweet, oily, light} 0~1
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

**엔진 통합**: `buildItemVector`가 `restaurant_features` 있으면 taste·price_stats로 x_i 구성,
없으면 기존 카테고리 룰 폴백. → 같은 카테고리라도 식당별 고유 벡터 → 식당 단위 학습이 붙는다.
(FEATURE_DIM 확장·임베딩은 v2 후속.)

## 4. 결정 사항 (기본값)

- 사진 바이너리 미저장 — **Drive URL/file_id만** DB에 (스토리지 비용 0).
- 신규 식당은 최소 레코드 + `needs_enrichment` — Places 보강은 서버 키 Edge Function으로 후속
  (클라이언트 키 금지 원칙 준수).
- 폴더 업로더 = `contributor` (기여 추적).

## 5. 열린 질문 (승인 필요)

1. **드라이브 접근 경로** — 무인증 열람 불가 확인됨(로그인 요구).
   (a) 폴더를 "링크 있는 모든 사용자 보기"로 변경 → `gdown --folder` (권장)
   (b) 사용자의 Chrome 로그인 세션 경유 (claude-in-chrome)
2. **의존성 승인** — (a) 선택 시 `pip install gdown`, 리사이즈용 `sips`(macOS 내장, 추가 설치 불필요).

## 6. 다음 (승인 후)

1. Phase 0 실행 → 실측 N 보고 → 토큰 예산 확정
2. Workflow 스크립트(Phase 1~5) 작성·실행
3. 스키마 마이그레이션 SQL + features.ts 통합 (별도 커밋)

---

## 실행 결과 (2026-06-29 완료)

| 항목 | 계획 | 실측 |
|---|---|---|
| 식당 / 사진 | 미상 | **118곳 / 484장** |
| Phase 1 분류 | haiku ≈55k | 41배치 · **haiku 1.47M** · 6분 · 에러 0 |
| Phase 2 메뉴 | sonnet ≈40k | 23곳 45장 · **sonnet 1.00M** · 2분 · 에러 0 |
| 산출 | — | 사진 **437**(메뉴 45 제외) · 메뉴 **506개** · 피처 **118** |

**계획 대비 토큰이 큰 이유**: 에이전트가 이미지를 Read할 때마다 컨텍스트가 누적되고
매 턴 전체가 재전송된다. 이미지 토큰 자체보다 **턴 누적**이 지배적이었다.
→ 다음 실행 시 개선: 배치당 사진 수를 더 줄이고(6~8장), 레저로 증분만 처리.

**다운로드 최적화 (계획 변경)**: gdown이 원본 파일 52장에서 접근 제한에 걸림.
→ Drive **썸네일 엔드포인트**(`thumbnail?id=&sz=w512/w1400`)로 전환. 제한 회피 +
필요 해상도 직접 수신 + HEIC→JPEG 자동 변환 + 306MB→46MB. `sips` 리사이즈 단계 불필요해짐.

**검증**
- `photos`에 `kind=menu` **0건** (assert 통과) — 메뉴 사진 미저장 요구사항 충족.
- 부팅 시 "피처 스토어 118곳 로드 (file)" 확인.
- **콜드스타트 해소 실증**: 한식 10곳 고유 벡터 1종 → **9종**, 카페 10곳 → **7종**.
  예) Bandak Chicken(튀김) oily 0.91 vs David's Master Pot(전골) oily 0.52 — 이전엔 동일.

**발견**: 드라이브 118곳 중 기존 카탈로그와 매칭된 곳은 **2곳뿐**, 나머지 **116곳은 신규**.
즉 이 데이터는 피처 보강이자 **카탈로그 확장**(약 6배)이다.
신규 식당은 `needs_enrichment=true` + 좌표 플레이스홀더(CBD) — 거리 필터에 쓰기 전
Places 보강(서버 키 Edge Function) 필요. **이것이 다음 작업의 최우선.**
