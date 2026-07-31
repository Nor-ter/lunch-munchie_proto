# Cloudflare 마이그레이션 계획 — 이미지 · DB · 알고리즘

- 날짜: 2026-07-26
- 상태: **계획(로직+문서) · 코드 미착수 · 결정 필요 3건**
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
| Supabase Postgres | **Hyperdrive → Supabase** (권장) 또는 D1 | §4 결정 |
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

### 3-2. 데이터베이스 — **결정 필요 (§4-A)**

**옵션 A: Supabase 유지 + Hyperdrive (권장)**
- Workers → Hyperdrive → Supabase Postgres. 연결 풀링·쿼리 캐시.
- **장점**: RLS·Supabase Auth·기존 마이그레이션·drizzle 스키마 **그대로**. 이관 리스크 최소.
- **단점**: Cloudflare 밖 왕복이 남음(엣지 이점 일부 상실). Hyperdrive 유료 플랜 필요.

**옵션 B: D1 전면 이관**
- **장점**: 완전 엣지, 비용 저렴, drizzle이 D1 지원.
- **단점**: **RLS 없음** → 지금 DB가 강제하던 접근 제어를 전부 Worker 코드로 옮겨야 함(보안 회귀 위험).
  Supabase Auth와의 연계 재설계. 마이그레이션 SQL 재작성(Postgres → SQLite 방언).

**하이브리드(현실적 절충)**: 트랜잭션·인증이 걸린 것(users/courses/sessions)은 **A**,
읽기 다빈도 파생 데이터(식당 카탈로그·피처·chain 집계·rec_events)는 **D1**.
→ 엣지 이점은 읽기 경로에서 얻고, 보안 경계는 건드리지 않는다.

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

| # | 결정 | 선택지 | 제안 |
|---|---|---|---|
| A | DB | Supabase+Hyperdrive / D1 전면 / 하이브리드 | **하이브리드** (보안 경계 유지 + 읽기 엣지화) |
| B | 정적 호스팅 | Workers Assets / Pages | **Workers Assets** (API와 한 Worker, 라우팅 단순) |
| C | Supabase Edge Functions | 유지 / Worker 흡수 | **유지** (Google 서버 키 보관처 변경은 별건, 키 원칙 유지) |

## 5. 단계 (각 단계가 독립 배포 가능)

```
Phase 0  준비        wrangler 셋업 · R2/D1/DO 바인딩 정의 · CI 초안 (코드 변경 0)
Phase 1  이미지      429장 R2 업로드 · Worker /photos 라우트 · Images 변환
                     → 앱은 그대로, URL만 교체. 롤백 쉬움. **가장 안전한 첫 단계**
Phase 2  읽기 API    Hono 포팅 중 GET 계열(restaurants/courses/journey)만 먼저
                     featureStore 번들 · 카탈로그 D1 → 엣지 읽기
Phase 3  엔진 상태   User DO(taste·exposure·satiation·chain lastStop)
                     rec_events → Queues → D1
Phase 4  그룹 결정   Session DO (memSessions·decideGroup 이관) — 정합성 개선 지점
Phase 5  정리        Node 서버 제거 · Workers Assets로 클라 서빙 · Cron 집계
```

## 6. 비용 (개략)

| 항목 | 무료 티어 | 예상 |
|---|---|---|
| Workers | 10만 req/일 | 프로토타입 무료, 이후 $5/mo |
| R2 | 10GB 저장 + **egress 무료** | 41MB → 무료 |
| D1 | 5GB · 2500만 행 읽기/일 | 무료 |
| Durable Objects | 유료 플랜 포함 | $5/mo 내 |
| Hyperdrive | 유료 플랜 | 옵션 A 선택 시 |
| Images | 변환 건당 과금 | 캐시 적중률 높아 소액 |

## 7. 위험 · 미해결

- **Express → Hono 포팅량**: routes.ts ~900줄. 기계적이지만 회귀 위험 → Phase 2/3로 쪼개 이관.
- **`postgres`/`drizzle-orm(postgres-js)` 드라이버는 Workers 미지원** → Hyperdrive 또는 D1 드라이버로 교체 필요.
- **DO 비용/지연**: 유저마다 DO 1개. 콜드스타트·요금 실측 후 판단(스와이프 지연 목표 <100ms).
- **RLS 상실 위험(옵션 B)**: D1엔 RLS가 없다. 권한 검사를 코드로 옮기면 **보안 회귀**가 생기기 쉽다.
  → 이것이 하이브리드를 제안하는 주된 이유.
- **오프라인 Python 학습의 자리**: Cloudflare에 상주 불가. 외부 배치 + R2 교환으로 유지.
- **좌표 미확보 38곳**: 마이그레이션과 무관하나, 거리 기반 엣지 쿼리를 하려면 선결.

## 8. 다음

결정 3건(§4)을 확정하면 Phase 0 설계를 별도 스펙으로 쪼개고, Phase 1(이미지)부터 착수한다.
로직·문서가 확정되기 전에는 코드를 건드리지 않는다.
