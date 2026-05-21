// Global setup for Vitest.
// Registers `@testing-library/jest-dom` matchers (e.g. `toBeInTheDocument`,
// `toHaveTextContent`) on Vitest's `expect`, so any test file can assert
// against rendered DOM without re-importing them.
import "@testing-library/jest-dom/vitest";
