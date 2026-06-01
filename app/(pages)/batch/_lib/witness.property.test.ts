import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  shortenWitnessInput,
  maskAuxValue,
} from "@/app/(pages)/batch/_lib/witness";

/**
 * Property-based tests for the Witness panel pure helpers.
 *
 * Feature: batch-screen, Property 10
 * Validates: Requirements 8.1
 *
 * Feature: batch-screen, Property 11
 * Validates: Requirements 8.3, 8.6
 */

// Single Unicode ellipsis character (U+2026) — the elision separator.
const ELLIPSIS = "\u2026";

// Fixed secret mask: exactly 8 asterisks.
const SECRET_MASK = "********";

// --- Arbitraries ------------------------------------------------------------

// Hex characters used to build realistic witness input strings.
const hexCharArb = fc.constantFrom(
  ..."0123456789abcdefABCDEF".split("")
);

// Hex strings of a given length, built from hex characters only.
const hexStringOfLength = (length: number): fc.Arbitrary<string> =>
  fc.array(hexCharArb, { minLength: length, maxLength: length }).map((cs) =>
    cs.join("")
  );

// Hex strings of varied length (0..40) so both branches of the >10 threshold
// are exercised, with extra weight on the boundary lengths 10 and 11.
const variedHexArb: fc.Arbitrary<string> = fc.oneof(
  { weight: 6, arbitrary: fc.integer({ min: 0, max: 40 }).chain(hexStringOfLength) },
  { weight: 1, arbitrary: hexStringOfLength(10) },
  { weight: 1, arbitrary: hexStringOfLength(11) }
);

// Case variants of the "secret" marker substring.
const secretVariantArb = fc.constantFrom(
  "secret",
  "SECRET",
  "Secret",
  "SeCrEt",
  "sEcReT"
);

// Plain key fragments that never contain the "secret" marker (case-insensitive).
const nonSecretFragmentArb = fc
  .string()
  .filter((s) => !s.toLowerCase().includes("secret"));

// Keys that DO contain "secret" somewhere: fragment + variant + fragment.
const secretKeyArb: fc.Arbitrary<string> = fc
  .tuple(nonSecretFragmentArb, secretVariantArb, nonSecretFragmentArb)
  .map(([prefix, variant, suffix]) => `${prefix}${variant}${suffix}`);

// A mix of secret-containing and non-secret keys to cover both branches.
const keyArb: fc.Arbitrary<string> = fc.oneof(
  secretKeyArb,
  nonSecretFragmentArb
);

// Values of varied length, including the mask string itself, to prove the
// output is independent of the real value's length.
const valueArb: fc.Arbitrary<string> = fc.oneof(
  fc.string(),
  fc.constant(SECRET_MASK),
  fc.constant("")
);

// ---------------------------------------------------------------------------
// Property 10: Rút gọn witness input theo ngưỡng độ dài (shortenWitnessInput)
// ---------------------------------------------------------------------------
describe("Feature: batch-screen, Property 10: shorten witness input by length threshold", () => {
  it("collapses to first-6 + ellipsis + last-4 when length > 10, verbatim otherwise", () => {
    // Validates: Requirements 8.1
    fc.assert(
      fc.property(variedHexArb, (v) => {
        const result = shortenWitnessInput(v);

        if (v.length > 10) {
          expect(result).toBe(`${v.slice(0, 6)}${ELLIPSIS}${v.slice(-4)}`);
        } else {
          expect(result).toBe(v);
        }
      }),
      { numRuns: 300 }
    );
  });

  it("uses a single Unicode ellipsis (U+2026) and keeps the 6/4 head/tail for long inputs", () => {
    // Validates: Requirements 8.1
    fc.assert(
      fc.property(
        fc.integer({ min: 11, max: 64 }).chain(hexStringOfLength),
        (v) => {
          const result = shortenWitnessInput(v);

          // Exactly one ellipsis separator, no triple-dot fallback.
          expect(result.includes(ELLIPSIS)).toBe(true);
          expect(result.includes("...")).toBe(false);
          // Head and tail preserved exactly.
          expect(result.startsWith(v.slice(0, 6))).toBe(true);
          expect(result.endsWith(v.slice(-4))).toBe(true);
          // 6 head + 1 ellipsis + 4 tail = 11 characters total.
          expect([...result].length).toBe(11);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("returns short inputs verbatim at the boundary (length 10 unchanged, length 11 shortened)", () => {
    // Validates: Requirements 8.1
    fc.assert(
      fc.property(hexStringOfLength(10), (v) => {
        expect(shortenWitnessInput(v)).toBe(v);
      }),
      { numRuns: 100 }
    );
    fc.assert(
      fc.property(hexStringOfLength(11), (v) => {
        expect(shortenWitnessInput(v)).toBe(
          `${v.slice(0, 6)}${ELLIPSIS}${v.slice(-4)}`
        );
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: Masking giá trị secret trong auxiliary (maskAuxValue)
// ---------------------------------------------------------------------------
describe("Feature: batch-screen, Property 11: mask secret auxiliary values", () => {
  it("returns the 8-char mask iff key contains 'secret' (ci) AND showSecret is false, else value verbatim", () => {
    // Validates: Requirements 8.3, 8.6
    fc.assert(
      fc.property(keyArb, valueArb, fc.boolean(), (key, value, showSecret) => {
        const result = maskAuxValue(key, value, showSecret);

        const keyIsSecret = key.toLowerCase().includes("secret");
        const shouldMask = keyIsSecret && showSecret === false;

        if (shouldMask) {
          // Exactly "********" (8 chars), independent of the real value length.
          expect(result).toBe(SECRET_MASK);
          expect(result.length).toBe(8);
        } else {
          expect(result).toBe(value);
        }
      }),
      { numRuns: 300 }
    );
  });

  it("masking is independent of value length: any secret value collapses to 8 chars when hidden", () => {
    // Validates: Requirements 8.3
    fc.assert(
      fc.property(secretKeyArb, fc.string(), (key, value) => {
        const result = maskAuxValue(key, value, false);

        expect(result).toBe(SECRET_MASK);
        expect(result.length).toBe(8);
      }),
      { numRuns: 200 }
    );
  });

  it("never masks when showSecret is true, regardless of the key", () => {
    // Validates: Requirements 8.6
    fc.assert(
      fc.property(keyArb, valueArb, (key, value) => {
        expect(maskAuxValue(key, value, true)).toBe(value);
      }),
      { numRuns: 200 }
    );
  });

  it("never masks non-secret keys, regardless of showSecret", () => {
    // Validates: Requirements 8.3
    fc.assert(
      fc.property(nonSecretFragmentArb, valueArb, fc.boolean(), (key, value, showSecret) => {
        expect(maskAuxValue(key, value, showSecret)).toBe(value);
      }),
      { numRuns: 200 }
    );
  });
});
