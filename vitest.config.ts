import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Tests live under `src/**\/__tests__` next to the code they exercise.
 * Pure-logic suites — no DOM, no real Prisma, no real Tikfinity/Stripe.
 * Module mocks live inside the individual test files.
 */
export default defineConfig({
  test: {
    environment:  "node",
    include:      ["src/**/__tests__/**/*.test.ts"],
    globals:      false,
    clearMocks:   true,
    restoreMocks: true,
    testTimeout:  15_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
