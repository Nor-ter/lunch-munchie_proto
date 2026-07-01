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
  // E: 결정적 정렬 — score → 좋아요 수 → id (서버측 안정 tiebreak. 엔진 순위는 클라에서).
  out.sort((a, b) => b.score - a.score || b.likeCount - a.likeCount || a.restaurantId.localeCompare(b.restaurantId));
  return out;
}

// "둘 다 별로" 표 = 이 sentinel을 restaurant_id로 하는 결승(round2) LIKE.
export const REJECT_ID = "__reject__";

export interface GroupDecision {
  phase: "PRELIM" | "FINAL" | "REROLL" | "NO_CONSENSUS" | "DONE";
  results: RankedResult[];             // 예선 least-misery 랭킹
  finalists: RankedResult[];           // 결승 후보 (FINAL·DONE) — 1~2곳
  finalTally: Record<string, number>;  // restaurantId(+REJECT_ID) → 결승 표수
  finalVotedCount: number;             // 결승 투표한 멤버 수
  rejectVotes: number;                 // "둘 다 별로" 표수
  winnerId: string | null;             // DONE일 때 우승
  excludeIds: string[];                // REROLL일 때 다음 세대에서 뺄 곳(거절+다수미움)
}

// 그룹 결정 상태기계 (한 세대):
//   예선(round1) → 후보 선정(least-misery + 들러리 필터) → 결승 3지선다(round2: A/B/REJECT)
//   → DONE / REROLL('둘 다 별로' 최다, 제외집합 노출) / NO_CONSENSUS(세대 ≥ cap).
// completedPrelim=예선 채운 멤버 수. generation=현재 세대(1부터). rerollCap=최대 세대.
export function decideGroup(
  round1: SwipeRow[],
  round2: SwipeRow[],
  memberCount: number,
  completedPrelim: number,
  isExpired: boolean,
  generation = 1,
  rerollCap = 3,
): GroupDecision {
  const results = rankResultsLeastMisery(round1, memberCount);
  const base: Omit<GroupDecision, "phase"> = {
    results, finalists: [], finalTally: {}, finalVotedCount: 0, rejectVotes: 0, winnerId: null, excludeIds: [],
  };
  const prelimDone = completedPrelim >= memberCount || isExpired;
  if (!prelimDone) return { ...base, phase: "PRELIM" };

  const majority = Math.floor(memberCount / 2);
  const hated = results.filter((r) => r.dislikeCount > majority).map((r) => r.restaurantId); // 과반 미움
  // B: 후보 자격 = 좋아요≥1 AND 과반 미움 아님(들러리 배제)
  const viable = results.filter((r) => r.likeCount >= 1 && r.dislikeCount <= majority);
  const finalists = viable.slice(0, 2);

  // reroll 헬퍼: 세대 상한 도달이면 합의 실패(NO_CONSENSUS).
  const reroll = (excludeIds: string[], rejectVotes: number, fin: RankedResult[], tally: Record<string, number>, voted: number): GroupDecision => {
    const phase: GroupDecision["phase"] = generation >= rerollCap ? "NO_CONSENSUS" : "REROLL";
    return { ...base, phase, finalists: fin, finalTally: tally, finalVotedCount: voted, rejectVotes, excludeIds };
  };

  // 후보 0 → reroll (아무도 안 좋아함 = 강제 우승 금지)
  if (finalists.length === 0) return reroll(hated, 0, [], {}, 0);

  // 후보 1 만장일치(참여자 전원 LIKE·싫어요 0) → 바로 확정. 아니면 "이것 vs 둘 다 별로" 확인 투표.
  if (finalists.length === 1) {
    const f = finalists[0];
    if (f.dislikeCount === 0 && f.likeCount >= completedPrelim) {
      return { ...base, phase: "DONE", finalists, winnerId: f.restaurantId };
    }
  }

  // 결승 3지선다: finalists + REJECT_ID. 멤버당 1표(마지막 우선) 중복 제거.
  const choices = new Set([...finalists.map((f) => f.restaurantId), REJECT_ID]);
  const userVote = new Map<string, string>();
  for (const s of round2) {
    if (s.swipe_action === "LIKE" && s.user_id && s.restaurant_id && choices.has(s.restaurant_id)) {
      userVote.set(s.user_id, s.restaurant_id);
    }
  }
  const tally: Record<string, number> = { [REJECT_ID]: 0 };
  for (const f of finalists) tally[f.restaurantId] = 0;
  for (const rid of Array.from(userVote.values())) tally[rid] += 1;
  const finalVoted = userVote.size;
  const finalDone = finalVoted >= memberCount || isExpired;
  if (!finalDone) {
    return { ...base, phase: "FINAL", finalists, finalTally: tally, finalVotedCount: finalVoted, rejectVotes: tally[REJECT_ID] };
  }

  // 확정: 최다 finalist (동률 → 예선 상위 = finalists[0]). '둘 다 별로'가 단독 최다면 reroll.
  const rejectVotes = tally[REJECT_ID];
  let top = finalists[0];
  for (const f of finalists) if (tally[f.restaurantId] > tally[top.restaurantId]) top = f;
  if (rejectVotes > tally[top.restaurantId]) {
    const excludeIds = Array.from(new Set([...finalists.map((f) => f.restaurantId), ...hated]));
    return reroll(excludeIds, rejectVotes, finalists, tally, finalVoted);
  }
  return { ...base, phase: "DONE", finalists, finalTally: tally, finalVotedCount: finalVoted, rejectVotes, winnerId: top.restaurantId };
}
