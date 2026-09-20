import { choice } from "@typesafe-ai/sdk";
import { createTypeSafeClient } from "../server/typesafe.js";

try {
  const client = createTypeSafeClient();
  const result = await client.systemOne({
    state: "The apple is red.",
    questions: {
      color: choice("What color is the apple?", { red: null, blue: null }),
    },
  });
  if (result.answers.color.choice !== "red") {
    throw new Error("Unexpected test response");
  }
  console.log("TypeSafe AI connection OK: color=red");
} catch {
  // Avoid logging SDK errors, request headers, or environment values.
  console.error("TypeSafe AI check failed. Check TYPESAFE_API_KEY, network access, and account availability.");
  process.exitCode = 1;
}
