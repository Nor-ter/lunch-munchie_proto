import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import type { Candidate, RecEventInput } from "../shared/engine";
import type {
  SupabaseRequestAuthResult,
  SupabaseRequestAuthVerifier,
} from "./auth/supabaseAuth";
import {
  createJourneyHistoryHandler,
  createJourneyTodayHandler,
  createRecommendHandler,
} from "./routes";

function createRequest(options: {
  body?: unknown;
  query?: Record<string, unknown>;
  authorizationHeader?: string;
}): Request {
  return {
    body: options.body,
    query: options.query ?? {},
    get: vi.fn((headerName: string) =>
      headerName.toLowerCase() === "authorization"
        ? options.authorizationHeader
        : undefined,
    ),
  } as unknown as Request;
}

function createResponse() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

function createVerifier(
  result: SupabaseRequestAuthResult,
): SupabaseRequestAuthVerifier {
  return vi.fn().mockResolvedValue(result);
}

const candidate: Candidate = {
  id: "restaurant-auth-compatibility",
  rating: 4.8,
  review_count: 25,
  price_level: 2,
  category: "한식",
  dietary_options: [],
};

function createRecommendDependencies(
  verifyAuth: SupabaseRequestAuthVerifier,
) {
  return {
    verifyAuth,
    enrichRequestContext: vi.fn(async (context) => context),
    loadCandidates: vi.fn(async () => [candidate]),
    persistEvents: vi.fn(async () => ({ inserted: 1 })),
  };
}

function createRecommendRequest(
  userId: string,
  authorizationHeader?: string,
) {
  return createRequest({
    body: {
      user_id: userId,
      variant: "control",
      k: 1,
      candidate_ids: [candidate.id],
      context: {
        intent: "meal",
      },
    },
    authorizationHeader,
  });
}

describe("POST /api/recommend compatibility auth", () => {
  it("keeps the legacy body user_id when Authorization is absent", async () => {
    const dependencies = createRecommendDependencies(
      createVerifier({
        status: "missing_authorization",
        userId: null,
      }),
    );
    const response = createResponse();

    await createRecommendHandler(dependencies)(
      createRecommendRequest("user_browser_preview"),
      response,
    );

    const persisted = dependencies.persistEvents.mock.calls[0][0] as RecEventInput[];
    expect(persisted).toHaveLength(1);
    expect(persisted[0].user_id).toBe("user_browser_preview");
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        slate: [expect.objectContaining({ id: candidate.id })],
      }),
    );
  });

  it("uses the verified Auth UID for recommendation and IMPRESSION without mutating the body", async () => {
    const dependencies = createRecommendDependencies(
      createVerifier({
        status: "authenticated",
        userId: "auth-verified-uid",
      }),
    );
    const request = createRecommendRequest(
      "user_forged",
      "Bearer verified-access-token",
    );
    const response = createResponse();

    await createRecommendHandler(dependencies)(request, response);

    const persisted = dependencies.persistEvents.mock.calls[0][0] as RecEventInput[];
    expect(persisted[0].user_id).toBe("auth-verified-uid");
    expect(request.body.user_id).toBe("user_forged");
  });

  it.each([
    ["malformed_authorization", "Bearer malformed-token"],
    ["invalid_token", "Bearer invalid-token"],
  ] as const)(
    "returns 401 and does not recommend or persist for %s",
    async (status, authorizationHeader) => {
      const dependencies = createRecommendDependencies(
        createVerifier({ status, userId: null }),
      );
      const response = createResponse();

      await createRecommendHandler(dependencies)(
        createRecommendRequest("user_forged", authorizationHeader),
        response,
      );

      expect(response.status).toHaveBeenCalledWith(401);
      expect(response.json).toHaveBeenCalledWith({
        error: "invalid_authorization",
      });
      expect(dependencies.enrichRequestContext).not.toHaveBeenCalled();
      expect(dependencies.loadCandidates).not.toHaveBeenCalled();
      expect(dependencies.persistEvents).not.toHaveBeenCalled();
    },
  );

  it("returns 503 before recommendation work when server auth is unavailable", async () => {
    const dependencies = createRecommendDependencies(
      createVerifier({
        status: "unconfigured",
        userId: null,
      }),
    );
    const response = createResponse();

    await createRecommendHandler(dependencies)(
      createRecommendRequest("user_forged", "Bearer access-token"),
      response,
    );

    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({ error: "auth_unavailable" });
    expect(dependencies.enrichRequestContext).not.toHaveBeenCalled();
    expect(dependencies.loadCandidates).not.toHaveBeenCalled();
    expect(dependencies.persistEvents).not.toHaveBeenCalled();
  });

  it("does not expose verifier errors, tokens, or keys", async () => {
    const token = "sensitive-access-token";
    const key = "sensitive-publishable-key";
    const dependencies = createRecommendDependencies(
      vi.fn().mockRejectedValue(new Error(`${token}:${key}`)),
    );
    const response = createResponse();
    const consoleSpies = [
      vi.spyOn(console, "error").mockImplementation(() => undefined),
      vi.spyOn(console, "warn").mockImplementation(() => undefined),
      vi.spyOn(console, "log").mockImplementation(() => undefined),
    ];

    try {
      await createRecommendHandler(dependencies)(
        createRecommendRequest("user_forged", `Bearer ${token}`),
        response,
      );

      expect(response.status).toHaveBeenCalledWith(401);
      expect(JSON.stringify(response.json.mock.calls)).not.toContain(token);
      expect(JSON.stringify(response.json.mock.calls)).not.toContain(key);
      expect(
        JSON.stringify(consoleSpies.flatMap((spy) => spy.mock.calls)),
      ).not.toContain(token);
      expect(
        JSON.stringify(consoleSpies.flatMap((spy) => spy.mock.calls)),
      ).not.toContain(key);
      expect(dependencies.persistEvents).not.toHaveBeenCalled();
    } finally {
      consoleSpies.forEach((spy) => spy.mockRestore());
    }
  });
});

describe("GET /api/journey compatibility auth", () => {
  function createTodayDependencies(
    verifyAuth: SupabaseRequestAuthVerifier,
  ) {
    return {
      verifyAuth,
      loadTodayStops: vi.fn(async () => []),
      loadRestaurantNames: vi.fn(async () => new Map<string, string>()),
      loadCandidates: vi.fn(async () => [candidate]),
    };
  }

  function createHistoryDependencies(
    verifyAuth: SupabaseRequestAuthVerifier,
  ) {
    return {
      verifyAuth,
      loadRecentStops: vi.fn(async () => []),
    };
  }

  it("keeps the legacy query userId for today and history without Authorization", async () => {
    const verifyAuth = createVerifier({
      status: "missing_authorization",
      userId: null,
    });
    const today = createTodayDependencies(verifyAuth);
    const history = createHistoryDependencies(verifyAuth);

    await createJourneyTodayHandler(today)(
      createRequest({ query: { userId: "user_browser_preview" } }),
      createResponse(),
    );
    await createJourneyHistoryHandler(history)(
      createRequest({
        query: { userId: "user_browser_preview", limit: "3" },
      }),
      createResponse(),
    );

    expect(today.loadTodayStops).toHaveBeenCalledWith(
      "user_browser_preview",
      expect.any(Number),
    );
    expect(history.loadRecentStops).toHaveBeenCalledWith(
      "user_browser_preview",
      3,
    );
  });

  it("uses the verified Auth UID instead of a forged query userId", async () => {
    const verifyAuth = createVerifier({
      status: "authenticated",
      userId: "auth-verified-uid",
    });
    const today = createTodayDependencies(verifyAuth);
    const history = createHistoryDependencies(verifyAuth);
    const authorizationHeader = "Bearer verified-access-token";

    await createJourneyTodayHandler(today)(
      createRequest({
        query: { userId: "user_forged" },
        authorizationHeader,
      }),
      createResponse(),
    );
    await createJourneyHistoryHandler(history)(
      createRequest({
        query: { userId: "user_forged" },
        authorizationHeader,
      }),
      createResponse(),
    );

    expect(today.loadTodayStops).toHaveBeenCalledWith(
      "auth-verified-uid",
      expect.any(Number),
    );
    expect(history.loadRecentStops).toHaveBeenCalledWith(
      "auth-verified-uid",
      5,
    );
  });

  it.each([
    ["today", createJourneyTodayHandler],
    ["history", createJourneyHistoryHandler],
  ] as const)("does not query %s for an invalid token", async (_name, route) => {
    const verifyAuth = createVerifier({
      status: "invalid_token",
      userId: null,
    });
    const response = createResponse();

    if (route === createJourneyTodayHandler) {
      const dependencies = createTodayDependencies(verifyAuth);
      await route(dependencies)(
        createRequest({
          query: { userId: "user_forged" },
          authorizationHeader: "Bearer invalid-token",
        }),
        response,
      );
      expect(dependencies.loadTodayStops).not.toHaveBeenCalled();
    } else {
      const dependencies = createHistoryDependencies(verifyAuth);
      await route(dependencies)(
        createRequest({
          query: { userId: "user_forged" },
          authorizationHeader: "Bearer invalid-token",
        }),
        response,
      );
      expect(dependencies.loadRecentStops).not.toHaveBeenCalled();
    }

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      error: "invalid_authorization",
    });
  });

  it("returns 503 without querying journey data when auth is unavailable", async () => {
    const dependencies = createTodayDependencies(
      createVerifier({
        status: "unconfigured",
        userId: null,
      }),
    );
    const response = createResponse();

    await createJourneyTodayHandler(dependencies)(
      createRequest({
        query: { userId: "user_forged" },
        authorizationHeader: "Bearer access-token",
      }),
      response,
    );

    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({ error: "auth_unavailable" });
    expect(dependencies.loadTodayStops).not.toHaveBeenCalled();
    expect(dependencies.loadRestaurantNames).not.toHaveBeenCalled();
  });
});
