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
