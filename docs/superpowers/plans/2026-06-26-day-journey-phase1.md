# 하루 여정 모드 Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 점심 결정 후 앱을 다시 켰을 때 홈 "오늘의 여정"에서 다음 스톱(커피/디저트)을 이어서 정하는 하루 여정 루프의 최소 단위를 만든다.

**Architecture:** 결정(WINNER)은 이미 chain 엔진(`recordStop`/`chainFit`/`prevStop`)을 학습시킨다. Phase 1은 ① `intent`(밥/카페/디저트) 한 필드로 추천을 거르고, ② 이미 있는 chain 엔진을 표면 UI 2곳(우승화면 씨앗 · 홈 오늘의 여정)으로 끌어올린다. 음식일기는 새 테이블이 아니라 `WINNER`(+`SURVEY`) 이벤트 위의 뷰다.

**Tech Stack:** Express + TypeScript(ESM/NodeNext) 서버, React + Vite + wouter 클라이언트, Vitest(순수 로직), 통합 검증은 `tsc --noEmit` + `vite build` + curl + 프리뷰 브라우저(이 저장소의 기존 검증 방식).

**Spec:** [docs/superpowers/specs/2026-06-26-day-journey-phase1-design.md](../specs/2026-06-26-day-journey-phase1-design.md)

---

## File Structure

| File | 책임 | 신규/수정 |
|---|---|---|
| `shared/intent.ts` | 인텐트↔카테고리 매핑, 시간대 기본 인텐트 (server·client 공용) | 신규 |
| `shared/intent.test.ts` | 매핑 순수 로직 테스트 | 신규 |
| `shared/engine.ts` | `RecContext`에 `intent` 필드 추가 | 수정 |
| `server/routes.ts` | recommend 인텐트 필터 · `GET /api/journey/today` | 수정 |
| `server/engine/events.ts` | `selectTodayStops`(순수) + `todayStops`(memEvents 래퍼) | 수정 |
| `server/engine/events.test.ts` | `selectTodayStops` 테스트 | 신규 |
| `client/src/pages/LunchieSwipePage.tsx` | 우승화면 씨앗 + WINNER context에 intent | 수정 |
| `client/src/pages/HomePage.tsx` | `TodayJourneyCard` (오늘의 여정 타임라인 + 다음-스톱 제안) | 수정 |
| `client/src/contexts/AppContext.tsx` | `buildDeck` recommend context에 intent(시간 기본) | 수정 |
| `package.json` | `"test": "vitest run"` 스크립트 | 수정 |

---

## Task 0: Vitest 스크립트 추가

**Files:**
- Modify: `package.json` (scripts)

- [ ] **Step 1: test 스크립트 추가**

`package.json`의 `"scripts"`에 `"check"` 줄 아래로 추가:

```json
    "test": "vitest run",
```

- [ ] **Step 2: 동작 확인 (아직 테스트 없음 = 통과)**

Run: `npx vitest run`
Expected: "No test files found" 또는 0 failures로 종료(에러 아님). Vitest는 이미 devDependency라 설치 불필요.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore(lunchie): vitest run 스크립트 추가 (순수 로직 테스트용)"
```

---

## Task 1: 인텐트↔카테고리 매핑 모듈

**Files:**
- Create: `shared/intent.ts`
- Test: `shared/intent.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`shared/intent.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { categoriesForIntent, intentForCategory, intentForHour } from "./intent";

describe("intent ↔ category 매핑", () => {
  it("cafe 인텐트는 카페를 포함하고 한식을 제외한다", () => {
    expect(categoriesForIntent("cafe")).toContain("카페");
    expect(categoriesForIntent("cafe")).not.toContain("한식");
  });
  it("카테고리 → 인텐트 역매핑", () => {
    expect(intentForCategory("베이커리")).toBe("dessert");
    expect(intentForCategory("한식")).toBe("meal");
    expect(intentForCategory("공원")).toBeNull(); // 놀거리=Phase 3
  });
  it("시간대 기본 인텐트: 점심=밥, 오후=카페", () => {
    expect(intentForHour(12)).toBe("meal");
    expect(intentForHour(15)).toBe("cafe");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run shared/intent.test.ts`
Expected: FAIL — "Failed to resolve import './intent'" (모듈 없음)

- [ ] **Step 3: 구현 작성**

`shared/intent.ts`:

```ts
// 인텐트(밥/카페/디저트) ↔ 카테고리 매핑. server·client 공용.
// 놀거리(복합문화공간·공원)는 Phase 3에서 일급 인텐트로 추가.
export type Intent = "meal" | "cafe" | "dessert";

export const INTENT_CATEGORIES: Record<Intent, string[]> = {
  meal: ["한식", "중식", "일식", "이탈리안", "스테이크", "베트남", "버거", "멕시칸", "레스토랑", "브런치", "샐러드", "비건"],
  cafe: ["카페", "전통찻집"],
  dessert: ["베이커리"],
};

export function categoriesForIntent(intent: Intent): string[] {
  return INTENT_CATEGORIES[intent] ?? [];
}

export function intentForCategory(category: string | null | undefined): Intent | null {
  if (!category) return null;
  for (const k of Object.keys(INTENT_CATEGORIES) as Intent[]) {
    if (INTENT_CATEGORIES[k].includes(category)) return k;
  }
  return null;
}

// 시간대 → 첫 스톱 기본 인텐트. 14~17시는 카페, 그 외는 밥(점심·저녁).
export function intentForHour(hour: number): Intent {
  if (hour >= 14 && hour < 17) return "cafe";
  return "meal";
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run shared/intent.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add shared/intent.ts shared/intent.test.ts
git commit -m "feat(lunchie): 인텐트↔카테고리 매핑 모듈 (밥/카페/디저트)"
```

---

## Task 2: RecContext에 intent 필드

**Files:**
- Modify: `shared/engine.ts` (RecContext 인터페이스, line ~20-30)

- [ ] **Step 1: import + 필드 추가**

`shared/engine.ts` 상단 import 구역에 추가:

```ts
import type { Intent } from "./intent.js";
```

`RecContext` 인터페이스의 `companions?` 줄 아래에 추가:

```ts
  intent?: Intent; // 하루 여정: 밥/카페/디저트 — recommend 카테고리 필터
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 3: Commit**

```bash
git add shared/engine.ts
git commit -m "feat(lunchie): RecContext에 intent 필드 추가"
```

---

## Task 3: recommend 인텐트 필터

**Files:**
- Modify: `server/routes.ts` (import 구역; `/recommend` 핸들러 diet 필터 직후, line ~602)

- [ ] **Step 1: import 추가**

`server/routes.ts`의 shared import 근처(line ~15-16)에 추가:

```ts
import { categoriesForIntent } from "../shared/intent.js";
```

- [ ] **Step 2: 인텐트 필터 삽입**

`/recommend` 핸들러에서 diet 필터 블록(`if (reqDiet.length) { ... }`)이 끝난 직후, `const now = Date.now();` 앞에 삽입:

```ts
  // 인텐트(밥/카페/디저트) 필터: 후보를 해당 카테고리군으로 제한. 모두 걸러지면 완화.
  let intent_relaxed = false;
  if (ctx.intent) {
    const cats = new Set(categoriesForIntent(ctx.intent));
    const byIntent = filtered.filter((c) => c.category != null && cats.has(c.category));
    if (byIntent.length) filtered = byIntent;
    else intent_relaxed = true;
  }
```

- [ ] **Step 3: 응답에 관측 필드 추가**

같은 핸들러 마지막 `res.json({ ... })`에서 `diet_relaxed` 옆에 `intent_relaxed` 추가:

```ts
  res.json({ slate, slate_id, slate_type, model_version: mv, variant, diet_relaxed, intent_relaxed });
```

- [ ] **Step 4: 타입체크 + 빌드**

Run: `npx tsc --noEmit && npx vite build >/dev/null && echo OK`
Expected: `OK`

- [ ] **Step 5: 서버 재기동 후 curl 검증**

먼저 `MOCK_RESTAURANTS`(`client/src/contexts/AppContext.tsx`)에서 카페 id 하나(예: 전통찻집 `r7`)와 밥 id 하나(한식/일식 등)를 고른다. dev 서버가 떠 있다고 가정(`npm run dev` 또는 프리뷰). 두 id를 `candidate_ids`로 보내고 intent=cafe면 카페 후보만 남아야 한다:

```bash
curl -s -X POST localhost:3000/api/recommend -H 'Content-Type: application/json' \
  -d '{"candidate_ids":["<CAFE_ID>","<MEAL_ID>"],"context":{"intent":"cafe"},"k":7,"user_id":"t1"}' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log('ids:',j.slate.map(s=>s.id),'relaxed:',j.intent_relaxed)})"
```

Expected: `ids: [ '<CAFE_ID>' ] relaxed: false` (밥 id는 빠짐). intent 없이 같은 요청 시 두 id 모두 나오면 대조 통과.

- [ ] **Step 6: Commit**

```bash
git add server/routes.ts
git commit -m "feat(lunchie): recommend 인텐트 카테고리 필터"
```

---

## Task 4: 오늘의 스톱 추출 (selectTodayStops + todayStops)

**Files:**
- Modify: `server/engine/events.ts` (말미에 export 추가)
- Test: `server/engine/events.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`server/engine/events.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { selectTodayStops } from "./events";

const now = new Date("2026-06-26T13:00:00").getTime();
const cat = (id: string) => ({ r1: "한식", r7: "전통찻집" } as Record<string, string>)[id] ?? null;

describe("selectTodayStops", () => {
  it("오늘·해당 유저의 WINNER만, 시간순으로, SURVEY 만족 조인", () => {
    const events = [
      { event_type: "WINNER", user_id: "u1", restaurant_id: "r1", created_at: new Date("2026-06-26T12:30:00") },
      { event_type: "WINNER", user_id: "u1", restaurant_id: "r7", created_at: new Date("2026-06-26T12:00:00") },
      { event_type: "SURVEY", user_id: "u1", restaurant_id: "r1", action: "POS" },
      { event_type: "WINNER", user_id: "u2", restaurant_id: "r1", created_at: new Date("2026-06-26T12:30:00") }, // 다른 유저
      { event_type: "WINNER", user_id: "u1", restaurant_id: "r1", created_at: new Date("2026-06-25T12:30:00") }, // 어제
    ];
    const stops = selectTodayStops(events, "u1", now, cat);
    expect(stops.map((s) => s.restaurant_id)).toEqual(["r7", "r1"]); // 시간순
    expect(stops[1].category).toBe("한식");
    expect(stops[1].satisfaction).toBe("POS");
    expect(stops[0].satisfaction).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run server/engine/events.test.ts`
Expected: FAIL — "selectTodayStops is not a function" / import 실패

- [ ] **Step 3: 구현 추가**

`server/engine/events.ts` 맨 아래에 추가 (`memEvents`, `getItemFeatures`는 이미 이 파일에 있음):

```ts
export interface JourneyStop {
  restaurant_id: string;
  category: string | null;
  intent: string | null;
  at: number;
  satisfaction: "POS" | "NEU" | "NEG" | null;
}

// 순수 함수: 이벤트 배열에서 오늘·해당 유저의 WINNER 스톱을 시간순 추출 (+SURVEY 만족 조인).
export function selectTodayStops(
  events: Array<Record<string, unknown>>,
  userId: string,
  now: number,
  getCategory: (id: string) => string | null,
): JourneyStop[] {
  const d = new Date(now); d.setHours(0, 0, 0, 0);
  const t0 = d.getTime();
  const sat = new Map<string, "POS" | "NEU" | "NEG">();
  for (const e of events) {
    if (e.event_type === "SURVEY" && e.user_id === userId && e.restaurant_id) {
      const a = e.action as string;
      if (a === "POS" || a === "NEU" || a === "NEG") sat.set(String(e.restaurant_id), a);
    }
  }
  const stops: JourneyStop[] = [];
  for (const e of events) {
    if (e.event_type !== "WINNER" || e.user_id !== userId || !e.restaurant_id) continue;
    const ca = e.created_at;
    const at = ca instanceof Date ? ca.getTime() : Number(ca) || now;
    if (at < t0) continue;
    const rid = String(e.restaurant_id);
    const ctx = (e.context ?? null) as { intent?: string } | null;
    stops.push({ restaurant_id: rid, category: getCategory(rid), intent: ctx?.intent ?? null, at, satisfaction: sat.get(rid) ?? null });
  }
  return stops.sort((a, b) => a.at - b.at);
}

// memEvents 래퍼: 카테고리는 피처 스토어에서 해석.
export function todayStops(userId: string, now = Date.now()): JourneyStop[] {
  return selectTodayStops(
    memEvents as Array<Record<string, unknown>>,
    userId,
    now,
    (id) => getItemFeatures(id)?.category ?? null,
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run server/engine/events.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add server/engine/events.ts server/engine/events.test.ts
git commit -m "feat(lunchie): 오늘의 스톱 추출 (selectTodayStops/todayStops)"
```

---

## Task 5: GET /api/journey/today

**Files:**
- Modify: `server/routes.ts` (import; `/events/_debug` 라우트 근처에 신규 라우트)

- [ ] **Step 1: import 추가**

`server/routes.ts`에서 events 엔진 import에 `todayStops`를 추가하고(기존 `memEventCount` 등과 같은 모듈), intent 헬퍼 추가:

```ts
import { intentForCategory, categoriesForIntent } from "../shared/intent.js";
```

(`categoriesForIntent`가 Task 3에서 이미 import됐다면 `intentForCategory`만 추가.) `todayStops`는 `server/engine/events.js`에서 가져온다.

- [ ] **Step 2: 라우트 추가**

`router.get("/events/_debug", ...)` 위에 추가. `chainFitFn`(=chainFit), `prevStop`, `candidatePool`은 이 파일에 이미 import/정의돼 있다:

```ts
// 하루 여정: 오늘의 스톱 타임라인 + (사슬 열림 시) 다음-스톱 제안.
router.get("/journey/today", async (req, res) => {
  const userId = String(req.query.userId ?? "");
  if (!userId) return res.json({ stops: [], nextSuggestion: null });
  const now = Date.now();
  const stops = todayStops(userId, now);
  let nextSuggestion: { intent: string; restaurant: { id: string; name?: string; category?: string }; reason: string } | null = null;
  const prev = prevStop(userId, now); // 6h occasion 윈도우 내 직전 카테고리 (없으면 null = 사슬 닫힘)
  if (prev) {
    const pool = await candidatePool();
    // 직전 카테고리 다음에 가장 잘 오는 카테고리 (chainFit 최대) → 인텐트
    const cats = Array.from(new Set(pool.map((c) => c.category).filter(Boolean) as string[]));
    let bestCat: string | null = null, bestP = 0;
    for (const c of cats) {
      const p = chainFitFn(prev, c);
      if (p > bestP) { bestP = p; bestCat = c; }
    }
    const intent = intentForCategory(bestCat) ?? "cafe";
    const visited = new Set(stops.map((s) => s.restaurant_id));
    const wanted = new Set(categoriesForIntent(intent as "meal" | "cafe" | "dessert"));
    const pick = pool
      .filter((c) => c.category && wanted.has(c.category) && !visited.has(c.id))
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];
    if (pick) {
      nextSuggestion = { intent, restaurant: { id: pick.id, name: pick.name, category: pick.category }, reason: `${prev} 다음` };
    }
  }
  res.json({ stops, nextSuggestion });
});
```

> 참고: `candidatePool()`이 반환하는 후보에 `name`이 없으면 `pick.name`은 undefined가 된다 — 클라이언트가 `restaurant.id`로 카탈로그에서 이름을 해석하므로 무방하다.

- [ ] **Step 3: 타입체크 + 빌드**

Run: `npx tsc --noEmit && npx vite build >/dev/null && echo OK`
Expected: `OK`

- [ ] **Step 4: curl 검증 (스톱 없음 → 빈 응답)**

dev 서버 재기동 후(인메모리 버퍼 리셋):

```bash
curl -s "localhost:3000/api/journey/today?userId=jx" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(d))"
```

Expected: `{"stops":[],"nextSuggestion":null}`

- [ ] **Step 5: curl 검증 (WINNER 1건 로깅 → 타임라인에 등장)**

먼저 추천을 한 번 호출해 피처 스토어를 채우고(카테고리 해석용), WINNER 이벤트를 로깅한 뒤 다시 조회:

```bash
B=localhost:3000/api
curl -s -X POST $B/recommend -H 'Content-Type: application/json' -d '{"context":{},"k":7,"user_id":"jx"}' >/dev/null
RID=$(curl -s "$B/journey/today?userId=jx" >/dev/null; curl -s -X POST $B/recommend -H 'Content-Type: application/json' -d '{"context":{},"k":1,"user_id":"jx"}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).slate[0].id))")
curl -s -X POST $B/events -H 'Content-Type: application/json' -d "{\"events\":[{\"event_type\":\"WINNER\",\"user_id\":\"jx\",\"restaurant_id\":\"$RID\",\"context\":{\"intent\":\"meal\"}}]}" >/dev/null
curl -s "$B/journey/today?userId=jx" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log('stops:',j.stops.length,'cat:',j.stops[0]?.category,'next:',j.nextSuggestion?.intent)})"
```

Expected: `stops: 1 cat: <한식 등> next: <cafe/meal 등>` (직전 스톱이 있으니 nextSuggestion이 채워짐; chain 데이터가 비어 있어도 fallback intent=cafe로 제안)

- [ ] **Step 6: Commit**

```bash
git add server/routes.ts
git commit -m "feat(lunchie): GET /api/journey/today — 오늘 스톱 + 다음-스톱 제안"
```

---

## Task 6: 우승화면 씨앗 + WINNER context에 intent

**Files:**
- Modify: `client/src/pages/LunchieSwipePage.tsx` (import; `WinnerScreen` logWinner effect line ~305; 렌더 line ~456 직후)

- [ ] **Step 1: import 추가**

`LunchieSwipePage.tsx` 상단에 추가:

```ts
import { intentForCategory } from "@shared/intent";
```

- [ ] **Step 2: WINNER 로그에 intent 포함**

`WinnerScreen`의 logWinner effect(line ~305)에서 `logWinner(...)` 호출의 context에 `intent`를 추가. 기존:

```ts
logWinner(winner.id, { user_id: profile.id, session_id: currentSession?.id ?? null, slate_id: currentSession?.slateId ?? null });
```

를 다음으로 교체:

```ts
logWinner(winner.id, { user_id: profile.id, session_id: currentSession?.id ?? null, slate_id: currentSession?.slateId ?? null, intent: intentForCategory(winner.category) ?? undefined });
```

> `logWinner`의 4번째 인자(context)는 임의 키를 허용한다(`RecEventInput['context']`). intent를 추가하면 스톱이 자기 인텐트를 안다.

- [ ] **Step 3: 씨앗 카드 렌더**

`WinnerScreen` 렌더에서 저장/다시 고르기 버튼 행(주석 `{/* 저장(강한 취향 신호 ...) */}` ~ `다시 고르기` 버튼, line ~443-457) **직후, 홈으로 버튼 앞**에 추가. 다음 인텐트는 chain 학습 전이라도 카테고리 기반으로 안내(밥→커피·디저트):

```tsx
          {/* 하루 여정 씨앗 — 다음 스톱 '인지'만. 실제 결정은 이따 홈 '오늘의 여정'에서. */}
          <div className="mt-3 rounded-xl px-3 py-2.5 text-[12px] leading-relaxed"
               style={{ background: '#FFF3D6', color: '#8A5A0B' }}>
            🌱 다 드시고 나서 — <b>커피·디저트</b>도 근처에 있어요.
            <br />이따 홈 <b>‘오늘의 여정’</b>에서 다음 코스를 골라요.
          </div>
```

- [ ] **Step 4: 타입체크 + 빌드**

Run: `npx tsc --noEmit && npx vite build >/dev/null && echo OK`
Expected: `OK`

- [ ] **Step 5: 브라우저 검증**

프리뷰에서 Lunchie 한 판을 끝까지 진행해 우승화면 도달 → 저장/다시고르기 아래에 노란 씨앗 카드가 보이는지 스크린샷 확인. (preview_screenshot)

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/LunchieSwipePage.tsx
git commit -m "feat(lunchie): 우승화면 하루 여정 씨앗 + WINNER intent"
```

---

## Task 7: 홈 '오늘의 여정' 카드 + recommend 시간 기본 인텐트

**Files:**
- Modify: `client/src/contexts/AppContext.tsx` (`buildDeck`, line ~447-469)
- Modify: `client/src/pages/HomePage.tsx` (import; `TodayJourneyCard` 컴포넌트 추가; `HomePage` 렌더에 삽입)

- [ ] **Step 1: buildDeck recommend context에 시간 기본 인텐트**

`client/src/contexts/AppContext.tsx` 상단에 import 추가:

```ts
import { intentForHour } from "@shared/intent";
```

`buildDeck`의 recommend body에서 context 줄(line ~464)을 교체:

```ts
        context: { diet: filters.dietary, companions: filters.partySize, intent: intentForHour(new Date().getHours()) },
```

> Phase 1: 첫 스톱은 시간 기본 인텐트로 거른다(점심시간→밥). 명시 인텐트 전달은 후속.

- [ ] **Step 2: HomePage import 추가**

`client/src/pages/HomePage.tsx` 상단 import에 `useLocation`은 이미 있음. 없는 것만 추가 — 이미 `useState, useEffect, useApp, logEvent, toast`는 있음. 추가 불필요할 가능성이 높다. 확인만 하고 누락 시 추가.

- [ ] **Step 3: TodayJourneyCard 컴포넌트 추가**

`HomePage.tsx`에서 기존 `RetroSurveyCard` 함수 **아래**에 추가 (같은 패턴):

```tsx
// 하루 여정: 오늘 결정된 스톱 타임라인 + (사슬 열림 시) 다음-스톱 제안.
function TodayJourneyCard() {
  const { profile } = useApp();
  const [, navigate] = useLocation();
  const [data, setData] = useState<{
    stops: { restaurant_id: string; category: string | null; satisfaction: string | null }[];
    nextSuggestion: { intent: string; restaurant: { id: string; category?: string }; reason: string } | null;
  } | null>(null);
  useEffect(() => {
    let on = true;
    fetch(`/api/journey/today?userId=${encodeURIComponent(profile.id)}`)
      .then((r) => r.json())
      .then((d) => { if (on) setData(d); })
      .catch(() => { /* 폴백: 카드 숨김 */ });
    return () => { on = false; };
  }, [profile.id]);
  if (!data || data.stops.length === 0) return null; // 오늘 스톱 0개 → 숨김

  const nameOf = (id: string) => MOCK_RESTAURANTS.find((r) => r.id === id)?.name ?? id;
  const sat = (s: string | null) => (s === "POS" ? "👍" : s === "NEG" ? "👎" : s === "NEU" ? "😐" : "");
  const intentLabel: Record<string, string> = { meal: "밥", cafe: "커피", dessert: "디저트" };

  return (
    <div className="mx-4 mb-4 rounded-2xl bg-white p-4 shadow-sm">
      <p className="mb-3 text-[13px] font-bold text-[#1A1A1A]">오늘의 여정</p>
      <div className="space-y-2">
        {data.stops.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-[13px]">
            <span className="text-[#EB5053]">●</span>
            <span className="font-semibold text-[#1A1A1A]">{nameOf(s.restaurant_id)}</span>
            <span className="text-[#9B9B9B]">· {s.category ?? ""}</span>
            <span>{sat(s.satisfaction)}</span>
          </div>
        ))}
      </div>
      {data.nextSuggestion && (
        <button
          onClick={() => navigate(`/lunchie/settings?intent=${data.nextSuggestion!.intent}`)}
          className="mt-3 w-full rounded-xl border border-dashed border-[#EB5053] px-3 py-2.5 text-left text-[13px] font-bold text-[#EB5053] active:scale-[0.99]"
        >
          다음은 {intentLabel[data.nextSuggestion.intent] ?? data.nextSuggestion.intent}? →
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: HomePage 렌더에 삽입**

`export default function HomePage()`의 `return (` 내부, `<Header ... />` **직후**(또는 기존 `<RetroSurveyCard />`가 렌더되는 위치 옆)에 추가:

```tsx
        <TodayJourneyCard />
```

> `RetroSurveyCard`가 아직 HomePage 렌더에 삽입돼 있지 않다면 함께 넣는다: `<RetroSurveyCard />` 다음 줄에 `<TodayJourneyCard />`.

- [ ] **Step 5: 타입체크 + 빌드**

Run: `npx tsc --noEmit && npx vite build >/dev/null && echo OK`
Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add client/src/contexts/AppContext.tsx client/src/pages/HomePage.tsx
git commit -m "feat(lunchie): 홈 '오늘의 여정' 카드 + recommend 시간 기본 인텐트"
```

---

## Task 8: 엔드투엔드 검증

**Files:** (없음 — 검증만)

- [ ] **Step 1: 전체 타입체크 + 빌드 + 단위 테스트**

Run: `npx tsc --noEmit && npx vite build >/dev/null && npx vitest run && echo ALL_OK`
Expected: `ALL_OK` (테스트 4건 통과)

- [ ] **Step 2: 브라우저 e2e (프리뷰)**

dev 서버/프리뷰 재기동(인메모리 버퍼 리셋) 후:
1. Lunchie 한 판 진행 → 우승화면에서 씨앗 카드 확인.
2. 홈(`/`)으로 이동 → "오늘의 여정"에 방금 결정한 곳이 타임라인으로 뜨고, "다음은 …?" 제안 버튼이 보이는지 확인.
3. 제안 버튼 탭 → Lunchie 설정으로 이동(intent 쿼리 포함)되는지 확인.
4. preview_console_logs(level error)로 신규 에러 없음 확인 (서버 리로드 중 일시적 "Failed to fetch"는 무시).
5. preview_screenshot로 홈 "오늘의 여정" 증빙 캡처.

- [ ] **Step 3: 최종 확인 메시지**

검증 통과 시 Phase 1 완료. 미통과 시 systematic-debugging으로 디버그.

---

## Self-Review (작성자 점검)

**스펙 커버리지:**
- 인텐트 필드 + 필터 → Task 1·2·3 ✅
- 우승화면 씨앗 → Task 6 ✅
- 홈 오늘의 여정 타임라인 + 다음-스톱 제안 → Task 5·7 ✅
- 음식일기=WINNER+SURVEY 뷰(새 테이블 없음) → Task 4 `selectTodayStops` ✅
- API: recommend intent 필터(Task 3) · GET journey/today(Task 5) ✅
- 엣지: 오늘 0개 숨김(Task 7 Step 3) · 사슬 만료 시 nextSuggestion=null(Task 5) · intent 후보 0 완화(Task 3) · mock 폴백(Task 4 memEvents) ✅
- 테스트: 단위(intent·selectTodayStops) + curl(recommend·journey) + 브라우저 e2e ✅

**플레이스홀더 스캔:** 모든 코드 스텝에 실제 코드 포함, TODO/TBD 없음 ✅

**타입 일관성:** `Intent`("meal"|"cafe"|"dessert")가 shared/intent·RecContext·route·client에서 일관. `selectTodayStops`/`todayStops`/`JourneyStop` 시그니처가 Task 4↔5↔7에서 일치 ✅

**범위 노트:** 다음 스톱의 **명시 인텐트 전달**(제안 탭 → 그 intent로 recommend)은 Phase 1에서 URL 쿼리(`?intent=`)까지만 전달하고, buildDeck은 시간 기본 인텐트를 쓴다. 탭한 intent를 buildDeck까지 관통시키는 것은 세션 시작 경로를 더 건드려야 하므로, 동작에 필수가 아닌 개선으로 남긴다(첫 스톱 시간 기본 필터만으로 루프는 성립). 필요 시 Phase 1.5 작은 후속.
