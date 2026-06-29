// 그룹 결정 — least-misery 집계 + top-2 결승 투표 (순수 로직).
// 솔로는 개인 듀얼(2AFC)을 쓰고, 그룹은 합의=집계로 정한다.

export interface SwipeRow {
  restaurant_id: string;
  swipe_action: string; // "LIKE" | "NOPE"
  round?: number | null; // 1=예선, 2=결승 투표
  user_id?: string;
}

export interface RankedResult {
  restaurantId: string;
  score: number;
  likeCount: number;
  dislikeCount: number;
}

// least-misery 랭크: 싫어요 적은 곳 우선, 같으면 좋아요 많은 순.
// penalty = memberCount+1 → 싫어요 1개가 그룹 내 가능한 모든 좋아요를 압도한다.
// "아무도 안 싫어하는 곳"이 인기(좋아요 총합)보다 먼저.
export function rankResultsLeastMisery(swipes: SwipeRow[], memberCount: number): RankedResult[] {
  const m = new Map<string, { likeCount: number; dislikeCount: number }>();
  for (const s of swipes) {
    if (!s.restaurant_id) continue;
    const r = m.get(s.restaurant_id) ?? { likeCount: 0, dislikeCount: 0 };
    if (s.swipe_action === "LIKE") r.likeCount += 1;
    else r.dislikeCount += 1;
    m.set(s.restaurant_id, r);
  }
  const penalty = Math.max(1, memberCount) + 1;
  const out: RankedResult[] = Array.from(m.entries()).map(([restaurantId, r]) => ({
    restaurantId,
    likeCount: r.likeCount,
    dislikeCount: r.dislikeCount,
    score: r.likeCount - r.dislikeCount * penalty,
  }));
  out.sort((a, b) => b.score - a.score || b.likeCount - a.likeCount);
  return out;
}

export interface GroupDecision {
  phase: "PRELIM" | "FINAL" | "DONE";
  results: RankedResult[];             // 예선 least-misery 랭킹
  finalists: RankedResult[];           // 결승 후보 top-2 (FINAL·DONE)
  finalTally: Record<string, number>;  // restaurantId → 결승 표수
  finalVotedCount: number;             // 결승 투표한 멤버 수
  winnerId: string | null;             // DONE일 때 우승
}

// 그룹 결정 상태기계: 예선(round1) → (후보 ≥2면) 결승 투표(round2) → 완료.
// completedPrelim = 예선 targetCount를 채운 멤버 수. isExpired = 마감.
export function decideGroup(
  round1: SwipeRow[],
  round2: SwipeRow[],
  memberCount: number,
  completedPrelim: number,
  isExpired: boolean,
): GroupDecision {
  const results = rankResultsLeastMisery(round1, memberCount);
  const prelimDone = completedPrelim >= memberCount || isExpired;
  if (!prelimDone) {
    return { phase: "PRELIM", results, finalists: [], finalTally: {}, finalVotedCount: 0, winnerId: null };
  }
  const viable = results.filter((r) => r.likeCount >= 1);
  const finalists = viable.slice(0, 2);
  // 후보 <2 → 결승 생략, 바로 우승 (좋아요 없으면 least-misery 1위로 폴백)
  if (finalists.length < 2) {
    const winnerId = (finalists[0] ?? results[0])?.restaurantId ?? null;
    return { phase: "DONE", results, finalists, finalTally: {}, finalVotedCount: 0, winnerId };
  }
  // 결승: 두 finalist에 대한 round2 LIKE만 유효표
  const fids = new Set(finalists.map((f) => f.restaurantId));
  const tally: Record<string, number> = { [finalists[0].restaurantId]: 0, [finalists[1].restaurantId]: 0 };
  const voters = new Set<string>();
  for (const s of round2) {
    if (s.swipe_action === "LIKE" && s.restaurant_id && fids.has(s.restaurant_id)) {
      tally[s.restaurant_id] += 1;
      if (s.user_id) voters.add(s.user_id);
    }
  }
  const finalDone = voters.size >= memberCount || isExpired;
  if (!finalDone) {
    return { phase: "FINAL", results, finalists, finalTally: tally, finalVotedCount: voters.size, winnerId: null };
  }
  // 우승: 표 많은 finalist, 동률이면 예선 상위(finalists[0])
  const [f0, f1] = finalists;
  const winnerId = tally[f0.restaurantId] >= tally[f1.restaurantId] ? f0.restaurantId : f1.restaurantId;
  return { phase: "DONE", results, finalists, finalTally: tally, finalVotedCount: voters.size, winnerId };
}
