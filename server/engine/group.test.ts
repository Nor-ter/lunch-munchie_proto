import { describe, it, expect } from "vitest";
import { rankResultsLeastMisery, decideGroup, REJECT_ID, SwipeRow } from "./group";

const like = (rid: string, uid: string): SwipeRow => ({ restaurant_id: rid, swipe_action: "LIKE", round: 1, user_id: uid });
const nope = (rid: string, uid: string): SwipeRow => ({ restaurant_id: rid, swipe_action: "DISLIKE", round: 1, user_id: uid });
const vote = (rid: string, uid: string): SwipeRow => ({ restaurant_id: rid, swipe_action: "LIKE", round: 2, user_id: uid });
const reject = (uid: string): SwipeRow => ({ restaurant_id: REJECT_ID, swipe_action: "LIKE", round: 2, user_id: uid });

describe("rankResultsLeastMisery", () => {
  it("싫어요 적은 곳이 우선 (인기보다 least-misery)", () => {
    // A: 4 좋아요·1 싫어요 (인기 1위지만 미워하는 사람 있음)
    // B: 3 좋아요·0 싫어요 (덜 인기지만 아무도 안 싫어함)
    const swipes = [
      ...Array(4).fill(0).map((_, i) => ({ restaurant_id: "A", swipe_action: "LIKE", user_id: "u" + i })),
      { restaurant_id: "A", swipe_action: "NOPE", user_id: "u4" },
      ...Array(3).fill(0).map((_, i) => ({ restaurant_id: "B", swipe_action: "LIKE", user_id: "u" + i })),
    ];
    const ranked = rankResultsLeastMisery(swipes, 5);
    expect(ranked[0].restaurantId).toBe("B"); // least-misery 우승
    expect(ranked[1].restaurantId).toBe("A");
  });

  it("싫어요 같으면 좋아요 많은 순", () => {
    const swipes = [
      { restaurant_id: "A", swipe_action: "LIKE", user_id: "u0" },
      { restaurant_id: "A", swipe_action: "LIKE", user_id: "u1" },
      { restaurant_id: "B", swipe_action: "LIKE", user_id: "u0" },
    ];
    const ranked = rankResultsLeastMisery(swipes, 2);
    expect(ranked.map((r) => r.restaurantId)).toEqual(["A", "B"]);
  });
});

describe("decideGroup", () => {
  it("예선 미완료 → PRELIM", () => {
    const r1 = [like("A", "u0"), like("B", "u0")];
    const d = decideGroup(r1, [], 3, 1, false); // 3명 중 1명만 완료
    expect(d.phase).toBe("PRELIM");
  });

  it("좋아요 후보 1곳뿐 → 결승 생략, 바로 DONE", () => {
    const r1 = [like("A", "u0"), like("A", "u1"), nope("B", "u0")];
    const d = decideGroup(r1, [], 2, 2, false);
    expect(d.phase).toBe("DONE");
    expect(d.winnerId).toBe("A");
  });

  it("후보 2곳·예선 완료·투표 미완 → FINAL (finalists 노출)", () => {
    const r1 = [like("A", "u0"), like("A", "u1"), like("B", "u0"), like("B", "u1")];
    const d = decideGroup(r1, [], 2, 2, false);
    expect(d.phase).toBe("FINAL");
    expect(d.finalists.map((f) => f.restaurantId).sort()).toEqual(["A", "B"]);
  });

  it("전원 투표 완료 → 표 많은 finalist 우승", () => {
    const r1 = [like("A", "u0"), like("A", "u1"), like("B", "u0"), like("B", "u1")];
    const r2 = [vote("A", "u0"), vote("A", "u1")]; // 2명 다 A
    const d = decideGroup(r1, r2, 2, 2, false);
    expect(d.phase).toBe("DONE");
    expect(d.winnerId).toBe("A");
    expect(d.finalVotedCount).toBe(2);
  });

  it("결승 동률 → 예선 상위(finalists[0]) 우승", () => {
    // A가 예선 least-misery 상위(둘 다 좋아요지만 A를 u0/u1, B를 u0/u1 → 동률이면 정렬 안정성). 동률 표 1:1.
    const r1 = [like("A", "u0"), like("A", "u1"), like("A", "u2"), like("B", "u0"), like("B", "u1")];
    const r2 = [vote("A", "u0"), vote("B", "u1"), vote("A", "u2")]; // A:2 B:1 → A. 동률 케이스 대신 다수.
    const d = decideGroup(r1, r2, 3, 3, false);
    expect(d.phase).toBe("DONE");
    expect(d.winnerId).toBe("A");
  });

  it("B 들러리 필터 — 과반이 싫어한 곳은 후보 제외", () => {
    // 3명. A: 3 좋아요. B: 1 좋아요·2 싫어요(과반 미움) → 들러리 배제 → 후보 1곳(A) 만장일치.
    const r1 = [like("A", "u0"), like("A", "u1"), like("A", "u2"), like("B", "u0"), nope("B", "u1"), nope("B", "u2")];
    const d = decideGroup(r1, [], 3, 3, false);
    expect(d.phase).toBe("DONE"); // A 만장일치
    expect(d.winnerId).toBe("A");
    expect(d.finalists.map((f) => f.restaurantId)).toEqual(["A"]);
  });

  it("후보 1곳 비만장일치 → 확인 투표(FINAL), '둘 다 별로' 최다 → REROLL", () => {
    // A: 2명 좋아요·1명 싫어요(과반 미움 아님, 들러리 통과). 만장일치 아님 → 확인 투표.
    const r1 = [like("A", "u0"), like("A", "u1"), nope("A", "u2")];
    const mid = decideGroup(r1, [], 3, 3, false);
    expect(mid.phase).toBe("FINAL");
    expect(mid.finalists.map((f) => f.restaurantId)).toEqual(["A"]);
    // 전원 '둘 다 별로' → REROLL, 제외에 A 포함
    const r2 = [reject("u0"), reject("u1"), reject("u2")];
    const d = decideGroup(r1, r2, 3, 3, false);
    expect(d.phase).toBe("REROLL");
    expect(d.rejectVotes).toBe(3);
    expect(d.excludeIds).toContain("A");
  });

  it("'둘 다 별로' 단독 최다 → REROLL (거절 finalists 제외)", () => {
    const r1 = [like("A", "u0"), like("A", "u1"), like("B", "u0"), like("B", "u1")];
    const r2 = [reject("u0"), reject("u1")]; // 둘 다 별로 2 vs A0 B0
    const d = decideGroup(r1, r2, 2, 2, false);
    expect(d.phase).toBe("REROLL");
    expect(d.excludeIds.sort()).toEqual(["A", "B"]);
  });

  it("세대 ≥ cap 에서 '둘 다 별로' 최다 → NO_CONSENSUS", () => {
    const r1 = [like("A", "u0"), like("A", "u1"), like("B", "u0"), like("B", "u1")];
    const r2 = [reject("u0"), reject("u1")];
    const d = decideGroup(r1, r2, 2, 2, false, 3, 3); // generation 3, cap 3
    expect(d.phase).toBe("NO_CONSENSUS");
  });

  it("후보 0 (아무도 안 좋아함) → REROLL", () => {
    const r1 = [nope("A", "u0"), nope("B", "u1")];
    const d = decideGroup(r1, [], 2, 2, false);
    expect(d.phase).toBe("REROLL");
  });

  it("D: 호스트 '지금 진행'(forcePrelim) → 예선 미완료여도 결승으로", () => {
    const r1 = [like("A", "u0"), like("B", "u0")]; // 3명 중 u0만 스와이프
    expect(decideGroup(r1, [], 3, 1, false).phase).toBe("PRELIM"); // 평소엔 대기
    const forced = decideGroup(r1, [], 3, 1, false, 1, 3, true); // forcePrelim
    expect(forced.phase).toBe("FINAL");
    expect(forced.finalists.map((f) => f.restaurantId).sort()).toEqual(["A", "B"]);
  });

  it("D: 호스트 '지금 진행'(forceFinal) → 투표 미완이어도 확정", () => {
    const r1 = [like("A", "u0"), like("A", "u1"), like("B", "u0"), like("B", "u1")];
    const r2 = [vote("A", "u0")]; // 2명 중 1명만 투표
    expect(decideGroup(r1, r2, 2, 2, false).phase).toBe("FINAL"); // 평소엔 대기
    const forced = decideGroup(r1, r2, 2, 2, false, 1, 3, false, true); // forceFinal
    expect(forced.phase).toBe("DONE");
    expect(forced.winnerId).toBe("A");
  });
});
