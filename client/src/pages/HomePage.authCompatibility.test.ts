import { describe, expect, it, vi } from "vitest";
import { fetchTodayJourney } from "./HomePage";

function createJourneyResponse(
  status = 200,
  stops = [
    {
      restaurant_id: "restaurant-journey-auth",
      name: "Journey Auth Restaurant",
      category: "한식",
      intent: "meal",
      at: 1_750_000_000_000,
      satisfaction: null,
    },
  ],
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue({ stops }),
  } as unknown as Response;
}

describe("fetchTodayJourney auth compatibility", () => {
  it("adds a Bearer token while preserving the legacy query structure", async () => {
    const request = vi.fn().mockResolvedValue(createJourneyResponse());

    const stops = await fetchTodayJourney("user_browser_preview", {
      resolveRequestAuth: async () => ({
        status: "authenticated",
        accessToken: "verified-access-token",
      }),
      request,
    });

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(
      "/api/journey/today?userId=user_browser_preview",
      {
        headers: {
          Authorization: "Bearer verified-access-token",
        },
      },
    );
    expect(stops).toHaveLength(1);
  });

  it("keeps the existing anonymous request when no session exists or Supabase is unconfigured", async () => {
    for (const anonymousState of [
      { status: "anonymous" as const },
      { status: "anonymous" as const },
    ]) {
      const request = vi.fn().mockResolvedValue(createJourneyResponse());

      await fetchTodayJourney("user_browser_preview", {
        resolveRequestAuth: async () => anonymousState,
        request,
      });

      expect(request).toHaveBeenCalledWith(
        "/api/journey/today?userId=user_browser_preview",
        undefined,
      );
    }
  });

  it("does not send an anonymous request when session lookup is blocked", async () => {
    const request = vi.fn();

    const stops = await fetchTodayJourney("user_browser_preview", {
      resolveRequestAuth: async () => ({ status: "blocked" }),
      request,
    });

    expect(request).not.toHaveBeenCalled();
    expect(stops).toEqual([]);
  });

  it.each([401, 503])(
    "does not retry anonymously after an authenticated %s",
    async (status) => {
      const request = vi.fn().mockResolvedValue(createJourneyResponse(status));

      const stops = await fetchTodayJourney("user_browser_preview", {
        resolveRequestAuth: async () => ({
          status: "authenticated",
          accessToken: "verified-access-token",
        }),
        request,
      });

      expect(request).toHaveBeenCalledTimes(1);
      expect(stops).toEqual([]);
    },
  );

  it("does not retry or crash after an authenticated network failure", async () => {
    const request = vi.fn().mockRejectedValue(new Error("network failed"));

    const stops = await fetchTodayJourney("user_browser_preview", {
      resolveRequestAuth: async () => ({
        status: "authenticated",
        accessToken: "verified-access-token",
      }),
      request,
    });

    expect(request).toHaveBeenCalledTimes(1);
    expect(stops).toEqual([]);
  });
});
