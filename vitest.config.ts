import { defineConfig } from "vitest/config";
import path from "node:path";

// Vitest config for FE-02 API client tests.
// - jsdom environment so React Testing Library + DOM-touching helpers work.
// - Path alias `@/*` mirrors the `tsconfig.json` baseUrl/paths mapping
//   (`"@/*": ["./*"]`) so `@/app/...` imports resolve identically in tests
//   and in Next.js builds.
// - Global setup file imports `@testing-library/jest-dom/vitest` to register
//   the custom matchers (e.g. `toBeInTheDocument`) on Vitest's `expect`.
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.{test,property.test}.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "out/**", "build/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
