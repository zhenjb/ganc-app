import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  validateDestination,
  validateAmount,
  validateAmountWarning,
} from "@/app/(pages)/withdraw/_lib/validate";

/**
 * Property-based tests for the withdraw request pure validation functions.
 *
 * Feature: withdraw-request-screen
 *   Property 1 — Destination validation correctness (Requirement 1.4)
 *   Property 2 — Amount validation correctness (Requirements 1.5, 1.6)
 *   Property 3 — Amount warning correctness (Requirement 1.7)
 *
 * Each property is verified against an independent oracle derived directly
 * from the specification (not from the implementation), plus targeted
 * generators that exercise the meaningful equivalence classes.
 */

// Canonical cosmos address pattern from the spec (Requirement 1.4).
const COSMOS_REGEX = /^cosmos1[a-z0-9]{38,}$/;
const INVALID_DESTINATION_MESSAGE = "Invalid cosmos address";
const NOT_POSITIVE_INTEGER_MESSAGE = "Amount must be a positive integer";
const GREATER_THAN_ZERO_MESSAGE = "Amount must be greater than 0";
const EXCEEDS_BALANCE_MESSAGE = "Amount exceeds available balance";

const LOWER_ALPHANUM = "abcdefghijklmnopqrstuvwxyz0123456789".split("");
const DIGITS = "0123456789".split("");

// --- Shared arbitraries -----------------------------------------------------

// Valid cosmos address: "cosmos1" + at least 38 lowercase alphanumeric chars.
const validCosmosAddress = fc
  .array(fc.constantFrom(...LOWER_ALPHANUM), { minLength: 38, maxLength: 80 })
  .map((chars) => "cosmos1" + chars.join(""));

// A grab-bag of invalid destinations covering the spec's failure modes:
// wrong prefix, uppercase, too short, special chars, and empty.
const invalidCosmosAddress = fc.oneof(
  // Wrong prefix but otherwise well-formed body.
  fc
    .array(fc.constantFrom(...LOWER_ALPHANUM), { minLength: 38, maxLength: 50 })
    .map((chars) => "osmo1" + chars.join("")),
  // Correct prefix but contains uppercase characters.
  fc
    .array(fc.constantFrom(..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")), {
      minLength: 38,
      maxLength: 50,
    })
    .map((chars) => "cosmos1" + chars.join("")),
  // Correct prefix but body too short (0..37 chars).
  fc
    .array(fc.constantFrom(...LOWER_ALPHANUM), { minLength: 0, maxLength: 37 })
    .map((chars) => "cosmos1" + chars.join("")),
  // Correct prefix but contains a special character.
  fc
    .array(fc.constantFrom(...LOWER_ALPHANUM), { minLength: 37, maxLength: 50 })
    .map((chars) => "cosmos1" + chars.join("") + "!"),
  // Empty string.
  fc.constant("")
);

// Non-negative integer strings (digits only). Includes leading zeros and
// all-zero strings such as "0" / "000" which the oracle treats as zero.
const digitString = fc
  .array(fc.constantFrom(...DIGITS), { minLength: 1, maxLength: 40 })
  .map((chars) => chars.join(""));

// Strings that are NOT valid positive-integer digit strings: decimals,
// negatives, mixed alphanumerics, whitespace, empty, etc.
const nonNumericString = fc.oneof(
  fc.constant(""),
  fc.constant(" "),
  digitString.map((d) => d + "." + "5"), // decimal
  digitString.map((d) => "-" + d), // negative
  digitString.map((d) => d + "abc"), // trailing letters
  fc
    .string()
    .filter((s) => !/^\d+$/.test(s)) // arbitrary non-digit-only strings
);

// --- Oracles ----------------------------------------------------------------

// Oracle for validateAmount derived from Requirements 1.5 and 1.6.
function expectedAmount(value: string): string | null {
  if (!/^\d+$/.test(value)) {
    return NOT_POSITIVE_INTEGER_MESSAGE;
  }
  if (BigInt(value) <= 0n) {
    return GREATER_THAN_ZERO_MESSAGE;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Property 1: Destination validation correctness
// ---------------------------------------------------------------------------
describe("Feature: withdraw-request-screen, Property 1: Destination validation correctness", () => {
  it("returns null if and only if the input matches the cosmos regex (oracle over arbitrary strings)", () => {
    // Validates: Requirements 1.4
    fc.assert(
      fc.property(
        fc.oneof(validCosmosAddress, invalidCosmosAddress, fc.string()),
        (value) => {
          const result = validateDestination(value);
          const expected = COSMOS_REGEX.test(value)
            ? null
            : INVALID_DESTINATION_MESSAGE;
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("returns null for every well-formed cosmos address", () => {
    // Validates: Requirements 1.4
    fc.assert(
      fc.property(validCosmosAddress, (address) => {
        expect(validateDestination(address)).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it("returns the error message for malformed addresses (wrong prefix, uppercase, too short, special chars, empty)", () => {
    // Validates: Requirements 1.4
    fc.assert(
      fc.property(invalidCosmosAddress, (address) => {
        expect(validateDestination(address)).toBe(INVALID_DESTINATION_MESSAGE);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Amount validation correctness
// ---------------------------------------------------------------------------
describe("Feature: withdraw-request-screen, Property 2: Amount validation correctness", () => {
  it("matches the spec oracle across numeric and non-numeric inputs", () => {
    // Validates: Requirements 1.5, 1.6
    fc.assert(
      fc.property(
        fc.oneof(digitString, nonNumericString, fc.string()),
        (value) => {
          expect(validateAmount(value)).toBe(expectedAmount(value));
        }
      ),
      { numRuns: 200 }
    );
  });

  it("returns null for positive integers greater than zero", () => {
    // Validates: Requirement 1.5
    fc.assert(
      fc.property(fc.bigInt({ min: 1n, max: 10n ** 40n }), (n) => {
        expect(validateAmount(n.toString())).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('returns "Amount must be greater than 0" for all-zero digit strings', () => {
    // Validates: Requirement 1.6
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 40 }), (length) => {
        const zeros = "0".repeat(length);
        expect(validateAmount(zeros)).toBe(GREATER_THAN_ZERO_MESSAGE);
      }),
      { numRuns: 100 }
    );
  });

  it('returns "Amount must be a positive integer" for non-numeric / decimal / negative / empty inputs', () => {
    // Validates: Requirement 1.5
    fc.assert(
      fc.property(nonNumericString, (value) => {
        expect(validateAmount(value)).toBe(NOT_POSITIVE_INTEGER_MESSAGE);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Amount warning correctness
// ---------------------------------------------------------------------------
describe("Feature: withdraw-request-screen, Property 3: Amount warning correctness", () => {
  it("warns if and only if BigInt(amount) > BigInt(balance) for valid integer-string pairs", () => {
    // Validates: Requirement 1.7
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: 10n ** 40n }),
        fc.bigInt({ min: 0n, max: 10n ** 40n }),
        (amount, balance) => {
          const result = validateAmountWarning(
            amount.toString(),
            balance.toString()
          );
          const expected =
            amount > balance ? EXCEEDS_BALANCE_MESSAGE : null;
          expect(result).toBe(expected);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("never warns when amount is less than or equal to balance", () => {
    // Validates: Requirement 1.7
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: 10n ** 40n }),
        fc.bigInt({ min: 0n, max: 10n ** 40n }),
        (a, b) => {
          // Order the pair so amount <= balance by construction.
          const amount = a <= b ? a : b;
          const balance = a <= b ? b : a;
          expect(
            validateAmountWarning(amount.toString(), balance.toString())
          ).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
