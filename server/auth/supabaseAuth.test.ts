import { describe, expect, it, vi } from "vitest";
import {
  createSupabaseRequestAuthVerifier,
  type SupabaseAuthClient,
} from "./supabaseAuth";

const configuredEnvironment = {
  SUPABASE_URL: "https://example.supabase.co/",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key",
};

function createAuthClient(
  getUser: SupabaseAuthClient["auth"]["getUser"],
): SupabaseAuthClient {
  return {
    auth: {
      getUser,
    },
  };
}

describe("createSupabaseRequestAuthVerifier", () => {
  it("reports a missing Authorization header without creating a client", async () => {
    const clientFactory = vi.fn();
    const verify = createSupabaseRequestAuthVerifier({
      environment: configuredEnvironment,
      clientFactory,
    });

    await expect(verify(undefined)).resolves.toEqual({
      status: "missing_authorization",
      userId: null,
    });
    expect(clientFactory).not.toHaveBeenCalled();
  });

  it.each([
    "",
    "Basic credentials",
    "Bearer",
    "Bearer ",
    "Bearer first second",
  ])("rejects a malformed Authorization header: %j", async (header) => {
    const clientFactory = vi.fn();
    const verify = createSupabaseRequestAuthVerifier({
      environment: configuredEnvironment,
      clientFactory,
    });

    await expect(verify(header)).resolves.toEqual({
      status: "malformed_authorization",
      userId: null,
    });
    expect(clientFactory).not.toHaveBeenCalled();
  });

  it("returns only the verified Supabase user ID for a valid token", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "verified-auth-user",
          email: "not-returned@example.com",
        },
      },
      error: null,
    });
    const clientFactory = vi.fn(() => createAuthClient(getUser));
    const verify = createSupabaseRequestAuthVerifier({
      environment: configuredEnvironment,
      clientFactory,
    });

    await expect(verify("Bearer valid-access-token")).resolves.toEqual({
      status: "authenticated",
      userId: "verified-auth-user",
    });
    expect(clientFactory).toHaveBeenCalledTimes(1);
    expect(clientFactory).toHaveBeenCalledWith(
      "https://example.supabase.co",
      configuredEnvironment.SUPABASE_PUBLISHABLE_KEY,
    );
    expect(getUser).toHaveBeenCalledWith("valid-access-token");
  });

  it.each(["expired", "invalid"])(
    "maps an %s token rejected by Supabase Auth to invalid_token",
    async () => {
      const getUser = vi.fn().mockResolvedValue({
        data: {
          user: null,
        },
        error: new Error("Supabase rejected the token"),
      });
      const verify = createSupabaseRequestAuthVerifier({
        environment: configuredEnvironment,
        clientFactory: () => createAuthClient(getUser),
      });

      await expect(verify("Bearer rejected-access-token")).resolves.toEqual({
        status: "invalid_token",
        userId: null,
      });
    },
  );

  it("reports missing or invalid server configuration", async () => {
    const clientFactory = vi.fn();

    for (const environment of [
      {},
      {
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: " ",
      },
      {
        SUPABASE_URL: "not-a-url",
        SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key",
      },
    ]) {
      const verify = createSupabaseRequestAuthVerifier({
        environment,
        clientFactory,
      });

      await expect(verify("Bearer access-token")).resolves.toEqual({
        status: "unconfigured",
        userId: null,
      });
    }

    expect(clientFactory).not.toHaveBeenCalled();
  });

  it("does not expose a token or publishable key when verification throws", async () => {
    const token = "sensitive-access-token";
    const publishableKey = "sensitive-publishable-key";
    const verify = createSupabaseRequestAuthVerifier({
      environment: {
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: publishableKey,
      },
      clientFactory: () => {
        throw new Error(`failed with ${token} and ${publishableKey}`);
      },
    });

    const result = await verify(`Bearer ${token}`);
    const serializedResult = JSON.stringify(result);

    expect(result).toEqual({
      status: "invalid_token",
      userId: null,
    });
    expect(serializedResult).not.toContain(token);
    expect(serializedResult).not.toContain(publishableKey);
  });

  it("reuses one server auth client without duplicating verification state", async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: "verified-auth-user",
        },
      },
      error: null,
    });
    const clientFactory = vi.fn(() => createAuthClient(getUser));
    const verify = createSupabaseRequestAuthVerifier({
      environment: configuredEnvironment,
      clientFactory,
    });

    await verify("Bearer first-token");
    await verify("Bearer second-token");

    expect(clientFactory).toHaveBeenCalledTimes(1);
    expect(getUser).toHaveBeenNthCalledWith(1, "first-token");
    expect(getUser).toHaveBeenNthCalledWith(2, "second-token");
  });
});
