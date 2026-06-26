# 하루 여정 모드 — Phase 1 설계 스펙

- 날짜: 2026-06-26
- 상태: 설계 합의 완료, 구현 전
- 동반 자료: [lunchie_journey_flow.pdf](../../engine/lunchie_journey_flow.pdf) (그림 1 유저 플로우 · 그림 2 시스템 워크플로우)

## 1. 개요 / 목표

Lunchie를 "한 끼 결정"에서 "하루 여정"으로 확장한다. 실제 사용자 행동은
점심을 정하고 → 가서 먹고 → **앱을 다시 켰을 때** 비로소 "아 커피?"가 떠오르는
식으로 흐른다. Phase 1은 이 루프가 끝에서 끝까지 도는 최소 단위를 만든다.

핵심 설계 원칙(합의됨):
- **우승화면 = 씨앗**: 다음 스톱을 강요하지 않고 "이런 것도 있다"는 인지만 심는다. 결정 흐름을 거기서 완성하지 않는다.
- **홈 = 실제 재진입·결정 지점**: 재진입 시 홈의 "오늘의 여정"에서 실제 다음 결정이 일어난다.
- **명시적 '끝'은 없다**: chain 엔진의 6시간 occasion 윈도우(`prevStop`)가 사슬을 자연 종료시킨다.
- **Push 없음 (pull)**: 알림으로 끌어내지 않는다. 유저가 스스로 앱을 다시 켠다.

신규 코드는 최소다. 엔진(chain 사슬: `recordStop`/`chainFit`/`prevStop`)은 이미
구현돼 있고 지금은 대시보드에만 노출된다. Phase 1은 그것을 표면 UI 2곳으로
끌어올리고 `intent` 한 필드를 추가한다.

## 2. 범위

### In (Phase 1)
1. **`intent` 필드** (밥/카페/디저트) + 인텐트→카테고리군 필터 (recommend)
2. **우승화면 "씨앗"** — 결정 직후 다음 스톱 인지 (결정 아님, '끝' 버튼 없음)
3. **홈 "오늘의 여정"** — 오늘의 스톱 타임라인 + 열린 사슬이면 다음-스톱 제안 (실제 재진입 결정 지점)

### Out (이후 단계)
- 전용 "여정" 탭 · 음식일기(여러 날) · 코스 저장/공유 → **Phase 2**
- 놀거리 일급 인텐트 · 그룹 사슬 분리 학습 · 재방문 알림 → **Phase 3**

## 3. 유저 플로우 (확정)

```
세션 1 (점심):  설정(intent=밥) → 예선 → 결승 → 우래옥 결정
                 → 우승화면: "씨앗"(다 드시고 커피·디저트도 근처에 — 인지만)
                 → 앱 닫음, 가서 식사
세션 2 (재진입): 앱 다시 켬 → 홈 "오늘의 여정"(우래옥 + "다음은 커피?")
                 → 탭 → 카페 intent로 결정 → 블루보틀
                 → 반복 (디저트·저녁)
종료:            마지막 스톱 후 6시간 → prevStop=null → 사슬 자동 종료
```

## 4. 데이터 모델

스톱 1개 = 결정 1개. 대부분 이미 수집된다.

| 필드 | 출처 | 상태 |
|---|---|---|
| 장소·카테고리 | `WINNER` 이벤트 | 있음 |
| 시간 | 이벤트 ts | 있음 |
| 만족 | `SURVEY`(POS/NEU/NEG) · restaurant_id 조인 | 있음 |
| 동행 | session group_size / `RecContext.companions` | 있음 |
| **intent** (밥/카페/디저트) | — | **신규** |

- `intent`를 `RecContext`에 추가: `intent?: "meal" | "cafe" | "dessert"` (`shared/engine.ts`, `companions` 옆).
- recommend 시점의 ctx에 실려 `rec_events`/`memEvents`의 이벤트 context로 저장됨 → 스톱이 자기 intent를 안다.
- **음식일기 테이블은 만들지 않는다.** 일기/타임라인은 `WINNER`(+`SURVEY`) 위의 뷰다.

### intent → 카테고리군 매핑 (신규 상수)
실제 카테고리(`AppContext.tsx` 데이터 기준):
- `meal`(밥): 한식·중식·일식·이탈리안·스테이크·베트남·버거·멕시칸·레스토랑·브런치·샐러드·비건
- `cafe`(카페): 카페·전통찻집
- `dessert`(디저트): 베이커리 (데이터에 '디저트' 카테고리 추가 시 확장)
- *(놀거리: 복합문화공간·공원 — Phase 3)*

`server/engine/` 에 매핑 모듈(예: `intent.ts`)을 두고 server/client 공용 상수로 노출.

## 5. 컴포넌트 (각각: 무엇 · 인터페이스 · 의존)

### 5.1 intent 캡처 + recommend 필터
- **무엇**: 결정 시작 시 intent 결정 → recommend 후보를 그 intent의 카테고리군으로 제한.
- **인터페이스**:
  - 첫 스톱 intent = 시간대 기본 추론(점심시간→`meal`) — Phase 1은 자동값으로 충분. (명시 토글은 선택, 후속.)
  - 다음 스톱 intent = **홈 "오늘의 여정" 다음-스톱 제안의 선택값**. (우승화면 씨앗은 인지만 — 결정 시작 아님.)
  - `POST /api/recommend` body.context 에 `intent` 추가 → `buildSlate(filtered, ctx)` **앞에서** intent 카테고리군으로 후보 풀 하드 필터.
- **의존**: `intent.ts` 매핑, 기존 recommend 라우트/`buildSlate`.

### 5.2 우승화면 씨앗 (next-stop seed)
- **무엇**: WINNER 직후 "다 드시고 나서 ☕·🍰도 근처에" 수준의 가벼운 인지 카드. 결정 흐름 없음, '끝' 버튼 없음.
- **인터페이스**: `WinnerScreen`(`LunchieSwipePage.tsx`)에 표시. `chainFit(직전 카테고리)` 상위 1~2 인텐트를 텍스트로 안내(밥 먹었으면 커피 먼저). 노출 시 `IMPRESSION`(context.surface="winner_seed") 로깅 — 학습/측정용.
- **의존**: `chain.ts` `chainFit`/`prevStop`, intent 매핑.

### 5.3 홈 "오늘의 여정" 타임라인 + 다음-스톱 제안
- **무엇**: 오늘 00시 이후 스톱을 세로 타임라인으로. 6시간 윈도우 안에 사슬이 열려 있으면 점선 "다음은 ☕?" 제안. 탭 → 그 intent로 결정 시작.
- **인터페이스**:
  - `HomePage.tsx` 상단(Header 아래)에 `TodayJourneyCard`.
  - 신규 `GET /api/journey/today?userId=` → `{ stops: Stop[], nextSuggestion: { intent, restaurant, reason } | null }`.
  - `stops`: 오늘의 WINNER (+SURVEY 만족 조인), 시간 오름차순.
  - `nextSuggestion`: `prevStop(userId)` 가 non-null(6h 내)일 때만. 직전 카테고리 → `chainFit` 상위 카테고리 → intent 역매핑 → 그 intent로 recommend top-1.
  - 오늘 스톱 0개 → 카드 숨김. 사슬 만료 → 스톱만 표시, 제안 없음.
- **의존**: 신규 `journey/today` 라우트, `events.ts` 조회 헬퍼, `chain.ts`, recommend.

## 6. API / 엔드포인트

| 변경 | 내용 |
|---|---|
| `POST /api/recommend` (수정) | body.context 에 `intent` 허용 → intent 카테고리군으로 후보 풀 필터 |
| `GET /api/journey/today` (신규) | `?userId=` → 오늘 스톱 + (열린 사슬이면) 다음-스톱 제안 |

`events.ts` 에 조회 헬퍼 신규: `todayStops(userId)` — `memEvents` 에서 `WINNER`(오늘·해당 유저) 필터 + `SURVEY` 만족 조인. (DB 방화벽 환경에서도 `memEvents` 폴백 일관 동작.)

## 7. 이벤트 (로깅)
- 변경 없음에 가깝다. `WINNER`(스톱), `SURVEY`(만족), `IMPRESSION`(씨앗·제안 노출, context.surface 구분)을 재사용.
- 모든 WINNER context 에 `intent` 포함 → 인텐트별 분석 + chain 학습 신호 강화.

## 8. 엣지 케이스 / 에러 처리
- **오늘 스톱 0개**: 홈 카드 숨김(빈 상태 노출 안 함).
- **사슬 만료(>6h)**: 타임라인은 자정까지 표시, `nextSuggestion=null`.
- **그룹 세션**: Phase 1 여정은 로그인 프로필 기준(개인). 그룹 사슬 분리는 Phase 3.
- **DB 방화벽/Mock 폴백**: `journey/today` 는 `memEvents` 만 사용(기존 패턴과 동일). 서버 재시작 시 인메모리 버퍼 리셋은 기존과 동일한 한계.
- **intent 후보 없음**(그 카테고리군에 식당 0): 필터를 완화(전체 풀)하고 로그 남김 — 빈 슬레이트 방지.
- **재결정/REROLL**: WINNER 만 스톱. REROLL/중간 스와이프는 스톱 아님.

## 9. 테스트 전략
- **단위**: intent→카테고리 필터(밥 intent에 카페 후보 제외) · `chainFit` 기반 다음-스톱 정렬.
- **API**: `recommend` intent 필터 동작 · `journey/today` 가 오늘 스톱 + 제안 반환(사슬 열림/만료 두 경우).
- **브라우저 e2e**: 점심 결정 → 우승화면 씨앗 노출 → 홈 "오늘의 여정"에 스톱 누적 → 다음-스톱 제안 → 카페 intent로 결정 → 타임라인 갱신. (firewalled 환경이라 memEvents 기반.)

## 10. Phase 경계 (참고)
- **Phase 1 (이 스펙)**: intent + 우승화면 씨앗 + 홈 오늘의 여정.
- **Phase 2**: 전용 여정 탭 — 음식일기(여러 날) + 오늘을 Course 로 저장/공유(`Course` 타입 재사용).
- **Phase 3**: 놀거리 일급 인텐트 + 그룹 사슬 분리 학습 + (선택) 재방문 알림.
