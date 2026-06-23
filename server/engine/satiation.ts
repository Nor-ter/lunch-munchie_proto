// 런치 엔진 v2 — 장기 재소비 갈망 (satiation, ±w7 항)
//
// 단기 노출 피로(exposure)와 다르다: "어제 먹은 건 오늘 별로지만 시간 지나면 다시 당김."
// 먹은 직후 음(-, 포만) → 시간이 지나며 회복 → 개인별 재주문 주기 부근에서 양(+, 갈망).
// 미디어 추천엔 거의 없는 모델링 = 엔진 시그니처.
//
// 데이터(프로토타입 프록시): WINNER(=결정/소비)를 (user, 카테고리, 시각)으로 본다.
// granularity = 카테고리(희소성에 robust). 실제 VISIT 라벨이 쌓이면 교체.
// 회복 곡선: recovery(dt) = 1 - exp(-dt/tau), satiation = recovery - 0.5 in [-0.5, +0.5).

const DAY = 24 * 3600 * 1000;
const DEFAULT_CYCLE = 5 * DAY;
const MIN_CYCLE = 1 * DAY, MAX_CYCLE = 30 * DAY;

const store = new Map<string, Map<string, number[]>>(); // uid -> category -> 소비 시각(정렬)

// 재주문 주기 tau 추정: 관측 간격의 중앙값(2회 이상), 없으면 기본값. 범위 클램프.
function estimateCycle(arr: number[]): number {
  if (arr.length < 2) return DEFAULT_CYCLE;
  const diffs: number[] = [];
  for (let i = 1; i < arr.length; i++) diffs.push(arr[i] - arr[i - 1]);
  diffs.sort((a, b) => a - b);
  const m = diffs[Math.floor(diffs.length / 2)];
  return Math.max(MIN_CYCLE, Math.min(MAX_CYCLE, m));
}

export function recordConsumption(userId: string | null | undefined, category: string | null | undefined, ts = Date.now()): void {
  if (!userId || !category) return;
  const uid = String(userId);
  let u = store.get(uid);
  if (!u) { u = new Map(); store.set(uid, u); }
  const arr = u.get(category) ?? [];
  arr.push(ts);
  arr.sort((a, b) => a - b);
  if (arr.length > 50) arr.shift();
  u.set(category, arr);
}

// 후보 카테고리의 satiation in [-0.5, +0.5). 소비 이력 없으면 0(중립).
export function satiation(userId: string | null | undefined, category: string | null | undefined, now = Date.now()): number {
  if (!userId || !category) return 0;
  const u = store.get(String(userId));
  if (!u) return 0;
  const arr = u.get(category);
  if (!arr || !arr.length) return 0;
  const dt = Math.max(0, now - arr[arr.length - 1]);
  const tau = estimateCycle(arr);
  return 1 - Math.exp(-dt / tau) - 0.5;
}

export function satiationStats() {
  let cats = 0;
  for (const u of Array.from(store.values())) cats += u.size;
  return { satiationUsers: store.size, satiationCats: cats };
}

// 대시보드용 — "마지막 소비 후 경과(일)" 버킷별 평균 satiation (회복 곡선 모양)
export function satiationCurve(now = Date.now()) {
  const defs = [
    { k: "0-1d", lo: 0, hi: 1 }, { k: "1-3d", lo: 1, hi: 3 }, { k: "3-7d", lo: 3, hi: 7 },
    { k: "7-14d", lo: 7, hi: 14 }, { k: "14d+", lo: 14, hi: Infinity },
  ];
  const agg = defs.map((d) => ({ bucket: d.k, sum: 0, n: 0 }));
  for (const u of Array.from(store.values())) {
    for (const arr of Array.from(u.values())) {
      if (!arr.length) continue;
      const last = arr[arr.length - 1];
      const dtDays = (now - last) / DAY;
      const s = 1 - Math.exp(-(now - last) / estimateCycle(arr)) - 0.5;
      const bi = defs.findIndex((d) => dtDays >= d.lo && dtDays < d.hi);
      if (bi >= 0) { agg[bi].sum += s; agg[bi].n++; }
    }
  }
  return agg.map((a) => ({ bucket: a.bucket, avg: a.n ? Number((a.sum / a.n).toFixed(3)) : null, n: a.n }));
}
