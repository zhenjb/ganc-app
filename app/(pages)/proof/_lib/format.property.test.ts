import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { shortenHex } from "@/app/(pages)/proof/_lib/format";

/**
 * Property-based tests for shortenHex.
 *
 * Feature: proof-screen, Property 2
 * Validates: Requirements 7.1, 7.2
 *
 * Property 2 — shortenHex preserves head and tail:
 * For any hex string, if the string length is greater than 18,
 * shortenHex SHALL return a string whose first 10 characters equal
 * the input's first 10 characters and whose last 6 characters equal
 * the input's last 6 characters. If the string length is less than
 * or equal to 18, shortenHex SHALL return the input unchanged.
 */

// --- Arbitraries ------------------------------------------------------------

// Strings longer than 18 characters (exercise the shortening branch).
const longStringArb = fc.string({ minLength: 19, maxLength: 200 });

// Strings with length <= 18 (exercise the passthrough branch).
const shortStringArb = fc.string({ minLength: 0, maxLength: 18 });

// Any string to exercise purity.
const anyStringArb = fc.string({ minLength: 0, maxLength: 200 });

// ---------------------------------------------------------------------------
// Property 2: shortenHex preserves head and tail
// ---------------------------------------------------------------------------
describe("Feature: proof-screen, Property 2: shortenHex preserves head and tail", () => {
  it("preserves first 10 and last 6 characters for strings longer than 18 chars", () => {
    // Validates: Requirements 7.1
    fc.assert(
      fc.property(longStringArb, (input) => {
        const result = shortenHex(input);

        // Output starts with the first 10 chars of input.
        expect(result.slice(0, 10)).toBe(input.slice(0, 10));

        // Output ends with the last 6 chars of input.
        expect(result.slice(-6)).toBe(input.slice(-6));

        // Output length is exactly 17 (10 + 1 ellipsis + 6).
        expect(result.length).toBe(17);

        // The middle character is the unicode ellipsis.
        expect(result[10]).toBe("\u2026");
      }),
      { numRuns: 200 },
    );
  });

  it("returns strings with length <= 18 unchanged", () => {
    // Validates: Requirements 7.2
    fc.assert(
      fc.property(shortStringArb, (input) => {
        const result = shortenHex(input);

        expect(result).toBe(input);
      }),
      { numRuns: 200 },
    );
  });

  it("is a pure function — multiple calls with the same input return the same result", () => {
    // Validates: Requirements 7.1, 7.2
    fc.assert(
      fc.property(anyStringArb, (input) => {
        const result1 = shortenHex(input);
        const result2 = shortenHex(input);
        const result3 = shortenHex(input);

        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
      }),
      { numRuns: 200 },
    );
  });
});
