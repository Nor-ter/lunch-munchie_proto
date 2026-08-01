import path from "node:path";
import { defineConfig } from "vitest/config";

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
    include: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    // Playwright live tests intentionally share the `*.spec.ts` suffix but
    // must only run through `playwright.live.config.ts`, never Vitest.
    exclude: ["e2e/**", "e2e-harness/**", "mobile/**", "**/node_modules/**", "dist/**"],
  },
});
