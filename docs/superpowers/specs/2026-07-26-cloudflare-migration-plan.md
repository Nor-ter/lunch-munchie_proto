# Cloudflare 마이그레이션 계획 — 이미지 · DB · 알고리즘

- 날짜: 2026-07-26
- 상태: **계획(로직+문서) · 코드 미착수** · DB 전략 확정(**D1 단독**, 2026-07-26)
- 대상: Express(Node) + Supabase Postgres + 로컬 파일 서빙 → Cloudflare 엣지

## 0. 현재 아키텍처의 사실 (측정값)

| 항목 | 현재 |
|---|---|
| API | Express(Node) `server/routes.ts` ~900줄 · `/api/*` |
| 정적 | `dist/public` (Vite 빌드) + `/photos` (express.static) |
| 사진 | **429장 / 41MB** (팀 드라이브 인제스천, 로컬 파일) |
| DB | Supabase Postgres (drizzle + `postgres` 드라이버) · RLS 사용 |
| 외부 | Supabase Edge Functions(Deno): places-search / place-details / directions |
| **엔진 상태** | **전부 프로세스 인메모리 Map 7종** (아래) |

**인메모리 상태 7종** — 이게 마이그레이션의 핵심 난제다:

| 저장소 | 위치 | 스코프 | 쓰기 빈도 |
|---|---|---|---|
| `taste.store` (θ 사후분포 A·b) | taste.ts:18 | **유저별** | 스와이프마다 |
| `exposure.store` (노출 피로) | exposure.ts:14 | **유저별** | 노출마다 |
| `satiation.store` (재소비) | satiation.ts:15 | **유저별** | 우승마다 |
| `chain.lastStop` (직전 스톱) | chain.ts:11 | **유저별** | 우승마다 |
| `chain.chainCount` (전이 카운트) | chain.ts:10 | **전역** | 우승마다 |
| `featureStore` (식당 피처 118곳) | features.ts:65 | **전역·읽기전용** | 배포 시 1회 |
| `memSessions` (그룹 세션·투표) | routes.ts:108 | **세션별** | 투표마다 |
| `memEvents` (rec_events 버퍼) | events.ts:18 | 전역·append | 이벤트마다 |

→ **Workers는 무상태·짧은 수명**이라 이 Map들이 그대로는 못 간다. 이게 계획의 중심이다.

## 1. 왜 Cloudflare인가 (얻는 것)

- **엣지 지연**: 멜버른 사용자 ↔ 엣지. 현재 단일 Node 프로세스 대비 응답 개선.
- **이미지 비용/성능**: R2는 **egress 무료** + Images 변환으로 해상도별 원본 관리 불필요.
- **상태 정합성**: 그룹 결정(투표·정족수)이 지금은 한 프로세스 메모리라 **재시작 시 소실·수평확장 불가**.
  Durable Objects로 옮기면 오히려 **지금보다 정확**해진다. (마이그레이션이 곧 버그 수정)
- **운영 단순화**: 서버 상시 기동 불필요.

## 2. 매핑 (현재 → Cloudflare)

| 현재 | Cloudflare | 비고 |
|---|---|---|
| Vite `dist/public` | **Workers Assets** (또는 Pages) | 정적 자산 |
| Express `/api/*` | **Workers + Hono** | Express는 Workers 미지원 → Hono로 포팅 |
| `/photos` express.static | **R2** + Images 변환 | 41MB → R2 무료 티어(10GB) 내 |
| Supabase Postgres | **D1** (확정) | Hyperdrive 불필요 — 접착제 하나 제거 |
| 유저별 엔진 상태 | **Durable Object (User DO)** | 스와이프마다 read-modify-write |
| 그룹 세션 | **Durable Object (Session DO)** | 투표·정족수 조율 |
| 전역 chain 전이 | **D1 집계 테이블** (+DO 캐시) | 쓰기 저빈도·읽기 다빈도 |
| `featureStore` | **Worker 번들 JSON** 또는 KV | 118행·읽기전용 |
| `memEvents` → rec_events | **Queues → D1 배치 insert** | 이벤트 폭주 흡수 |
| Supabase Edge Functions | 유지 또는 Worker로 흡수 | Google 서버 키 보관 위치 유지 |

## 3. 세 가지 난제와 해법

### 3-1. 이미지
- **R2 버킷** `lunchie-photos`에 `photos/<restaurant_id>/<hash>.jpg` 업로드(429장).
- 서빙: Worker 라우트 `/photos/*` → R2 get → `Cache-Control: public, max-age=31536000, immutable`.
  파일명이 콘텐츠 해시라 immutable 안전.
- 변환: **Cloudflare Images**(또는 `cf.image` resize)로 카드용 512 / 상세용 1400 **온디맨드 생성**.
  → 현재처럼 해상도별 사본을 미리 만들 필요가 없어진다.
- 인제스천 파이프라인은 그대로 두고, 산출물만 R2에 올린다(`scripts/uploadPhotosR2.ts` 신설).

### 3-2. 데이터베이스 — **D1 단독 (확정)**

**왜 D1 단독인가.** 실측 결과 RLS로 보호되는 표면이 작다:

| 테이블 | 보호 내용 | D1 이관 |
|---|---|---|
| `courses` | `author_id = auth.uid()` (select/modify) | 가드 모듈로 이관 (검사 2) |
| `course_items` | 부모 코스 소유권 (select/modify) | 가드 모듈로 이관 (검사 2) |
| `follows` | RPC + 자기팔로우 가드 | 앱 코드로 이관 |
| restaurants · photos · menu_items · features | **`USING (true)` 공개 읽기** | 그대로 — 잃을 것 없음 |

→ 옮겨야 할 인가 검사가 **4~5개**뿐이다. 이 규모에 하이브리드(두 DB)의 운영 복잡도와
조인 불가 문제를 감수할 이유가 없다.

**얻는 것**: DB 하나 · 완전 엣지 · Hyperdrive 불필요 · 최저 비용 · 운영 단순.

**대가와 조건**:
- Postgres → SQLite 마이그레이션 재작성 (`jsonb`→`text`, `timestamptz`→`integer`, 트리거/RPC → 앱 코드).
- **RLS가 사라지므로 인가를 코드가 책임진다.** 조건: **단일 가드 모듈**(`server/auth/guard.ts` 상당)에
  모으고, 각 검사마다 "소유자 아님 → 거부" 테스트를 붙인다. 라우트에 검사 로직을 흩뿌리지 않는다.
- **인증은 Supabase Auth를 계속 쓴다.** Worker가 JWT만 검증하면 되므로 D1 이관이 인증 교체를 뜻하지 않는다.

### 3-3. 알고리즘(엔진) — 여기가 본체

**원칙: 상태의 스코프대로 배치한다.**

```
User DO  (id = user_id)         ← 스와이프마다 read-modify-write
  · taste θ (A 행렬·b 벡터)      · exposure 카운터
  · satiation 이력               · chain lastStop
  → 한 유저의 요청은 항상 같은 DO로 → 강한 일관성, 락 불필요
  → DO storage에 영속 + 인메모리 캐시(현재 Map과 동일한 접근 패턴 유지)

Session DO (id = share_token)   ← 그룹 결정 조율
  · members · swipes(round별) · 결승 투표 · phase 상태기계(decideGroup)
  → 지금 memSessions가 하던 일을 durable하게. 재시작에도 세션 유지.
  → 투표 동시성(멤버당 1표 dedup)이 DO 단일 스레드로 자연 해결

Worker (무상태)                  ← 스코어링·슬레이트
  · featureStore(번들 JSON) 읽기 · buildSlate 계산
  · User DO에서 θ 가져와 tasteFit, Session DO에서 그룹 상태 조회

D1 / Queues
  · rec_events append (Queues 배치) · chain 전역 전이 집계 · 오프라인 학습 입력
```

**핵심 이점**: 현재 `decideGroup`의 그룹 투표는 **프로세스 메모리**라 재시작 시 날아가고
인스턴스가 늘면 갈라진다. Session DO는 그 두 문제를 **설계상** 없앤다.

**주의**: 순수 로직(`scorer.ts`·`taste.ts` 수학·`group.ts` 상태기계)은 **그대로 재사용**한다.
바뀌는 건 "상태를 어디서 읽고 어디에 쓰나"뿐. 단위 테스트 339건도 그대로 유효.

**오프라인 학습**: 무거운 학습은 Workers에 부적합. **Cron Trigger가 D1의 rec_events를 읽어
집계/경량 갱신**만 하고, 정밀 학습(Python)은 외부(예: R2에 스냅샷 → 로컬/배치)에서 수행해
결과 피처를 R2/D1로 되돌린다.

## 4. 결정 필요 3건

| # | 결정 | 결론 |
|---|---|---|
| A | DB | **D1 단독** (확정) — 보호 표면 4~5검사뿐이라 하이브리드 복잡도 불필요 |
| B | 정적 호스팅 | **Workers Assets** (API와 한 Worker, 라우팅 단순) |
| C | Supabase Edge Functions | **유지** (Google 서버 키 보관처 — 키 원칙 유지) |
| D | 인증 | **Supabase Auth 유지** — Worker에서 JWT 검증. D1 이관과 무관 |

**프레임워크: Hono** — Express는 Node `http`에 의존해 Workers에서 실행 불가.
Hono는 **MIT 오픈소스이며 무료**다(Cloudflare 제품은 아니지만 공식 템플릿·문서가 채택,
Workers 지원 일급). 선택 이유: 라우트 19개 · Express 고유 API 71곳(`res.status` 34 ·
`res.json` 17 · `req.body/params/query` 20)이 **거의 1:1로 대응**해 diff가 최소.
게다가 **Node에서도 동작**하므로 이관 중 양쪽 동시 운영·비교 검증·롤백이 가능하다.

## 5. 단계 (각 단계가 독립 배포 가능)

```
Phase 0  준비        wrangler 셋업 · R2/D1/DO 바인딩 정의 · CI 초안 (코드 변경 0)
Phase 1  이미지      429장 R2 업로드 · Worker /photos 라우트 · Images 변환
                     → 앱은 그대로, URL만 교체. 롤백 쉬움. **가장 안전한 첫 단계**
Phase 2  읽기 API    Hono 포팅 중 GET 계열(restaurants/courses/journey)만 먼저
                     featureStore 번들 · 카탈로그 D1 이관(공개 읽기라 인가 무관 = 안전)
Phase 3  엔진 상태   User DO(taste·exposure·satiation·chain lastStop)
                     rec_events → Queues → D1
Phase 4  그룹 결정   Session DO (memSessions·decideGroup 이관) — 정합성 개선 지점
Phase 5  쓰기+인가   courses/course_items/follows D1 이관 + 단일 가드 모듈 + 인가 테스트
Phase 6  정리        Node 서버 제거 · Workers Assets로 클라 서빙 · Cron 집계
```

## 6. 비용 (개략)

| 항목 | 무료 티어 | 예상 |
|---|---|---|
| Workers | 10만 req/일 | 프로토타입 무료, 이후 $5/mo |
| Hono | — | **무료** (MIT 오픈소스 라이브러리) |
| R2 | 10GB 저장 + **egress 무료** | 41MB → 무료 |
| D1 | 5GB · 2500만 행 읽기/일 | 무료 |
| Durable Objects | 유료 플랜 포함 | $5/mo 내 |
| Images | 변환 건당 과금 | 캐시 적중률 높아 소액 |

## 7. 위험 · 미해결

- **Express → Hono 포팅량**: routes.ts ~900줄. 기계적이지만 회귀 위험 → Phase 2/3로 쪼개 이관.
- **`postgres`/`drizzle-orm(postgres-js)` 드라이버는 Workers 미지원** → drizzle D1 드라이버로 교체.
- **DO 비용/지연**: 유저마다 DO 1개. 콜드스타트·요금 실측 후 판단(스와이프 지연 목표 <100ms).
- **RLS 상실 (D1 단독의 유일한 실질 리스크)**: 인가가 DB에서 코드로 내려온다.
  완화: 단일 가드 모듈 + 검사별 거부 테스트. 표면이 4~5개로 작아 통제 가능하다고 판단.
  (초안에서는 이 위험을 과대평가해 하이브리드를 권고했으나, 실측 후 D1 단독으로 정정.)
- **오프라인 Python 학습의 자리**: Cloudflare에 상주 불가. 외부 배치 + R2 교환으로 유지.
- **좌표 미확보 38곳**: 마이그레이션과 무관하나, 거리 기반 엣지 쿼리를 하려면 선결.

## 8. 다음

결정 3건(§4)을 확정하면 Phase 0 설계를 별도 스펙으로 쪼개고, Phase 1(이미지)부터 착수한다.
로직·문서가 확정되기 전에는 코드를 건드리지 않는다.
