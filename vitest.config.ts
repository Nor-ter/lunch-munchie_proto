import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client/src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  test: {
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["{client,server,functions}/**/*.{test,spec}.{ts,tsx}"],
    // Keep generated copies and Playwright specs out of unit/integration runs.
    exclude: [
      ...configDefaults.exclude,
      "**/outputs/**",
      "**/e2e/**",
      "**/e2e-harness/**",
      "mobile/**",
    ],
  },
});
