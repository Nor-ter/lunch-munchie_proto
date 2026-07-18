import { createClient } from "@supabase/supabase-js";

export type SupabaseRequestAuthResult =
  | {
      status: "authenticated";
      userId: string;
    }
  | {
      status:
        | "missing_authorization"
        | "malformed_authorization"
        | "invalid_token"
        | "unconfigured";
      userId: null;
    };

export type SupabaseRequestAuthVerifier = (
  authorizationHeader: string | undefined,
) => Promise<SupabaseRequestAuthResult>;

export interface SupabaseAuthEnvironment {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
}

export interface SupabaseAuthClient {
  auth: {
    getUser: (token: string) => Promise<{
      data: {
        user: {
          id: string;
        } | null;
      };
      error: unknown;
    }>;
  };
}

export interface SupabaseAuthVerifierOptions {
  environment?: SupabaseAuthEnvironment;
  clientFactory?: (
    supabaseUrl: string,
    publishableKey: string,
  ) => SupabaseAuthClient;
}

interface SupabaseAuthConfiguration {
  supabaseUrl: string;
  publishableKey: string;
}

function readSupabaseAuthConfiguration(
  environment: SupabaseAuthEnvironment,
): SupabaseAuthConfiguration | null {
  const supabaseUrl = environment.SUPABASE_URL?.trim();
  const publishableKey = environment.SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!supabaseUrl || !publishableKey) {
    return null;
  }

  try {
    const parsedUrl = new URL(supabaseUrl);
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      return null;
    }

    return {
      supabaseUrl: parsedUrl.toString().replace(/\/$/, ""),
      publishableKey,
    };
  } catch {
    return null;
  }
}

function readBearerToken(
  authorizationHeader: string | undefined,
):
  | { status: "missing_authorization" | "malformed_authorization" }
  | { status: "valid"; token: string } {
  if (authorizationHeader === undefined) {
    return { status: "missing_authorization" };
  }

  const match = /^Bearer ([^\s]+)$/i.exec(authorizationHeader);
  if (!match) {
    return { status: "malformed_authorization" };
  }

  return {
    status: "valid",
    token: match[1],
  };
}

function createServerSupabaseAuthClient(
  supabaseUrl: string,
  publishableKey: string,
): SupabaseAuthClient {
  return createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

/**
 * Verifies a request token with Supabase Auth. The token payload is never
 * treated as trusted input without this remote verification.
 */
export function createSupabaseRequestAuthVerifier(
  options: SupabaseAuthVerifierOptions = {},
): SupabaseRequestAuthVerifier {
  const environment = options.environment ?? {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  };
  const configuration = readSupabaseAuthConfiguration(environment);
  const clientFactory =
    options.clientFactory ?? createServerSupabaseAuthClient;
  let authClient: SupabaseAuthClient | null = null;

  return async (
    authorizationHeader: string | undefined,
  ): Promise<SupabaseRequestAuthResult> => {
    const bearerToken = readBearerToken(authorizationHeader);

    if (bearerToken.status !== "valid") {
      return {
        status: bearerToken.status,
        userId: null,
      };
    }

    if (!configuration) {
      return {
        status: "unconfigured",
        userId: null,
      };
    }

    try {
      authClient ??= clientFactory(
        configuration.supabaseUrl,
        configuration.publishableKey,
      );

      const {
        data: { user },
        error,
      } = await authClient.auth.getUser(bearerToken.token);

      if (error || !user?.id) {
        return {
          status: "invalid_token",
          userId: null,
        };
      }

      return {
        status: "authenticated",
        userId: user.id,
      };
    } catch {
      return {
        status: "invalid_token",
        userId: null,
      };
    }
  };
}

let verifyWithDefaultEnvironment: SupabaseRequestAuthVerifier | null = null;

export function verifySupabaseRequestAuth(
  authorizationHeader: string | undefined,
): Promise<SupabaseRequestAuthResult> {
  verifyWithDefaultEnvironment ??= createSupabaseRequestAuthVerifier();
  return verifyWithDefaultEnvironment(authorizationHeader);
}
