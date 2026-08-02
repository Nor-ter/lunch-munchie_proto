import { describe, expect, it, vi } from "vitest";
import { fetchJourneyHistory } from "./HomePage";

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

describe("fetchJourneyHistory session compatibility", () => {
  it("uses the canonical 30-day journey endpoint with the Google session cookie", async () => {
    const request = vi.fn().mockResolvedValue(createJourneyResponse());

    const stops = await fetchJourneyHistory({ request });

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(
      "/api/journey?days=30",
      { credentials: "same-origin" },
    );
    expect(stops).toHaveLength(1);
  });

  it.each([401, 503])(
    "returns no server stops after an HTTP %s",
    async (status) => {
      const request = vi.fn().mockResolvedValue(createJourneyResponse(status));

      const stops = await fetchJourneyHistory({ request });

      expect(request).toHaveBeenCalledTimes(1);
      expect(stops).toEqual([]);
    },
  );

  it("does not retry or crash after a network failure", async () => {
    const request = vi.fn().mockRejectedValue(new Error("network failed"));

    const stops = await fetchJourneyHistory({ request });

    expect(request).toHaveBeenCalledTimes(1);
    expect(stops).toEqual([]);
  });

  it("returns an empty list when the journey payload has no stops", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    } as unknown as Response);

    await expect(fetchJourneyHistory({ request })).resolves.toEqual([]);
  });

  it("returns an empty list when the journey response cannot be decoded", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockRejectedValue(new Error("invalid JSON")),
    } as unknown as Response);

    await expect(fetchJourneyHistory({ request })).resolves.toEqual([]);
  });
});
