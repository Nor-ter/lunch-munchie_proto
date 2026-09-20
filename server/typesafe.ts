import "dotenv/config";
import { TypeSafeClient } from "@typesafe-ai/sdk";

/** Server-only client. Create on demand so the API key remains optional at startup. */
export function createTypeSafeClient(): TypeSafeClient {
  const apiKey = process.env.TYPESAFE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Set TYPESAFE_API_KEY in the server environment before using TypeSafe AI.");
  }

  return new TypeSafeClient({
    apiKey,
    baseURL: "https://api.typesafe.ai",
    defaultModel: "jev-latest",
    timeout: 30_000,
    retry: { maxRetries: 0 },
    logLevel: "off",
  });
}
