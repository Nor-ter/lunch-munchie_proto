import { describe, expect, it, vi } from "vitest";
import { app, type EnvBindings } from "./[[path]]";

function createDb() {
  return {
    prepare: vi.fn((query: string) => {
      const statement = {
        bind: vi.fn(() => statement),
        all: vi.fn(async () => {
          if (query.startsWith("PRAGMA table_info(users)")) {
            return {
              results: [
                { name: "id" },
                { name: "username" },
                { name: "profile_image_url" },
                { name: "created_at" },
              ],
            };
          }
          return { results: [] };
        }),
        first: vi.fn(async () => null),
        run: vi.fn(async () => ({ success: true })),
      };
      return statement;
    }),
  };
}

function createEnv(db = createDb()): EnvBindings {
  return {
    DB: db,
    PHOTOS_R2: {},
    USER_DO: {},
    SESSION_DO: {},
    GOOGLE_CLIENT_ID: "test-client-id",
    GOOGLE_CLIENT_SECRET: "test-client-secret",
    AUTH_SESSION_SECRET: "test-session-secret",
  };
}

describe("Google OAuth callback", () => {
  it("creates a login session when Google profile has no picture", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async (input) => {
        const url = String(input);
        if (url === "https://oauth2.googleapis.com/token") {
          return Response.json({ access_token: "test-token" });
        }
        if (url === "https://openidconnect.googleapis.com/v1/userinfo") {
          return Response.json({
            sub: "google-user-without-picture",
            email: "no-picture@example.com",
            name: "No Picture",
          });
        }
        return new Response("unexpected fetch", { status: 500 });
      },
    );

    try {
      const response = await app.request(
        "http://localhost/api/auth/google/callback?code=test-code&state=test-state.L3Byb2ZpbGU",
        { headers: { cookie: "lm_oauth_state=test-state" } },
        createEnv(),
      );

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe("/profile");
      expect(response.headers.get("set-cookie")).toContain("lm_session=");
    } finally {
      fetchMock.mockRestore();
    }
  });
});
