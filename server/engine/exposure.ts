// 런치 엔진 v1 — 단기 노출 피로 (-w6 항)
//
// 이번/최근에 보여준 카드를 또 보여주면 호감이 떨어진다 → 누적 노출로 감점.
// "단기"라서 시간이 지나면 회복(감쇠). 장기 재소비 갈망(satiation, 부호가 바뀌는 +항)은
// v2에서 생존분석으로 별도 처리. 여기선 감점만.
//
// 인메모리 (user,restaurant) 감쇠 카운트. 아키텍처상 피처 스토어에 들어가지만
// 프로토타입은 서빙 프로세스 내 보관(DB 폴백 취지).

const HALF_LIFE_MS = 24 * 3600 * 1000; // 24시간 반감기 (단기)
const LAMBDA = 0.6; // 패널티 곡선 가파름

interface Exp { c: number; t: number } // 감쇠 누적 노출, 마지막 갱신 시각
const store = new Map<string, Exp>();
const key = (u: string, r: string) => u + "|" + r;
const decayed = (e: Exp, now: number) => e.c * Math.pow(0.5, (now - e.t) / HALF_LIFE_MS);

// 사전 노출(지금 이전까지)에 따른 감점 g in [0,1). 첫 노출(prior=0)=0.
export function exposurePenalty(userId: string | null | undefined, restaurantId: string, now = Date.now()): number {
  if (!userId) return 0;
  const e = store.get(key(String(userId), restaurantId));
  if (!e) return 0;
  return 1 - Math.exp(-LAMBDA * decayed(e, now));
}

// 노출 1건 기록 (슬레이트로 실제 보여준 아이템에만).
export function recordExposure(userId: string | null | undefined, restaurantId: string, now = Date.now()): void {
  if (!userId) return;
  const k = key(String(userId), restaurantId);
  const e = store.get(k);
  store.set(k, { c: (e ? decayed(e, now) : 0) + 1, t: now });
}

export function exposureStats() {
  return { exposureTracked: store.size };
}
