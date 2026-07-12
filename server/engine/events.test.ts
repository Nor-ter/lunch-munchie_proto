import { describe, it, expect } from "vitest";
import { selectRecentStops, selectTodayStops } from "./events";

const now = new Date("2026-06-26T13:00:00").getTime();
const cat = (id: string) => ({ r1: "한식", r7: "전통찻집" } as Record<string, string>)[id] ?? null;

describe("selectTodayStops", () => {
  it("오늘·해당 유저의 WINNER만, 시간순으로, SURVEY 만족 조인", () => {
    const events = [
      { event_type: "WINNER", user_id: "u1", restaurant_id: "r1", created_at: new Date("2026-06-26T12:30:00") },
      { event_type: "WINNER", user_id: "u1", restaurant_id: "r7", created_at: new Date("2026-06-26T12:00:00") },
      { event_type: "SURVEY", user_id: "u1", restaurant_id: "r1", action: "POS" },
      { event_type: "WINNER", user_id: "u2", restaurant_id: "r1", created_at: new Date("2026-06-26T12:30:00") },
      { event_type: "WINNER", user_id: "u1", restaurant_id: "r1", created_at: new Date("2026-06-25T12:30:00") },
    ];
    const stops = selectTodayStops(events, "u1", now, cat);
    expect(stops.map((s) => s.restaurant_id)).toEqual(["r7", "r1"]);
    expect(stops[1].category).toBe("한식");
    expect(stops[1].satisfaction).toBe("POS");
    expect(stops[0].satisfaction).toBeNull();
  });
});

describe("selectRecentStops", () => {
  it("전체 WINNER 중 해당 사용자의 최신 여정을 최대 5개까지 만족도와 함께 반환", () => {
    const events: Array<Record<string, unknown>> = Array.from({ length: 7 }, (_, index) => ({
      event_type: "WINNER",
      user_id: "u1",
      restaurant_id: `r${index + 1}`,
      created_at: new Date(`2026-06-${20 + index}T12:00:00`),
    }));
    events.push({
      event_type: "SURVEY",
      user_id: "u1",
      restaurant_id: "r7",
      created_at: new Date("2026-06-27T13:00:00"),
      action: "POS",
    });
    events.push({
      event_type: "WINNER",
      user_id: "u2",
      restaurant_id: "r99",
      created_at: new Date("2026-06-28T12:00:00"),
    });

    const stops = selectRecentStops(events, "u1", 5, cat);
    expect(stops.map(stop => stop.restaurant_id)).toEqual(["r7", "r6", "r5", "r4", "r3"]);
    expect(stops[0].satisfaction).toBe("POS");
  });
});
