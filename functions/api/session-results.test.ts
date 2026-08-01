import { describe, expect, it } from "vitest";
import { sessionResults } from "./[[path]]";

const session = {
  id: "session-1", host_user_id: "host", share_token: "ABC123", group_size: 2,
  filter_distance: 1000, filter_budget: 2, filter_categories: "[]", filter_dietary: "[]",
  status: "SWIPING_1", deadline_at: Date.now() + 60_000, created_at: Date.now(),
};
const members = [
  { user_id: "host", user_name: "Host", emoji: "🧑" },
  { user_id: "guest", user_name: "Guest", emoji: "🍜" },
];
const restaurants = [{ id: "A", category: "한식" }, { id: "B", category: "카페" }];
const row = (user_id: string, restaurant_id: string, round: number, swipe_action = "LIKE") => ({
  session_id: session.id, user_id, restaurant_id, round, swipe_action, created_at: Date.now(),
});

describe("shared-session results", () => {
  it("tracks each completed member, enters FINAL, then unlocks DONE after every final vote", () => {
    const prelim = [
      row("host", "__deck_size__:2", 1, "SYSTEM"), row("guest", "__deck_size__:2", 1, "SYSTEM"),
      row("host", "A", 1), row("host", "B", 1), row("host", "__prelim_done__", 1, "SYSTEM"),
      row("guest", "A", 1), row("guest", "B", 1), row("guest", "__prelim_done__", 1, "SYSTEM"),
    ];
    const oneCompleted = sessionResults(session, members, prelim.filter(swipe => swipe.user_id !== "guest"), restaurants);
    expect(oneCompleted.phase).toBe("PRELIM");
    expect(oneCompleted.completedCount).toBe(1);
    expect(oneCompleted.memberCompletion.find(member => member.id === "host")?.completed).toBe(true);
    expect(oneCompleted.memberCompletion.find(member => member.id === "guest")?.completed).toBe(false);

    const pendingFinal = sessionResults(session, members, prelim, restaurants);
    expect(pendingFinal.completedCount).toBe(2);
    expect(pendingFinal.phase).toBe("FINAL");
    expect(pendingFinal.memberCompletion.every(member => !member.completed)).toBe(true);

    const decided = sessionResults(session, members, [...prelim, row("host", "A", 2), row("guest", "A", 2)], restaurants);
    expect(decided.finalVotedCount).toBe(2);
    expect(decided.phase).toBe("DONE");
    expect(decided.winnerId).toBe("A");
  });
});
