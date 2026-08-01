import { describe, expect, it, vi } from "vitest";
import {
  buildDeck,
  resolveApiRequestAuth,
  type Restaurant,
} from "./AppContext";

const configuredEnvironment = {
  VITE_SUPABASE_URL: "https://project.example.test",
  VITE_SUPABASE_PUBLISHABLE_KEY: "publishable-test-key",
};

const restaurant: Restaurant = {
  id: "restaurant-client-auth",
  name: "Auth Test Restaurant",
  category: "한식",
  tags: [],
  rating: 4.8,
  reviewCount: 25,
  distance: "500m",
  address: "Test Street",
  image: "https://example.test/restaurant.jpg",
  lat: -37.8,
  lng: 144.9,
  priceRange: 2,
  openHours: "09:00-21:00",
  dietary: [],
  description: "Client auth compatibility fixture",
};

const filters = {
  partySize: 2,
  dietary: [] as string[],
  budget: 2 as const,
  radius: 5,
  categories: [] as string[],
};

function createSessionClient(
  session: { access_token: string } | null,
  error: unknown = null,
) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session },
        error,
      }),
    },
  };
}

function createRecommendResponse(status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue({
      slate: [
        {
          id: restaurant.id,
          propensity: 1,
          rank: 0,
        },
      ],
      slate_id: "slate-client-auth",
      model_version: "test-model",
    }),
  } as unknown as Response;
}

describe("resolveApiRequestAuth", () => {
  it("returns an authenticated access token from the current session", async () => {
    const client = createSessionClient({
      access_token: "verified-access-token",
    });

    await expect(
      resolveApiRequestAuth({
        environment: configuredEnvironment,
        loadClient: async () => client,
      }),
    ).resolves.toEqual({
      status: "authenticated",
      accessToken: "verified-access-token",
    });
  });

  it("keeps the anonymous compatibility mode when no session exists", async () => {
    await expect(
      resolveApiRequestAuth({
        environment: configuredEnvironment,
        loadClient: async () => createSessionClient(null),
      }),
    ).resolves.toEqual({ status: "anonymous" });
  });

  it("keeps the anonymous compatibility mode when Supabase is unconfigured", async () => {
    const loadClient = vi.fn();

    await expect(
      resolveApiRequestAuth({
        environment: {},
        loadClient,
      }),
    ).resolves.toEqual({ status: "anonymous" });
    expect(loadClient).not.toHaveBeenCalled();
  });

  it.each([
    ["getSession error", async () => createSessionClient(null, new Error("session failed"))],
    [
      "getSession exception",
      async () => ({
        auth: {
          getSession: vi.fn().mockRejectedValue(new Error("session failed")),
        },
      }),
    ],
  ])("blocks API transport after a %s", async (_label, loadClient) => {
    await expect(
      resolveApiRequestAuth({
        environment: configuredEnvironment,
        loadClient,
      }),
    ).resolves.toEqual({ status: "blocked" });
  });
});

describe("buildDeck authenticated transport", () => {
  it("sends a Bearer token while preserving the existing request body", async () => {
    const request = vi.fn().mockResolvedValue(createRecommendResponse());

    await buildDeck(filters, [restaurant], "user_browser_preview", {
      resolveRequestAuth: async () => ({
        status: "authenticated",
        accessToken: "verified-access-token",
      }),
      request,
    });

    expect(request).toHaveBeenCalledTimes(1);
    const [url, init] = request.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/recommend");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer verified-access-token",
    });
    expect(JSON.parse(String(init.body))).toEqual(
      expect.objectContaining({
        candidate_ids: [restaurant.id],
        k: 7,
        slate_type: "PRELIM",
        user_id: "user_browser_preview",
      }),
    );
  });

  it("uses the existing anonymous request when no session exists or Supabase is unconfigured", async () => {
    for (const anonymousState of [
      { status: "anonymous" as const },
      { status: "anonymous" as const },
    ]) {
      const request = vi.fn().mockResolvedValue(createRecommendResponse());

      await buildDeck(filters, [restaurant], "user_browser_preview", {
        resolveRequestAuth: async () => anonymousState,
        request,
      });

      const [, init] = request.mock.calls[0] as [string, RequestInit];
      expect(init.headers).toEqual({
        "Content-Type": "application/json",
      });
    }
  });

  it("does not send an anonymous request when session lookup is blocked", async () => {
    const request = vi.fn();

    const result = await buildDeck(
      filters,
      [restaurant],
      "user_browser_preview",
      {
        resolveRequestAuth: async () => ({ status: "blocked" }),
        request,
      },
    );

    expect(request).not.toHaveBeenCalled();
    expect(result.restaurants).toEqual([restaurant]);
  });

  it.each([401, 503])(
    "does not retry anonymously after an authenticated %s",
    async (status) => {
      const request = vi.fn().mockResolvedValue(createRecommendResponse(status));

      const result = await buildDeck(
        filters,
        [restaurant],
        "user_browser_preview",
        {
          resolveRequestAuth: async () => ({
            status: "authenticated",
            accessToken: "verified-access-token",
          }),
          request,
        },
      );

      expect(request).toHaveBeenCalledTimes(1);
      expect(result.restaurants).toEqual([restaurant]);
    },
  );

  it("does not retry anonymously after an authenticated network failure", async () => {
    const request = vi.fn().mockRejectedValue(new Error("network failed"));

    const result = await buildDeck(
      filters,
      [restaurant],
      "user_browser_preview",
      {
        resolveRequestAuth: async () => ({
          status: "authenticated",
          accessToken: "verified-access-token",
        }),
        request,
      },
    );

    expect(request).toHaveBeenCalledTimes(1);
    expect(result.restaurants).toEqual([restaurant]);
  });
});
