import { defineConfig } from "vitest/config";

// Separate from the normal tests: these need the Firestore emulator running
export default defineConfig({
  test: {
    include: ["rules-tests/**/*.rules.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
