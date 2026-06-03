import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // Stub Next's "server-only" sentinel so libs that import it can be unit-tested.
      "server-only": path.resolve(__dirname, "test/server-only-stub.ts"),
    },
  },
});
