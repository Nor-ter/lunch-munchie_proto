// 런치 엔진 v2 — 음식 연쇄 (occasion 시퀀스, Munchie 엔진)
//
// "마라탕 먹었으면 버블티" — 한 나들이(occasion) 안의 순서 관성. 직전 스톱 카테고리
// 다음에 무엇이 잘 따라오는지 전이 모델 P(next | prev)을 학습한다.
// occasion = 같은 유저의 6시간 윈도우 내 연속 소비. granularity=카테고리.
// 소비 프록시=WINNER(VISIT 쌓이면 교체). NEXT_STOP 슬레이트가 이걸 근거로 추천.

const OCCASION_WINDOW = 6 * 3600 * 1000; // 6h: 같은 나들이로 볼 간격

const chainCount = new Map<string, Map<string, number>>(); // prevCat -> nextCat -> count (전역)
const lastStop = new Map<string, { cat: string; t: number }>(); // user -> 직전 스톱

// WINNER(소비)마다 호출. 직전 스톱과 같은 occasion이면 전이 1건 기록.
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

// P(nextCat | prevCat) in [0,1] — 다음-스톱 적합도.
export function chainFit(prevCat: string | null, nextCat: string | undefined): number {
  if (!prevCat || !nextCat || prevCat === nextCat) return 0;
  const m = chainCount.get(prevCat);
  if (!m || !m.size) return 0;
  const total = Array.from(m.values()).reduce((a, b) => a + b, 0);
  return total ? (m.get(nextCat) ?? 0) / total : 0;
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
