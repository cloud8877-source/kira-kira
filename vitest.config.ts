import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text"],
      include: ["lib/**/*.ts", "app/actions/**/*.ts"],
      exclude: ["tests/**"],
    },
  },
});
