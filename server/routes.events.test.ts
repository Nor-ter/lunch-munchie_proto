import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import type { RecEventInput } from "../shared/engine";
import type {
  SupabaseRequestAuthResult,
  SupabaseRequestAuthVerifier,
} from "./auth/supabaseAuth";
import { createEventsHandler } from "./routes";

function createRequest(
  body: unknown,
  authorizationHeader?: string,
): Request {
  return {
    body,
    get: vi.fn((headerName: string) =>
      headerName.toLowerCase() === "authorization"
        ? authorizationHeader
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

function createEvent(overrides: Partial<RecEventInput> = {}): RecEventInput {
  return {
    event_type: "IMPRESSION",
    user_id: "user_browser_preview",
    session_id: "session-preview",
    restaurant_id: "restaurant-not-in-feature-cache",
    context: {
      source: "compatibility-test",
    },
    ...overrides,
  };
}

describe("POST /api/events compatibility auth", () => {
  it("keeps the existing body user_id and response when Authorization is absent", async () => {
    const event = createEvent();
    const body = {
      events: [event],
    };
    const verifyAuth = createVerifier({
      status: "missing_authorization",
      userId: null,
    });
    const persistEvents = vi.fn().mockResolvedValue({
      inserted: 1,
      fallback: "memory",
    });
    const handler = createEventsHandler({ verifyAuth, persistEvents });
    const response = createResponse();

    await handler(createRequest(body), response);

    expect(verifyAuth).toHaveBeenCalledWith(undefined);
    expect(persistEvents).toHaveBeenCalledWith([event]);
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith({
      inserted: 1,
      fallback: "memory",
    });
  });

  it("overrides a forged body user_id with the verified Auth UID without mutating req.body", async () => {
    const event = createEvent({
      user_id: "user_forged",
      session_id: "session-kept",
    });
    const body = {
      events: [event],
    };
    const verifyAuth = createVerifier({
      status: "authenticated",
      userId: "auth-verified-uid",
    });
    const persistEvents = vi.fn().mockResolvedValue({ inserted: 1 });
    const handler = createEventsHandler({ verifyAuth, persistEvents });
    const response = createResponse();

    await handler(
      createRequest(body, "Bearer verified-access-token"),
      response,
    );

    expect(persistEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: "auth-verified-uid",
        session_id: "session-kept",
        restaurant_id: event.restaurant_id,
        context: event.context,
      }),
    ]);
    expect(body.events[0].user_id).toBe("user_forged");
    expect(response.status).toHaveBeenCalledWith(201);
  });

  it("adds the verified Auth UID when a single event body has no user_id", async () => {
    const event = createEvent();
    delete event.user_id;
    const verifyAuth = createVerifier({
      status: "authenticated",
      userId: "auth-verified-uid",
    });
    const persistEvents = vi.fn().mockResolvedValue({ inserted: 1 });
    const handler = createEventsHandler({ verifyAuth, persistEvents });
    const response = createResponse();

    await handler(
      createRequest(event, "Bearer verified-access-token"),
      response,
    );

    expect(persistEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: "auth-verified-uid",
        session_id: "session-preview",
      }),
    ]);
    expect(event.user_id).toBeUndefined();
  });

  it.each([
    ["malformed_authorization", "Bearer malformed-token"],
    ["invalid_token", "Bearer invalid-token"],
  ] as const)(
    "returns 401 and does not persist for %s",
    async (status, authorizationHeader) => {
      const verifyAuth = createVerifier({
        status,
        userId: null,
      });
      const persistEvents = vi.fn();
      const handler = createEventsHandler({ verifyAuth, persistEvents });
      const response = createResponse();

      await handler(
        createRequest(createEvent(), authorizationHeader),
        response,
      );

      expect(response.status).toHaveBeenCalledWith(401);
      expect(response.json).toHaveBeenCalledWith({
        error: "invalid_authorization",
      });
      expect(persistEvents).not.toHaveBeenCalled();
    },
  );

  it("returns 503 and does not persist when server Supabase auth is unconfigured", async () => {
    const verifyAuth = createVerifier({
      status: "unconfigured",
      userId: null,
    });
    const persistEvents = vi.fn();
    const handler = createEventsHandler({ verifyAuth, persistEvents });
    const response = createResponse();

    await handler(
      createRequest(createEvent(), "Bearer access-token"),
      response,
    );

    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({
      error: "auth_unavailable",
    });
    expect(persistEvents).not.toHaveBeenCalled();
  });

  it("does not expose a token or key in an auth failure response or logs", async () => {
    const token = "sensitive-access-token";
    const key = "sensitive-publishable-key";
    const verifyAuth = vi
      .fn()
      .mockRejectedValue(new Error(`failure: ${token} ${key}`));
    const persistEvents = vi.fn();
    const handler = createEventsHandler({ verifyAuth, persistEvents });
    const response = createResponse();
    const consoleSpies = [
      vi.spyOn(console, "error").mockImplementation(() => undefined),
      vi.spyOn(console, "warn").mockImplementation(() => undefined),
      vi.spyOn(console, "log").mockImplementation(() => undefined),
    ];

    try {
      await handler(
        createRequest(createEvent(), `Bearer ${token}`),
        response,
      );

      const serializedResponse = JSON.stringify(response.json.mock.calls);
      const serializedLogs = JSON.stringify(
        consoleSpies.flatMap((spy) => spy.mock.calls),
      );

      expect(response.status).toHaveBeenCalledWith(401);
      expect(serializedResponse).not.toContain(token);
      expect(serializedResponse).not.toContain(key);
      expect(serializedLogs).not.toContain(token);
      expect(serializedLogs).not.toContain(key);
      expect(persistEvents).not.toHaveBeenCalled();
    } finally {
      consoleSpies.forEach((spy) => spy.mockRestore());
    }
  });
});
