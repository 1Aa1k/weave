import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // better-sqlite3 (native addon) crashes under the worker-thread pool
    pool: "forks",
    include: ["tests/**/*.test.ts"],
  },
});
