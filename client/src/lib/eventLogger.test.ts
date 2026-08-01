import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RecEventInput } from "@shared/engine";

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));

vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
}));

const configuredEnvironment = {
  VITE_SUPABASE_URL: "https://example.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key",
};

function configureSupabaseEnvironment(): void {
  vi.stubEnv("VITE_SUPABASE_URL", configuredEnvironment.VITE_SUPABASE_URL);
  vi.stubEnv(
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    configuredEnvironment.VITE_SUPABASE_PUBLISHABLE_KEY,
  );
}

function createEvent(
  overrides: Partial<RecEventInput> = {},
): RecEventInput {
  return {
    event_type: "IMPRESSION",
    user_id: "user_browser_preview",
    session_id: "session-preview",
    restaurant_id: "restaurant-preview",
    ...overrides,
  };
}

async function loadEventLogger() {
  return import("./eventLogger");
}

async function flushOneEvent(event: RecEventInput): Promise<void> {
  const { flushEvents, logEvent } = await loadEventLogger();
  logEvent(event);
  flushEvents();
}

beforeEach(() => {
  vi.resetModules();
  getSessionMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("eventLogger auth transport", () => {
  it("uses fetch with a Bearer token and never sendBeacon when a session exists", async () => {
    configureSupabaseEnvironment();
    const token = "authenticated-access-token";
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: token,
        },
      },
      error: null,
    });
    const sendBeacon = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
    });
    vi.stubGlobal("navigator", { sendBeacon });
    vi.stubGlobal("fetch", fetchMock);
    const event = createEvent();

    await flushOneEvent(event);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: expect.stringContaining('"idempotency_key"'),
      keepalive: true,
    });
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it("keeps the existing sendBeacon path and body user_id when no session exists", async () => {
    configureSupabaseEnvironment();
    getSessionMock.mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    });
    const sendBeacon = vi.fn().mockReturnValue(true);
    const fetchMock = vi.fn();
    vi.stubGlobal("navigator", { sendBeacon });
    vi.stubGlobal("fetch", fetchMock);
    const event = createEvent({
      user_id: "user_legacy_compatible",
    });

    await flushOneEvent(event);

    await vi.waitFor(() => expect(sendBeacon).toHaveBeenCalledTimes(1));
    expect(sendBeacon.mock.calls[0][0]).toBe("/api/events");
    const payload = JSON.parse(await (sendBeacon.mock.calls[0][1] as Blob).text());
    expect(payload.events[0]).toMatchObject(event);
    expect(payload.events[0].idempotency_key).toEqual(expect.any(String));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the anonymous sendBeacon path when Supabase is unconfigured", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    const sendBeacon = vi.fn().mockReturnValue(true);
    const fetchMock = vi.fn();
    vi.stubGlobal("navigator", { sendBeacon });
    vi.stubGlobal("fetch", fetchMock);

    await flushOneEvent(createEvent());

    await vi.waitFor(() => expect(sendBeacon).toHaveBeenCalledTimes(1));
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not downgrade to anonymous transport when getSession returns an error", async () => {
    configureSupabaseEnvironment();
    getSessionMock.mockResolvedValue({
      data: {
        session: null,
      },
      error: new Error("session lookup failed"),
    });
    const sendBeacon = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal("navigator", { sendBeacon });
    vi.stubGlobal("fetch", fetchMock);

    await flushOneEvent(createEvent());

    await vi.waitFor(() => expect(getSessionMock).toHaveBeenCalledTimes(1));
    expect(sendBeacon).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not retry a 401 authenticated fetch through sendBeacon", async () => {
    configureSupabaseEnvironment();
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: "rejected-access-token",
        },
      },
      error: null,
    });
    const sendBeacon = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });
    vi.stubGlobal("navigator", { sendBeacon });
    vi.stubGlobal("fetch", fetchMock);

    await flushOneEvent(createEvent());

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it("does not duplicate an authenticated event after a network failure", async () => {
    configureSupabaseEnvironment();
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: "network-failure-access-token",
        },
      },
      error: null,
    });
    const sendBeacon = vi.fn();
    const fetchMock = vi.fn().mockRejectedValue(new Error("network failed"));
    vi.stubGlobal("navigator", { sendBeacon });
    vi.stubGlobal("fetch", fetchMock);

    await flushOneEvent(createEvent());

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it("preserves batched event bodies on the authenticated fetch path", async () => {
    configureSupabaseEnvironment();
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: "batch-access-token",
        },
      },
      error: null,
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
    });
    vi.stubGlobal("navigator", { sendBeacon: vi.fn() });
    vi.stubGlobal("fetch", fetchMock);
    const firstEvent = createEvent({
      restaurant_id: "restaurant-one",
    });
    const secondEvent = createEvent({
      event_type: "WINNER",
      restaurant_id: "restaurant-two",
    });
    const { flushEvents, logEvent } = await loadEventLogger();

    logEvent(firstEvent);
    logEvent(secondEvent);
    flushEvents();

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(String(request.body));
    expect(payload.events).toHaveLength(2);
    expect(payload.events[0]).toMatchObject(firstEvent);
    expect(payload.events[1]).toMatchObject(secondEvent);
    expect(payload.events.map((event: RecEventInput) => event.idempotency_key)).toEqual([
      expect.any(String), expect.any(String),
    ]);
  });

  it("does not expose an access token through console output on transport failure", async () => {
    configureSupabaseEnvironment();
    const token = "sensitive-access-token";
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: token,
        },
      },
      error: null,
    });
    const fetchMock = vi.fn().mockRejectedValue(
      new Error(`request failed with ${token}`),
    );
    const consoleSpies = [
      vi.spyOn(console, "error").mockImplementation(() => undefined),
      vi.spyOn(console, "warn").mockImplementation(() => undefined),
      vi.spyOn(console, "log").mockImplementation(() => undefined),
    ];
    vi.stubGlobal("navigator", { sendBeacon: vi.fn() });
    vi.stubGlobal("fetch", fetchMock);

    try {
      await flushOneEvent(createEvent());
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      const serializedLogs = JSON.stringify(
        consoleSpies.flatMap((spy) => spy.mock.calls),
      );
      expect(serializedLogs).not.toContain(token);
    } finally {
      consoleSpies.forEach((spy) => spy.mockRestore());
    }
  });
});
