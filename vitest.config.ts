import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 20_000,
    fileParallelism: false
  },
  resolve: {
    alias: {
      "@dermoptera/handoff": new URL("./packages/core/src/index.ts", import.meta.url).pathname,
      "@dermoptera/handoff-ui": new URL("./packages/ui/src/index.ts", import.meta.url).pathname
    }
  }
});
