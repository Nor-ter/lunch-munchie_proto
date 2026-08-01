// 런치 엔진 v2 — 음식 연쇄 (occasion 시퀀스, Munchie 엔진)
//
// "마라탕 먹었으면 버블티" — 한 나들이(occasion) 안의 순서 관성. 직전 스톱 카테고리
// 다음에 무엇이 잘 따라오는지 전이 모델 P(next | prev)을 학습한다.
// occasion = 같은 유저의 6시간 윈도우 내 연속 소비. granularity=카테고리.
// 실제 방문(VISIT)만 개인 전이로 기록한다. WINNER는 선택 의도일 뿐 실제 이동/섭취가 아니다.
// NEXT_STOP 슬레이트는 이 검증된 방문 이력만 근거로 추천한다.

const OCCASION_WINDOW = 6 * 3600 * 1000; // 6h: 같은 나들이로 볼 간격
const KAPPA = 3.0; // 사전 강도: 개인 이력이 3건 미만이면 P0 전역 답지가 우세

const chainCount = new Map<string, Map<string, number>>(); // prevCat -> nextCat -> count (개인 소비 이력 Pu)
const globalPriorCount = new Map<string, Map<string, number>>(); // prevCat -> nextCat -> count (Munchie 코스 답지 P0)
const lastStop = new Map<string, { cat: string; t: number }>(); // user -> 직전 스톱

// Munchie 코스 목록(stops.order_index)으로부터 전역 연쇄 답지 P0(next|prev)를 수집 및 빌드
export function buildGlobalChainPrior(
  coursesData: Array<{ id: string; saves_count?: number; likes_count?: number }>,
  courseItemsData: Array<{ course_id: string; order_index: number; category?: string }>
): void {
  globalPriorCount.clear();
  const itemMap = new Map<string, Array<{ order_index: number; category?: string }>>();

  for (const item of courseItemsData) {
    if (!item.category) continue;
    const list = itemMap.get(item.course_id) ?? [];
    list.push(item);
    itemMap.set(item.course_id, list);
  }

  for (const course of coursesData) {
    const items = itemMap.get(course.id);
    if (!items || items.length < 2) continue;

    // order_index 정렬
    items.sort((a, b) => a.order_index - b.order_index);
    const weight = 1.0 + 0.1 * (course.saves_count ?? 0) + 0.05 * (course.likes_count ?? 0);

    for (let i = 0; i < items.length - 1; i++) {
      const prevCat = items[i].category;
      const nextCat = items[i + 1].category;
      if (!prevCat || !nextCat || prevCat === nextCat) continue;

      const m = globalPriorCount.get(prevCat) ?? new Map<string, number>();
      globalPriorCount.set(prevCat, m);
      m.set(nextCat, (m.get(nextCat) ?? 0) + weight);
    }
  }
}

// 검증된 VISIT마다 호출. 직전 스톱과 같은 occasion이면 전이 1건 기록.
export function recordStop(userId: string | null | undefined, category: string | null | undefined, ts = Date.now()): void {
  if (!userId || !category) return;
  const uid = String(userId);
  const prev = lastStop.get(uid);
  if (prev && ts > prev.t && ts - prev.t <= OCCASION_WINDOW && prev.cat !== category) {
    const m = chainCount.get(prev.cat) ?? new Map<string, number>();
    chainCount.set(prev.cat, m);
    m.set(category, (m.get(category) ?? 0) + 1);
  }
  if (!prev || ts >= prev.t) lastStop.set(uid, { cat: category, t: ts });
}

// 윈도우 내 직전 스톱 카테고리 (없거나 만료면 null) — NEXT_STOP 추천의 기준점.
export function prevStop(userId: string | null | undefined, now = Date.now()): string | null {
  const s = lastStop.get(String(userId));
  if (!s || now - s.t > OCCASION_WINDOW) return null;
  return s.cat;
}

// P(nextCat | prevCat) in [0,1] — 개인 이력 Pu 와 전역 답지 P0의 베이지안 슈링크 연산.
export function chainFit(prevCat: string | null, nextCat: string | undefined, userObsCount = 0): number {
  if (!prevCat || !nextCat || prevCat === nextCat) return 0;

  // 1. 개인 이력 Pu
  let pUser = 0;
  const mUser = chainCount.get(prevCat);
  if (mUser && mUser.size) {
    const totalUser = Array.from(mUser.values()).reduce((a, b) => a + b, 0);
    if (totalUser > 0) pUser = (mUser.get(nextCat) ?? 0) / totalUser;
  }

  // 2. 전역 코스 답지 P0
  let pPrior = 0;
  const mPrior = globalPriorCount.get(prevCat);
  if (mPrior && mPrior.size) {
    const totalPrior = Array.from(mPrior.values()).reduce((a, b) => a + b, 0);
    if (totalPrior > 0) pPrior = (mPrior.get(nextCat) ?? 0) / totalPrior;
  }

  // 3. 베이지안 슈링크 혼합: P = (n_u * Pu + KAPPA * P0) / (n_u + KAPPA)
  return (userObsCount * pUser + KAPPA * pPrior) / (userObsCount + KAPPA);
}

// 대시보드: 가장 빈번한 prev -> next 전이 top-N
export function topTransitions(limit = 6) {
  const all: { from: string; to: string; count: number; p: number }[] = [];
  for (const [from, m] of Array.from(chainCount.entries())) {
    const total = Array.from(m.values()).reduce((a, b) => a + b, 0);
    for (const [to, count] of Array.from(m.entries())) all.push({ from, to, count, p: Number((count / total).toFixed(2)) });
  }
  return all.sort((a, b) => b.count - a.count).slice(0, limit);
}

export function chainStats() {
  let pairs = 0, obs = 0;
  for (const m of Array.from(chainCount.values())) { pairs += m.size; for (const c of Array.from(m.values())) obs += c; }
  return { chainTransitions: pairs, chainObservations: obs };
}
